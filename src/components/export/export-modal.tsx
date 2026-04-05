'use client';
import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { ButtonColorful } from '@/components/ui/button-colorful';
import { getExpenses, getBudget, getLastPret, getAllCategories, getNotes } from '@/lib/storage';
import { formatCurrency } from '@/lib/calculations';
import { Share2 } from 'lucide-react';

interface Opts {
  inclureDepenses: boolean;
  inclureBudget: boolean;
  inclurePret: boolean;
  inclureNotes: boolean;
}

function buildHtml(opts: Opts, logoDataUrl?: string): string {
  const now = new Date();
  const mois = now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  const dateGen = now.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  const timeGen = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  const allCats = getAllCategories();

  /* ── DÉPENSES ── */
  let depensesHtml = '';
  if (opts.inclureDepenses) {
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const expenses = getExpenses().filter((e) => e.date.startsWith(currentMonth));
    const sorted = [...expenses].sort((a, b) => (a.date < b.date ? 1 : -1));
    const total = expenses.reduce((s, e) => s + e.amount, 0);

    const byCategory: Record<string, number> = {};
    for (const e of expenses) byCategory[e.category] = (byCategory[e.category] || 0) + e.amount;

    const rows = sorted.map((e) => {
      const cat = allCats.find((c) => c.value === e.category);
      return `<tr>
        <td>${new Date(e.date).toLocaleDateString('fr-FR')}</td>
        <td>${e.description || cat?.label || '—'}</td>
        <td><span class="badge" style="background:${cat?.color ?? '#94a3b8'}22;color:${cat?.color ?? '#94a3b8'};border:1px solid ${cat?.color ?? '#94a3b8'}44">${cat?.emoji ?? ''} ${cat?.label ?? e.category}</span></td>
        <td class="amount neg">−${formatCurrency(e.amount)}</td>
      </tr>`;
    }).join('');

    const catBreakdown = Object.entries(byCategory)
      .sort((a, b) => b[1] - a[1])
      .map(([val, amt]) => {
        const cat = allCats.find((c) => c.value === val);
        const pct = total > 0 ? ((amt / total) * 100).toFixed(1) : '0';
        return `<div class="cat-row">
          <div class="cat-label">${cat?.emoji ?? ''} ${cat?.label ?? val}</div>
          <div class="cat-bar-wrap"><div class="cat-bar" style="width:${pct}%;background:${cat?.color ?? '#94a3b8'}"></div></div>
          <div class="cat-pct">${pct}%</div>
          <div class="cat-amt">${formatCurrency(amt)}</div>
        </div>`;
      }).join('');

    depensesHtml = `
      <section>
        <div class="section-header"><span class="section-icon">💳</span><h2>Dépenses — ${mois}</h2></div>
        ${expenses.length === 0
          ? '<p class="empty">Aucune dépense enregistrée ce mois.</p>'
          : `<table>
              <thead><tr><th>Date</th><th>Description</th><th>Catégorie</th><th>Montant</th></tr></thead>
              <tbody>${rows}</tbody>
              <tfoot><tr><td colspan="3"><strong>Total</strong></td><td class="amount neg"><strong>−${formatCurrency(total)}</strong></td></tr></tfoot>
            </table>
            <div class="subsection">
              <h3>Répartition par catégorie</h3>
              <div class="cat-breakdown">${catBreakdown}</div>
            </div>`
        }
      </section>`;
  }

  /* ── BUDGET ── */
  let budgetHtml = '';
  if (opts.inclureBudget) {
    const budget = getBudget();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const varTotal = getExpenses().filter((e) => e.date.startsWith(currentMonth)).reduce((s, e) => s + e.amount, 0);
    const totalFixes = budget.fixedExpenses.reduce((s, e) => s + e.amount, 0);
    const solde = budget.income - totalFixes - varTotal;
    const soldeClass = solde >= 0 ? 'pos' : 'neg';

    const fixedRows = budget.fixedExpenses.map((e) =>
      `<tr><td>${e.name}</td><td class="amount">${formatCurrency(e.amount)}</td></tr>`
    ).join('') || '<tr><td colspan="2" class="empty">Aucune dépense fixe</td></tr>';

    budgetHtml = `
      <section>
        <div class="section-header"><span class="section-icon">📋</span><h2>Budget mensuel — ${mois}</h2></div>
        <div class="kpi-grid">
          <div class="kpi"><div class="kpi-label">Revenus nets</div><div class="kpi-value">${formatCurrency(budget.income)}</div></div>
          <div class="kpi"><div class="kpi-label">Dépenses fixes</div><div class="kpi-value neg">−${formatCurrency(totalFixes)}</div></div>
          <div class="kpi"><div class="kpi-label">Dépenses variables</div><div class="kpi-value neg">−${formatCurrency(varTotal)}</div></div>
          <div class="kpi kpi-highlight"><div class="kpi-label">Solde restant</div><div class="kpi-value ${soldeClass}">${formatCurrency(solde)}</div></div>
        </div>
        <div class="subsection">
          <h3>Détail des dépenses fixes</h3>
          <table><thead><tr><th>Libellé</th><th>Montant</th></tr></thead>
          <tbody>${fixedRows}</tbody>
          <tfoot><tr><td><strong>Total fixes</strong></td><td class="amount"><strong>${formatCurrency(totalFixes)}</strong></td></tr></tfoot>
          </table>
        </div>
        ${solde < 0 ? `<div class="alert">⚠️ Budget dépassé de <strong>${formatCurrency(Math.abs(solde))}</strong> ce mois-ci.</div>` : ''}
      </section>`;
  }

  /* ── PRÊT ── */
  let pretHtml = '';
  if (opts.inclurePret) {
    const pret = getLastPret();
    if (pret) {
      pretHtml = `
        <section>
          <div class="section-header"><span class="section-icon">🏦</span><h2>Simulation de prêt</h2></div>
          <div class="kpi-grid">
            <div class="kpi"><div class="kpi-label">Capital emprunté</div><div class="kpi-value">${formatCurrency(pret.principal)}</div></div>
            <div class="kpi"><div class="kpi-label">Taux annuel</div><div class="kpi-value">${pret.rate} %</div></div>
            <div class="kpi"><div class="kpi-label">Durée</div><div class="kpi-value">${pret.months} mois</div></div>
            <div class="kpi kpi-highlight"><div class="kpi-label">Mensualité</div><div class="kpi-value pos">${formatCurrency(pret.monthly)}</div></div>
            <div class="kpi"><div class="kpi-label">Coût total</div><div class="kpi-value">${formatCurrency(pret.totalCost)}</div></div>
            <div class="kpi"><div class="kpi-label">Total intérêts</div><div class="kpi-value neg">${formatCurrency(pret.totalInterest)}</div></div>
          </div>
        </section>`;
    } else {
      pretHtml = `<section><div class="section-header"><span class="section-icon">🏦</span><h2>Simulation de prêt</h2></div><p class="empty">Aucune simulation enregistrée.</p></section>`;
    }
  }

  /* ── NOTES ── */
  let notesHtml = '';
  if (opts.inclureNotes) {
    const notes = getNotes();
    const notesCards = notes.map((n) => `
      <div class="note-card">
        <div class="note-title">${n.title}</div>
        <div class="note-date">${new Date(n.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
        <div class="note-body">${n.content ? n.content.replace(/\n/g, '<br>') : '<em>Vide</em>'}</div>
      </div>`).join('');

    notesHtml = `
      <section>
        <div class="section-header"><span class="section-icon">📝</span><h2>Notes</h2></div>
        ${notes.length === 0 ? '<p class="empty">Aucune note enregistrée.</p>' : `<div class="notes-grid">${notesCards}</div>`}
      </section>`;
  }

  /* ── TIPS PERSONNALISÉS ── */
  const tips: { icon: string; title: string; body: string }[] = [];
  {
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const expenses = getExpenses().filter((e) => e.date.startsWith(currentMonth));
    const budget = getBudget();
    const total = expenses.reduce((s, e) => s + e.amount, 0);
    const totalFixes = budget.fixedExpenses.reduce((s, e) => s + e.amount, 0);
    const solde = budget.income - totalFixes - total;

    // Dépassement budget
    if (budget.income > 0 && solde < 0) {
      tips.push({ icon: '🚨', title: 'Budget dépassé', body: `Vous avez dépensé <strong>${formatCurrency(Math.abs(solde))}</strong> de plus que votre budget ce mois. Identifiez la catégorie la plus lourde et fixez-vous un plafond la prochaine fois.` });
    }

    // Solde très serré (< 10% des revenus)
    if (budget.income > 0 && solde >= 0 && solde < budget.income * 0.1) {
      tips.push({ icon: '⚠️', title: 'Marge très faible', body: `Il ne vous reste que <strong>${formatCurrency(solde)}</strong> (${((solde / budget.income) * 100).toFixed(1)}% de vos revenus). Essayez de viser au moins 10% d'épargne chaque mois.` });
    }

    // Bonne épargne (> 20%)
    if (budget.income > 0 && solde >= budget.income * 0.2) {
      tips.push({ icon: '🎉', title: 'Excellente gestion !', body: `Vous épargnez <strong>${((solde / budget.income) * 100).toFixed(0)}%</strong> de vos revenus ce mois. Pensez à placer cet excédent sur un livret ou une enveloppe d'investissement.` });
    }

    // Catégorie dominante (> 40% du total)
    if (expenses.length > 0) {
      const byCategory: Record<string, number> = {};
      for (const e of expenses) byCategory[e.category] = (byCategory[e.category] || 0) + e.amount;
      const topEntry = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0];
      if (topEntry && total > 0 && (topEntry[1] / total) > 0.4) {
        const cat = allCats.find((c) => c.value === topEntry[0]);
        tips.push({ icon: '🔍', title: `Focus sur ${cat?.label ?? topEntry[0]}`, body: `Cette catégorie représente <strong>${((topEntry[1] / total) * 100).toFixed(0)}%</strong> de vos dépenses (${formatCurrency(topEntry[1])}). C'est souvent le premier levier pour réduire ses dépenses.` });
      }
    }

    // Beaucoup de petites transactions
    const smallCount = expenses.filter((e) => e.amount < 10).length;
    if (smallCount >= 5) {
      tips.push({ icon: '☕', title: 'Attention aux petits achats', body: `Vous avez <strong>${smallCount} transactions inférieures à 10 €</strong> ce mois. Ces "petites" dépenses s'accumulent vite — elles représentent ${formatCurrency(expenses.filter((e) => e.amount < 10).reduce((s, e) => s + e.amount, 0))} au total.` });
    }

    // Pas de dépenses fixes définies
    if (budget.income > 0 && budget.fixedExpenses.length === 0) {
      tips.push({ icon: '📋', title: 'Définissez vos charges fixes', body: 'Renseignez vos dépenses fixes (loyer, abonnements…) dans la section Budget pour obtenir un solde réel et des prévisions fiables.' });
    }

    // Règle des 50/30/20
    if (budget.income > 0 && total > 0) {
      const varPct = (total / budget.income) * 100;
      if (varPct > 30) {
        tips.push({ icon: '📐', title: 'Règle des 50/30/20', body: `Selon cette règle populaire : 50% pour les besoins, 30% pour les envies, 20% pour l'épargne. Vos dépenses variables représentent actuellement <strong>${varPct.toFixed(0)}%</strong> de vos revenus.` });
      }
    }

    // Pas de données
    if (expenses.length === 0 && budget.income === 0) {
      tips.push({ icon: '🚀', title: 'Commencez à suivre vos dépenses', body: 'Enregistrez vos premières dépenses et définissez votre budget mensuel pour obtenir des conseils personnalisés dans vos prochains rapports.' });
    }
  }

  const tipsHtml = tips.length > 0 ? `
    <section>
      <div class="section-header"><span class="section-icon">💡</span><h2>Conseils personnalisés</h2></div>
      <div class="tips-grid">
        ${tips.map((t) => `
          <div class="tip-card">
            <div class="tip-header"><span class="tip-icon">${t.icon}</span><span class="tip-title">${t.title}</span></div>
            <p class="tip-body">${t.body}</p>
          </div>`).join('')}
      </div>
    </section>` : '';

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Rapport Depenzo — ${mois}</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg: #f8fafc; --surface: #ffffff; --border: #e2e8f0;
    --text: #1e293b; --text-muted: #64748b; --text-faint: #94a3b8;
    --thead: #f1f5f9; --row-hover: #f8fafc; --tfoot: #f8fafc;
    --kpi-hl: #f0fdf9; --kpi-hl-border: #00c896;
    --tip-bg: #fffbeb; --tip-border: #fde68a; --tip-title: #92400e; --tip-body: #78350f;
    --note-bg: #ffffff; --note-border: #e2e8f0;
    --cat-bar-bg: #f1f5f9;
    --alert-bg: #fef2f2; --alert-border: #fecaca; --alert-color: #dc2626;
    --logo-text: #0d1b2a;
  }
  html.dark {
    --bg: #08111e; --surface: #1a2d42; --border: #243552;
    --text: #e2e8f0; --text-muted: #94a3b8; --text-faint: #64748b;
    --thead: #0d1b2a; --row-hover: #243552; --tfoot: #0d1b2a;
    --kpi-hl: #00c89615; --kpi-hl-border: #00c896;
    --tip-bg: #2d1f00; --tip-border: #78350f; --tip-title: #fbbf24; --tip-body: #fde68a;
    --note-bg: #0d1b2a; --note-border: #243552;
    --cat-bar-bg: #243552;
    --alert-bg: #3b0000; --alert-border: #7f1d1d; --alert-color: #f87171;
    --logo-text: #e2e8f0;
  }

  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: var(--bg); color: var(--text); font-size: 14px; line-height: 1.6; transition: background 0.2s, color 0.2s; }
  .page { max-width: 860px; margin: 0 auto; padding: 40px 32px; }

  /* Header */
  .report-header { display: flex; align-items: center; justify-content: space-between; padding-bottom: 24px; border-bottom: 2px solid #00c896; margin-bottom: 40px; }
  .logo { display: flex; align-items: center; gap: 10px; }
  .logo-icon { width: 36px; height: 36px; background: #0d1b2a; border-radius: 8px; display: flex; align-items: center; justify-content: center; }
  .logo-name { font-size: 22px; font-weight: 700; color: var(--logo-text); letter-spacing: -0.5px; }
  .report-meta { text-align: right; color: var(--text-muted); font-size: 12px; }
  .report-meta strong { display: block; font-size: 15px; color: var(--text); margin-bottom: 2px; }

  /* Dark mode toggle */
  .theme-btn { position: relative; display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; border-radius: 50%; border: 1px solid var(--border); background: var(--surface); color: var(--text-muted); cursor: pointer; transition: border-color 0.15s, background 0.15s; overflow: hidden; }
  .theme-btn:hover { border-color: #00c896; color: var(--text); }
  .theme-btn svg { position: absolute; width: 18px; height: 18px; transition: transform 0.3s cubic-bezier(0.34,1.56,0.64,1), opacity 0.3s; }
  .theme-btn .sun { transform: scale(1) translateY(0); opacity: 1; }
  .theme-btn .moon { transform: scale(0.5) translateY(20px); opacity: 0; }
  html.dark .theme-btn .sun { transform: scale(0.5) translateY(20px); opacity: 0; }
  html.dark .theme-btn .moon { transform: scale(1) translateY(0); opacity: 1; }

  /* Sections */
  section { margin-bottom: 48px; }
  .section-header { display: flex; align-items: center; gap: 10px; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 1px solid var(--border); }
  .section-icon { font-size: 20px; }
  h2 { font-size: 18px; font-weight: 700; color: var(--text); }
  h3 { font-size: 13px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px; }
  .subsection { margin-top: 24px; }

  /* KPI grid */
  .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; margin-bottom: 8px; }
  .kpi { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 14px 16px; }
  .kpi-highlight { border-color: var(--kpi-hl-border); background: var(--kpi-hl); }
  .kpi-label { font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
  .kpi-value { font-size: 20px; font-weight: 700; color: var(--text); }

  /* Table */
  table { width: 100%; border-collapse: collapse; background: var(--surface); border-radius: 10px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.07); }
  thead { background: var(--thead); }
  th { padding: 10px 14px; text-align: left; font-size: 11px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
  td { padding: 10px 14px; border-top: 1px solid var(--border); color: var(--text); }
  tfoot td { border-top: 2px solid var(--border); background: var(--tfoot); }
  tr:hover td { background: var(--row-hover); }
  .amount { text-align: right; font-variant-numeric: tabular-nums; }

  /* Badge */
  .badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 500; white-space: nowrap; }

  /* Colors */
  .pos { color: #059669; }
  .neg { color: #dc2626; }

  /* Category breakdown */
  .cat-breakdown { display: flex; flex-direction: column; gap: 8px; }
  .cat-row { display: grid; grid-template-columns: 140px 1fr 50px 100px; align-items: center; gap: 10px; }
  .cat-label { font-size: 13px; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .cat-bar-wrap { background: var(--cat-bar-bg); border-radius: 999px; height: 6px; overflow: hidden; }
  .cat-bar { height: 100%; border-radius: 999px; }
  .cat-pct { font-size: 12px; color: var(--text-muted); text-align: right; }
  .cat-amt { font-size: 13px; font-weight: 600; color: var(--text); text-align: right; font-variant-numeric: tabular-nums; }

  /* Alert */
  .alert { margin-top: 16px; padding: 12px 16px; background: var(--alert-bg); border: 1px solid var(--alert-border); border-radius: 8px; color: var(--alert-color); font-size: 13px; }

  /* Notes */
  .notes-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 14px; }
  .note-card { background: var(--note-bg); border: 1px solid var(--note-border); border-radius: 10px; padding: 16px; }
  .note-title { font-size: 14px; font-weight: 600; color: var(--text); margin-bottom: 4px; }
  .note-date { font-size: 11px; color: var(--text-faint); margin-bottom: 10px; }
  .note-body { font-size: 13px; color: var(--text-muted); line-height: 1.6; }

  /* Empty */
  .empty { color: var(--text-faint); font-style: italic; font-size: 13px; padding: 8px 0; }

  /* Footer */
  .report-footer { margin-top: 48px; padding-top: 20px; border-top: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; color: var(--text-faint); font-size: 11px; }

  /* Tips */
  .tips-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 14px; }
  .tip-card { background: var(--tip-bg); border: 1px solid var(--tip-border); border-radius: 10px; padding: 16px; }
  .tip-header { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
  .tip-icon { font-size: 18px; }
  .tip-title { font-size: 13px; font-weight: 700; color: var(--tip-title); }
  .tip-body { font-size: 12px; color: var(--tip-body); line-height: 1.6; }

  /* Print */
  @media print {
    .theme-btn { display: none; }
    body { background: #fff; }
    .page { padding: 20px; }
    section { page-break-inside: avoid; }
    table { box-shadow: none; }
  }
</style>
</head>
<body>
<div class="page">
  <header class="report-header">
    <div class="logo">
      ${logoDataUrl
        ? `<img src="${logoDataUrl}" alt="Depenzo" style="width:36px;height:36px;border-radius:8px;object-fit:cover;" />`
        : `<div class="logo-icon"><svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" fill="#00c896"/></svg></div>`
      }
      <span class="logo-name">Depenzo</span>
    </div>
    <div style="display:flex;flex-direction:column;align-items:flex-end;gap:10px;">
      <button class="theme-btn" onclick="toggleTheme()" title="Basculer le thème">
        <svg class="sun" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="2" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="22" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
        <svg class="moon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
      </button>
      <div class="report-meta">
        <strong>Rapport financier personnel</strong>
        Généré le ${dateGen} à ${timeGen}
      </div>
    </div>
  </header>

  ${depensesHtml}
  ${budgetHtml}
  ${pretHtml}
  ${notesHtml}
  ${tipsHtml}

  <footer class="report-footer">
    <span>Depenzo — Gestion financière personnelle</span>
    <span>Données stockées localement sur votre appareil</span>
  </footer>
</div>
<script>
  function toggleTheme() {
    document.documentElement.classList.toggle('dark');
    localStorage.setItem('depenzo-report-theme', document.documentElement.classList.contains('dark') ? 'dark' : 'light');
  }
  if (localStorage.getItem('depenzo-report-theme') === 'dark') {
    document.documentElement.classList.add('dark');
  }
</script>
</body>
</html>`;
}

export function ExportModal() {
  const [open, setOpen] = useState(false);
  const [inclureDepenses, setInclureDepenses] = useState(true);
  const [inclureBudget, setInclureBudget] = useState(true);
  const [inclurePret, setInclurePret] = useState(true);
  const [inclureNotes, setInclureNotes] = useState(true);

  const opts: Opts = { inclureDepenses, inclureBudget, inclurePret, inclureNotes };
  const noneSelected = !inclureDepenses && !inclureBudget && !inclurePret && !inclureNotes;

  const getFilename = () => {
    const now = new Date();
    const suffix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return `depenzo-rapport-${suffix}.html`;
  };

  const handleDownload = async () => {
    let logoDataUrl: string | undefined;
    try {
      const res = await fetch('/logo.jpg');
      const blob2 = await res.blob();
      logoDataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(blob2);
      });
    } catch { /* logo non disponible, on continue sans */ }

    const blob = new Blob([buildHtml(opts, logoDataUrl)], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = getFilename();
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const sections = [
    { id: 'depenses', emoji: '💳', label: 'Dépenses du mois',        desc: 'Tableau détaillé + répartition par catégorie', value: inclureDepenses, setter: setInclureDepenses },
    { id: 'budget',   emoji: '📋', label: 'Budget mensuel',           desc: 'Revenus, fixes, variables et solde',            value: inclureBudget,   setter: setInclureBudget },
    { id: 'pret',     emoji: '🏦', label: 'Simulation de prêt',       desc: 'Mensualité, coût total et intérêts',            value: inclurePret,     setter: setInclurePret },
    { id: 'notes',    emoji: '📝', label: 'Mes notes',                desc: 'Toutes vos notes personnelles',                 value: inclureNotes,    setter: setInclureNotes },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>
        <span className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-slate-100 hover:bg-[#1a2d42]/60 transition-colors cursor-pointer">
          <Share2 className="w-4 h-4" />
          <span className="hidden sm:inline">Exporter</span>
        </span>
      </DialogTrigger>

      <DialogContent className="bg-[#0d1b2a] border-[#243552] text-slate-100 max-w-md p-0 overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-[#243552]">
          <DialogHeader>
            <DialogTitle className="text-slate-100 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#00c896]/10 border border-[#00c896]/20 flex items-center justify-center">
                <Share2 className="w-4 h-4 text-[#00c896]" />
              </div>
              <div>
                <div className="text-base font-semibold">Exporter mes données</div>
                <div className="text-xs text-slate-500 font-normal mt-0.5">Rapport HTML professionnel</div>
              </div>
            </DialogTitle>
          </DialogHeader>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Section tiles */}
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Contenu du rapport
            </p>
            <div className="grid grid-cols-2 gap-2">
              {sections.map((item) => (
                <button
                  key={item.id}
                  onClick={() => item.setter(!item.value)}
                  className={`relative text-left rounded-xl border p-3 transition-all duration-150 ${
                    item.value
                      ? 'bg-[#00c896]/8 border-[#00c896]/40 ring-1 ring-[#00c896]/20'
                      : 'bg-[#1a2d42]/40 border-[#243552] hover:border-[#2d4266]'
                  }`}
                >
                  <div className={`absolute top-2.5 right-2.5 w-4 h-4 rounded-full border flex items-center justify-center transition-all ${
                    item.value ? 'bg-[#00c896] border-[#00c896]' : 'border-[#243552]'
                  }`}>
                    {item.value && (
                      <svg className="w-2.5 h-2.5 text-[#0d1b2a]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <div className="text-xl mb-1.5">{item.emoji}</div>
                  <div className={`text-sm font-semibold ${item.value ? 'text-slate-100' : 'text-slate-300'}`}>{item.label}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">{item.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Info */}
          <div className="flex gap-3 rounded-xl bg-[#1a2d42]/60 border border-[#243552] px-4 py-3">
            <div className="text-slate-500 mt-0.5">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
              </svg>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Le rapport s'ouvre dans votre navigateur.<br />
              <span className="text-slate-300">Fichier → Imprimer → Enregistrer en PDF</span> pour un PDF professionnel.
            </p>
          </div>

          {/* Download */}
          <ButtonColorful
            onClick={handleDownload}
            disabled={noneSelected}
            label="Télécharger le rapport (.html)"
            showArrow={false}
            className="w-full h-11"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
