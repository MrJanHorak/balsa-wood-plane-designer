'use client';

import React from 'react';
import { GliderDesign, UIMode } from '@/types/glider';
import { GLIDER_PRESETS } from '@/constants/presets';
import { Plane, Box, Scissors, GraduationCap, Cpu, Layers, Save, FolderOpen, Download, Upload } from 'lucide-react';
import { ValidationReport } from '@/geometry/validation';
import { ValidationBadge } from './ValidationBadge';

interface HeaderProps {
  currentPresetId: string;
  mode: UIMode;
  activeViewport: '3d' | '2d';
  designName: string;
  saveStatus: 'saved' | 'unsaved';
  validationReport?: ValidationReport;
  onSelectPreset: (preset: GliderDesign) => void;
  onToggleMode: (mode: UIMode) => void;
  onSelectViewport: (vp: '3d' | '2d') => void;
  onSaveLocal: () => void;
  onLoadLocal: () => void;
  onExport: () => void;
  onImport: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentPresetId,
  mode,
  activeViewport,
  designName,
  saveStatus,
  validationReport,
  onSelectPreset,
  onToggleMode,
  onSelectViewport,
  onSaveLocal,
  onLoadLocal,
  onExport,
  onImport,
}) => {
  return (
    <header className="h-16 px-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-slate-100 select-none z-30 gap-3">
      {/* Brand & Title */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-lg shadow-amber-950/40 border border-amber-400/40 shrink-0">
          <Plane className="w-5 h-5 text-slate-950 -rotate-45" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="font-black text-lg tracking-tight bg-gradient-to-r from-amber-300 via-amber-200 to-slate-100 bg-clip-text text-transparent">
              BalsaPlaneDesigner
            </h1>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase tracking-wider hidden xl:inline">
              Phase 1 MVP
            </span>
          </div>
          <p className="text-[11px] text-slate-400 hidden sm:block truncate max-w-[18rem]">
            {designName} {saveStatus === 'unsaved' ? '• Unsaved changes' : '• Saved'}
          </p>
        </div>
      </div>

      {/* Center Viewport Switcher & Preset Selector */}
      <div className="flex items-center gap-2 sm:gap-4 min-w-0">
        {/* Preset Selector */}
        <div className="flex items-center gap-1.5 bg-slate-950/80 p-1 rounded-lg border border-slate-800 overflow-x-auto max-w-[34rem]">
          <Layers className="w-3.5 h-3.5 text-slate-400 ml-1.5 hidden md:block shrink-0" />
          <span className="text-xs text-slate-400 hidden lg:inline mr-1 shrink-0">Preset:</span>
          {Object.values(GLIDER_PRESETS).map((preset) => (
            <button
              key={preset.id}
              onClick={() => onSelectPreset(preset)}
              className={`px-2.5 py-1 text-xs rounded font-medium transition-all whitespace-nowrap ${
                currentPresetId === preset.id
                  ? 'bg-amber-500 text-slate-950 font-bold shadow'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              {preset.name}
            </button>
          ))}
        </div>

        {/* Viewport 3D vs 2D Tabs */}
        <div className="flex items-center bg-slate-950/80 p-1 rounded-lg border border-slate-800 shrink-0">
          <button
            onClick={() => onSelectViewport('3d')}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs rounded font-medium transition-all ${
              activeViewport === '3d'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Box className="w-3.5 h-3.5" />
            <span>3D Assembly</span>
          </button>
          <button
            onClick={() => onSelectViewport('2d')}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs rounded font-medium transition-all ${
              activeViewport === '2d'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Scissors className="w-3.5 h-3.5" />
            <span>2D Patterns</span>
          </button>
        </div>
      </div>

      {/* Persistence & Dual-Mode Controls */}
      <div className="flex items-center gap-2 shrink-0">
        {validationReport && <ValidationBadge report={validationReport} />}

        <div className="flex items-center bg-slate-950/80 p-1 rounded-lg border border-slate-800">
          <button onClick={onSaveLocal} className="p-1.5 rounded text-slate-300 hover:bg-slate-800 hover:text-white" title="Save this design in your browser">
            <Save className="w-4 h-4" />
          </button>
          <button onClick={onLoadLocal} className="p-1.5 rounded text-slate-300 hover:bg-slate-800 hover:text-white" title="Load the browser's saved design">
            <FolderOpen className="w-4 h-4" />
          </button>
          <button onClick={onExport} className="p-1.5 rounded text-slate-300 hover:bg-slate-800 hover:text-white" title="Export design JSON">
            <Download className="w-4 h-4" />
          </button>
          <button onClick={onImport} className="p-1.5 rounded text-slate-300 hover:bg-slate-800 hover:text-white" title="Import a design JSON file">
            <Upload className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center bg-slate-950/80 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => onToggleMode('simple')}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded font-medium transition-all ${
              mode === 'simple'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
            title="Educational mode with visual sliders and plain-English balance guidance"
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Educational</span>
          </button>

          <button
            onClick={() => onToggleMode('advanced')}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded font-medium transition-all ${
              mode === 'advanced'
                ? 'bg-indigo-500 text-white font-bold shadow'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
            title="Full STEM engineering access to polars, MAC, and Neutral Point mathematics"
          >
            <Cpu className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Advanced STEM</span>
          </button>
        </div>
      </div>
    </header>
  );
};
