'use client';

import { useEffect, useRef } from 'react';
import { RecoveryDraft } from '@/design/recoveryDraft';

interface Props {
  draft: RecoveryDraft | null;
  hasSavedDesign: boolean;
  error?: string;
  onRestore: () => void;
  onDiscard: () => void;
}

export function RecoveryDraftDialog({ draft, hasSavedDesign, error, onRestore, onDiscard }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<HTMLButtonElement>(null);
  const discardRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    (draft ? restoreRef : discardRef).current?.focus();
    return () => previous?.focus();
  }, [draft]);

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm">
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="recovery-title" aria-describedby="recovery-description"
        className="w-full max-w-md rounded-xl border border-cyan-700/70 bg-slate-900 p-5 text-slate-100 shadow-2xl"
        onKeyDown={(event) => {
          if (event.key !== 'Tab') return;
          const buttons = dialogRef.current?.querySelectorAll<HTMLButtonElement>('button');
          if (!buttons?.length) return;
          if (event.shiftKey && document.activeElement === buttons[0]) { event.preventDefault(); buttons[buttons.length - 1].focus(); }
          else if (!event.shiftKey && document.activeElement === buttons[buttons.length - 1]) { event.preventDefault(); buttons[0].focus(); }
        }}>
        <h2 id="recovery-title" className="text-lg font-bold">{draft ? 'Recover unsaved design changes?' : 'Recovery copy needs attention'}</h2>
        <p id="recovery-description" className="mt-2 text-sm leading-relaxed text-slate-300">
          {draft
            ? `A recovery copy of “${draft.document.metadata.name}” was kept on this device ${new Date(draft.savedAt).toLocaleString()}. It differs from ${hasSavedDesign ? 'your last browser save' : 'the starting preset'}.`
            : error}
        </p>
        {draft && error && <p role="alert" className="mt-2 text-sm text-amber-300">{error}</p>}
        {draft && <p className="mt-2 text-xs leading-relaxed text-slate-400">Restoring does not overwrite your last explicit save or named versions. You can save it after reviewing it.</p>}
        <div className="mt-5 flex flex-wrap gap-2">
          {draft && <button ref={restoreRef} type="button" onClick={onRestore}
            className="min-h-10 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400">
            Restore unsaved changes
          </button>}
          <button ref={discardRef} type="button" onClick={onDiscard}
            className="min-h-10 rounded-lg border border-slate-600 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-800">
            {draft ? `Discard draft and ${hasSavedDesign ? 'open saved design' : 'start from preset'}` : 'Discard unreadable copy'}
          </button>
        </div>
      </div>
    </div>
  );
}
