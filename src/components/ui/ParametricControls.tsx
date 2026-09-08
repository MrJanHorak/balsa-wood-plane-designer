'use client';

import React, { useState } from 'react';
import { GliderDesign, UIMode, WingMountType } from '@/types/glider';
import { SliderInput } from '@/components/common/SliderInput';
import { Plane, Sliders, Shield, Weight } from 'lucide-react';

const MOUNT_TYPE_OPTIONS: { value: WingMountType; label: string; simpleLabel: string }[] = [
  { value: 'through_slot', label: 'Through-Slot', simpleLabel: 'Wing Through Body' },
  { value: 'top_saddle', label: 'Top Saddle', simpleLabel: 'Wing on Top' },
  { value: 'parasol_pylon', label: 'Parasol Pylon', simpleLabel: 'Wing on Strut' },
  { value: 'bottom_saddle', label: 'Bottom Saddle', simpleLabel: 'Wing Underneath' },
];

interface ParametricControlsProps {
  glider: GliderDesign;
  mode: UIMode;
  onChange: (updated: GliderDesign) => void;
}

export const ParametricControls: React.FC<ParametricControlsProps> = ({
  glider,
  mode,
  onChange,
}) => {
  const isSimple = mode === 'simple';
  const [activeSection, setActiveSection] = useState<'wing' | 'fuse' | 'tail' | 'ballast'>('wing');

  const updateWing = (fields: Partial<GliderDesign['wing']>) => {
    onChange({
      ...glider,
      wing: { ...glider.wing, ...fields },
    });
  };

  const updateFuselage = (fields: Partial<GliderDesign['fuselage']>) => {
    onChange({
      ...glider,
      fuselage: { ...glider.fuselage, ...fields },
    });
  };

  const updateWingSlot = (fields: Partial<GliderDesign['fuselage']['wingSlot']>) => {
    onChange({
      ...glider,
      fuselage: {
        ...glider.fuselage,
        wingSlot: { ...glider.fuselage.wingSlot, ...fields },
      },
    });
  };

  const updateTail = (fields: Partial<GliderDesign['horizontalStabilizer']>) => {
    onChange({
      ...glider,
      horizontalStabilizer: { ...glider.horizontalStabilizer, ...fields },
    });
  };

  const updateTailSlot = (fields: Partial<GliderDesign['fuselage']['tailSlot']>) => {
    onChange({
      ...glider,
      fuselage: {
        ...glider.fuselage,
        tailSlot: { ...glider.fuselage.tailSlot, ...fields },
      },
    });
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/90 backdrop-blur-md rounded-xl border border-slate-800 shadow-xl overflow-hidden">
      {/* Section Tabs */}
      <div className="flex border-b border-slate-800 bg-slate-950/60 p-1 gap-1">
        <button
          onClick={() => setActiveSection('wing')}
          className={`flex-1 py-2 px-1 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
            activeSection === 'wing'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Plane className="w-3.5 h-3.5" />
          <span>{isSimple ? 'Wing' : 'Main Wing'}</span>
        </button>

        <button
          onClick={() => setActiveSection('fuse')}
          className={`flex-1 py-2 px-1 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
            activeSection === 'fuse'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>{isSimple ? 'Body' : 'Fuselage'}</span>
        </button>

        <button
          onClick={() => setActiveSection('tail')}
          className={`flex-1 py-2 px-1 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
            activeSection === 'tail'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          <span>{isSimple ? 'Tail' : 'Empennage'}</span>
        </button>

        <button
          onClick={() => setActiveSection('ballast')}
          className={`flex-1 py-2 px-1 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
            activeSection === 'ballast'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Weight className="w-3.5 h-3.5" />
          <span>{isSimple ? 'Ballast' : 'Trim Weight'}</span>
        </button>
      </div>

      {/* Sliders Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1">
        {/* 1. Main Wing Section */}
        {activeSection === 'wing' && (
          <div>
            <SliderInput
              label="Wingspan (b)"
              simpleLabel="Wing Width (Span)"
              value={glider.wing.spanMm}
              min={180}
              max={550}
              step={5}
              unit="mm"
              description="Total tip-to-tip span. Wider wings glide further with less drag."
              isSimpleMode={isSimple}
              onChange={(v) => updateWing({ spanMm: v })}
            />

            <SliderInput
              label="Root Chord (c_r)"
              simpleLabel="Wing Center Width"
              value={glider.wing.rootChordMm}
              min={35}
              max={95}
              step={1}
              unit="mm"
              description="Width of wing where it locks into fuselage slot."
              isSimpleMode={isSimple}
              onChange={(v) => updateWing({ rootChordMm: v })}
            />

            <SliderInput
              label="Tip Chord (c_t)"
              simpleLabel="Wingtip Width"
              value={glider.wing.tipChordMm}
              min={20}
              max={80}
              step={1}
              unit="mm"
              description="Width at wingtips. Tapered tips reduce induced drag."
              isSimpleMode={isSimple}
              onChange={(v) => updateWing({ tipChordMm: v })}
            />

            <SliderInput
              label="Dihedral Angle (Γ)"
              simpleLabel="Upward Wing V-Angle (Dihedral)"
              value={glider.wing.dihedralDeg}
              min={0}
              max={15}
              step={0.5}
              unit="°"
              description="Angles wings up in a 'V'. Essential to keep glider from rolling over!"
              isSimpleMode={isSimple}
              onChange={(v) => updateWing({ dihedralDeg: v })}
            />

            <SliderInput
              label="Leading-Edge Sweep (Λ)"
              simpleLabel="Wing Backward Sweep"
              value={glider.wing.sweepDeg}
              min={0}
              max={25}
              step={1}
              unit="°"
              description="Sweeps wings backward like a jet dart."
              isSimpleMode={isSimple}
              onChange={(v) => updateWing({ sweepDeg: v })}
            />

            <SliderInput
              label="Sheet Camber (Wood Curvature)"
              simpleLabel="Wing Arch Curve (Camber)"
              value={glider.wing.camberPercent}
              min={0}
              max={8}
              step={0.5}
              unit="%"
              description="Pre-forming wood curvature adds aerodynamic lift."
              isSimpleMode={isSimple}
              onChange={(v) => updateWing({ camberPercent: v })}
            />
          </div>
        )}

        {/* 2. Fuselage & Slot Section */}
        {activeSection === 'fuse' && (
          <div>
            <div className="py-2 border-b border-slate-800/60 space-y-1.5">
              <span className="text-xs font-semibold text-slate-200 block">
                {isSimple ? 'How the Wing Attaches' : 'Wing Mount Type'}
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                {MOUNT_TYPE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => updateFuselage({ mountType: opt.value })}
                    className={`py-1.5 px-1.5 text-[11px] font-semibold rounded-md border transition-colors ${
                      glider.fuselage.mountType === opt.value
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md'
                        : 'bg-slate-800/60 text-slate-300 border-slate-700 hover:bg-slate-800'
                    }`}
                  >
                    {isSimple ? opt.simpleLabel : opt.label}
                  </button>
                ))}
              </div>
              <span className="text-[10px] text-slate-400 font-normal leading-tight block">
                Controls how the wing physically joins the fuselage. The 3D model automatically
                grows a saddle notch or support pylon so the wing is never left floating.
              </span>
            </div>

            <SliderInput
              label="Wing Slot Height (Y_wing)"
              simpleLabel="Wing Up/Down Position"
              value={glider.fuselage.wingSlot.yPositionMm}
              min={0}
              max={glider.fuselage.maxHeightMm + 40}
              step={1}
              unit="mm"
              description="Raises or lowers the wing relative to the fuselage. Try raising it high to see a parasol pylon appear."
              isSimpleMode={isSimple}
              onChange={(v) => updateWingSlot({ yPositionMm: v })}
            />

            {glider.fuselage.mountType === 'parasol_pylon' && (
              <SliderInput
                label="Pylon Width"
                simpleLabel="Strut Width"
                value={glider.fuselage.pylonWidthMm}
                min={10}
                max={40}
                step={1}
                unit="mm"
                description="Width of the cabane strut connecting the fuselage to the elevated wing."
                isSimpleMode={isSimple}
                onChange={(v) => updateFuselage({ pylonWidthMm: v })}
              />
            )}

            <SliderInput
              label="Fuselage Length"
              simpleLabel="Airplane Total Length"
              value={glider.fuselage.lengthMm}
              min={160}
              max={380}
              step={5}
              unit="mm"
              description="Longer bodies provide greater tail leverage and pitch damping."
              isSimpleMode={isSimple}
              onChange={(v) => updateFuselage({ lengthMm: v })}
            />

            <SliderInput
              label="Wing Slot Position (X_wing)"
              simpleLabel="Wing Position along Body"
              value={glider.fuselage.wingSlot.xPositionMm}
              min={40}
              max={160}
              step={2}
              unit="mm"
              description="Distance of wing cutout from the nose tip."
              isSimpleMode={isSimple}
              onChange={(v) => updateWingSlot({ xPositionMm: v })}
            />

            <SliderInput
              label="Wing Incidence Angle (i_w)"
              simpleLabel="Wing Upward Tilt (Incidence)"
              value={glider.fuselage.wingSlot.angleDeg}
              min={-1}
              max={5}
              step={0.2}
              unit="°"
              description="Mounting angle of wing slot relative to fuselage centerline."
              isSimpleMode={isSimple}
              onChange={(v) => updateWingSlot({ angleDeg: v })}
            />

            <SliderInput
              label="Max Fuselage Height"
              simpleLabel="Body Height"
              value={glider.fuselage.maxHeightMm}
              min={24}
              max={55}
              step={1}
              unit="mm"
              description="Peak height of profile fuselage at wing pylon."
              isSimpleMode={isSimple}
              onChange={(v) => updateFuselage({ maxHeightMm: v })}
            />
          </div>
        )}

        {/* 3. Tail (Empennage) Section */}
        {activeSection === 'tail' && (
          <div>
            <SliderInput
              label="Horizontal Tail Span (b_t)"
              simpleLabel="Tail Width"
              value={glider.horizontalStabilizer.spanMm}
              min={70}
              max={200}
              step={5}
              unit="mm"
              description="Span of horizontal stabilizer. Larger tail increases stability!"
              isSimpleMode={isSimple}
              onChange={(v) => updateTail({ spanMm: v })}
            />

            <SliderInput
              label="Tail Root Chord (c_t)"
              simpleLabel="Tail Length (Chord)"
              value={glider.horizontalStabilizer.rootChordMm}
              min={20}
              max={55}
              step={1}
              unit="mm"
              description="Center depth of the sliding stabilizer."
              isSimpleMode={isSimple}
              onChange={(v) => updateTail({ rootChordMm: v })}
            />

            <SliderInput
              label="Tail Slot Position (X_tail)"
              simpleLabel="Tail Position along Body"
              value={glider.fuselage.tailSlot.xPositionMm}
              min={Math.max(120, glider.fuselage.wingSlot.xPositionMm + 60)}
              max={glider.fuselage.lengthMm - 10}
              step={2}
              unit="mm"
              description="Position of tail slot cutout near the rear boom."
              isSimpleMode={isSimple}
              onChange={(v) => updateTailSlot({ xPositionMm: v })}
            />

            <SliderInput
              label="Tail Decalage / Elevator Trim (i_t)"
              simpleLabel="Tail Angle Trim (Elevator)"
              value={glider.horizontalStabilizer.incidenceDeg}
              min={-3}
              max={3}
              step={0.2}
              unit="°"
              description="Trim angle of tail. Downward tail angle pitches nose up."
              isSimpleMode={isSimple}
              onChange={(v) => updateTail({ incidenceDeg: v })}
            />
          </div>
        )}

        {/* 4. Ballast & Trim Weight Section */}
        {activeSection === 'ballast' && (
          <div>
            <SliderInput
              label="Nose Ballast (Clay/Lead)"
              simpleLabel="Nose Balance Weight (Clay)"
              value={glider.fuselage.noseBallastGrams}
              min={0}
              max={8}
              step={0.1}
              unit="g"
              description="Add modeling clay to the nose to shift Center of Gravity forward."
              isSimpleMode={isSimple}
              onChange={(v) => updateFuselage({ noseBallastGrams: v })}
            />

            <SliderInput
              label="Ballast Offset from Nose"
              simpleLabel="Weight Position on Nose"
              value={glider.fuselage.ballastPositionXMm}
              min={5}
              max={30}
              step={1}
              unit="mm"
              description="How close to the tip of the nose clay is placed."
              isSimpleMode={isSimple}
              onChange={(v) => updateFuselage({ ballastPositionXMm: v })}
            />

            <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200">
              <span className="font-semibold block mb-1">Aeronautical Rule of Thumb:</span>
              Placing ballast as far forward on the nose as possible gives the most leverage, requiring the least total added weight!
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
