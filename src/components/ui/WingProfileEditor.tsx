'use client';

import React, { useEffect, useRef, useState } from 'react';
import { GliderDesign, WingConfig, WingNode } from '@/types/glider';
import { seedWingNodes, validateCustomWing, tailAsWing, wingAsTail, nudgeSurfaceNode, type SurfaceArrowKey } from '@/geometry/customWing';
import { calculateCustomWingPlanformPoints, pointsToPath, polygonArea } from '@/geometry/core';
import { finAsWing, wingAsFin } from '@/geometry/customFin';
import { Info } from 'lucide-react';
import { useSvgHitRadius } from './useSvgHitRadius';

interface Props { glider: GliderDesign; onChange: (design: GliderDesign) => void; onClose: () => void; surface?: 'wing' | 'tail' | 'fin' }
const button = 'rounded border border-slate-600 px-3 py-1.5 text-xs hover:bg-slate-700 disabled:opacity-30';

export function WingProfileEditor({ glider, onChange, onClose, surface = 'wing' }: Props) {
  if (surface === 'fin') return <SurfaceProfileEditor key="fin" surface="fin"
    glider={{ ...glider, wing: finAsWing(glider.verticalStabilizer) }} onClose={onClose}
    onChange={next => onChange({ ...glider, verticalStabilizer: wingAsFin(next.wing, glider.verticalStabilizer) })} />;
  if (surface === 'tail') return <SurfaceProfileEditor key="tail" surface="tail"
    glider={{ ...glider, wing: tailAsWing(glider.horizontalStabilizer) }} onClose={onClose}
    onChange={next => onChange({ ...glider, horizontalStabilizer: wingAsTail(next.wing) })} />;
  return <SurfaceProfileEditor key="wing" glider={glider} onChange={onChange} onClose={onClose} surface="wing" />;
}

