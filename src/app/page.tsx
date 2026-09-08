'use client';

import React, { useState, useMemo } from 'react';
import { GliderDesign, UIMode } from '@/types/glider';
import { DEFAULT_GLIDER } from '@/constants/presets';
import { analyzeGliderStability } from '@/physics/stability';
import { Header } from '@/components/ui/Header';
import { ParametricControls } from '@/components/ui/ParametricControls';
import { StabilityInspector } from '@/components/ui/StabilityInspector';
import { TelemetryCard } from '@/components/ui/TelemetryCard';
import { Glider3DViewport } from '@/components/viewport/Glider3DViewport';
import { Pattern2DViewport } from '@/components/viewport/Pattern2DViewport';

export default function WorkbenchPage() {
  const [glider, setGlider] = useState<GliderDesign>(DEFAULT_GLIDER);
  const [mode, setMode] = useState<UIMode>('simple');
  const [activeViewport, setActiveViewport] = useState<'3d' | '2d'>('3d');

  // Real-time Aerodynamic & Mass balance analysis
  const aeroReport = useMemo(() => {
    return analyzeGliderStability(glider);
  }, [glider]);

  const handleSelectPreset = (preset: GliderDesign) => {
    setGlider(preset);
  };

  const handleApplyBallast = (ballastGrams: number) => {
    setGlider((prev) => ({
      ...prev,
      fuselage: {
        ...prev.fuselage,
        noseBallastGrams: ballastGrams,
      },
    }));
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 font-sans">
      {/* Top Navigation & App Bar */}
      <Header
        currentPresetId={glider.id}
        mode={mode}
        activeViewport={activeViewport}
        onSelectPreset={handleSelectPreset}
        onToggleMode={setMode}
        onSelectViewport={setActiveViewport}
      />

      {/* Main 3-Column Engineering Studio */}
      <main className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden relative">
        {/* Left Sidebar: Parametric Sliders */}
        <div className="w-full md:w-80 lg:w-96 flex-shrink-0 h-1/3 md:h-full p-2.5 overflow-hidden flex flex-col border-r border-slate-800 bg-slate-950/70 z-20">
          <ParametricControls
            glider={glider}
            mode={mode}
            onChange={setGlider}
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
          {/* Real-Time Balance Beam & Pitch Stability Coach */}
          <StabilityInspector
            glider={glider}
            aeroReport={aeroReport}
            mode={mode}
            onApplyBallast={handleApplyBallast}
          />

          {/* Aerodynamic Telemetry, Polar Estimates & Mass Breakdown */}
          <TelemetryCard
            aeroReport={aeroReport}
            mode={mode}
          />
        </div>
      </main>
    </div>
  );
}
