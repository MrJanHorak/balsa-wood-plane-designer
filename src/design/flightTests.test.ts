import { describe, expect, it } from 'vitest';
import { DEFAULT_GLIDER } from '@/constants/presets';
import { createPlaneDesignDocument, deserializePlaneDesign, serializePlaneDesign } from '@/design/document';
import { addFlightTest, createFlightTest, observedDistancePerHeight, removeFlightTest } from '@/design/flightTests';
import { createDesignHistory, designHistoryReducer } from '@/design/history';

const observation = {
  label: 'First hand launch',
  launchHeightM: 1.77,
  distanceM: 4.29,
  pitch: 'suspected_stall' as const,
  turn: 'right' as const,
  notes: 'Distance is approximate; nose ballast was changed between trials.',
};

describe('physical build and flight records', () => {
  it('keeps observations with the design through JSON and undo', () => {
    const original = createPlaneDesignDocument(DEFAULT_GLIDER);
    const test = createFlightTest(observation);
    const updated = addFlightTest(original, test);
    expect(updated.geometry).toEqual(original.geometry);
    expect(observedDistancePerHeight(test)).toBeCloseTo(4.29 / 1.77, 5);
    expect(deserializePlaneDesign(serializePlaneDesign(updated)).flightTests).toEqual([test]);

    const changed = designHistoryReducer(createDesignHistory(original), { type: 'change', document: updated });
    expect(designHistoryReducer(changed, { type: 'undo' }).present.flightTests).toBeUndefined();
    expect(removeFlightTest(updated, test.id).flightTests).toEqual([]);
  });

  it('rejects unusable measurements and malformed imported records', () => {
    expect(() => createFlightTest({ ...observation, launchHeightM: undefined })).toThrow(/launch height/i);
    expect(() => createFlightTest({ ...observation, measuredMassGrams: -1 })).toThrow(/mass/i);
    const document = createPlaneDesignDocument(DEFAULT_GLIDER);
    document.flightTests = [{ ...createFlightTest(observation), distanceM: Infinity }];
    expect(() => deserializePlaneDesign(serializePlaneDesign(document))).toThrow(/invalid/i);
  });
});
