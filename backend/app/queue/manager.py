import asyncio
import datetime
import os
import time
import uuid
from typing import Dict, List, Optional, AsyncGenerator
from app.models.schemas import (
    ScanResult,
    ScanProgress,
    ScanStatus,
    ScanSourceType,
    ScanSummary,
    Finding,
    SeverityLevel
)
from app.core.git_engine import GitEngine
from app.core.scanner import SecretScanner


def calculate_scan_summary(
    findings: List[Finding],
    duration: float,
    scanned_commits: int = 0,
    scanned_files: int = 0
) -> ScanSummary:
    """Computes summary statistics, severity counts, and 0-100 Security Health Score."""
    critical = sum(1 for f in findings if f.severity == SeverityLevel.CRITICAL)
    high = sum(1 for f in findings if f.severity == SeverityLevel.HIGH)
    medium = sum(1 for f in findings if f.severity == SeverityLevel.MEDIUM)
    low = sum(1 for f in findings if f.severity == SeverityLevel.LOW)
    zombies = sum(1 for f in findings if f.is_deleted_in_head)

    # Health score starts at 100 (clean) and drops based on severity
    penalty = (critical * 25) + (high * 15) + (medium * 7) + (low * 2)
    score = max(0, 100 - penalty)

    return ScanSummary(
        total_findings=len(findings),
        critical_count=critical,
        high_count=high,
        medium_count=medium,
        low_count=low,
        health_score=score,
        zombie_secrets_count=zombies,
        scanned_commits=scanned_commits,
        scanned_files=scanned_files,
        scan_duration_seconds=round(duration, 2),
    )


class JobManager:
    def __init__(self):
        self.results: Dict[str, ScanResult] = {}
        self.progress: Dict[str, ScanProgress] = {}
        self.listeners: Dict[str, List[asyncio.Queue]] = {}
        self.git_engine = GitEngine()
        self.scanner = SecretScanner()

    def create_job(self, target: str, source_type: ScanSourceType) -> str:
        scan_id = str(uuid.uuid4())
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()

        self.progress[scan_id] = ScanProgress(
            scan_id=scan_id,
            status=ScanStatus.QUEUED,
            progress_percent=5,
            message="Queued for security analysis...",
            current_target=target
        )

        self.results[scan_id] = ScanResult(
            scan_id=scan_id,
            target=target,
            source_type=source_type,
            status=ScanStatus.QUEUED,
            start_time=now,
            findings=[]
        )

        self.listeners[scan_id] = []
        return scan_id

    def update_progress(self, scan_id: str, **kwargs):
        if scan_id in self.progress:
            prog = self.progress[scan_id]
            for k, v in kwargs.items():
                if hasattr(prog, k):
                    setattr(prog, k, v)

            # Broadcast to any active SSE listeners
            data = prog.model_dump()
            for q in self.listeners.get(scan_id, []):
                q.put_nowait(data)

    async def subscribe_progress(self, scan_id: str) -> AsyncGenerator[dict, None]:
        """Provides an async generator yielding progress events for SSE."""
        q = asyncio.Queue()
        if scan_id not in self.listeners:
            self.listeners[scan_id] = []
        self.listeners[scan_id].append(q)

        # Yield current initial state
        if scan_id in self.progress:
            yield self.progress[scan_id].model_dump()

        try:
            while True:
                data = await q.get()
                yield data
                if data.get("status") in [ScanStatus.COMPLETED, ScanStatus.FAILED]:
                    break
        finally:
            if scan_id in self.listeners and q in self.listeners[scan_id]:
                self.listeners[scan_id].remove(q)

    def scan_snippet_sync(self, code: str, title: str, filename: str) -> ScanResult:
        """Instant synchronous scan for code/config snippets."""
        scan_id = self.create_job(target=title, source_type=ScanSourceType.SNIPPET)
        start_t = time.time()

        self.update_progress(
            scan_id,
            status=ScanStatus.SCANNING,
            progress_percent=50,
            message="Scanning content against pattern library & entropy engine..."
        )

        findings = self.scanner.scan_content(code, file_path=filename)
        duration = time.time() - start_t
        summary = calculate_scan_summary(findings, duration, scanned_commits=1, scanned_files=1)

        result = self.results[scan_id]
        result.status = ScanStatus.COMPLETED
        result.end_time = datetime.datetime.now(datetime.timezone.utc).isoformat()
        result.duration_seconds = round(duration, 2)
        result.findings = findings
        result.summary = summary

        self.update_progress(
            scan_id,
            status=ScanStatus.COMPLETED,
            progress_percent=100,
            message=f"Scan complete. Found {len(findings)} potential secret leaks.",
            findings_count=len(findings)
        )
        return result

    async def run_repo_scan_async(self, scan_id: str, repo_url: str, max_commits: int = 60):
        """Asynchronously executes git cloning and scanning in worker loop."""
        start_t = time.time()
        try:
            self.update_progress(
                scan_id,
                status=ScanStatus.CLONING,
                progress_percent=10,
                message=f"Cloning {repo_url} into isolated security sandbox..."
            )

            def on_progress(p_data):
                self.update_progress(scan_id, **p_data)

            # Run in thread pool executor so it doesn't block the asyncio event loop
            loop = asyncio.get_running_loop()
            scan_data = await loop.run_in_executor(
                None,
                lambda: self.git_engine.scan_git_repository(
                    repo_url=repo_url,
                    max_commits=max_commits,
                    progress_callback=on_progress
                )
            )

            findings: List[Finding] = scan_data.get("findings", [])
            total_commits = scan_data.get("total_commits", 0)
            scanned_files = scan_data.get("scanned_files_count", 0)
            duration = time.time() - start_t

            summary = calculate_scan_summary(
                findings=findings,
                duration=duration,
                scanned_commits=total_commits,
                scanned_files=scanned_files
            )

            res = self.results[scan_id]
            res.status = ScanStatus.COMPLETED
            res.end_time = datetime.datetime.now(datetime.timezone.utc).isoformat()
            res.duration_seconds = round(duration, 2)
            res.findings = findings
            res.summary = summary

            self.update_progress(
                scan_id,
                status=ScanStatus.COMPLETED,
                progress_percent=100,
                message=f"Audit complete! {len(findings)} findings across {total_commits} commits.",
                total_commits=total_commits,
                scanned_commits=total_commits,
                scanned_files=scanned_files,
                findings_count=len(findings)
            )

        except Exception as e:
            res = self.results[scan_id]
            res.status = ScanStatus.FAILED
            res.error = str(e)
            res.end_time = datetime.datetime.now(datetime.timezone.utc).isoformat()
            res.duration_seconds = round(time.time() - start_t, 2)

            self.update_progress(
                scan_id,
                status=ScanStatus.FAILED,
                progress_percent=100,
                message=f"Scan failed: {str(e)}"
            )


job_manager = JobManager()