function SurfaceProfileEditor({ glider, onChange, onClose, surface = 'wing' }: Props) {
  const isFin = surface === 'fin';
  const surfaceName = isFin ? 'Vertical Fin' : surface === 'tail' ? 'Horizontal Tail' : 'Wing';
  const [nodes, setNodes] = useState(() => seedWingNodes(glider.wing));
  const [history, setHistory] = useState<WingConfig[]>([]);
  const [future, setFuture] = useState<WingConfig[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState('');
  const svgRef = useRef<SVGSVGElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: string; before: WingConfig } | null>(null);
  const currentWing = useRef(glider.wing);
  // Keep the canvas stable throughout edits rather than moving it beneath the pointer.
  const [bounds] = useState(() => {
    const span = glider.wing.spanMm;
    const xs = nodes.map(n => n.xMm);
    const min = Math.min(...xs, -glider.wing.rootChordMm) - 35;
    const max = Math.max(...xs, glider.wing.rootChordMm * 2) + 35;
    return { min, width: max - min, span: span * 1.18 };
  });
  const radius = Math.max(bounds.width, bounds.span) / 95;
  const hitRadius = useSvgHitRadius(svgRef, isFin ? bounds.width : bounds.span, isFin ? glider.wing.spanMm / 2 + 40 : bounds.width, radius);
  const publish = (wing: WingConfig) => {
    currentWing.current = wing;
    setNodes(seedWingNodes(wing));
    onChange({ ...glider, wing });
    setError('');
  };
  const accept = (next: WingNode[], remember = true) => {
    const tipY = glider.wing.spanMm / 2;
    const tips = next.filter(n => Math.abs(n.yMm - tipY) < 1e-6);
    const wing: WingConfig = { ...currentWing.current, planformType: 'custom', customNodes: next, tipChordMm: tips.length === 2 ? tips[1].xMm - tips[0].xMm : glider.wing.tipChordMm };
    const problem = validateCustomWing(wing);
    if (problem) { setError(surface !== 'wing' ? problem.replace(/wing/gi, surface) : problem); return; }
    const before = currentWing.current;
    if (remember) { setHistory(h => [...h, before]); setFuture([]); }
    publish(wing);
  };
  const undo = () => {
    if (!history.length || drag.current) return;
    const before = currentWing.current;
    setFuture(f => [before, ...f]);
    publish(history[history.length - 1]); setHistory(h => h.slice(0, -1)); setSelected(null);
  };
  const redo = () => {
    if (!future.length || drag.current) return;
    const before = currentWing.current;
    setHistory(h => [...h, before]); publish(future[0]); setFuture(f => f.slice(1)); setSelected(null);
  };
  const protectedNode = (n: WingNode) => n.yMm === 0 || Math.abs(n.yMm - glider.wing.spanMm / 2) < 1e-6;
  const selectedNode = nodes.find(n => n.id === selected);
  const remove = () => {
    if (!selectedNode || protectedNode(selectedNode)) return;
    accept(nodes.filter(n => n.id !== selected)); setSelected(null);
  };
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    return () => previous?.focus();
  }, []);
  const keyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); finishDrag(); onClose(); return; }
    if ((e.ctrlKey || e.metaKey) && ['z', 'y'].includes(e.key.toLowerCase())) {
      e.preventDefault(); if (e.key.toLowerCase() === 'y' || e.shiftKey) redo(); else undo();
    }
    if (e.key === 'Delete' && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLSelectElement)) remove();
    if (e.key === 'Tab') {
      const items = dialogRef.current?.querySelectorAll<HTMLElement | SVGElement>('button:not(:disabled), select, input:not(:disabled), summary, [tabindex="0"]');
      if (!items?.length) return;
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  };
  const finishDrag = () => {
    if (!drag.current) return;
    const before = drag.current.before;
    if (currentWing.current !== before) { setHistory(h => [...h, before]); setFuture([]); }
    drag.current = null;
  };
  const handlePointKeyDown = (e: React.KeyboardEvent<SVGCircleElement>, n: WingNode) => {
    if (e.altKey || e.ctrlKey || e.metaKey || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
    e.preventDefault();
    const next = nudgeSurfaceNode(currentWing.current, nodes, n.id, e.key as SurfaceArrowKey, e.shiftKey ? 5 : 1, isFin);
    if (next) accept(next);
  };
  const move = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!drag.current || !svgRef.current) return;
    const matrix = svgRef.current.getScreenCTM();
    if (!matrix) return;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(matrix.inverse());
    const id = drag.current.id;
    accept(nodes.map(n => n.id !== id || n.yMm === 0 ? n : {
      ...n, xMm: Math.round((isFin ? p.x : p.y) * 10) / 10,
      yMm: protectedNode(n) ? n.yMm : Math.max(0.1, Math.min(glider.wing.spanMm / 2 - 0.1, Math.round((isFin ? -p.y : p.x) * 10) / 10)),
    }), false);
  };
  const area = polygonArea(calculateCustomWingPlanformPoints(nodes.map(n => ({ x: n.xMm, y: n.yMm })))) / (isFin ? 2 : 1);
  const halfPath = pointsToPath(nodes.map(n => ({ x: n.yMm, y: n.xMm })));
  return <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4">
    <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="wing-editor-title" onKeyDown={keyDown} className="w-full max-w-5xl h-[85dvh] max-h-[calc(100dvh-2rem)] bg-slate-900 border border-slate-700 rounded-xl flex flex-col overflow-y-auto overflow-x-hidden text-slate-100">
      <div className="flex items-center justify-between p-4 border-b border-slate-700">
        <div><h2 id="wing-editor-title" className="font-semibold">Custom {surfaceName} Shape Designer</h2><p className="text-xs text-slate-400">{isFin ? 'Edit the upright profile; root attachments stay fixed.' : 'Edit the right panel; the left mirrors automatically.'} Drag or use arrow keys to move points. Press Enter on + to add one.</p></div>
        <button className={button} onClick={onClose}>Done</button>
      </div>
      <div className="flex flex-wrap items-center gap-2 p-3 border-b border-slate-700">
        <button className={button} disabled={!history.length} onClick={undo}>Undo</button>
        <button className={button} disabled={!future.length} onClick={redo}>Redo</button>
        <button className={button} disabled={!selectedNode || protectedNode(selectedNode)} onClick={remove}>Delete point</button>
        <label className="text-xs ml-auto">Reset shape <select aria-label={`Reset ${surface} shape`} value="" className="bg-slate-800 p-2 rounded" onChange={e => {
          const wing = { ...glider.wing, planformType: e.target.value as WingConfig['planformType'], customNodes: undefined };
          const before = currentWing.current;
          setHistory(h => [...h, before]); setFuture([]); setSelected(null); publish(wing);
        }}><option value="" disabled>Choose…</option>{['tapered', 'rectangular', 'elliptical', 'delta'].map(s => <option key={s} value={s}>{s}</option>)}</select></label>
      </div>
      <svg ref={svgRef} aria-label={`${surfaceName} outline`} viewBox={isFin ? `${bounds.min} ${-glider.wing.spanMm / 2 - 20} ${bounds.width} ${glider.wing.spanMm / 2 + 40}` : `${-bounds.span / 2} ${bounds.min} ${bounds.span} ${bounds.width}`} className="flex-1 min-h-48 shrink-0 w-full touch-none bg-slate-950/50" onPointerMove={move} onPointerUp={finishDrag} onPointerCancel={() => { if (drag.current) publish(drag.current.before); drag.current = null; }}>
        <g transform={isFin ? 'matrix(0,-1,1,0,0,0)' : undefined}>
        {!isFin && <path d={halfPath} transform="scale(-1,1)" fill="#164e6333" stroke="#64748b" strokeWidth={1} strokeDasharray="4 3" />}
        <path d={halfPath} fill="#0891b233" stroke="#22d3ee" strokeWidth={1} />
        <rect x={-glider.fuselage.thicknessMm / 2} y={0} width={glider.fuselage.thicknessMm} height={glider.wing.rootChordMm} fill="#fbbf2444" />
        <line x1={0} x2={0} y1={bounds.min} y2={bounds.min + bounds.width} stroke="#fbbf24" strokeDasharray="3 3" />
        {nodes.slice(0, -1).map((n, i) => {
          const next = nodes[i + 1];
          if (Math.abs(n.yMm - next.yMm) < 0.2 || nodes.length >= 128) return null;
          const insert = () => { const point = { id: crypto.randomUUID(), label: 'Edge point', xMm: (n.xMm + next.xMm) / 2, yMm: (n.yMm + next.yMm) / 2 }; accept([...nodes.slice(0, i + 1), point, ...nodes.slice(i + 1)]); setSelected(point.id); };
          return <g key={`add-${n.id}`} role="button" tabIndex={0} aria-label={`Add point after ${n.label}`} onClick={insert} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); insert(); } }} className="cursor-pointer">
            <circle cx={(n.yMm + next.yMm) / 2} cy={(n.xMm + next.xMm) / 2} r={hitRadius} fill="transparent" pointerEvents="all" />
            <circle cx={(n.yMm + next.yMm) / 2} cy={(n.xMm + next.xMm) / 2} r={radius * 0.8} fill="#0f172a" stroke="#64748b" pointerEvents="none" />
            <text x={(n.yMm + next.yMm) / 2} y={(n.xMm + next.xMm) / 2} textAnchor="middle" dominantBaseline="central" fontSize={radius * 1.3} fill="#e2e8f0" pointerEvents="none">+</text>
          </g>;
        })}
        {nodes.map(n => <g key={n.id}>
          <circle cx={n.yMm} cy={n.xMm} r={radius} fill={selected === n.id ? '#fbbf24' : n.yMm === 0 ? '#64748b' : '#22d3ee'} stroke="#0f172a" pointerEvents="none" />
          <circle role="button" tabIndex={0} aria-label={`Move ${n.label}, chordwise ${n.xMm.toFixed(1)} mm, ${isFin ? 'height' : 'spanwise'} ${n.yMm.toFixed(1)} mm${n.yMm === 0 ? ', fixed root' : ''}`} cx={n.yMm} cy={n.xMm} r={hitRadius} fill="transparent" pointerEvents="all" className="cursor-grab" onFocus={() => setSelected(n.id)} onKeyDown={e => handlePointKeyDown(e, n)} onPointerDown={e => {
          setSelected(n.id); if (n.yMm === 0) return;
          drag.current = { id: n.id, before: currentWing.current }; svgRef.current?.setPointerCapture(e.pointerId); e.preventDefault();
        }} />
        </g>)}
        </g>
      </svg>
      <div className="p-3 border-t border-slate-700 text-xs space-y-2">
        {selectedNode && <div className="flex flex-wrap items-center gap-3"><span>{selectedNode.label}</span>{(['xMm', 'yMm'] as const).map(axis => <label key={axis}>{axis === 'xMm' ? 'Chordwise' : (isFin ? 'Height' : 'Spanwise')} (mm) <input aria-label={`${axis === 'xMm' ? 'Chordwise' : (isFin ? 'Height' : 'Spanwise')} position`} type="number" step="0.1" value={Number(selectedNode[axis].toFixed(1))} disabled={selectedNode.yMm === 0 || (axis === 'yMm' && protectedNode(selectedNode))} className="w-20 bg-slate-800 rounded p-1 disabled:opacity-40" onChange={e => { if (e.target.value !== '') accept(nodes.map(n => n.id === selected ? { ...n, [axis]: Number(e.target.value) } : n)); }} /></label>)}</div>}
        <p>{isFin ? 'Height' : 'Span'} {(glider.wing.spanMm / (isFin ? 2 : 1)).toFixed(0)} mm · Root {glider.wing.rootChordMm.toFixed(1)} mm · Tip {(nodes.filter(n => Math.abs(n.yMm - glider.wing.spanMm / 2) < 1e-6).reduce((sum, n, i) => sum + (i === 0 ? -n.xMm : n.xMm), 0)).toFixed(1)} mm · Area {(area / 10000).toFixed(2)} dm² {!isFin && <>· Aspect ratio {(glider.wing.spanMm ** 2 / area).toFixed(2)}</>}</p>
        <p role="status" className="text-amber-300 min-h-4">{error}</p>
      </div>
      <details className="border-t border-slate-700 bg-slate-950/60 px-3 py-2.5 text-xs text-slate-300">
        <summary className="flex min-h-8 cursor-pointer items-center gap-2 font-semibold text-cyan-200"><Info className="h-3.5 w-3.5 flex-shrink-0" /> Editing tips and keyboard controls</summary>
        <p className="mt-2 leading-relaxed">Tab to a point and use the arrow keys to move it in the direction shown by 1 mm (Shift for 5 mm). Root attachments stay fixed, and tip points stay at the same {isFin ? 'height' : 'span'}. Tab to a + and press Enter or Space to add a point. Delete removes a selected interior point. Resize with the dimension sliders. Changes update the model, cutting pattern, and balance calculations.</p>
      </details>
    </div>
  </div>;
}
