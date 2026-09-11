import { PlaneDesignDocument } from '@/types/design-document';
import { deserializePlaneDesign, serializePlaneDesign } from '@/design/document';

export const DESIGN_STORAGE_KEY = 'balsaplanedesigner.current-design.v1';

export function savePlaneDesignToLocalStorage(document: PlaneDesignDocument): void {
  if (typeof window === 'undefined') {
    throw new Error('Local design storage is only available in the browser.');
  }

  window.localStorage.setItem(DESIGN_STORAGE_KEY, serializePlaneDesign(document));
}

export function loadPlaneDesignFromLocalStorage(): PlaneDesignDocument | null {
  if (typeof window === 'undefined') return null;

  const serialized = window.localStorage.getItem(DESIGN_STORAGE_KEY);
  return serialized ? deserializePlaneDesign(serialized) : null;
}

export function downloadPlaneDesign(design: PlaneDesignDocument): void {
  if (typeof window === 'undefined') return;

  const blob = new Blob([serializePlaneDesign(design)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const anchor = window.document.createElement('a');

  anchor.href = url;
  anchor.download = `${slugify(design.metadata.name) || 'balsa-plane-design'}.balsa.json`;
  anchor.click();

  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
