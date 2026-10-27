// Cálculos e textos da barra de meta (funções puras, sem React), testados em __tests__/goalProgress.test.ts
import { formatCurrency } from '../global/formatCurrency';

export type GoalProgress = {
  /** Percentual inteiro do gasto sobre a meta (pode passar de 100). */
  percent: number;
  /** Fração preenchida da barra, entre 0 e 1. */
  fill: number;
  /** Gasto passou da meta. */
  isOver: boolean;
  /** Quanto ainda pode gastar (0 se passou). */
  remaining: number;
  /** Quanto passou da meta (0 se não passou). */
  exceededBy: number;
};

const toCents = (value: number) => Math.round(value * 100);

// `null` quando não há meta válida (sem meta, zero ou negativa): a barra não aparece.
export function getGoalProgress(spent: number, goal: number): GoalProgress | null {
  if (!Number.isFinite(goal) || goal <= 0) return null;

  const spentCents = Number.isFinite(spent) ? Math.max(toCents(spent), 0) : 0;
  const goalCents = toCents(goal);
  const ratio = spentCents / goalCents;
  const isOver = spentCents > goalCents;

  let percent = Math.round(ratio * 100);
  // Arredondar não pode mostrar 100% antes de chegar na meta (nem 0% com algum gasto)
  if (!isOver && spentCents < goalCents && percent >= 100) percent = 99;
  if (spentCents > 0 && percent === 0) percent = 1;
  if (isOver && percent <= 100) percent = 101;

  return {
    percent,
    fill: Math.min(ratio, 1),
    isOver,
    remaining: Math.max(goalCents - spentCents, 0) / 100,
    exceededBy: Math.max(spentCents - goalCents, 0) / 100,
  };
}

// "faltam 8 dias", "falta 1 dia", "último dia do mês"
export function formatDaysLeft(daysLeft: number): string {
  if (daysLeft <= 0) return 'último dia do mês';
  if (daysLeft === 1) return 'falta 1 dia';
  return `faltam ${daysLeft} dias`;
}

export type GoalLabels = {
  /** "86% da meta de R$ 1.500" */
  percentLabel: string;
  /** "Restam R$ 215,10", "Meta atingida" ou "R$ 230,00 acima da meta" */
  statusLabel: string;
  /** Frase completa para o leitor de tela. */
  accessibilityLabel: string;
};

export function getGoalLabels(progress: GoalProgress, goal: number): GoalLabels {
  const percentLabel = `${progress.percent}% da meta de ${formatCurrency(goal, { hideZeroCents: true })}`;

  let statusLabel: string;
  if (progress.isOver) statusLabel = `${formatCurrency(progress.exceededBy)} acima da meta`;
  else if (progress.remaining === 0) statusLabel = 'Meta atingida';
  else statusLabel = `Restam ${formatCurrency(progress.remaining)}`;

  const accessibilityLabel = progress.isOver
    ? `Atenção: ${percentLabel}; ${statusLabel}`
    : `${percentLabel}; ${statusLabel}`;

  return { percentLabel, statusLabel, accessibilityLabel };
}
