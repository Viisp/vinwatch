'use client';
import { getOrders } from '@/lib/vinted-orders';
import { Share2 } from 'lucide-react';

function toCsv(rows: { title: string; priceAmount: string; priceCurrency: string; orderDate: string; status: string; orderType: string }[]): string {
  const header = 'Type,Titre,Prix,Devise,Date,Statut';
  const lines = rows.map((r) =>
    [r.orderType, `"${r.title.replace(/"/g, '""')}"`, r.priceAmount, r.priceCurrency, r.orderDate, `"${r.status}"`].join(',')
  );
  return [header, ...lines].join('\n');
}

export function ExportButton() {
  async function handleExport() {
    const orders = await getOrders();
    const csv = toCsv(orders);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vinted-export-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <button
      onClick={handleExport}
      className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-slate-100 hover:bg-[#1a2d42]/60 transition-colors cursor-pointer"
    >
      <Share2 className="w-4 h-4" />
      <span className="hidden sm:inline">Exporter</span>
    </button>
  );
}
