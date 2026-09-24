import { describe, expect, it } from 'vitest';
import { DEFAULT_GLIDER } from '@/constants/presets';
import { createPlaneDesignDocument } from './document';
import {
  RECOVERY_DRAFT_KEY, clearRecoveryDraft, designContentSignature, isUntouchedStarter,
  loadRecoveryDraft, needsDraftRecovery, saveRecoveryDraft,
} from './recoveryDraft';

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
  };
}

describe('local recovery draft', () => {
  it('round-trips a changed design without replacing the explicit browser save', () => {
    const storage = memoryStorage();
    const saved = createPlaneDesignDocument(DEFAULT_GLIDER);
    const changed = structuredClone(saved);
    changed.geometry.wing.spanMm += 20;
    saveRecoveryDraft(changed, storage, '2026-09-24T12:00:00.000Z');
    const draft = loadRecoveryDraft(storage);
    expect(draft?.savedAt).toBe('2026-09-24T12:00:00.000Z');
    expect(draft?.document).toEqual(changed);
    expect(needsDraftRecovery(draft!, saved)).toBe(true);
    clearRecoveryDraft(storage);
    expect(loadRecoveryDraft(storage)).toBeNull();
  });

  it('does not offer recovery for timestamp-only changes or an untouched starter', () => {
    const saved = createPlaneDesignDocument(DEFAULT_GLIDER);
    const draftDocument = structuredClone(saved);
    draftDocument.metadata.updatedAt = '2026-09-24T12:00:00.000Z';
    expect(designContentSignature(draftDocument)).toBe(designContentSignature(saved));
    expect(needsDraftRecovery({ savedAt: draftDocument.metadata.updatedAt, document: draftDocument }, saved)).toBe(false);
    expect(isUntouchedStarter(saved, DEFAULT_GLIDER)).toBe(true);
    draftDocument.geometry.wing.spanMm += 1;
    expect(isUntouchedStarter(draftDocument, DEFAULT_GLIDER)).toBe(false);
  });

  it('retains an unreadable draft instead of overwriting it during recovery', () => {
    const storage = memoryStorage();
    storage.setItem(RECOVERY_DRAFT_KEY, '{broken');
    expect(() => loadRecoveryDraft(storage)).toThrow(/left untouched/);
    expect(storage.getItem(RECOVERY_DRAFT_KEY)).toBe('{broken');
    storage.setItem(RECOVERY_DRAFT_KEY, JSON.stringify({ savedAt: 'bad', document: {} }));
    expect(() => loadRecoveryDraft(storage)).toThrow(/invalid/);
  });
});
