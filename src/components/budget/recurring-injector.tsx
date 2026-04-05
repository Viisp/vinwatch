'use client';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { injectFixedExpensesForMonth } from '@/lib/storage';
import { CheckCircle2, X } from 'lucide-react';

function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function RecurringInjector() {
  const [injectedCount, setInjectedCount] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const month = getCurrentMonth();
    const count = injectFixedExpensesForMonth(month);
    if (count > 0) {
      setInjectedCount(count);
      setVisible(true);
      setTimeout(() => setVisible(false), 6000);
    }
  }, []);

  const monthLabel = (() => {
    const s = new Date(getCurrentMonth() + '-01').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    return s.charAt(0).toUpperCase() + s.slice(1);
  })();

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-xl bg-[#1a2d42] border border-[#00c896]/30 shadow-xl shadow-black/30 text-sm text-slate-200"
        >
          <CheckCircle2 className="w-4 h-4 text-[#00c896] shrink-0" />
          <span>
            <span className="font-semibold text-[#00c896]">{injectedCount} dépense{injectedCount > 1 ? 's fixe' : ' fixe'}{injectedCount > 1 ? 's' : ''}</span>
            {' '}ajoutée{injectedCount > 1 ? 's' : ''} automatiquement pour <span className="text-slate-100">{monthLabel}</span>
          </span>
          <button onClick={() => setVisible(false)} className="text-slate-500 hover:text-slate-300 ml-1">
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
