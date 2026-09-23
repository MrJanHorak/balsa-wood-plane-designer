import { describe, expect, it } from 'vitest';
import { DEFAULT_GLIDER, GLIDER_PRESETS } from '@/constants/presets';
import {
  createPlaneDesignDocument,
  deserializePlaneDesign,
  forkPlaneDesignDocument,
  isPlaneDesignDocument,
  serializePlaneDesign,
  updatePlaneDesignGeometry,
} from '@/design/document';

function createTestDesign() {
  return createPlaneDesignDocument(DEFAULT_GLIDER, {
    id: 'test-design',
    metadata: {
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  });
}

describe('PlaneDesignDocument', () => {
  it.each(Object.values(GLIDER_PRESETS))('accepts the $name preset and legacy optional tail fields', preset => {
    const doc = createPlaneDesignDocument(preset);
    delete doc.geometry.horizontalStabilizer.planformType;
    delete doc.geometry.verticalStabilizer.profileType;
    expect(isPlaneDesignDocument(doc)).toBe(true);
  });

  it.each([
    ['material', undefined], ['wing', []], ['fuselage', {}],
    ['wing', { ...DEFAULT_GLIDER.wing, spanMm: 0 }],
    ['wing', { ...DEFAULT_GLIDER.wing, sweepDeg: Infinity }],
    ['wing', { ...DEFAULT_GLIDER.wing, camberPercent: '4' }],
    ['material', { ...DEFAULT_GLIDER.material, densityKgM3: -1 }],
    ['fuselage', { ...DEFAULT_GLIDER.fuselage, wingSlot: null }],
    ['fuselage', { ...DEFAULT_GLIDER.fuselage, profileStyle: 'custom', customNodes: [null] }],
    ['horizontalStabilizer', { ...DEFAULT_GLIDER.horizontalStabilizer, planformType: 'unknown' }],
    ['verticalStabilizer', { ...DEFAULT_GLIDER.verticalStabilizer, heightMm: NaN }],
  ])('rejects malformed %s before geometry calculations', (key, value) => {
    const doc = createTestDesign();
    Object.assign(doc.geometry, { [key as string]: value });
    expect(isPlaneDesignDocument(doc)).toBe(false);
    expect(() => deserializePlaneDesign(JSON.stringify(doc))).toThrow(/invalid/);
  });
  it('wraps the existing GliderDesign without changing it', () => {
    const document = createTestDesign();

    expect(document.schemaVersion).toBe(1);
    expect(document.version).toBe(1);
    expect(document.id).toBe('test-design');
    expect(document.geometry).toEqual(DEFAULT_GLIDER);
    expect(document.metadata.name).toBe(DEFAULT_GLIDER.name);
  });

  it('round-trips through JSON serialization', () => {
    const document = createTestDesign();

    expect(deserializePlaneDesign(serializePlaneDesign(document))).toEqual(document);
  });

  it('rejects unsupported schema versions', () => {
    const document = JSON.parse(serializePlaneDesign(createTestDesign()));
    document.schemaVersion = 99;

    expect(() => deserializePlaneDesign(JSON.stringify(document))).toThrow(/schema version 1/i);
  });

  it('detects valid and invalid documents', () => {
    const document = createTestDesign();

    expect(isPlaneDesignDocument(document)).toBe(true);
    expect(isPlaneDesignDocument({})).toBe(false);
  });

  it('creates a remix with provenance', () => {
    const source = createTestDesign();
    const remix = forkPlaneDesignDocument(source);

    expect(remix.id).not.toBe(source.id);
    expect(remix.version).toBe(1);
    expect(remix.metadata.name).toBe(`${source.metadata.name} Remix`);
    expect(remix.provenance?.forkedFrom).toEqual({
      designId: source.id,
      version: source.version,
    });
  });

  it('updates the geometry while preserving identity and provenance', () => {
    const source = createTestDesign();
    const remix = forkPlaneDesignDocument(source);
    const changedGeometry = {
      ...remix.geometry,
      name: 'My Remix',
      description: 'Changed geometry',
    };

    const updated = updatePlaneDesignGeometry(remix, changedGeometry);

    expect(updated.id).toBe(remix.id);
    expect(updated.provenance).toEqual(remix.provenance);
    expect(updated.geometry).toEqual(changedGeometry);
    expect(updated.metadata.name).toBe('My Remix');
    expect(new Date(updated.metadata.updatedAt).getTime()).toBeGreaterThanOrEqual(
      new Date(remix.metadata.updatedAt).getTime(),
    );
  });
});
