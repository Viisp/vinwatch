'use client';
import { useState, useEffect } from 'react';

interface GradientPickerProps {
  value?: string;
  onChange: (gradient: string) => void;
  label?: string;
}

function parseGradient(css: string) {
  const match = css.match(/linear-gradient\((\d+)deg,\s*(#[0-9a-fA-F]{6})\s*0%,\s*(#[0-9a-fA-F]{6})\s*100%\)/);
  if (match) return { angle: parseInt(match[1]), from: match[2], to: match[3] };
  return { angle: 135, from: '#00c896', to: '#3b82f6' };
}

export function GradientPicker({ value, onChange, label }: GradientPickerProps) {
  const parsed = parseGradient(value ?? '');
  const [angle, setAngle] = useState(parsed.angle);
  const [from, setFrom] = useState(parsed.from);
  const [to, setTo] = useState(parsed.to);

  useEffect(() => {
    if (value) {
      const p = parseGradient(value);
      setAngle(p.angle); setFrom(p.from); setTo(p.to);
    }
  }, [value]);

  const emit = (a: number, f: string, t: string) => {
    onChange(`linear-gradient(${a}deg, ${f} 0%, ${t} 100%)`);
  };

  const gradient = `linear-gradient(${angle}deg, ${from} 0%, ${to} 100%)`;

  return (
    <div className="flex flex-col gap-3">
      {label && <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</p>}

      {/* Preview */}
      <div className="h-10 w-full rounded-xl border border-[#243552]" style={{ background: gradient }} />

      {/* Controls */}
      <div className="flex items-center gap-3">
        {/* Color from */}
        <div className="flex flex-col items-center gap-1">
          <label className="text-[10px] text-slate-500">Début</label>
          <div className="relative w-8 h-8 rounded-lg overflow-hidden border-2 border-[#243552] cursor-pointer" style={{ backgroundColor: from }}>
            <input
              type="color"
              value={from}
              onChange={(e) => { setFrom(e.target.value); emit(angle, e.target.value, to); }}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
          </div>
        </div>

        {/* Angle slider */}
        <div className="flex-1 flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <label className="text-[10px] text-slate-500">Angle</label>
            <span className="text-[10px] text-slate-400">{angle}°</span>
          </div>
          <input
            type="range"
            min={0}
            max={360}
            value={angle}
            onChange={(e) => { const v = parseInt(e.target.value); setAngle(v); emit(v, from, to); }}
            className="w-full h-1.5 rounded-full accent-[#00c896] cursor-pointer"
          />
        </div>

        {/* Color to */}
        <div className="flex flex-col items-center gap-1">
          <label className="text-[10px] text-slate-500">Fin</label>
          <div className="relative w-8 h-8 rounded-lg overflow-hidden border-2 border-[#243552] cursor-pointer" style={{ backgroundColor: to }}>
            <input
              type="color"
              value={to}
              onChange={(e) => { setTo(e.target.value); emit(angle, from, e.target.value); }}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
