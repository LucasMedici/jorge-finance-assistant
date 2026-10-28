// Resumo do mês no topo do chat e respostas dos atalhos ("Quanto gastei hoje?", "Resumo da semana"),
// calculados no próprio app sobre GET /transactions (sem chamar a OpenAI). Funções puras, testadas em
// __tests__/summary.test.ts.
import {
  format,
  getDaysInMonth,
  isSameDay,
  isSameMonth,
  startOfDay,
  startOfMonth,
  subDays,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getTransactionType } from '../../components/correctTransaction';
import { normalizeCategory } from '../../global/categories';
import { formatCurrency } from '../../global/formatCurrency';

/** Item de GET /transactions (só os campos usados aqui). */
export type SummaryTransaction = {
  type: string;
  amount: number | string;
  category?: string | null;
  createdAt: string;
};

export type DateRange = { start: Date; end: Date };

const toCents = (value: number | string) => Math.round((Number(value) || 0) * 100);

const parseDate = (createdAt: string): Date | null => {
  const date = new Date(createdAt);
  return Number.isNaN(date.getTime()) ? null : date;
};

// ---------------------------------------------------------------------------------------------
// Resumo do mês

/** Período buscado para o resumo: do dia 1º até hoje. */
export function getMonthRange(now: Date): DateRange {
  return { start: startOfMonth(now), end: now };
}

export type MonthSummary = {
  /** Gastos do mês de `now` (fuso local). */
  monthSpent: number;
  /** Gastos do dia de `now`. */
  todaySpent: number;
};

/** Soma só os gastos (receitas e "outro" ficam de fora), no mês e no dia de `now`. */
export function summarizeMonth(transactions: SummaryTransaction[], now: Date): MonthSummary {
  let monthCents = 0;
  let todayCents = 0;

  for (const transaction of transactions) {
    if (getTransactionType(transaction.type) !== 'gasto') continue;
    const date = parseDate(transaction.createdAt);
    if (!date || !isSameMonth(date, now)) continue;

    const cents = toCents(transaction.amount);
    monthCents += cents;
    if (isSameDay(date, now)) todayCents += cents;
  }

  return { monthSpent: monthCents / 100, todaySpent: todayCents / 100 };
}

/** Dias até o fim do mês (23/10 → 8; último dia → 0). */
export function getDaysLeftInMonth(now: Date): number {
  return getDaysInMonth(now) - now.getDate();
}

/** "Gasto em outubro". */
export function getMonthSpentLabel(now: Date): string {
  return `Gasto em ${format(now, 'MMMM', { locale: ptBR })}`;
}

// ---------------------------------------------------------------------------------------------
// Atalhos

export type ShortcutKey = 'today' | 'week' | 'pix';

/** Atalhos acima do campo, na ordem do canvas. */
export const SHORTCUTS: readonly { key: ShortcutKey; label: string }[] = [
  { key: 'today', label: 'Quanto gastei hoje?' },
  { key: 'week', label: 'Resumo da semana' },
  { key: 'pix', label: 'Recebi um pix' },
];

/** Texto que "Recebi um pix" coloca no campo (o usuário completa e envia). */
export const PIX_PREFILL = 'Recebi um pix de ';

/** "Resumo da semana" = últimos 7 dias, contando hoje. */
export const WEEK_DAYS = 7;

export const SHORTCUT_OFFLINE_REPLY =
  'Estou sem conexão agora. Quando a internet voltar, eu faço essa conta pra você.';
export const SHORTCUT_ERROR_REPLY =
  'Não consegui buscar seus lançamentos agora. Tente de novo daqui a pouco.';

/** Período buscado por cada atalho que responde com conta. */
export function getShortcutRange(key: 'today' | 'week', now: Date): DateRange {
  if (key === 'today') return { start: startOfDay(now), end: now };
  return { start: startOfDay(subDays(now, WEEK_DAYS - 1)), end: now };
}

type Totals = {
  expenseCents: number;
  expenseCount: number;
  incomeCents: number;
  /** Gastos por categoria, do maior para o menor (empate: ordem alfabética). */
  categories: { name: string; cents: number }[];
};

