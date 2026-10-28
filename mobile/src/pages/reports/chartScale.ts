// Escala e geometria do gráfico "Ritmo do mês" (funções puras), testadas em __tests__/chartScale.test.ts

/** Passo "redondo" (1, 2, 2,5 ou 5 × 10ⁿ) que seja pelo menos `raw`. */
export function niceStep(raw: number): number {
  if (!(raw > 0)) return 1;
  const power = 10 ** Math.floor(Math.log10(raw));
  for (const factor of [1, 2, 2.5, 5, 10]) {
    if (factor * power >= raw) return factor * power;
  }
  return 10 * power;
}

export type ChartScale = {
  /** Valor no topo da área do gráfico. */
  yMax: number;
  /** Linhas de grade (acima de zero e abaixo do topo). */
  ticks: number[];
};

/** Topo com 5% de folga sobre o maior valor e ~4 faixas de grade. */
export function getChartScale(maxValue: number): ChartScale {
  const yMax = Math.max(maxValue, 1) * 1.05;
  const step = niceStep(yMax / 4);
  const ticks: number[] = [];
  for (let value = step; value < yMax; value += step) ticks.push(value);
  return { yMax, ticks };
}

/**
 * Pontos de uma série acumulada por dia: começa em (0, 0) e o dia `d` fica no fim do dia
 * (`x = d / daysInMonth × width`).
 */
export function getSeriesPoints(
  values: number[],
  daysInMonth: number,
  width: number,
): { x: number; value: number }[] {
  return [
    { x: 0, value: 0 },
    ...values.map((value, index) => ({ x: ((index + 1) / daysInMonth) * width, value })),
  ];
}

/** Caminho SVG ("M0 150 L11 147 ...") ligando os pontos. */
export function toPath(points: { x: number; y: number }[]): string {
  return points
    .map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
    .join(' ');
}

/** Dia do mês sob o dedo (1 a `daysInMonth`). */
export function dayFromX(x: number, width: number, daysInMonth: number): number {
  if (width <= 0) return 1;
  const day = Math.round((x / width) * daysInMonth);
  return Math.min(Math.max(day, 1), daysInMonth);
}
