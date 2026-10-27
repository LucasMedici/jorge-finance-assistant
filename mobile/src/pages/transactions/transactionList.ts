// Busca, filtro e agrupamento da tela "Lançamentos" (funções puras), testados em
// __tests__/transactionList.test.ts. Datas no fuso local.
import { format, isSameDay, isSameYear, startOfMonth, subDays, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getCategoryKey } from '../../global/categories';
import { formatCurrency } from '../../global/formatCurrency';
import type { Transaction } from '../../services/transactions';
import { capitalize, monthName } from '../reports/periods';
import {
  getEntryAmount,
  getEntryCategory,
  getEntryDate,
  getEntryType,
  isExpense,
  sortByDateDesc,
  sumExpenses,
} from '../reports/summary';

/** Busca sem caixa nem acento, na descrição e na categoria. */
export function matchesSearch(entry: Transaction, query: string): boolean {
  const key = getCategoryKey(query);
  if (!key) return true;
  return (
    getCategoryKey(entry.description ?? '').includes(key) ||
    getCategoryKey(getEntryCategory(entry)).includes(key)
  );
}

export function filterTransactions(
  entries: Transaction[],
  { query, category }: { query: string; category: string | null },
): Transaction[] {
  return entries.filter(
    (entry) =>
      (category === null || getEntryCategory(entry) === category) && matchesSearch(entry, query),
  );
}

/** Categorias presentes, para os chips: as de gasto pelo total gasto, depois as outras. */
export function getCategoryFilters(entries: Transaction[]): string[] {
  const expenseTotals = new Map<string, number>();
  const otherTotals = new Map<string, number>();
  for (const entry of entries) {
    const target = isExpense(entry) ? expenseTotals : otherTotals;
    const category = getEntryCategory(entry);
    target.set(category, (target.get(category) ?? 0) + getEntryAmount(entry));
  }
  const ranked = (totals: Map<string, number>) =>
    [...totals.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([category]) => category);

  const expenses = ranked(expenseTotals);
  return [...expenses, ...ranked(otherTotals).filter((category) => !expenses.includes(category))];
}

/** "Hoje, 23 de outubro", "Ontem, 22 de outubro", "Quarta, 21 de outubro". */
export function formatDayTitle(date: Date, today: Date): string {
  const dayMonth = format(date, "d 'de' MMMM", { locale: ptBR });
  if (isSameDay(date, today)) return `Hoje, ${dayMonth}`;
  if (isSameDay(date, subDays(today, 1))) return `Ontem, ${dayMonth}`;
  const weekday = format(date, 'EEEE', { locale: ptBR }).replace('-feira', '');
  return `${capitalize(weekday)}, ${dayMonth}`;
}

export type DayGroup = {
  key: string;
  title: string;
  /** Total gasto no dia (só `gasto`). */
  total: number;
  items: Transaction[];
};

/** Agrupa por dia (mais recente primeiro), com o total gasto em cada dia. */
export function groupByDay(entries: Transaction[], today: Date): DayGroup[] {
  const groups: DayGroup[] = [];
  for (const entry of sortByDateDesc(entries)) {
    const date = getEntryDate(entry);
    const key = format(date, 'yyyy-MM-dd');
    let group = groups[groups.length - 1];
    if (!group || group.key !== key) {
      group = { key, title: formatDayTitle(date, today), total: 0, items: [] };
      groups.push(group);
    }
    group.items.push(entry);
  }
  return groups.map((group) => ({ ...group, total: sumExpenses(group.items) }));
}

/**
 * "47 lançamentos, R$ 1.284,90 no total". Com receitas na lista, o valor é só dos gastos:
 * "12 lançamentos, R$ 300,00 em gastos".
 */
export function formatListSummary(entries: Transaction[]): string {
  if (entries.length === 0) return 'Nenhum lançamento';
  const count = entries.length === 1 ? '1 lançamento' : `${entries.length} lançamentos`;
  const onlyExpenses = entries.every(isExpense);
  return `${count}, ${formatCurrency(sumExpenses(entries))} ${onlyExpenses ? 'no total' : 'em gastos'}`;
}

/** "− R$ 32,90" (gasto), "+ R$ 100,00" (receita) ou "R$ 5,00" (outro). */
export function formatSignedAmount(entry: Transaction): string {
  const value = formatCurrency(getEntryAmount(entry));
  const type = getEntryType(entry);
  if (type === 'gasto') return `− ${value}`;
  if (type === 'receita') return `+ ${value}`;
  return value;
}

/** Linha de baixo do item: "Comer fora, 12:40". */
export const formatEntryCaption = (entry: Transaction) =>
  `${getEntryCategory(entry)}, ${format(getEntryDate(entry), 'HH:mm')}`;

/** Meses que dá para escolher: do atual até `count - 1` meses atrás (1º dia de cada). */
export function getRecentMonths(today: Date, count = 12): Date[] {
  const current = startOfMonth(today);
  return Array.from({ length: count }, (_, index) => subMonths(current, index));
}

/** "Outubro" no ano atual; "Dezembro de 2025" em outro ano. */
export function formatMonthOption(month: Date, today: Date): string {
  const name = capitalize(monthName(month));
  return isSameYear(month, today) ? name : `${name} de ${month.getFullYear()}`;
}
