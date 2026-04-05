'use client';
import { useEffect, useRef, useState } from 'react';
import { Pencil, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ButtonColorful } from '@/components/ui/button-colorful';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCurrency } from '@/lib/calculations';
import { getBudget, saveBudget, getCurrentPeriodExpenses, generateId, getIncomeForMonth, saveIncomeForMonth, getPayDay, savePayDay, getCurrentPayPeriod } from '@/lib/storage';
import type { Expense } from '@/types';
import { NumberInput } from '@/components/ui/number-input';
import { type FixedExpense } from '@/types';
import {
  Chart,
  DoughnutController,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';

Chart.register(DoughnutController, ArcElement, Tooltip, Legend);

const currentMonthKey = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

const fmtMonthKey = (key: string) => {
  const s = new Date(key + '-01').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  return s.charAt(0).toUpperCase() + s.slice(1);
};

export function BudgetClient() {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);

  const [currentMonth] = useState(currentMonthKey);
  const [income, setIncome] = useState('');
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>([]);
  const [newName, setNewName] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [editingFixedId, setEditingFixedId] = useState<string | null>(null);
  const [variableTotal, setVariableTotal] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [payDay, setPayDayState] = useState(1);
  const [periodLabel, setPeriodLabel] = useState('');

  useEffect(() => {
    const budget = getBudget();
    const pd = budget.payDay ?? 1;
    setPayDayState(pd);
    const period = getCurrentPayPeriod(pd);
    setPeriodLabel(period.label);
    const monthIncome = getIncomeForMonth(currentMonth);
    setIncome(monthIncome > 0 ? String(monthIncome) : '');
    setFixedExpenses(budget.fixedExpenses);
    const varTotal = getCurrentPeriodExpenses().reduce((s: number, e: Expense) => s + e.amount, 0);
    setVariableTotal(varTotal);
    setLoaded(true);
  }, [currentMonth]);

  useEffect(() => {
    if (!loaded) return;
    saveIncomeForMonth(currentMonth, parseFloat(income) || 0);
    saveBudget({ income: parseFloat(income) || 0, fixedExpenses });
  }, [income, fixedExpenses, loaded, currentMonth]);

  const incomeNum = parseFloat(income) || 0;
  const totalFixes = fixedExpenses.reduce((s, e) => s + e.amount, 0);
  const solde = incomeNum - totalFixes - variableTotal;

  useEffect(() => {
    if (!chartRef.current) return;
    if (chartInstance.current) chartInstance.current.destroy();
    if (incomeNum <= 0) return;

    const data = [
      Math.max(0, totalFixes),
      Math.max(0, variableTotal),
      Math.max(0, solde),
    ];
    const total = totalFixes + variableTotal + Math.max(0, solde);
    if (total <= 0) return;

    chartInstance.current = new Chart(chartRef.current, {
      type: 'doughnut',
      data: {
        labels: ['Dépenses fixes', 'Dépenses variables', 'Épargne / Solde'],
        datasets: [
          {
            data,
            backgroundColor: ['#3b82f6', '#f59e0b', '#00c896'],
            borderWidth: 0,
          },
        ],
      },
      options: {
        responsive: true,
        cutout: '65%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: '#94a3b8', boxWidth: 12, padding: 12 },
          },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${ctx.label}: ${formatCurrency(ctx.parsed)}`,
            },
          },
        },
      },
    });
  }, [incomeNum, totalFixes, variableTotal, solde]);

  const addFixed = () => {
    const amt = parseFloat(newAmount);
    if (!newName.trim() || !newAmount || isNaN(amt) || amt <= 0) return;
    if (editingFixedId) {
      setFixedExpenses((prev) =>
        prev.map((e) => e.id === editingFixedId ? { id: editingFixedId, name: newName.trim(), amount: amt } : e)
      );
      setEditingFixedId(null);
    } else {
      setFixedExpenses((prev) => [
        ...prev,
        { id: generateId(), name: newName.trim(), amount: amt },
      ]);
    }
    setNewName('');
    setNewAmount('');
  };

  const editFixed = (e: FixedExpense) => {
    setEditingFixedId(e.id);
    setNewName(e.name);
    setNewAmount(String(e.amount));
  };

  const removeFixed = (id: string) => {
    setFixedExpenses((prev) => prev.filter((e) => e.id !== id));
    if (editingFixedId === id) { setEditingFixedId(null); setNewName(''); setNewAmount(''); }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-slate-100 mb-8">
        Calculateur de budget
      </h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-stretch">
        {/* Left: income + fixed */}
        <div className="flex flex-col gap-4">
          {/* Income */}
          <Card className="bg-[#1a2d42] border-[#243552]">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-slate-100">Revenus mensuels</CardTitle>
                  <p className="text-xs text-slate-500 mt-1">Votre salaire net pour <span className="text-[#00c896]">{fmtMonthKey(currentMonth)}</span>.</p>
                </div>
                <button
                  onClick={() => setShowHistory((v) => !v)}
                  className="text-xs text-slate-500 hover:text-[#00c896] transition-colors underline underline-offset-2"
                >
                  {showHistory ? 'Masquer' : 'Historique'}
                </button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Période courante */}
              <div className="flex items-center justify-between rounded-lg bg-[#0d1b2a]/60 border border-[#243552] px-3 py-2">
                <span className="text-xs text-slate-400">Période actuelle</span>
                <span className="text-xs font-semibold text-[#00c896]">{periodLabel}</span>
              </div>
              {/* Jour de paie */}
              <div className="flex items-center justify-between gap-4">
                <Label className="text-slate-400 text-xs whitespace-nowrap">Jour de paie</Label>
                <div className="w-36">
                  <NumberInput
                    value={payDay}
                    onChange={(v) => {
                      const d = Math.max(1, Math.min(28, Math.round(v)));
                      setPayDayState(d);
                      savePayDay(d);
                      setPeriodLabel(getCurrentPayPeriod(d).label);
                      const varTotal = getCurrentPeriodExpenses().reduce((s: number, e: Expense) => s + e.amount, 0);
                      setVariableTotal(varTotal);
                    }}
                    min={1}
                    max={28}
                    step={1}
                    formatOptions={{ maximumFractionDigits: 0 }}
                  />
                </div>
              </div>
              <div>
                <Label className="text-slate-300">Revenus nets (€) — {fmtMonthKey(currentMonth)}</Label>
                <div className="mt-1">
                  <NumberInput
                    value={income ? parseFloat(income) : undefined}
                    onChange={(v) => setIncome(isNaN(v) ? '' : String(v))}
                    min={0}
                    step={50}
                    formatOptions={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }}
                  />
                </div>
              </div>
              {showHistory && (() => {
                const budget = getBudget();
                const entries = Object.entries(budget.incomeByMonth ?? {}).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 6);
                return entries.length > 0 ? (
                  <div className="border-t border-[#243552] pt-3 space-y-1.5">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Historique</p>
                    {entries.map(([month, amt]) => (
                      <div key={month} className={`flex justify-between items-center text-sm py-1 px-2 rounded-lg ${month === currentMonth ? 'bg-[#00c896]/10 text-[#00c896]' : 'text-slate-400'}`}>
                        <span>{fmtMonthKey(month)}</span>
                        <span className="font-semibold tabular-nums">{formatCurrency(amt)}</span>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-xs text-slate-600 italic">Aucun historique disponible.</p>;
              })()}
            </CardContent>
          </Card>

          {/* Fixed expenses */}
          <Card className="bg-[#1a2d42] border-[#243552] flex-1">
            <CardHeader>
              <CardTitle className="text-slate-100">Dépenses fixes</CardTitle>
              <p className="text-xs text-slate-500 mt-1">Charges récurrentes chaque mois : loyer, abonnements, assurances…</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add / edit fixed expense */}
              <div className="space-y-2 p-3 rounded-lg bg-[#0d1b2a]/60 border border-[#243552]">
                <div>
                  <Label className="text-slate-400 text-xs">Libellé</Label>
                  <Input
                    placeholder="Ex : Loyer, Électricité…"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addFixed()}
                    className="bg-[#0d1b2a] border-[#243552] text-slate-100 mt-1"
                  />
                </div>
                <div>
                  <Label className="text-slate-400 text-xs">Montant (€)</Label>
                  <div className="mt-1">
                    <NumberInput
                      value={newAmount ? parseFloat(newAmount) : undefined}
                      onChange={(v) => setNewAmount(isNaN(v) ? '' : String(v))}
                      min={0}
                      step={1}
                      formatOptions={{ maximumFractionDigits: 2 }}
                    />
                  </div>
                </div>
                <ButtonColorful
                  onClick={addFixed}
                  disabled={!newName.trim() || !newAmount}
                  label={editingFixedId ? 'Modifier' : 'Ajouter'}
                  showArrow={false}
                  className="w-full"
                />
              </div>

              {/* List */}
              {fixedExpenses.length > 0 ? (
                <ul className="divide-y divide-[#243552]">
                  {fixedExpenses.map((e) => (
                    <li key={e.id} className="flex items-center justify-between py-2 gap-2">
                      <span className="text-sm text-slate-200">{e.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-blue-400">
                          {formatCurrency(e.amount)}
                        </span>
                        <button
                          onClick={() => editFixed(e)}
                          className="text-slate-600 hover:text-[#00c896] transition-colors p-0.5"
                          title="Modifier"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => removeFixed(e.id)}
                          className="text-slate-600 hover:text-red-400 transition-colors text-lg leading-none"
                        >
                          ×
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-slate-500 text-sm">
                  Aucun poste fixe. Ajoutez loyer, abonnements…
                </p>
              )}

              {fixedExpenses.length > 0 && (
                <div className="flex justify-between border-t border-[#243552] pt-2">
                  <span className="text-sm text-slate-400">Total fixes</span>
                  <span className="text-sm font-semibold text-blue-400">
                    {formatCurrency(totalFixes)}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

        </div>

        {/* Right: summary + chart */}
        <div className="flex flex-col gap-4">
          {/* Summary */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="bg-[#1a2d42] border-[#243552]">
              <CardContent className="py-4">
                <p className="text-xs text-slate-400 mb-1">Dépenses fixes</p>
                <p className="text-xl font-bold text-blue-400">
                  {formatCurrency(totalFixes)}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-[#1a2d42] border-[#243552]">
              <CardContent className="py-4">
                <p className="text-xs text-slate-400 mb-1">Dépenses variables</p>
                <p className="text-xl font-bold text-amber-400">
                  {formatCurrency(variableTotal)}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">Importées depuis vos dépenses du mois</p>
              </CardContent>
            </Card>
            <Card className="bg-[#1a2d42] border-[#243552]">
              <CardContent className="py-4">
                <p className="text-xs text-slate-400 mb-1">Revenus</p>
                <p className="text-xl font-bold text-slate-100">
                  {formatCurrency(incomeNum)}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-[#1a2d42] border-[#243552]">
              <CardContent className="py-4">
                <p className="text-xs text-slate-400 mb-1">Solde restant</p>
                <p
                  className={`text-xl font-bold ${
                    solde >= 0 ? 'text-[#00c896]' : 'text-red-400'
                  }`}
                >
                  {formatCurrency(solde)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Alerte dépassement */}
          {incomeNum > 0 && solde < 0 && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>Budget dépassé de <strong>{formatCurrency(Math.abs(solde))}</strong></span>
            </div>
          )}

          {/* Progress bars */}
          {incomeNum > 0 && (
            <Card className="bg-[#1a2d42] border-[#243552]">
              <CardContent className="py-4 space-y-3">
                {[
                  { label: 'Fixes', value: totalFixes, color: '#3b82f6' },
                  { label: 'Variables', value: variableTotal, color: '#f59e0b' },
                  { label: 'Solde', value: Math.max(0, solde), color: '#00c896' },
                ].map((item) => {
                  const pct = Math.min(100, (item.value / incomeNum) * 100);
                  return (
                    <div key={item.label}>
                      <div className="flex justify-between text-xs text-slate-400 mb-1">
                        <span>{item.label}</span>
                        <span>{pct.toFixed(1)}%</span>
                      </div>
                      <div className="h-2 bg-[#243552] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, backgroundColor: item.color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Chart */}
          <Card className="bg-[#1a2d42] border-[#243552] flex-1">
            <CardHeader>
              <CardTitle className="text-slate-100">Répartition budgétaire</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-center min-h-[200px]">
              {incomeNum > 0 ? (
                <canvas ref={chartRef} className="max-h-[260px]" />
              ) : (
                <div className="flex flex-col items-center gap-2 text-center">
                  <span className="text-4xl">🥧</span>
                  <p className="text-slate-400 text-sm font-medium">Aucune donnée à afficher</p>
                  <p className="text-slate-500 text-xs">Renseignez vos revenus mensuels ci-contre pour voir la répartition budgétaire.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
