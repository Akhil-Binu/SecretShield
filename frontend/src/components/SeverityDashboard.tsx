import React from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  Skull,
  Ghost,
  Download,
  FileSpreadsheet,
  FileText,
  Clock,
  CheckCircle2,
  Lock
} from 'lucide-react';
import { ScanResult } from '../types';
import { getHealthRating } from '../utils/formatters';
import { getExportDownloadUrl } from '../api/client';

interface SeverityDashboardProps {
  result: ScanResult;
  onOpenPreCommit: () => void;
}

export const SeverityDashboard: React.FC<SeverityDashboardProps> = ({
  result,
  onOpenPreCommit,
}) => {
  const { summary } = result;
  const rating = getHealthRating(summary.health_score);

  return (
    <div className="w-full max-w-5xl mx-auto my-6 px-4">
      <div className="rounded-2xl border border-shield-700 bg-shield-900/90 p-6 shadow-2xl backdrop-blur-xl">
        {/* Header with Title and Export Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-shield-800">
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl sm:text-2xl font-extrabold text-white">
                Leak Severity & Exposure Dashboard
              </h2>
              <span className="px-2 py-0.5 rounded text-xs font-mono bg-shield-800 text-slate-300 border border-shield-700">
                {result.source_type}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 font-mono">
              Target: <span className="text-cyan-400">{result.target}</span> • Duration: {summary.scan_duration_seconds}s • Audited Commits: {summary.scanned_commits}
            </p>
          </div>

          {/* Export & Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={getExportDownloadUrl(result.scan_id, 'json')}
              download
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-mono bg-shield-850 hover:bg-shield-800 text-slate-200 border border-shield-700 transition"
              title="Download raw findings in JSON"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>JSON</span>
            </a>

            <a
              href={getExportDownloadUrl(result.scan_id, 'csv')}
              download
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-mono bg-shield-850 hover:bg-shield-800 text-slate-200 border border-shield-700 transition"
              title="Download findings CSV for spreadsheets"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>CSV</span>
            </a>

            <a
              href={getExportDownloadUrl(result.scan_id, 'markdown')}
              download
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-mono bg-shield-850 hover:bg-shield-800 text-slate-200 border border-shield-700 transition"
              title="Download Executive Markdown Advisory Report"
            >
              <FileText className="w-3.5 h-3.5 text-blue-400" />
              <span>Advisory (.md)</span>
            </a>

            <button
              onClick={onOpenPreCommit}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 transition shadow-sm"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Fix & Prevent Leaks</span>
            </button>
          </div>
        </div>

        {/* Security Health Score Banner */}
        <div className="my-6 p-4 rounded-xl bg-shield-950/70 border border-shield-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            {/* Circular / Hex score indicator */}
            <div className="relative flex items-center justify-center w-16 h-16 rounded-2xl bg-shield-900 border border-shield-700 shadow-inner">
              <span
                className={`text-2xl font-extrabold font-mono ${
                  summary.health_score >= 80
                    ? 'text-emerald-400'
                    : summary.health_score >= 50
                    ? 'text-amber-400'
                    : 'text-red-400'
                }`}
              >
                {summary.health_score}
              </span>
              <span className="text-[9px] font-mono text-slate-500 absolute bottom-1">
                /100
              </span>
            </div>

            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs uppercase font-mono tracking-wider text-slate-400">
                  Security Health Index:
                </span>
                <span className={`px-2 py-0.5 rounded text-xs font-bold font-mono border ${rating.color}`}>
                  {rating.label}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                {rating.description}
              </p>
            </div>
          </div>

          <div className="text-xs text-slate-400 font-mono sm:text-right">
            <div>Total Audit Findings: <strong className="text-white text-sm">{summary.total_findings}</strong></div>
            <div className="text-slate-500 text-[11px] mt-0.5">Shannon Entropy Threshold: ≥ 3.65 bits/symbol</div>
          </div>
        </div>

        {/* 4 Core Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Card 1: Critical */}
          <div className="p-4 rounded-xl bg-red-950/20 border border-red-500/30 flex items-start justify-between">
            <div>
              <div className="flex items-center space-x-1.5 text-xs font-mono text-red-400 mb-1">
                <Skull className="w-3.5 h-3.5" />
                <span>CRITICAL</span>
              </div>
              <div className="text-2xl font-bold font-mono text-white">
                {summary.critical_count}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                AWS Root, Stripe Live, DB Passwords
              </div>
            </div>
          </div>

          {/* Card 2: High */}
          <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/30 flex items-start justify-between">
            <div>
              <div className="flex items-center space-x-1.5 text-xs font-mono text-amber-400 mb-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>HIGH RISK</span>
              </div>
              <div className="text-2xl font-bold font-mono text-white">
                {summary.high_count}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                OpenAI, Anthropic, GitHub PATs
              </div>
            </div>
          </div>

          {/* Card 3: Medium / Low */}
          <div className="p-4 rounded-xl bg-yellow-950/20 border border-yellow-500/30 flex items-start justify-between">
            <div>
              <div className="flex items-center space-x-1.5 text-xs font-mono text-yellow-300 mb-1">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>MEDIUM / LOW</span>
              </div>
              <div className="text-2xl font-bold font-mono text-white">
                {summary.medium_count + summary.low_count}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Slack Tokens, High-Entropy Strings
              </div>
            </div>
          </div>

          {/* Card 4: Zombie Leaks */}
          <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-500/30 flex items-start justify-between">
            <div>
              <div className="flex items-center space-x-1.5 text-xs font-mono text-purple-400 mb-1">
                <Ghost className="w-3.5 h-3.5" />
                <span>ZOMBIE LEAKS</span>
              </div>
              <div className="text-2xl font-bold font-mono text-white">
                {summary.zombie_secrets_count}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Deleted in HEAD, Still in Git History!
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
