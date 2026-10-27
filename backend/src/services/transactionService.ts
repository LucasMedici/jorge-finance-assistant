import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { Prisma } from '../generated/prisma/client';
import type { transaction } from '../generated/prisma/client';

/**
 * Erro de entrada inválida: as rotas respondem 400 com `{ error: message }` (e `fields`, quando houver
 * mensagens por campo).
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly fields?: Record<string, string[] | undefined>
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Transação inexistente ou de outro usuário: as rotas respondem 404 nos dois casos, para não revelar que
 * uma transação alheia existe.
 */
export class TransactionNotFoundError extends Error {
  constructor() {
    super('Transação não encontrada');
    this.name = 'TransactionNotFoundError';
  }
}

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

/** Data/hora ISO 8601 com fuso explícito (`Z` ou `±HH:MM`), ex.: `2026-10-20T15:00:00-03:00`. */
const isoDateTimeSchema = z.iso.datetime({ offset: true });

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

/** Maior valor que cabe em `Decimal(12,2)`. */
const MAX_AMOUNT = new Prisma.Decimal('9999999999.99');

const MAX_CATEGORY_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 500;

const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/** `YYYY-MM-DD` (dia em São Paulo) ou data/hora ISO 8601 com fuso, sempre com dia de calendário válido. */
function isValidCreatedAt(value: string): boolean {
  if (DATE_ONLY_REGEX.test(value)) return isoDateSchema.safeParse(value).success;
  return (
    isoDateTimeSchema.safeParse(value).success && isoDateSchema.safeParse(value.slice(0, 10)).success
  );
}

const transactionUpdateSchema = z
  .object(
    {
      type: z.enum(['gasto', 'receita', 'outro'], { error: 'Tipo deve ser gasto, receita ou outro' }),
      amount: z
        .number({ error: 'Valor deve ser um número' })
        .transform(toMoney)
        .refine((amount) => amount.greaterThan(0), 'Valor deve ser maior que zero')
        .refine((amount) => amount.lessThanOrEqualTo(MAX_AMOUNT), 'Valor muito alto'),
      category: z
        .string({ error: 'Categoria deve ser um texto' })
        .trim()
        .max(MAX_CATEGORY_LENGTH, `Categoria deve ter no máximo ${MAX_CATEGORY_LENGTH} caracteres`)
        // Categoria vazia vira `null` (sem categoria).
        .transform((category) => category || null)
        .nullable(),
      description: z
        .string({ error: 'Descrição deve ser um texto' })
        .trim()
        .max(
          MAX_DESCRIPTION_LENGTH,
          `Descrição deve ter no máximo ${MAX_DESCRIPTION_LENGTH} caracteres`
        )
        .nullable(),
      createdAt: z
        .string({ error: 'Data inválida' })
        .refine(
          isValidCreatedAt,
          'Data deve estar no formato AAAA-MM-DD ou data/hora ISO 8601 com fuso'
        ),
    },
    { error: 'Envie um objeto JSON com os campos a alterar' }
  )
  .partial();

export type TransactionUpdate = z.output<typeof transactionUpdateSchema>;

/**
 * Valida o corpo do `PATCH /transactions/:id`. Campos desconhecidos (inclusive `id`, `phone` e
 * `messageId`) são ignorados. Lança `ValidationError` se algum campo for inválido ou se nenhum campo
 * editável vier no corpo.
 */
export function parseTransactionUpdate(body: unknown): TransactionUpdate {
  const parsed = transactionUpdateSchema.safeParse(body);
  if (!parsed.success) {
    const messages = [...new Set(parsed.error.issues.map((issue) => issue.message))];
    throw new ValidationError(messages.join('; '), z.flattenError(parsed.error).fieldErrors);
  }

  const changes = Object.fromEntries(
    Object.entries(parsed.data).filter(([, value]) => value !== undefined)
  ) as TransactionUpdate;
  if (Object.keys(changes).length === 0) {
    throw new ValidationError(
      'Informe ao menos um campo para alterar: type, amount, category, description ou createdAt'
    );
  }
  return changes;
}

/**
 * Converte o `createdAt` recebido em `Date`. Com só a data (`YYYY-MM-DD`), mantém o horário original da
 * transação (em São Paulo), para a ordem dos lançamentos do dia não mudar à toa.
 */
function resolveCreatedAt(value: string, current: Date): Date {
  if (!DATE_ONLY_REGEX.test(value)) return new Date(value);

  const offsetMs = 3 * 60 * 60 * 1000; // São Paulo = UTC-03:00 (ver SAO_PAULO_OFFSET)
  const timeOfDay = new Date(current.getTime() - offsetMs).toISOString().slice(11, 23);
  return new Date(`${value}T${timeOfDay}${SAO_PAULO_OFFSET}`);
}

/** Ids gerados pelo Prisma são UUIDs; qualquer outra coisa não existe no banco. */
function isTransactionId(id: string): boolean {
  return z.guid().safeParse(id).success;
}

/** Erro do Prisma de registro não encontrado (P2025), ex.: `update` de algo que já foi apagado. */
function isRecordNotFoundError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 'P2025'
  );
}

/**
 * Altera uma transação do usuário (`phone` do token). Lança `TransactionNotFoundError` se ela não
 * existir ou for de outro usuário, e `ValidationError` se o corpo for inválido.
 */
export async function updateUserTransaction(
  id: string,
  userPhone: string,
  body: unknown
): Promise<TransactionDTO> {
  if (!isTransactionId(id)) throw new TransactionNotFoundError();
  const changes = parseTransactionUpdate(body);

  const current = await prisma.transaction.findFirst({ where: { id, phone: userPhone } });
  if (!current) throw new TransactionNotFoundError();

  const { createdAt, ...rest } = changes;
  const data: Prisma.transactionUpdateInput = { ...rest };
  if (createdAt !== undefined) data.createdAt = resolveCreatedAt(createdAt, current.createdAt);

  try {
    // O `phone` no where garante o dono também na escrita.
    const updated = await prisma.transaction.update({ where: { id, phone: userPhone }, data });
    return serializeTransaction(updated);
  } catch (error) {
    if (isRecordNotFoundError(error)) throw new TransactionNotFoundError();
    throw error;
  }
}

/**
 * Apaga uma transação do usuário (`phone` do token). Lança `TransactionNotFoundError` se ela não
 * existir ou for de outro usuário.
 */
export async function deleteUserTransaction(id: string, userPhone: string): Promise<void> {
  if (!isTransactionId(id)) throw new TransactionNotFoundError();

  const { count } = await prisma.transaction.deleteMany({ where: { id, phone: userPhone } });
  if (count === 0) throw new TransactionNotFoundError();
}
