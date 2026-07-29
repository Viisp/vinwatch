// src/components/dashboard/dashboard-client.tsx
'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { HeroGeometric } from '@/components/ui/shape-landing-hero';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getOrders } from '@/lib/vinted-orders';
import { computeOrdersSummary, type StoredOrder, type OrdersSummary } from '@/lib/vinted-calculations';
import { TrendingUp, TrendingDown, Wallet, PackageCheck } from 'lucide-react';
import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
} from 'chart.js';

Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend);

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
}

function toLocalDayKey(isoDate: string): string {
  const date = new Date(isoDate);
  // en-CA formats as YYYY-MM-DD, which is what we want for sortable day keys
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(date);
}

function buildDailySeries(orders: StoredOrder[], type: 'sold' | 'purchased'): { labels: string[]; data: number[] } {
  const byDay: Record<string, number> = {};
  for (const o of orders) {
    if (o.orderType !== type) continue;
    const day = toLocalDayKey(o.orderDate);
    byDay[day] = (byDay[day] || 0) + (parseFloat(o.priceAmount) || 0);
  }
  const days = Object.keys(byDay).sort();
  return { labels: days, data: days.map((d) => byDay[d]) };
}

export function DashboardClient() {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<Chart | null>(null);
  const [summary, setSummary] = useState<OrdersSummary>({
    totalSold: 0, totalPurchased: 0, delta: 0, soldCount: 0, purchasedCount: 0,
  });
  const [orders, setOrders] = useState<StoredOrder[]>([]);
  const [hasData, setHasData] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getOrders().then((data) => {
      setOrders(data);
      setSummary(computeOrdersSummary(data));
      setHasData(data.length > 0);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!hasData || !chartRef.current) return;
    if (chartInstanceRef.current) chartInstanceRef.current.destroy();

    const sold = buildDailySeries(orders, 'sold');
    const purchased = buildDailySeries(orders, 'purchased');
    const allDays = Array.from(new Set([...sold.labels, ...purchased.labels])).sort();

    if (allDays.length === 0) return;

    chartInstanceRef.current = new Chart(chartRef.current, {
      type: 'line',
      data: {
        labels: allDays,
        datasets: [
          {
            label: 'Ventes',
            data: allDays.map((d) => sold.labels.includes(d) ? sold.data[sold.labels.indexOf(d)] : 0),
            borderColor: '#00c896',
            backgroundColor: '#00c89622',
            tension: 0.3,
          },
          {
            label: 'Achats',
            data: allDays.map((d) => purchased.labels.includes(d) ? purchased.data[purchased.labels.indexOf(d)] : 0),
            borderColor: '#ef4444',
            backgroundColor: '#ef444422',
            tension: 0.3,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: { legend: { labels: { color: '#94a3b8' } } },
        scales: {
          x: { ticks: { color: '#64748b' }, grid: { color: '#243552' } },
          y: { ticks: { color: '#64748b' }, grid: { color: '#243552' } },
        },
      },
    });
  }, [hasData, orders]);

  return (
    <div className="relative">
      <HeroGeometric
        badge="Suivi Vinted automatique"
        title1="Vos ventes et achats"
        title2="Vinted, en un coup d'œil."
        description="Synchronisation automatique de tes commandes Vinted, sans jamais toucher à ton compte."
      />

      <div className="mx-auto max-w-7xl px-4 pb-10 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-8">
          <Card className="bg-[#1a2d42]/80 border-[#243552] backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#00c896]" />
                Total ventes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-[#00c896]">{formatCurrency(summary.totalSold)}</p>
              <p className="text-xs text-slate-500 mt-1">{summary.soldCount} vente{summary.soldCount > 1 ? 's' : ''}</p>
            </CardContent>
          </Card>

          <Card className="bg-[#1a2d42]/80 border-[#243552] backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-red-400" />
                Total achats
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-red-400">{formatCurrency(summary.totalPurchased)}</p>
              <p className="text-xs text-slate-500 mt-1">{summary.purchasedCount} achat{summary.purchasedCount > 1 ? 's' : ''}</p>
            </CardContent>
          </Card>

          <Card className="bg-[#1a2d42]/80 border-[#243552] backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
                <Wallet className="w-4 h-4 text-[#00c896]" />
                Delta
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold ${summary.delta >= 0 ? 'text-[#00c896]' : 'text-red-400'}`}>
                {formatCurrency(summary.delta)}
              </p>
              <p className="text-xs text-slate-500 mt-1">Ventes − achats</p>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-[#1a2d42]/80 border-[#243552] backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-slate-100">Évolution</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center min-h-[260px]">
            {loading ? (
              <p className="text-slate-500 text-sm">Chargement…</p>
            ) : hasData ? (
              <canvas ref={chartRef} />
            ) : (
              <div className="flex flex-col items-center gap-2 text-center">
                <PackageCheck className="w-8 h-8 text-slate-600" />
                <p className="text-slate-400 text-sm font-medium">Aucune donnée pour l&apos;instant</p>
                <Link href="/parametres" className="text-xs text-[#00c896] hover:underline">
                  Configurer la synchronisation →
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
