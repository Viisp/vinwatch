'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { HeroGeometric } from '@/components/ui/shape-landing-hero';
import { ButtonColorful } from '@/components/ui/button-colorful';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/calculations';
import { getCurrentMonthExpenses, getBudget, getAllCategories } from '@/lib/storage';
import { type Expense } from '@/types';
import { TrendingDown, Wallet, ReceiptText, PieChart, Clock, AlertTriangle } from 'lucide-react';
import {
  Chart,
  DoughnutController,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';

Chart.register(DoughnutController, ArcElement, Tooltip, Legend);

export function DashboardClient() {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<Chart | null>(null);
  const [stats, setStats] = useState({
    totalDepensé: 0,
    solde: 0,
    nbDepenses: 0,
    hasChartData: false,
    recentExpenses: [] as Expense[],
  });

  useEffect(() => {
    const expenses = getCurrentMonthExpenses();
    const budget = getBudget();
    const allCategories = getAllCategories();
    const totalDepensé = expenses.reduce((s, e) => s + e.amount, 0);
    const totalFixes = budget.fixedExpenses.reduce((s, e) => s + e.amount, 0);
    const solde = budget.income - totalFixes - totalDepensé;
    const recentExpenses = [...expenses]
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .slice(0, 5);

    const byCategory: Record<string, number> = {};
    for (const e of expenses) {
      byCategory[e.category] = (byCategory[e.category] || 0) + e.amount;
    }
    const cats = allCategories.filter((c) => byCategory[c.value] !== undefined);

    setStats({ totalDepensé, solde, nbDepenses: expenses.length, hasChartData: cats.length > 0, recentExpenses });

    if (chartRef.current) {
      if (chartInstanceRef.current) chartInstanceRef.current.destroy();

      if (cats.length > 0) {
        chartInstanceRef.current = new Chart(chartRef.current, {
          type: 'doughnut',
          data: {
            labels: cats.map((c) => `${c.emoji} ${c.label}`),
            datasets: [{ data: cats.map((c) => byCategory[c.value]), backgroundColor: cats.map((c) => c.color), borderWidth: 0 }],
          },
          options: {
            responsive: true,
            cutout: '65%',
            plugins: {
              legend: { position: 'bottom', labels: { color: '#94a3b8', boxWidth: 12, padding: 12 } },
              tooltip: { callbacks: { label: (ctx) => ` ${ctx.label}: ${formatCurrency(ctx.parsed)}` } },
            },
          },
        });
      }
    }

  }, []);

  const quickLinks = [
    { href: '/depenses', label: 'Ajouter une dépense' },
    { href: '/budget',   label: 'Gérer mon budget' },
    { href: '/pret',     label: 'Simuler un prêt' },
  ];

  return (
    <div className="relative">
      <HeroGeometric />

      <div className="mx-auto max-w-7xl px-4 pb-10 sm:px-6 lg:px-8">
        <div className="mb-8">
          <p className="text-slate-300 text-sm font-medium tracking-wide uppercase">
            {new Date().toLocaleDateString('fr-FR', {
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
            })}
          </p>
        </div>

        {/* Alerte dépassement budget */}
        {stats.solde < 0 && (
          <div className="mb-6 flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm">Budget dépassé de <strong>{formatCurrency(Math.abs(stats.solde))}</strong> ce mois-ci.</span>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-8">
          <Card className="bg-[#1a2d42]/80 border-[#243552] backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-red-400" />
                Dépenses ce mois
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-red-400">{formatCurrency(stats.totalDepensé)}</p>
              <p className="text-xs text-slate-500 mt-1">
                {stats.nbDepenses} transaction{stats.nbDepenses > 1 ? 's' : ''}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-[#1a2d42]/80 border-[#243552] backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
                <Wallet className="w-4 h-4 text-[#00c896]" />
                Solde budgétaire
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold ${stats.solde >= 0 ? 'text-[#00c896]' : 'text-red-400'}`}>
                {formatCurrency(stats.solde)}
              </p>
              <p className="text-xs text-slate-500 mt-1">Revenus − fixes − variables du mois</p>
            </CardContent>
          </Card>

          <Card className="bg-[#1a2d42]/80 border-[#243552] backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
                <ReceiptText className="w-4 h-4 text-blue-400" />
                Transactions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-blue-400">{stats.nbDepenses}</p>
              <p className="text-xs text-slate-500 mt-1">Ce mois-ci</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Chart */}
          <Card className="bg-[#1a2d42]/80 border-[#243552] backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-slate-100 flex items-center gap-2">
                <PieChart className="w-4 h-4 text-[#00c896]" />
                Répartition par catégorie
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-center min-h-[220px]">
              {stats.hasChartData ? (
                <canvas ref={chartRef} className="max-h-[260px]" />
              ) : (
                <div className="flex flex-col items-center gap-2 text-center">
                  <span className="text-4xl">📊</span>
                  <p className="text-slate-400 text-sm font-medium">Aucune dépense ce mois-ci</p>
                  <Link href="/depenses" className="text-xs text-[#00c896] hover:underline">
                    Commencer le suivi →
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent expenses */}
          <Card className="bg-[#1a2d42]/80 border-[#243552] backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-slate-100 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                Dernières dépenses
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col min-h-[220px]">
              {stats.recentExpenses.length > 0 ? (
                <ul className="space-y-3">
                  {stats.recentExpenses.map((e) => {
                    const cat = getAllCategories().find((c) => c.value === e.category);
                    return (
                      <li key={e.id} className="flex items-center justify-between py-2 border-b border-[#243552] last:border-0">
                        <div className="flex items-center gap-3">
                          <span className="text-lg leading-none">{cat?.emoji ?? '📦'}</span>
                          <div>
                            <p className="text-sm font-medium text-slate-200">{e.description || cat?.label}</p>
                            <p className="text-xs text-slate-500">{new Date(e.date).toLocaleDateString('fr-FR')}</p>
                          </div>
                        </div>
                        <span className="text-sm font-semibold text-red-400">-{formatCurrency(e.amount)}</span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="flex flex-col items-center justify-center flex-1 gap-2 text-center">
                  <span className="text-3xl">🧾</span>
                  <p className="text-slate-500 text-sm">Aucune dépense enregistrée.</p>
                  <Link href="/depenses" className="text-xs text-[#00c896] hover:underline mt-1">
                    Commencer le suivi →
                  </Link>
                </div>
              )}
              {stats.recentExpenses.length > 0 && (
                <Link href="/depenses" className="block mt-4 text-center text-xs text-[#00c896] hover:underline">
                  Voir toutes les dépenses →
                </Link>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick links */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {quickLinks.map((link) => (
            <Link key={link.href} href={link.href} className="flex justify-center">
              <ButtonColorful label={link.label} className="w-full" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
