import { Expense, Budget, CategoryDef, CATEGORIES, Note, SavingsGoal } from '@/types';
import { triggerSync } from './sync';

const EXPENSES_KEY = 'depenzo_expenses';
const BUDGET_KEY = 'depenzo_budget';
const PRET_KEY = 'depenzo_last_pret';

export interface LastPret {
  principal: number;
  rate: number;
  months: number;
  monthly: number;
  totalCost: number;
  totalInterest: number;
}

export function getLastPret(): LastPret | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(PRET_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function saveLastPret(pret: LastPret): void {
  localStorage.setItem(PRET_KEY, JSON.stringify(pret));
  triggerSync();
}

export function getExpenses(): Expense[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(EXPENSES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveExpense(expense: Expense): void {
  const expenses = getExpenses();
  expenses.push(expense);
  localStorage.setItem(EXPENSES_KEY, JSON.stringify(expenses));
  triggerSync();
}

export function updateExpense(expense: Expense): void {
  const expenses = getExpenses().map((e) => e.id === expense.id ? expense : e);
  localStorage.setItem(EXPENSES_KEY, JSON.stringify(expenses));
  triggerSync();
}

export function deleteExpense(id: string): void {
  const expenses = getExpenses().filter((e) => e.id !== id);
  localStorage.setItem(EXPENSES_KEY, JSON.stringify(expenses));
  triggerSync();
}

export function getBudget(): Budget {
  if (typeof window === 'undefined') return { income: 0, fixedExpenses: [] };
  try {
    const raw = localStorage.getItem(BUDGET_KEY);
    return raw ? JSON.parse(raw) : { income: 0, fixedExpenses: [] };
  } catch {
    return { income: 0, fixedExpenses: [] };
  }
}

export function saveBudget(budget: Budget): void {
  localStorage.setItem(BUDGET_KEY, JSON.stringify(budget));
  triggerSync();
}

export function getIncomeForMonth(month: string): number {
  const budget = getBudget();
  return budget.incomeByMonth?.[month] ?? budget.income;
}

export function saveIncomeForMonth(month: string, amount: number): void {
  const budget = getBudget();
  const incomeByMonth = { ...(budget.incomeByMonth ?? {}), [month]: amount };
  saveBudget({ ...budget, incomeByMonth });
}

const CUSTOM_CATEGORIES_KEY = 'depenzo_custom_categories';
const DELETED_CATEGORIES_KEY = 'depenzo_deleted_categories';

export function getCustomCategories(): CategoryDef[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CUSTOM_CATEGORIES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function saveCustomCategory(cat: CategoryDef): void {
  const cats = getCustomCategories();
  cats.push(cat);
  localStorage.setItem(CUSTOM_CATEGORIES_KEY, JSON.stringify(cats));
  triggerSync();
}

export function deleteCustomCategory(value: string): void {
  const cats = getCustomCategories().filter((c) => c.value !== value);
  localStorage.setItem(CUSTOM_CATEGORIES_KEY, JSON.stringify(cats));
  triggerSync();
}

export function updateCustomCategory(cat: CategoryDef): void {
  const cats = getCustomCategories().map((c) => c.value === cat.value ? cat : c);
  localStorage.setItem(CUSTOM_CATEGORIES_KEY, JSON.stringify(cats));
  triggerSync();
}

function getDeletedBuiltins(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(DELETED_CATEGORIES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function deleteBuiltinCategory(value: string): void {
  const deleted = getDeletedBuiltins();
  if (!deleted.includes(value)) {
    localStorage.setItem(DELETED_CATEGORIES_KEY, JSON.stringify([...deleted, value]));
    triggerSync();
  }
}

export function getAllCategories(): CategoryDef[] {
  const deleted = getDeletedBuiltins();
  return [
    ...CATEGORIES.filter((c) => !deleted.includes(c.value)),
    ...getCustomCategories(),
  ];
}

const NOTES_KEY = 'depenzo_notes';

export function getNotes(): Note[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(NOTES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function saveNote(note: Note): void {
  const notes = getNotes();
  notes.unshift(note);
  localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
  triggerSync();
}

export function updateNote(note: Note): void {
  const notes = getNotes().map((n) => n.id === note.id ? note : n);
  localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
  triggerSync();
}

export function deleteNote(id: string): void {
  const notes = getNotes().filter((n) => n.id !== id);
  localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
  triggerSync();
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function getPayDay(): number {
  return getBudget().payDay ?? 1;
}

export function savePayDay(payDay: number): void {
  const budget = getBudget();
  saveBudget({ ...budget, payDay });
}

/** Retourne la période de paie courante { start, end } en YYYY-MM-DD */
export function getCurrentPayPeriod(payDay: number = 1): { start: string; end: string; label: string } {
  const now = new Date();
  const day = now.getDate();
  let startYear: number, startMonth: number;

  if (day >= payDay) {
    startYear = now.getFullYear();
    startMonth = now.getMonth();
  } else {
    const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    startYear = d.getFullYear();
    startMonth = d.getMonth();
  }

  const start = new Date(startYear, startMonth, payDay);
  const end = new Date(startYear, startMonth + 1, payDay - 1);

  const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const fmtLabel = (d: Date) => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  const label = `${fmtLabel(start)} → ${fmtLabel(end)}`;

  return { start: fmt(start), end: fmt(end), label };
}

export function getCurrentMonthExpenses(): Expense[] {
  const now = new Date();
  const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  return getExpenses().filter((e) => e.date.startsWith(prefix));
}

export function getCurrentPeriodExpenses(): Expense[] {
  const payDay = getPayDay();
  const { start, end } = getCurrentPayPeriod(payDay);
  return getExpenses().filter((e) => e.date >= start && e.date <= end);
}

/* ── Recurring injection ── */
const INJECTED_MONTHS_KEY = 'depenzo_injected_months';

export function getInjectedMonths(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(INJECTED_MONTHS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function injectFixedExpensesForMonth(month: string): number {
  const injected = getInjectedMonths();
  if (injected.includes(month)) return 0;
  const budget = getBudget();
  if (budget.fixedExpenses.length === 0) return 0;
  const date = `${month}-01`;
  const expenses = getExpenses();
  for (const fe of budget.fixedExpenses) {
    expenses.push({ id: generateId(), amount: fe.amount, category: 'logement', description: fe.name, date });
  }
  localStorage.setItem(EXPENSES_KEY, JSON.stringify(expenses));
  localStorage.setItem(INJECTED_MONTHS_KEY, JSON.stringify([...injected, month]));
  triggerSync();
  return budget.fixedExpenses.length;
}

/* ── Savings goals ── */
const GOALS_KEY = 'depenzo_goals';

export function getSavingsGoals(): SavingsGoal[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(GOALS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function saveSavingsGoal(goal: SavingsGoal): void {
  const goals = getSavingsGoals();
  goals.unshift(goal);
  localStorage.setItem(GOALS_KEY, JSON.stringify(goals));
  triggerSync();
}

export function updateSavingsGoal(goal: SavingsGoal): void {
  const goals = getSavingsGoals().map((g) => g.id === goal.id ? goal : g);
  localStorage.setItem(GOALS_KEY, JSON.stringify(goals));
  triggerSync();
}

export function deleteSavingsGoal(id: string): void {
  const goals = getSavingsGoals().filter((g) => g.id !== id);
  localStorage.setItem(GOALS_KEY, JSON.stringify(goals));
  triggerSync();
}

/* ── Profile ── */
const PROFILE_KEY = 'depenzo_profile';

export interface UserProfile {
  pseudo?: string;
  customAvatar?: string;
  bannerGradient?: string;
  dashboardGradient?: string;
}

export function getProfile(): UserProfile {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

export function saveProfile(profile: UserProfile): void {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  triggerSync();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('depenzo:profile-updated'));
  }
}

export function getMonthlyTotals(months = 6): { label: string; total: number }[] {
  const expenses = getExpenses();
  const result: { label: string; total: number }[] = [];
  const now = new Date();

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const prefix = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
    const total = expenses
      .filter((e) => e.date.startsWith(prefix))
      .reduce((sum, e) => sum + e.amount, 0);
    result.push({ label, total });
  }
  return result;
}
