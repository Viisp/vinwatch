'use client';
import { Minus, Plus } from 'lucide-react';
import { Button, Group, Input, NumberField } from 'react-aria-components';

interface NumberInputProps {
  label?: string;
  value: number | undefined;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  formatOptions?: Intl.NumberFormatOptions;
}

export function NumberInput({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  formatOptions,
}: NumberInputProps) {
  return (
    <NumberField
      value={value}
      onChange={onChange}
      minValue={min}
      maxValue={max}
      step={step}
      formatOptions={formatOptions}
    >
      {label && (
        <div className="text-sm text-slate-300 mb-1">{label}</div>
      )}
      <Group className="relative inline-flex h-10 w-full items-center overflow-hidden rounded-lg border border-[#243552] bg-[#0d1b2a] text-sm shadow-sm transition-colors data-[focus-within]:border-[#00c896]">
        <Button
          slot="decrement"
          className="flex aspect-square h-full items-center justify-center border-r border-[#243552] bg-[#0d1b2a] text-slate-400 hover:bg-[#243552] hover:text-slate-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Minus size={14} strokeWidth={2} />
        </Button>
        <Input className="w-full grow bg-transparent px-3 py-2 text-center tabular-nums text-slate-100 focus:outline-none placeholder:text-slate-500" />
        <Button
          slot="increment"
          className="flex aspect-square h-full items-center justify-center border-l border-[#243552] bg-[#0d1b2a] text-slate-400 hover:bg-[#243552] hover:text-slate-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Plus size={14} strokeWidth={2} />
        </Button>
      </Group>
    </NumberField>
  );
}
