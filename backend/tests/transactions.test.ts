import jwt from 'jsonwebtoken';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Prisma } from '../src/generated/prisma/client';

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    transaction: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

vi.mock('../src/lib/prisma', () => ({ prisma: prismaMock }));
vi.mock('../src/services/chatService', () => ({ processUserMessage: vi.fn() }));

import { app } from '../src/app';

const ME = { id: 'user-me', email: 'me@example.com', phone: '5511999990000' };
const myToken = `Bearer ${jwt.sign(
  { sub: ME.id, email: ME.email, phone: ME.phone },
  process.env.JWT_SECRET as string
)}`;

function list(query: Record<string, string>) {
  return request(app).get('/transactions').query(query).set('Authorization', myToken);
}

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.transaction.findMany.mockResolvedValue([]);
});

describe('GET /transactions — intervalo de datas (#10)', () => {
  it('interpreta as datas em America/Sao_Paulo (-03:00) com fim exclusivo (lt)', async () => {
    const res = await list({ startDate: '2026-10-01', endDate: '2026-10-23' });

    expect(res.status).toBe(200);
    const { where } = prismaMock.transaction.findMany.mock.calls[0][0];
    expect(where.phone).toBe(ME.phone);
    expect(where.createdAt).toEqual({
      gte: new Date('2026-10-01T03:00:00.000Z'),
      lt: new Date('2026-10-24T03:00:00.000Z'),
    });
    expect(where.createdAt).not.toHaveProperty('lte');
  });

  it('um único dia cobre de 00:00 a 23:59:59.999 em São Paulo', async () => {
    await list({ startDate: '2026-10-20', endDate: '2026-10-20' });

    const { createdAt } = prismaMock.transaction.findMany.mock.calls[0][0].where;
    expect(createdAt.gte.toISOString()).toBe('2026-10-20T03:00:00.000Z');
    expect(createdAt.lt.toISOString()).toBe('2026-10-21T03:00:00.000Z');
  });

  it('vira mês e ano corretamente', async () => {
    await list({ startDate: '2026-12-01', endDate: '2026-12-31' });

    const { createdAt } = prismaMock.transaction.findMany.mock.calls[0][0].where;
    expect(createdAt.lt.toISOString()).toBe('2027-01-01T03:00:00.000Z');
  });

  it.each([
    ['startDate ausente', { endDate: '2026-10-23' }],
    ['endDate ausente', { startDate: '2026-10-01' }],
    ['formato errado', { startDate: '01/10/2026', endDate: '2026-10-23' }],
    ['data com horário', { startDate: '2026-10-01T00:00:00Z', endDate: '2026-10-23' }],
    ['data inexistente', { startDate: '2026-02-30', endDate: '2026-03-01' }],
    ['mês inválido', { startDate: '2026-13-01', endDate: '2026-13-02' }],
    ['início depois do fim', { startDate: '2026-10-23', endDate: '2026-10-01' }],
  ])('%s → 400 sem consultar o banco', async (_label, query) => {
    const res = await list(query as Record<string, string>);

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: expect.any(String) });
    expect(prismaMock.transaction.findMany).not.toHaveBeenCalled();
  });

  it('erro do banco → 500', async () => {
    prismaMock.transaction.findMany.mockRejectedValue(new Error('conexão caiu'));

    const res = await list({ startDate: '2026-10-01', endDate: '2026-10-23' });

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: expect.any(String) });
  });
});

