import React from 'react';
import { GitCommit, AlertTriangle, Ghost, ShieldAlert, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Finding } from '../types';

interface CommitTimelineVisualizerProps {
  finding: Finding;
}

export const CommitTimelineVisualizer: React.FC<CommitTimelineVisualizerProps> = ({ finding }) => {
  if (!finding.commit_short_sha) {
    return (
      <div className="p-4 rounded-xl bg-shield-950/80 border border-shield-800 text-xs text-slate-400 font-mono">
        Commit graph unavailable for direct code snippet pastes. Run an audit on a public Git repository to inspect historical commit ancestry.
      </div>
    );
  }

  return (
    <div className="p-5 rounded-2xl bg-shield-950 border border-shield-800 font-mono space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-2">
          <GitCommit className="w-4 h-4 text-cyan-400" />
          <span>Commit History Exposure Graph</span>
        </h4>
        <span className="text-[11px] text-slate-500">
          Git Object Tree Analysis
        </span>
      </div>

      {/* Visual Timeline Nodes */}
      <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-gradient-to-b before:from-red-500 before:via-purple-500 before:to-emerald-500">
        {/* Node 1: Leak Inception Commit */}
        <div className="relative group">
          <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-red-500/20 border-2 border-red-500 flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-red-400 animate-ping" />
          </div>
          <div className="p-3.5 rounded-xl bg-red-950/20 border border-red-500/30 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-red-400 flex items-center space-x-1.5">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Secret Introduced in Commit: {finding.commit_short_sha}</span>
              </span>
              <span className="text-[10px] text-slate-400">{finding.commit_date || 'Past Commit'}</span>
            </div>
            <p className="text-xs text-slate-200">
              "{finding.commit_message || 'Commit with sensitive configuration'}"
            </p>
            <div className="text-[11px] text-slate-400">
              Author: <span className="text-slate-300">{finding.commit_author || 'Developer'}</span> • File: <code className="text-red-300">{finding.file_path}:{finding.line_number}</code>
            </div>
          </div>
        </div>

        {/* Node 2: If Zombie Secret (Deleted later) */}
        {finding.is_deleted_in_head ? (
          <div className="relative group">
            <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-purple-500/20 border-2 border-purple-500 flex items-center justify-center">
              <Ghost className="w-3 h-3 text-purple-400" />
            </div>
            <div className="p-3.5 rounded-xl bg-purple-950/20 border border-purple-500/30 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-purple-300 flex items-center space-x-1.5">
                  <Ghost className="w-3.5 h-3.5" />
                  <span>Subsequent Deletion ("Zombie Secret Trap")</span>
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold">
                  HIGH SEVERITY
                </span>
              </div>
              <p className="text-xs text-slate-300">
                A later commit removed the credential line from the working file, but <strong>did NOT rewrite git history</strong>.
              </p>
              <div className="p-2.5 rounded bg-shield-900 border border-purple-500/20 text-[11px] text-purple-200">
                Anyone running <code className="text-cyan-300">git clone</code> can run <code className="text-cyan-300">git show {finding.commit_short_sha}</code> and instantly extract your plaintext token!
              </div>
            </div>
          </div>
        ) : (
          <div className="relative group">
            <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-red-500/20 border-2 border-red-500 flex items-center justify-center">
              <AlertTriangle className="w-3 h-3 text-red-400" />
            </div>
            <div className="p-3.5 rounded-xl bg-red-950/20 border border-red-500/30 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-red-400">Current HEAD Status</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-red-500/20 text-red-300 font-bold">
                  ACTIVE IN LATEST CHECKOUT
                </span>
              </div>
              <p className="text-xs text-slate-300">
                This credential is still actively present in the latest branch files and working directory.
              </p>
            </div>
          </div>
        )}

        {/* Node 3: Required Eradication */}
        <div className="relative">
          <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
          </div>
          <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-xs text-emerald-200">
            <div className="font-bold text-emerald-400 mb-1">
              Sanitization Goal: Permanent Purge
            </div>
            <p className="text-slate-300">
              Run <code className="text-cyan-300">git filter-repo</code> to rewrite commit ancestry and purge blob objects before force pushing.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
