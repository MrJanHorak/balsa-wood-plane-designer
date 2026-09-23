'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { BookmarkPlus, ChevronDown, History, Redo2, Undo2, Trash2 } from 'lucide-react';
import { NamedDesignVersion } from '@/design/versions';

interface Props {
  canUndo: boolean;
  canRedo: boolean;
  versions: NamedDesignVersion[];
  onUndo: () => void;
  onRedo: () => void;
  onCreateVersion: (name: string) => boolean;
  onRestoreVersion: (version: NamedDesignVersion) => void;
  onDeleteVersion: (id: string) => void;
}

export function DesignHistoryControls({
  canUndo, canRedo, versions, onUndo, onRedo, onCreateVersion, onRestoreVersion, onDeleteVersion,
}: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [panelPosition, setPanelPosition] = useState({ top: 0, right: 8 });
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node) && !panelRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const button = 'p-1.5 rounded text-slate-300 hover:bg-slate-800 hover:text-white disabled:opacity-35 disabled:cursor-not-allowed';

  const togglePanel = () => {
    if (!open && rootRef.current) {
      const rect = rootRef.current.getBoundingClientRect();
      const panelWidth = Math.min(368, window.innerWidth - 16);
      const left = Math.max(8, Math.min(rect.left, window.innerWidth - panelWidth - 8));
      setPanelPosition({
        top: rect.bottom + 8,
        right: window.innerWidth - left - panelWidth,
      });
    }
    setOpen((value) => !value);
    setConfirmDelete(null);
  };

  return (
    <div ref={rootRef} className="relative flex items-center gap-1 shrink-0">
      <div className="flex items-center rounded-lg border border-slate-800 bg-slate-950/80 p-1">
        <button type="button" onClick={onUndo} disabled={!canUndo} className={button} title="Undo (Ctrl/Cmd+Z)" aria-label="Undo design change">
          <Undo2 className="h-4 w-4" />
        </button>
        <button type="button" onClick={onRedo} disabled={!canRedo} className={button} title="Redo (Ctrl/Cmd+Shift+Z or Ctrl+Y)" aria-label="Redo design change">
          <Redo2 className="h-4 w-4" />
        </button>
      </div>
      <button type="button" aria-expanded={open} aria-haspopup="dialog" onClick={togglePanel}
        className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-2 text-xs font-semibold text-slate-100 hover:bg-slate-700">
        <History className="h-4 w-4 text-amber-300" />
        <span className="hidden xl:inline">Versions</span>
        {versions.length > 0 && <span className="rounded bg-slate-700 px-1 text-[10px]">{versions.length}</span>}
        <ChevronDown className="h-3 w-3 text-slate-400" />
      </button>
      {open && createPortal(
        <div ref={panelRef} role="dialog" aria-label="Named design versions" style={panelPosition} className="fixed z-[100] w-[min(23rem,calc(100vw-1rem))] overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-2xl shadow-black/60">
          <div className="border-b border-slate-700 px-4 py-3">
            <h2 className="text-sm font-bold text-slate-100">Design versions</h2>
            <p className="mt-0.5 text-xs leading-relaxed text-slate-400">Save a checkpoint before a build or shape experiment. Restore any saved design from this browser.</p>
          </div>
          <form className="flex gap-2 border-b border-slate-800 p-3" onSubmit={(event) => {
            event.preventDefault();
            if (!name.trim()) return;
            if (onCreateVersion(name)) setName('');
          }}>
            <input value={name} onChange={(event) => setName(event.target.value)} maxLength={80}
              aria-label="Version name" placeholder="e.g. First flight, wider tail" className="min-w-0 flex-1 rounded-md border border-slate-600 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:border-amber-400 focus:outline-none" />
            <button type="submit" disabled={!name.trim()} className="flex items-center gap-1 rounded-md bg-amber-500 px-2.5 py-1.5 text-xs font-bold text-slate-950 hover:bg-amber-400 disabled:opacity-40">
              <BookmarkPlus className="h-3.5 w-3.5" /> Save
            </button>
          </form>
          <div className="max-h-72 overflow-y-auto p-2">
            {versions.length === 0 ? (
              <p className="px-2 py-5 text-center text-xs text-slate-400">No named versions yet. Save one before your next experiment.</p>
            ) : versions.map((version) => (
              <div key={version.id} className="flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-slate-800/70">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-slate-100" title={version.name}>{version.name}</p>
                  <p className="truncate text-[10px] text-slate-400" title={version.document.metadata.name}>{version.document.metadata.name} · v{version.document.version} · {new Date(version.createdAt).toLocaleString()}</p>
                </div>
                <button type="button" onClick={() => { onRestoreVersion(version); setOpen(false); }} className="rounded border border-slate-600 px-2 py-1 text-[11px] text-slate-200 hover:bg-slate-700">Restore</button>
                <button type="button" onClick={() => {
                  if (confirmDelete === version.id) { onDeleteVersion(version.id); setConfirmDelete(null); }
                  else setConfirmDelete(version.id);
                }} className={`rounded p-1.5 text-xs ${confirmDelete === version.id ? 'bg-red-900 text-red-100' : 'text-slate-400 hover:bg-slate-700 hover:text-red-300'}`}
                  title={confirmDelete === version.id ? 'Click again to delete this version' : `Delete ${version.name}`} aria-label={confirmDelete === version.id ? `Confirm delete ${version.name}` : `Delete ${version.name}`}>
                  {confirmDelete === version.id ? 'Delete?' : <Trash2 className="h-3.5 w-3.5" />}
                </button>
              </div>
            ))}
          </div>
        </div>, document.body
      )}
    </div>
  );
}