function totalsInRange(transactions: SummaryTransaction[], range: DateRange): Totals {
  const start = range.start.getTime();
  const end = range.end.getTime();
  const byCategory = new Map<string, number>();
  let expenseCents = 0;
  let expenseCount = 0;
  let incomeCents = 0;

  for (const transaction of transactions) {
    const date = parseDate(transaction.createdAt);
    // O fim inclui o dia inteiro (lançamentos com hora futura do mesmo dia, ex.: relógio adiantado)
    if (!date || date.getTime() < start || (date.getTime() > end && !isSameDay(date, range.end))) {
      continue;
    }

    const type = getTransactionType(transaction.type);
    const cents = toCents(transaction.amount);
    if (type === 'gasto') {
      expenseCents += cents;
      expenseCount++;
      const name = normalizeCategory('gasto', transaction.category);
      byCategory.set(name, (byCategory.get(name) ?? 0) + cents);
    } else if (type === 'receita') {
      incomeCents += cents;
    }
  }

  const categories = [...byCategory.entries()]
    .map(([name, cents]) => ({ name, cents }))
    .sort((a, b) => b.cents - a.cents || a.name.localeCompare(b.name, 'pt-BR'));

  return { expenseCents, expenseCount, incomeCents, categories };
}

const money = (cents: number) => formatCurrency(cents / 100);
const countLabel = (count: number) => (count === 1 ? '1 lançamento' : `${count} lançamentos`);

/** Quantas categorias aparecem na lista; o resto vira uma linha só. */
export const TOP_CATEGORIES = 3;

// "• Mercado: R$ 50,00" (até 3) + "• Outras categorias: R$ 20,00"
function categoryLines(categories: Totals['categories']): string {
  const top = categories.slice(0, TOP_CATEGORIES);
  const restCents = categories.slice(TOP_CATEGORIES).reduce((sum, item) => sum + item.cents, 0);
  const lines = top.map((item) => `• ${item.name}: ${money(item.cents)}`);
  if (restCents > 0) lines.push(`• Outras categorias: ${money(restCents)}`);
  return lines.join('\n');
}

/** Resposta de "Quanto gastei hoje?". */
export function buildTodayReply(transactions: SummaryTransaction[], now: Date): string {
  const totals = totalsInRange(transactions, getShortcutRange('today', now));
  const income = totals.incomeCents > 0 ? money(totals.incomeCents) : null;

  if (totals.expenseCount === 0) {
    return income
      ? `Hoje você não registrou gastos, mas entrou ${income} de receita.`
      : 'Hoje você ainda não registrou nenhum gasto.';
  }

  let reply = `Hoje você gastou ${money(totals.expenseCents)} em ${countLabel(totals.expenseCount)}:\n`;
  reply += categoryLines(totals.categories);
  if (income) reply += `\nE entrou ${income} de receita.`;
  return reply;
}

/** Resposta de "Resumo da semana" (últimos 7 dias, contando hoje). */
export function buildWeekReply(transactions: SummaryTransaction[], now: Date): string {
  const totals = totalsInRange(transactions, getShortcutRange('week', now));
  const period = `Nos últimos ${WEEK_DAYS} dias`;
  const balanceCents = totals.incomeCents - totals.expenseCents;
  const balanceSign = balanceCents > 0 ? '+ ' : balanceCents < 0 ? '− ' : '';
  const balance = `${balanceSign}${money(Math.abs(balanceCents))}`;

  if (totals.expenseCount === 0) {
    return totals.incomeCents > 0
      ? `${period} você não registrou gastos, mas entrou ${money(totals.incomeCents)} de receita.`
      : `${period} você não registrou nenhum gasto.`;
  }

  const averageCents = Math.round(totals.expenseCents / WEEK_DAYS);
  let reply = `${period} você gastou ${money(totals.expenseCents)} em ${countLabel(totals.expenseCount)}`;
  reply += ` (média de ${money(averageCents)} por dia):\n`;
  reply += categoryLines(totals.categories);
  if (totals.incomeCents > 0) {
    reply += `\nReceitas: ${money(totals.incomeCents)} · Saldo: ${balance}`;
  }
  return reply;
}
