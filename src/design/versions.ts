import { PlaneDesignDocument } from '@/types/design-document';
import { isPlaneDesignDocument } from '@/design/document';

export const DESIGN_VERSIONS_KEY = 'balsaplanedesigner.named-versions.v1';

export interface NamedDesignVersion {
  id: string;
  name: string;
  createdAt: string;
  document: PlaneDesignDocument;
}

export function createNamedVersion(
  document: PlaneDesignDocument,
  name: string,
  existing: NamedDesignVersion[],
): NamedDesignVersion {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Enter a name for this version.');
  const nextVersion = Math.max(
    document.version,
    ...existing.filter((item) => item.document.id === document.id).map((item) => item.document.version),
  ) + 1;
  return {
    id: globalThis.crypto?.randomUUID?.() ?? `version-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name: trimmed.slice(0, 80),
    createdAt: new Date().toISOString(),
    document: structuredClone({ ...document, version: nextVersion }),
  };
}

export function loadNamedVersions(): NamedDesignVersion[] {
  if (typeof window === 'undefined') return [];
  const raw = window.localStorage.getItem(DESIGN_VERSIONS_KEY);
  if (!raw) return [];
  const value: unknown = JSON.parse(raw);
  if (!Array.isArray(value) || !value.every((item) =>
    item && typeof item === 'object' &&
    typeof item.id === 'string' &&
    typeof item.name === 'string' &&
    typeof item.createdAt === 'string' &&
    isPlaneDesignDocument(item.document)
  )) {
    throw new Error('Saved versions in this browser could not be read.');
  }
  return value as NamedDesignVersion[];
}

export function saveNamedVersions(versions: NamedDesignVersion[]): void {
  if (typeof window === 'undefined') throw new Error('Versions are only available in the browser.');
  window.localStorage.setItem(DESIGN_VERSIONS_KEY, JSON.stringify(versions));
}
