import { PlaneDesignDocument } from '@/types/design-document';

const MAX_UNDO_STEPS = 100;

export interface DesignHistory {
  past: PlaneDesignDocument[];
  present: PlaneDesignDocument;
  future: PlaneDesignDocument[];
  groupStart: PlaneDesignDocument | null;
}

export type HistoryAction =
  | { type: 'hydrate'; document: PlaneDesignDocument }
  | { type: 'stampVersion'; document: PlaneDesignDocument }
  | { type: 'change'; document: PlaneDesignDocument }
  | { type: 'beginGroup' }
  | { type: 'endGroup' }
  | { type: 'undo' }
  | { type: 'redo' };

export function createDesignHistory(document: PlaneDesignDocument): DesignHistory {
  return { past: [], present: document, future: [], groupStart: null };
}

function changed(a: PlaneDesignDocument, b: PlaneDesignDocument): boolean {
  return a.id !== b.id || a.version !== b.version ||
    JSON.stringify(a.geometry) !== JSON.stringify(b.geometry) ||
    JSON.stringify(a.flightTests ?? []) !== JSON.stringify(b.flightTests ?? []);
}

function appendPast(past: PlaneDesignDocument[], document: PlaneDesignDocument): PlaneDesignDocument[] {
  return [...past, document].slice(-MAX_UNDO_STEPS);
}

function finishGroup(state: DesignHistory): DesignHistory {
  if (!state.groupStart) return state;
  const wasChanged = changed(state.groupStart, state.present);
  return {
    ...state,
    past: wasChanged ? appendPast(state.past, state.groupStart) : state.past,
    groupStart: null,
  };
}

export function designHistoryReducer(state: DesignHistory, action: HistoryAction): DesignHistory {
  switch (action.type) {
    case 'hydrate':
      return createDesignHistory(action.document);
    case 'stampVersion':
      return { ...finishGroup(state), present: action.document };
    case 'beginGroup':
      return state.groupStart ? state : { ...state, groupStart: state.present };
    case 'endGroup':
      return finishGroup(state);
    case 'change': {
      if (!changed(state.present, action.document)) return state;
      return {
        past: state.groupStart ? state.past : appendPast(state.past, state.present),
        present: action.document,
        future: [],
        groupStart: state.groupStart,
      };
    }
    case 'undo': {
      const ready = finishGroup(state);
      if (!ready.past.length) return ready;
      return {
        past: ready.past.slice(0, -1),
        present: ready.past[ready.past.length - 1],
        future: [ready.present, ...ready.future],
        groupStart: null,
      };
    }
    case 'redo': {
      const ready = finishGroup(state);
      if (!ready.future.length) return ready;
      return {
        past: appendPast(ready.past, ready.present),
        present: ready.future[0],
        future: ready.future.slice(1),
        groupStart: null,
      };
    }
  }
}
