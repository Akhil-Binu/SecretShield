import os
import shutil
import stat
import subprocess
import tempfile
from typing import List, Dict, Any, Optional, Callable
from app.core.scanner import SecretScanner
from app.models.schemas import Finding, ScanStatus


def remove_readonly(func, path, excinfo):
    """Clear readonly bit on Windows when deleting .git files."""
    try:
        os.chmod(path, stat.S_IWRITE)
        func(path)
    except Exception:
        pass


class GitEngine:
    def __init__(self, scanner: Optional[SecretScanner] = None):
        self.scanner = scanner or SecretScanner()

    @staticmethod
    def normalize_github_url(repo_input: str) -> str:
        """Normalizes 'owner/repo' or 'github.com/owner/repo' into 'https://github.com/owner/repo.git', or preserves local paths."""
        clean = repo_input.strip()
        # Support local folder paths or file:// URLs for pre-push local audits
        if os.path.isdir(clean) or clean.startswith("file://") or (len(clean) > 2 and clean[1] == ':' and clean[2] in ('\\', '/')):
            return clean

        if clean.endswith("/"):
            clean = clean[:-1]
        if clean.startswith("git@github.com:"):
            clean = "https://github.com/" + clean[len("git@github.com:"):]
        elif not clean.startswith("http://") and not clean.startswith("https://"):
            # owner/repo format
            if "/" in clean and not clean.startswith("github.com/"):
                clean = f"https://github.com/{clean}"
            elif clean.startswith("github.com/"):
                clean = f"https://{clean}"
            else:
                clean = f"https://github.com/{clean}"
        if not clean.endswith(".git") and not os.path.isdir(clean):
            clean = f"{clean}.git"
        return clean

    def scan_git_repository(
        self,
        repo_url: str,
        max_commits: int = 60,
        progress_callback: Optional[Callable[[Dict[str, Any]], None]] = None
    ) -> Dict[str, Any]:
        """
        Clones repository into a temporary directory and scans git commit history.
        Tracks active vs historical (zombie) secrets.
        """
        norm_url = self.normalize_github_url(repo_url)
        temp_dir = tempfile.mkdtemp(prefix="secretshield_repo_")

        try:
            if progress_callback:
                progress_callback({
                    "status": ScanStatus.CLONING,
                    "progress_percent": 15,
                    "message": f"Cloning repository {norm_url} (depth={max_commits})..."
                })

            # 1. Clone repository with limited depth for speed & security
            clone_cmd = [
                "git", "clone",
                "--depth", str(max_commits),
                "--no-single-branch",
                norm_url,
                temp_dir
            ]
            res = subprocess.run(clone_cmd, capture_output=True, text=True, timeout=120)
            if res.returncode != 0:
                # If clone failed (e.g. repo not found or private)
                err_msg = res.stderr.strip() or "Failed to clone repository. Make sure it is public and accessible."
                raise RuntimeError(err_msg)

            if progress_callback:
                progress_callback({
                    "status": ScanStatus.SCANNING,
                    "progress_percent": 30,
                    "message": "Extracting commit history and diff trees..."
                })

            # 2. Extract commit history
            log_cmd = [
                "git", "-C", temp_dir, "log",
                f"-n{max_commits}",
                "--pretty=format:%H|%h|%an|%ad|%s",
                "--date=iso"
            ]
            log_res = subprocess.run(log_cmd, capture_output=True, text=True, check=True)
            commit_lines = [line.strip() for line in log_res.stdout.splitlines() if line.strip()]

            total_commits = len(commit_lines)
            all_findings: List[Finding] = []
            scanned_files_set = set()

            # 3. Read current HEAD files to check if leaked secrets are still active or zombies
            head_content_cache: Dict[str, str] = {}
            for root, _, files in os.walk(temp_dir):
                if ".git" in root:
                    continue
                for f in files:
                    rel_path = os.path.relpath(os.path.join(root, f), temp_dir)
                    scanned_files_set.add(rel_path)
                    try:
                        with open(os.path.join(root, f), "r", encoding="utf-8", errors="ignore") as fl:
                            head_content_cache[rel_path.replace("\\", "/")] = fl.read()
                    except Exception:
                        pass

            # 4. Traverse commits and inspect patch diffs
            for idx, c_line in enumerate(commit_lines, start=1):
                parts = c_line.split("|", 4)
                if len(parts) < 5:
                    continue
                c_sha, c_short, c_author, c_date, c_msg = parts

                if progress_callback:
                    pct = 30 + int((idx / max(1, total_commits)) * 60)
                    progress_callback({
                        "status": ScanStatus.SCANNING,
                        "progress_percent": min(95, pct),
                        "message": f"Auditing commit {idx}/{total_commits} ({c_short}): {c_msg[:40]}...",
                        "scanned_commits": idx,
                        "total_commits": total_commits,
                        "scanned_files": len(scanned_files_set),
                        "findings_count": len(all_findings),
                    })

                # Get the diff for this commit
                diff_cmd = [
                    "git", "-C", temp_dir, "show",
                    "--unified=0",
                    "--no-color",
                    c_sha
                ]
                diff_res = subprocess.run(diff_cmd, capture_output=True, text=True, errors="ignore")
                diff_text = diff_res.stdout

                current_file = "unknown"
                current_line_no = 1

                for diff_line in diff_text.splitlines():
                    if diff_line.startswith("+++ b/"):
                        current_file = diff_line[6:]
                        scanned_files_set.add(current_file)
                        continue
                    elif diff_line.startswith("@@ "):
                        # parse hunk header: @@ -line,count +line,count @@
                        try:
                            plus_part = diff_line.split("+")[1].split(" ")[0]
                            current_line_no = int(plus_part.split(",")[0])
                        except Exception:
                            current_line_no = 1
                        continue

                    # Only scan added/modified lines in commit
                    if diff_line.startswith("+") and not diff_line.startswith("+++"):
                        code_line = diff_line[1:]
                        # Determine if secret still exists in current HEAD
                        commit_info = {
                            "sha": c_sha,
                            "short_sha": c_short,
                            "author": c_author,
                            "date": c_date,
                            "message": c_msg,
                        }

                        line_findings = self.scanner.scan_line(
                            line=code_line,
                            line_num=current_line_no,
                            file_path=current_file.replace("\\", "/"),
                            commit_info=commit_info
                        )

                        for fnd in line_findings:
                            # Check whether active in current HEAD or zombie deleted
                            norm_fpath = current_file.replace("\\", "/")
                            raw_val_candidate = fnd.raw_preview.replace("...", "") if fnd.raw_preview else ""
                            in_head = False
                            if norm_fpath in head_content_cache:
                                if raw_val_candidate and raw_val_candidate in head_content_cache[norm_fpath]:
                                    in_head = True

                            fnd.active_in_head = in_head
                            fnd.is_deleted_in_head = not in_head
                            all_findings.append(fnd)

                        current_line_no += 1

            # De-duplicate findings (same rule, same masked value, same file and commit)
            unique_findings: List[Finding] = []
            seen_keys = set()
            for f in all_findings:
                key = (f.rule_id, f.masked_value, f.file_path, f.commit_short_sha or "")
                if key not in seen_keys:
                    seen_keys.add(key)
                    unique_findings.append(f)

            return {
                "findings": unique_findings,
                "total_commits": total_commits,
                "scanned_files_count": len(scanned_files_set),
            }

        finally:
            # Clean up temp clone directory safely
            if os.path.exists(temp_dir):
                shutil.rmtree(temp_dir, onerror=remove_readonly)
