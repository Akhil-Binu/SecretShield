import React from 'react';
import { X, ShieldAlert, GitCommit, FileCode, Copy, Check, ExternalLink, Sparkles } from 'lucide-react';
import { Finding } from '../types';
import { getSeverityClasses } from '../utils/formatters';
import { CommitTimelineVisualizer } from './CommitTimelineVisualizer';

interface FindingDetailModalProps {
  finding: Finding | null;
  onClose: () => void;
  onOpenRemediation: (finding: Finding) => void;
}

export const FindingDetailModal: React.FC<FindingDetailModalProps> = ({
  finding,
  onClose,
  onOpenRemediation,
}) => {
  const [copied, setCopied] = React.useState(false);

  if (!finding) return null;
  const sev = getSeverityClasses(finding.severity);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-3xl rounded-2xl border border-shield-700 bg-shield-900 shadow-2xl overflow-hidden font-mono">
        {/* Header */}
        <div className="p-5 border-b border-shield-800 flex items-center justify-between bg-shield-950/60">
          <div className="flex items-center space-x-3">
            <span className={`px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wider ${sev.badge}`}>
              {finding.severity}
            </span>
            <h3 className="text-lg font-bold text-white">
              {finding.secret_type}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-shield-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Rule Description */}
          <div className="p-3.5 rounded-xl bg-shield-950 border border-shield-800 text-xs text-slate-300">
            <div className="text-slate-400 font-semibold mb-1 uppercase tracking-wider text-[10px]">
              Rule: {finding.rule_name}
            </div>
            <p>{finding.description}</p>
          </div>

          {/* Code Context Preview */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center space-x-1.5">
                <FileCode className="w-4 h-4 text-cyan-400" />
                <span className="text-white font-medium">{finding.file_path}</span>
                <span>(Line {finding.line_number})</span>
              </span>
              <button
                onClick={() => handleCopy(finding.line_snippet || finding.masked_value)}
                className="flex items-center space-x-1 text-slate-400 hover:text-white transition"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy Snippet'}</span>
              </button>
            </div>

            <div className="p-4 rounded-xl bg-shield-950 border border-red-500/30 overflow-x-auto text-xs leading-relaxed">
              <div className="flex items-center space-x-2 text-red-400 font-semibold mb-2">
                <span className="text-red-500 font-bold">+</span>
                <span>Compromised Diff Addition:</span>
              </div>
              <code className="text-red-200 block whitespace-pre-wrap break-all bg-red-950/20 p-2.5 rounded border border-red-500/20">
                {finding.line_snippet || finding.masked_value}
              </code>
            </div>
          </div>

          {/* Shannon Entropy & Cryptographic Randomness Analysis */}
          <div className="p-4 rounded-xl bg-shield-950/80 border border-shield-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>Shannon Entropy Analysis</span>
              </span>
              <span className="text-cyan-400 font-bold text-sm">
                H = {finding.entropy.toFixed(3)} bits/symbol
              </span>
            </div>

            <p className="text-xs text-slate-400">
              Shannon Entropy <code className="text-cyan-300">H(X) = -∑ P(x)·log₂(P(x))</code> measures information density. High entropy indicates this string exhibits cryptographic pseudo-randomness characteristic of unmasked secret keys rather than human-readable code.
            </p>

            <div className="w-full h-2 bg-shield-900 rounded-full overflow-hidden border border-shield-800">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full"
                style={{ width: `${Math.min(100, (finding.entropy / 5.5) * 100)}%` }}
              />
            </div>
          </div>

          {/* Commit Metadata (if available) */}
          {finding.commit_short_sha && (
            <div className="p-4 rounded-xl bg-shield-950/80 border border-shield-800 text-xs space-y-2">
              <div className="flex items-center space-x-1.5 text-slate-400 uppercase tracking-wider text-[10px]">
                <GitCommit className="w-3.5 h-3.5 text-cyan-400" />
                <span>Git Commit Telemetry</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-slate-300">
                <div>
                  <span className="text-slate-500">Commit SHA: </span>
                  <span className="text-cyan-400 font-bold">{finding.commit_short_sha}</span>
                </div>
                <div>
                  <span className="text-slate-500">Author: </span>
                  <span className="text-white">{finding.commit_author || 'Unknown'}</span>
                </div>
                <div>
                  <span className="text-slate-500">Date: </span>
                  <span className="text-slate-300">{finding.commit_date || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-500">Status: </span>
                  <span className={finding.is_deleted_in_head ? 'text-purple-400' : 'text-rose-400'}>
                    {finding.is_deleted_in_head ? 'Zombie (Exposed in Git History)' : 'Active in HEAD'}
                  </span>
                </div>
              </div>
              {finding.commit_message && (
                <div className="pt-2 text-slate-400 italic border-t border-shield-800">
                  "{finding.commit_message}"
                </div>
              )}
            </div>
          )}

          {/* Commit Exposure Graph Timeline */}
          <CommitTimelineVisualizer finding={finding} />
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-shield-800 bg-shield-950/60 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-shield-850 hover:bg-shield-800 text-slate-300 transition"
          >
            Close
          </button>
          <button
            onClick={() => {
              onClose();
              onOpenRemediation(finding);
            }}
            className="flex items-center space-x-2 px-5 py-2 rounded-xl text-xs font-semibold bg-cyan-500 hover:bg-cyan-400 text-black shadow-lg shadow-cyan-500/20 transition"
          >
            <span>1-Click Revocation Guide</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
