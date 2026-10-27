import { dayFromX, getChartScale, getSeriesPoints, niceStep, toPath } from '../chartScale';

describe('niceStep', () => {
  it.each([
    [454, 500],
    [100, 100],
    [101, 200],
    [180, 200],
    [210, 250],
    [0.3, 0.5],
    [0, 1],
  ])('%p -> %p', (raw, expected) => {
    expect(niceStep(raw)).toBeCloseTo(expected);
  });
});

describe('getChartScale', () => {
  it('topo com folga e grade em valores redondos', () => {
    // Projeção de R$ 1.730 (canvas): grade em 500, 1.000 e 1.500
    expect(getChartScale(1730)).toEqual({ yMax: 1730 * 1.05, ticks: [500, 1000, 1500] });
  });

  it('sem valores não quebra', () => {
    expect(getChartScale(0).yMax).toBeCloseTo(1.05);
  });
});

describe('getSeriesPoints / toPath', () => {
  it('começa em zero e põe cada dia no fim do dia', () => {
    expect(getSeriesPoints([10, 30], 31, 310)).toEqual([
      { x: 0, value: 0 },
      { x: 10, value: 10 },
      { x: 20, value: 30 },
    ]);
  });

  it('monta o caminho SVG', () => {
    expect(
      toPath([
        { x: 0, y: 150 },
        { x: 11.04, y: 147.12 },
      ]),
    ).toBe('M0.0 150.0 L11.0 147.1');
  });
});

describe('dayFromX', () => {
  it('converte a posição do dedo no dia, dentro do mês', () => {
    expect(dayFromX(253.7, 342, 31)).toBe(23);
    expect(dayFromX(-10, 342, 31)).toBe(1);
    expect(dayFromX(400, 342, 31)).toBe(31);
    expect(dayFromX(10, 0, 31)).toBe(1);
  });
});
