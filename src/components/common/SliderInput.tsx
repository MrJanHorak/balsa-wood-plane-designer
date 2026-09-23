'use client';

import React, { useId } from 'react';

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
  const inputId = useId();
  const descriptionId = useId();

  return (
    <div className="space-y-1.5 py-2 border-b border-slate-800/60 last:border-b-0">
      <div className="flex items-center justify-between text-xs">
        <div className="flex min-w-0 flex-col">
          <label htmlFor={inputId} className="font-semibold text-slate-100">{displayLabel}</label>
          {description && (
            <span id={descriptionId} className="text-xs text-slate-300 font-normal leading-snug">
              {description}
            </span>
          )}
        </div>
        <output htmlFor={inputId} className="ml-2 flex shrink-0 items-center gap-1 rounded border border-slate-700/80 bg-slate-800/80 px-2 py-0.5 font-mono text-xs text-amber-300">
          <span>{Number(value.toFixed(1))}</span>
          <span className="text-slate-300 text-xs">{unit}</span>
        </output>
      </div>

      <div className="flex items-center gap-2">
        <input
          id={inputId}
          aria-describedby={description ? descriptionId : undefined}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="h-7 w-full cursor-pointer accent-amber-500"
        />
      </div>
    </div>
  );
};
