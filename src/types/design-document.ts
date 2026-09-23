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

export type FlightPitchObservation = 'unknown' | 'steady' | 'nose_down' | 'suspected_stall' | 'oscillating' | 'other';
export type FlightTurnObservation = 'unknown' | 'straight' | 'left' | 'right' | 'variable';

export interface FlightTestRecord {
  id: string;
  createdAt: string;
  label: string;
  measuredMassGrams?: number;
  measuredCgXMm?: number;
  noseBallastGrams?: number;
  asBuiltDihedralDeg?: number;
  wingCamberState?: 'unknown' | 'flat' | 'formed';
  launchHeightM?: number;
  distanceM?: number;
  pitch: FlightPitchObservation;
  turn: FlightTurnObservation;
  notes: string;
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
  /** Measured results belong to this particular build, not the generic preset. */
  flightTests?: FlightTestRecord[];
  provenance?: DesignProvenance;
}
