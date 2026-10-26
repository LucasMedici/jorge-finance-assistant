import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { Prisma } from '../generated/prisma/client';
import type { transaction } from '../generated/prisma/client';

/** Erro de entrada inválida: as rotas respondem 400 com `{ error: message }`. */
export class ValidationError extends Error {}

/**
 * Fuso usado para interpretar as datas dos relatórios (America/Sao_Paulo).
 * O Brasil não tem horário de verão desde 2019, então o offset é fixo.
 */
const SAO_PAULO_OFFSET = '-03:00';

const isoDateSchema = z
  .string({ error: (issue) => (issue.input === undefined ? 'Data obrigatória' : 'Data inválida') })
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato AAAA-MM-DD')
  .refine((value) => {
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return (
      date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
    );
  }, 'Data inválida');

const dateRangeSchema = z.object({
  startDate: isoDateSchema,
  endDate: isoDateSchema,
});

/** Dia seguinte a uma data `YYYY-MM-DD`, no mesmo formato. */
function nextDay(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + 1)).toISOString().slice(0, 10);
}

/**
 * Converte `startDate`/`endDate` (`YYYY-MM-DD`, dias de calendário em America/Sao_Paulo) em um
 * intervalo `[start, endExclusive)`: do início de `startDate` até o início do dia seguinte a `endDate`.
 * Lança `ValidationError` se as datas estiverem ausentes, mal formatadas ou invertidas.
 */
export function parseDateRange(startDate: unknown, endDate: unknown) {
  const parsed = dateRangeSchema.safeParse({ startDate, endDate });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = issue.path[0] === 'startDate' ? 'startDate' : 'endDate';
    throw new ValidationError(`${field}: ${issue.message}`);
  }

  const { startDate: start, endDate: end } = parsed.data;
  if (start > end) {
    throw new ValidationError('startDate deve ser anterior ou igual a endDate');
  }

  return {
    start: new Date(`${start}T00:00:00${SAO_PAULO_OFFSET}`),
    endExclusive: new Date(`${nextDay(end)}T00:00:00${SAO_PAULO_OFFSET}`),
  };
}

/** Arredonda um valor monetário para 2 casas (meio para cima, sem erro de ponto flutuante). */
export function toMoney(value: number): Prisma.Decimal {
  return new Prisma.Decimal(value).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}

/** Transação como sai na API: `amount` vira número JSON (o Prisma devolve `Decimal`). */
export type TransactionDTO = Omit<transaction, 'amount'> & { amount: number };

export function serializeTransaction(tx: transaction): TransactionDTO {
  return { ...tx, amount: Number(tx.amount) };
}

export async function getUserTransactions(
  startDate: unknown,
  endDate: unknown,
  userPhone: string
): Promise<TransactionDTO[]> {
  const { start, endExclusive } = parseDateRange(startDate, endDate);

  const transactions = await prisma.transaction.findMany({
    where: {
      phone: userPhone,
      createdAt: {
        gte: start,
        lt: endExclusive,
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return transactions.map(serializeTransaction);
}

/** Transação já gravada para esta mensagem do usuário (reenvio da fila offline, duplo toque etc.). */
export function findTransactionByMessageId(phone: string, messageId: string) {
  return prisma.transaction.findUnique({
    where: { phone_messageId: { phone, messageId } },
  });
}

export type NewTransaction = {
  phone: string;
  type: string;
  amount: number;
  category: string | null;
  description: string | null;
  messageId: string | null;
};

export function createTransaction(data: NewTransaction) {
  return prisma.transaction.create({
    data: { ...data, amount: toMoney(data.amount) },
  });
}

/** Erro do Prisma de violação de unicidade (P2002). */
export function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 'P2002'
  );
}
