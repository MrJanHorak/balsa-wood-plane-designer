'use client';

import React, { useRef, useState, useCallback } from 'react';
import { GliderDesign, FuselageNode } from '@/types/glider';
import { getFuselageProfilePoints } from '@/physics/massBalance';
import { pointsToSmoothClosedPath, calculateSlotPoints, pointsToPath } from '@/geometry/core';
import { X, Trash2, RotateCcw, Info, Undo2, Redo2 } from 'lucide-react';

interface FuselageProfileEditorProps {
  glider: GliderDesign;
  onChange: (updated: GliderDesign) => void;
  onClose: () => void;
}

let nodeIdCounter = 0;
function nextNodeId(): string {
  nodeIdCounter += 1;
  return `custom_node_${Date.now()}_${nodeIdCounter}`;
}

/** Converts the current parametric (or existing custom) profile into editable nodes. */
function seedNodesFromCurrentProfile(glider: GliderDesign): FuselageNode[] {
  if (glider.fuselage.profileStyle === 'custom' && glider.fuselage.customNodes && glider.fuselage.customNodes.length >= 3) {
    return glider.fuselage.customNodes;
  }
  const points = getFuselageProfilePoints(glider);
  return points.map((p, i) => ({
    id: nextNodeId(),
    label: i === 0 ? 'Nose Tip' : `Point ${i + 1}`,
    xMm: p.x,
    yMm: p.y,
  }));
}

const PADDING = 30;

