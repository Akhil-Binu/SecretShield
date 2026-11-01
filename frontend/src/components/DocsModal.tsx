import React from 'react';
import { X, ShieldAlert, Cpu, Sparkles, Terminal, BookOpen, Layers } from 'lucide-react';

interface DocsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DocsModal: React.FC<DocsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-3xl rounded-2xl border border-shield-700 bg-shield-900 shadow-2xl overflow-hidden font-mono flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-5 border-b border-shield-800 flex items-center justify-between bg-shield-950/60">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <BookOpen className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-cyan-400 font-bold">
                AppSec & DevSecOps Architecture
              </div>
              <h3 className="text-lg font-bold text-white">
                How SecretShield Detects & Neutralizes Leaks
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

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 text-xs text-slate-300 leading-relaxed bg-shield-950/80">
          {/* Section 1 */}
          <div className="p-4 rounded-xl bg-shield-900 border border-shield-800 space-y-2">
            <h4 className="text-sm font-bold text-white flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>1. Dual-Engine Detection: Regex + Shannon Entropy (H)</span>
            </h4>
            <p className="text-slate-400">
              Traditional scanners rely exclusively on regex patterns, which miss non-standard or custom API tokens. SecretShield implements a hybrid pipeline:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-300">
              <li>
                <strong>Deterministic Pattern Engine:</strong> Pre-compiled regex models for 20+ vendors (AWS, OpenAI, Anthropic, Stripe, GitHub, Gemini, Twilio, SendGrid).
              </li>
              <li>
                <strong>Shannon Entropy Metric:</strong> Computes <code className="text-cyan-300">H(X) = -∑ P(x)·log₂(P(x))</code> across alphanumeric strings. True cryptographic keys exhibit elevated randomness (H ≥ 3.65 bits/symbol) compared to natural words (H ≈ 2.0 - 3.2).
              </li>
            </ul>
          </div>

          {/* Section 2 */}
          <div className="p-4 rounded-xl bg-shield-900 border border-shield-800 space-y-2">
            <h4 className="text-sm font-bold text-white flex items-center space-x-2">
              <Layers className="w-4 h-4 text-purple-400" />
              <span>2. The "Zombie Secret" Problem in Git History</span>
            </h4>
            <p className="text-slate-400">
              When developers realize they committed an API key, they commonly make a follow-up commit removing the line. However, Git is an append-only directed acyclic graph (DAG):
            </p>
            <div className="p-3 bg-shield-950 rounded border border-purple-500/20 text-purple-300 text-[11px]">
              Commit A (Leaked AWS key) ➔ Commit B ("Removed AWS key from .env")
              <br />
              Result: The secret is GONE from latest files, but PERMANENTLY ACCESSIBLE in Commit A objects!
            </div>
            <p className="text-slate-400">
              SecretShield inspects every commit diff in the repository history, flagging zombie secrets and providing exact <code className="text-cyan-300">git filter-repo</code> commands to rewrite history cleanly.
            </p>
          </div>

          {/* Section 3 */}
          <div className="p-4 rounded-xl bg-shield-900 border border-shield-800 space-y-2">
            <h4 className="text-sm font-bold text-white flex items-center space-x-2">
              <Cpu className="w-4 h-4 text-emerald-400" />
              <span>3. Asynchronous Worker Architecture & Celery/Redis</span>
            </h4>
            <p className="text-slate-400">
              Repository cloning and git diff analysis are computationally intensive. SecretShield decouples heavy git scans into asynchronous background workers:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-300">
              <li><strong>Frontend:</strong> React + Tailwind + Server-Sent Events (SSE) for live stream updates.</li>
              <li><strong>Backend API:</strong> FastAPI async controllers with non-blocking event queues.</li>
              <li><strong>Queue Worker:</strong> Production Celery task suite (<code className="text-cyan-300">celery_tasks.py</code>) backed by Redis or native concurrent background thread pools.</li>
            </ul>
          </div>
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
