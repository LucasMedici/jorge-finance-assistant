import jwt from 'jsonwebtoken';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Prisma } from '../src/generated/prisma/client';

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    user: { findUnique: vi.fn(), update: vi.fn() },
  },
}));

vi.mock('../src/lib/prisma', () => ({ prisma: prismaMock }));
// O app importa o chatService (rota do webhook); mockado para não instanciar o cliente OpenAI.
vi.mock('../src/services/chatService', () => ({ processUserMessage: vi.fn() }));

import { app } from '../src/app';

const ME = { id: 'user-me', email: 'me@example.com', phone: '5511999990000' };
const myToken = `Bearer ${jwt.sign({ sub: ME.id, email: ME.email, phone: ME.phone }, process.env.JWT_SECRET as string)}`;

function dbUser(overrides: Record<string, unknown> = {}) {
  return {
    ...ME,
    name: 'Eu',
    password: 'hash-secreto',
    createdAt: new Date('2026-10-01T12:00:00Z'),
    monthlyGoal: null,
    ...overrides,
  };
}

/** Simula o `prisma.user.update`: aplica `data` sobre o usuário do banco. */
function mockUpdateApplyingData(base = dbUser()) {
  prismaMock.user.update.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
    ...base,
    ...data,
  }));
}

function putMe(body?: object) {
  const req = request(app).put(`/user/${ME.id}`).set('Authorization', myToken);
  return body === undefined ? req : req.send(body);
}

function updateData() {
  return prismaMock.user.update.mock.calls[0][0].data;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('GET /user/:id — monthlyGoal', () => {
  it('devolve a meta como número JSON (não string do Decimal) e sem a senha', async () => {
    prismaMock.user.findUnique.mockResolvedValue(dbUser({ monthlyGoal: new Prisma.Decimal('1500.50') }));

    const res = await request(app).get(`/user/${ME.id}`).set('Authorization', myToken);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      id: ME.id,
      email: ME.email,
      phone: ME.phone,
      name: 'Eu',
      createdAt: '2026-10-01T12:00:00.000Z',
      monthlyGoal: 1500.5,
    });
    expect(JSON.stringify(res.body)).not.toContain('hash-secreto');
  });

  it('sem meta → monthlyGoal null', async () => {
    prismaMock.user.findUnique.mockResolvedValue(dbUser());

    const res = await request(app).get(`/user/${ME.id}`).set('Authorization', myToken);

    expect(res.status).toBe(200);
    expect(res.body.monthlyGoal).toBeNull();
  });
});

