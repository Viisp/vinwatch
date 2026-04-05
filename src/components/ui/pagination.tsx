'use client';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  // Génère les numéros à afficher avec ellipsis
  const getPages = () => {
    const pages: (number | '…')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push('…');
      for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
      if (page < totalPages - 2) pages.push('…');
      pages.push(totalPages);
    }
    return pages;
  };

  const btn = 'flex items-center justify-center w-8 h-8 rounded-lg text-sm font-medium transition-all active:scale-95';

  return (
    <div className="flex items-center justify-center gap-1 pt-4">
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        className={`${btn} text-slate-400 hover:bg-[#243552] hover:text-slate-100 disabled:opacity-30 disabled:cursor-not-allowed`}
        aria-label="Page précédente"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      {getPages().map((p, i) =>
        p === '…' ? (
          <span key={`ellipsis-${i}`} className="w-8 h-8 flex items-center justify-center text-slate-500 text-sm">…</span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => onPageChange(p)}
            className={`${btn} ${
              p === page
                ? 'bg-[#00c896] text-[#0d1b2a] font-semibold'
                : 'text-slate-400 border border-[#243552] hover:bg-[#243552] hover:text-slate-100'
            }`}
          >
            {p}
          </button>
        )
      )}

      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages}
        className={`${btn} text-slate-400 hover:bg-[#243552] hover:text-slate-100 disabled:opacity-30 disabled:cursor-not-allowed`}
        aria-label="Page suivante"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
