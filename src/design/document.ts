import {
  CURRENT_DESIGN_SCHEMA_VERSION,
  PlaneDesignDocument,
  DesignMetadata,
  DesignProvenance,
} from '@/types/design-document';
import { GliderDesign } from '@/types/glider';

function createId(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  return `design-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

export function createPlaneDesignDocument(
  geometry: GliderDesign,
  options: {
    id?: string;
    version?: number;
    metadata?: Partial<DesignMetadata>;
    provenance?: DesignProvenance;
  } = {},
): PlaneDesignDocument {
  const now = nowIso();
  const metadata = options.metadata ?? {};

  return {
    id: options.id ?? createId(),
    schemaVersion: CURRENT_DESIGN_SCHEMA_VERSION,
    version: options.version ?? 1,
    metadata: {
      name: metadata.name ?? geometry.name,
      description: metadata.description ?? geometry.description,
      createdAt: metadata.createdAt ?? now,
      updatedAt: metadata.updatedAt ?? now,
    },
    geometry: structuredClone(geometry),
    provenance: options.provenance,
  };
}

export function updatePlaneDesignGeometry(
  document: PlaneDesignDocument,
  geometry: GliderDesign,
): PlaneDesignDocument {
  return {
    ...document,
    geometry: structuredClone(geometry),
    metadata: {
      ...document.metadata,
      name: geometry.name,
      description: geometry.description,
      updatedAt: nowIso(),
    },
  };
}

export function forkPlaneDesignDocument(
  source: PlaneDesignDocument,
  geometry: GliderDesign = source.geometry,
): PlaneDesignDocument {
  const forkedGeometry = structuredClone(geometry);
  const baseName = forkedGeometry.name.trim() || source.metadata.name;

  return createPlaneDesignDocument(forkedGeometry, {
    version: 1,
    metadata: {
      name: baseName.endsWith(' Remix') ? baseName : `${baseName} Remix`,
      description: forkedGeometry.description,
    },
    provenance: {
      forkedFrom: {
        designId: source.id,
        version: source.version,
      },
    },
  });
}

export function serializePlaneDesign(document: PlaneDesignDocument): string {
  return JSON.stringify(document, null, 2);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isPlaneDesignDocument(value: unknown): value is PlaneDesignDocument {
  if (!isPlainObject(value)) return false;
  if (value.schemaVersion !== CURRENT_DESIGN_SCHEMA_VERSION) return false;
  if (typeof value.id !== 'string' || value.id.length === 0) return false;
  if (typeof value.version !== 'number' || !Number.isInteger(value.version) || value.version < 1) return false;
  if (!isPlainObject(value.metadata) || !isPlainObject(value.geometry)) return false;

  const metadata = value.metadata;
  if (
    typeof metadata.name !== 'string' ||
    typeof metadata.description !== 'string' ||
    typeof metadata.createdAt !== 'string' ||
    typeof metadata.updatedAt !== 'string'
  ) {
    return false;
  }

  return (
    typeof value.geometry.id === 'string' &&
    typeof value.geometry.name === 'string' &&
    typeof value.geometry.fuselage === 'object' &&
    value.geometry.fuselage !== null &&
    typeof value.geometry.wing === 'object' &&
    value.geometry.wing !== null &&
    typeof value.geometry.horizontalStabilizer === 'object' &&
    value.geometry.horizontalStabilizer !== null &&
    typeof value.geometry.verticalStabilizer === 'object' &&
    value.geometry.verticalStabilizer !== null
  );
}

export function deserializePlaneDesign(serialized: string): PlaneDesignDocument {
  let parsed: unknown;

  try {
    parsed = JSON.parse(serialized);
  } catch {
    throw new Error('The selected file is not valid JSON.');
  }

  if (!isPlaneDesignDocument(parsed)) {
    throw new Error(
      `Unsupported or invalid BalsaPlaneDesigner file. Expected schema version ${CURRENT_DESIGN_SCHEMA_VERSION}.`,
    );
  }

  return structuredClone(parsed);
}