describe('PUT /user/:id — atualização parcial', () => {
  it('só `name` (o que o APK atual manda) altera só o nome, sem tocar na meta', async () => {
    mockUpdateApplyingData(dbUser({ monthlyGoal: new Prisma.Decimal(800) }));

    const res = await putMe({ name: 'Novo' });

    expect(res.status).toBe(200);
    expect(prismaMock.user.update).toHaveBeenCalledWith({ where: { id: ME.id }, data: { name: 'Novo' } });
    expect(res.body).toMatchObject({ id: ME.id, name: 'Novo', monthlyGoal: 800 });
    expect(res.body).not.toHaveProperty('password');
  });

  it('só `monthlyGoal` grava a meta como Decimal e não apaga o nome', async () => {
    mockUpdateApplyingData();

    const res = await putMe({ monthlyGoal: 1500 });

    expect(res.status).toBe(200);
    const data = updateData();
    expect(Object.keys(data)).toEqual(['monthlyGoal']);
    expect(data.monthlyGoal).toBeInstanceOf(Prisma.Decimal);
    expect(data.monthlyGoal.toString()).toBe('1500');
    expect(res.body).toMatchObject({ name: 'Eu', monthlyGoal: 1500 });
    expect(res.body).not.toHaveProperty('password');
  });

  it('`monthlyGoal: null` remove a meta', async () => {
    mockUpdateApplyingData(dbUser({ monthlyGoal: new Prisma.Decimal(1000) }));

    const res = await putMe({ monthlyGoal: null });

    expect(res.status).toBe(200);
    expect(updateData()).toEqual({ monthlyGoal: null });
    expect(res.body.monthlyGoal).toBeNull();
    expect(res.body.name).toBe('Eu');
  });

  it('`name` e `monthlyGoal` juntos', async () => {
    mockUpdateApplyingData();

    const res = await putMe({ name: 'Lucas', monthlyGoal: 1234.56 });

    expect(res.status).toBe(200);
    const data = updateData();
    expect(data.name).toBe('Lucas');
    expect(data.monthlyGoal.toString()).toBe('1234.56');
    expect(res.body).toMatchObject({ name: 'Lucas', monthlyGoal: 1234.56 });
  });

  it.each([0.01, 0.29, 99.9, 9999999999.99])('aceita meta com até 2 casas: %s', async (goal) => {
    mockUpdateApplyingData();

    const res = await putMe({ monthlyGoal: goal });

    expect(res.status).toBe(200);
    expect(updateData().monthlyGoal.toString()).toBe(String(goal));
    expect(res.body.monthlyGoal).toBe(goal);
  });

  it('ignora campos extras do body (não altera senha, telefone etc.)', async () => {
    mockUpdateApplyingData();

    const res = await putMe({ monthlyGoal: 500, password: 'nova', phone: '5511000000000', id: 'forjado' });

    expect(res.status).toBe(200);
    expect(Object.keys(updateData())).toEqual(['monthlyGoal']);
  });
});

describe('PUT /user/:id — validação (400)', () => {
  it.each([
    ['zero', 0, 'A meta mensal deve ser maior que zero'],
    ['negativa', -10, 'A meta mensal deve ser maior que zero'],
    ['mais de 2 casas', 10.123, 'A meta mensal deve ter no máximo 2 casas decimais'],
    ['maior que Decimal(12,2)', 10_000_000_000, 'A meta mensal é grande demais'],
    ['string', '1500', 'A meta mensal deve ser um número'],
    ['booleano', true, 'A meta mensal deve ser um número'],
    ['objeto', { valor: 1500 }, 'A meta mensal deve ser um número'],
  ])('meta %s → 400 sem alterar o banco', async (_label, monthlyGoal, message) => {
    const res = await putMe({ monthlyGoal });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe(message);
    expect(res.body.fields).toEqual({ monthlyGoal: [message] });
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it('nome vazio → 400', async () => {
    const res = await putMe({ name: '' });

    expect(res.status).toBe(400);
    expect(res.body.fields).toEqual({ name: ['O nome não pode ficar vazio'] });
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it('nome null → 400 (o nome não pode ser removido por aqui)', async () => {
    const res = await putMe({ name: null });

    expect(res.status).toBe(400);
    expect(res.body.fields).toEqual({ name: ['Nome inválido'] });
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it('nome válido com meta inválida → 400 e nada é gravado', async () => {
    const res = await putMe({ name: 'Ok', monthlyGoal: -1 });

    expect(res.status).toBe(400);
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it.each([
    ['body vazio', {}],
    ['sem body', undefined],
  ])('%s → 400', async (_label, body) => {
    const res = await putMe(body);

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Informe o nome ou a meta mensal');
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });
});

describe('PUT /user/:id — erros do banco', () => {
  it('usuário não existe mais (P2025) → 404', async () => {
    prismaMock.user.update.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Record to update not found', {
        code: 'P2025',
        clientVersion: Prisma.prismaVersion.client,
      })
    );

    const res = await putMe({ monthlyGoal: 100 });

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'User not found' });
  });

  it('outro erro → 500 genérico, sem vazar a mensagem interna', async () => {
    prismaMock.user.update.mockRejectedValue(new Error('connection refused'));

    const res = await putMe({ name: 'Novo' });

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Internal server error' });
  });
});
