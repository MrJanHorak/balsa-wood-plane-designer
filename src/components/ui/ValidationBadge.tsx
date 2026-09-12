'use client';

import React, { useState } from 'react';
import { ValidationReport } from '@/geometry/validation';
import { CheckCircle2, AlertTriangle, XCircle, ChevronDown, Wrench, ShieldAlert } from 'lucide-react';

interface ValidationBadgeProps {
  report: ValidationReport;
  onAutoFix?: (suggestedFix: string) => void;
}

export const ValidationBadge: React.FC<ValidationBadgeProps> = ({ report }) => {
  const [isOpen, setIsOpen] = useState(false);

  const errorCount = report.errors.length;
  const warningCount = report.warnings.length;

  let badgeColor = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30';
  let badgeIcon = <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
  let badgeText = 'Laser-Ready & Sound';

  if (!report.isValid) {
    badgeColor = 'bg-rose-500/20 text-rose-300 border-rose-500/50 hover:bg-rose-500/30 animate-pulse';
    badgeIcon = <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />;
    badgeText = `${errorCount} Structural ${errorCount === 1 ? 'Error' : 'Errors'}`;
  } else if (report.hasWarnings) {
    badgeColor = 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30';
    badgeIcon = <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
    badgeText = `${warningCount} ${warningCount === 1 ? 'Warning' : 'Warnings'}`;
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg border font-medium transition-all shadow-sm ${badgeColor}`}
        title="Check physical manufacturability, structural margins, and material fit"
      >
        {badgeIcon}
        <span className="hidden sm:inline">{badgeText}</span>
        <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Popover Card */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 p-3.5 bg-slate-900/95 backdrop-blur-md rounded-xl border border-slate-700/80 shadow-2xl z-50 text-slate-100 flex flex-col gap-2.5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-1.5 font-bold text-xs">
              <ShieldAlert className="w-4 h-4 text-cyan-400" />
              <span>Geometry & Structural Integrity Audit</span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">
              {report.isValid ? '✓ Sound' : '⚠️ Action Needed'}
            </span>
          </div>

          {report.issues.length === 0 ? (
            <div className="flex items-center gap-2 p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-xs text-emerald-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>All parts are structurally enclosed, fit standard balsa sheet sizes, and meet aerodynamic pitch/roll margins.</span>
            </div>
          ) : (
            <div className="max-h-72 overflow-y-auto space-y-2 pr-1 text-xs">
              {report.issues.map((issue) => {
                const isError = issue.severity === 'error';
                const isWarning = issue.severity === 'warning';

                const borderClass = isError
                  ? 'border-rose-500/40 bg-rose-500/10 text-rose-200'
                  : isWarning
                  ? 'border-amber-500/40 bg-amber-500/10 text-amber-200'
                  : 'border-cyan-500/40 bg-cyan-500/10 text-cyan-200';

                return (
                  <div key={issue.id} className={`p-2.5 rounded-lg border flex flex-col gap-1 ${borderClass}`}>
                    <div className="flex items-center justify-between font-semibold">
                      <span className="flex items-center gap-1.5">
                        {isError ? (
                          <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                        ) : (
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        )}
                        {issue.title}
                      </span>
                      <span className="text-[9px] uppercase tracking-wide px-1.5 py-0.2 rounded bg-slate-950/40 font-mono">
                        {issue.category}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-300 leading-snug">{issue.message}</p>

                    {issue.suggestedFix && (
                      <div className="flex items-start gap-1 text-[10px] text-slate-400 pt-1 border-t border-slate-700/40">
                        <Wrench className="w-3 h-3 text-amber-300 shrink-0 mt-0.5" />
                        <span><strong>Fix:</strong> {issue.suggestedFix}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
