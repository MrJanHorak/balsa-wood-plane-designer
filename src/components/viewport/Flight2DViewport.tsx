'use client';

import { useEffect, useMemo, useState } from 'react';
import { Download, Pause, Play, Share2 } from 'lucide-react';
import { FlightTestRecord } from '@/types/design-document';
import { GliderAeroReport, GliderDesign } from '@/types/glider';
import { Flight2DInput, Flight2DResult, simulateFlight2D } from '@/physics/flight2d';
import {
  AeroAssumptions, calculateDesignPerformance, DEFAULT_AERO_ASSUMPTIONS,
  speedForLiftCoefficient,
} from '@/physics/performance';

interface Props {
  glider: GliderDesign;
  report: GliderAeroReport;
  tests: FlightTestRecord[];
}

const WIDTH = 900, HEIGHT = 420;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function trajectoryGeometry(result: Flight2DResult, releaseHeightM: number) {
  const maxX = Math.max(5, Math.ceil(result.rangeM * 1.12 / 2) * 2);
  const maxY = Math.max(2, Math.ceil(Math.max(releaseHeightM, ...result.points.map(p => p.heightM)) * 1.2));
  const toX = (x: number) => 55 + x / maxX * (WIDTH - 90);
  const toY = (y: number) => HEIGHT - 48 - y / maxY * (HEIGHT - 88);
  return { maxX, maxY, toX, toY,
    path: result.points.map((p, index) => `${index ? 'L' : 'M'} ${toX(p.xM).toFixed(1)} ${toY(p.heightM).toFixed(1)}`).join(' ') };
}

