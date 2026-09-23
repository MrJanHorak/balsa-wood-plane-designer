'use client';

import React, { useState } from 'react';
import { ChevronDown, ClipboardList, Plus, Trash2 } from 'lucide-react';
import { FlightTestRecord, FlightPitchObservation, FlightTurnObservation } from '@/types/design-document';
import { GliderAeroReport } from '@/types/glider';
import { createFlightTest, observedDistancePerHeight } from '@/design/flightTests';

interface Props {
  tests: FlightTestRecord[];
  aeroReport: GliderAeroReport;
  nominalDihedralDeg: number;
  onAdd: (test: FlightTestRecord) => void;
  onRemove: (id: string) => void;
}

const PITCH_LABELS: Record<FlightPitchObservation, string> = {
  unknown: 'Not recorded',
  steady: 'Steady descent',
  nose_down: 'Nose-down dive',
  suspected_stall: 'Climbed then dropped / possible stall',
  oscillating: 'Repeated pitch oscillation',
  other: 'Other',
};

const TURN_LABELS: Record<FlightTurnObservation, string> = {
  unknown: 'Not recorded',
  straight: 'Mostly straight',
  left: 'Pulled left',
  right: 'Pulled right',
  variable: 'Varied between throws',
};

type NumberField = 'measuredMassGrams' | 'measuredCgXMm' | 'noseBallastGrams' | 'asBuiltDihedralDeg' | 'launchHeightM' | 'distanceM';
const EMPTY_NUMBERS: Record<NumberField, string> = {
  measuredMassGrams: '', measuredCgXMm: '', noseBallastGrams: '', asBuiltDihedralDeg: '', launchHeightM: '', distanceM: '',
};

