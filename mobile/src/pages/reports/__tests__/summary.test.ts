import { themas } from '../../../global/themes';
import type { Transaction } from '../../../services/transactions';
import { getComparisonNames, getPreviousRange } from '../periods';
import {
  filterByRange,
  findCategoryRow,
  formatCategoryCaption,
  formatChange,
  formatGoalWarning,
  formatHistoryHeadline,
  formatPaceSentence,
  formatShare,
  getCategoryBreakdown,
  getCategoryHistory,
  getCumulativeByDay,
  getEntryAmount,
  getEntryCategory,
  getEntryTitle,
  getEntryType,
  getGoalForecast,
  getHistoryRange,
  getMonthPace,
  getPercentChange,
  getTopExpenses,
  projectMonthEnd,
  roundApprox,
  sortByDateDesc,
  sumExpenses,
} from '../summary';

let nextId = 1;
// Data local (ano, mês 1-12, dia, hora): o app sempre lê `createdAt` no fuso do aparelho
const at = (year: number, month: number, day: number, hour = 12, minute = 0) =>
  new Date(year, month - 1, day, hour, minute).toISOString();

const tx = (
  type: string,
  amount: number,
  category: string | null = 'Mercado',
  createdAt = at(2026, 10, 1),
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

const OCT = new Date(2026, 9, 1);
const SEP_NAMES = { over: 'setembro', equal: 'a setembro', none: 'em setembro' };

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
    expect(getEntryType({ type: undefined as unknown as string })).toBe('outro');
  });
});

describe('getEntryAmount', () => {
  it('converte para número e usa 0 quando inválido', () => {
    expect(getEntryAmount(tx('gasto', 12.5))).toBe(12.5);
    expect(getEntryAmount({ amount: '7.25' as unknown as number })).toBe(7.25);
    expect(getEntryAmount({ amount: 'abc' as unknown as number })).toBe(0);
    expect(getEntryAmount({ amount: null as unknown as number })).toBe(0);
  });
});

describe('getEntryCategory / getEntryTitle', () => {
  it('normaliza pela lista do tipo; vazia, antiga ou "outro" vira "Outros"', () => {
    expect(getEntryCategory(tx('gasto', 1, 'saude'))).toBe('Saúde');
    expect(getEntryCategory(tx('gasto', 1, null))).toBe('Outros');
    expect(getEntryCategory(tx('gasto', 1, 'Restaurante'))).toBe('Outros');
    expect(getEntryCategory(tx('receita', 1, 'salario'))).toBe('Salário');
    expect(getEntryCategory(tx('outro', 1, 'Mercado'))).toBe('Outros');
  });

  it('usa a descrição e, sem ela, a categoria', () => {
    expect(getEntryTitle(tx('gasto', 1, 'Mercado', at(2026, 10, 1), ' Feira '))).toBe('Feira');
    expect(getEntryTitle(tx('gasto', 1, 'Mercado', at(2026, 10, 1), '  '))).toBe('Mercado');
  });
});

describe('sumExpenses / filterByRange', () => {
  it('soma só gastos, sem erro de ponto flutuante', () => {
    expect(
      sumExpenses([tx('gasto', 0.1), tx('gasto', 0.2), tx('receita', 1000), tx('outro', 5)]),
    ).toBe(0.3);
  });

  it('inclui o dia final inteiro e corta fora do intervalo', () => {
    const list = [
      tx('gasto', 1, 'Mercado', at(2026, 9, 30, 23, 59)),
      tx('gasto', 2, 'Mercado', at(2026, 10, 1, 0, 0)),
      tx('gasto', 3, 'Mercado', at(2026, 10, 31, 23, 59)),
      tx('gasto', 4, 'Mercado', at(2026, 11, 1, 0, 0)),
    ];
    const range = { start: new Date(2026, 9, 1), end: new Date(2026, 9, 31) };
    expect(filterByRange(list, range).map((t) => t.amount)).toEqual([2, 3]);
  });

  it('ordena do mais recente ao mais antigo', () => {
    const list = [
      tx('gasto', 1, 'Mercado', at(2026, 10, 2)),
      tx('gasto', 2, 'Mercado', at(2026, 10, 5)),
    ];
    expect(sortByDateDesc(list).map((t) => t.amount)).toEqual([2, 1]);
  });
});