function downloadCard(name: string, result: Flight2DResult, input: Flight2DInput) {
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 710;
  const context = canvas.getContext('2d');
  if (!context) return;
  context.fillStyle = '#08111f'; context.fillRect(0, 0, 1200, 710);
  context.fillStyle = '#22d3ee'; context.font = 'bold 26px Arial'; context.fillText('BALSA PLANE DESIGNER', 72, 70);
  context.fillStyle = '#f8fafc'; context.font = 'bold 48px Arial';
  context.fillText(name.slice(0, 32), 72, 135);
  context.fillStyle = '#94a3b8'; context.font = '23px Arial';
  context.fillText('2D flight exploration · model result', 72, 175);
  const { maxX, maxY } = trajectoryGeometry(result, input.releaseHeightM);
  const sx = (x: number) => 75 + x / maxX * 1050;
  const sy = (y: number) => 505 - y / maxY * 275;
  context.strokeStyle = '#334155'; context.lineWidth = 2;
  context.beginPath(); context.moveTo(75, 505); context.lineTo(1125, 505); context.stroke();
  context.strokeStyle = '#22d3ee'; context.lineWidth = 6; context.lineCap = 'round';
  context.beginPath(); result.points.forEach((p, i) => { if (i) context.lineTo(sx(p.xM), sy(p.heightM)); else context.moveTo(sx(p.xM), sy(p.heightM)); }); context.stroke();
  context.fillStyle = '#fbbf24'; context.beginPath(); context.arc(sx(result.rangeM), sy(0), 8, 0, Math.PI * 2); context.fill();
  context.fillStyle = '#f8fafc'; context.font = 'bold 34px Arial';
  context.fillText(`${result.rangeM.toFixed(1)} m modeled range`, 72, 585);
  context.fillStyle = '#94a3b8'; context.font = '20px Arial';
  context.fillText(`${input.massGrams.toFixed(2)} g · ${input.releaseHeightM.toFixed(2)} m release · ${input.launchSpeedMs.toFixed(1)} m/s launch`, 72, 622);
  const assumptions = input.assumptions ?? DEFAULT_AERO_ASSUMPTIONS;
  context.fillText(`Scenario: CD0 ${assumptions.profileDragCoefficient.toFixed(2)} · CL limit ${assumptions.maximumLiftCoefficient.toFixed(2)} · span efficiency ${assumptions.spanEfficiency.toFixed(2)}`, 72, 652);
  context.fillText('Exploratory: drag, trim, pitch, and wind may change real flight.', 72, 682);
  const anchor = document.createElement('a');
  anchor.download = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'glider'}-flight-card.png`;
  anchor.href = canvas.toDataURL('image/png');
  anchor.click();
}

export function Flight2DViewport({ glider, report, tests }: Props) {
  const latestMeasured = [...tests].reverse().find(test => test.measuredMassGrams !== undefined);
  const baselineMass = report.massBreakdown.totalGrams;
  const latestCamber = [...tests].reverse().find(test => test.wingCamberState && test.wingCamberState !== 'unknown');
  const baselineCamber = glider.wing.camberPercent;
  const [massText, setMassText] = useState('');
  const [camberOverride, setCamberOverride] = useState<number | null>(null);
  const [height, setHeight] = useState(1.5);
  const [speedOverride, setSpeedOverride] = useState<number | null>(null);
  const [angle, setAngle] = useState(0);
  const [attackOverride, setAttackOverride] = useState<number | null>(null);
  const [assumptions, setAssumptions] = useState<AeroAssumptions>(DEFAULT_AERO_ASSUMPTIONS);
  const [elapsed, setElapsed] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [shareMessage, setShareMessage] = useState('');
  const mass = massText === '' ? baselineMass : Number(massText);
  const camber = camberOverride ?? baselineCamber;
  const attack = attackOverride ?? glider.fuselage.wingSlot.angleDeg;
  const suggestedSpeed = report.wingAreaMm2 > 0 && mass > 0
    ? speedForLiftCoefficient(mass, report.wingAreaMm2, 0.8) * 1.2 : 4;
  const speed = speedOverride ?? Number(suggestedSpeed.toFixed(1));
  const input: Flight2DInput = {
    massGrams: mass, wingAreaMm2: report.wingAreaMm2, aspectRatio: report.aspectRatio,
    camberPercent: camber, releaseHeightM: height,
    launchSpeedMs: speed, launchAngleDeg: angle, angleOfAttackDeg: attack, assumptions,
  };
  const result = useMemo(() => {
    try { return simulateFlight2D(input); } catch { return null; }
  // Values are the actual simulation inputs; a new object is made for each render.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mass, report.wingAreaMm2, report.aspectRatio, camber, height, speed, angle, attack, assumptions]);
  const performance = useMemo(() => {
    try { return calculateDesignPerformance({
      massGrams: mass, wingAreaMm2: report.wingAreaMm2,
      aspectRatio: report.aspectRatio, meanAerodynamicChordMm: report.meanAerodynamicChordMm,
      camberPercent: camber, angleOfAttackDeg: attack, speedMs: speed, assumptions,
    }); } catch { return null; }
  }, [mass, report.wingAreaMm2, report.aspectRatio, report.meanAerodynamicChordMm, camber, attack, speed, assumptions]);

  useEffect(() => {
    if (!playing || !result) return;
    const started = window.performance.now() - elapsed * 1000;
    let frame = 0;
    const animate = () => {
      const next = Math.min(result.durationS, (window.performance.now() - started) / 1000);
      setElapsed(next);
      if (next < result.durationS) frame = requestAnimationFrame(animate);
      else setPlaying(false);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  // Starting playback captures the current playhead; the animation itself updates elapsed.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, result]);

  const geometry = result ? trajectoryGeometry(result, height) : null;
  const point = result?.points.reduce((nearest, candidate) => Math.abs(candidate.timeS - elapsed) < Math.abs(nearest.timeS - elapsed) ? candidate : nearest, result.points[0]);
  const changeAssumption = (key: keyof AeroAssumptions, value: number) =>
    setAssumptions(previous => ({ ...previous, [key]: value }));
  const field = (label: string, value: number | string, setter: (value: number) => void, min: number, max: number, step: number, unit: string) => (
    <label className="flex flex-col gap-1 text-xs text-slate-300">{label}
      <div className="flex items-center gap-1 rounded-md border border-slate-700 bg-slate-950 px-2">
        <input type="number" min={min} max={max} step={step} value={value}
          onChange={event => setter(Number(event.target.value))}
          className="min-w-0 w-full bg-transparent py-2 text-sm text-slate-100 outline-none" />
        <span className="text-slate-500">{unit}</span>
      </div>
    </label>
  );
  const shareText = result ? `${glider.name}: ${result.rangeM.toFixed(1)} m modeled 2D flight from ${height.toFixed(2)} m at ${speed.toFixed(1)} m/s. ${mass.toFixed(2)} g; CD0 ${assumptions.profileDragCoefficient.toFixed(2)}, CL limit ${assumptions.maximumLiftCoefficient.toFixed(2)}, span efficiency ${assumptions.spanEfficiency.toFixed(2)}. Exploratory model; real flight may differ. #BalsaPlaneDesigner` : '';
  const share = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: `${glider.name} flight exploration`, text: shareText });
        setShareMessage('Shared flight summary.');
      } else {
        await navigator.clipboard.writeText(shareText);
        setShareMessage('Flight summary copied. Download the card to share its image.');
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setShareMessage('Sharing was unavailable. You can still download the flight card.');
    }
  };

  return <div className="flex h-full flex-col overflow-y-auto bg-[#08111f] text-slate-100">
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-800 px-4 py-3">
      <div><h2 className="text-lg font-bold">2D flight simulator</h2>
        <p className="max-w-3xl text-xs leading-relaxed text-slate-400">Explore any design using its wing outline and balsa-based mass. Lift follows the design camber line and wing aspect ratio; drag and maximum lift remain adjustable assumptions. This fixed-angle-of-attack model does not resolve pitch, trim, turns, or airflow separation.</p></div>
      <span className="rounded border border-amber-700/60 bg-amber-950/50 px-2 py-1 text-xs text-amber-200">Exploratory model</span>
    </div>
    <div className="grid gap-3 p-4 lg:grid-cols-[minmax(0,1fr)_15rem]">
      <div className="min-w-0">
        <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-900">
          {result && geometry ? <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={`Modeled flight path: ${result.rangeM.toFixed(1)} meters in ${result.durationS.toFixed(1)} seconds`} className="w-full">
            <defs><linearGradient id="flight-sky" x2="0" y2="1"><stop stopColor="#10253b" /><stop offset="1" stopColor="#172635" /></linearGradient></defs>
            <rect width={WIDTH} height={HEIGHT} fill="url(#flight-sky)" />
            {[0.25, 0.5, 0.75].map(fraction => <line key={fraction} x1="55" x2="865" y1={geometry.toY(geometry.maxY * fraction)} y2={geometry.toY(geometry.maxY * fraction)} stroke="#334155" strokeDasharray="5 7" />)}
            <line x1="55" x2="865" y1={geometry.toY(0)} y2={geometry.toY(0)} stroke="#84cc16" strokeWidth="3" />
            <path d={geometry.path} fill="none" stroke="#22d3ee" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx={geometry.toX(0)} cy={geometry.toY(height)} r="6" fill="#f8fafc" />
            {point && <g transform={`translate(${geometry.toX(point.xM)} ${geometry.toY(point.heightM)})`}><circle r="11" fill="#fbbf24" stroke="#fff7ed" strokeWidth="2" /><path d="M -16 0 L 14 -5 L 8 0 L 14 5 Z" fill="#fbbf24" /></g>}
            <text x="60" y="400" fill="#cbd5e1" fontSize="15">0 m</text>
            <text x="805" y="400" fill="#cbd5e1" fontSize="15">{geometry.maxX} m</text>
            <text x="60" y="35" fill="#cbd5e1" fontSize="15">{geometry.maxY} m height</text>
          </svg> : <div className="p-8 text-sm text-amber-200">Enter valid positive mass, height, and speed values.</div>}
        </div>
        {result && <div className="mt-3 flex items-center gap-3">
          <button type="button" onClick={() => { if (elapsed >= result.durationS) setElapsed(0); setPlaying(!playing); }}
            className="flex items-center gap-1 rounded-md bg-cyan-500 px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-400">
            {playing ? <Pause size={14} /> : <Play size={14} />}{playing ? 'Pause' : elapsed >= result.durationS ? 'Replay' : 'Play'}
          </button>
          <input aria-label="Flight time" type="range" min="0" max={result.durationS} step="0.01" value={clamp(elapsed, 0, result.durationS)}
            onChange={event => { setPlaying(false); setElapsed(Number(event.target.value)); }} className="min-w-0 flex-1 accent-cyan-400" />
          <span className="w-16 text-right text-xs tabular-nums text-slate-300">{clamp(elapsed, 0, result.durationS).toFixed(1)} s</span>
        </div>}
        {result && <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[['Modeled range', `${result.rangeM.toFixed(1)} m`], ['Time aloft', `${result.durationS.toFixed(1)} s`], ['Wing area', `${(report.wingAreaMm2 / 10000).toFixed(2)} dm²`], ['Assumed CL limit speed', `${result.minimumSupportSpeedMs.toFixed(1)} m/s`]].map(([label, value]) =>
            <div key={label} className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2"><p className="text-[11px] text-slate-400">{label}</p><p className="font-semibold tabular-nums">{value}</p></div>)}
        </div>}
        {performance && <section className="mt-3 rounded-xl border border-slate-700 bg-slate-900 p-3" aria-label="Design-based aerodynamic calculations">
          <h3 className="text-sm font-semibold text-slate-100">From this design and mass</h3>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {[
              ['Wing loading', `${performance.wingLoadingGDm2.toFixed(2)} g/dm²`],
              ['Reynolds number', `${Math.round(performance.reynoldsNumber).toLocaleString()}`],
              ['Lift coefficient needed', performance.requiredLiftCoefficient.toFixed(2)],
              ['Wing aspect ratio', report.aspectRatio.toFixed(2)],
              ['Mean aero chord', `${report.meanAerodynamicChordMm.toFixed(1)} mm`],
              ['Lift / weight at speed', `${(performance.liftNewtons / performance.weightNewtons).toFixed(2)}×`],
            ].map(([label, value]) => <div key={label} className="rounded-md bg-slate-950/80 px-2.5 py-2">
              <p className="text-[11px] text-slate-400">{label}</p><p className="text-sm font-semibold tabular-nums">{value}</p>
            </div>)}
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-slate-400">The lift coefficient needed is weight ÷ (½ × air density × speed² × wing area), assuming the wing alone supports the weight at the selected speed. Reynolds number uses the mean aerodynamic chord and standard-air assumptions. The speed at the assumed CL limit is a scenario, not a measured stall speed.</p>
          {performance.requiredLiftCoefficient > assumptions.maximumLiftCoefficient && <p className="mt-1 text-xs text-amber-300">At this speed, level support would require more lift than the chosen CL limit.</p>}
          <div className="mt-3 border-t border-slate-700 pt-2 text-xs text-slate-300">
            At {attack.toFixed(1)}° attack, the model gives CL {performance.liftCoefficient.toFixed(2)}, CD {performance.dragCoefficient.toFixed(3)}
            {' '}({performance.inducedDragCoefficient.toFixed(3)} induced), zero-lift angle {performance.zeroLiftAngleDeg.toFixed(1)}°, and coefficient L/D {performance.liftToDragRatio.toFixed(1)}.
            {performance.liftLimited && <span className="text-amber-300"> Lift has reached the assumed CL limit.</span>}
          </div>
        </section>}
        {result?.reachedLowSpeed && <p className="mt-2 text-xs text-amber-300">The path passes below the speed that would support this weight at the assumed CL limit. This is a low-speed flag, not a stall prediction.</p>}
        {result && !result.endedAtGround && <p className="mt-2 text-xs text-amber-300">Simulation stopped at its time or range limit.</p>}
      </div>
      <aside className="space-y-3 rounded-xl border border-slate-700 bg-slate-900 p-3">
        <h3 className="text-sm font-semibold">Launch setup</h3>
        <label className="flex flex-col gap-1 text-xs text-slate-300">Assembled mass (g)
          <input type="number" min="0.1" max="1000" step="0.01" value={massText === '' ? baselineMass : massText}
            onChange={event => setMassText(event.target.value)} className="rounded-md border border-slate-700 bg-slate-950 px-2 py-2 text-sm text-slate-100" />
        </label>
        <p className="text-[11px] text-slate-400">{massText ? 'Manual mass override' : `Design estimate from ${glider.material.densityKgM3} kg/m³ balsa and ${glider.fuselage.noseBallastGrams.toFixed(2)} g nose ballast`}.</p>
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {latestMeasured && <button type="button" onClick={() => setMassText(String(latestMeasured.measuredMassGrams))} className="text-left text-xs text-cyan-300 underline hover:text-cyan-200">Use recorded mass ({latestMeasured.measuredMassGrams} g)</button>}
          {massText && <button type="button" onClick={() => setMassText('')} className="text-left text-xs text-cyan-300 underline hover:text-cyan-200">Use design estimate</button>}
        </div>
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
          {field('Release height', height, setHeight, 0.2, 10, 0.01, 'm')}
          {field('Launch speed', speed, setSpeedOverride, 0.5, 30, 0.1, 'm/s')}
          {field('Launch angle', angle, setAngle, -30, 30, 1, '°')}
          {field('Fixed wing angle of attack', attack, setAttackOverride, -5, 15, 0.5, '°')}
          {field('Wing camber in model', camber, setCamberOverride, 0, 8, 0.5, '%')}
        </div>
        <p className="text-[11px] text-slate-400">{speedOverride === null ? 'Initial speed is 1.2× the design-based support speed at an illustrative CL of 0.8.' : 'Manual launch speed.'} {attackOverride === null ? 'Initial wing attack uses design wing incidence, assuming the fuselage follows the flight path.' : 'Wing attack is manually overridden.'} {camberOverride === null ? 'Camber uses the design target.' : 'Camber is manually overridden.'}</p>
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {speedOverride !== null && <button type="button" onClick={() => setSpeedOverride(null)} className="text-left text-xs text-cyan-300 underline hover:text-cyan-200">Use design-based speed</button>}
          {attackOverride !== null && <button type="button" onClick={() => setAttackOverride(null)} className="text-left text-xs text-cyan-300 underline hover:text-cyan-200">Use design wing incidence</button>}
          {latestCamber?.wingCamberState === 'flat' && <button type="button" onClick={() => setCamberOverride(0)} className="text-left text-xs text-cyan-300 underline hover:text-cyan-200">Use recorded flat wing</button>}
          {camberOverride !== null && <button type="button" onClick={() => setCamberOverride(null)} className="text-left text-xs text-cyan-300 underline hover:text-cyan-200">Use design camber</button>}
        </div>
        <details className="rounded-md border border-slate-700 bg-slate-950/70 p-2 text-xs text-slate-300">
          <summary className="cursor-pointer font-semibold text-slate-200">Aerodynamic assumptions</summary>
          <div className="mt-2 space-y-2">
            {field('Profile drag CD₀', assumptions.profileDragCoefficient, value => changeAssumption('profileDragCoefficient', value), 0.01, 0.3, 0.01, '')}
            {field('Maximum lift CL', assumptions.maximumLiftCoefficient, value => changeAssumption('maximumLiftCoefficient', value), 0.3, 1.5, 0.05, '')}
            {field('Span efficiency', assumptions.spanEfficiency, value => changeAssumption('spanEfficiency', value), 0.3, 1, 0.05, '')}
            <p className="leading-relaxed text-slate-400">These are scenario inputs because section drag, separation, and maximum lift cannot be determined from outline and material mass alone. They apply to the graph and trajectory.</p>
            <button type="button" onClick={() => setAssumptions(DEFAULT_AERO_ASSUMPTIONS)} className="text-cyan-300 underline hover:text-cyan-200">Reset assumptions</button>
          </div>
        </details>
        <p className="text-[11px] leading-relaxed text-slate-400">Wing incidence is a geometric starting point, not a trim solution. The model holds attack fixed as speed and flight path change. Compare settings to see sensitivity; matching one throw would not calibrate the model.</p>
        <div className="flex flex-wrap gap-2 border-t border-slate-700 pt-3">
          <button type="button" disabled={!result} onClick={share} className="flex items-center gap-1 rounded-md border border-slate-600 px-2 py-1.5 text-xs hover:bg-slate-800 disabled:opacity-40"><Share2 size={14} /> Share summary</button>
          <button type="button" disabled={!result} onClick={() => result && downloadCard(glider.name, result, input)} className="flex items-center gap-1 rounded-md border border-slate-600 px-2 py-1.5 text-xs hover:bg-slate-800 disabled:opacity-40"><Download size={14} /> Flight card PNG</button>
        </div>
        {shareMessage && <p role="status" className="text-xs text-cyan-300">{shareMessage}</p>}
      </aside>
    </div>
  </div>;
}
