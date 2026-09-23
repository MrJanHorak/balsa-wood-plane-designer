'use client';

import React, { useState } from 'react';
import { GliderDesign } from '@/types/glider';
import { exportPatternSvg } from '@/geometry/exportSvg';
import { getWingBlank } from '@/geometry/wingBlank';
import { getWingFormingTargets } from '@/geometry/wingForming';
import type { PrintPaper } from '@/geometry/printLayout';
import {
  generateFuselageFlatPattern,
  generateTailFlatPattern,
  generateWingFlatPattern,
  generatePylonFlatPattern,
  generateFinFlatPattern,
  FlatPartSvg,
} from '@/geometry/patterns2d';
import { Scissors, Ruler, Download, Info } from 'lucide-react';

interface Pattern2DViewportProps {
  glider: GliderDesign;
}

interface LaidOutPart {
  part: FlatPartSvg;
  rotate: boolean;
  transform: string;
  labelX: number;
  labelY: number;
}

const SHEET_MARGIN = 16;
const PART_GAP = 22;
const HEADER_SPACE = 26;

/**
 * Computes the transform needed to place a part's bounding box (optionally
 * rotated 90°) so its top-left corner sits at (targetX, targetY) in sheet
 * space. Works for any part regardless of its own local coordinate origin —
 * fuselage/pylon are drawn from (0,0), wing/tail are span-centered on Y=0 —
 * so parts can never end up positioned outside the sheet they're stacked on.
 *
 * `flip` handles a real orientation bug: the fuselage and pylon are defined
 * with Y increasing *upward* (belly at 0, spine highest) — the same
 * convention physics, the 3D view, and getFuselageProfilePoints all use.
 * SVG's Y axis increases *downward*, so drawing those parts' points
 * verbatim renders them spine-down / belly-up — upside down relative to
 * every other view of the same design (this is the same fix applied in
 * FuselageProfileEditor.tsx, ported here since the laser-cut export is the
 * one place this actually matters physically). The rotated wing/tail parts
 * don't need this: a flat sheet planform has no meaningful "up" side, so a
 * chordwise mirror there is harmless (the cut piece can be flipped over).
 */
export function layoutPart(part: FlatPartSvg, targetX: number, targetY: number, rotate: boolean, flip: boolean = false): LaidOutPart {
  const { minX, minY, maxX, maxY } = part.boundingBox;
  if (rotate) {
    const a = targetX + maxY;
    const b = targetY - minX;
    return {
      part,
      rotate,
      transform: `translate(${a.toFixed(2)}, ${b.toFixed(2)}) rotate(90)`,
      // Label sits above the rotated part, centered on its rotated width
      labelX: targetX + (maxY - minY) / 2,
      labelY: targetY - 6,
    };
  }
  if (flip) {
    const a = targetX - minX;
    const b = targetY + maxY;
    return {
      part,
      rotate,
      transform: `translate(${a.toFixed(2)}, ${b.toFixed(2)}) scale(1,-1)`,
      labelX: targetX + (maxX - minX) / 2,
      labelY: targetY - 6,
    };
  }
  const a = targetX - minX;
  const b = targetY - minY;
  return {
    part,
    rotate,
    transform: `translate(${a.toFixed(2)}, ${b.toFixed(2)})`,
    labelX: targetX + (maxX - minX) / 2,
    labelY: targetY - 6,
  };
}

