import csv
import io
import json
from fastapi import APIRouter, HTTPException, BackgroundTasks, Path
from fastapi.responses import PlainTextResponse, Response
from sse_starlette.sse import EventSourceResponse

from app.models.schemas import (
    ScanSnippetRequest,
    ScanRepoRequest,
    ScanUserRequest,
    PreCommitConfigRequest,
    ScanResult,
    ScanProgress,
    ScanSourceType,
    GitHubRepoItem,
    VerifyTokenRequest,
    RuleCatalogItem,
    BaselineRequest,
    RemediationScriptRequest
)
from app.queue.manager import job_manager
from app.core.github_api import GitHubClient
from app.core.precommit_gen import generate_precommit_config, generate_github_actions_workflow
from app.core.rules import SECRET_RULES
from app.core.verifier import secret_verifier
from app.sample_data.demos import SAMPLE_SNIPPETS

router = APIRouter()
github_client = GitHubClient()


@router.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "SecretShield API",
        "version": "1.0.0",
        "scanner_ready": True
    }


@router.get("/sample-snippets")
def get_sample_snippets():
    """Returns pre-loaded sample vulnerability scenarios for 1-click testing."""
    return SAMPLE_SNIPPETS


@router.post("/scan/snippet", response_model=ScanResult)
def scan_snippet(req: ScanSnippetRequest):
    """Instant synchronous scan for code/config snippets."""
    if not req.code.strip():
        raise HTTPException(status_code=400, detail="Code snippet cannot be empty.")
    return job_manager.scan_snippet_sync(
        code=req.code,
        title=req.title or "Pasted Snippet",
        filename=req.filename or "code_snippet.txt"
    )


@router.post("/scan/repo")
async def scan_repository(req: ScanRepoRequest, background_tasks: BackgroundTasks):
    """Enqueues an asynchronous repository cloning and secret audit task."""
    if not req.repo_url.strip():
        raise HTTPException(status_code=400, detail="Repository URL or owner/repo path is required.")

    scan_id = job_manager.create_job(target=req.repo_url, source_type=ScanSourceType.REPO)

    # Launch in background task queue
    background_tasks.add_task(
        job_manager.run_repo_scan_async,
        scan_id=scan_id,
        repo_url=req.repo_url,
        max_commits=req.max_commits or 60
    )

    return {
        "scan_id": scan_id,
        "status": "QUEUED",
        "message": f"Scan initiated for {req.repo_url}"
    }


@router.post("/scan/user", response_model=list[GitHubRepoItem])
async def get_user_repositories(req: ScanUserRequest):
    """Fetches public repositories for a GitHub user or organization."""
    if not req.username.strip():
        raise HTTPException(status_code=400, detail="GitHub username or organization handle is required.")
    try:
        repos = await github_client.get_user_repositories(
            username=req.username,
            limit=req.max_repos or 20
        )
        return repos
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/scan/{scan_id}", response_model=ScanResult)
def get_scan_result(scan_id: str):
    """Retrieves full scan result and findings."""
    if scan_id not in job_manager.results:
        raise HTTPException(status_code=404, detail="Scan ID not found.")
    return job_manager.results[scan_id]


@router.get("/scan/{scan_id}/progress", response_model=ScanProgress)
def get_scan_progress(scan_id: str):
    """Retrieves scan execution progress."""
    if scan_id not in job_manager.progress:
        raise HTTPException(status_code=404, detail="Scan ID not found.")
    return job_manager.progress[scan_id]


@router.get("/scan/{scan_id}/events")
async def stream_scan_events(scan_id: str):
    """Server-Sent Events (SSE) live progress stream."""
    if scan_id not in job_manager.progress:
        raise HTTPException(status_code=404, detail="Scan ID not found.")

    async def event_generator():
        async for progress_update in job_manager.subscribe_progress(scan_id):
            yield {
                "event": "progress",
                "data": json.dumps(progress_update)
            }

    return EventSourceResponse(event_generator())


