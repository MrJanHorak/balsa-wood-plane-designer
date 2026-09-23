'use client';

import React, { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { GliderDesign, UIMode } from '@/types/glider';
import { FlightTestRecord, PlaneDesignDocument } from '@/types/design-document';
import { DEFAULT_GLIDER } from '@/constants/presets';
import { analyzeGliderStability } from '@/physics/stability';
import { validateGliderDesign } from '@/geometry/validation';
import {
  createPlaneDesignDocument,
  deserializePlaneDesign,
  updatePlaneDesignGeometry,
} from '@/design/document';
import {
  downloadPlaneDesign,
  loadPlaneDesignFromLocalStorage,
  savePlaneDesignToLocalStorage,
} from '@/design/storage';
import { createDesignHistory, designHistoryReducer } from '@/design/history';
import { createNamedVersion, loadNamedVersions, NamedDesignVersion, saveNamedVersions } from '@/design/versions';
import { addFlightTest, removeFlightTest } from '@/design/flightTests';
import { Header } from '@/components/ui/Header';
import { ParametricControls } from '@/components/ui/ParametricControls';
import { StabilityInspector } from '@/components/ui/StabilityInspector';
import { TelemetryCard } from '@/components/ui/TelemetryCard';
import { FlightTestPanel } from '@/components/ui/FlightTestPanel';
import { FuselageProfileEditor } from '@/components/ui/FuselageProfileEditor';
import { WingProfileEditor } from '@/components/ui/WingProfileEditor';
import { Glider3DViewport } from '@/components/viewport/Glider3DViewport';
import { Pattern2DViewport } from '@/components/viewport/Pattern2DViewport';

function createDefaultDocument(): PlaneDesignDocument {
  return createPlaneDesignDocument(DEFAULT_GLIDER);
}

export default function WorkbenchPage() {
  const [history, dispatchHistory] = useReducer(designHistoryReducer, undefined, () => createDesignHistory(createDefaultDocument()));
  const design = history.present;
  const mode = design.geometry.mode;
  const [activeViewport, setActiveViewport] = useState<'3d' | '2d'>('3d');
  const [savedDocument, setSavedDocument] = useState<PlaneDesignDocument | null>(null);
  const [versions, setVersions] = useState<NamedDesignVersion[]>([]);
  const [persistenceMessage, setPersistenceMessage] = useState<string | null>(null);
  const [customShapeEditorOpen, setCustomShapeEditorOpen] = useState(false);
  const [wingEditorOpen, setWingEditorOpen] = useState(false);
  const [tailEditorOpen, setTailEditorOpen] = useState(false);
  const [finEditorOpen, setFinEditorOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sliderEditingRef = useRef(false);

  const glider = design.geometry;
  const saveStatus = savedDocument && JSON.stringify(savedDocument) === JSON.stringify(design) ? 'saved' : 'unsaved';

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        setVersions(loadNamedVersions());
      } catch (error) {
        setPersistenceMessage(error instanceof Error ? error.message : 'Unable to read saved versions.');
      }
      try {
        const saved = loadPlaneDesignFromLocalStorage();
        if (saved) {
          dispatchHistory({ type: 'hydrate', document: saved });
          setSavedDocument(structuredClone(saved));
        }
      } catch (error) {
        setPersistenceMessage(error instanceof Error ? error.message : 'Unable to read the current design.');
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const finishSlider = () => {
      if (!sliderEditingRef.current) return;
      sliderEditingRef.current = false;
      dispatchHistory({ type: 'endGroup' });
    };
    window.addEventListener('pointerup', finishSlider);
    window.addEventListener('pointercancel', finishSlider);
    return () => {
      window.removeEventListener('pointerup', finishSlider);
      window.removeEventListener('pointercancel', finishSlider);
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey ||
        customShapeEditorOpen || wingEditorOpen || tailEditorOpen || finEditorOpen) return;
      const target = event.target as HTMLElement | null;
      if (target?.isContentEditable || target?.closest('input:not([type="range"]), textarea, select')) return;
      const key = event.key.toLowerCase();
      if (key !== 'z' && key !== 'y') return;
      event.preventDefault();
      dispatchHistory({ type: key === 'y' || event.shiftKey ? 'redo' : 'undo' });
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [customShapeEditorOpen, wingEditorOpen, tailEditorOpen, finEditorOpen]);

  // Real-time Aerodynamic & Mass balance analysis
  const aeroReport = useMemo(() => {
    return analyzeGliderStability(glider);
  }, [glider]);

  // Real-time Geometry & Structural validation
  const validationReport = useMemo(() => {
    return validateGliderDesign(glider, aeroReport);
  }, [glider, aeroReport]);

  const handleChange = (nextGlider: GliderDesign) => {
    dispatchHistory({ type: 'change', document: updatePlaneDesignGeometry(design, nextGlider) });
    setPersistenceMessage(null);
  };

  const handleSelectPreset = (preset: GliderDesign) => {
    handleChange(preset);
  };

  const handleToggleMode = (nextMode: UIMode) => {
    handleChange({ ...glider, mode: nextMode });
  };

  const handleApplyBallast = (ballastGrams: number) => {
    handleChange({
      ...glider,
      fuselage: {
        ...glider.fuselage,
        noseBallastGrams: ballastGrams,
      },
    });
  };

  const handleSaveLocal = () => {
    try {
      savePlaneDesignToLocalStorage(design);
      setSavedDocument(structuredClone(design));
      setPersistenceMessage('Design saved in this browser.');
    } catch (error) {
      setPersistenceMessage(error instanceof Error ? error.message : 'Unable to save the design.');
    }
  };

  const handleLoadLocal = () => {
    try {
      const saved = loadPlaneDesignFromLocalStorage();
      if (!saved) {
        setPersistenceMessage('No locally saved design was found.');
        return;
      }

      dispatchHistory({ type: 'change', document: saved });
      setSavedDocument(structuredClone(saved));
      setPersistenceMessage('Local design loaded.');
    } catch (error) {
      setPersistenceMessage(error instanceof Error ? error.message : 'Unable to load the saved design.');
    }
  };

  const handleExport = () => {
    downloadPlaneDesign(design);
    setPersistenceMessage('Design JSON exported.');
  };

  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) return;

    try {
      const imported = deserializePlaneDesign(await file.text());
      dispatchHistory({ type: 'change', document: imported });
      setPersistenceMessage(`Imported ${imported.metadata.name}.`);
    } catch (error) {
      setPersistenceMessage(error instanceof Error ? error.message : 'Unable to import the selected file.');
    }
  };

  const handleCreateVersion = (name: string) => {
    try {
      const version = createNamedVersion(design, name, versions);
      const next = [version, ...versions];
      saveNamedVersions(next);
      setVersions(next);
      dispatchHistory({ type: 'stampVersion', document: version.document });
      try {
        savePlaneDesignToLocalStorage(version.document);
        setSavedDocument(structuredClone(version.document));
        setPersistenceMessage(`Saved version “${version.name}” and the current design.`);
      } catch {
        setPersistenceMessage(`Saved version “${version.name}”, but could not update the current-design save.`);
      }
      return true;
    } catch (error) {
      setPersistenceMessage(error instanceof Error ? error.message : 'Unable to save this version.');
      return false;
    }
  };

  const handleRestoreVersion = (version: NamedDesignVersion) => {
    dispatchHistory({ type: 'change', document: structuredClone(version.document) });
    setPersistenceMessage(`Restored “${version.name}”. You can undo this change.`);
  };

  const handleDeleteVersion = (id: string) => {
    try {
      const next = versions.filter((version) => version.id !== id);
      saveNamedVersions(next);
      setVersions(next);
      setPersistenceMessage('Named version deleted.');
    } catch (error) {
      setPersistenceMessage(error instanceof Error ? error.message : 'Unable to delete this version.');
    }
  };

  const saveFlightTestChange = (next: PlaneDesignDocument, message: string) => {
    dispatchHistory({ type: 'change', document: next });
    try {
      savePlaneDesignToLocalStorage(next);
      setSavedDocument(structuredClone(next));
      setPersistenceMessage(message);
    } catch (error) {
      setPersistenceMessage(`Test updated, but browser storage failed: ${error instanceof Error ? error.message : 'please export or save the design.'}`);
    }
  };

  const handleAddFlightTest = (test: FlightTestRecord) => {
    saveFlightTestChange(addFlightTest(design, test), 'Build or flight test saved with this design.');
  };

  const handleRemoveFlightTest = (id: string) => {
    saveFlightTestChange(removeFlightTest(design, id), 'Test removed. Undo can restore it.');
  };

  const beginSliderEdit = (event: React.SyntheticEvent<HTMLDivElement>) => {
    if (!(event.target instanceof HTMLInputElement) || event.target.type !== 'range' || sliderEditingRef.current) return;
    sliderEditingRef.current = true;
    dispatchHistory({ type: 'beginGroup' });
  };

  const endSliderEdit = () => {
    if (!sliderEditingRef.current) return;
    sliderEditingRef.current = false;
    dispatchHistory({ type: 'endGroup' });
  };

  const openEditor = (editor: 'fuselage' | 'wing' | 'tail' | 'fin') => {
    dispatchHistory({ type: 'beginGroup' });
    if (editor === 'fuselage') setCustomShapeEditorOpen(true);
    if (editor === 'wing') setWingEditorOpen(true);
    if (editor === 'tail') setTailEditorOpen(true);
    if (editor === 'fin') setFinEditorOpen(true);
  };

  const closeEditor = (editor: 'fuselage' | 'wing' | 'tail' | 'fin') => {
    dispatchHistory({ type: 'endGroup' });
    if (editor === 'fuselage') setCustomShapeEditorOpen(false);
    if (editor === 'wing') setWingEditorOpen(false);
    if (editor === 'tail') setTailEditorOpen(false);
    if (editor === 'fin') setFinEditorOpen(false);
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 font-sans">
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json,.balsa.json"
        className="hidden"
        onChange={handleImportFile}
      />

      {/* Top Navigation & App Bar */}
      <Header
        currentPresetId={glider.id}
        mode={mode}
        activeViewport={activeViewport}
        designName={design.metadata.name}
        saveStatus={saveStatus}
        validationReport={validationReport}
        onSelectPreset={handleSelectPreset}
        onToggleMode={handleToggleMode}
        onSelectViewport={setActiveViewport}
        onSaveLocal={handleSaveLocal}
        onLoadLocal={handleLoadLocal}
        onExport={handleExport}
        onImport={handleImport}
        canUndo={history.past.length > 0 || Boolean(history.groupStart)}
        canRedo={history.future.length > 0}
        onUndo={() => dispatchHistory({ type: 'undo' })}
        onRedo={() => dispatchHistory({ type: 'redo' })}
        versions={versions}
        onCreateVersion={handleCreateVersion}
        onRestoreVersion={handleRestoreVersion}
        onDeleteVersion={handleDeleteVersion}
      />

      {persistenceMessage && (
        <div role="status" className="self-center z-40 px-3 py-1.5 rounded-b-lg border border-slate-700 bg-slate-900/95 text-xs text-slate-300 shadow-xl">
          {persistenceMessage}
        </div>
      )}

      {/* Main 3-Column Engineering Studio */}
      <main className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden relative">
        {/* Left Sidebar: Parametric Sliders */}
        <div className="w-full md:w-80 lg:w-96 flex-shrink-0 h-1/3 md:h-full p-2.5 overflow-hidden flex flex-col border-r border-slate-800 bg-slate-950/70 z-20"
          onPointerDownCapture={beginSliderEdit}
          onKeyDownCapture={(event) => { if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown'].includes(event.key)) beginSliderEdit(event); }}
          onKeyUpCapture={endSliderEdit}
          onBlurCapture={endSliderEdit}>
          <ParametricControls
            glider={glider}
            mode={mode}
            onChange={handleChange}
            onOpenCustomShapeEditor={() => openEditor('fuselage')}
            onOpenWingEditor={() => openEditor('wing')}
            onOpenTailEditor={() => openEditor('tail')}
            onOpenFinEditor={() => openEditor('fin')}
          />
        </div>

        {/* Center Viewport: 3D Three.js Assembled View or 2D Vector Cut Patterns */}
        <div className="flex-1 h-full relative overflow-hidden bg-slate-950">
          {activeViewport === '3d' ? (
            <Glider3DViewport glider={glider} aeroReport={aeroReport} />
          ) : (
            <Pattern2DViewport glider={glider} />
          )}
        </div>

        {/* Right Sidebar: Flight Deck & Stability Inspector */}
        <div className="w-full md:w-84 lg:w-96 flex-shrink-0 h-auto md:h-full p-2.5 overflow-y-auto flex flex-col gap-2.5 border-l border-slate-800 bg-slate-950/70 z-20">
          <StabilityInspector
            glider={glider}
            aeroReport={aeroReport}
            mode={mode}
            validationReport={validationReport}
            onApplyBallast={handleApplyBallast}
          />

          <FlightTestPanel tests={design.flightTests ?? []} aeroReport={aeroReport} nominalDihedralDeg={glider.wing.dihedralDeg}
            onAdd={handleAddFlightTest} onRemove={handleRemoveFlightTest} />

          <TelemetryCard
            aeroReport={aeroReport}
            mode={mode}
          />
        </div>
      </main>

      {customShapeEditorOpen && (
        <FuselageProfileEditor
          glider={glider}
          onChange={handleChange}
          onClose={() => closeEditor('fuselage')}
        />
      )}
      {wingEditorOpen && <WingProfileEditor glider={glider} onChange={handleChange} onClose={() => closeEditor('wing')} />}
      {tailEditorOpen && <WingProfileEditor surface="tail" glider={glider} onChange={handleChange} onClose={() => closeEditor('tail')} />}
      {finEditorOpen && <WingProfileEditor surface="fin" glider={glider} onChange={handleChange} onClose={() => closeEditor('fin')} />}
    </div>
  );
}
