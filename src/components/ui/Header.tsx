'use client';

import React from 'react';
import { GliderDesign, UIMode } from '@/types/glider';
import { GLIDER_PRESETS } from '@/constants/presets';
import { Plane, Box, Scissors, GraduationCap, Cpu, Layers } from 'lucide-react';
import { ValidationReport } from '@/geometry/validation';
import { ValidationBadge } from './ValidationBadge';
import { DesignHistoryControls } from './DesignHistoryControls';
import { FileActionsMenu } from './FileActionsMenu';
import { NamedDesignVersion } from '@/design/versions';

interface HeaderProps {
  currentPresetId: string;
  mode: UIMode;
  activeViewport: '3d' | '2d';
  designName: string;
  saveStatus: 'saved' | 'unsaved';
  recoveryStatus: 'idle' | 'protected' | 'updating' | 'unavailable';
  validationReport?: ValidationReport;
  onSelectPreset: (preset: GliderDesign) => void;
  onToggleMode: (mode: UIMode) => void;
  onSelectViewport: (vp: '3d' | '2d') => void;
  onSaveLocal: () => void;
  onLoadLocal: () => void;
  onExport: () => void;
  onImport: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  versions: NamedDesignVersion[];
  onCreateVersion: (name: string) => boolean;
  onRestoreVersion: (version: NamedDesignVersion) => void;
  onDeleteVersion: (id: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentPresetId,
  mode,
  activeViewport,
  designName,
  saveStatus,
  recoveryStatus,
  validationReport,
  onSelectPreset,
  onToggleMode,
  onSelectViewport,
  onSaveLocal,
  onLoadLocal,
  onExport,
  onImport,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  versions,
  onCreateVersion,
  onRestoreVersion,
  onDeleteVersion,
}) => {
  return (
    <header className="relative px-3 py-2 sm:px-4 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between text-slate-100 select-none z-30 gap-2.5">
      {/* Brand & Title */}
      <div className="flex w-full items-center gap-3 min-w-0 xl:w-auto">
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
          <p className="max-w-[18rem] text-xs text-slate-300">
            <span className="block truncate sm:inline">{designName}</span>
            <span className="hidden sm:inline"> · </span>
            <span className="block sm:inline">{saveStatus === 'saved' ? 'Saved in this browser'
              : recoveryStatus === 'idle' ? 'Starter preset · not saved'
                : recoveryStatus === 'protected' ? 'Unsaved · recovery copy on this device'
                : recoveryStatus === 'unavailable' ? 'Unsaved · recovery unavailable'
                  : 'Unsaved · updating recovery copy'}</span>
          </p>
        </div>
      </div>

      {/* Center Viewport Switcher & Preset Selector */}
      <div className="order-3 flex w-full flex-col items-stretch gap-2 min-w-0 border-t border-slate-800/80 pt-2 sm:flex-row sm:items-center sm:justify-between">
        {/* Preset Selector */}
        <div className="flex max-w-full flex-wrap items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-950/80 p-1 sm:max-w-[34rem]">
          <Layers className="w-3.5 h-3.5 text-slate-400 ml-1.5 hidden md:block shrink-0" />
          <span className="text-xs text-slate-400 hidden lg:inline mr-1 shrink-0">Preset:</span>
          {Object.values(GLIDER_PRESETS).map((preset) => (
            <button
              type="button"
              key={preset.id}
              onClick={() => onSelectPreset(preset)}
              aria-pressed={currentPresetId === preset.id}
              className={`px-2.5 py-1 text-xs rounded font-medium transition-all whitespace-nowrap ${
                currentPresetId === preset.id
                  ? 'bg-amber-500 text-slate-950 font-bold shadow'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              {preset.name}
            </button>
          ))}
          {!currentPresetId && <span className="px-2 text-xs font-medium text-cyan-300">Customized</span>}
        </div>

        {/* Viewport 3D vs 2D Tabs */}
        <div className="flex items-center bg-slate-950/80 p-1 rounded-lg border border-slate-800 shrink-0">
          <button
            type="button"
            onClick={() => onSelectViewport('3d')}
            aria-pressed={activeViewport === '3d'}
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
            type="button"
            onClick={() => onSelectViewport('2d')}
            aria-pressed={activeViewport === '2d'}
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
      <div className="flex w-full min-w-0 flex-wrap items-center gap-2 xl:ml-auto xl:w-auto">
        {validationReport && <ValidationBadge report={validationReport} />}

        <DesignHistoryControls canUndo={canUndo} canRedo={canRedo} onUndo={onUndo} onRedo={onRedo}
          versions={versions} onCreateVersion={onCreateVersion} onRestoreVersion={onRestoreVersion} onDeleteVersion={onDeleteVersion} />

        <FileActionsMenu onSaveLocal={onSaveLocal} onLoadLocal={onLoadLocal} onExport={onExport} onImport={onImport} />

        <div className="flex items-center bg-slate-950/80 p-1 rounded-lg border border-slate-800">
          <button
            type="button"
            onClick={() => onToggleMode('simple')}
            aria-label="Educational mode"
            aria-pressed={mode === 'simple'}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded font-medium transition-all ${
              mode === 'simple'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
            title="Educational mode with visual sliders and plain-English balance guidance"
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Educational</span>
          </button>

          <button
            type="button"
            onClick={() => onToggleMode('advanced')}
            aria-label="Advanced STEM mode"
            aria-pressed={mode === 'advanced'}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded font-medium transition-all ${
              mode === 'advanced'
                ? 'bg-indigo-500 text-white font-bold shadow'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
            title="Show engineering geometry and static-balance details"
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Advanced STEM</span>
          </button>
        </div>
      </div>
    </header>
  );
};
