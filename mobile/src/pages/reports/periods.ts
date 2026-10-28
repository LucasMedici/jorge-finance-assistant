// Períodos do painel de relatórios (Semana / Mês / 3 meses / Ano): intervalos, navegação e textos.
// Funções puras, testadas em __tests__/periods.test.ts. Datas sempre no fuso local (date-fns).
import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  isSameMonth,
  isSameYear,
  parse,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subMonths,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

export type ReportPeriod = 'week' | 'month' | 'quarter' | 'year';

export const PERIOD_OPTIONS: readonly { value: ReportPeriod; label: string }[] = [
  { value: 'week', label: 'Semana' },
  { value: 'month', label: 'Mês' },
  { value: 'quarter', label: '3 meses' },
  { value: 'year', label: 'Ano' },
];

/** Intervalo de dias, com `start` e `end` no início do dia (o dia final entra inteiro). */
export type DateRange = { start: Date; end: Date };

// Semana de domingo a sábado, como no calendário brasileiro
const WEEK_OPTIONS = { weekStartsOn: 0 } as const;

/** Intervalo do período que contém `anchor` (no "3 meses", `anchor` está no último dos 3 meses). */
export function getPeriodRange(period: ReportPeriod, anchor: Date): DateRange {
  switch (period) {
    case 'week':
      return {
        start: startOfWeek(anchor, WEEK_OPTIONS),
        end: startOfDay(endOfWeek(anchor, WEEK_OPTIONS)),
      };
    case 'month':
      return { start: startOfMonth(anchor), end: startOfDay(endOfMonth(anchor)) };
    case 'quarter':
      return { start: startOfMonth(subMonths(anchor, 2)), end: startOfDay(endOfMonth(anchor)) };
    case 'year':
      return { start: startOfYear(anchor), end: startOfDay(endOfYear(anchor)) };
  }
}

/** Anda um período para trás (`-1`) ou para frente (`1`). */
export function shiftAnchor(period: ReportPeriod, anchor: Date, direction: -1 | 1): Date {
  switch (period) {
    case 'week':
      return addWeeks(anchor, direction);
    case 'month':
      return addMonths(anchor, direction);
    case 'quarter':
      return addMonths(anchor, 3 * direction);
    case 'year':
      return addYears(anchor, direction);
  }
}

/** Período imediatamente anterior (base das comparações). */
export function getPreviousRange(period: ReportPeriod, anchor: Date): DateRange {
  return getPeriodRange(period, shiftAnchor(period, anchor, -1));
}

/** Dá para avançar se o próximo período já começou. */
export function canGoForward(period: ReportPeriod, anchor: Date, today: Date): boolean {
  return getPeriodRange(period, shiftAnchor(period, anchor, 1)).start <= today;
}

/** O período contém hoje (é o período "atual"). */
export function isCurrentPeriod(period: ReportPeriod, anchor: Date, today: Date): boolean {
  const { start, end } = getPeriodRange(period, anchor);
  return start <= today && today < addDays(end, 1);
}

/** "outubro" */
export const monthName = (date: Date) => format(date, 'MMMM', { locale: ptBR });

/** "Outubro" */
export const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** "out" */
export const shortMonthName = (date: Date) => format(date, 'MMM', { locale: ptBR });

/**
 * Título do período no seletor: "Outubro de 2026", "20 a 26 de outubro", "27 out a 2 nov",
 * "Agosto a outubro de 2026", "2026".
 */
export function formatPeriodTitle(period: ReportPeriod, range: DateRange): string {
  const { start, end } = range;
  switch (period) {
    case 'month':
      return capitalize(format(start, "MMMM 'de' yyyy", { locale: ptBR }));
    case 'week':
      if (isSameMonth(start, end))
        return `${start.getDate()} a ${end.getDate()} de ${monthName(end)}`;
      if (isSameYear(start, end)) {
        return `${start.getDate()} ${shortMonthName(start)} a ${end.getDate()} ${shortMonthName(end)}`;
      }
      return `${format(start, 'd MMM yyyy', { locale: ptBR })} a ${format(end, 'd MMM yyyy', { locale: ptBR })}`;
    case 'quarter':
      if (isSameYear(start, end)) {
        return capitalize(`${monthName(start)} a ${monthName(end)} de ${end.getFullYear()}`);
      }
      return capitalize(
        `${shortMonthName(start)} de ${start.getFullYear()} a ${shortMonthName(end)} de ${end.getFullYear()}`,
      );
    case 'year':
      return String(start.getFullYear());
  }
}

/** Rótulo do total: "Gasto em outubro", "Gasto nesta semana", "Gasto nos 3 meses", "Gasto em 2026". */
export function formatSpentLabel(
  period: ReportPeriod,
  range: DateRange,
  isCurrent: boolean,
): string {
  switch (period) {
    case 'month':
      return `Gasto em ${monthName(range.start)}`;
    case 'week':
      return isCurrent ? 'Gasto nesta semana' : 'Gasto na semana';
    case 'quarter':
      return 'Gasto nos 3 meses';
    case 'year':
      return `Gasto em ${range.start.getFullYear()}`;
  }
}

/**
 * Como citar o período anterior nas comparações:
 * `over` ("↑ 12% sobre setembro"), `equal` ("igual a setembro") e `none` ("sem gastos em setembro").
 */
export type ComparisonNames = { over: string; equal: string; none: string };

export function getComparisonNames(period: ReportPeriod, previous: DateRange): ComparisonNames {
  switch (period) {
    case 'month': {
      const name = monthName(previous.start);
      return { over: name, equal: `a ${name}`, none: `em ${name}` };
    }
    case 'week':
      return {
        over: 'a semana anterior',
        equal: 'à semana anterior',
        none: 'na semana anterior',
      };
    case 'quarter':
      return {
        over: 'os 3 meses anteriores',
        equal: 'aos 3 meses anteriores',
        none: 'nos 3 meses anteriores',
      };
    case 'year': {
      const year = String(previous.start.getFullYear());
      return { over: year, equal: `a ${year}`, none: `em ${year}` };
    }
  }
}

/** Mês em parâmetro de rota: `yyyy-MM`. */
export const toMonthParam = (date: Date) => format(date, 'yyyy-MM');

/** Lê o `yyyy-MM` da rota (inválido ou ausente → mês de `today`). Devolve o 1º dia do mês. */
export function parseMonthParam(month: string | undefined, today: Date): Date {
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const parsed = parse(month, 'yyyy-MM', today);
    if (!Number.isNaN(parsed.getTime())) return startOfMonth(parsed);
  }
  return startOfMonth(today);
}
