import {
  canGoForward,
  formatPeriodTitle,
  formatSpentLabel,
  getPeriodRange,
  getPreviousRange,
  isCurrentPeriod,
  parseMonthParam,
  shiftAnchor,
  toMonthParam,
} from '../periods';

const day = (year: number, month: number, date: number) => new Date(year, month - 1, date);
const TODAY = new Date(2026, 9, 27, 15, 30); // terça, 27 de outubro de 2026

describe('getPeriodRange', () => {
  it('semana de domingo a sábado', () => {
    expect(getPeriodRange('week', TODAY)).toEqual({
      start: day(2026, 10, 25),
      end: day(2026, 10, 31),
    });
  });

  it('mês, 3 meses (terminando no mês) e ano', () => {
    expect(getPeriodRange('month', TODAY)).toEqual({
      start: day(2026, 10, 1),
      end: day(2026, 10, 31),
    });
    expect(getPeriodRange('quarter', TODAY)).toEqual({
      start: day(2026, 8, 1),
      end: day(2026, 10, 31),
    });
    expect(getPeriodRange('year', TODAY)).toEqual({
      start: day(2026, 1, 1),
      end: day(2026, 12, 31),
    });
  });

  it('período anterior', () => {
    expect(getPreviousRange('month', TODAY)).toEqual({
      start: day(2026, 9, 1),
      end: day(2026, 9, 30),
    });
    expect(getPreviousRange('quarter', TODAY)).toEqual({
      start: day(2026, 5, 1),
      end: day(2026, 7, 31),
    });
    expect(getPreviousRange('week', TODAY).start).toEqual(day(2026, 10, 18));
  });
});

describe('navegação', () => {
  it('anda pelo tamanho do período', () => {
    expect(shiftAnchor('week', TODAY, -1).getDate()).toBe(20);
    expect(shiftAnchor('month', day(2026, 3, 31), -1)).toEqual(day(2026, 2, 28));
    expect(shiftAnchor('quarter', TODAY, -1).getMonth()).toBe(6);
    expect(shiftAnchor('year', TODAY, 1).getFullYear()).toBe(2027);
  });

  it('não avança para um período que ainda não começou', () => {
    expect(canGoForward('month', TODAY, TODAY)).toBe(false);
    expect(canGoForward('month', day(2026, 9, 10), TODAY)).toBe(true);
    expect(canGoForward('week', day(2026, 10, 20), TODAY)).toBe(true);
    expect(canGoForward('year', TODAY, TODAY)).toBe(false);
  });

  it('período atual', () => {
    expect(isCurrentPeriod('month', TODAY, TODAY)).toBe(true);
    expect(isCurrentPeriod('month', day(2026, 9, 1), TODAY)).toBe(false);
    expect(isCurrentPeriod('week', day(2026, 10, 31), TODAY)).toBe(true);
  });
});

describe('textos', () => {
  it('títulos', () => {
    expect(formatPeriodTitle('month', getPeriodRange('month', TODAY))).toBe('Outubro de 2026');
    expect(formatPeriodTitle('week', getPeriodRange('week', day(2026, 10, 20)))).toBe(
      '18 a 24 de outubro',
    );
    expect(formatPeriodTitle('week', getPeriodRange('week', TODAY))).toBe('25 a 31 de outubro');
    expect(formatPeriodTitle('week', getPeriodRange('week', day(2026, 9, 30)))).toBe(
      '27 set a 3 out',
    );
    expect(formatPeriodTitle('week', getPeriodRange('week', day(2026, 11, 2)))).toBe(
      '1 a 7 de novembro',
    );
    expect(formatPeriodTitle('week', getPeriodRange('week', day(2026, 12, 31)))).toBe(
      '27 dez 2026 a 2 jan 2027',
    );
    expect(formatPeriodTitle('quarter', getPeriodRange('quarter', TODAY))).toBe(
      'Agosto a outubro de 2026',
    );
    expect(formatPeriodTitle('quarter', getPeriodRange('quarter', day(2026, 1, 10)))).toBe(
      'Nov de 2025 a jan de 2026',
    );
    expect(formatPeriodTitle('year', getPeriodRange('year', TODAY))).toBe('2026');
  });

  it('rótulo do total', () => {
    expect(formatSpentLabel('month', getPeriodRange('month', TODAY), true)).toBe(
      'Gasto em outubro',
    );
    expect(formatSpentLabel('week', getPeriodRange('week', TODAY), true)).toBe(
      'Gasto nesta semana',
    );
    expect(formatSpentLabel('week', getPeriodRange('week', TODAY), false)).toBe('Gasto na semana');
    expect(formatSpentLabel('quarter', getPeriodRange('quarter', TODAY), true)).toBe(
      'Gasto nos 3 meses',
    );
    expect(formatSpentLabel('year', getPeriodRange('year', TODAY), true)).toBe('Gasto em 2026');
  });
});

describe('parâmetro de mês da rota', () => {
  it('ida e volta em yyyy-MM; inválido cai no mês atual', () => {
    expect(toMonthParam(TODAY)).toBe('2026-10');
    expect(parseMonthParam('2026-03', TODAY)).toEqual(day(2026, 3, 1));
    expect(parseMonthParam(undefined, TODAY)).toEqual(day(2026, 10, 1));
    expect(parseMonthParam('março', TODAY)).toEqual(day(2026, 10, 1));
  });
});
