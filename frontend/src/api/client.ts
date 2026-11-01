import {
  ScanResult,
  ScanProgress,
  GitHubRepoItem,
  PreCommitResponse,
  RuleCatalogItem,
  TokenVerificationResult,
  Finding
} from '../types';

const API_BASE = '/api';

export async function scanSnippet(code: string, title?: string, filename?: string): Promise<ScanResult> {
  const res = await fetch(`${API_BASE}/scan/snippet`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, title, filename }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to scan code snippet.');
  }
  return res.json();
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
  const res = await fetch(`${API_BASE}/scan/user`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, max_repos }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to fetch repositories for this GitHub profile.');
  }
  return res.json();
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
  const res = await fetch(`${API_BASE}/precommit/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rules, include_shannon_entropy, fail_on_severity }),
  });
  if (!res.ok) {
    throw new Error('Failed to generate pre-commit configuration.');
  }
  return res.json();
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
