import type { Transaction } from '../../../services/transactions';
import {
  filterTransactions,
  formatDayTitle,
  formatEntryCaption,
  formatListSummary,
  formatMonthOption,
  formatSignedAmount,
  getCategoryFilters,
  getRecentMonths,
  groupByDay,
  matchesSearch,
} from '../transactionList';

let nextId = 1;
const at = (month: number, day: number, hour = 12, minute = 0) =>
  new Date(2026, month - 1, day, hour, minute).toISOString();

const tx = (
  type: string,
  amount: number,
  category: string | null,
  createdAt: string,
  description: string | null = null,
): Transaction => ({
  id: String(nextId++),
  phone: '5511999999999',
  type,
  amount,
  category,
  description,
  messageId: null,
  createdAt,
});

const TODAY = new Date(2026, 9, 23, 18, 0); // sexta, 23 de outubro

describe('busca e filtro', () => {
  const lunch = tx('gasto', 32.9, 'Comer fora', at(10, 23, 12, 40), 'Almoço');
  const uber = tx('gasto', 18.5, 'Transporte', at(10, 23, 8, 15), 'Uber para o trabalho');
  const pharmacy = tx('gasto', 23.01, 'saude', at(10, 22, 7, 50), 'Farmácia');
  const salary = tx('receita', 5000, 'Salário', at(10, 5, 9, 0), null);

  it('busca na descrição e na categoria, sem caixa nem acento', () => {
    expect(matchesSearch(lunch, 'almoco')).toBe(true);
    expect(matchesSearch(pharmacy, 'SAÚ')).toBe(true);
    expect(matchesSearch(salary, 'salario')).toBe(true);
    expect(matchesSearch(uber, 'mercado')).toBe(false);
    expect(matchesSearch(uber, '   ')).toBe(true);
  });

  it('filtra por categoria normalizada e pela busca juntas', () => {
    const list = [lunch, uber, pharmacy, salary];
    expect(filterTransactions(list, { query: '', category: 'Saúde' })).toEqual([pharmacy]);
    expect(filterTransactions(list, { query: 'trabalho', category: null })).toEqual([uber]);
    expect(filterTransactions(list, { query: 'trabalho', category: 'Comer fora' })).toEqual([]);
  });

  it('chips: categorias de gasto pelo total, depois as de receita', () => {
    expect(
      getCategoryFilters([
        lunch,
        uber,
        tx('gasto', 20, 'Transporte', at(10, 1)),
        salary,
        tx('outro', 3, 'qualquer', at(10, 2)),
      ]),
    ).toEqual(['Transporte', 'Comer fora', 'Salário', 'Outros']);
  });
});

describe('agrupamento por dia', () => {
  it('títulos: hoje, ontem e dia da semana sem "-feira"', () => {
    expect(formatDayTitle(new Date(2026, 9, 23, 1), TODAY)).toBe('Hoje, 23 de outubro');
    expect(formatDayTitle(new Date(2026, 9, 22, 23), TODAY)).toBe('Ontem, 22 de outubro');
    expect(formatDayTitle(new Date(2026, 9, 21), TODAY)).toBe('Quarta, 21 de outubro');
    expect(formatDayTitle(new Date(2026, 9, 17), TODAY)).toBe('Sábado, 17 de outubro');
  });

  it('agrupa do dia mais recente ao mais antigo, com o total gasto do dia', () => {
    const groups = groupByDay(
      [
        tx('gasto', 10, 'Transporte', at(10, 22, 7, 30), 'Ônibus'),
        tx('gasto', 32.9, 'Comer fora', at(10, 23, 12, 40), 'Almoço'),
        tx('receita', 100, 'Freela', at(10, 23, 9, 0)),
        tx('gasto', 8.95, 'Comer fora', at(10, 22, 16, 5), 'Café'),
        tx('gasto', 18.5, 'Transporte', at(10, 23, 8, 15), 'Uber'),
      ],
      TODAY,
    );
    expect(groups.map((g) => g.title)).toEqual(['Hoje, 23 de outubro', 'Ontem, 22 de outubro']);
    expect(groups.map((g) => g.total)).toEqual([51.4, 18.95]);
    expect(groups[0].items.map((item) => item.description ?? item.category)).toEqual([
      'Almoço',
      'Freela',
      'Uber',
    ]);
  });
});

describe('textos', () => {
  it('resumo da lista', () => {
    const lunch = tx('gasto', 32.9, 'Comer fora', at(10, 23));
    const coffee = tx('gasto', 8.95, 'Comer fora', at(10, 22));
    expect(formatListSummary([lunch, coffee])).toBe('2 lançamentos, R$ 41,85 no total');
    expect(formatListSummary([lunch])).toBe('1 lançamento, R$ 32,90 no total');
    expect(formatListSummary([lunch, tx('receita', 100, 'Freela', at(10, 1))])).toBe(
      '2 lançamentos, R$ 32,90 em gastos',
    );
    expect(formatListSummary([])).toBe('Nenhum lançamento');
  });

  it('valor com sinal e legenda do item', () => {
    const lunch = tx('gasto', 32.9, 'comer fora', at(10, 23, 12, 40));
    expect(formatSignedAmount(lunch)).toBe('− R$ 32,90');
    expect(formatSignedAmount(tx('receita', 100, 'Freela', at(10, 1)))).toBe('+ R$ 100,00');
    expect(formatSignedAmount(tx('outro', 5, null, at(10, 1)))).toBe('R$ 5,00');
    expect(formatEntryCaption(lunch)).toBe('12:40');
    expect(formatEntryCaption(tx('gasto', 32.9, 'comer fora', at(10, 23, 12, 40), 'Almoço'))).toBe(
      'Comer fora, 12:40',
    );
  });

  it('meses para escolher', () => {
    const months = getRecentMonths(TODAY, 12);
    expect(months).toHaveLength(12);
    expect(months[0]).toEqual(new Date(2026, 9, 1));
    expect(months[11]).toEqual(new Date(2025, 10, 1));
    expect(formatMonthOption(months[0], TODAY)).toBe('Outubro');
    expect(formatMonthOption(months[11], TODAY)).toBe('Novembro de 2025');
  });
});
