export type Category = string;

export interface CategoryDef {
  value: string;
  label: string;
  color: string;
  emoji: string;
}

export const CATEGORIES: CategoryDef[] = [
  { value: 'alimentation', label: 'Alimentation', color: '#00c896', emoji: '🛒' },
  { value: 'logement',     label: 'Logement',     color: '#3b82f6', emoji: '🏠' },
  { value: 'transport',    label: 'Transport',    color: '#f59e0b', emoji: '🚗' },
  { value: 'loisirs',      label: 'Loisirs',      color: '#a855f7', emoji: '🎮' },
  { value: 'sante',        label: 'Santé',        color: '#ef4444', emoji: '💊' },
  { value: 'autre',        label: 'Autre',        color: '#94a3b8', emoji: '📦' },
];

export interface Expense {
  id: string;
  amount: number;
  category: string;
  description?: string;
  date: string; // YYYY-MM-DD
}

export interface FixedExpense {
  id: string;
  name: string;
  amount: number;
}

export interface Budget {
  income: number; // fallback / default
  incomeByMonth?: Record<string, number>; // YYYY-MM → amount
  fixedExpenses: FixedExpense[];
  payDay?: number; // jour du mois où la paie tombe (1-28), défaut 1
}

export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string;
}

export interface SavingsGoal {
  id: string;
  name: string;
  emoji: string;
  targetAmount: number;
  currentAmount: number;
  color: string;
  gradient?: string;
  createdAt: string;
}

export interface AmortizationRow {
  month: number;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
}