export const FuselageProfileEditor: React.FC<FuselageProfileEditorProps> = ({ glider, onChange, onClose }) => {
  const [nodes, setNodes] = useState<FuselageNode[]>(() => seedNodesFromCurrentProfile(glider));
  const [history, setHistory] = useState<FuselageNode[][]>([]);
  const [future, setFuture] = useState<FuselageNode[][]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const dragStartNodesRef = useRef<FuselageNode[] | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    return () => previous?.focus();
  }, []);

  const commit = useCallback(
    (nextNodes: FuselageNode[], previousNodes: FuselageNode[]) => {
      setHistory((h) => [...h, previousNodes]);
      setFuture([]);
      setNodes(nextNodes);
      onChange({
        ...glider,
        fuselage: {
          ...glider.fuselage,
          profileStyle: 'custom',
          customNodes: nextNodes,
        },
      });
    },
    [glider, onChange]
  );

  // Enter custom mode on first drag/edit, but don't spam onChange just for
  // opening the modal — only commit once the user actually changes something.
  const ensureCommitted = commit;

  const handleUndo = () => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    setFuture((f) => [nodes, ...f]);
    setNodes(previous);
    setSelectedId(null);
    onChange({
      ...glider,
      fuselage: { ...glider.fuselage, profileStyle: 'custom', customNodes: previous },
    });
  };

  const handleRedo = () => {
    if (future.length === 0) return;
    const next = future[0];
    setFuture((f) => f.slice(1));
    setHistory((h) => [...h, nodes]);
    setNodes(next);
    setSelectedId(null);
    onChange({
      ...glider,
      fuselage: { ...glider.fuselage, profileStyle: 'custom', customNodes: next },
    });
  };

  // Ctrl/Cmd+Z to undo, Ctrl/Cmd+Shift+Z (or Ctrl+Y) to redo, scoped to while this modal is open.
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod || e.key.toLowerCase() !== 'z' && e.key.toLowerCase() !== 'y') return;
      e.preventDefault();
      if (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey)) {
        handleRedo();
      } else {
        handleUndo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history, future, nodes]);

  const screenToSvgPoint = (clientX: number, clientY: number): { x: number; y: number } | null => {
    const svg = svgRef.current;
    if (!svg) return null;
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const transformed = pt.matrixTransform(ctm.inverse());
    return { x: transformed.x, y: transformed.y };
  };

  const handlePointerDownNode = (e: React.PointerEvent, id: string) => {
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    dragStartNodesRef.current = nodes;
    setSelectedId(id);
    setDragging(true);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging || !selectedId) return;
    const p = screenToSvgPoint(e.clientX, e.clientY);
    if (!p) return;
    // The drawable content is rendered inside a scale(1,-1) group (see the
    // JSX below) so the fuselage's up-is-positive Y convention displays
    // spine-up / belly-down like every other view in the app, instead of
    // upside-down as SVG's native down-is-positive Y would otherwise show
    // it. screenToSvgPoint returns a point in the un-flipped outer space,
    // so it must be negated back to model space here.
    const nextNodes = nodes.map((n) => (n.id === selectedId ? { ...n, xMm: p.x, yMm: -p.y } : n));
    setNodes(nextNodes);
  };

  const handlePointerUp = () => {
    if (dragging) {
      ensureCommitted(nodes, dragStartNodesRef.current ?? nodes);
      dragStartNodesRef.current = null;
    }
    setDragging(false);
  };

  const handleInsertOnEdge = (afterIndex: number) => {
    const a = nodes[afterIndex];
    const b = nodes[(afterIndex + 1) % nodes.length];
    const midpoint: FuselageNode = {
      id: nextNodeId(),
      label: 'New Point',
      xMm: (a.xMm + b.xMm) / 2,
      yMm: (a.yMm + b.yMm) / 2,
    };
    const nextNodes = [...nodes.slice(0, afterIndex + 1), midpoint, ...nodes.slice(afterIndex + 1)];
    ensureCommitted(nextNodes, nodes);
    setSelectedId(midpoint.id);
  };

  const handleDeleteSelected = () => {
    if (!selectedId || nodes.length <= 3) return;
    const nextNodes = nodes.filter((n) => n.id !== selectedId);
    setSelectedId(null);
    ensureCommitted(nextNodes, nodes);
  };

  const handleResetToParametric = () => {
    setSelectedId(null);
    onChange({
      ...glider,
      fuselage: {
        ...glider.fuselage,
        profileStyle: 'trainer',
        customNodes: undefined,
      },
    });
    onClose();
  };

  // View bounds: fit all nodes plus the wing/tail slots, with padding.
  const allX = [
    ...nodes.map((n) => n.xMm),
    glider.fuselage.wingSlot.xPositionMm,
    glider.fuselage.wingSlot.xPositionMm + glider.fuselage.wingSlot.lengthMm,
    glider.fuselage.tailSlot.xPositionMm,
    glider.fuselage.tailSlot.xPositionMm + glider.fuselage.tailSlot.lengthMm,
  ];
  const allY = [...nodes.map((n) => n.yMm), 0];
  const minX = Math.min(...allX) - PADDING;
  const maxX = Math.max(...allX) + PADDING;
  const minY = Math.min(...allY) - PADDING;
  const maxY = Math.max(...allY) + PADDING;
  const viewW = maxX - minX;
  const viewH = maxY - minY;

  // Smoothed through the actual node positions (Catmull-Rom, same as the
  // 2D cut-pattern export) so the body reads as a curved contour instead
  // of straight facets between drag handles — the handles themselves stay
  // exactly where the user put them; only the connecting outline is curved.
  const outlinePath = pointsToSmoothClosedPath(nodes.map((n) => ({ x: n.xMm, y: n.yMm })));

  const selectedNode = nodes.find((n) => n.id === selectedId) ?? null;

  const handleDialogKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key !== 'Tab') return;
    const items = dialogRef.current?.querySelectorAll<HTMLElement | SVGElement>(
      'button:not(:disabled), input:not(:disabled), select:not(:disabled), summary, [tabindex="0"]'
    );
    if (!items?.length) return;
    const first = items[0], last = items[items.length - 1];
    if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
      event.preventDefault(); last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault(); first.focus();
    }
  };

  const handlePointKeyDown = (event: React.KeyboardEvent, node: FuselageNode) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault(); setSelectedId(node.id);
      return;
    }
    const step = event.shiftKey ? 5 : 1;
    const change = event.key === 'ArrowLeft' ? { xMm: -step, yMm: 0 }
      : event.key === 'ArrowRight' ? { xMm: step, yMm: 0 }
      : event.key === 'ArrowUp' ? { xMm: 0, yMm: step }
      : event.key === 'ArrowDown' ? { xMm: 0, yMm: -step } : null;
    if (!change) return;
    event.preventDefault();
    commit(nodes.map((point) => point.id === node.id
      ? { ...point, xMm: point.xMm + change.xMm, yMm: point.yMm + change.yMm }
      : point), nodes);
    setSelectedId(node.id);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4">
      <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="fuselage-editor-title" onKeyDown={handleDialogKeyDown}
        className="w-full max-w-5xl h-[85dvh] max-h-[calc(100dvh-2rem)] bg-slate-900 border border-slate-700 rounded-xl shadow-2xl flex flex-col overflow-y-auto overflow-x-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950/60">
          <div>
            <h2 id="fuselage-editor-title" className="text-sm font-bold text-slate-100">Custom Fuselage Shape Designer</h2>
            <p className="text-xs text-slate-300">
              Drag points to reshape the body. Click a point then use the buttons below to add or remove points.
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close fuselage shape editor" className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 px-4 py-2 border-b border-slate-800 bg-slate-900/60">
          <button
            onClick={handleUndo}
            disabled={history.length === 0}
            title="Undo (Ctrl+Z)"
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded border border-slate-700 text-slate-300 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Undo2 className="w-3.5 h-3.5" />
            Undo
          </button>
          <button
            onClick={handleRedo}
            disabled={future.length === 0}
            title="Redo (Ctrl+Y)"
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded border border-slate-700 text-slate-300 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Redo2 className="w-3.5 h-3.5" />
            Redo
          </button>
          <div className="w-px h-4 bg-slate-800 mx-0.5" />
          <button
            onClick={handleDeleteSelected}
            disabled={!selectedNode || nodes.length <= 3}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded border border-slate-700 text-slate-300 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete Point
          </button>
          <span className="text-xs text-slate-300">
            {selectedNode ? `Selected: ${selectedNode.label} (${selectedNode.xMm.toFixed(0)}, ${selectedNode.yMm.toFixed(0)}mm)` : 'Click a point to select it'}
          </span>
          <div className="flex-1" />
          <button
            onClick={handleResetToParametric}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded border border-slate-700 text-slate-300 hover:bg-slate-800"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset to Standard Shape
          </button>
        </div>

        {/* Canvas */}
        <div className="flex-1 min-h-48 shrink-0 overflow-hidden bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px]">
          <svg
            ref={svgRef}
            aria-label="Fuselage profile outline"
            viewBox={`${minX} ${-maxY} ${viewW} ${viewH}`}
            className="w-full h-full touch-none"
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          >
            {/*
              Everything below is authored using the fuselage's own
              coordinate convention (Y increases upward: belly at 0, spine
              at maxHeightMm) — same as getFuselageProfilePoints and every
              other consumer. This group flips that for display only, so
              it renders spine-up/belly-down instead of upside-down (SVG's
              native Y axis increases downward). Model data itself is
              never flipped — see handlePointerMove for the corresponding
              un-flip on the way back in.
            */}
            <g transform="scale(1,-1)">
            {/* Wing & tail slot context overlays (read-only reference) */}
            <path
              d={pointsToPath(calculateSlotPoints(glider.fuselage.wingSlot, glider.wing.rootChordMm, glider.wing.camberPercent))}
              fill="rgba(251, 191, 36, 0.15)"
              stroke="#fbbf24"
              strokeWidth={viewW / 400}
              strokeDasharray={`${viewW / 100} ${viewW / 200}`}
            />
            <path
              d={pointsToPath(calculateSlotPoints(glider.fuselage.tailSlot))}
              fill="rgba(6, 182, 212, 0.15)"
              stroke="#06b6d4"
              strokeWidth={viewW / 400}
              strokeDasharray={`${viewW / 100} ${viewW / 200}`}
            />

            {/* Fuselage outline */}
            <path d={outlinePath} fill="rgba(239, 68, 68, 0.12)" stroke="#ef4444" strokeWidth={viewW / 250} />

            {/* Edge midpoint "insert point" handles */}
            {nodes.map((n, i) => {
              const next = nodes[(i + 1) % nodes.length];
              const midX = (n.xMm + next.xMm) / 2;
              const midY = (n.yMm + next.yMm) / 2;
              return (
                <g
                  key={`mid-${n.id}`}
                  role="button"
                  tabIndex={0}
                  aria-label={`Add edge point after ${n.label}`}
                  onClick={() => handleInsertOnEdge(i)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault(); handleInsertOnEdge(i);
                    }
                  }}
                  className="cursor-pointer"
                  style={{ opacity: 0.5 }}
                >
                  <circle cx={midX} cy={midY} r={viewW / 180} fill="#0f172a" stroke="#64748b" strokeWidth={viewW / 500} />
                  <line x1={midX - viewW / 300} y1={midY} x2={midX + viewW / 300} y2={midY} stroke="#94a3b8" strokeWidth={viewW / 600} />
                  <line x1={midX} y1={midY - viewW / 300} x2={midX} y2={midY + viewW / 300} stroke="#94a3b8" strokeWidth={viewW / 600} />
                </g>
              );
            })}

            {/* Draggable control point handles */}
            {nodes.map((n) => (
              <circle
                key={n.id}
                role="button"
                tabIndex={0}
                aria-label={`Move ${n.label}, x ${n.xMm.toFixed(1)} mm, y ${n.yMm.toFixed(1)} mm`}
                cx={n.xMm}
                cy={n.yMm}
                r={viewW / 130}
                fill={n.id === selectedId ? '#f59e0b' : '#22d3ee'}
                stroke="#0f172a"
                strokeWidth={viewW / 400}
                className="cursor-grab active:cursor-grabbing"
                onFocus={() => setSelectedId(n.id)}
                onKeyDown={(event) => handlePointKeyDown(event, n)}
                onPointerDown={(e) => handlePointerDownNode(e, n.id)}
              />
            ))}
            </g>
          </svg>
        </div>

        <details className="border-t border-slate-800 bg-slate-950/60 px-4 py-2.5 text-xs text-slate-300">
          <summary className="flex cursor-pointer items-center gap-2 font-semibold text-cyan-200">
            <Info className="h-3.5 w-3.5 flex-shrink-0" /> Editing tips and keyboard controls
          </summary>
          <p className="mt-2 leading-relaxed">
            The amber and cyan dashed boxes show where the wing and tail attach — keep your shape clear of them,
            or adjust the slot position/mount type in the Fuselage tab. Changes here update the 3D model, physics,
            and 2D cut pattern instantly. Small hollow dots on each edge add a new point.
            Keyboard: Tab to a point, use arrow keys to move it 1 mm (Shift for 5 mm), or press Enter on a hollow dot to add a point.
          </p>
        </details>
      </div>
    </div>
  );
};
