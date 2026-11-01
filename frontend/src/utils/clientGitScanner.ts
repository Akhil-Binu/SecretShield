import { Finding, ScanResult, ScanProgress, SeverityLevel } from '../types';
import { CLIENT_RULES, calculateShannonEntropy, maskSecretValue } from './clientScanner';

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
  const commitsRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=${limit}`, {
    headers: { 'Accept': 'application/vnd.github.v3+json' }
  });

  if (!commitsRes.ok) {
    if (commitsRes.status === 404) {
      throw new Error(`Repository "${owner}/${repo}" not found or is private.`);
    }
    if (commitsRes.status === 403) {
      throw new Error('GitHub API rate limit exceeded. Please wait a few minutes or try scanning a code snippet.');
    }
    throw new Error(`GitHub API returned error ${commitsRes.status}.`);
  }

  const commitsList = await commitsRes.json();
  const totalCommits = commitsList.length;
  const allFindings: Finding[] = [];
  const scannedFiles = new Set<string>();

  // 2. Walk each commit and inspect patch diffs
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
        headers: { 'Accept': 'application/vnd.github.v3+json' }
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

            // Only audit added lines in this commit
            if (line.startsWith('+') && !line.startsWith('+++')) {
              const codeLine = line.slice(1);

              CLIENT_RULES.forEach((rule) => {
                rule.pattern.lastIndex = 0;
                let match: RegExpExecArray | null;
                while ((match = rule.pattern.exec(codeLine)) !== null) {
                  const rawSecret = match[1] || match[0];
                  const entropy = calculateShannonEntropy(rawSecret);

                  if (entropy >= rule.minEntropy) {
                    const masked = maskSecretValue(rawSecret);
                    const isZombie = i > 0; // If committed in past commit (index > 0), likely a zombie leak

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
                      active_in_head: !isZombie,
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
              });

              currentLineNum++;
            }
          }
        }
      }
    } catch (e) {
      // Continue next commit if one fails
    }
  }

  // De-duplicate findings
  const uniqueFindings: Finding[] = [];
  const seenKeys = new Set<string>();
  for (const f of allFindings) {
    const key = `${f.rule_id}-${f.masked_value}-${f.file_path}-${f.commit_short_sha}`;
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      uniqueFindings.push(f);
    }
  }

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
