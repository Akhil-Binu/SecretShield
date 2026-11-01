import React from 'react';
import { X, GitBranch, Star, Clock, Code, ExternalLink, ShieldAlert } from 'lucide-react';
import { GitHubRepoItem } from '../types';

interface UserReposModalProps {
  isOpen: boolean;
  username: string;
  repos: GitHubRepoItem[];
  onClose: () => void;
  onSelectRepo: (repoUrl: string) => void;
}

export const UserReposModal: React.FC<UserReposModalProps> = ({
  isOpen,
  username,
  repos,
  onClose,
  onSelectRepo,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-4xl rounded-2xl border border-shield-700 bg-shield-900 shadow-2xl overflow-hidden font-mono flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-5 border-b border-shield-800 flex items-center justify-between bg-shield-950/60">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <GitBranch className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-cyan-400 font-bold">
                GitHub REST API Asset Discovery
              </div>
              <h3 className="text-lg font-bold text-white">
                Public Repositories for @{username} ({repos.length} found)
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

        {/* Repos Grid */}
        <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 bg-shield-950/80">
          {repos.length === 0 ? (
            <div className="col-span-2 text-center py-12 text-slate-400">
              No public repositories found for this user/organization.
            </div>
          ) : (
            repos.map((repo) => (
              <div
                key={repo.name}
                className="p-4 rounded-xl border border-shield-800 bg-shield-900 hover:border-cyan-500/50 transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-sm font-bold text-white group-hover:text-cyan-400 transition truncate">
                      {repo.name}
                    </h4>
                    <span className="flex items-center space-x-1 text-xs text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                      <Star className="w-3 h-3 fill-amber-400" />
                      <span>{repo.stars}</span>
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                    {repo.description || 'No description provided.'}
                  </p>

                  <div className="flex items-center space-x-3 text-[11px] text-slate-500 mt-3">
                    {repo.language && (
                      <span className="flex items-center space-x-1 text-slate-300">
                        <Code className="w-3 h-3 text-cyan-400" />
                        <span>{repo.language}</span>
                      </span>
                    )}
                    <span>Branch: {repo.default_branch}</span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-shield-800 flex items-center justify-between">
                  <a
                    href={repo.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-slate-400 hover:text-white flex items-center space-x-1"
                  >
                    <span>View on GitHub</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>

                  <button
                    onClick={() => {
                      onClose();
                      onSelectRepo(repo.html_url);
                    }}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 transition"
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>Audit Repo</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-shield-800 bg-shield-950/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-semibold bg-shield-850 hover:bg-shield-800 text-slate-300 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