@router.post("/precommit/generate")
def create_precommit_config(req: PreCommitConfigRequest):
    """Generates a downloadable .pre-commit-config.yaml tailored to user settings."""
    config_yaml = generate_precommit_config(
        detected_rules=req.rules,
        include_shannon_entropy=req.include_shannon_entropy,
        fail_on_severity=req.fail_on_severity
    )
    workflow_yaml = generate_github_actions_workflow()
    return {
        "precommit_yaml": config_yaml,
        "github_actions_workflow": workflow_yaml,
        "filename": ".pre-commit-config.yaml"
    }


@router.get("/scan/{scan_id}/export/{export_format}")
def export_scan_report(scan_id: str, export_format: str = Path(..., pattern="^(json|csv|markdown)$")):
    """Exports findings as JSON, CSV, or Markdown Security Advisory."""
    if scan_id not in job_manager.results:
        raise HTTPException(status_code=404, detail="Scan ID not found.")

    res = job_manager.results[scan_id]

    if export_format == "json":
        return Response(
            content=json.dumps(res.model_dump(), indent=2),
            media_type="application/json",
            headers={"Content-Disposition": f"attachment; filename=SecretShield_Audit_{scan_id[:8]}.json"}
        )

    elif export_format == "csv":
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow([
            "Finding ID", "Severity", "Rule Name", "Secret Type", "Entropy",
            "File Path", "Line", "Commit SHA", "Author", "Is Zombie", "Masked Secret"
        ])
        for f in res.findings:
            writer.writerow([
                f.id, f.severity, f.rule_name, f.secret_type, f.entropy,
                f.file_path, f.line_number, f.commit_short_sha or "N/A",
                f.commit_author or "N/A", "YES" if f.is_deleted_in_head else "NO",
                f.masked_value
            ])
        return Response(
            content=output.getvalue(),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=SecretShield_Audit_{scan_id[:8]}.csv"}
        )

    elif export_format == "markdown":
        md = f"""# SecretShield Security Audit Advisory
**Target:** `{res.target}`  
**Audit Date:** {res.start_time}  
**Security Health Index:** {res.summary.health_score}/100  
**Total Vulnerabilities Found:** {res.summary.total_findings}  
- **Critical:** {res.summary.critical_count}
- **High:** {res.summary.high_count}
- **Medium:** {res.summary.medium_count}
- **Low:** {res.summary.low_count}
- **Historical Zombie Leaks:** {res.summary.zombie_secrets_count}

---

## Detailed Findings

| Severity | Type | File:Line | Commit SHA | Entropy | Masked Credential |
| :--- | :--- | :--- | :--- | :--- | :--- |
"""
        for f in res.findings:
            md += f"| **{f.severity}** | {f.secret_type} | `{f.file_path}:{f.line_number}` | `{f.commit_short_sha or 'HEAD'}` | {f.entropy:.2f} | `{f.masked_value}` |\n"

        md += "\n## Recommended Immediate Actions\n"
        md += "1. Revoke all Critical credentials immediately at the provider dashboard.\n"
        md += "2. Purge historical git commit records using `git filter-repo`.\n"
        md += "3. Install the SecretShield pre-commit hook (`.pre-commit-config.yaml`) to prevent future leaks.\n"

        return PlainTextResponse(
            content=md,
            headers={"Content-Disposition": f"attachment; filename=SecretShield_Report_{scan_id[:8]}.md"}
        )


@router.get("/rules", response_model=list[RuleCatalogItem])
def get_rule_catalog():
    """Returns all active secret detection rules with descriptions and entropy requirements."""
    return [
        RuleCatalogItem(
            id=r.id,
            name=r.name,
            secret_type=r.secret_type,
            severity=r.severity,
            description=r.description,
            min_entropy=r.min_entropy
        )
        for r in SECRET_RULES
    ]


@router.post("/verify-token")
async def verify_secret_liveness(req: VerifyTokenRequest):
    """Safely and non-destructively probes an API token against provider ping endpoints."""
    return await secret_verifier.verify_token(req.secret_type, req.raw_token)


