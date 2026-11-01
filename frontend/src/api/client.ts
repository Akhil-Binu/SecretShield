import {
  ScanResult,
  ScanProgress,
  GitHubRepoItem,
  PreCommitResponse,
  RuleCatalogItem,
  TokenVerificationResult,
  Finding
} from '../types';
import { scanContentClientSide } from '../utils/clientScanner';

const API_BASE = '/api';

export async function scanSnippet(code: string, title?: string, filename?: string): Promise<ScanResult> {
  try {
    const res = await fetch(`${API_BASE}/scan/snippet`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, title, filename }),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    // Backend is offline or running on static host (e.g. Hugging Face Spaces)
  }
  return scanContentClientSide(code, filename || 'code_snippet.txt', title || 'Audited Code');
}

export async function scanRepository(repo_url: string, max_commits: number = 60): Promise<{ scan_id: string; message: string }> {
  const res = await fetch(`${API_BASE}/scan/repo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repo_url, max_commits }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to initiate repository scan.');
  }
  return res.json();
}

export async function getUserRepositories(username: string, max_repos: number = 20): Promise<GitHubRepoItem[]> {
  try {
    const res = await fetch(`${API_BASE}/scan/user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, max_repos }),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    // Fallback to direct client-side GitHub REST API
  }

  const cleanUser = username.trim().replace(/^@/, '');
  const ghRes = await fetch(`https://api.github.com/users/${cleanUser}/repos?sort=updated&per_page=${max_repos}`);
  if (!ghRes.ok) {
    throw new Error(`Failed to fetch public repositories for GitHub profile @${cleanUser}.`);
  }
  const repos = await ghRes.json();
  return repos.map((item: any) => ({
    name: item.name,
    full_name: item.full_name,
    html_url: item.html_url,
    description: item.description,
    fork: item.fork,
    stars: item.stargazers_count,
    language: item.language,
    updated_at: item.updated_at,
    default_branch: item.default_branch || 'main',
  }));
}

export async function getScanResult(scanId: string): Promise<ScanResult> {
  const res = await fetch(`${API_BASE}/scan/${scanId}`);
  if (!res.ok) {
    throw new Error('Failed to retrieve scan results.');
  }
  return res.json();
}

export async function getScanProgress(scanId: string): Promise<ScanProgress> {
  const res = await fetch(`${API_BASE}/scan/${scanId}/progress`);
  if (!res.ok) {
    throw new Error('Failed to retrieve scan progress.');
  }
  return res.json();
}

export function subscribeScanEvents(
  scanId: string,
  onProgress: (prog: ScanProgress) => void,
  onComplete: () => void,
  onError: (err: string) => void
): () => void {
  const eventSource = new EventSource(`${API_BASE}/scan/${scanId}/events`);

  eventSource.onmessage = (event) => {
    try {
      const data: ScanProgress = JSON.parse(event.data);
      onProgress(data);
      if (data.status === 'COMPLETED') {
        eventSource.close();
        onComplete();
      } else if (data.status === 'FAILED') {
        eventSource.close();
        onError(data.message || 'Scan failed.');
      }
    } catch (e) {
      console.error('Error parsing SSE event:', e);
    }
  };

  eventSource.onerror = (e) => {
    eventSource.close();
  };

  return () => {
    eventSource.close();
  };
}

export async function generatePreCommit(
  rules: string[] = [],
  include_shannon_entropy: boolean = true,
  fail_on_severity: string = 'HIGH'
): Promise<PreCommitResponse> {
  try {
    const res = await fetch(`${API_BASE}/precommit/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rules, include_shannon_entropy, fail_on_severity }),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    // Client-side fallback
  }

  const precommit_yaml = `# SecretShield Pre-Commit Configuration
repos:
  - repo: https://github.com/gitleaks/gitleaks
    rev: v8.18.2
    hooks:
      - id: gitleaks
        name: SecretShield / Gitleaks Secret Detector
        entry: gitleaks protect --verbose --redact --staged
        language: golang
        pass_filenames: false

  - repo: https://github.com/Yelp/detect-secrets
    rev: v1.5.0
    hooks:
      - id: detect-secrets
        name: SecretShield / Shannon Entropy Scanner
        args: ['--baseline', '.secrets.baseline']

  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.6.0
    hooks:
      - id: check-added-large-files
      - id: detect-private-key
      - id: check-merge-conflict
      - id: trailing-whitespace
`;

  const github_actions_workflow = `name: SecretShield CI Audit
on: [push, pull_request]
jobs:
  secret-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: gitleaks/gitleaks-action@v2
        env:
          GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}
`;

  return {
    precommit_yaml,
    github_actions_workflow,
    filename: '.pre-commit-config.yaml'
  };
}

export async function getSampleSnippets(): Promise<Record<string, { title: string; filename: string; description: string; content: string }>> {
  const res = await fetch(`${API_BASE}/sample-snippets`);
  if (!res.ok) {
    return {};
  }
  return res.json();
}

export function getExportDownloadUrl(scanId: string, format: 'json' | 'csv' | 'markdown'): string {
  return `${API_BASE}/scan/${scanId}/export/${format}`;
}

export async function verifyTokenLiveness(secret_type: string, raw_token: string): Promise<TokenVerificationResult> {
  const res = await fetch(`${API_BASE}/verify-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret_type, raw_token }),
  });
  if (!res.ok) {
    throw new Error('Failed to verify token liveness.');
  }
  return res.json();
}

export async function getRuleCatalog(): Promise<RuleCatalogItem[]> {
  const res = await fetch(`${API_BASE}/rules`);
  if (!res.ok) {
    throw new Error('Failed to load rules catalog.');
  }
  return res.json();
}

export async function downloadBaselineFile(findings: Finding[]) {
  const res = await fetch(`${API_BASE}/baseline/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ findings }),
  });
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = '.secrets.baseline';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export async function downloadRemediationScript(findings: Finding[], script_type: 'bash' | 'powershell') {
  const res = await fetch(`${API_BASE}/remediation-script/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ findings, script_type }),
  });
  const text = await res.text();
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = script_type === 'powershell' ? 'purge_secrets.ps1' : 'purge_secrets.sh';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
