import React from 'react';
import { Loader2, Terminal, GitCommit, FileSearch, ShieldAlert } from 'lucide-react';
import { ScanProgress } from '../types';

interface LiveScanProgressProps {
  progress: ScanProgress;
}

export const LiveScanProgress: React.FC<LiveScanProgressProps> = ({ progress }) => {
  return (
    <div className="w-full max-w-5xl mx-auto my-6 px-4">
      <div className="rounded-2xl border border-cyan-500/40 bg-shield-900/95 p-6 shadow-2xl relative overflow-hidden backdrop-blur-xl">
        {/* Glowing top line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-emerald-400 animate-pulse" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-mono text-xs uppercase tracking-wider text-cyan-400">
                  {progress.status}
                </span>
                <span className="text-slate-400">•</span>
                <span className="text-sm font-semibold text-white">
                  Auditing Target: {progress.current_target || 'Active Scan'}
                </span>
              </div>
              <p className="text-xs text-slate-300 font-mono mt-0.5">
                {progress.message}
              </p>
            </div>
          </div>

          <div className="text-right flex items-center space-x-4">
            <div className="text-right">
              <div className="font-mono text-2xl font-bold text-cyan-400">
                {progress.progress_percent}%
              </div>
              <div className="text-[10px] uppercase font-mono text-slate-500">
                Audit Progress
              </div>
            </div>
          </div>
        </div>

        {/* Animated Progress Bar */}
        <div className="w-full h-2.5 bg-shield-950 rounded-full overflow-hidden border border-shield-700 mb-4">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300 rounded-full relative"
            style={{ width: `${Math.max(5, progress.progress_percent)}%` }}
          >
            <div className="absolute right-0 top-0 bottom-0 w-2 bg-white/50 blur-[2px] animate-pulse" />
          </div>
        </div>

        {/* Live Counters */}
        <div className="grid grid-cols-3 gap-3 pt-2 border-t border-shield-800 text-xs font-mono">
          <div className="flex items-center space-x-2 text-slate-300">
            <GitCommit className="w-4 h-4 text-cyan-400" />
            <span>
              Commits: <strong className="text-white">{progress.scanned_commits}</strong>
              {progress.total_commits > 0 && ` / ${progress.total_commits}`}
            </span>
          </div>

          <div className="flex items-center space-x-2 text-slate-300">
            <FileSearch className="w-4 h-4 text-blue-400" />
            <span>
              Files: <strong className="text-white">{progress.scanned_files}</strong>
            </span>
          </div>

          <div className="flex items-center space-x-2 text-slate-300 justify-end">
            <ShieldAlert className="w-4 h-4 text-red-400" />
            <span>
              Leaks Found: <strong className="text-red-400">{progress.findings_count}</strong>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