describe('getPercentChange / formatChange', () => {
  it('variação inteira; sem base devolve null', () => {
    expect(getPercentChange(132, 100)).toBe(32);
    expect(getPercentChange(88, 100)).toBe(-12);
    expect(getPercentChange(100.4, 100)).toBe(0);
    expect(getPercentChange(50, 0)).toBeNull();
  });

  it('formata com seta, "igual a" e "sem gastos"', () => {
    expect(formatChange(32, SEP_NAMES)).toBe('↑ 32% sobre setembro');
    expect(formatChange(-12, SEP_NAMES)).toBe('↓ 12% sobre setembro');
    expect(formatChange(0, SEP_NAMES)).toBe('igual a setembro');
    expect(formatChange(null, SEP_NAMES)).toBe('sem gastos em setembro');
  });
});

describe('getCumulativeByDay', () => {
  it('acumula só os gastos do mês, dia a dia, no fuso local', () => {
    const series = getCumulativeByDay(
      [
        tx('gasto', 10, 'Mercado', at(2026, 10, 1, 0, 30)),
        tx('gasto', 5, 'Mercado', at(2026, 10, 1, 23, 50)),
        tx('receita', 100, 'Salário', at(2026, 10, 2)),
        tx('gasto', 20, 'Lazer', at(2026, 10, 3)),
        tx('gasto', 99, 'Lazer', at(2026, 9, 30, 23, 59)),
        tx('gasto', 99, 'Lazer', at(2026, 11, 1, 0, 0)),
      ],
      OCT,
    );
    expect(series).toHaveLength(31);
    expect(series.slice(0, 4)).toEqual([15, 15, 35, 35]);
    expect(series[30]).toBe(35);
  });
});

describe('getMonthPace', () => {
  const entries = [
    tx('gasto', 100, 'Mercado', at(2026, 9, 5)),
    tx('gasto', 200, 'Mercado', at(2026, 9, 25)),
    tx('gasto', 50, 'Mercado', at(2026, 10, 2)),
    tx('gasto', 60, 'Mercado', at(2026, 10, 10)),
  ];

  it('mês atual: série até hoje, comparação no mesmo dia e projeção linear', () => {
    const pace = getMonthPace(entries, OCT, new Date(2026, 9, 10, 15));
    expect(pace.isCurrentMonth).toBe(true);
    expect(pace.refDay).toBe(10);
    expect(pace.current).toHaveLength(10);
    expect(pace.spent).toBe(110);
    expect(pace.previous).toHaveLength(30);
    expect(pace.previousAtSameDay).toBe(100);
    expect(pace.projection).toBeCloseTo(341);
  });

  it('mês fechado: compara meses inteiros e não projeta', () => {
    const pace = getMonthPace(entries, new Date(2026, 8, 1), new Date(2026, 9, 10));
    expect(pace.isCurrentMonth).toBe(false);
    expect(pace.refDay).toBe(30);
    expect(pace.spent).toBe(300);
    expect(pace.previousAtSameDay).toBe(0);
    expect(pace.projection).toBeNull();
  });

  it('mês anterior mais curto: compara com o último dia dele', () => {
    const list = [
      tx('gasto', 40, 'Mercado', at(2026, 2, 28)),
      tx('gasto', 10, 'Mercado', at(2026, 3, 30)),
    ];
    const pace = getMonthPace(list, new Date(2026, 2, 1), new Date(2026, 2, 31));
    expect(pace.previous).toHaveLength(28);
    expect(pace.previousAtSameDay).toBe(40);
    expect(pace.projection).toBeNull();
  });

  it('frases do ritmo', () => {
    const today = new Date(2026, 9, 10);
    expect(formatPaceSentence(getMonthPace(entries, OCT, today), OCT)).toBe(
      'Até hoje você gastou 10% a mais que no mesmo dia de setembro.',
    );
    expect(formatPaceSentence(getMonthPace([], OCT, today), OCT)).toBe(
      'Nenhum gasto registrado em outubro ainda.',
    );
    expect(
      formatPaceSentence(
        getMonthPace([tx('gasto', 5, 'Mercado', at(2026, 10, 1))], OCT, today),
        OCT,
      ),
    ).toBe('Em setembro não havia gastos até o mesmo dia.');
    const sep = new Date(2026, 8, 1);
    const closed = [...entries, tx('gasto', 600, 'Mercado', at(2026, 8, 3))];
    expect(formatPaceSentence(getMonthPace(closed, sep, today), sep)).toBe(
      'Em setembro você gastou 50% a menos que em agosto.',
    );
  });

  it('projeção linear pelo ritmo médio diário', () => {
    expect(projectMonthEnd(1284.9, 23, 31)).toBeCloseTo(1731.82, 1);
    expect(projectMonthEnd(100, 0, 31)).toBe(100);
  });
});

