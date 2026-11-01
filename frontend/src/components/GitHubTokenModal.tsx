import React, { useState, useEffect } from 'react';
import {
  X,
  Key,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  RefreshCw,
  Zap,
  Info
} from 'lucide-react';
import {
  getStoredGitHubToken,
  setStoredGitHubToken,
  removeStoredGitHubToken,
  checkGitHubRateLimit,
  RateLimitInfo
} from '../utils/githubAuth';

interface GitHubTokenModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTokenUpdated?: () => void;
}

export const GitHubTokenModal: React.FC<GitHubTokenModalProps> = ({
  isOpen,
  onClose,
  onTokenUpdated
}) => {
  const [tokenInput, setTokenInput] = useState('');
  const [rateLimit, setRateLimit] = useState<RateLimitInfo | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadStatus = async (tokenOverride?: string) => {
    setIsChecking(true);
    setErrorMessage(null);
    try {
      const info = await checkGitHubRateLimit(tokenOverride);
      setRateLimit(info);
    } catch (e: any) {
      setErrorMessage(e.message || 'Failed to check GitHub rate limit.');
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      const stored = getStoredGitHubToken() || '';
      setTokenInput(stored);
      loadStatus(stored);
      setSaveSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsChecking(true);
    setErrorMessage(null);

    const cleanToken = tokenInput.trim();
    if (!cleanToken) {
      removeStoredGitHubToken();
      await loadStatus('');
      onTokenUpdated?.();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
      return;
    }

    // Verify token validity
    const info = await checkGitHubRateLimit(cleanToken);
    setRateLimit(info);
    setIsChecking(false);

    if (info.limit <= 60 && !info.isAuthenticated) {
      setErrorMessage('Token appears invalid or does not grant authenticated rate limits. Please double-check.');
      return;
    }

    setStoredGitHubToken(cleanToken);
    setSaveSuccess(true);
    onTokenUpdated?.();
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const handleRemove = async () => {
    removeStoredGitHubToken();
    setTokenInput('');
    await loadStatus('');
    onTokenUpdated?.();
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const isRateLimited = rateLimit ? rateLimit.remaining === 0 : false;
  const isHighCapacity = rateLimit ? rateLimit.limit > 60 : false;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-xl rounded-2xl border border-shield-700 bg-shield-900 shadow-2xl overflow-hidden font-mono flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-shield-800 flex items-center justify-between bg-shield-950/60">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-xl border ${
              isHighCapacity
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : isRateLimited
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
            }`}>
              <Key className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-cyan-400 font-bold">
                API Rate Limit & Access
              </div>
              <h3 className="text-lg font-bold text-white">
                GitHub Personal Access Token (PAT)
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

        {/* Content Body */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Rate Limit Status Card */}
          <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            isHighCapacity
              ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
              : isRateLimited
              ? 'bg-rose-950/30 border-rose-500/40 text-rose-300'
              : 'bg-shield-950 border-shield-800 text-slate-300'
          }`}>
            <div className="space-y-1">
              <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider">
                {isHighCapacity ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Authenticated (5,000 req/hr)</span>
                  </>
                ) : isRateLimited ? (
                  <>
                    <AlertTriangle className="w-4 h-4 text-rose-400 animate-pulse" />
                    <span>Unauthenticated Rate Limit Exceeded</span>
                  </>
                ) : (
                  <>
                    <Info className="w-4 h-4 text-slate-400" />
                    <span>Unauthenticated (60 req/hr shared limit)</span>
                  </>
                )}
              </div>
              <div className="text-sm font-semibold text-white">
                {rateLimit ? (
                  <span>
                    Remaining API Calls: <strong className={isRateLimited ? 'text-rose-400' : 'text-cyan-400'}>{rateLimit.remaining}</strong> / {rateLimit.limit}
                  </span>
                ) : (
                  'Checking GitHub API rate limit...'
                )}
              </div>
              {rateLimit && (
                <div className="text-[11px] text-slate-400">
                  {rateLimit.user && <span>Signed in as <strong>@{rateLimit.user}</strong> • </span>}
                  Resets: {rateLimit.reset.toLocaleTimeString()} ({Math.max(0, Math.round((rateLimit.reset.getTime() - Date.now()) / 60000))} min)
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => loadStatus(tokenInput)}
              disabled={isChecking}
              className="px-3 py-1.5 rounded-lg border border-shield-700 bg-shield-850 hover:bg-shield-800 text-xs font-semibold text-slate-200 flex items-center space-x-1.5 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>

          {/* Explanation Alert */}
          <div className="p-3.5 rounded-xl bg-shield-950/80 border border-shield-800 text-xs text-slate-300 leading-relaxed space-y-2">
            <div className="flex items-center space-x-2 text-cyan-400 font-bold">
              <Zap className="w-4 h-4" />
              <span>Why add a GitHub Token?</span>
            </div>
            <p>
              GitHub limits unauthenticated IP requests to only <strong>60 calls/hour</strong> across shared network addresses. Adding your token raises this limit to <strong>5,000 calls/hour</strong>, allowing unlimited repository and commit audits.
            </p>
            <div className="text-[11px] text-slate-400 flex items-center space-x-1 pt-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Zero-knowledge: Stored strictly in your browser's local memory (`localStorage`). Never sent to any SecretShield server.</span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs uppercase tracking-wider text-slate-300 font-bold">
                  GitHub Token (Classic or Fine-Grained)
                </label>
                <a
                  href="https://github.com/settings/tokens/new?description=SecretShield+Auditor&scopes=public_repo"
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-cyan-400 hover:underline flex items-center space-x-1"
                >
                  <span>Generate free token</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <input
                type="password"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx or github_pat_xxxxxxxx"
                className="w-full px-4 py-2.5 bg-shield-950 border border-shield-700 rounded-xl text-slate-100 placeholder-slate-600 font-mono text-sm focus:outline-none focus:border-cyan-400 transition"
              />
              <p className="text-[11px] text-slate-500">
                Tip: You can generate a token with <strong>no permissions checked</strong> (public access only) or with `repo` scope to audit private repositories.
              </p>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {saveSuccess && (
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>GitHub Token saved successfully! Rate limit updated to 5,000 req/hr.</span>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              {getStoredGitHubToken() ? (
                <button
                  type="button"
                  onClick={handleRemove}
                  className="px-3.5 py-2 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-semibold flex items-center space-x-1.5 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear Token</span>
                </button>
              ) : <div />}

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl border border-shield-700 hover:bg-shield-800 text-xs font-semibold text-slate-300 transition"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={isChecking}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-bold text-xs shadow-lg shadow-cyan-500/20 disabled:opacity-50 transition"
                >
                  {isChecking ? 'Validating...' : 'Save & Unlock 5k Limit'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
