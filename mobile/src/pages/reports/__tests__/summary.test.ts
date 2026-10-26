import {
  Transaction,
  getChartDataByCategory,
  getEntryAmount,
  getEntryCategory,
  getEntryType,
  summarizeTransactions,
} from '../summary';

let nextId = 1;
const tx = (type: string, amount: number, category?: string | null): Transaction => ({
  id: String(nextId++),
  type,
  amount,
  category,
  createdAt: '2026-10-01T12:00:00.000Z',
});

describe('getEntryType', () => {
  it.each([
    ['gasto', 'gasto'],
    ['receita', 'receita'],
    ['Gasto', 'gasto'],
    [' RECEITA ', 'receita'],
    ['  gasto\n', 'gasto'],
    ['transferência', 'outro'],
    ['', 'outro'],
  ])('%p -> %p', (type, expected) => {
    expect(getEntryType(tx(type, 1))).toBe(expected);
  });

  it('trata tipo ausente como "outro"', () => {
    expect(getEntryType({ ...tx('gasto', 1), type: undefined as unknown as string })).toBe('outro');
  });
});

describe('getEntryAmount', () => {
  it('converte para número e usa 0 quando inválido', () => {
    expect(getEntryAmount(tx('gasto', 12.5))).toBe(12.5);
    expect(getEntryAmount({ ...tx('gasto', 0), amount: '7.25' as unknown as number })).toBe(7.25);
    expect(getEntryAmount({ ...tx('gasto', 0), amount: 'abc' as unknown as number })).toBe(0);
    expect(getEntryAmount({ ...tx('gasto', 0), amount: null as unknown as number })).toBe(0);
  });
});

describe('getEntryCategory', () => {
  it('usa "Sem categoria" para categoria vazia, nula ou ausente', () => {
    expect(getEntryCategory(tx('gasto', 1, ''))).toBe('Sem categoria');
    expect(getEntryCategory(tx('gasto', 1, null))).toBe('Sem categoria');
    expect(getEntryCategory(tx('gasto', 1))).toBe('Sem categoria');
    expect(getEntryCategory(tx('gasto', 1, 'Mercado'))).toBe('Mercado');
  });
});

describe('summarizeTransactions', () => {
  it('soma só gastos no total, receitas à parte e calcula o saldo', () => {
    const summary = summarizeTransactions([
      tx('gasto', 50, 'Mercado'),
      tx('receita', 1000, 'Salário'),
      tx('Gasto ', 25.5, 'Transporte'),
      tx(' Receita', 200, 'Freela'),
      tx('outro', 999, 'Transferência'),
    ]);

    expect(summary.totalExpenses).toBe(75.5);
    expect(summary.totalIncome).toBe(1200);
    expect(summary.balance).toBe(1124.5);
    expect(summary.expenses.map((e) => e.category)).toEqual(['Mercado', 'Transporte']);
    expect(summary.incomes.map((e) => e.category)).toEqual(['Salário', 'Freela']);
  });

  it('saldo negativo quando gastos superam receitas', () => {
    const summary = summarizeTransactions([tx('gasto', 300), tx('receita', 100)]);
    expect(summary.balance).toBe(-200);
  });

  it('lista vazia zera tudo', () => {
    expect(summarizeTransactions([])).toEqual({
      expenses: [],
      incomes: [],
      totalExpenses: 0,
      totalIncome: 0,
      balance: 0,
    });
  });
});

describe('getChartDataByCategory', () => {
  it('agrupa só os gastos por categoria, na ordem em que aparecem', () => {
    const { expenses } = summarizeTransactions([
      tx('gasto', 30, 'Mercado'),
      tx('receita', 1000, 'Salário'),
      tx('gasto', 20, 'Lazer'),
      tx('GASTO', 15, 'Mercado'),
      tx('outro', 5, 'Mercado'),
    ]);

    expect(getChartDataByCategory(expenses)).toEqual({
      labels: ['Mercado', 'Lazer'],
      datasets: [{ data: [45, 20] }],
    });
  });

  it('junta gastos sem categoria em "Sem categoria"', () => {
    const { expenses } = summarizeTransactions([
      tx('gasto', 10, ''),
      tx('gasto', 5, null),
      tx('gasto', 2),
      tx('gasto', 1, 'Mercado'),
    ]);

    expect(getChartDataByCategory(expenses)).toEqual({
      labels: ['Sem categoria', 'Mercado'],
      datasets: [{ data: [17, 1] }],
    });
  });

  it('sem gastos não gera barras', () => {
    expect(getChartDataByCategory([])).toEqual({ labels: [], datasets: [{ data: [] }] });
  });
});