describe('getGoalForecast / formatGoalWarning', () => {
  const pace = {
    spent: 1284.9,
    projection: projectMonthEnd(1284.9, 23, 31),
    refDay: 23,
    daysInMonth: 31,
  };

  it('avisa quando a projeção passa da meta, com o limite por dia (arredondado para baixo)', () => {
    const forecast = getGoalForecast(pace, 1500);
    expect(forecast).toEqual({
      projection: 1730,
      overBy: 230,
      alreadyOver: false,
      dailyAllowance: 26,
    });
    const text = formatGoalWarning(forecast!, OCT, pace.spent, 1500)
      .map((part) => part.text)
      .join('');
    expect(text).toBe(
      'Atenção: no ritmo atual, outubro fecha em cerca de R$ 1.730, R$ 230 acima da meta. ' +
        'Para ficar dentro, gaste até R$ 26 por dia até o fim do mês.',
    );
  });

  it('sem aviso se a projeção cabe na meta, sem meta ou sem projeção', () => {
    expect(getGoalForecast(pace, 2000)).toBeNull();
    expect(getGoalForecast(pace, null)).toBeNull();
    expect(getGoalForecast({ ...pace, projection: null }, 1000)).toBeNull();
  });

  it('meta já estourada: diz quanto passou', () => {
    const over = { spent: 1600, projection: 2000, refDay: 25, daysInMonth: 31 };
    const forecast = getGoalForecast(over, 1500)!;
    expect(forecast.alreadyOver).toBe(true);
    expect(forecast.dailyAllowance).toBeNull();
    expect(
      formatGoalWarning(forecast, OCT, over.spent, 1500)
        .map((part) => part.text)
        .join(''),
    ).toBe(
      'Atenção: outubro já passou da meta em R$ 100,00. No ritmo atual, fecha em cerca de R$ 2.000.',
    );
  });

  it('arredonda "de cabeça"', () => {
    expect(roundApprox(1731.8)).toBe(1730);
    expect(roundApprox(87.4)).toBe(87);
  });
});

describe('getCategoryBreakdown', () => {
  const sep = (amount: number, category: string) => tx('gasto', amount, category, at(2026, 9, 10));
  const oct = (amount: number, category: string) => tx('gasto', amount, category, at(2026, 10, 10));

  const current = [
    oct(400, 'Mercado'),
    oct(300, 'Comer fora'),
    oct(200, 'Transporte'),
    oct(100, 'Lazer'),
    oct(50, 'Saúde'),
    oct(30, 'Compras'),
    oct(20, 'Outros'),
    oct(10, 'categoria antiga'),
    tx('receita', 5000, 'Salário', at(2026, 10, 5)),
  ];
  const previous = [
    sep(300, 'Mercado'),
    sep(300, 'Comer fora'),
    sep(250, 'Transporte'),
    sep(10, 'Saúde'),
  ];

  it('top 4 com as cores na ordem do ranking e o resto em "Outros"', () => {
    const rows = getCategoryBreakdown(current, previous);
    expect(rows.map((row) => row.label)).toEqual([
      'Mercado',
      'Comer fora',
      'Transporte',
      'Lazer',
      'Outros',
    ]);
    expect(rows.map((row) => row.color)).toEqual([
      ...themas.categoryColors,
      themas.categoryOtherColor,
    ]);

    const others = rows[4];
    expect(others.isOthers).toBe(true);
    expect(others.categories).toEqual(['Outros', 'Saúde', 'Compras']);
    expect(others.total).toBe(110);
    expect(others.smallCount).toBe(2);
    expect(others.previousTotal).toBe(10);
  });

  it('participação, largura da barra e variação sobre o período anterior', () => {
    const rows = getCategoryBreakdown(current, previous);
    expect(rows[0].share).toBeCloseTo(400 / 1110);
    expect(rows[0].fill).toBe(1);
    expect(rows[1].fill).toBe(0.75);
    expect(rows[0].change).toBe(33);
    expect(rows[1].change).toBe(0);
    expect(rows[2].change).toBe(-20);
    expect(rows[3].change).toBeNull();
  });

  it('legendas', () => {
    const rows = getCategoryBreakdown(current, previous);
    expect(formatCategoryCaption(rows[0], SEP_NAMES)).toBe('36% do total, ↑ 33% sobre setembro');
    expect(formatCategoryCaption(rows[1], SEP_NAMES)).toBe('27% do total, igual a setembro');
    expect(formatCategoryCaption(rows[3], SEP_NAMES)).toBe('9% do total, sem gastos em setembro');
    expect(formatCategoryCaption(rows[4], SEP_NAMES)).toBe('10% do total, 2 categorias pequenas');
    expect(formatShare(0.004)).toBe('menos de 1% do total');
  });

  it('"Outros" só com a própria categoria mostra a variação; até 4 categorias não há grupo', () => {
    const rows = getCategoryBreakdown(
      [oct(100, 'Mercado'), oct(20, 'Outros')],
      [sep(10, 'Outros')],
    );
    expect(rows.map((row) => row.label)).toEqual(['Mercado', 'Outros']);
    expect(rows[1].smallCount).toBe(0);
    expect(formatCategoryCaption(rows[1], SEP_NAMES)).toBe('17% do total, ↑ 100% sobre setembro');
    expect(findCategoryRow(rows, 'Outros')?.categories).toEqual(['Outros']);

    expect(
      getCategoryBreakdown([oct(1, 'Mercado'), oct(2, 'Lazer')], []).map((r) => r.label),
    ).toEqual(['Lazer', 'Mercado']);
  });

  it('sem gastos não tem linhas', () => {
    expect(getCategoryBreakdown([tx('receita', 10, 'Salário')], [])).toEqual([]);
  });
});

