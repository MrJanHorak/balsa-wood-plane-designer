import { describe, expect, it } from 'vitest';
import { DEFAULT_GLIDER } from '@/constants/presets';
import { createPlaneDesignDocument, updatePlaneDesignGeometry } from '@/design/document';
import { createDesignHistory, designHistoryReducer } from '@/design/history';

const original = createPlaneDesignDocument(DEFAULT_GLIDER, { id: 'history-test' });
const withSpan = (spanMm: number) => updatePlaneDesignGeometry(original, {
  ...original.geometry,
  wing: { ...original.geometry.wing, spanMm },
});

describe('app-wide design history', () => {
  it('groups many live slider changes into one undo step', () => {
    let state = createDesignHistory(original);
    state = designHistoryReducer(state, { type: 'beginGroup' });
    state = designHistoryReducer(state, { type: 'change', document: withSpan(300) });
    state = designHistoryReducer(state, { type: 'change', document: withSpan(320) });
    state = designHistoryReducer(state, { type: 'endGroup' });
    expect(state.past).toHaveLength(1);
    expect(state.present.geometry.wing.spanMm).toBe(320);
    state = designHistoryReducer(state, { type: 'undo' });
    expect(state.present.geometry).toEqual(original.geometry);
    state = designHistoryReducer(state, { type: 'redo' });
    expect(state.present.geometry.wing.spanMm).toBe(320);
  });

  it('keeps imports and restores undoable, and drops redo after a new edit', () => {
    const imported = createPlaneDesignDocument({ ...DEFAULT_GLIDER, name: 'Imported' }, { id: 'other-design' });
    let state = designHistoryReducer(createDesignHistory(original), { type: 'change', document: imported });
    state = designHistoryReducer(state, { type: 'undo' });
    expect(state.present.id).toBe(original.id);
    state = designHistoryReducer(state, { type: 'change', document: withSpan(400) });
    expect(state.future).toHaveLength(0);
    expect(designHistoryReducer(state, { type: 'redo' }).present.geometry.wing.spanMm).toBe(400);
  });

  it('ignores empty groups and unchanged geometry', () => {
    let state = createDesignHistory(original);
    state = designHistoryReducer(state, { type: 'beginGroup' });
    state = designHistoryReducer(state, { type: 'change', document: withSpan(original.geometry.wing.spanMm) });
    state = designHistoryReducer(state, { type: 'endGroup' });
    expect(state.past).toHaveLength(0);
  });

  it('rehydrates a saved design without creating an undo entry', () => {
    const saved = withSpan(420);
    const state = designHistoryReducer(createDesignHistory(original), { type: 'hydrate', document: saved });
    expect(state.present).toEqual(saved);
    expect(state.past).toHaveLength(0);
  });

  it('does not spend an undo step when only numbering a named version', () => {
    const stamped = { ...original, version: 2 };
    const state = designHistoryReducer(createDesignHistory(original), { type: 'stampVersion', document: stamped });
    expect(state.present.version).toBe(2);
    expect(state.past).toHaveLength(0);
  });
});
