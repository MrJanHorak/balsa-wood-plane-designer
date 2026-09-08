'use client';

import React, { useState } from 'react';
import { GliderDesign } from '@/types/glider';
import {
  generateFuselageFlatPattern,
  generateTailFlatPattern,
  generateWingFlatPattern,
} from '@/geometry/patterns2d';
import { Scissors, Ruler, Download, Info } from 'lucide-react';

interface Pattern2DViewportProps {
  glider: GliderDesign;
}

export const Pattern2DViewport: React.FC<Pattern2DViewportProps> = ({ glider }) => {
  const [activeTab, setActiveTab] = useState<'sheet' | 'fuselage' | 'wing' | 'tail'>('sheet');
  const [showRuler, setShowRuler] = useState(true);

  const fuselage = generateFuselageFlatPattern(glider);
  const wing = generateWingFlatPattern(glider);
  const tail = generateTailFlatPattern(glider);

  // Download SVG pattern function
  const downloadSvg = () => {
    const svgEl = document.getElementById('balsa-pattern-svg');
    if (!svgEl) return;
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svgEl);
    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${glider.name.toLowerCase().replace(/\s+/g, '-')}-laser-pattern.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Sheet dimensions (standard 100mm x 450mm balsa plank preview)
  const sheetWidth = Math.max(420, glider.fuselage.lengthMm + 40, glider.wing.spanMm + 40);
  const sheetHeight = 240;

  return (
    <div className="relative w-full h-full flex flex-col bg-slate-950 text-slate-100 overflow-hidden select-none">
      {/* Top Controls Bar */}
      <div className="flex items-center justify-between p-3 border-b border-slate-800 bg-slate-900/60 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <Scissors className="w-4 h-4 text-amber-400" />
          <span className="font-semibold text-sm">2D Flat Cut Pattern</span>
          <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
            1:1 Scale Vector
          </span>
        </div>

        {/* View Options & Download */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowRuler(!showRuler)}
            className={`px-2.5 py-1 text-xs rounded border transition-colors flex items-center gap-1.5 ${
              showRuler
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            <Ruler className="w-3.5 h-3.5" />
            <span>Scale Ruler</span>
          </button>

          <button
            onClick={downloadSvg}
            className="px-3 py-1 text-xs font-semibold rounded bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors flex items-center gap-1.5 shadow-md"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export SVG</span>
          </button>
        </div>
      </div>

      {/* SVG Canvas Area */}
      <div className="flex-1 overflow-auto p-6 flex items-center justify-center bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px]">
        <div className="relative p-6 rounded-xl border border-slate-800 bg-slate-900/80 shadow-2xl overflow-hidden max-w-full">
          {/* Legend Banner */}
          <div className="flex items-center gap-6 mb-4 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <span className="inline-block w-4 h-0.5 bg-red-500" />
              <span>Cut Lines (Laser / Knife)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-4 h-0.5 border-t-2 border-dashed border-cyan-400" />
              <span>Score / Fold Lines (Dihedral)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 border border-amber-500/60 bg-amber-500/10 rounded-sm" />
              <span>Friction Interlocking Slots</span>
            </div>
          </div>

          <svg
            id="balsa-pattern-svg"
            viewBox={`-20 -20 ${sheetWidth + 40} ${sheetHeight + 40}`}
            className="w-full max-h-[500px] border border-slate-700/80 rounded bg-slate-950/60 shadow-inner"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Sheet Outline */}
            <rect
              x="0"
              y="0"
              width={sheetWidth}
              height={sheetHeight}
              fill="#18130e"
              stroke="#453120"
              strokeWidth="1.5"
              strokeDasharray="4 2"
              rx="4"
            />
            <text x="10" y="16" fill="#855d3e" fontSize="9" fontFamily="monospace">
              STANDARD BALSA SHEET ({glider.material.name}) - THICKNESS: {glider.material.sheetThicknessMm.toFixed(2)}mm
            </text>

            {/* 1. Fuselage Pattern */}
            <g transform="translate(15, 30)">
              {/* Outer Cut Path */}
              <path
                d={fuselage.outlinePath}
                fill="#2a1d13"
                stroke="#ef4444"
                strokeWidth="1.2"
              />
              {/* Wing & Tail Slots */}
              {fuselage.slotCutouts.map((slotD, idx) => (
                <path
                  key={idx}
                  d={slotD}
                  fill="#0f172a"
                  stroke="#fbbf24"
                  strokeWidth="1.2"
                />
              ))}
              <text x={fuselage.dimensions.widthMm / 2} y="15" fill="#f59e0b" fontSize="9" textAnchor="middle" fontWeight="bold">
                Fuselage ({fuselage.dimensions.widthMm}mm)
              </text>
            </g>

            {/* 2. Main Wing Pattern */}
            <g transform={`translate(${15 + glider.wing.spanMm / 2}, 145) rotate(90)`}>
              <path
                d={wing.outlinePath}
                fill="#2a1d13"
                stroke="#ef4444"
                strokeWidth="1.2"
              />
              {/* Dihedral Center Score Line */}
              {wing.scoreLines.map((lineD, idx) => (
                <path
                  key={idx}
                  d={lineD}
                  stroke="#06b6d4"
                  strokeWidth="1.2"
                  strokeDasharray="3 2"
                />
              ))}
              <text x="5" y="0" fill="#f59e0b" fontSize="8" textAnchor="middle" transform="rotate(-90)" fontWeight="bold">
                Main Wing (Span: {glider.wing.spanMm}mm)
              </text>
            </g>

            {/* 3. Horizontal Tail Pattern */}
            <g transform={`translate(${Math.max(glider.wing.spanMm + 40, 260)}, 110)`}>
              <path
                d={tail.outlinePath}
                fill="#2a1d13"
                stroke="#ef4444"
                strokeWidth="1.2"
              />
              <text x={tail.dimensions.widthMm / 2} y="12" fill="#f59e0b" fontSize="8" textAnchor="middle" fontWeight="bold">
                Tail ({tail.dimensions.heightMm}mm)
              </text>
            </g>

            {/* Scale Calibration Ruler (50mm / 2 inches) */}
            {showRuler && (
              <g transform={`translate(${sheetWidth - 140}, ${sheetHeight - 25})`}>
                <rect x="0" y="0" width="120" height="16" fill="#0f172a" stroke="#475569" strokeWidth="1" rx="2" />
                {/* 50mm Bar */}
                <line x1="10" y1="12" x2="60" y2="12" stroke="#22d3ee" strokeWidth="3" />
                <line x1="10" y1="5" x2="10" y2="14" stroke="#22d3ee" strokeWidth="1.5" />
                <line x1="60" y1="5" x2="60" y2="14" stroke="#22d3ee" strokeWidth="1.5" />
                <text x="35" y="8" fill="#22d3ee" fontSize="7" textAnchor="middle" fontFamily="monospace">
                  50 mm
                </text>

                {/* 2 inch Bar */}
                <line x1="65" y1="12" x2="115.8" y2="12" stroke="#fbbf24" strokeWidth="3" />
                <line x1="65" y1="5" x2="65" y2="14" stroke="#fbbf24" strokeWidth="1.5" />
                <line x1="115.8" y1="5" x2="115.8" y2="14" stroke="#fbbf24" strokeWidth="1.5" />
                <text x="90" y="8" fill="#fbbf24" fontSize="7" textAnchor="middle" fontFamily="monospace">
                  2.0 in
                </text>
              </g>
            )}
          </svg>

          {/* Educational Note */}
          <div className="mt-3 flex items-start gap-2 text-xs text-slate-400 bg-slate-950/60 p-2.5 rounded border border-slate-800">
            <Info className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
            <span>
              <strong>Maker Tip:</strong> The slot in the fuselage is laser-kerf compensated to{' '}
              {glider.fuselage.wingSlot.thicknessMm.toFixed(2)}mm for a firm friction lock with the{' '}
              {glider.wing.thicknessMm.toFixed(2)}mm wing sheet. Sand lightly if tight, or apply a drop of PVA/wood glue.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
