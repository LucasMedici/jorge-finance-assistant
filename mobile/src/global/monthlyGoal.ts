// Regras da meta mensal de gastos (funções puras), testadas em __tests__/monthlyGoal.test.ts
import { isAxiosError } from 'axios';
import { formatCurrency } from './formatCurrency';

/** Atalhos da folha da meta. */
export const GOAL_PRESETS = [1000, 1500, 2000];

/** Maior valor que cabe em `Decimal(12,2)` (mesmo limite do backend). */
export const MAX_GOAL = 9_999_999_999.99;

export type ParsedGoal = { ok: true; value: number } | { ok: false; error: string };

// Parte inteira com milhar separado por ponto ("1.500") ou sem separador ("1500"); centavos depois da vírgula
const BR_FORMAT = /^(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d{0,2}))?$/;
// Sem vírgula, um ponto seguido de 1 ou 2 dígitos é decimal ("1500.5"): o teclado decimal de alguns Androids só tem ponto
const DOT_DECIMAL = /^(\d+)\.(\d{1,2})$/;

/**
 * Lê o valor digitado no campo da meta: aceita "1500", "1.500", "1.500,50", "1500,5" e "1500.50".
 * Devolve o número ou a mensagem de erro para mostrar na folha.
 */
export function parseGoalInput(text: string): ParsedGoal {
  const clean = text.replace(/\s/g, '');
  if (!clean) return { ok: false, error: 'Digite o valor da meta.' };

  const match = BR_FORMAT.exec(clean) ?? DOT_DECIMAL.exec(clean);
  if (!match) return { ok: false, error: 'Digite um valor válido, como 1.500 ou 1.500,50.' };

  const integerPart = match[1].replace(/\./g, '');
  const value = Number(`${integerPart}.${match[2] || '0'}`);

  if (value <= 0) return { ok: false, error: 'A meta precisa ser maior que zero.' };
  if (value > MAX_GOAL) return { ok: false, error: 'Esse valor é alto demais para uma meta.' };
  return { ok: true, value };
}

/** Valor da meta no formato do campo, sem o "R$" (1500 → "1.500"; 1500.5 → "1.500,50"). */
export function formatGoalInput(value: number): string {
  return formatCurrency(value, { hideZeroCents: true }).replace(/^R\$\s/, '');
}

/**
 * Mensagem para erros de `GET`/`PUT /user/:id`: a do backend no 400 (`{ error, fields }`),
 * aviso de conexão quando não houve resposta, ou o `fallback`.
 */
export function getGoalErrorMessage(
  error: unknown,
  fallback = 'Não foi possível salvar a meta. Tente de novo.',
): string {
  if (!isAxiosError(error)) return fallback;
  if (!error.response) return 'Sem conexão com o servidor. Tente de novo.';

  const data = error.response.data as
    | { error?: unknown; fields?: Record<string, unknown> }
    | undefined;

  if (error.response.status === 400) {
    const fieldMessages = data?.fields?.monthlyGoal;
    if (Array.isArray(fieldMessages) && typeof fieldMessages[0] === 'string') {
      return fieldMessages[0];
    }
    if (typeof data?.error === 'string' && data.error) return data.error;
  }

  return fallback;
}