@router.post("/baseline/generate")
def generate_detect_secrets_baseline(req: BaselineRequest):
    """Generates a Yelp detect-secrets compatible .secrets.baseline JSON structure."""
    results_map = {}
    for f in req.findings:
        fpath = f.file_path
        if fpath not in results_map:
            results_map[fpath] = []
        results_map[fpath].append({
            "type": f.secret_type.value,
            "filename": fpath,
            "line_number": f.line_number,
            "hashed_secret": f.masked_value,
            "is_verified": False
        })

    baseline = {
        "version": "1.5.0",
        "generated_by": "SecretShield Security Auditor",
        "plugins_used": [
            {"name": "AWSKeyDetector"},
            {"name": "OpenAIKeyDetector"},
            {"name": "StripeKeyDetector"},
            {"name": "ShannonEntropyDetector"}
        ],
        "results": results_map
    }
    return Response(
        content=json.dumps(baseline, indent=2),
        media_type="application/json",
        headers={"Content-Disposition": "attachment; filename=.secrets.baseline"}
    )


@router.post("/remediation-script/generate")
def generate_remediation_script(req: RemediationScriptRequest):
    """Generates an automated shell or PowerShell script to purge all detected secrets via git-filter-repo."""
    if req.script_type == "powershell":
        ps_lines = [
            "# SecretShield Automated Git History Purge Script (PowerShell)",
            "# CAUTION: This rewrites git commit history to eradicate leaked credentials.",
            "# Ensure teammates commit or stash their work before running this.",
            "",
            "Write-Host 'Checking for git-filter-repo...' -ForegroundColor Cyan",
            "if (-not (Get-Command git-filter-repo -ErrorAction SilentlyContinue)) {",
            "    pip install git-filter-repo",
            "}",
            "",
            "# Create temporary replacement patterns file",
            "$replaceFile = New-TemporaryFile",
        ]
        for f in req.findings:
            ps_lines.append(f"Add-Content -Path $replaceFile -Value '{f.masked_value}===>REMOVED_BY_SECRETSHIELD'")

        ps_lines.extend([
            "",
            "Write-Host 'Executing git-filter-repo across all branches...' -ForegroundColor Yellow",
            "git filter-repo --replace-text $replaceFile --force",
            "Remove-Item $replaceFile -Force",
            "",
            "Write-Host 'Eradication complete! Review your repo and run:' -ForegroundColor Green",
            "Write-Host '  git push origin --force --all' -ForegroundColor White",
            "Write-Host '  git push origin --force --tags' -ForegroundColor White",
        ])
        return PlainTextResponse(
            content="\n".join(ps_lines),
            headers={"Content-Disposition": "attachment; filename=purge_secrets.ps1"}
        )
    else:
        bash_lines = [
            "#!/usr/bin/env bash",
            "# SecretShield Automated Git History Purge Script (Bash)",
            "# CAUTION: This rewrites git commit history to eradicate leaked credentials.",
            "set -euo pipefail",
            "",
            "echo '>>> Checking git-filter-repo installation...'",
            "if ! command -v git-filter-repo &> /dev/null; then",
            "    pip install git-filter-repo",
            "fi",
            "",
            "REPLACE_FILE=$(mktemp)",
        ]
        for f in req.findings:
            bash_lines.append(f"echo '{f.masked_value}===>REMOVED_BY_SECRETSHIELD' >> \"$REPLACE_FILE\"")

        bash_lines.extend([
            "",
            "echo '>>> Purging detected secrets from all commits and branches...'",
            "git filter-repo --replace-text \"$REPLACE_FILE\" --force",
            "rm -f \"$REPLACE_FILE\"",
            "",
            "echo '>>> Successfully sanitized repository history!'",
            "echo '>>> Run: git push origin --force --all && git push origin --force --tags'",
        ])
        return PlainTextResponse(
            content="\n".join(bash_lines),
            headers={"Content-Disposition": "attachment; filename=purge_secrets.sh"}
        )

