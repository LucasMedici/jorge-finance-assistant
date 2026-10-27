// Lógica da folha "Corrigir lançamento" (funções puras, sem React), testada em
// __tests__/correctTransaction.test.ts
import { format, isSameDay, isSameYear, parseISO, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Category, CategoryType, normalizeCategory } from '../global/categories';
import { formatCurrency } from '../global/formatCurrency';
import type { Transaction, TransactionPatch, TransactionType } from '../services/transactions';

/** Maior valor aceito pelo backend (`Decimal(12,2)`). */
export const MAX_AMOUNT = 9999999999.99;

/** Valores editáveis da folha. */
export type CorrectionForm = {
  type: CategoryType;
  /** Texto do campo de valor, como digitado ("50,00", "1.234,56"). */
  amount: string;
  category: Category;
  description: string;
  /** Dia do lançamento em `YYYY-MM-DD`, no fuso local. */
  date: string;
};

const toCents = (value: number) => Math.round(value * 100);

/** Tipo da transação como a API grava ("Gasto " → "gasto"); qualquer outra coisa é "outro". */
export function getTransactionType(type: string | null | undefined): TransactionType {
  const normalized = String(type ?? '')
    .trim()
    .toLowerCase();
  return normalized === 'gasto' || normalized === 'receita' ? normalized : 'outro';
}

/** Tipo mostrado na folha: só Gasto/Receita existem nela ("outro" aparece como Gasto). */
export function toCorrectionType(type: string | null | undefined): CategoryType {
  return getTransactionType(type) === 'receita' ? 'receita' : 'gasto';
}

/** Dia da transação (`createdAt` ISO) em `YYYY-MM-DD` no fuso local. */
export function getTransactionDay(createdAt: string): string {
  return format(new Date(createdAt), 'yyyy-MM-dd');
}

/** Valor no formato do campo, sem "R$" (1234.5 → "1.234,50"). */
export function formatAmountInput(value: number): string {
  return formatCurrency(Math.abs(value)).replace(/^R\$\s*/, '');
}

/** Mantém só dígitos, vírgula e ponto no que foi digitado. */
export function sanitizeAmountInput(text: string): string {
  return text.replace(/[^\d.,]/g, '').slice(0, 20);
}

/**
 * Converte o texto do campo em número com 2 casas, no padrão brasileiro: "50", "50,5", "1.234,56".
 * Sem vírgula, o ponto vale como separador de milhar só em grupos de 3 ("1.234" → 1234); senão é a
 * vírgula decimal digitada com o ponto do teclado ("12.5" → 12.5). `null` se não for um valor válido.
 */
export function parseAmountInput(text: string): number | null {
  const compact = text.replace(/\s+/g, '').replace(/^R\$/i, '');
  if (!compact) return null;

  let normalized: string;
  if (compact.includes(',')) {
    // Vírgula decimal: pontos só podem separar milhares
    const [integerPart, ...rest] = compact.split(',');
    if (rest.length !== 1) return null;
    if (integerPart.includes('.') && !/^\d{1,3}(\.\d{3})+$/.test(integerPart)) return null;
    normalized = `${integerPart.replace(/\./g, '')}.${rest[0]}`;
  } else if (/^\d{1,3}(\.\d{3})+$/.test(compact)) {
    normalized = compact.replace(/\./g, '');
  } else {
    normalized = compact;
  }

  if (!/^\d*(\.\d{0,2})?$/.test(normalized) || !/\d/.test(normalized)) return null;
  const value = Number(normalized);
  return Number.isFinite(value) ? toCents(value) / 100 : null;
}

/** Mensagem de erro do valor digitado, ou `null` se estiver tudo certo. */
export function getAmountError(text: string): string | null {
  const value = parseAmountInput(text);
  if (value === null) return 'Informe um valor válido, como 50,00.';
  if (value <= 0) return 'O valor precisa ser maior que zero.';
  if (value > MAX_AMOUNT) return 'Valor muito alto.';
  return null;
}

