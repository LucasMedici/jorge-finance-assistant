// Cálculos dos relatórios (funções puras, sem React), testados em __tests__/summary.test.ts.
// Só `gasto` entra nas somas; categorias passam por `normalizeCategory`; datas no fuso local.
import { addDays, addMonths, getDaysInMonth, startOfMonth, subMonths } from 'date-fns';
import { normalizeCategory, OTHER_CATEGORY } from '../../global/categories';
import { formatCurrency } from '../../global/formatCurrency';
import { themas } from '../../global/themes';
import type { Transaction, TransactionType } from '../../services/transactions';
import { monthName, type ComparisonNames, type DateRange } from './periods';

// ---------------------------------------------------------------------------------------------
// Transação

/** Tipo normalizado (transações antigas podem ter caixa/espaços diferentes). */
export const getEntryType = (entry: Pick<Transaction, 'type'>): TransactionType => {
  const type = String(entry?.type ?? '')
    .trim()
    .toLowerCase();
  if (type === 'gasto' || type === 'receita') return type;
  return 'outro';
};

export const isExpense = (entry: Pick<Transaction, 'type'>) => getEntryType(entry) === 'gasto';

export const getEntryAmount = (entry: Pick<Transaction, 'amount'>): number =>
  Number(entry?.amount) || 0;

/** Categoria da lista fechada (gasto/receita); "outro" não tem lista e fica em "Outros". */
export const getEntryCategory = (entry: Pick<Transaction, 'type' | 'category'>): string => {
  const type = getEntryType(entry);
  return type === 'outro' ? OTHER_CATEGORY : normalizeCategory(type, entry.category);
};

/** Data/hora no fuso local. */
export const getEntryDate = (entry: Pick<Transaction, 'createdAt'>) => new Date(entry.createdAt);

/** Descrição, ou a categoria quando não há descrição. */
export const getEntryTitle = (entry: Pick<Transaction, 'type' | 'category' | 'description'>) =>
  entry.description?.trim() || getEntryCategory(entry);

// Soma em centavos para não acumular erro de ponto flutuante
const sumAmounts = (entries: Pick<Transaction, 'amount'>[]) =>
  entries.reduce((cents, entry) => cents + Math.round(getEntryAmount(entry) * 100), 0) / 100;

/** Total gasto (só `gasto`). */
export const sumExpenses = (entries: Transaction[]) => sumAmounts(entries.filter(isExpense));

/** Transações dentro do intervalo (dia final inteiro). */
export function filterByRange<T extends Pick<Transaction, 'createdAt'>>(
  entries: T[],
  range: DateRange,
): T[] {
  const endExclusive = addDays(range.end, 1);
  return entries.filter((entry) => {
    const date = getEntryDate(entry);
    return date >= range.start && date < endExclusive;
  });
}

// ---------------------------------------------------------------------------------------------
// Comparações

/** Variação percentual inteira; `null` sem base de comparação (anterior zero). */
export function getPercentChange(current: number, previous: number): number | null {
  if (!(previous > 0)) return null;
  return Math.round(((current - previous) / previous) * 100);
}

/** "↑ 32% sobre setembro", "↓ 12% sobre setembro", "igual a setembro", "sem gastos em setembro". */
export function formatChange(change: number | null, names: ComparisonNames): string {
  if (change === null) return `sem gastos ${names.none}`;
  if (change === 0) return `igual ${names.equal}`;
  return `${change > 0 ? '↑' : '↓'} ${Math.abs(change)}% sobre ${names.over}`;
}

// ---------------------------------------------------------------------------------------------
// Ritmo do mês

/**
 * Gasto acumulado por dia do mês de `monthStart`: posição `i` = total gasto do dia 1 até o dia `i + 1`.
 * Tem um item por dia do mês.
 */
