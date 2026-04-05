'use client';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ButtonColorful } from '@/components/ui/button-colorful';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  calcMonthlyPayment,
  buildAmortizationTable,
  formatCurrency,
} from '@/lib/calculations';
import { saveLastPret } from '@/lib/storage';
import { NumberInput } from '@/components/ui/number-input';
import { type AmortizationRow } from '@/types';

export function PretClient() {
  const [principal, setPrincipal] = useState('');
  const [rate, setRate] = useState('');
  const [months, setMonths] = useState('');
  const [result, setResult] = useState<{
    monthly: number;
    totalCost: number;
    totalInterest: number;
    rows: AmortizationRow[];
  } | null>(null);
  const [error, setError] = useState('');
  const [showAll, setShowAll] = useState(false);

  const handleCalculate = () => {
    setError('');
    const p = parseFloat(principal);
    const r = parseFloat(rate);
    const n = parseInt(months);

    if (!p || p <= 0) { setError('Montant invalide (> 0)'); return; }
    if (r < 0 || r > 100) { setError('Taux invalide (0-100 %)'); return; }
    if (!n || n <= 0 || n > 600) { setError('Durée invalide (1-600 mois)'); return; }

    const monthly = calcMonthlyPayment(p, r, n);
    const totalCost = monthly * n;
    const totalInterest = totalCost - p;
    const rows = buildAmortizationTable(p, r, n);
    setResult({ monthly, totalCost, totalInterest, rows });
    saveLastPret({ principal: p, rate: r, months: n, monthly, totalCost, totalInterest });
    setShowAll(false);
  };

  const exportCsv = () => {
    if (!result) return;
    const now = new Date();
    const p = parseFloat(principal);
    const r = parseFloat(rate);
    const n = parseInt(months);
    const lines = [
      'SIMULATION DE PRÊT — DEPENZO',
      `Généré le;${now.toLocaleDateString('fr-FR')} à ${now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`,
      '',
      `Capital emprunté (€);${p.toFixed(2)}`,
      `Taux annuel (%);${r}`,
      `Durée (mois);${n}`,
      `Mensualité (€);${result.monthly.toFixed(2)}`,
      `Coût total (€);${result.totalCost.toFixed(2)}`,
      `Total intérêts (€);${result.totalInterest.toFixed(2)}`,
      '',
      'Mois;Mensualité (€);Capital remboursé (€);Intérêts (€);Capital restant (€)',
      ...result.rows.map((row) =>
        `${row.month};${row.payment.toFixed(2)};${row.principal.toFixed(2)};${row.interest.toFixed(2)};${row.balance.toFixed(2)}`
      ),
      '',
      `TOTAL;${result.totalCost.toFixed(2)};${p.toFixed(2)};${result.totalInterest.toFixed(2)};0.00`,
    ];
    const bom = '\uFEFF'; // BOM pour encodage correct dans Excel
    const blob = new Blob([bom + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pret-depenzo-${p}€-${r}pct-${n}mois.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const interestRatio = result
    ? (result.totalInterest / parseFloat(principal)) * 100
    : 0;

  const displayedRows = result
    ? showAll
      ? result.rows
      : result.rows.slice(0, 24)
    : [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-slate-100 mb-8">
        Simulateur de prêt / crédit
      </h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:items-stretch">
        {/* Form */}
        <Card className="bg-[#1a2d42] border-[#243552]">
          <CardHeader>
            <CardTitle className="text-slate-100">Paramètres du prêt</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-slate-300">Montant emprunté (€)</Label>
              <div className="mt-1">
                <NumberInput
                  value={principal ? parseFloat(principal) : undefined}
                  onChange={(v) => setPrincipal(isNaN(v) ? '' : String(v))}
                  min={1}
                  step={500}
                  formatOptions={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }}
                />
              </div>
            </div>

            <div>
              <Label className="text-slate-300">Taux d'intérêt annuel (%)</Label>
              <div className="mt-1">
                <NumberInput
                  value={rate ? parseFloat(rate) : undefined}
                  onChange={(v) => setRate(isNaN(v) ? '' : String(v))}
                  min={0}
                  max={100}
                  step={0.25}
                  formatOptions={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }}
                />
              </div>
            </div>

            <div>
              <Label className="text-slate-300">Durée (mois)</Label>
              <div className="mt-1">
                <NumberInput
                  value={months ? parseInt(months) : undefined}
                  onChange={(v) => setMonths(isNaN(v) ? '' : String(v))}
                  min={1}
                  max={600}
                  step={1}
                />
              </div>
              {months && parseInt(months) >= 12 && (
                <p className="text-xs text-slate-500 mt-1">
                  ≈ {(parseInt(months) / 12).toFixed(1)} ans
                </p>
              )}
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <ButtonColorful label="Calculer" onClick={handleCalculate} showArrow={false} className="w-full" />
          </CardContent>
        </Card>

        {/* Results */}
        <div className="lg:col-span-2 space-y-4 flex flex-col">
          {result ? (
            <>
              {/* Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <Card className="bg-[#1a2d42] border-[#243552]">
                  <CardContent className="py-4">
                    <p className="text-xs text-slate-400 mb-1">Mensualité</p>
                    <p className="text-2xl font-bold text-[#00c896]">
                      {formatCurrency(result.monthly)}
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-[#1a2d42] border-[#243552]">
                  <CardContent className="py-4">
                    <p className="text-xs text-slate-400 mb-1">Coût total</p>
                    <p className="text-2xl font-bold text-slate-100">
                      {formatCurrency(result.totalCost)}
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-[#1a2d42] border-[#243552] col-span-2 sm:col-span-1">
                  <CardContent className="py-4">
                    <p className="text-xs text-slate-400 mb-1">Total intérêts</p>
                    <p className="text-2xl font-bold text-amber-400">
                      {formatCurrency(result.totalInterest)}
                    </p>
                    <Badge
                      className={`mt-1 text-xs ${
                        interestRatio < 10
                          ? 'bg-[#00c896]/20 text-[#00c896] border-[#00c896]/30'
                          : interestRatio < 25
                          ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                          : 'bg-red-500/20 text-red-400 border-red-500/30'
                      }`}
                      variant="outline"
                    >
                      {interestRatio.toFixed(1)}% du capital
                    </Badge>
                  </CardContent>
                </Card>
              </div>

              {/* Amortization table */}
              <Card className="bg-[#1a2d42] border-[#243552]">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-slate-100">
                    Tableau d'amortissement
                  </CardTitle>
                  <Button
                    onClick={exportCsv}
                    variant="outline"
                    size="sm"
                    className="border-[#243552] text-slate-300 hover:bg-[#243552] text-xs"
                  >
                    Exporter CSV
                  </Button>
                </CardHeader>
                <CardContent className="overflow-x-auto p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-[#243552] hover:bg-transparent">
                        <TableHead className="text-slate-400">Mois</TableHead>
                        <TableHead className="text-slate-400 text-right">
                          Mensualité
                        </TableHead>
                        <TableHead className="text-slate-400 text-right">
                          Capital
                        </TableHead>
                        <TableHead className="text-slate-400 text-right">
                          Intérêts
                        </TableHead>
                        <TableHead className="text-slate-400 text-right">
                          Restant dû
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayedRows.map((row) => (
                        <TableRow
                          key={row.month}
                          className="border-[#243552] hover:bg-[#243552]/30"
                        >
                          <TableCell className="text-slate-300 font-medium">
                            {row.month}
                          </TableCell>
                          <TableCell className="text-right text-slate-200">
                            {formatCurrency(row.payment)}
                          </TableCell>
                          <TableCell className="text-right text-[#00c896]">
                            {formatCurrency(row.principal)}
                          </TableCell>
                          <TableCell className="text-right text-amber-400">
                            {formatCurrency(row.interest)}
                          </TableCell>
                          <TableCell className="text-right text-slate-400">
                            {formatCurrency(row.balance)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {result.rows.length > 24 && (
                    <div className="p-4 text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowAll((v) => !v)}
                        className="text-slate-400 hover:text-slate-100"
                      >
                        {showAll
                          ? 'Réduire'
                          : `Voir les ${result.rows.length - 24} mois restants`}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="bg-[#1a2d42] border-[#243552] flex-1">
              <CardContent className="flex flex-col items-center justify-center h-full gap-3">
                <div className="text-4xl text-slate-600">%</div>
                <p className="text-slate-400 text-sm text-center">
                  Renseignez les paramètres à gauche pour voir<br />
                  votre mensualité et le tableau d'amortissement.
                </p>
                <p className="text-slate-500 text-xs text-center mt-1">
                  Le tableau détaille mois par mois la part de capital<br />remboursé vs. les intérêts payés.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