/** Valores iniciais da folha. Categoria fora da lista do tipo aparece normalizada ("Outros"). */
export function getInitialCorrectionForm(transaction: Transaction): CorrectionForm {
  const type = toCorrectionType(transaction.type);
  return {
    type,
    amount: formatAmountInput(Number(transaction.amount) || 0),
    category: normalizeCategory(type, transaction.category),
    description: transaction.description?.trim() ?? '',
    date: getTransactionDay(transaction.createdAt),
  };
}

/** Troca o tipo; a categoria que não existe no novo tipo vira "Outros". */
export function changeCorrectionType(form: CorrectionForm, type: CategoryType): CorrectionForm {
  if (form.type === type) return form;
  return { ...form, type, category: normalizeCategory(type, form.category) };
}

/**
 * Corpo do PATCH só com o que mudou em relação à transação. Valor inválido fica de fora (valide antes com
 * `getAmountError`). Ao trocar o tipo, a categoria vai junto, para nunca ficar uma categoria do outro tipo.
 */
export function buildTransactionPatch(
  transaction: Transaction,
  form: CorrectionForm,
): TransactionPatch {
  const initial = getInitialCorrectionForm(transaction);
  const patch: TransactionPatch = {};

  const typeChanged = form.type !== getTransactionType(transaction.type);
  if (typeChanged) patch.type = form.type;

  const amount = parseAmountInput(form.amount);
  if (amount !== null && toCents(amount) !== toCents(Number(transaction.amount) || 0)) {
    patch.amount = amount;
  }

  if (typeChanged || form.category !== initial.category) patch.category = form.category;

  const description = form.description.trim();
  if (description !== initial.description) patch.description = description || null;

  if (form.date !== initial.date) patch.createdAt = form.date;

  return patch;
}

/** Rótulo da data: "Hoje, 23 de outubro", "Ontem, 22 de outubro", "20 de outubro", "5 de março de 2025". */
export function formatCorrectionDate(day: string, now: Date = new Date()): string {
  const date = parseISO(day);
  const dayAndMonth = format(date, "d 'de' MMMM", { locale: ptBR });
  if (isSameDay(date, now)) return `Hoje, ${dayAndMonth}`;
  if (isSameDay(date, subDays(now, 1))) return `Ontem, ${dayAndMonth}`;
  if (isSameYear(date, now)) return dayAndMonth;
  return format(date, "d 'de' MMMM 'de' yyyy", { locale: ptBR });
}

type ApiErrorLike = {
  response?: { status?: number; data?: { error?: unknown } };
  request?: unknown;
  code?: string;
};

const asApiError = (error: unknown): ApiErrorLike =>
  typeof error === 'object' && error !== null ? (error as ApiErrorLike) : {};

/** Erro 404 da API: o lançamento não existe mais (ou é de outro usuário). */
export function isNotFoundError(error: unknown): boolean {
  return asApiError(error).response?.status === 404;
}

/** Mensagem mostrada na folha quando salvar ou apagar falha. */
export function getCorrectionErrorMessage(error: unknown, action: 'save' | 'delete'): string {
  const { response, request, code } = asApiError(error);

  // Sem resposta do servidor: sem internet, servidor fora ou tempo esgotado
  if (!response && (request !== undefined || code === 'ERR_NETWORK' || code === 'ECONNABORTED')) {
    return 'Sem conexão com a internet. Corrigir e apagar só funcionam online; tente de novo quando a conexão voltar.';
  }

  const status = response?.status;
  if (status === 404) return 'Esse lançamento não existe mais.';
  if (status === 401) return 'Sua sessão expirou. Entre de novo.';
  if (status === 400 && typeof response?.data?.error === 'string' && response.data.error) {
    return response.data.error;
  }

  return action === 'save'
    ? 'Não foi possível salvar a correção. Tente de novo.'
    : 'Não foi possível apagar o lançamento. Tente de novo.';
}