export function getCumulativeByDay(entries: Transaction[], monthStart: Date): number[] {
  const days = getDaysInMonth(monthStart);
  const dailyCents = new Array<number>(days).fill(0);
  const start = startOfMonth(monthStart);
  const next = addMonths(start, 1);

  for (const entry of entries) {
    if (!isExpense(entry)) continue;
    const date = getEntryDate(entry);
    if (date < start || date >= next) continue;
    dailyCents[date.getDate() - 1] += Math.round(getEntryAmount(entry) * 100);
  }

  let running = 0;
  return dailyCents.map((cents) => {
    running += cents;
    return running / 100;
  });
}

/** Projeção linear para o fim do mês pelo ritmo médio diário até `day` (inclusive). */
export function projectMonthEnd(spent: number, day: number, daysInMonth: number): number {
  if (day <= 0) return spent;
  return (spent / day) * daysInMonth;
}

export type MonthPace = {
  daysInMonth: number;
  /** Último dia com dados: hoje no mês atual; o último dia num mês já fechado. */
  refDay: number;
  isCurrentMonth: boolean;
  /** Acumulado do mês até `refDay` (um item por dia). */
  current: number[];
  /** Acumulado do mês anterior, dia a dia (no máximo `daysInMonth` itens). */
  previous: number[];
  spent: number;
  /** Gasto do mês anterior até o mesmo dia (ou no mês inteiro, num mês fechado). */
  previousAtSameDay: number;
  /** Projeção para o fim do mês (só no mês atual, antes do último dia). */
  projection: number | null;
};

/** Dados do gráfico "Ritmo do mês" de `monthStart`, com `today` definindo o mês atual. */
export function getMonthPace(entries: Transaction[], monthStart: Date, today: Date): MonthPace {
  const start = startOfMonth(monthStart);
  const daysInMonth = getDaysInMonth(start);
  const isCurrentMonth =
    start.getFullYear() === today.getFullYear() && start.getMonth() === today.getMonth();
  const refDay = isCurrentMonth ? today.getDate() : daysInMonth;

  const current = getCumulativeByDay(entries, start).slice(0, refDay);
  const previousAll = getCumulativeByDay(entries, subMonths(start, 1));
  const previous = previousAll.slice(0, daysInMonth);

  const spent = current[current.length - 1] ?? 0;
  // Mês fechado: compara o mês inteiro; mês atual: até o mesmo dia (ou o último dia de um mês mais curto)
  const sameDayIndex = isCurrentMonth
    ? Math.min(refDay, previousAll.length) - 1
    : previousAll.length - 1;
  const previousAtSameDay = previousAll[sameDayIndex] ?? 0;

  const projection =
    isCurrentMonth && refDay < daysInMonth ? projectMonthEnd(spent, refDay, daysInMonth) : null;

  return {
    daysInMonth,
    refDay,
    isCurrentMonth,
    current,
    previous,
    spent,
    previousAtSameDay,
    projection,
  };
}

/**
 * Frase do ritmo:
 * mês atual — "Até hoje você gastou 8% a mais que no mesmo dia de setembro.";
 * mês fechado — "Em setembro você gastou 8% a menos que em agosto.".
 */
export function formatPaceSentence(pace: MonthPace, monthStart: Date): string {
  const current = monthName(monthStart);
  const previous = monthName(subMonths(monthStart, 1));
  const { spent, previousAtSameDay, isCurrentMonth } = pace;

  if (isCurrentMonth) {
    if (spent <= 0 && previousAtSameDay <= 0) return `Nenhum gasto registrado em ${current} ainda.`;
    if (previousAtSameDay <= 0) return `Em ${previous} não havia gastos até o mesmo dia.`;
    const change = getPercentChange(spent, previousAtSameDay)!;
    if (change === 0) return `Até hoje você gastou o mesmo que no mesmo dia de ${previous}.`;
    return `Até hoje você gastou ${Math.abs(change)}% a ${change > 0 ? 'mais' : 'menos'} que no mesmo dia de ${previous}.`;
  }

  if (spent <= 0 && previousAtSameDay <= 0) return `Nenhum gasto registrado em ${current}.`;
  if (previousAtSameDay <= 0) return `Em ${previous} não houve gastos para comparar.`;
  const change = getPercentChange(spent, previousAtSameDay)!;
  if (change === 0) return `Em ${current} você gastou o mesmo que em ${previous}.`;
  return `Em ${current} você gastou ${Math.abs(change)}% a ${change > 0 ? 'mais' : 'menos'} que em ${previous}.`;
}

