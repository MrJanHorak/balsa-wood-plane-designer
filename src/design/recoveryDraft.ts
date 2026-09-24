import { PlaneDesignDocument } from '@/types/design-document';
import { isPlaneDesignDocument } from './document';

export const RECOVERY_DRAFT_KEY = 'balsaplanedesigner.recovery-draft.v1';

export interface RecoveryDraft {
  savedAt: string;
  document: PlaneDesignDocument;
}

/** Ignore metadata timestamps when deciding whether a draft contains work
 * missing from the user's explicit browser save. */
export function designContentSignature(document: PlaneDesignDocument): string {
  return JSON.stringify({
    id: document.id,
    version: document.version,
    geometry: document.geometry,
    flightTests: document.flightTests ?? [],
  });
}

export function needsDraftRecovery(draft: RecoveryDraft, saved: PlaneDesignDocument | null): boolean {
  return !saved || designContentSignature(draft.document) !== designContentSignature(saved);
}

export function isUntouchedStarter(document: PlaneDesignDocument, starter: PlaneDesignDocument['geometry']): boolean {
  return document.version === 1 && (document.flightTests?.length ?? 0) === 0 &&
    JSON.stringify(document.geometry) === JSON.stringify(starter);
}

export function loadRecoveryDraft(storage: Pick<Storage, 'getItem'> = window.localStorage): RecoveryDraft | null {
  const raw = storage.getItem(RECOVERY_DRAFT_KEY);
  if (!raw) return null;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new Error('The recovery draft in this browser could not be read. It has been left untouched.');
  }
  if (!value || typeof value !== 'object' || !('savedAt' in value) || !('document' in value) ||
      typeof value.savedAt !== 'string' || !Number.isFinite(Date.parse(value.savedAt)) ||
      !isPlaneDesignDocument(value.document)) {
    throw new Error('The recovery draft in this browser is invalid. It has been left untouched.');
  }
  return value as RecoveryDraft;
}

export function saveRecoveryDraft(
  document: PlaneDesignDocument,
  storage: Pick<Storage, 'setItem'> = window.localStorage,
  savedAt = new Date().toISOString(),
): void {
  storage.setItem(RECOVERY_DRAFT_KEY, JSON.stringify({ savedAt, document }));
}

export function clearRecoveryDraft(storage: Pick<Storage, 'removeItem'> = window.localStorage): void {
  storage.removeItem(RECOVERY_DRAFT_KEY);
}
