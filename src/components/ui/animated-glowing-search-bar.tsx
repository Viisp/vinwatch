'use client';
import React from 'react';
import { Search } from 'lucide-react';

interface SearchComponentProps {
  value?: string;
  onChange?: (v: string) => void;
  placeholder?: string;
}

const SearchComponent = ({
  value,
  onChange,
  placeholder = "Rechercher une dépense...",
}: SearchComponentProps) => {
  return (
    <div className="relative flex items-center w-full max-w-xs">
      <Search className="absolute left-3 w-4 h-4 text-slate-500 pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        placeholder={placeholder}
        className="w-full h-10 bg-[#1a2d42] border border-[#243552] rounded-lg pl-9 pr-10 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-[#00c896] transition-colors"
      />
    </div>
  );
};

export default SearchComponent;