/** Arredonda um valor "de cabeça": dezenas a partir de R$ 100, reais abaixo disso. */
export const roundApprox = (value: number) =>
  Math.abs(value) >= 100 ? Math.round(value / 10) * 10 : Math.round(value);

export type GoalForecast = {
  /** Projeção arredondada ("cerca de"). */
  projection: number;
  /** Quanto a projeção passa da meta (arredondado). */
  overBy: number;
  /** O gasto já passou da meta. */
  alreadyOver: boolean;
  /** Quanto ainda pode gastar por dia até o fim do mês para ficar na meta (só se ainda não passou). */
  dailyAllowance: number | null;
};

/**
 * Aviso de meta: `null` se a projeção não passa da meta (ou não há meta/projeção).
 * `daysLeft` = dias depois de hoje até o fim do mês (no último dia, conta o próprio dia).
 */
export function getGoalForecast(
  pace: Pick<MonthPace, 'spent' | 'projection' | 'refDay' | 'daysInMonth'>,
  goal: number | null,
): GoalForecast | null {
  if (!goal || goal <= 0 || pace.projection === null) return null;
  if (pace.projection <= goal) return null;

  const alreadyOver = pace.spent > goal;
  const daysLeft = Math.max(pace.daysInMonth - pace.refDay, 1);
  // "Gaste até": arredonda para baixo, para caber na meta
  const dailyAllowance = alreadyOver ? null : Math.floor((goal - pace.spent) / daysLeft);

  return {
    projection: roundApprox(pace.projection),
    overBy: Math.max(roundApprox(pace.projection - goal), 1),
    alreadyOver,
    dailyAllowance,
  };
}

const approxCurrency = (value: number) => formatCurrency(value, { hideZeroCents: true });

/** Partes do aviso em âmbar; `strong` vai em negrito. */
export type WarningPart = { text: string; strong?: boolean };

export function formatGoalWarning(
  forecast: GoalForecast,
  monthStart: Date,
  spent: number,
  goal: number,
): WarningPart[] {
  const month = monthName(monthStart);
  if (forecast.alreadyOver) {
    return [
      { text: `Atenção: ${month} já passou da meta em ` },
      { text: formatCurrency(spent - goal), strong: true },
      { text: '. No ritmo atual, fecha em cerca de ' },
      { text: approxCurrency(forecast.projection), strong: true },
      { text: '.' },
    ];
  }
  return [
    { text: `Atenção: no ritmo atual, ${month} fecha em cerca de ` },
    { text: approxCurrency(forecast.projection), strong: true },
    { text: `, ${approxCurrency(forecast.overBy)} acima da meta. Para ficar dentro, gaste até ` },
    { text: `${approxCurrency(forecast.dailyAllowance ?? 0)} por dia`, strong: true },
    { text: ' até o fim do mês.' },
  ];
}

// ---------------------------------------------------------------------------------------------
// Para onde foi o dinheiro

/** Quantas categorias aparecem sozinhas antes de "Outros". */
export const TOP_CATEGORIES = 4;

export type CategoryRow = {
  /** Nome mostrado (a categoria, ou "Outros" para o grupo). */
  label: string;
  /** Categorias somadas na linha (uma, ou várias no grupo "Outros"). */
  categories: string[];
  total: number;
  previousTotal: number;
  /** Fração do total do período (0 a 1). */
  share: number;
  /** Largura da barra: fração da maior linha (0 a 1). */
  fill: number;
  /** `null` sem gastos no período anterior. */
  change: number | null;
  color: string;
  isOthers: boolean;
  /** No grupo "Outros": quantas categorias pequenas (fora a própria "Outros") foram juntadas. */
  smallCount: number;
};

