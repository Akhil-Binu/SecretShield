import React, { useState, useEffect } from 'react';
import { X, Search, Shield, Sparkles, Filter, ExternalLink, BookOpen } from 'lucide-react';
import { RuleCatalogItem } from '../types';
import { getRuleCatalog } from '../api/client';
import { getSeverityClasses } from '../utils/formatters';

interface RuleCatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RuleCatalogModal: React.FC<RuleCatalogModalProps> = ({ isOpen, onClose }) => {
  const [rules, setRules] = useState<RuleCatalogItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState('ALL');

  useEffect(() => {
    if (isOpen) {
      getRuleCatalog().then(setRules).catch(console.error);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredRules = rules.filter((r) => {
    if (severityFilter !== 'ALL' && r.severity !== severityFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        r.name.toLowerCase().includes(q) ||
        r.secret_type.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-4xl rounded-2xl border border-shield-700 bg-shield-900 shadow-2xl overflow-hidden font-mono flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-5 border-b border-shield-800 flex items-center justify-between bg-shield-950/60">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Shield className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-cyan-400 font-bold">
                Pattern Rule Catalog
              </div>
              <h3 className="text-lg font-bold text-white">
                Active Secret Detection Rules ({rules.length} patterns)
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

        {/* Search & Filter Bar */}
        <div className="p-4 border-b border-shield-800 bg-shield-950/40 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between text-xs">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search rules (e.g. AWS, Stripe, Database, Anthropic, Private Key)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-shield-950 border border-shield-700 rounded-xl text-slate-100 placeholder-slate-500 text-xs font-mono focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="bg-shield-950 border border-shield-700 rounded-lg px-2.5 py-1.5 text-slate-200 font-mono text-xs focus:outline-none focus:border-cyan-400"
            >
              <option value="ALL">All Severities</option>
              <option value="CRITICAL">Critical Only</option>
              <option value="HIGH">High Only</option>
              <option value="MEDIUM">Medium Only</option>
              <option value="LOW">Low Only</option>
            </select>
          </div>
        </div>

        {/* Rules Grid */}
        <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 bg-shield-950/80">
          {filteredRules.map((rule) => {
            const sev = getSeverityClasses(rule.severity);
            return (
              <div
                key={rule.id}
                className="p-4 rounded-xl border border-shield-800 bg-shield-900 hover:border-cyan-500/40 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${sev.badge}`}>
                      {rule.severity}
                    </span>
                    <span className="text-[11px] text-cyan-400 font-bold flex items-center space-x-1">
                      <Sparkles className="w-3 h-3" />
                      <span>Min H ≥ {rule.min_entropy.toFixed(1)}</span>
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-white">
                    {rule.name}
                  </h4>
                  <div className="text-[11px] text-slate-500 mb-2">
                    Rule ID: <code className="text-slate-300">{rule.id}</code>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {rule.description}
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-shield-800 text-[11px] text-slate-400">
                  Target: <strong className="text-slate-200">{rule.secret_type}</strong>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-shield-800 bg-shield-950/60 flex items-center justify-between text-xs text-slate-400">
          <span>All rules are compiled and evaluated asynchronously with Shannon entropy thresholds.</span>
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
