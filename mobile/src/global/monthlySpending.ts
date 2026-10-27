// Média de gastos dos últimos meses fechados (dica da folha da meta), testada em
// __tests__/monthlySpending.test.ts. Funções puras, sem React nem API.
import { format, startOfMonth, subMonths } from 'date-fns';

/** Item de `GET /transactions` (só os campos usados aqui). */
export type SpendingTransaction = {
  type: string;
  amount: number | string;
  createdAt: string;
};

/** Quantos meses fechados entram na média. */
export const AVERAGE_MONTHS = 3;

const toApiDate = (date: Date) => format(date, 'yyyy-MM-dd');

/**
 * Período a buscar em `GET /transactions` para a média: do 1º dia de 3 meses atrás até hoje
 * (`YYYY-MM-DD` no fuso local). O mês atual entra só para saber se há dados depois dos meses fechados.
 */
export function getAverageSpendingRange(today: Date): { startDate: string; endDate: string } {
  return {
    startDate: toApiDate(startOfMonth(subMonths(today, AVERAGE_MONTHS))),
    endDate: toApiDate(today),
  };
}

// Índice do mês (ano * 12 + mês) no fuso local, para comparar e agrupar
const monthIndex = (date: Date) => date.getFullYear() * 12 + date.getMonth();

/**
 * Média mensal de gastos nos últimos 3 meses fechados (os 3 meses completos antes do mês de `today`).
 *
 * Quais meses entram na conta:
 * - só `type === 'gasto'` soma valor; qualquer transação (inclusive receita) conta como "dado" do mês;
 * - meses antes do primeiro mês com dados na janela ficam de fora (o app ainda não era usado ou não há histórico);
 * - um mês sem gasto conta como R$ 0 só se houver dados depois dele (em mês posterior da janela ou no mês atual);
 *   sem dados posteriores, não dá para saber se o usuário parou de registrar, e o mês fica de fora;
 * - sem nenhum mês contável, devolve `null` (a dica não aparece).
 *
 * Os meses são do fuso local do aparelho (`createdAt` em ISO é convertido com `new Date`).
 */
export function averageMonthlySpending(
  transactions: SpendingTransaction[],
  today: Date,
): number | null {
  const current = monthIndex(today);
  const first = current - AVERAGE_MONTHS;

  // Por mês da janela: total gasto e se houve qualquer transação
  const totals = new Map<number, number>();
  const withData = new Set<number>();
  // Algum dado no mês atual (até hoje) conta como "dado posterior" para os meses fechados
  let lastMonthWithData = -Infinity;

  for (const transaction of transactions) {
    const date = new Date(transaction.createdAt);
    if (Number.isNaN(date.getTime())) continue;

    const month = monthIndex(date);
    if (month < first || month > current) continue;

    lastMonthWithData = Math.max(lastMonthWithData, month);
    if (month === current) continue;

    withData.add(month);
    if (String(transaction.type).trim().toLowerCase() === 'gasto') {
      totals.set(month, (totals.get(month) ?? 0) + (Number(transaction.amount) || 0));
    }
  }

  let countedMonths = 0;
  let total = 0;
  let started = false;

  for (let month = first; month < current; month++) {
    if (withData.has(month)) started = true;
    if (!started) continue;
    if (!withData.has(month) && lastMonthWithData <= month) continue;

    countedMonths++;
    total += totals.get(month) ?? 0;
  }

  if (countedMonths === 0) return null;
  return Math.round((total / countedMonths) * 100) / 100;
}
