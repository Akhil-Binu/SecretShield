import React, { useState, useRef } from 'react';
import {
  GitBranch,
  User,
  FileText,
  Search,
  Sparkles,
  Zap,
  Layers,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  UploadCloud,
  FileCode
} from 'lucide-react';
import { CLIENT_DEMO_SNIPPETS } from '../utils/sampleData';

interface ScanInputSectionProps {
  onStartRepoScan: (repoUrl: string, maxCommits: number) => void;
  onFetchUserRepos: (username: string) => void;
  onStartSnippetScan: (code: string, title: string, filename: string) => void;
  isLoading: boolean;
}

export const ScanInputSection: React.FC<ScanInputSectionProps> = ({
  onStartRepoScan,
  onFetchUserRepos,
  onStartSnippetScan,
  isLoading,
}) => {
  const [activeTab, setActiveTab] = useState<'repo' | 'user' | 'snippet' | 'upload'>('snippet');

  // Repo tab state
  const [repoUrl, setRepoUrl] = useState('');
  const [maxCommits, setMaxCommits] = useState(50);

  // User tab state
  const [username, setUsername] = useState('');

  // Snippet tab state
  const [snippetCode, setSnippetCode] = useState(CLIENT_DEMO_SNIPPETS.vulnerable_fullstack_app.content);
  const [snippetTitle, setSnippetTitle] = useState(CLIENT_DEMO_SNIPPETS.vulnerable_fullstack_app.title);
  const [snippetFilename, setSnippetFilename] = useState(CLIENT_DEMO_SNIPPETS.vulnerable_fullstack_app.filename);

  // File Upload state
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleRepoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoUrl.trim()) return;
    onStartRepoScan(repoUrl.trim(), maxCommits);
  };

  const handleUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;
    onFetchUserRepos(username.trim());
  };

  const handleSnippetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!snippetCode.trim()) return;
    onStartSnippetScan(snippetCode, snippetTitle, snippetFilename);
  };

  const handleFileUpload = (file: File) => {
    setUploadedFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content) {
        onStartSnippetScan(content, `Uploaded File: ${file.name}`, file.name);
      }
    };
    reader.readAsText(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const loadDemo = (key: keyof typeof CLIENT_DEMO_SNIPPETS) => {
    const demo = CLIENT_DEMO_SNIPPETS[key];
    setSnippetCode(demo.content);
    setSnippetTitle(demo.title);
    setSnippetFilename(demo.filename);
  };

  return (
    <section className="w-full max-w-5xl mx-auto my-6 px-4">
      {/* Hero Badge */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-mono mb-3">
          <Sparkles className="w-3.5 h-3.5 animate-spin" />
          <span>Regex Engine + Shannon Entropy (H) Heuristics</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-2">
          Git Secret & API Key Leak Auditor
        </h1>
        <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto">
          Audit Git commit histories and configurations for exposed AWS credentials, OpenAI keys,
          Stripe secrets, and database strings before attackers discover them.
        </p>
      </div>

      {/* Main Scanner Container */}
      <div className="rounded-2xl border border-shield-700 bg-shield-900/90 shadow-2xl backdrop-blur-xl overflow-hidden">
        {/* Navigation Tabs */}
        <div className="flex border-b border-shield-700/80 bg-shield-950/50">
          <button
            onClick={() => setActiveTab('repo')}
            className={`flex-1 flex items-center justify-center space-x-2 py-3.5 px-3 text-xs sm:text-sm font-semibold transition-all border-b-2 ${
              activeTab === 'repo'
                ? 'border-cyan-400 text-cyan-400 bg-shield-850/50'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-shield-900'
            }`}
          >
            <GitBranch className="w-4 h-4" />
            <span>Git Repository</span>
          </button>

          <button
            onClick={() => setActiveTab('user')}
            className={`flex-1 flex items-center justify-center space-x-2 py-3.5 px-3 text-xs sm:text-sm font-semibold transition-all border-b-2 ${
              activeTab === 'user'
                ? 'border-cyan-400 text-cyan-400 bg-shield-850/50'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-shield-900'
            }`}
          >
            <User className="w-4 h-4" />
            <span>GitHub Profile</span>
          </button>

          <button
            onClick={() => setActiveTab('snippet')}
            className={`flex-1 flex items-center justify-center space-x-2 py-3.5 px-3 text-xs sm:text-sm font-semibold transition-all border-b-2 ${
              activeTab === 'snippet'
                ? 'border-cyan-400 text-cyan-400 bg-shield-850/50'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-shield-900'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Paste Code</span>
            <span className="hidden sm:inline-block px-1.5 py-0.2 rounded text-[10px] bg-cyan-500/20 text-cyan-300 font-mono">
              Instant
            </span>
          </button>

          <button
            onClick={() => setActiveTab('upload')}
            className={`flex-1 flex items-center justify-center space-x-2 py-3.5 px-3 text-xs sm:text-sm font-semibold transition-all border-b-2 ${
              activeTab === 'upload'
                ? 'border-cyan-400 text-cyan-400 bg-shield-850/50'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-shield-900'
            }`}
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload File</span>
          </button>
        </div>

        {/* Tab 1: Repo Audit */}
        {activeTab === 'repo' && (
          <form onSubmit={handleRepoSubmit} className="p-6 space-y-4">
            <div className="space-y-2">
              <label className="block text-xs font-mono uppercase tracking-wider text-slate-300">
                Public GitHub Repository URL or Local Git Folder
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  placeholder="https://github.com/owner/repository, owner/repo, or C:\path\to\repo"
                  className="w-full pl-10 pr-4 py-3 bg-shield-950 border border-shield-700 rounded-xl text-slate-100 placeholder-slate-500 font-mono text-sm focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition"
                  disabled={isLoading}
                />
                <GitBranch className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-2">
              <div className="flex items-center space-x-3 text-xs text-slate-400">
                <span>Commit History Depth:</span>
                <select
                  value={maxCommits}
                  onChange={(e) => setMaxCommits(Number(e.target.value))}
                  className="bg-shield-950 border border-shield-700 rounded-lg px-2.5 py-1.5 text-slate-200 font-mono text-xs focus:outline-none focus:border-cyan-400"
                  disabled={isLoading}
                >
                  <option value={20}>20 commits (Fastest)</option>
                  <option value={50}>50 commits (Balanced)</option>
                  <option value={100}>100 commits (Thorough)</option>
                </select>
                <span className="text-[11px] text-slate-500">
                  (Tracks historical zombie leaks across commits)
                </span>
              </div>

              <button
                type="submit"
                disabled={isLoading || !repoUrl.trim()}
                className="flex items-center justify-center space-x-2 px-6 py-2.5 rounded-xl font-semibold text-sm bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black shadow-lg shadow-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <Search className="w-4 h-4" />
                <span>{isLoading ? 'Scanning Commits...' : 'Audit Repository'}</span>
              </button>
            </div>

            <div className="text-xs text-slate-400 pt-2 flex flex-wrap items-center gap-2">
              <span className="text-slate-500 font-mono">Quick test suggestion:</span>
              <button
                type="button"
                onClick={() => setRepoUrl('https://github.com/octocat/Hello-World')}
                className="px-2 py-0.5 rounded bg-shield-800 hover:bg-shield-700 text-slate-300 font-mono text-[11px] border border-shield-700"
              >
                octocat/Hello-World
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('snippet')}
                className="text-cyan-400 hover:underline inline-flex items-center space-x-1"
              >
                <span>Or run instant code demo</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: User Profile Audit */}
        {activeTab === 'user' && (
          <form onSubmit={handleUserSubmit} className="p-6 space-y-4">
            <div className="space-y-2">
              <label className="block text-xs font-mono uppercase tracking-wider text-slate-300">
                GitHub Username or Organization
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. torvalds, vercel, octocat"
                  className="w-full pl-10 pr-4 py-3 bg-shield-950 border border-shield-700 rounded-xl text-slate-100 placeholder-slate-500 font-mono text-sm focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition"
                  disabled={isLoading}
                />
                <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-slate-400">
                Fetches all public repos via GitHub REST API to perform multi-repo secret audits.
              </p>
              <button
                type="submit"
                disabled={isLoading || !username.trim()}
                className="flex items-center space-x-2 px-6 py-2.5 rounded-xl font-semibold text-sm bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black shadow-lg shadow-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <Search className="w-4 h-4" />
                <span>{isLoading ? 'Fetching Repos...' : 'Inspect User Repos'}</span>
              </button>
            </div>
          </form>
        )}

        {/* Tab 3: Paste Code */}
        {activeTab === 'snippet' && (
          <form onSubmit={handleSnippetSubmit} className="p-6 space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-mono uppercase tracking-wider flex items-center space-x-1.5">
                  <Zap className="w-3.5 h-3.5 text-yellow-400" />
                  <span>Instant 1-Click Demo Scenarios:</span>
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => loadDemo('vulnerable_fullstack_app')}
                  className="px-2.5 py-1 rounded-lg text-xs font-mono bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 transition flex items-center space-x-1.5"
                >
                  <AlertTriangle className="w-3 h-3 text-red-400" />
                  <span>Next.js + Stripe Leaks</span>
                </button>
                <button
                  type="button"
                  onClick={() => loadDemo('ai_engineer_agent_repo')}
                  className="px-2.5 py-1 rounded-lg text-xs font-mono bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 transition"
                >
                  LLM Agent (Gemini + Slack)
                </button>
                <button
                  type="button"
                  onClick={() => loadDemo('compromised_ssh_keys')}
                  className="px-2.5 py-1 rounded-lg text-xs font-mono bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 transition"
                >
                  RSA Private Key Block
                </button>
                <button
                  type="button"
                  onClick={() => loadDemo('clean_safe_repo')}
                  className="px-2.5 py-1 rounded-lg text-xs font-mono bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition flex items-center space-x-1.5"
                >
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  <span>Clean App (0 Leaks)</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">Audit Title</label>
                <input
                  type="text"
                  value={snippetTitle}
                  onChange={(e) => setSnippetTitle(e.target.value)}
                  className="w-full px-3 py-1.5 bg-shield-950 border border-shield-700 rounded-lg text-slate-200 font-mono text-xs focus:outline-none focus:border-cyan-400"
                />
              </div>
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">Simulated File Name</label>
                <input
                  type="text"
                  value={snippetFilename}
                  onChange={(e) => setSnippetFilename(e.target.value)}
                  className="w-full px-3 py-1.5 bg-shield-950 border border-shield-700 rounded-lg text-slate-200 font-mono text-xs focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            <div className="relative">
              <textarea
                value={snippetCode}
                onChange={(e) => setSnippetCode(e.target.value)}
                rows={9}
                placeholder="Paste .env file contents, docker-compose.yml, code snippet, or bash history here..."
                className="w-full p-4 bg-shield-950 border border-shield-700 rounded-xl text-slate-100 font-mono text-xs leading-relaxed focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition resize-y"
                disabled={isLoading}
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <div className="text-xs text-slate-400 font-mono">
                {snippetCode.split('\n').length} lines • {snippetCode.length} characters
              </div>
              <button
                type="submit"
                disabled={isLoading || !snippetCode.trim()}
                className="flex items-center space-x-2 px-6 py-2.5 rounded-xl font-semibold text-sm bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black shadow-lg shadow-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <Zap className="w-4 h-4 fill-black" />
                <span>Instant Scan & Audit</span>
              </button>
            </div>
          </form>
        )}

        {/* Tab 4: File Drag & Drop Upload */}
        {activeTab === 'upload' && (
          <div className="p-6 space-y-4">
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
                dragActive
                  ? 'border-cyan-400 bg-cyan-950/20'
                  : 'border-shield-700 bg-shield-950/60 hover:border-cyan-500/50 hover:bg-shield-850/30'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileUpload(e.target.files[0]);
                  }
                }}
              />
              <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <UploadCloud className="w-7 h-7" />
              </div>
              <h4 className="text-sm font-bold text-white mb-1">
                Drag & Drop file to audit for credentials
              </h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
                Upload <code className="text-cyan-300">.env</code>, <code className="text-cyan-300">docker-compose.yml</code>, <code className="text-cyan-300">*.pem</code>, Python, JS, or Bash configuration files.
              </p>
              <span className="px-4 py-2 rounded-xl text-xs font-semibold bg-shield-800 text-slate-200 border border-shield-700 hover:bg-shield-700 transition">
                Browse Files
              </span>
            </div>
            {uploadedFileName && (
              <div className="text-xs text-center text-cyan-400 font-mono">
                Auditing: {uploadedFileName}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

