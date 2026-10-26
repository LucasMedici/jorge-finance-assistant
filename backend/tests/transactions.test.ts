import jwt from 'jsonwebtoken';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Prisma } from '../src/generated/prisma/client';

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    transaction: { create: vi.fn(), findMany: vi.fn(), findUnique: vi.fn() },
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
