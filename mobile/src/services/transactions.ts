// Acesso às transações do usuário (GET/PATCH/DELETE /transactions). O dono é sempre o usuário do token.
import { format } from 'date-fns';
import { api } from './api';

export type TransactionType = 'gasto' | 'receita' | 'outro';

/** Transação como sai da API (GET /transactions e PATCH /transactions/:id). */
export type Transaction = {
  id: string;
  phone: string;
  /** "gasto", "receita" ou "outro" (transações antigas podem ter variações de caixa). */
  type: string;
  /** Valor em reais, com 2 casas. */
  amount: number;
  /** Categoria da lista fechada (as antigas podem estar em texto livre) ou `null`. */
  category: string | null;
  description: string | null;
  messageId: string | null;
  /** Data/hora ISO 8601 (UTC). */
  createdAt: string;
};

/** Corpo do PATCH: só os campos a alterar (ao menos um). */
export type TransactionPatch = {
  type?: TransactionType;
  amount?: number;
  /** `null` (ou texto vazio) remove a categoria. */
  category?: string | null;
  /** `null` remove a descrição. */
  description?: string | null;
  /** `YYYY-MM-DD` (dia em São Paulo; mantém o horário) ou data/hora ISO com fuso. */
  createdAt?: string;
};

/** Data local em `YYYY-MM-DD` (nunca `toISOString()`: ele usa UTC e pula um dia à noite no Brasil). */
export const toApiDate = (date: Date): string => format(date, 'yyyy-MM-dd');

const toApiDateParam = (date: Date | string): string =>
  typeof date === 'string' ? date : toApiDate(date);

// Garante `amount` numérico mesmo se a API mandar texto
const normalizeTransaction = (transaction: Transaction): Transaction => ({
  ...transaction,
  amount: Number(transaction.amount) || 0,
});

/**
 * Transações do período, mais recentes primeiro. Datas como `Date` (formatadas no fuso local) ou já em
 * `YYYY-MM-DD`; o intervalo inclui o dia final inteiro.
 */
export async function getTransactions(
  startDate: Date | string,
  endDate: Date | string,
): Promise<Transaction[]> {
  const response = await api.get<Transaction[]>('/transactions', {
    params: { startDate: toApiDateParam(startDate), endDate: toApiDateParam(endDate) },
  });
  return (response.data ?? []).map(normalizeTransaction);
}

/** Corrige uma transação e devolve como ficou. 400 = dados inválidos; 404 = não existe (ou é de outro). */
export async function updateTransaction(id: string, patch: TransactionPatch): Promise<Transaction> {
  const response = await api.patch<Transaction>(`/transactions/${encodeURIComponent(id)}`, patch);
  return normalizeTransaction(response.data);
}

/** Apaga uma transação (204). 404 = não existe (ou é de outro usuário). */
export async function deleteTransaction(id: string): Promise<void> {
  await api.delete(`/transactions/${encodeURIComponent(id)}`);
}
