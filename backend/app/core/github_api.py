import os
import httpx
from typing import List, Optional
from app.models.schemas import GitHubRepoItem


class GitHubClient:
    def __init__(self, token: Optional[str] = None):
        self.token = token or os.getenv("GITHUB_TOKEN")
        self.headers = {
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "SecretShield-Security-Auditor/1.0"
        }
        if self.token:
            self.headers["Authorization"] = f"Bearer {self.token}"

    async def get_user_repositories(self, username: str, limit: int = 20) -> List[GitHubRepoItem]:
        """Fetches public repositories for a user or organization."""
        clean_user = username.strip().lstrip("@")
        url = f"https://api.github.com/users/{clean_user}/repos?sort=updated&per_page={limit}"

        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(url, headers=self.headers)
            if resp.status_code == 404:
                # Try orgs endpoint
                org_url = f"https://api.github.com/orgs/{clean_user}/repos?sort=updated&per_page={limit}"
                resp = await client.get(org_url, headers=self.headers)
                if resp.status_code == 404:
                    raise ValueError(f"GitHub user or organization '{clean_user}' not found.")

            if resp.status_code == 403 and "rate limit" in resp.text.lower():
                raise RuntimeError("GitHub API rate limit exceeded. Please wait a few minutes or provide a GITHUB_TOKEN.")

            if resp.status_code != 200:
                raise RuntimeError(f"GitHub API returned error {resp.status_code}: {resp.text}")

            repos_data = resp.json()
            results = []
            for item in repos_data:
                results.append(GitHubRepoItem(
                    name=item.get("name", ""),
                    full_name=item.get("full_name", ""),
                    html_url=item.get("html_url", ""),
                    description=item.get("description"),
                    fork=item.get("fork", False),
                    stars=item.get("stargazers_count", 0),
                    language=item.get("language"),
                    updated_at=item.get("updated_at", ""),
                    default_branch=item.get("default_branch", "main"),
                ))
            return results