const totalsByCategory = (entries: Transaction[]) => {
  const totals = new Map<string, number>();
  for (const entry of entries) {
    if (!isExpense(entry)) continue;
    const category = getEntryCategory(entry);
    totals.set(category, (totals.get(category) ?? 0) + Math.round(getEntryAmount(entry) * 100));
  }
  return totals;
};

/**
 * Linhas de "Para onde foi o dinheiro": as 4 maiores categorias do período (cores de
 * `themas.categoryColors` na ordem do ranking) e o resto somado em "Outros" (cinza).
 * A categoria "Outros" da lista nunca entra no ranking: vai sempre para o grupo.
 */
export function getCategoryBreakdown(
  current: Transaction[],
  previous: Transaction[],
): CategoryRow[] {
  const currentTotals = totalsByCategory(current);
  const previousTotals = totalsByCategory(previous);
  const grandTotal = [...currentTotals.values()].reduce((sum, cents) => sum + cents, 0);
  if (grandTotal <= 0) return [];

  const ranked = [...currentTotals.entries()]
    .filter(([category, cents]) => cents > 0 && category !== OTHER_CATEGORY)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

  const top = ranked.slice(0, TOP_CATEGORIES);
  const small = ranked.slice(TOP_CATEGORIES).map(([category]) => category);
  const othersCategories = [
    ...((currentTotals.get(OTHER_CATEGORY) ?? 0) > 0 ? [OTHER_CATEGORY] : []),
    ...small,
  ];

  const buildRow = (
    label: string,
    categories: string[],
    color: string,
    isOthers: boolean,
  ): Omit<CategoryRow, 'fill'> => {
    const totalCents = categories.reduce((sum, c) => sum + (currentTotals.get(c) ?? 0), 0);
    const previousCents = categories.reduce((sum, c) => sum + (previousTotals.get(c) ?? 0), 0);
    return {
      label,
      categories,
      total: totalCents / 100,
      previousTotal: previousCents / 100,
      share: totalCents / grandTotal,
      change: getPercentChange(totalCents, previousCents),
      color,
      isOthers,
      smallCount: isOthers ? small.length : 0,
    };
  };

  const rows = top.map(([category], index) =>
    buildRow(category, [category], themas.categoryColors[index], false),
  );
  if (othersCategories.length > 0) {
    rows.push(buildRow(OTHER_CATEGORY, othersCategories, themas.categoryOtherColor, true));
  }

  const max = Math.max(...rows.map((row) => row.total));
  return rows.map((row) => ({ ...row, fill: max > 0 ? row.total / max : 0 }));
}

/** "32% do total" (abaixo de 1%: "menos de 1% do total"). */
export function formatShare(share: number): string {
  const percent = Math.round(share * 100);
  return percent < 1 ? 'menos de 1% do total' : `${percent}% do total`;
}

/** Legenda da linha: "32% do total, ↑ 32% sobre setembro" ou "18% do total, 6 categorias pequenas". */
export function formatCategoryCaption(row: CategoryRow, names: ComparisonNames): string {
  const share = formatShare(row.share);
  if (row.isOthers && row.smallCount > 0) {
    const small =
      row.smallCount === 1 ? '1 categoria pequena' : `${row.smallCount} categorias pequenas`;
    return `${share}, ${small}`;
  }
  return `${share}, ${formatChange(row.change, names)}`;
}

/** Categorias de uma linha do painel pelo nome ("Outros" = o grupo inteiro). */
export function findCategoryRow(rows: CategoryRow[], label: string): CategoryRow | undefined {
  return rows.find((row) => row.label === label);
}

// ---------------------------------------------------------------------------------------------
// Maiores gastos

/** Os `count` maiores gastos (empate: o mais recente primeiro). */
export function getTopExpenses(entries: Transaction[], count = 3): Transaction[] {
  return entries
    .filter(isExpense)
    .sort(
      (a, b) =>
        getEntryAmount(b) - getEntryAmount(a) ||
        getEntryDate(b).getTime() - getEntryDate(a).getTime(),
    )
    .slice(0, count);
}

