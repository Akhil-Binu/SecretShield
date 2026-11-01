import { Finding, ScanResult, ScanProgress, SeverityLevel } from '../types';
import { CLIENT_RULES, calculateShannonEntropy, maskSecretValue, isLikelyChecksumOrHash } from './clientScanner';
import { getStoredGitHubToken } from './githubAuth';

export function parseGitHubRepo(input: string): { owner: string; repo: string } | null {
  const clean = input.trim().replace(/\.git$/, '');
  const match = clean.match(/(?:github\.com\/|^)([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)(?:\/.*)?$/);
  if (match) {
    return { owner: match[1], repo: match[2] };
  }
  return null;
}

export async function scanGitHubRepositoryClientSide(
  repoUrl: string,
  maxCommits: number = 20,
  onProgress?: (prog: ScanProgress) => void
): Promise<ScanResult> {
  const parsed = parseGitHubRepo(repoUrl);
  if (!parsed) {
    throw new Error('Invalid GitHub repository format. Use "owner/repo" or "https://github.com/owner/repo".');
  }

  const { owner, repo } = parsed;
  const scanId = `repo-${Date.now()}`;
  const startTime = new Date().toISOString();

  onProgress?.({
    scan_id: scanId,
    status: 'CLONING',
    progress_percent: 15,
    message: `Fetching commit log for ${owner}/${repo} from GitHub REST API...`,
    total_commits: 0,
    scanned_commits: 0,
    scanned_files: 0,
    findings_count: 0,
    current_target: `${owner}/${repo}`
  });

  // 1. Fetch commits list
  const limit = Math.min(maxCommits, 30);
  const ghToken = getStoredGitHubToken();
  const reqHeaders: Record<string, string> = {
    'Accept': 'application/vnd.github.v3+json'
  };
  if (ghToken) {
    reqHeaders['Authorization'] = `token ${ghToken}`;
  }

  const commitsRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=${limit}`, {
    headers: reqHeaders
  });

  if (!commitsRes.ok) {
    if (commitsRes.status === 404) {
      throw new Error(`Repository "${owner}/${repo}" not found or is private.`);
    }
    if (commitsRes.status === 403) {
      const resetHeader = commitsRes.headers.get('x-ratelimit-reset');
      const resetTime = resetHeader ? new Date(parseInt(resetHeader, 10) * 1000).toLocaleTimeString() : 'soon';
      throw new Error(`GitHub API rate limit exceeded (60 req/hr unauthenticated limit). Resets at ${resetTime}. Click "GitHub Token" in the top bar to unlock 5,000 requests/hour.`);
    }
    throw new Error(`GitHub API returned error ${commitsRes.status}.`);
  }

  const commitsList = await commitsRes.json();
  const totalCommits = commitsList.length;
  const allFindings: Finding[] = [];
  const scannedFiles = new Set<string>();

  // Head content cache for accurate active vs zombie classification
  const headFileCache = new Map<string, string | null>();

  async function fetchHeadContent(filepath: string): Promise<string | null> {
    if (headFileCache.has(filepath)) {
      return headFileCache.get(filepath)!;
    }
    try {
      const res = await fetch(`https://raw.githubusercontent.com/${owner}/${repo}/HEAD/${filepath}`);
      if (res.ok) {
        const text = await res.text();
        headFileCache.set(filepath, text);
        return text;
      }
    } catch (e) {}
    headFileCache.set(filepath, null);
    return null;
  }

  // Phase 1: Inspect known high-risk credential files in repository HEAD
  const commonKeyFiles = [
    'VirusTotal_APIKey.txt',
    'virustotal_apikey.txt',
    'api_key.txt',
    'apikey.txt',
    'secret.txt',
    'secrets.txt',
    '.env',
    '.env.local',
    '.env.production'
  ];

  for (const kf of commonKeyFiles) {
    const text = await fetchHeadContent(kf);
    if (text) {
      scannedFiles.add(kf);
      const lines = text.split('\n');
      lines.forEach((line, lineIdx) => {
        const lineNum = lineIdx + 1;
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return;

        CLIENT_RULES.forEach((rule) => {
          if (rule.id === 'VIRUSTOTAL_API_KEY' && isLikelyChecksumOrHash(trimmed, kf)) {
            return;
          }
          rule.pattern.lastIndex = 0;
          let match: RegExpExecArray | null;
          while ((match = rule.pattern.exec(trimmed)) !== null) {
            const rawSecret = match[1] || match[0];
            const entropy = calculateShannonEntropy(rawSecret);
            if (entropy >= rule.minEntropy) {
              const masked = maskSecretValue(rawSecret);
              allFindings.push({
                id: `head-${kf}-${rule.id}-${lineNum}`,
                rule_id: rule.id,
                rule_name: rule.name,
                secret_type: rule.type,
                severity: rule.severity,
                description: rule.description,
                masked_value: masked,
                raw_preview: rawSecret.slice(0, 8) + '...',
                entropy: entropy,
                file_path: kf,
                line_number: lineNum,
                commit_sha: undefined,
                commit_short_sha: 'HEAD',
                commit_author: 'Current Repository State',
                commit_date: 'Present in HEAD',
                commit_message: `Active credential unencrypted in ${kf}`,
                is_deleted_in_head: false,
                active_in_head: true,
                line_snippet: trimmed.replace(rawSecret, masked).slice(0, 180),
                remediation_guide: {
                  provider: rule.name.split(' ')[0],
                  rotation_url: rule.rotationUrl,
                  instructions: rule.instructions,
                  cli_commands: rule.cliCommands,
                  urgency: rule.severity
                }
              });
            }
          }
        });
      });
    }
  }

  // Phase 2: Walk each commit and inspect patch diffs for zombie secrets and past leaks
  for (let i = 0; i < totalCommits; i++) {
    const c = commitsList[i];
    const sha = c.sha;
    const shortSha = sha.slice(0, 7);
    const authorName = c.commit?.author?.name || 'Developer';
    const authorDate = c.commit?.author?.date || '';
    const commitMsg = c.commit?.message?.split('\n')[0] || '';

    const progressPct = 20 + Math.round(((i + 1) / totalCommits) * 75);
    onProgress?.({
      scan_id: scanId,
      status: 'SCANNING',
      progress_percent: progressPct,
      message: `Auditing commit ${i + 1}/${totalCommits} (${shortSha}): ${commitMsg.slice(0, 35)}...`,
      total_commits: totalCommits,
      scanned_commits: i + 1,
      scanned_files: scannedFiles.size,
      findings_count: allFindings.length,
      current_target: `${owner}/${repo}`
    });

    try {
      const detailRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits/${sha}`, {
        headers: reqHeaders
      });

      if (detailRes.ok) {
        const detail = await detailRes.json();
        const files = detail.files || [];

        for (const file of files) {
          const filename = file.filename;
          scannedFiles.add(filename);
          const patch = file.patch || '';
          if (!patch) continue;

          let currentLineNum = 1;
          const patchLines = patch.split('\n');

          for (const line of patchLines) {
            if (line.startsWith('@@ ')) {
              const m = line.match(/@@\s+-[0-9,]+\s+\+([0-9]+)/);
              if (m) currentLineNum = parseInt(m[1], 10);
              continue;
            }

            // Audit added or modified lines in this commit
            if (line.startsWith('+') && !line.startsWith('+++')) {
              const codeLine = line.slice(1);

              for (const rule of CLIENT_RULES) {
                if (rule.id === 'VIRUSTOTAL_API_KEY' && isLikelyChecksumOrHash(codeLine, filename)) {
                  continue;
                }

                rule.pattern.lastIndex = 0;
                let match: RegExpExecArray | null;
                while ((match = rule.pattern.exec(codeLine)) !== null) {
                  const rawSecret = match[1] || match[0];
                  const entropy = calculateShannonEntropy(rawSecret);

                  if (entropy >= rule.minEntropy) {
                    const masked = maskSecretValue(rawSecret);

                    // Verify if this specific secret value is still active in HEAD
                    const headText = await fetchHeadContent(filename);
                    const isActiveInHead = headText !== null && headText.includes(rawSecret);
                    const isZombie = !isActiveInHead;

                    allFindings.push({
                      id: `hf-${shortSha}-${filename}-${rule.id}-${Math.random().toString(36).slice(2, 6)}`,
                      rule_id: rule.id,
                      rule_name: rule.name,
                      secret_type: rule.type,
                      severity: rule.severity,
                      description: rule.description,
                      masked_value: masked,
                      raw_preview: rawSecret.slice(0, 8) + '...',
                      entropy: entropy,
                      file_path: filename,
                      line_number: currentLineNum,
                      commit_sha: sha,
                      commit_short_sha: shortSha,
                      commit_author: authorName,
                      commit_date: authorDate,
                      commit_message: commitMsg,
                      is_deleted_in_head: isZombie,
                      active_in_head: isActiveInHead,
                      line_snippet: codeLine.replace(rawSecret, masked).trim().slice(0, 180),
                      remediation_guide: {
                        provider: rule.name.split(' ')[0],
                        rotation_url: rule.rotationUrl,
                        instructions: rule.instructions,
                        cli_commands: rule.cliCommands,
                        urgency: rule.severity
                      }
                    });
                  }
                }
              }

              currentLineNum++;
            }
          }
        }
      }
    } catch (e) {
      // Continue next commit if one fails
    }
  }

  // De-duplicate findings (prefer active in HEAD over historical zombie duplicates)
  const seenMap = new Map<string, Finding>();
  for (const f of allFindings) {
    const key = `${f.rule_id}-${f.masked_value}-${f.file_path}`;
    if (!seenMap.has(key)) {
      seenMap.set(key, f);
    } else {
      const existing = seenMap.get(key)!;
      if (f.active_in_head && !existing.active_in_head) {
        seenMap.set(key, f);
      }
    }
  }
  const uniqueFindings = Array.from(seenMap.values());

  const critical = uniqueFindings.filter((f) => f.severity === 'CRITICAL').length;
  const high = uniqueFindings.filter((f) => f.severity === 'HIGH').length;
  const medium = uniqueFindings.filter((f) => f.severity === 'MEDIUM').length;
  const low = uniqueFindings.filter((f) => f.severity === 'LOW').length;
  const zombies = uniqueFindings.filter((f) => f.is_deleted_in_head).length;

  const penalty = critical * 25 + high * 15 + medium * 7 + low * 2;
  const health_score = Math.max(0, 100 - penalty);

  onProgress?.({
    scan_id: scanId,
    status: 'COMPLETED',
    progress_percent: 100,
    message: `Audit complete! Analyzed ${totalCommits} commits across ${scannedFiles.size} files.`,
    total_commits: totalCommits,
    scanned_commits: totalCommits,
    scanned_files: scannedFiles.size,
    findings_count: uniqueFindings.length,
    current_target: `${owner}/${repo}`
  });

  return {
    scan_id: scanId,
    target: `${owner}/${repo}`,
    source_type: 'REPO',
    status: 'COMPLETED',
    start_time: startTime,
    end_time: new Date().toISOString(),
    duration_seconds: Math.round(((Date.now() - new Date(startTime).getTime()) / 1000) * 10) / 10,
    findings: uniqueFindings,
    summary: {
      total_findings: uniqueFindings.length,
      critical_count: critical,
      high_count: high,
      medium_count: medium,
      low_count: low,
      health_score,
      zombie_secrets_count: zombies,
      scanned_commits: totalCommits,
      scanned_files: scannedFiles.size,
      scan_duration_seconds: Math.round(((Date.now() - new Date(startTime).getTime()) / 1000) * 10) / 10
    }
  };
}
