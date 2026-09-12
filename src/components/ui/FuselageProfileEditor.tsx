'use client';

import React, { useRef, useState, useCallback } from 'react';
import { GliderDesign, FuselageNode } from '@/types/glider';
import { getFuselageProfilePoints } from '@/physics/massBalance';
import { X, Trash2, RotateCcw, Info } from 'lucide-react';

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
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  const commit = useCallback(
    (nextNodes: FuselageNode[]) => {
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
    setSelectedId(id);
    setDragging(true);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging || !selectedId) return;
    const p = screenToSvgPoint(e.clientX, e.clientY);
    if (!p) return;
    const nextNodes = nodes.map((n) => (n.id === selectedId ? { ...n, xMm: p.x, yMm: p.y } : n));
    setNodes(nextNodes);
  };

  const handlePointerUp = () => {
    if (dragging) {
      ensureCommitted(nodes);
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
    ensureCommitted(nextNodes);
    setSelectedId(midpoint.id);
  };

  const handleDeleteSelected = () => {
    if (!selectedId || nodes.length <= 3) return;
    const nextNodes = nodes.filter((n) => n.id !== selectedId);
    setSelectedId(null);
    ensureCommitted(nextNodes);
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

  const outlinePath =
    nodes.length > 0
      ? `M ${nodes[0].xMm} ${nodes[0].yMm} ` + nodes.slice(1).map((n) => `L ${n.xMm} ${n.yMm}`).join(' ') + ' Z'
      : '';

  const selectedNode = nodes.find((n) => n.id === selectedId) ?? null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-5xl h-[85vh] bg-slate-900 border border-slate-700 rounded-xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950/60">
          <div>
            <h2 className="text-sm font-bold text-slate-100">Custom Fuselage Shape Designer</h2>
            <p className="text-[11px] text-slate-400">
              Drag points to reshape the body. Click a point then use the buttons below to add or remove points.
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-800 bg-slate-900/60">
          <button
            onClick={handleDeleteSelected}
            disabled={!selectedNode || nodes.length <= 3}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded border border-slate-700 text-slate-300 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete Point
          </button>
          <span className="text-[11px] text-slate-500">
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
        <div className="flex-1 overflow-hidden bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px]">
          <svg
            ref={svgRef}
            viewBox={`${minX} ${minY} ${viewW} ${viewH}`}
            className="w-full h-full touch-none"
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          >
            {/* Wing & tail slot context overlays (read-only reference) */}
            <rect
              x={glider.fuselage.wingSlot.xPositionMm}
              y={glider.fuselage.wingSlot.yPositionMm - glider.fuselage.wingSlot.thicknessMm / 2}
              width={glider.fuselage.wingSlot.lengthMm}
              height={glider.fuselage.wingSlot.thicknessMm}
              fill="rgba(251, 191, 36, 0.15)"
              stroke="#fbbf24"
              strokeWidth={viewW / 400}
              strokeDasharray={`${viewW / 100} ${viewW / 200}`}
            />
            <rect
              x={glider.fuselage.tailSlot.xPositionMm}
              y={glider.fuselage.tailSlot.yPositionMm - glider.fuselage.tailSlot.thicknessMm / 2}
              width={glider.fuselage.tailSlot.lengthMm}
              height={glider.fuselage.tailSlot.thicknessMm}
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
                  onClick={() => handleInsertOnEdge(i)}
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
                cx={n.xMm}
                cy={n.yMm}
                r={viewW / 130}
                fill={n.id === selectedId ? '#f59e0b' : '#22d3ee'}
                stroke="#0f172a"
                strokeWidth={viewW / 400}
                className="cursor-grab active:cursor-grabbing"
                onPointerDown={(e) => handlePointerDownNode(e, n.id)}
              />
            ))}
          </svg>
        </div>

        {/* Footer note */}
        <div className="flex items-start gap-2 px-4 py-2.5 border-t border-slate-800 bg-slate-950/60 text-[11px] text-slate-400">
          <Info className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0 mt-0.5" />
          <span>
            The amber and cyan dashed boxes show where the wing and tail attach — keep your shape clear of them,
            or adjust the slot position/mount type in the Fuselage tab. Changes here update the 3D model, physics,
            and 2D cut pattern instantly. Small hollow dots on each edge add a new point.
          </span>
        </div>
      </div>
    </div>
  );
};
