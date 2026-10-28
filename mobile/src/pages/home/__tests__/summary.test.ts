import {
  type SummaryTransaction,
  buildTodayReply,
  buildWeekReply,
  getDaysLeftInMonth,
  getMonthRange,
  getMonthSpentLabel,
  getShortcutRange,
  summarizeMonth,
} from '../summary';

// 23/10/2026 (sexta), 19:24 no fuso local
const NOW = new Date(2026, 9, 23, 19, 24);

const at = (month: number, day: number, hour = 12, year = 2026) =>
  new Date(year, month, day, hour).toISOString();

const entry = (
  type: string,
  amount: number | string,
  createdAt: string,
  category: string | null = 'Mercado',
): SummaryTransaction => ({ type, amount, createdAt, category });

describe('resumo do mês', () => {
  it('período do dia 1º até agora', () => {
    expect(getMonthRange(NOW)).toEqual({ start: new Date(2026, 9, 1), end: NOW });
  });

  it('soma só gastos, no mês e no dia', () => {
    const summary = summarizeMonth(
      [
        entry('gasto', 50, at(9, 23, 8)),
        entry('Gasto ', '10.10', at(9, 23, 18)),
        entry('gasto', 0.2, at(9, 1, 0)),
        entry('gasto', 1000, at(8, 30, 23)), // mês anterior
        entry('receita', 1200, at(9, 23)),
        entry('outro', 5, at(9, 23)),
        entry('gasto', 30, 'invalida'),
      ],
      NOW,
    );
    expect(summary).toEqual({ monthSpent: 60.3, todaySpent: 60.1 });
  });

  it('sem lançamentos, zero', () => {
    expect(summarizeMonth([], NOW)).toEqual({ monthSpent: 0, todaySpent: 0 });
  });

  it('dias até o fim do mês', () => {
    expect(getDaysLeftInMonth(NOW)).toBe(8);
    expect(getDaysLeftInMonth(new Date(2026, 9, 31))).toBe(0);
    expect(getDaysLeftInMonth(new Date(2028, 1, 1))).toBe(28); // fevereiro bissexto
  });

  it('rótulo com o mês por extenso', () => {
    expect(getMonthSpentLabel(NOW)).toBe('Gasto em outubro');
    expect(getMonthSpentLabel(new Date(2026, 2, 5))).toBe('Gasto em março');
  });
});

describe('getShortcutRange', () => {
  it('hoje: do começo do dia até agora; semana: últimos 7 dias', () => {
    expect(getShortcutRange('today', NOW)).toEqual({ start: new Date(2026, 9, 23), end: NOW });
    expect(getShortcutRange('week', NOW)).toEqual({ start: new Date(2026, 9, 17), end: NOW });
  });
});

describe('buildTodayReply', () => {
  it('sem nada hoje', () => {
    expect(buildTodayReply([entry('gasto', 50, at(9, 22))], NOW)).toBe(
      'Hoje você ainda não registrou nenhum gasto.',
    );
  });

  it('só receita hoje', () => {
    expect(buildTodayReply([entry('receita', 1200, at(9, 23), 'Freela')], NOW)).toBe(
      'Hoje você não registrou gastos, mas entrou R$ 1.200,00 de receita.',
    );
  });

  it('total, quantidade e categorias (normalizadas), do maior para o menor', () => {
    const reply = buildTodayReply(
      [
        entry('gasto', 20, at(9, 23, 9), 'comer fora'),
        entry('gasto', 30, at(9, 23, 10), 'Mercado'),
        entry('gasto', 15, at(9, 23, 11), 'mercado'),
        entry('gasto', 1, at(9, 22, 11), 'Mercado'), // ontem
      ],
      NOW,
    );
    expect(reply).toBe(
      'Hoje você gastou R$ 65,00 em 3 lançamentos:\n• Mercado: R$ 45,00\n• Comer fora: R$ 20,00',
    );
  });

  it('um lançamento, categoria desconhecida vira Outros, e receita no fim', () => {
    expect(
      buildTodayReply(
        [entry('gasto', 50, at(9, 23, 9), 'xpto'), entry('receita', 100, at(9, 23, 10), 'Salário')],
        NOW,
      ),
    ).toBe(
      'Hoje você gastou R$ 50,00 em 1 lançamento:\n• Outros: R$ 50,00\nE entrou R$ 100,00 de receita.',
    );
  });
});

describe('buildWeekReply', () => {
  it('sem gastos', () => {
    expect(buildWeekReply([], NOW)).toBe('Nos últimos 7 dias você não registrou nenhum gasto.');
    expect(buildWeekReply([entry('receita', 300, at(9, 20), 'Freela')], NOW)).toBe(
      'Nos últimos 7 dias você não registrou gastos, mas entrou R$ 300,00 de receita.',
    );
  });

  it('total, média por dia, até 3 categorias + resto, receitas e saldo', () => {
    const reply = buildWeekReply(
      [
        entry('gasto', 100, at(9, 17, 0), 'Mercado'), // primeiro dia da janela
        entry('gasto', 60, at(9, 18), 'Transporte'),
        entry('gasto', 80, at(9, 19), 'Comer fora'),
        entry('gasto', 10, at(9, 20), 'Lazer'),
        entry('gasto', 5, at(9, 21), 'Saúde'),
        entry('gasto', 999, at(9, 16, 23), 'Mercado'), // fora da janela
        entry('receita', 1200, at(9, 23), 'Freela'),
      ],
      NOW,
    );
    expect(reply).toBe(
      'Nos últimos 7 dias você gastou R$ 255,00 em 5 lançamentos (média de R$ 36,43 por dia):\n' +
        '• Mercado: R$ 100,00\n• Comer fora: R$ 80,00\n• Transporte: R$ 60,00\n' +
        '• Outras categorias: R$ 15,00\n' +
        'Receitas: R$ 1.200,00 · Saldo: + R$ 945,00',
    );
  });

  it('saldo negativo com sinal de menos', () => {
    const reply = buildWeekReply(
      [entry('gasto', 100, at(9, 22), 'Mercado'), entry('receita', 40, at(9, 22), 'Freela')],
      NOW,
    );
    expect(reply).toContain('Receitas: R$ 40,00 · Saldo: − R$ 60,00');
  });
});