describe('getTopExpenses', () => {
  it('os 3 maiores gastos; empate vai para o mais recente', () => {
    const list = [
      tx('gasto', 50, 'Mercado', at(2026, 10, 1)),
      tx('receita', 900, 'Salário', at(2026, 10, 1)),
      tx('gasto', 80, 'Mercado', at(2026, 10, 2)),
      tx('gasto', 50, 'Mercado', at(2026, 10, 3)),
      tx('gasto', 10, 'Mercado', at(2026, 10, 4)),
    ];
    const top = getTopExpenses(list);
    expect(top.map((t) => t.amount)).toEqual([80, 50, 50]);
    expect(top[1].createdAt).toBe(at(2026, 10, 3));
  });
});

describe('detalhe da categoria', () => {
  const month = (m: number, amount: number, category = 'Mercado') =>
    tx('gasto', amount, category, at(2026, m, 15));

  it('busca os 6 meses até o mês de referência', () => {
    expect(getHistoryRange(OCT)).toEqual({
      start: new Date(2026, 4, 1),
      end: new Date(2026, 9, 31),
    });
  });

  it('total por mês das categorias e média a partir do primeiro mês com dados', () => {
    const history = getCategoryHistory(
      [month(7, 100), month(8, 200), month(8, 999, 'Lazer'), month(10, 300), month(3, 999)],
      ['Mercado'],
      OCT,
    );
    expect(history.months.map((m) => m.total)).toEqual([0, 0, 100, 200, 0, 300]);
    expect(history.months[0].start).toEqual(new Date(2026, 4, 1));
    expect(history.averageMonths).toBe(4);
    expect(history.average).toBe(150);
  });

  it('frase com variação e maior/menor valor', () => {
    const rising = getCategoryHistory(
      [month(7, 100), month(8, 200), month(9, 300), month(10, 396)],
      ['Mercado'],
      OCT,
    );
    expect(formatHistoryHeadline(rising)).toBe(
      '↑ 32% sobre setembro, e o maior valor dos últimos 6 meses.',
    );
    const falling = getCategoryHistory(
      [month(7, 300), month(8, 200), month(9, 200), month(10, 100)],
      ['Mercado'],
      OCT,
    );
    expect(formatHistoryHeadline(falling)).toBe(
      '↓ 50% sobre setembro, e o menor valor dos últimos 6 meses.',
    );
    const middle = getCategoryHistory(
      [month(8, 300), month(9, 100), month(10, 200)],
      ['Mercado'],
      OCT,
    );
    expect(formatHistoryHeadline(middle)).toBe('↑ 100% sobre setembro.');
    const fresh = getCategoryHistory([month(10, 50)], ['Mercado'], OCT);
    expect(formatHistoryHeadline(fresh)).toBe('Sem gastos em setembro.');
    const none = getCategoryHistory([month(10, 50, 'Lazer')], ['Mercado'], OCT);
    expect(formatHistoryHeadline(none)).toBe('Nenhum gasto em outubro nem em setembro.');
  });

  it('o grupo "Outros" soma todas as categorias dele', () => {
    const history = getCategoryHistory(
      [month(10, 10, 'Saúde'), month(10, 5, 'Compras'), month(10, 7, 'Lazer')],
      ['Saúde', 'Compras'],
      OCT,
    );
    expect(history.months[5].total).toBe(15);
  });
});

describe('comparação de períodos', () => {
  it('nomes do período anterior em cada tipo de período', () => {
    const today = new Date(2026, 9, 27);
    expect(getComparisonNames('month', getPreviousRange('month', today))).toEqual(SEP_NAMES);
    expect(getComparisonNames('week', getPreviousRange('week', today)).equal).toBe(
      'à semana anterior',
    );
    expect(getComparisonNames('year', getPreviousRange('year', today))).toEqual({
      over: '2025',
      equal: 'a 2025',
      none: 'em 2025',
    });
  });
});
