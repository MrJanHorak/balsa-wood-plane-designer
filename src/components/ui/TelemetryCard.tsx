'use client';

import React from 'react';
import { GliderAeroReport, UIMode } from '@/types/glider';
import { Gauge, Feather, Wind, MoveHorizontal } from 'lucide-react';

interface TelemetryCardProps {
  aeroReport: GliderAeroReport;
  mode: UIMode;
}

export const TelemetryCard: React.FC<TelemetryCardProps> = ({ aeroReport, mode }) => {
  const isSimple = mode === 'simple';
  const { massBreakdown } = aeroReport;

  return (
    <div className="flex flex-col gap-3 p-4 rounded-xl border border-slate-800 bg-slate-900/90 backdrop-blur-md shadow-xl">
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <Gauge className="w-4 h-4 text-cyan-400" />
        <h3 className="font-bold text-sm text-slate-100">
          {isSimple ? 'Flight Stats & Specifications' : 'Aerodynamic Telemetry & Polar Estimates'}
        </h3>
      </div>

      {/* Grid of Key Numbers */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        {/* Total Weight */}
        <div className="p-2.5 rounded-lg bg-slate-800/60 border border-slate-700/60 flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Feather className="w-3.5 h-3.5 text-amber-400" />
            <span>{isSimple ? 'Total Weight' : 'All-Up Weight (AUW)'}</span>
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-base font-bold text-slate-100">{massBreakdown.totalGrams}</span>
            <span className="text-slate-400 text-[10px]">grams</span>
          </div>
        </div>

        {/* Wing Loading */}
        <div className="p-2.5 rounded-lg bg-slate-800/60 border border-slate-700/60 flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Wind className="w-3.5 h-3.5 text-cyan-400" />
            <span>Wing Loading</span>
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-base font-bold text-slate-100">{aeroReport.wingLoadingGDm2}</span>
            <span className="text-slate-400 text-[10px]">g/dm² ({aeroReport.wingLoadingOzSqFt} oz/ft²)</span>
          </div>
        </div>

        {/* Glide Ratio */}
        <div className="p-2.5 rounded-lg bg-slate-800/60 border border-slate-700/60 flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-slate-400">
            <MoveHorizontal className="w-3.5 h-3.5 text-emerald-400" />
            <span>{isSimple ? 'Glide Ratio (L/D)' : 'Lift-to-Drag (L/D)'}</span>
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-base font-bold text-emerald-300">~{aeroReport.estimatedGlideRatio} : 1</span>
            <span className="text-slate-400 text-[10px]">distance</span>
          </div>
        </div>

        {/* Stall Speed */}
        <div className="p-2.5 rounded-lg bg-slate-800/60 border border-slate-700/60 flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Wind className="w-3.5 h-3.5 text-indigo-400" />
            <span>Stall Speed (Vs)</span>
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-base font-bold text-indigo-300">{aeroReport.estimatedStallSpeedMs}</span>
            <span className="text-slate-400 text-[10px]">m/s ({(aeroReport.estimatedStallSpeedMs * 2.237).toFixed(1)} mph)</span>
          </div>
        </div>
      </div>

      {/* Advanced STEM Details */}
      {!isSimple && (
        <div className="pt-2 border-t border-slate-800/80 space-y-1 text-[11px] text-slate-300 font-mono">
          <div className="flex justify-between">
            <span className="text-slate-400">Wing Planform (S_w):</span>
            <span>{aeroReport.wingAreaDm2} dm² ({aeroReport.wingAreaMm2} mm²)</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Aspect Ratio (AR):</span>
            <span>{aeroReport.aspectRatio}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Mean Aero Chord (MAC):</span>
            <span>{aeroReport.meanAerodynamicChordMm} mm</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Tail Volume (V_h):</span>
            <span className={aeroReport.tailVolumeRatio >= 0.35 ? 'text-emerald-400' : 'text-amber-400'}>
              {aeroReport.tailVolumeRatio} {aeroReport.tailVolumeRatio >= 0.35 ? '✓' : '(low)'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Tail Arm (l_t):</span>
            <span>{aeroReport.tailArmMm} mm</span>
          </div>

          {/* Mass Distribution Breakdown */}
          <div className="pt-1.5 border-t border-slate-800/60 text-[10px] text-slate-400 grid grid-cols-4 gap-1">
            <div>Fuse: {massBreakdown.fuselageGrams}g</div>
            <div>Wing: {massBreakdown.wingGrams}g</div>
            <div>Tail: {massBreakdown.tailGrams}g</div>
            <div>Nose: {massBreakdown.ballastGrams}g</div>
          </div>
        </div>
      )}
    </div>
  );
};
