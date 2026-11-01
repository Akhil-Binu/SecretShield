import { ScanResult } from '../types';

export function exportScanClientSide(result: ScanResult, format: 'json' | 'csv' | 'markdown') {
  const baseName = `SecretShield_Audit_${result.scan_id.slice(0, 8)}`;

  if (format === 'json') {
    const jsonStr = JSON.stringify(result, null, 2);
    downloadBlob(jsonStr, `${baseName}.json`, 'application/json');
    return;
  }

  if (format === 'csv') {
    const rows = [
      ['Finding ID', 'Severity', 'Rule Name', 'Secret Type', 'Entropy', 'File Path', 'Line', 'Commit SHA', 'Author', 'Is Zombie', 'Masked Secret']
    ];

    for (const f of result.findings) {
      rows.push([
        f.id,
        f.severity,
        `"${f.rule_name.replace(/"/g, '""')}"`,
        `"${f.secret_type.replace(/"/g, '""')}"`,
        String(f.entropy),
        `"${f.file_path.replace(/"/g, '""')}"`,
        String(f.line_number),
        f.commit_short_sha || 'N/A',
        `"${(f.commit_author || 'N/A').replace(/"/g, '""')}"`,
        f.is_deleted_in_head ? 'YES' : 'NO',
        `"${f.masked_value.replace(/"/g, '""')}"`
      ]);
    }

    const csvContent = rows.map((r) => r.join(',')).join('\n');
    downloadBlob(csvContent, `${baseName}.csv`, 'text/csv;charset=utf-8;');
    return;
  }

  if (format === 'markdown') {
    const md = `# 🛡️ SecretShield — Security Audit Advisory
**Target:** \`${result.target}\`  
**Scan ID:** \`${result.scan_id}\`  
**Security Health Score:** **${result.summary.health_score}/100**  
**Total Vulnerabilities Detected:** **${result.summary.total_findings}** (Critical: ${result.summary.critical_count}, High: ${result.summary.high_count}, Medium: ${result.summary.medium_count}, Low: ${result.summary.low_count})  
**Zombie Secrets (Historical Commits):** **${result.summary.zombie_secrets_count}**  

---

## Findings Summary
| Severity | Type | File | Line | Commit | Status |
|---|---|---|---|---|---|
${result.findings.map(f => `| **${f.severity}** | ${f.secret_type} | \`${f.file_path}\` | ${f.line_number} | \`${f.commit_short_sha || 'HEAD'}\` | ${f.is_deleted_in_head ? '⚠️ Zombie (Deleted in HEAD)' : '🔴 Active in HEAD'} |`).join('\n')}

---

## Detailed Findings & Remediation

${result.findings.map((f, i) => `### Finding ${i + 1}: ${f.secret_type} [${f.severity}]
- **Rule:** ${f.rule_name}
- **Location:** \`${f.file_path}:${f.line_number}\`
- **Shannon Entropy:** \`${f.entropy}\`
- **Masked Token:** \`${f.masked_value}\`
- **Commit:** \`${f.commit_short_sha || 'HEAD'}\` by ${f.commit_author || 'N/A'} on ${f.commit_date || 'N/A'}
- **Message:** *${f.commit_message || 'N/A'}*
- **Remediation Steps:**
${f.remediation_guide.instructions.map(inst => `  - ${inst}`).join('\n')}

**Rotation URL:** [${f.remediation_guide.rotation_url}](${f.remediation_guide.rotation_url})

\`\`\`bash
${f.remediation_guide.cli_commands.join('\n')}
\`\`\`
`).join('\n\n')}

---
*Report generated automatically by [SecretShield](https://github.com/Akhil-Binu/SecretShield).*
`;
    downloadBlob(md, `${baseName}_Advisory.md`, 'text/markdown;charset=utf-8;');
  }
}

function downloadBlob(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