describe('GET /transactions — amount Decimal (#15)', () => {
  it('serializa amount como número JSON', async () => {
    prismaMock.transaction.findMany.mockResolvedValue([
      {
        id: 'tx-1',
        phone: ME.phone,
        type: 'gasto',
        amount: new Prisma.Decimal('50.90'),
        category: 'mercado',
        description: '',
        messageId: '1730000000000',
        createdAt: new Date('2026-10-20T15:00:00Z'),
      },
      {
        id: 'tx-2',
        phone: ME.phone,
        type: 'receita',
        amount: new Prisma.Decimal('1234.56'),
        category: 'salário',
        description: null,
        messageId: null,
        createdAt: new Date('2026-10-19T15:00:00Z'),
      },
    ]);

    const res = await list({ startDate: '2026-10-01', endDate: '2026-10-23' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(typeof res.body[0].amount).toBe('number');
    expect(res.body[0].amount).toBe(50.9);
    expect(res.body[1].amount).toBe(1234.56);
    expect(res.body[0]).toMatchObject({ id: 'tx-1', type: 'gasto', category: 'mercado' });
  });
});

const TX_ID = 'a3c1e2d4-5b6f-4a7b-8c9d-0e1f2a3b4c5d';

function storedTransaction(overrides: Record<string, unknown> = {}) {
  return {
    id: TX_ID,
    phone: ME.phone,
    type: 'gasto',
    amount: new Prisma.Decimal('50.90'),
    category: 'mercado',
    description: 'compras',
    messageId: '1730000000000',
    // 12:30:15.250 em São Paulo
    createdAt: new Date('2026-10-20T15:30:15.250Z'),
    ...overrides,
  };
}

function patch(id: string, body: unknown) {
  return request(app)
    .patch(`/transactions/${id}`)
    .set('Authorization', myToken)
    .send(body as object);
}

function remove(id: string) {
  return request(app).delete(`/transactions/${id}`).set('Authorization', myToken);
}

describe('PATCH /transactions/:id (#39)', () => {
  beforeEach(() => {
    prismaMock.transaction.findFirst.mockResolvedValue(storedTransaction());
    prismaMock.transaction.update.mockImplementation(async ({ data }) => ({
      ...storedTransaction(),
      ...data,
    }));
  });

  it('altera os campos enviados e devolve a transação serializada', async () => {
    const res = await patch(TX_ID, {
      type: 'receita',
      amount: 42.5,
      category: '  salário ',
      description: 'freela',
    });

    expect(res.status).toBe(200);
    expect(prismaMock.transaction.findFirst).toHaveBeenCalledWith({
      where: { id: TX_ID, phone: ME.phone },
    });
    const { where, data } = prismaMock.transaction.update.mock.calls[0][0];
    expect(where).toEqual({ id: TX_ID, phone: ME.phone });
    expect(data).toEqual({
      type: 'receita',
      amount: expect.anything(),
      category: 'salário',
      description: 'freela',
    });
    expect(data.amount.toFixed(2)).toBe('42.50');
    expect(res.body).toEqual({
      id: TX_ID,
      phone: ME.phone,
      type: 'receita',
      amount: 42.5,
      category: 'salário',
      description: 'freela',
      messageId: '1730000000000',
      createdAt: '2026-10-20T15:30:15.250Z',
    });
  });

  it('altera só o que veio no corpo', async () => {
    const res = await patch(TX_ID, { category: 'farmácia' });

    expect(res.status).toBe(200);
    expect(prismaMock.transaction.update.mock.calls[0][0].data).toEqual({ category: 'farmácia' });
  });

  it('arredonda amount para 2 casas como Decimal', async () => {
    await patch(TX_ID, { amount: 10.005 });

    const { amount } = prismaMock.transaction.update.mock.calls[0][0].data;
    expect(Prisma.Decimal.isDecimal(amount)).toBe(true);
    expect(amount.toFixed(2)).toBe('10.01');
  });

  it('categoria vazia ou null vira null; descrição aceita null', async () => {
    await patch(TX_ID, { category: '   ', description: null });
    expect(prismaMock.transaction.update.mock.calls[0][0].data).toEqual({
      category: null,
      description: null,
    });

    await patch(TX_ID, { category: null });
    expect(prismaMock.transaction.update.mock.calls[1][0].data).toEqual({ category: null });
  });

  it('createdAt só com data mantém o horário original em São Paulo', async () => {
    const res = await patch(TX_ID, { createdAt: '2026-10-18' });

    expect(res.status).toBe(200);
    const { createdAt } = prismaMock.transaction.update.mock.calls[0][0].data;
    expect(createdAt.toISOString()).toBe('2026-10-18T15:30:15.250Z');
  });

  it('createdAt só com data perto da meia-noite continua no dia escolhido em São Paulo', async () => {
    // 23:10 do dia 20 em São Paulo = 02:10Z do dia 21
    prismaMock.transaction.findFirst.mockResolvedValue(
      storedTransaction({ createdAt: new Date('2026-10-21T02:10:00.000Z') })
    );

    await patch(TX_ID, { createdAt: '2026-10-05' });

    const { createdAt } = prismaMock.transaction.update.mock.calls[0][0].data;
    expect(createdAt.toISOString()).toBe('2026-10-06T02:10:00.000Z');
  });

  it('createdAt com data/hora e fuso é usado como veio', async () => {
    await patch(TX_ID, { createdAt: '2026-10-18T09:00:00-03:00' });

    const { createdAt } = prismaMock.transaction.update.mock.calls[0][0].data;
    expect(createdAt.toISOString()).toBe('2026-10-18T12:00:00.000Z');
  });

  it('ignora id, phone e messageId do corpo (dono sempre pelo token)', async () => {
    const res = await patch(TX_ID, {
      amount: 20,
      id: 'outro-id',
      phone: '5511988887777',
      messageId: 'x',
    });

    expect(res.status).toBe(200);
    const { where, data } = prismaMock.transaction.update.mock.calls[0][0];
    expect(where).toEqual({ id: TX_ID, phone: ME.phone });
    expect(Object.keys(data)).toEqual(['amount']);
  });

  it.each([
    ['corpo vazio', {}],
    ['só campos desconhecidos', { phone: '5511988887777' }],
    ['corpo não é objeto', [1, 2]],
    ['type inválido', { type: 'despesa' }],
    ['amount zero', { amount: 0 }],
    ['amount negativo', { amount: -5 }],
    ['amount que arredonda para zero', { amount: 0.004 }],
    ['amount como texto', { amount: '50' }],
    ['amount grande demais para Decimal(12,2)', { amount: 1e10 }],
    ['category não é texto', { category: 123 }],
    ['category longa demais', { category: 'x'.repeat(101) }],
    ['description longa demais', { description: 'x'.repeat(501) }],
    ['createdAt em formato BR', { createdAt: '18/10/2026' }],
    ['createdAt inexistente', { createdAt: '2026-02-30' }],
    ['createdAt com data/hora inexistente', { createdAt: '2026-02-30T10:00:00Z' }],
    ['createdAt sem fuso', { createdAt: '2026-10-18T09:00:00' }],
    ['createdAt null', { createdAt: null }],
  ])('%s → 400 sem alterar o banco', async (_label, body) => {
    const res = await patch(TX_ID, body);

    expect(res.status).toBe(400);
    expect(res.body.error).toEqual(expect.any(String));
    expect(prismaMock.transaction.findFirst).not.toHaveBeenCalled();
    expect(prismaMock.transaction.update).not.toHaveBeenCalled();
  });

  it('400 traz as mensagens por campo em `fields`', async () => {
    const res = await patch(TX_ID, { amount: -1, type: 'x' });

    expect(res.status).toBe(400);
    expect(res.body.fields).toEqual({
      amount: ['Valor deve ser maior que zero'],
      type: ['Tipo deve ser gasto, receita ou outro'],
    });
  });

  it('transação inexistente ou de outro usuário → 404', async () => {
    prismaMock.transaction.findFirst.mockResolvedValue(null);

    const res = await patch(TX_ID, { amount: 10 });

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: expect.any(String) });
    expect(prismaMock.transaction.update).not.toHaveBeenCalled();
  });

  it('id que não é UUID → 404 sem consultar o banco', async () => {
    const res = await patch('nao-existe', { amount: 10 });

    expect(res.status).toBe(404);
    expect(prismaMock.transaction.findFirst).not.toHaveBeenCalled();
  });

  it('apagada entre a leitura e a escrita (P2025) → 404', async () => {
    prismaMock.transaction.update.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Record not found', {
        code: 'P2025',
        clientVersion: 'test',
      })
    );

    const res = await patch(TX_ID, { amount: 10 });

    expect(res.status).toBe(404);
  });

  it('erro do banco → 500', async () => {
    prismaMock.transaction.update.mockRejectedValue(new Error('conexão caiu'));

    const res = await patch(TX_ID, { amount: 10 });

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: expect.any(String) });
  });
});

describe('DELETE /transactions/:id (#39)', () => {
  it('apaga a transação do usuário e responde 204 sem corpo', async () => {
    prismaMock.transaction.deleteMany.mockResolvedValue({ count: 1 });

    const res = await remove(TX_ID);

    expect(res.status).toBe(204);
    expect(res.text).toBe('');
    expect(prismaMock.transaction.deleteMany).toHaveBeenCalledWith({
      where: { id: TX_ID, phone: ME.phone },
    });
  });

  it('transação inexistente ou de outro usuário → 404', async () => {
    prismaMock.transaction.deleteMany.mockResolvedValue({ count: 0 });

    const res = await remove(TX_ID);

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: expect.any(String) });
  });

  it('id que não é UUID → 404 sem consultar o banco', async () => {
    const res = await remove('nao-existe');

    expect(res.status).toBe(404);
    expect(prismaMock.transaction.deleteMany).not.toHaveBeenCalled();
  });

  it('erro do banco → 500', async () => {
    prismaMock.transaction.deleteMany.mockRejectedValue(new Error('conexão caiu'));

    const res = await remove(TX_ID);

    expect(res.status).toBe(500);
  });
});
