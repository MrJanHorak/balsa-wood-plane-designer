'use client';

import React, { useMemo, useRef, useState } from 'react';
import { GliderDesign, UIMode } from '@/types/glider';
import { PlaneDesignDocument } from '@/types/design-document';
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
import { Header } from '@/components/ui/Header';
import { ParametricControls } from '@/components/ui/ParametricControls';
import { StabilityInspector } from '@/components/ui/StabilityInspector';
import { TelemetryCard } from '@/components/ui/TelemetryCard';
import { Glider3DViewport } from '@/components/viewport/Glider3DViewport';
import { Pattern2DViewport } from '@/components/viewport/Pattern2DViewport';

function createDefaultDocument(): PlaneDesignDocument {
  return createPlaneDesignDocument(DEFAULT_GLIDER);
}

export default function WorkbenchPage() {
  const [design, setDesign] = useState<PlaneDesignDocument>(() => createDefaultDocument());
  const [mode, setMode] = useState<UIMode>(design.geometry.mode);
  const [activeViewport, setActiveViewport] = useState<'3d' | '2d'>('3d');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'unsaved'>('unsaved');
  const [persistenceMessage, setPersistenceMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const glider = design.geometry;

  // Real-time Aerodynamic & Mass balance analysis
  const aeroReport = useMemo(() => {
    return analyzeGliderStability(glider);
  }, [glider]);

  // Real-time Geometry & Structural validation
  const validationReport = useMemo(() => {
    return validateGliderDesign(glider, aeroReport);
  }, [glider, aeroReport]);

  const handleChange = (nextGlider: GliderDesign) => {
    setDesign((prev) => updatePlaneDesignGeometry(prev, nextGlider));
    setSaveStatus('unsaved');
    setPersistenceMessage(null);
  };

  const handleSelectPreset = (preset: GliderDesign) => {
    handleChange(preset);
    setMode(preset.mode);
  };

  const handleToggleMode = (nextMode: UIMode) => {
    setMode(nextMode);
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
      setSaveStatus('saved');
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

      setDesign(saved);
      setMode(saved.geometry.mode);
      setSaveStatus('saved');
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
      setDesign(imported);
      setMode(imported.geometry.mode);
      setSaveStatus('unsaved');
      setPersistenceMessage(`Imported ${imported.metadata.name}.`);
    } catch (error) {
      setPersistenceMessage(error instanceof Error ? error.message : 'Unable to import the selected file.');
    }
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
      />

      {persistenceMessage && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 px-3 py-1.5 rounded-b-lg border border-slate-700 bg-slate-900/95 text-xs text-slate-300 shadow-xl">
          {persistenceMessage}
        </div>
      )}

      {/* Main 3-Column Engineering Studio */}
      <main className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden relative">
        {/* Left Sidebar: Parametric Sliders */}
        <div className="w-full md:w-80 lg:w-96 flex-shrink-0 h-1/3 md:h-full p-2.5 overflow-hidden flex flex-col border-r border-slate-800 bg-slate-950/70 z-20">
          <ParametricControls
            glider={glider}
            mode={mode}
            onChange={handleChange}
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

          <TelemetryCard
            aeroReport={aeroReport}
            mode={mode}
          />
        </div>
      </main>
    </div>
  );
}
