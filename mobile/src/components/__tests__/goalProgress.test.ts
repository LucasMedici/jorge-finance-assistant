import { formatDaysLeft, getGoalLabels, getGoalProgress } from '../goalProgress';

describe('getGoalProgress', () => {
  it('calcula o percentual e o restante dentro da meta (exemplo do canvas)', () => {
    expect(getGoalProgress(1284.9, 1500)).toEqual({
      percent: 86,
      fill: 1284.9 / 1500,
      isOver: false,
      remaining: 215.1,
      exceededBy: 0,
    });
  });

  it('sem gasto: 0% e a meta inteira restando', () => {
    expect(getGoalProgress(0, 1500)).toMatchObject({ percent: 0, fill: 0, remaining: 1500 });
  });

  it('exatamente na meta: 100%, sem passar', () => {
    expect(getGoalProgress(1500, 1500)).toMatchObject({
      percent: 100,
      fill: 1,
      isOver: false,
      remaining: 0,
      exceededBy: 0,
    });
  });

  it('acima da meta: barra cheia, percentual real e valor excedido', () => {
    expect(getGoalProgress(1730, 1500)).toEqual({
      percent: 115,
      fill: 1,
      isOver: true,
      remaining: 0,
      exceededBy: 230,
    });
  });

  it('não arredonda para 100% antes de chegar na meta', () => {
    expect(getGoalProgress(1499.99, 1500)?.percent).toBe(99);
  });

  it('passou por centavos: mostra mais de 100%', () => {
    expect(getGoalProgress(1500.01, 1500)).toMatchObject({
      percent: 101,
      isOver: true,
      exceededBy: 0.01,
    });
  });

  it('gasto pequeno não aparece como 0%', () => {
    expect(getGoalProgress(1, 1500)?.percent).toBe(1);
  });

  it('evita erro de ponto flutuante no restante', () => {
    expect(getGoalProgress(0.1 + 0.2, 1)?.remaining).toBe(0.7);
  });

  it('gasto inválido ou negativo conta como zero', () => {
    expect(getGoalProgress(NaN, 100)).toMatchObject({ percent: 0, remaining: 100 });
    expect(getGoalProgress(-50, 100)).toMatchObject({ percent: 0, remaining: 100 });
  });

  it.each([0, -10, NaN, Infinity])('sem meta válida (%p) devolve null', (goal) => {
    expect(getGoalProgress(100, goal)).toBeNull();
  });
});

describe('getGoalLabels', () => {
  it('dentro da meta', () => {
    const progress = getGoalProgress(1284.9, 1500)!;
    expect(getGoalLabels(progress, 1500)).toEqual({
      percentLabel: '86% da meta de R$ 1.500',
      statusLabel: 'Restam R$ 215,10',
      accessibilityLabel: '86% da meta de R$ 1.500; Restam R$ 215,10',
    });
  });

  it('meta atingida', () => {
    expect(getGoalLabels(getGoalProgress(1500, 1500)!, 1500).statusLabel).toBe('Meta atingida');
  });

  it('acima da meta avisa em texto, não só na cor', () => {
    const labels = getGoalLabels(getGoalProgress(1730, 1500)!, 1500);
    expect(labels.statusLabel).toBe('R$ 230,00 acima da meta');
    expect(labels.accessibilityLabel).toBe(
      'Atenção: 115% da meta de R$ 1.500; R$ 230,00 acima da meta',
    );
  });

  it('meta com centavos mostra os centavos', () => {
    expect(getGoalLabels(getGoalProgress(0, 1500.5)!, 1500.5).percentLabel).toBe(
      '0% da meta de R$ 1.500,50',
    );
  });
});

describe('formatDaysLeft', () => {
  it.each([
    [8, 'faltam 8 dias'],
    [1, 'falta 1 dia'],
    [0, 'último dia do mês'],
  ])('%p -> %p', (days, expected) => {
    expect(formatDaysLeft(days)).toBe(expected);
  });
});
