'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Download, FolderOpen, Save, Upload } from 'lucide-react';

interface Props {
  onSaveLocal: () => void;
  onLoadLocal: () => void;
  onExport: () => void;
  onImport: () => void;
}

export function FileActionsMenu({ onSaveLocal, onLoadLocal, onExport, onImport }: Props) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 8 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const firstActionRef = useRef<HTMLButtonElement>(null);

  const placePanel = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const availableWidth = document.documentElement.clientWidth;
    const width = Math.min(352, availableWidth - 16);
    setPosition({ top: rect.bottom + 8, left: Math.max(8, Math.min(rect.left, availableWidth - width - 8)) });
  }, []);

  useEffect(() => {
    if (open) firstActionRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!triggerRef.current?.contains(event.target as Node) && !panelRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', placePanel);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', placePanel);
    };
  }, [open, placePanel]);

  const toggle = () => {
    if (!open) placePanel();
    setOpen(value => !value);
  };

  const run = (action: () => void) => {
    setOpen(false);
    triggerRef.current?.focus();
    action();
  };

  const actions = [
    { label: 'Save in this browser', description: 'Replace the current-design save on this device.', icon: Save, action: onSaveLocal },
    { label: 'Load browser save', description: 'Restore that saved design. You can undo the change.', icon: FolderOpen, action: onLoadLocal },
    { label: 'Export design JSON', description: 'Download a portable copy, including build and flight tests.', icon: Download, action: onExport },
    { label: 'Import design JSON', description: 'Open a design file from this device.', icon: Upload, action: onImport },
  ];

  return <>
    <button ref={triggerRef} type="button" onClick={toggle} aria-expanded={open} aria-haspopup="dialog" aria-controls={open ? 'file-actions-panel' : undefined}
      className="flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-950/80 px-2.5 py-1.5 text-xs font-semibold text-slate-100 hover:bg-slate-800">
      <FolderOpen className="h-4 w-4" /> File <ChevronDown className={`h-3 w-3 text-slate-400 ${open ? 'rotate-180' : ''}`} />
    </button>
    {open && createPortal(
      <div ref={panelRef} id="file-actions-panel" role="dialog" aria-label="File actions" style={{ top: position.top, left: position.left, maxHeight: `calc(100dvh - ${position.top + 8}px)` }}
        className="fixed z-[100] w-[min(22rem,calc(100vw-2rem))] overflow-y-auto rounded-xl border border-slate-700 bg-slate-900 p-2 shadow-2xl shadow-black/60"
        onKeyDown={event => {
          if (event.key !== 'Tab') return;
          const buttons = panelRef.current?.querySelectorAll<HTMLButtonElement>('button');
          if (!buttons?.length) return;
          if (event.shiftKey && document.activeElement === buttons[0]) { event.preventDefault(); buttons[buttons.length - 1].focus(); }
          else if (!event.shiftKey && document.activeElement === buttons[buttons.length - 1]) { event.preventDefault(); buttons[0].focus(); }
        }}>
        {actions.map(({ label, description, icon: Icon, action }, index) =>
          <button key={label} ref={index === 0 ? firstActionRef : undefined} type="button" onClick={() => run(action)}
            className="flex w-full items-start gap-3 rounded-lg px-3 py-2 text-left text-slate-100 hover:bg-slate-800">
            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" />
            <span><span className="block text-sm font-semibold">{label}</span><span className="block text-xs leading-snug text-slate-300">{description}</span></span>
          </button>
        )}
      </div>, document.body)}
  </>;
}
