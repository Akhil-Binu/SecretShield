import os
from celery import Celery
from app.core.git_engine import GitEngine

broker_url = os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/0")
backend_url = os.getenv("CELERY_RESULT_BACKEND", "redis://localhost:6379/0")

celery_app = Celery("secretshield", broker=broker_url, backend=backend_url)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
)


@celery_app.task(bind=True, name="tasks.scan_repository")
def scan_repository_task(self, repo_url: str, max_commits: int = 60):
    """Celery background task for asynchronous repository cloning and secret auditing."""
    def progress_callback(update_data):
        self.update_state(
            state="PROGRESS",
            meta={
                "progress_percent": update_data.get("progress_percent", 0),
                "message": update_data.get("message", ""),
                "scanned_commits": update_data.get("scanned_commits", 0),
                "findings_count": update_data.get("findings_count", 0),
            }
        )

    engine = GitEngine()
    result = engine.scan_git_repository(
        repo_url=repo_url,
        max_commits=max_commits,
        progress_callback=progress_callback
    )
    # Convert finding objects to dicts for JSON serialization
    findings_dicts = [f.model_dump() for f in result.get("findings", [])]
    return {
        "findings": findings_dicts,
        "total_commits": result.get("total_commits", 0),
        "scanned_files_count": result.get("scanned_files_count", 0),
    }
