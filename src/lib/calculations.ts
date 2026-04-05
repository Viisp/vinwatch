import { AmortizationRow } from '@/types';

/**
 * PMT formula: monthly payment for a loan
 * M = P × [r(1+r)^n] / [(1+r)^n - 1]
 */
export function calcMonthlyPayment(
  principal: number,
  annualRate: number,
  months: number
): number {
  if (annualRate === 0) return principal / months;
  const r = annualRate / 100 / 12;
  const factor = Math.pow(1 + r, months);
  return (principal * r * factor) / (factor - 1);
}

export function buildAmortizationTable(
  principal: number,
  annualRate: number,
  months: number
): AmortizationRow[] {
  const payment = calcMonthlyPayment(principal, annualRate, months);
  const r = annualRate / 100 / 12;
  const rows: AmortizationRow[] = [];
  let balance = principal;

  for (let i = 1; i <= months; i++) {
    const interest = balance * r;
    const principalPart = payment - interest;
    balance = Math.max(0, balance - principalPart);

    rows.push({
      month: i,
      payment: round2(payment),
      principal: round2(principalPart),
      interest: round2(interest),
      balance: round2(balance),
    });
  }
  return rows;
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(value);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
