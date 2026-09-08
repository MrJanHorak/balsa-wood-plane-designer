'use client';

import React from 'react';

interface SliderInputProps {
  label: string;
  simpleLabel?: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit: string;
  description?: string;
  isSimpleMode?: boolean;
  onChange: (val: number) => void;
}

export const SliderInput: React.FC<SliderInputProps> = ({
  label,
  simpleLabel,
  value,
  min,
  max,
  step = 1,
  unit,
  description,
  isSimpleMode = false,
  onChange,
}) => {
  const displayLabel = isSimpleMode && simpleLabel ? simpleLabel : label;

  return (
    <div className="space-y-1.5 py-2 border-b border-slate-800/60 last:border-b-0">
      <div className="flex items-center justify-between text-xs">
        <div className="flex flex-col">
          <span className="font-semibold text-slate-200">{displayLabel}</span>
          {description && (
            <span className="text-[10px] text-slate-400 font-normal leading-tight">
              {description}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 font-mono text-xs px-2 py-0.5 rounded bg-slate-800/80 text-amber-300 border border-slate-700/80">
          <span>{Number(value.toFixed(1))}</span>
          <span className="text-slate-400 text-[10px]">{unit}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500 hover:accent-amber-400 transition-all"
        />
      </div>
    </div>
  );
};