export const Pattern2DViewport: React.FC<Pattern2DViewportProps> = ({ glider }) => {
  const [showRuler, setShowRuler] = useState(true);
  const [paper, setPaper] = useState<PrintPaper>('a4');
  const [printing, setPrinting] = useState(false);
  const [printError, setPrintError] = useState('');
  const downloadPdf = async () => {
    setPrinting(true); setPrintError('');
    try {
      const { createPatternPdf } = await import('@/geometry/exportPdf');
      const name = glider.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'glider';
      createPatternPdf(glider, paper).save(`${name}-${paper}-100-percent.pdf`);
    } catch (error) {
      setPrintError(error instanceof Error ? error.message : 'Could not create the PDF. Please try again.');
    } finally { setPrinting(false); }
  };

  const fuselage = generateFuselageFlatPattern(glider);
  const wing = generateWingFlatPattern(glider);
  const wingBlank = getWingBlank(glider.wing);
  const wingForming = getWingFormingTargets(glider.wing);
  const tail = generateTailFlatPattern(glider);
  const pylon = glider.fuselage.mountType === 'parasol_pylon' ? generatePylonFlatPattern(glider) : null;

  // Download SVG pattern function
  const downloadSvg = () => {
    const source = exportPatternSvg(glider);
    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${glider.name.toLowerCase().replace(/\s+/g, '-')}-laser-pattern.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  // Dynamically stack every part in its own row, sized from its actual
  // measured extents — never fixed magic-number offsets — so nothing added
  // (like the pylon) or grown (a wider wingspan, a taller fuselage) can ever
  // overflow off the visible sheet.
  const rows: { part: FlatPartSvg; rotate: boolean; flip: boolean; label: string }[] = [
    { part: fuselage, rotate: false, flip: true, label: `Fuselage (${Math.round(fuselage.dimensions.widthMm)}mm)` },
    { part: wing, rotate: true, flip: false, label: `Main Wing (Span: ${glider.wing.spanMm}mm)` },
    { part: tail, rotate: true, flip: false, label: `Tail (Span: ${glider.horizontalStabilizer.spanMm}mm)` },
  ];
  if (pylon) {
    rows.push({ part: pylon, rotate: false, flip: true, label: `Pylon (${pylon.dimensions.widthMm}×${Math.round(pylon.dimensions.heightMm)}mm)` });
  }
  if (!glider.verticalStabilizer.isIntegralWithFuselage) {
    rows.push({ part: generateFinFlatPattern(glider), rotate: false, flip: true, label: `Vertical Fin (${glider.verticalStabilizer.heightMm}mm)` });
  }

  let yCursor = HEADER_SPACE;
  const laidOut: (LaidOutPart & { label: string })[] = [];
  let maxRowWidth = 0;

  for (const row of rows) {
    const effWidth = row.rotate
      ? row.part.boundingBox.maxY - row.part.boundingBox.minY
      : row.part.boundingBox.maxX - row.part.boundingBox.minX;
    const effHeight = row.rotate
      ? row.part.boundingBox.maxX - row.part.boundingBox.minX
      : row.part.boundingBox.maxY - row.part.boundingBox.minY;

    const laid = layoutPart(row.part, SHEET_MARGIN, yCursor + 14, row.rotate, row.flip);
    laidOut.push({ ...laid, label: row.label });

    maxRowWidth = Math.max(maxRowWidth, effWidth);
    yCursor += effHeight + 14 + PART_GAP;
  }

  const sheetWidth = Math.max(300, maxRowWidth + SHEET_MARGIN * 2);
  const sheetHeight = yCursor;

  return (
    <div className="relative w-full h-full flex flex-col bg-slate-950 text-slate-100 overflow-hidden select-none">
      {/* Top Controls Bar */}
      <div className="flex flex-wrap gap-2 items-center justify-between p-3 border-b border-slate-800 bg-slate-900/60 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <Scissors className="w-4 h-4 text-amber-400" />
          <span className="font-semibold text-sm">2D Flat Cut Pattern</span>
          <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
            1:1 Scale Vector
          </span>
        </div>

        {/* View Options & Download */}
        <div className="flex flex-wrap items-center gap-2">
          <select aria-label="PDF paper size" value={paper} onChange={event => setPaper(event.target.value as PrintPaper)} className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs">
            <option value="a4">A4</option><option value="letter">US Letter</option>
          </select>
          <button onClick={downloadPdf} disabled={printing} className="px-3 py-1 text-xs font-semibold rounded bg-cyan-400 text-slate-950 disabled:opacity-50">
            {printing ? 'Preparing PDF...' : 'Print PDF (1:1)'}
          </button>
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

      {printError && <p role="alert" className="px-3 py-2 text-xs text-rose-300">{printError}</p>}

      {/* SVG Canvas Area */}
      <div className="flex-1 overflow-auto p-6 flex items-start justify-center bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px]">
        <div className="relative p-6 rounded-xl border border-slate-800 bg-slate-900/80 shadow-2xl overflow-hidden max-w-full">
          {/* Legend Banner */}
          <div className="flex items-center gap-6 mb-4 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <span className="inline-block w-4 h-0.5 bg-red-500" />
              <span>Cut Lines (Laser / Knife)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-4 h-0.5 border-t-2 border-dashed border-cyan-400" />
              <span>Score / Fold / Glue-Seat Lines</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 border border-amber-500/60 bg-amber-500/10 rounded-sm" />
              <span>Friction Interlocking Slots</span>
            </div>
          </div>

          <svg
            id="balsa-pattern-svg"
            viewBox={`-20 -20 ${sheetWidth + 40} ${sheetHeight + 40}`}
            className="w-full max-h-[600px] border border-slate-700/80 rounded bg-slate-950/60 shadow-inner"
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
            <text x="10" y="14" fill="#855d3e" fontSize="8" fontFamily="monospace">
              PART LAYOUT — NOT STOCK NESTING ({glider.material.name})
            </text>

            {laidOut.map((row) => (
              <React.Fragment key={row.part.id}>
                <g transform={row.transform}>
                  <path d={row.part.outlinePath} fill="#2a1d13" stroke="#ef4444" strokeWidth="1.2" />
                  {row.part.slotCutouts.map((slotD, idx) => (
                    <path key={idx} d={slotD} fill="#0f172a" stroke="#fbbf24" strokeWidth="1.2" />
                  ))}
                  {row.part.scoreLines.map((lineD, idx) => (
                    <path key={idx} d={lineD} fill="none" stroke="#06b6d4" strokeWidth="1.2" strokeDasharray="3 2" />
                  ))}
                </g>
                <text x={row.labelX} y={row.labelY} fill="#f59e0b" fontSize="9" textAnchor="middle" fontWeight="bold">
                  {row.label}
                </text>
              </React.Fragment>
            ))}

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
              <strong>Export:</strong> SVG uses millimetres with separate red cut and blue guide groups.
              Apply kerf compensation in your cutting software; it is not applied here. Test slot fit on scrap.
              Use the specified thickness for each part; this layout is not a stock-sheet packing plan.
              {glider.wing.camberPercent > 0 && <span className="block text-amber-300 mt-1">
                Wing blank root: {wingBlank.rootLengthMm.toFixed(2)} mm; formed chord: {glider.wing.rootChordMm.toFixed(2)} mm.
                {' '}{wingBlank.description}
                {' '}Target root camber rise: {wingForming.rootCamberRiseMm.toFixed(1)} mm. Cut-out alone does not form the curve.
              </span>}
              {glider.wing.dihedralDeg !== 0 && <span className="block mt-1">
                Target dihedral: {glider.wing.dihedralDeg.toFixed(1)}° per side, about {wingForming.tipRiseMm.toFixed(1)} mm tip rise on each half-span.
                {' '}Pulling the wing straight through leaves it flat; the center line is a fold/assembly guide.
                {' '}Through-slots include relief for the formed wing. Test insertion and bending on scrap.
              </span>}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
