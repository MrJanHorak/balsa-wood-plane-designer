import { GliderDesign } from '@/types/glider';

export const CURRENT_DESIGN_SCHEMA_VERSION = 1 as const;

export interface DesignMetadata {
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface DesignVersionRef {
  designId: string;
  version: number;
}

export interface DesignProvenance {
  forkedFrom?: DesignVersionRef;
}

/**
 * Persistent envelope around the current engineering payload.
 *
 * GliderDesign remains the geometry/physics payload for now. Keeping it inside
 * this envelope lets us add freeform geometry, builds, simulation results, and
 * social lineage later without changing the persistence contract.
 */
export interface PlaneDesignDocument {
  id: string;
  schemaVersion: typeof CURRENT_DESIGN_SCHEMA_VERSION;
  version: number;
  metadata: DesignMetadata;
  geometry: GliderDesign;
  provenance?: DesignProvenance;
}
