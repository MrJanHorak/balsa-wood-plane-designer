import { describe, expect, it } from 'vitest';
import { DEFAULT_GLIDER } from '@/constants/presets';
import { createPlaneDesignDocument } from '@/design/document';
import { createNamedVersion } from '@/design/versions';

describe('named design versions', () => {
  it('creates immutable, numbered snapshots and handles restoring an older revision', () => {
    const design = createPlaneDesignDocument(DEFAULT_GLIDER, { id: 'design-a' });
    const first = createNamedVersion(design, ' Before printing ', []);
    design.geometry.wing.spanMm += 25;
    const second = createNamedVersion(first.document, 'Wider tail', [first]);
    const third = createNamedVersion(first.document, 'Revised fit', [first, second]);
    expect(first.name).toBe('Before printing');
    expect(first.document.geometry.wing.spanMm).toBe(DEFAULT_GLIDER.wing.spanMm);
    expect([first.document.version, second.document.version, third.document.version]).toEqual([2, 3, 4]);
    expect(() => createNamedVersion(design, '  ', [])).toThrow(/name/i);
  });
});
