import { useEffect, useState } from 'react';
import {
  averageMonthlySpending,
  getAverageSpendingRange,
  type SpendingTransaction,
} from '../global/monthlySpending';
import { api } from '../services/api';

// Busca local de GET /transactions; quando existir src/services/transactions.ts, trocar por ele
async function fetchTransactions(startDate: string, endDate: string) {
  const response = await api.get<SpendingTransaction[]>('/transactions', {
    params: { startDate, endDate },
  });
  return Array.isArray(response.data) ? response.data : [];
}

/**
 * Média de gastos dos últimos 3 meses fechados, para a dica da folha da meta.
 * Busca quando `enabled` vira `true` (ex.: ao abrir a folha). `null` enquanto carrega, sem dados ou em erro
 * (a dica some); mantém o último valor durante uma nova busca.
 */
export function useAverageMonthlySpending(enabled: boolean): number | null {
  const [average, setAverage] = useState<number | null>(null);

  useEffect(() => {
    if (!enabled) return;

    let active = true;
    const today = new Date();
    const { startDate, endDate } = getAverageSpendingRange(today);

    fetchTransactions(startDate, endDate)
      .then((transactions) => {
        if (active) setAverage(averageMonthlySpending(transactions, today));
      })
      .catch(() => {
        // A dica é opcional: sem conexão ou com erro, só não aparece
        if (active) setAverage(null);
      });

    return () => {
      active = false;
    };
  }, [enabled]);

  return average;
}
