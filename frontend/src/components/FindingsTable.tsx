import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Copy,
  Check,
  Eye,
  EyeOff,
  GitCommit,
  ExternalLink,
  ShieldAlert,
  Ghost,
  CheckCircle,
  FileCode,
  Sparkles,
  Zap,
  Download,
  Terminal,
  Activity,
  Loader2
} from 'lucide-react';
import { Finding, SeverityLevel, TokenVerificationResult } from '../types';
import { getSeverityClasses } from '../utils/formatters';
import { verifyTokenLiveness, downloadBaselineFile, downloadRemediationScript } from '../api/client';

interface FindingsTableProps {
  findings: Finding[];
  onSelectFindingForRemediation: (finding: Finding) => void;
  onSelectFindingForDetail: (finding: Finding) => void;
}

export const FindingsTable: React.FC<FindingsTableProps> = ({
  findings,
  onSelectFindingForRemediation,
  onSelectFindingForDetail,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [zombieFilter, setZombieFilter] = useState<string>('ALL');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Live Token Verification state per finding id
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [verificationResults, setVerificationResults] = useState<Record<string, TokenVerificationResult>>({});

  const filteredFindings = useMemo(() => {
    return findings.filter((f) => {
      if (severityFilter !== 'ALL' && f.severity !== severityFilter) {
        return false;
      }
      if (zombieFilter === 'ZOMBIE_ONLY' && !f.is_deleted_in_head) {
        return false;
      }
      if (zombieFilter === 'ACTIVE_ONLY' && f.is_deleted_in_head) {
        return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchFile = f.file_path.toLowerCase().includes(query);
        const matchRule = f.rule_name.toLowerCase().includes(query);
        const matchType = f.secret_type.toLowerCase().includes(query);
        const matchAuthor = (f.commit_author || '').toLowerCase().includes(query);
        const matchSha = (f.commit_short_sha || '').toLowerCase().includes(query);
        return matchFile || matchRule || matchType || matchAuthor || matchSha;
      }
      return true;
    });
  }, [findings, severityFilter, zombieFilter, searchQuery]);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleVerify = async (finding: Finding) => {
    setVerifyingId(finding.id);
    try {
      // Use raw preview prefix or masked representation
      const tokenCandidate = finding.raw_preview?.replace('...', '') || finding.masked_value;
      const res = await verifyTokenLiveness(finding.secret_type, tokenCandidate);
      setVerificationResults((prev) => ({ ...prev, [finding.id]: res }));
    } catch (e: any) {
      setVerificationResults((prev) => ({
        ...prev,
        [finding.id]: {
          status: 'ERROR',
          message: e.message || 'Verification failed',
          latency_ms: 0,
        },
      }));
    } finally {
      setVerifyingId(null);
    }
  };

  if (findings.length === 0) {
    return (
      <div className="w-full max-w-5xl mx-auto my-6 px-4">
        <div className="rounded-2xl border border-emerald-500/30 bg-shield-900/80 p-12 text-center shadow-xl">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <CheckCircle className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-white mb-1">
            Zero Leaks Detected!
          </h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            No known API keys, AWS credentials, or high-entropy tokens were identified in the audited scope.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto my-6 px-4">
      <div className="rounded-2xl border border-shield-700 bg-shield-900/90 shadow-2xl overflow-hidden backdrop-blur-xl">
        {/* Controls: Search, Filters, and Baseline Downloads */}
        <div className="p-4 sm:p-5 border-b border-shield-800 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-shield-950/40">
          {/* Search box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search by filename, secret type, author, or commit SHA..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-shield-950 border border-shield-700 rounded-xl text-slate-100 placeholder-slate-500 text-xs font-mono focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition"
            />
          </div>

          {/* Filter dropdowns and Export tools */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center space-x-1">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="bg-shield-950 border border-shield-700 rounded-lg px-2.5 py-1.5 text-slate-200 font-mono text-xs focus:outline-none focus:border-cyan-400"
              >
                <option value="ALL">All Severities</option>
                <option value="CRITICAL">Critical Only</option>
                <option value="HIGH">High Only</option>
                <option value="MEDIUM">Medium Only</option>
                <option value="LOW">Low Only</option>
              </select>
            </div>

            <select
              value={zombieFilter}
              onChange={(e) => setZombieFilter(e.target.value)}
              className="bg-shield-950 border border-shield-700 rounded-lg px-2.5 py-1.5 text-slate-200 font-mono text-xs focus:outline-none focus:border-cyan-400"
            >
              <option value="ALL">All Exposure States</option>
              <option value="ZOMBIE_ONLY">Zombies Only</option>
              <option value="ACTIVE_ONLY">Active in HEAD Only</option>
            </select>

            <button
              onClick={() => downloadBaselineFile(findings)}
              className="px-2.5 py-1.5 rounded-lg bg-shield-850 hover:bg-shield-800 text-slate-300 hover:text-white border border-shield-700 text-xs font-mono transition flex items-center space-x-1"
              title="Download Yelp detect-secrets compatible .secrets.baseline"
            >
              <Download className="w-3 h-3 text-cyan-400" />
              <span>.baseline</span>
            </button>

            <button
              onClick={() => downloadRemediationScript(findings, 'powershell')}
              className="px-2.5 py-1.5 rounded-lg bg-purple-950/40 hover:bg-purple-950/70 text-purple-300 border border-purple-500/40 text-xs font-mono transition flex items-center space-x-1"
              title="Download automated git-filter-repo purge script"
            >
              <Terminal className="w-3 h-3 text-purple-400" />
              <span>Purge Script (.ps1)</span>
            </button>
          </div>
        </div>

        {/* Findings Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-shield-800 bg-shield-950/80 text-slate-400 font-mono uppercase text-[11px] tracking-wider">
                <th className="py-3 px-4 font-semibold">Severity</th>
                <th className="py-3 px-4 font-semibold">Token / Secret Type</th>
                <th className="py-3 px-4 font-semibold">Masked Value</th>
                <th className="py-3 px-4 font-semibold">Entropy (H)</th>
                <th className="py-3 px-4 font-semibold">File & Line</th>
                <th className="py-3 px-4 font-semibold">Commit / Author</th>
                <th className="py-3 px-4 font-semibold">Git Status</th>
                <th className="py-3 px-4 font-semibold">Live Probe</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-shield-800/60 font-mono">
              {filteredFindings.map((finding) => {
                const sev = getSeverityClasses(finding.severity);
                const verification = verificationResults[finding.id];
                const isVerifying = verifyingId === finding.id;

                return (
                  <tr
                    key={finding.id}
                    className="hover:bg-shield-850/60 transition-colors group"
                  >
                    {/* Severity */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase ${sev.badge}`}>
                        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${sev.dot}`} />
                        {finding.severity}
                      </span>
                    </td>

                    {/* Secret Type & Rule */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-white">
                        {finding.secret_type}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate max-w-[170px]">
                        {finding.rule_name}
                      </div>
                    </td>

                    {/* Masked Secret Value */}
                    <td className="py-3.5 px-4 font-mono whitespace-nowrap">
                      <div className="flex items-center space-x-1.5">
                        <span className="px-2 py-0.5 rounded bg-shield-950 border border-shield-800 text-slate-200 text-[11px] tracking-wider">
                          {finding.masked_value}
                        </span>
                        <button
                          onClick={() => handleCopy(finding.id, finding.masked_value)}
                          className="p-1 rounded hover:bg-shield-700 text-slate-400 hover:text-white transition"
                          title="Copy masked token identifier"
                        >
                          {copiedId === finding.id ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </td>

                    {/* Shannon Entropy */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <div className="w-12 h-1.5 bg-shield-950 rounded-full overflow-hidden border border-shield-800">
                          <div
                            className={`h-full ${
                              finding.entropy >= 4.0
                                ? 'bg-cyan-400'
                                : finding.entropy >= 3.2
                                ? 'bg-amber-400'
                                : 'bg-slate-500'
                            }`}
                            style={{
                              width: `${Math.min(100, (finding.entropy / 5.5) * 100)}%`,
                            }}
                          />
                        </div>
                        <span className="text-slate-300 font-bold text-[11px]">
                          {finding.entropy.toFixed(2)}
                        </span>
                      </div>
                    </td>

                    {/* File Path & Line */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="text-slate-200 font-medium truncate max-w-[150px]" title={finding.file_path}>
                        {finding.file_path}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Line {finding.line_number}
                      </div>
                    </td>

                    {/* Commit SHA & Author */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {finding.commit_short_sha ? (
                        <div>
                          <div className="flex items-center space-x-1 text-cyan-400 font-bold">
                            <GitCommit className="w-3 h-3" />
                            <span>{finding.commit_short_sha}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 truncate max-w-[110px]">
                            {finding.commit_author || 'Developer'}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-500 italic">Input Snippet</span>
                      )}
                    </td>

                    {/* Git Status: Zombie vs Active */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {finding.is_deleted_in_head ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-500/15 text-purple-300 border border-purple-500/30">
                          <Ghost className="w-3 h-3 mr-1 text-purple-400" />
                          Zombie (History Only)
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/10 text-rose-300 border border-rose-500/20">
                          <ShieldAlert className="w-3 h-3 mr-1 text-rose-400" />
                          Active in HEAD
                        </span>
                      )}
                    </td>

                    {/* Live Probe Liveness Indicator */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {verification ? (
                        <div className="flex items-center space-x-1.5" title={verification.message}>
                          {verification.status === 'ACTIVE' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-300 border border-red-500/40 animate-pulse">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-400 mr-1 animate-ping" />
                              LIVE KEY
                            </span>
                          )}
                          {verification.status === 'REVOKED' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                              <CheckCircle className="w-3 h-3 mr-1 text-emerald-400" />
                              REVOKED
                            </span>
                          )}
                          {verification.status === 'MANUAL_CHECK' && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400">
                              MANUAL
                            </span>
                          )}
                          {verification.status === 'ERROR' && (
                            <span className="text-[10px] text-amber-400">TIMEOUT</span>
                          )}
                          <span className="text-[9px] text-slate-500">
                            {verification.latency_ms}ms
                          </span>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleVerify(finding)}
                          disabled={isVerifying}
                          className="px-2 py-0.5 rounded bg-shield-800 hover:bg-shield-700 text-slate-300 hover:text-white border border-shield-700 text-[10px] flex items-center space-x-1 transition disabled:opacity-50"
                          title="Non-destructively test token against vendor ping endpoint"
                        >
                          {isVerifying ? (
                            <Loader2 className="w-3 h-3 animate-spin text-cyan-400" />
                          ) : (
                            <Activity className="w-3 h-3 text-cyan-400" />
                          )}
                          <span>Probe</span>
                        </button>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          onClick={() => onSelectFindingForDetail(finding)}
                          className="px-2 py-1 rounded bg-shield-850 hover:bg-shield-800 text-slate-300 hover:text-white border border-shield-700 transition"
                          title="Inspect code context diff and commit timeline"
                        >
                          Context
                        </button>
                        <button
                          onClick={() => onSelectFindingForRemediation(finding)}
                          className="px-2 py-1 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 transition font-semibold"
                          title="1-Click Revocation and Rotation Guide"
                        >
                          Revoke
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer info */}
        <div className="p-3 bg-shield-950/80 border-t border-shield-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 font-mono gap-2">
          <span>
            Showing {filteredFindings.length} of {findings.length} audited vulnerabilities
          </span>
          <span className="text-slate-500 text-[11px]">
            Tip: Use the .baseline button to whitelist known test secrets in CI.
          </span>
        </div>
      </div>
    </div>
  );
};
