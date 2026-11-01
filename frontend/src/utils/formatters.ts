import { SeverityLevel } from '../types';

export function getSeverityClasses(severity: SeverityLevel): {
  badge: string;
  dot: string;
  border: string;
  bgLight: string;
} {
  switch (severity) {
    case 'CRITICAL':
      return {
        badge: 'bg-red-500/10 text-red-400 border border-red-500/30',
        dot: 'bg-red-500 shadow-[0_0_8px_#ef4444]',
        border: 'border-red-500/30 hover:border-red-500/60',
        bgLight: 'bg-red-950/20',
      };
    case 'HIGH':
      return {
        badge: 'bg-amber-500/10 text-amber-400 border border-amber-500/30',
        dot: 'bg-amber-500 shadow-[0_0_8px_#f59e0b]',
        border: 'border-amber-500/30 hover:border-amber-500/60',
        bgLight: 'bg-amber-950/20',
      };
    case 'MEDIUM':
      return {
        badge: 'bg-yellow-500/10 text-yellow-300 border border-yellow-500/30',
        dot: 'bg-yellow-400 shadow-[0_0_8px_#eab308]',
        border: 'border-yellow-500/30 hover:border-yellow-500/60',
        bgLight: 'bg-yellow-950/20',
      };
    case 'LOW':
      return {
        badge: 'bg-blue-500/10 text-blue-400 border border-blue-500/30',
        dot: 'bg-blue-400 shadow-[0_0_8px_#60a5fa]',
        border: 'border-blue-500/30 hover:border-blue-500/60',
        bgLight: 'bg-blue-950/20',
      };
    default:
      return {
        badge: 'bg-slate-500/10 text-slate-400 border border-slate-500/30',
        dot: 'bg-slate-400',
        border: 'border-slate-500/30 hover:border-slate-500/60',
        bgLight: 'bg-slate-900/20',
      };
  }
}

export function getHealthRating(score: number): {
  label: string;
  color: string;
  description: string;
} {
  if (score >= 90) {
    return {
      label: 'EXCELLENT',
      color: 'text-emerald-400 border-emerald-500/50 bg-emerald-500/10',
      description: 'Zero or minimal low-severity exposures. Strong hygiene.',
    };
  }
  if (score >= 70) {
    return {
      label: 'MODERATE RISK',
      color: 'text-yellow-400 border-yellow-500/50 bg-yellow-500/10',
      description: 'Tokens detected. Revocation & rotation required soon.',
    };
  }
  if (score >= 40) {
    return {
      label: 'HIGH RISK',
      color: 'text-amber-400 border-amber-500/50 bg-amber-500/10',
      description: 'Multiple sensitive credentials exposed in active files.',
    };
  }
  return {
    label: 'CRITICAL LEAK',
    color: 'text-red-400 border-red-500/50 bg-red-500/10',
    description: 'Cloud root keys, live Stripe, or DB passwords exposed!',
  };
}