export function FlightTestPanel({ tests, aeroReport, nominalDihedralDeg, onAdd, onRemove }: Props) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState('');
  const [numbers, setNumbers] = useState(EMPTY_NUMBERS);
  const [pitch, setPitch] = useState<FlightPitchObservation>('unknown');
  const [turn, setTurn] = useState<FlightTurnObservation>('unknown');
  const [wingCamberState, setWingCamberState] = useState<'unknown' | 'flat' | 'formed'>('unknown');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const setNumber = (key: NumberField, value: string) => setNumbers((previous) => ({ ...previous, [key]: value }));
  const numeric = (key: NumberField) => numbers[key].trim() === '' ? undefined : Number(numbers[key]);
  const numberInput = (key: NumberField, title: string, step = '0.1') => (
    <label className="flex flex-col gap-1 text-sm text-slate-200" key={key}>
      {title}
      <input type="number" min="0" step={step} value={numbers[key]} onChange={(event) => setNumber(key, event.target.value)}
        className="min-h-9 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100 focus:border-cyan-400" />
    </label>
  );

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const test = createFlightTest({
        label: label.trim() || `Build / flight test ${tests.length + 1}`,
        measuredMassGrams: numeric('measuredMassGrams'),
        measuredCgXMm: numeric('measuredCgXMm'),
        noseBallastGrams: numeric('noseBallastGrams'),
        asBuiltDihedralDeg: numeric('asBuiltDihedralDeg'),
        wingCamberState,
        launchHeightM: numeric('launchHeightM'),
        distanceM: numeric('distanceM'),
        pitch, turn, notes,
      });
      onAdd(test);
      setError('');
      setLabel('');
      setNumbers(EMPTY_NUMBERS);
      setPitch('unknown');
      setTurn('unknown');
      setWingCamberState('unknown');
      setNotes('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to record this test.');
    }
  };

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/90 shadow-xl">
      <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open}
        className="flex w-full items-center gap-2 p-4 text-left text-sm font-bold text-slate-100 hover:bg-slate-800/40">
        <ClipboardList className="h-4 w-4 text-cyan-400" />
        <span className="flex-1">Build & flight tests</span>
        {tests.length > 0 && <span className="rounded bg-cyan-950 px-1.5 py-0.5 text-xs text-cyan-200">{tests.length}</span>}
        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="border-t border-slate-800 p-4 space-y-4">
          <p className="text-xs leading-relaxed text-slate-400">Record what the built plane actually did. These measurements stay with the design JSON and named versions.</p>
          <form onSubmit={submit} className="space-y-3">
            <label className="flex flex-col gap-1 text-sm text-slate-200">
              Test name
              <input value={label} maxLength={100} onChange={(event) => setLabel(event.target.value)} placeholder={`Build / flight test ${tests.length + 1}`}
                className="min-h-9 rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100 focus:border-cyan-400" />
            </label>
            <div>
              <p className="mb-1.5 text-sm font-semibold text-slate-200">As built (leave unknown values blank)</p>
              <div className="grid grid-cols-2 gap-2">
                {numberInput('measuredMassGrams', 'Mass (g)', '0.01')}
                {numberInput('measuredCgXMm', 'CG from nose (mm)')}
                {numberInput('noseBallastGrams', 'Nose ballast (g)', '0.01')}
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-sm font-semibold text-slate-200">Flight</p>
              <div className="grid grid-cols-2 gap-2">
                {numberInput('launchHeightM', 'Release height (m)', '0.01')}
                {numberInput('distanceM', 'Distance (m)', '0.01')}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {numberInput('asBuiltDihedralDeg', 'Wing angle (°/side; 0 if straight)')}
              <label className="flex flex-col gap-1 text-sm text-slate-200">Actual wing camber
                <select value={wingCamberState} onChange={(event) => setWingCamberState(event.target.value as 'unknown' | 'flat' | 'formed')}
                  className="min-h-9 min-w-0 rounded-md border border-slate-700 bg-slate-950 px-1.5 py-1.5 text-sm">
                  <option value="unknown">Not measured</option><option value="flat">Left flat</option><option value="formed">Formed / curved</option>
                </select>
              </label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex flex-col gap-1 text-sm text-slate-200">Pitch
                <select value={pitch} onChange={(event) => setPitch(event.target.value as FlightPitchObservation)} className="min-h-9 min-w-0 rounded-md border border-slate-700 bg-slate-950 px-1.5 py-1.5 text-sm">
                  {Object.entries(PITCH_LABELS).map(([value, text]) => <option value={value} key={value}>{text}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm text-slate-200">Turn
                <select value={turn} onChange={(event) => setTurn(event.target.value as FlightTurnObservation)} className="min-h-9 min-w-0 rounded-md border border-slate-700 bg-slate-950 px-1.5 py-1.5 text-sm">
                  {Object.entries(TURN_LABELS).map(([value, text]) => <option value={value} key={value}>{text}</option>)}
                </select>
              </label>
            </div>
            <label className="flex flex-col gap-1 text-sm text-slate-200">Notes or trim changes
              <textarea value={notes} maxLength={2000} rows={2} onChange={(event) => setNotes(event.target.value)} placeholder="What changed between throws? Was the wing formed or left flat?"
                className="resize-y rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm focus:border-cyan-400" />
            </label>
            {error && <p role="alert" className="text-xs text-amber-300">{error}</p>}
            <button type="submit" className="flex items-center gap-1.5 rounded-md bg-cyan-500 px-3 py-2 text-xs font-bold text-slate-950 hover:bg-cyan-400">
              <Plus className="h-3.5 w-3.5" /> Add test
            </button>
          </form>
          {tests.length > 0 && <div className="space-y-2 border-t border-slate-700 pt-3">
            <h4 className="text-xs font-semibold text-slate-200">Recorded tests</h4>
            {[...tests].reverse().map((test) => {
              const distancePerHeight = observedDistancePerHeight(test);
              return <article key={test.id} className="rounded-lg border border-slate-700 bg-slate-950/80 p-3 text-xs text-slate-300 space-y-1">
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1"><p className="font-semibold text-slate-100">{test.label}</p><p className="text-xs text-slate-400">{new Date(test.createdAt).toLocaleString()}</p></div>
                  <button type="button" title="Remove test (Undo can restore it)" aria-label={`Remove ${test.label}`} onClick={() => onRemove(test.id)} className="flex min-h-8 min-w-8 items-center justify-center rounded text-slate-300 hover:bg-slate-800 hover:text-red-300"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
                {test.measuredMassGrams !== undefined && <p>Mass: {test.measuredMassGrams} g measured · {aeroReport.massBreakdown.totalGrams} g current design estimate</p>}
                {test.measuredCgXMm !== undefined && <p>CG: {test.measuredCgXMm} mm measured · {aeroReport.cgXMm} mm current design estimate</p>}
                {test.noseBallastGrams !== undefined && <p>Nose ballast: {test.noseBallastGrams} g</p>}
                {test.asBuiltDihedralDeg !== undefined && <p>Wing dihedral: {test.asBuiltDihedralDeg}° built · {nominalDihedralDeg}° current design setting</p>}
                {test.wingCamberState && test.wingCamberState !== 'unknown' && <p>Wing camber as built: {test.wingCamberState === 'flat' ? 'left flat' : 'formed / curved'}</p>}
                {test.distanceM !== undefined && <p>Flight: {test.distanceM} m from {test.launchHeightM} m release height</p>}
                {distancePerHeight !== null && <p className="text-cyan-300">Distance / release height: {distancePerHeight.toFixed(2)} — not a steady-glide L/D measurement</p>}
                {(test.pitch !== 'unknown' || test.turn !== 'unknown') && <p>{PITCH_LABELS[test.pitch]} · {TURN_LABELS[test.turn]}</p>}
                {test.notes && <p className="whitespace-pre-wrap text-slate-400">{test.notes}</p>}
              </article>;
            })}
          </div>}
        </div>
      )}
    </section>
  );
}
