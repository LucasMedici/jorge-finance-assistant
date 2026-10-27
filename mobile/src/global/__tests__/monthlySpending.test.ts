import {
  averageMonthlySpending,
  getAverageSpendingRange,
  type SpendingTransaction,
} from '../monthlySpending';

// Hoje: 27/10/2026 → meses fechados da janela: julho, agosto e setembro
const TODAY = new Date(2026, 9, 27, 10, 0);

// Meio do mês, meio-dia UTC: cai no mesmo mês em qualquer fuso
const tx = (month: number, amount: number, type = 'gasto', day = 15): SpendingTransaction => ({
  type,
  amount,
  createdAt: new Date(Date.UTC(2026, month - 1, day, 12)).toISOString(),
});

describe('getAverageSpendingRange', () => {
  it('do 1º dia de 3 meses atrás até hoje, em YYYY-MM-DD', () => {
    expect(getAverageSpendingRange(TODAY)).toEqual({
      startDate: '2026-07-01',
      endDate: '2026-10-27',
    });
  });

  it('atravessa a virada do ano', () => {
    expect(getAverageSpendingRange(new Date(2026, 1, 3))).toEqual({
      startDate: '2025-11-01',
      endDate: '2026-02-03',
    });
  });
});

describe('averageMonthlySpending', () => {
  it('média dos 3 meses fechados, só gastos', () => {
    const transactions = [
      tx(7, 1000),
      tx(7, 200),
      tx(8, 1300),
      tx(9, 1520),
      tx(9, 5000, 'receita'),
      tx(9, 70, 'outro'),
    ];
    expect(averageMonthlySpending(transactions, TODAY)).toBe(1340);
  });

  it('ignora o mês atual e meses fora da janela no valor', () => {
    const transactions = [tx(6, 9999), tx(7, 300), tx(8, 300), tx(9, 300), tx(10, 9999)];
    expect(averageMonthlySpending(transactions, TODAY)).toBe(300);
  });

  it('aceita tipo com caixa/espaços diferentes e valor em texto', () => {
    const transactions: SpendingTransaction[] = [
      { type: ' Gasto ', amount: '150.50', createdAt: tx(9, 0).createdAt },
    ];
    expect(averageMonthlySpending(transactions, TODAY)).toBe(150.5);
  });

  it('sem dados na janela: null', () => {
    expect(averageMonthlySpending([], TODAY)).toBeNull();
    expect(averageMonthlySpending([tx(6, 500)], TODAY)).toBeNull();
  });

  it('só dados no mês atual: null (ainda não há mês fechado)', () => {
    expect(averageMonthlySpending([tx(10, 500)], TODAY)).toBeNull();
  });

  it('meses antes do primeiro dado ficam de fora (começou a usar em setembro)', () => {
    expect(averageMonthlySpending([tx(9, 900), tx(10, 50)], TODAY)).toBe(900);
  });

  it('mês sem gasto no meio conta como 0', () => {
    expect(averageMonthlySpending([tx(7, 600), tx(9, 900)], TODAY)).toBe(500);
  });

  it('mês só com receita conta como 0 (há dado no mês)', () => {
    expect(averageMonthlySpending([tx(7, 600), tx(8, 3000, 'receita'), tx(9, 900)], TODAY)).toBe(
      500,
    );
  });

  it('meses vazios no fim contam como 0 só se houver dados depois (no mês atual)', () => {
    // Sem nada depois de julho: agosto e setembro ficam de fora
    expect(averageMonthlySpending([tx(7, 600)], TODAY)).toBe(600);
    // Com registro em outubro: agosto e setembro contam como 0
    expect(averageMonthlySpending([tx(7, 600), tx(10, 10)], TODAY)).toBe(200);
  });

  it('arredonda para centavos', () => {
    expect(averageMonthlySpending([tx(7, 100), tx(8, 100), tx(9, 100.01)], TODAY)).toBe(100);
  });

  it('janela atravessando a virada do ano', () => {
    const today = new Date(2026, 1, 10); // fevereiro: novembro, dezembro e janeiro
    const transactions: SpendingTransaction[] = [
      { type: 'gasto', amount: 300, createdAt: new Date(Date.UTC(2025, 10, 15, 12)).toISOString() },
      { type: 'gasto', amount: 600, createdAt: new Date(Date.UTC(2025, 11, 15, 12)).toISOString() },
      { type: 'gasto', amount: 900, createdAt: new Date(Date.UTC(2026, 0, 15, 12)).toISOString() },
    ];
    expect(averageMonthlySpending(transactions, today)).toBe(600);
  });

  it('ignora datas inválidas', () => {
    const transactions = [tx(9, 400), { type: 'gasto', amount: 999, createdAt: 'não é data' }];
    expect(averageMonthlySpending(transactions, TODAY)).toBe(400);
  });
});
