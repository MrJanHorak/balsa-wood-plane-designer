import { FlightTestRecord, PlaneDesignDocument } from '@/types/design-document';

export type NewFlightTest = Omit<FlightTestRecord, 'id' | 'createdAt'>;

export function createFlightTest(input: NewFlightTest): FlightTestRecord {
  if (!input.label.trim()) throw new Error('Give this build or flight test a name.');
  const fields: Array<[string, number | undefined, boolean]> = [
    ['mass', input.measuredMassGrams, false],
    ['CG', input.measuredCgXMm, true],
    ['nose ballast', input.noseBallastGrams, true],
    ['wing dihedral', input.asBuiltDihedralDeg, true],
    ['launch height', input.launchHeightM, false],
    ['distance', input.distanceM, true],
  ];
  for (const [name, value, allowZero] of fields) {
    if (value !== undefined && (!Number.isFinite(value) || (allowZero ? value < 0 : value <= 0))) {
      throw new Error(`Enter a valid ${name} measurement.`);
    }
  }
  if (input.asBuiltDihedralDeg !== undefined && input.asBuiltDihedralDeg > 45) {
    throw new Error('Wing dihedral must be between 0° and 45° per side.');
  }
  if (input.distanceM !== undefined && input.launchHeightM === undefined) {
    throw new Error('Add the launch height when recording a flight distance.');
  }
  if (!input.notes.trim() && input.pitch === 'unknown' && input.turn === 'unknown' &&
    (!input.wingCamberState || input.wingCamberState === 'unknown') &&
    fields.every(([, value]) => value === undefined)) {
    throw new Error('Enter at least one measurement or observation.');
  }
  return {
    ...input,
    id: globalThis.crypto?.randomUUID?.() ?? `flight-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    createdAt: new Date().toISOString(),
    label: input.label.trim().slice(0, 100),
    notes: input.notes.trim().slice(0, 2000),
  };
}

export function addFlightTest(document: PlaneDesignDocument, test: FlightTestRecord): PlaneDesignDocument {
  return {
    ...document,
    flightTests: [...(document.flightTests ?? []), structuredClone(test)],
    metadata: { ...document.metadata, updatedAt: new Date().toISOString() },
  };
}

export function removeFlightTest(document: PlaneDesignDocument, id: string): PlaneDesignDocument {
  return {
    ...document,
    flightTests: (document.flightTests ?? []).filter((test) => test.id !== id),
    metadata: { ...document.metadata, updatedAt: new Date().toISOString() },
  };
}

/** A hand launch is transient: this quotient is descriptive, not steady-flight L/D. */
export function observedDistancePerHeight(test: FlightTestRecord): number | null {
  return test.distanceM !== undefined && test.launchHeightM !== undefined && test.launchHeightM > 0
    ? test.distanceM / test.launchHeightM : null;
}