/** Mais recentes primeiro. */
export const sortByDateDesc = <T extends Pick<Transaction, 'createdAt'>>(entries: T[]): T[] =>
  [...entries].sort((a, b) => getEntryDate(b).getTime() - getEntryDate(a).getTime());

// ---------------------------------------------------------------------------------------------
// Detalhe da categoria

export const HISTORY_MONTHS = 6;

export type CategoryHistory = {
  /** Um item por mês, do mais antigo ao mês de referência (o último). */
  months: { start: Date; total: number }[];
  /** Média dos meses contados (`null` se nenhum). */
  average: number | null;
  /** Quantos meses entraram na média: a partir do primeiro mês com algum lançamento. */
  averageMonths: number;
};

/** Período a buscar para o detalhe: os 6 meses até o mês de referência. */
export function getHistoryRange(monthStart: Date): DateRange {
  const start = startOfMonth(subMonths(monthStart, HISTORY_MONTHS - 1));
  return { start, end: addDays(addMonths(startOfMonth(monthStart), 1), -1) };
}

/**
 * Gasto mensal das `categories` nos 6 meses até `monthStart`. A média ignora os meses antes do
 * primeiro mês com qualquer lançamento (o app ainda não era usado).
 */
export function getCategoryHistory(
  entries: Transaction[],
  categories: string[],
  monthStart: Date,
): CategoryHistory {
  const first = startOfMonth(subMonths(monthStart, HISTORY_MONTHS - 1));
  const monthKey = (date: Date) => date.getFullYear() * 12 + date.getMonth();
  const firstKey = monthKey(first);
  const wanted = new Set(categories);

  const cents = new Array<number>(HISTORY_MONTHS).fill(0);
  const withData = new Array<boolean>(HISTORY_MONTHS).fill(false);

  for (const entry of entries) {
    const index = monthKey(getEntryDate(entry)) - firstKey;
    if (index < 0 || index >= HISTORY_MONTHS) continue;
    withData[index] = true;
    if (isExpense(entry) && wanted.has(getEntryCategory(entry))) {
      cents[index] += Math.round(getEntryAmount(entry) * 100);
    }
  }

  const months = cents.map((value, index) => ({
    start: addMonths(first, index),
    total: value / 100,
  }));

  const firstWithData = withData.indexOf(true);
  const counted = firstWithData < 0 ? [] : cents.slice(firstWithData);
  const average =
    counted.length > 0
      ? Math.round(counted.reduce((sum, value) => sum + value, 0) / counted.length) / 100
      : null;

  return { months, average, averageMonths: counted.length };
}

/**
 * Frase sob o valor do detalhe: "↑ 32% sobre setembro, e o maior valor dos últimos 6 meses."
 * O "maior/menor" só aparece com ao menos 3 meses contados e o mês estritamente acima/abaixo dos outros.
 */
export function formatHistoryHeadline(history: CategoryHistory): string {
  const { months, averageMonths } = history;
  const current = months[months.length - 1];
  const previous = months[months.length - 2];
  const previousName = monthName(previous.start);

  if (current.total <= 0 && previous.total <= 0) {
    return `Nenhum gasto em ${monthName(current.start)} nem em ${previousName}.`;
  }

  const change = formatChange(getPercentChange(current.total, previous.total), {
    over: previousName,
    equal: `a ${previousName}`,
    none: `em ${previousName}`,
  });
  const base = change.charAt(0).toUpperCase() + change.slice(1);

  const counted = months.slice(months.length - averageMonths, months.length - 1);
  if (counted.length >= 2) {
    const others = counted.map((month) => month.total);
    if (current.total > Math.max(...others)) {
      return `${base}, e o maior valor dos últimos ${HISTORY_MONTHS} meses.`;
    }
    if (current.total < Math.min(...others)) {
      return `${base}, e o menor valor dos últimos ${HISTORY_MONTHS} meses.`;
    }
  }
  return `${base}.`;
}
