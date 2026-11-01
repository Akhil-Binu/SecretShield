import React, { useState } from 'react';
import {
  X,
  ExternalLink,
  Terminal,
  Copy,
  Check,
  ShieldAlert,
  Flame,
  CheckCircle2,
  Trash2
} from 'lucide-react';
import { Finding } from '../types';

interface RemediationModalProps {
  finding: Finding | null;
  onClose: () => void;
}

export const RemediationModal: React.FC<RemediationModalProps> = ({
  finding,
  onClose,
}) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  if (!finding) return null;
  const guide = finding.remediation_guide;

  const handleCopyCmd = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleCopyAll = (commands: string[]) => {
    navigator.clipboard.writeText(commands.join('\n'));
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const gitPurgeCmds = `# 1. Install git-filter-repo tool
pip install git-filter-repo

# 2. Eradicate this secret from all past git commits
git filter-repo --replace-text <(echo "${finding.masked_value}===>REMOVED_BY_SECRETSHIELD") --force

# 3. Force push cleaned history to GitHub
git push origin --force --all
git push origin --force --tags`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-3xl rounded-2xl border border-shield-700 bg-shield-900 shadow-2xl overflow-hidden font-mono">
        {/* Header */}
        <div className="p-5 border-b border-shield-800 flex items-center justify-between bg-shield-950/60">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400">
              <Flame className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-red-400 font-bold">
                1-Click Revocation & Rotation Guide
              </div>
              <h3 className="text-lg font-bold text-white">
                {guide.provider} • {finding.secret_type}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-shield-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Direct 1-Click Console Link */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-cyan-950/30 to-blue-950/30 border border-cyan-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h4 className="text-sm font-bold text-white flex items-center space-x-1.5">
                <span>Official Provider Security Console</span>
              </h4>
              <p className="text-xs text-slate-300 mt-1">
                Deactivate or roll this compromised credential in the vendor's authentication portal immediately.
              </p>
            </div>
            <a
              href={guide.rotation_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl font-bold text-xs bg-cyan-400 hover:bg-cyan-300 text-black shadow-lg shadow-cyan-500/20 transition whitespace-nowrap"
            >
              <span>Open Console</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Actionable Step-by-Step Instructions */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Immediate Incident Response Checklist
            </h4>
            <div className="space-y-2 text-xs">
              {guide.instructions.map((inst, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg bg-shield-950 border border-shield-800 flex items-start space-x-2 text-slate-300"
                >
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 flex items-center justify-center text-[10px] font-bold">
                    {idx + 1}
                  </span>
                  <span>{inst}</span>
                </div>
              ))}
            </div>
          </div>

          {/* CLI Commands */}
          {guide.cli_commands.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-1.5">
                  <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Terminal CLI Remediation Commands</span>
                </h4>
                <button
                  onClick={() => handleCopyAll(guide.cli_commands)}
                  className="flex items-center space-x-1 text-xs text-cyan-400 hover:text-cyan-300 transition"
                >
                  {copiedAll ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedAll ? 'Copied All' : 'Copy All'}</span>
                </button>
              </div>

              <div className="p-4 rounded-xl bg-shield-950 border border-shield-800 space-y-2 text-xs">
                {guide.cli_commands.map((cmd, idx) => (
                  <div key={idx} className="flex items-center justify-between group">
                    <code className="text-cyan-300 break-all">{cmd}</code>
                    {!cmd.startsWith('#') && (
                      <button
                        onClick={() => handleCopyCmd(cmd, idx)}
                        className="ml-2 p-1 text-slate-500 group-hover:text-slate-300 hover:text-white"
                        title="Copy command"
                      >
                        {copiedIndex === idx ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Git History Eradication Section */}
          <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-500/30 space-y-2">
            <div className="flex items-center space-x-2 text-xs text-purple-300 font-bold uppercase tracking-wider">
              <Trash2 className="w-4 h-4 text-purple-400" />
              <span>Purge from Historical Git Commits</span>
            </div>
            <p className="text-xs text-slate-400">
              Simply making a new commit deleting the secret is NOT enough. Attackers clone historical commits. Run this in your repo root to rewrite history:
            </p>
            <div className="p-3 bg-shield-950 rounded-lg border border-purple-500/20 text-xs">
              <pre className="text-purple-200 overflow-x-auto whitespace-pre leading-relaxed">
                {gitPurgeCmds}
              </pre>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-shield-800 bg-shield-950/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-semibold bg-shield-850 hover:bg-shield-800 text-slate-300 transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
