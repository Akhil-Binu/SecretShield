import React from 'react';
import { ShieldAlert, ShieldCheck, FileCode, ExternalLink, Terminal, GitBranch, Key } from 'lucide-react';

interface NavbarProps {
  onOpenPreCommit: () => void;
  onOpenDocs: () => void;
  onOpenRules: () => void;
  onOpenGitHubToken: () => void;
  hasGitHubToken: boolean;
  isBackendHealthy: boolean;
  isStaticHost?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenPreCommit,
  onOpenDocs,
  onOpenRules,
  onOpenGitHubToken,
  hasGitHubToken,
  isBackendHealthy,
  isStaticHost = false,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-shield-700/60 bg-shield-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/30 border border-cyan-500/40 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.25)]">
            <ShieldAlert className="w-5 h-5 text-cyan-400 animate-pulse" />
            <div className="absolute inset-0 rounded-xl bg-cyan-400/10 blur-sm pointer-events-none" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-white via-slate-200 to-cyan-400 bg-clip-text text-transparent">
                SecretShield
              </span>
              <span className="px-2 py-0.5 text-[10px] font-mono tracking-widest uppercase rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                v1.0
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Instant Git Secret & API Key Leak Auditor
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Engine indicator */}
          <div
            className="hidden md:flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-shield-900 border border-shield-700/60 text-xs"
            title={
              isBackendHealthy
                ? 'Connected to local FastAPI backend worker'
                : 'Running browser-side Git entropy & pattern auditor'
            }
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isBackendHealthy
                  ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]'
                  : 'bg-cyan-400 shadow-[0_0_6px_#06b6d4]'
              }`}
            />
            <span className="text-slate-300 font-mono text-[11px]">
              {isBackendHealthy ? 'Backend Active' : 'Browser Engine'}
            </span>
          </div>

          {/* GitHub Token & Rate Limit button */}
          <button
            onClick={onOpenGitHubToken}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all shadow-sm ${
              hasGitHubToken
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
                : 'bg-shield-850 hover:bg-shield-800 text-slate-200 border-shield-700 hover:border-cyan-500/50'
            }`}
            title="Configure GitHub Personal Access Token (unlocks 5,000 requests/hr)"
          >
            <Key className={`w-3.5 h-3.5 ${hasGitHubToken ? 'text-emerald-400' : 'text-amber-400'}`} />
            <span className="hidden sm:inline">{hasGitHubToken ? 'GitHub Token Active' : 'GitHub Token'}</span>
            <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
              hasGitHubToken ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
            }`}>
              {hasGitHubToken ? '5k/hr' : '60/hr'}
            </span>
          </button>

          <button
            onClick={onOpenRules}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-shield-850 hover:bg-shield-800 text-slate-200 border border-shield-700 hover:border-cyan-500/50 transition-all shadow-sm"
            title="Browse all 20+ secret detection rules & entropy thresholds"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Rules Catalog</span>
          </button>

          <button
            onClick={onOpenPreCommit}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-shield-850 hover:bg-shield-800 text-slate-200 border border-shield-700 hover:border-cyan-500/50 transition-all shadow-sm"
            title="Download .pre-commit-config.yaml hook"
          >
            <FileCode className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">.pre-commit Hook</span>
          </button>

          <button
            onClick={onOpenDocs}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-shield-850 hover:bg-shield-800 text-slate-200 border border-shield-700 hover:border-cyan-500/50 transition-all shadow-sm"
          >
            <Terminal className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">Architecture</span>
          </button>

          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-lg bg-shield-850 hover:bg-shield-800 text-slate-400 hover:text-white border border-shield-700 transition-colors"
            title="GitHub"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
          </a>
        </div>
      </div>
    </header>
  );
};
