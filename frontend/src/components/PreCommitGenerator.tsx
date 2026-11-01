import React, { useState, useEffect } from 'react';
import {
  X,
  FileCode,
  Download,
  Copy,
  Check,
  CheckSquare,
  Square,
  Terminal,
  ShieldCheck,
  GitBranch
} from 'lucide-react';
import { generatePreCommit } from '../api/client';
import { PreCommitResponse } from '../types';

interface PreCommitGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  detectedRules?: string[];
}

export const PreCommitGenerator: React.FC<PreCommitGeneratorProps> = ({
  isOpen,
  onClose,
  detectedRules = [],
}) => {
  const [includeEntropy, setIncludeEntropy] = useState(true);
  const [failOnSeverity, setFailOnSeverity] = useState('HIGH');
  const [configData, setConfigData] = useState<PreCommitResponse | null>(null);
  const [activeTab, setActiveTab] = useState<'yaml' | 'ci' | 'setup'>('yaml');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      generatePreCommit(detectedRules, includeEntropy, failOnSeverity)
        .then(setConfigData)
        .catch(console.error);
    }
  }, [isOpen, includeEntropy, failOnSeverity, detectedRules]);

  if (!isOpen) return null;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/yaml;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-4xl rounded-2xl border border-shield-700 bg-shield-900 shadow-2xl overflow-hidden font-mono flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-5 border-b border-shield-800 flex items-center justify-between bg-shield-950/60">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <FileCode className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-cyan-400 font-bold">
                DevSecOps Shift-Left Prevention
              </div>
              <h3 className="text-lg font-bold text-white">
                Downloadable .pre-commit-config.yaml & CI Workflow
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

        {/* Options & Tab Bar */}
        <div className="p-4 border-b border-shield-800 bg-shield-950/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          {/* Toggles */}
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setIncludeEntropy(!includeEntropy)}
              className="flex items-center space-x-2 text-slate-300 hover:text-white"
            >
              {includeEntropy ? (
                <CheckSquare className="w-4 h-4 text-cyan-400" />
              ) : (
                <Square className="w-4 h-4 text-slate-600" />
              )}
              <span>Shannon Entropy Analyzer</span>
            </button>
          </div>

          {/* Subtabs */}
          <div className="flex rounded-lg bg-shield-950 p-1 border border-shield-800">
            <button
              onClick={() => setActiveTab('yaml')}
              className={`px-3 py-1 rounded text-xs transition ${
                activeTab === 'yaml' ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              .pre-commit-config.yaml
            </button>
            <button
              onClick={() => setActiveTab('ci')}
              className={`px-3 py-1 rounded text-xs transition ${
                activeTab === 'ci' ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              GitHub Actions CI (.yml)
            </button>
            <button
              onClick={() => setActiveTab('setup')}
              className={`px-3 py-1 rounded text-xs transition ${
                activeTab === 'setup' ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Installation Steps
            </button>
          </div>
        </div>

        {/* Content Box */}
        <div className="p-6 overflow-y-auto flex-1 bg-shield-950/90 text-xs leading-relaxed">
          {activeTab === 'yaml' && configData && (
            <div className="relative">
              <div className="absolute right-2 top-2 flex items-center space-x-2">
                <button
                  onClick={() => handleCopy(configData.precommit_yaml)}
                  className="px-2.5 py-1.5 rounded bg-shield-850 hover:bg-shield-800 text-slate-300 hover:text-white border border-shield-700 flex items-center space-x-1"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
                <button
                  onClick={() => handleDownload('.pre-commit-config.yaml', configData.precommit_yaml)}
                  className="px-3 py-1.5 rounded bg-cyan-500 hover:bg-cyan-400 text-black font-semibold flex items-center space-x-1 shadow-md shadow-cyan-500/20"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download File</span>
                </button>
              </div>
              <pre className="text-slate-200 overflow-x-auto p-4 rounded-xl bg-shield-950 border border-shield-800 whitespace-pre">
                {configData.precommit_yaml}
              </pre>
            </div>
          )}

          {activeTab === 'ci' && configData && (
            <div className="relative">
              <div className="absolute right-2 top-2 flex items-center space-x-2">
                <button
                  onClick={() => handleCopy(configData.github_actions_workflow)}
                  className="px-2.5 py-1.5 rounded bg-shield-850 hover:bg-shield-800 text-slate-300 hover:text-white border border-shield-700 flex items-center space-x-1"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
                <button
                  onClick={() => handleDownload('secret-scan.yml', configData.github_actions_workflow)}
                  className="px-3 py-1.5 rounded bg-cyan-500 hover:bg-cyan-400 text-black font-semibold flex items-center space-x-1 shadow-md shadow-cyan-500/20"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Workflow</span>
                </button>
              </div>
              <pre className="text-slate-200 overflow-x-auto p-4 rounded-xl bg-shield-950 border border-shield-800 whitespace-pre">
                {configData.github_actions_workflow}
              </pre>
            </div>
          )}

          {activeTab === 'setup' && (
            <div className="space-y-4 max-w-2xl mx-auto py-2">
              <div className="p-4 rounded-xl bg-shield-900 border border-shield-700 space-y-2">
                <h4 className="text-white font-bold flex items-center space-x-2">
                  <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-xs">
                    1
                  </span>
                  <span>Install the pre-commit framework</span>
                </h4>
                <div className="p-2.5 rounded bg-shield-950 border border-shield-800 text-cyan-300">
                  pip install pre-commit
                </div>
              </div>

              <div className="p-4 rounded-xl bg-shield-900 border border-shield-700 space-y-2">
                <h4 className="text-white font-bold flex items-center space-x-2">
                  <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-xs">
                    2
                  </span>
                  <span>Save .pre-commit-config.yaml to your project root</span>
                </h4>
                <p className="text-slate-400 text-xs">
                  Place the downloaded <code className="text-cyan-300">.pre-commit-config.yaml</code> in the root directory of your repository.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-shield-900 border border-shield-700 space-y-2">
                <h4 className="text-white font-bold flex items-center space-x-2">
                  <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-xs">
                    3
                  </span>
                  <span>Install git commit hooks</span>
                </h4>
                <div className="p-2.5 rounded bg-shield-950 border border-shield-800 text-cyan-300">
                  pre-commit install
                </div>
                <p className="text-slate-400 text-[11px]">
                  Now every time you run <code className="text-cyan-300">git commit</code>, SecretShield hooks will scan staged diffs before the commit is created!
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-shield-800 bg-shield-950/60 flex items-center justify-between">
          <div className="text-slate-400 text-xs">
            Shift-Left Security: Block leaked secrets before they ever touch remote origin.
          </div>
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
