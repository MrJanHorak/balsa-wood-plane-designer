'use client';

import React from 'react';
import confetti from 'canvas-confetti';
import { GliderAeroReport, GliderDesign, UIMode } from '@/types/glider';
import { ValidationReport } from '@/geometry/validation';
import { Sparkles, AlertTriangle, CheckCircle2, ArrowDown, Scale, Compass, Wrench, ShieldAlert } from 'lucide-react';

interface StabilityInspectorProps {
  glider: GliderDesign;
  aeroReport: GliderAeroReport;
  mode: UIMode;
  validationReport?: ValidationReport;
  onApplyBallast: (ballastGrams: number) => void;
}

export const StabilityInspector: React.FC<StabilityInspectorProps> = ({
  glider,
  aeroReport,
  mode,
  validationReport,
  onApplyBallast,
}) => {
  const isSimple = mode === 'simple';
  const { stabilityStatus, staticMarginPercent, recommendedBallastGrams } = aeroReport;

  // Trigger cheerful confetti celebration when student balances the plane
  const handleAutoBalance = () => {
    onApplyBallast(recommendedBallastGrams);
    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.8 },
        colors: ['#fbbf24', '#06b6d4', '#10b981'],
      });
    } catch {
      // ignore
    }
  };

  // Status Styling
  const getStatusColor = () => {
    switch (stabilityStatus) {
      case 'optimal':
        return {
          bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300',
          badge: 'bg-emerald-500 text-slate-950',
          icon: <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
        };
      case 'critically_tail_heavy':
        return {
          bg: 'bg-red-500/10 border-red-500/30 text-red-300',
          badge: 'bg-red-500 text-white',
          icon: <AlertTriangle className="w-5 h-5 text-red-400" />,
        };
      case 'tail_heavy':
        return {
          bg: 'bg-amber-500/10 border-amber-500/30 text-amber-300',
          badge: 'bg-amber-500 text-slate-950',
          icon: <AlertTriangle className="w-5 h-5 text-amber-400" />,
        };
      case 'nose_heavy':
      case 'extremely_nose_heavy':
      default:
        return {
          bg: 'bg-blue-500/10 border-blue-500/30 text-blue-300',
          badge: 'bg-blue-500 text-white',
          icon: <Compass className="w-5 h-5 text-blue-400" />,
        };
    }
  };

  const colors = getStatusColor();

  // Percentage along fuselage length for the balance beam
  const fuseLen = glider.fuselage.lengthMm;
  const cgPercent = Math.min(100, Math.max(0, (aeroReport.cgXMm / fuseLen) * 100));
  const npPercent = Math.min(100, Math.max(0, (aeroReport.npXMm / fuseLen) * 100));

  return (
    <div className="flex flex-col gap-3 p-4 rounded-xl border border-slate-800 bg-slate-900/90 backdrop-blur-md shadow-xl">
      {/* Title & Status Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Scale className="w-5 h-5 text-amber-400" />
          <h3 className="font-bold text-sm text-slate-100">
            {isSimple ? 'Flight Balance & Pitch Stability' : 'Longitudinal Static Stability'}
          </h3>
        </div>

        <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${colors.badge}`}>
          {aeroReport.statusBadgeText}
        </span>
      </div>

      {/* Visual Glider Fuselage Balance Beam */}
      <div className="space-y-1 pt-1">
        <div className="flex justify-between text-[11px] text-slate-400">
          <span>Nose (0mm)</span>
          <span className="text-slate-500 font-mono">Fuselage Profile ({fuseLen}mm)</span>
          <span>Tail</span>
        </div>

        <div className="relative h-7 w-full bg-slate-800/80 rounded-lg border border-slate-700/80 overflow-hidden flex items-center">
          {/* Optimal Static Margin Zone (5% to 15% behind Wing AC) */}
          <div
            className="absolute top-0 bottom-0 bg-emerald-500/20 border-x border-emerald-500/40"
            style={{
              left: `${Math.max(0, (aeroReport.wingAcXMm / fuseLen) * 100)}%`,
              width: `${Math.max(4, (aeroReport.meanAerodynamicChordMm * 0.15 / fuseLen) * 100)}%`,
            }}
            title="Ideal CG Target Zone (5-15% Static Margin)"
          />

          {/* Center of Gravity (CG) Marker */}
          <div
            className="absolute top-0 bottom-0 flex flex-col items-center justify-center transition-all duration-150 z-20"
            style={{ left: `calc(${cgPercent}% - 8px)` }}
            title={`Center of Gravity (CG): ${aeroReport.cgXMm.toFixed(1)}mm`}
          >
            <span className="w-4 h-4 rounded-full border-2 border-white shadow-md bg-[conic-gradient(#111827_0deg_90deg,#fbbf24_90deg_180deg,#111827_180deg_270deg,#fbbf24_270deg_360deg)] animate-pulse" />
          </div>

          {/* Neutral Point (NP) Marker */}
          <div
            className="absolute top-0 bottom-0 flex flex-col items-center justify-center transition-all duration-150 z-10"
            style={{ left: `calc(${npPercent}% - 6px)` }}
            title={`Neutral Point (NP): ${aeroReport.npXMm.toFixed(1)}mm`}
          >
            <span className="w-3 h-3 rounded-full bg-cyan-400 ring-2 ring-cyan-500/50 shadow-md" />
          </div>
        </div>

        {/* Legend beneath beam */}
        <div className="flex items-center justify-between text-[11px] pt-0.5">
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-[conic-gradient(#111827_0deg_90deg,#fbbf24_90deg_180deg,#111827_180deg_270deg,#fbbf24_270deg_360deg)]" />
            <span className="text-amber-300 font-medium">CG: {aeroReport.cgXMm.toFixed(1)}mm</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-cyan-400" />
            <span className="text-cyan-300 font-medium">NP: {aeroReport.npXMm.toFixed(1)}mm</span>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-slate-400">{isSimple ? 'Margin:' : 'Static Margin:'}</span>
            <span className="font-bold text-slate-100">{staticMarginPercent.toFixed(1)}%</span>
          </div>
        </div>
      </div>

      {/* Structural & Manufacturing Alert Banner */}
      {validationReport && !validationReport.isValid && (
        <div className="p-3 rounded-lg border border-rose-500/40 bg-rose-500/10 text-rose-200 text-xs flex flex-col gap-1.5 shadow-sm">
          <div className="flex items-center gap-1.5 font-bold text-rose-300">
            <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
            <span>Structural Issue: {validationReport.errors[0]?.title}</span>
          </div>
          <p className="text-[11px] text-rose-200/90 leading-snug">
            {validationReport.errors[0]?.message}
          </p>
          {validationReport.errors[0]?.suggestedFix && (
            <div className="flex items-start gap-1 text-[10px] text-amber-300 pt-0.5 border-t border-rose-500/30">
              <Wrench className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
              <span><strong>Fix:</strong> {validationReport.errors[0].suggestedFix}</span>
            </div>
          )}
        </div>
      )}

      {/* Plain-English STEM Educational Coach */}
      <div className={`p-3 rounded-lg border ${colors.bg} flex items-start gap-2.5`}>
        <div className="flex-shrink-0 mt-0.5">{colors.icon}</div>
        <div className="flex-1 text-xs space-y-1">
          <p className="font-medium leading-relaxed">{aeroReport.educationalFeedback}</p>
          <p className="text-[11px] text-slate-400">
            <strong>Expected Behavior:</strong> {aeroReport.pitchTendencyDescription}
          </p>
        </div>
      </div>

      {/* Auto-Balance Ballast Action */}
      <div className="flex items-center justify-between pt-1">
        <div className="text-xs">
          <span className="text-slate-400">Recommended Nose Clay: </span>
          <span className="font-bold text-amber-300">{recommendedBallastGrams}g</span>
        </div>

        <button
          onClick={handleAutoBalance}
          disabled={Math.abs(glider.fuselage.noseBallastGrams - recommendedBallastGrams) < 0.05}
          className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 transition-all flex items-center gap-1.5 shadow-md active:scale-95"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Auto-Balance ({recommendedBallastGrams}g)</span>
        </button>
      </div>
    </div>
  );
};
