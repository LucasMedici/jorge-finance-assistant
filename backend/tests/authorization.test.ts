import jwt from 'jsonwebtoken';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prismaMock, processUserMessageMock } = vi.hoisted(() => ({
  prismaMock: {
    transaction: { create: vi.fn(), findMany: vi.fn() },
    user: { findUnique: vi.fn(), update: vi.fn() },
  },
  processUserMessageMock: vi.fn(),
}));

vi.mock('../src/lib/prisma', () => ({ prisma: prismaMock }));
vi.mock('../src/services/chatService', () => ({ processUserMessage: processUserMessageMock }));

import { app } from '../src/app';

const ME = { id: 'user-me', email: 'me@example.com', phone: '5511999990000' };
const OTHER = { id: 'user-other', phone: '5511988887777' };

function tokenFor(payload: object) {
  return `Bearer ${jwt.sign(payload, process.env.JWT_SECRET as string)}`;
}

const myToken = tokenFor({ sub: ME.id, email: ME.email, phone: ME.phone });

beforeEach(() => {
  vi.clearAllMocks();
});

describe('authMiddleware', () => {
  it('rejeita requisição sem token', async () => {
    const res = await request(app).get(`/user/${ME.id}`);
    expect(res.status).toBe(401);
  });

  it('rejeita token sem `sub`', async () => {
    const res = await request(app)
      .get(`/user/${ME.id}`)
      .set('Authorization', tokenFor({ id: ME.id, phone: ME.phone }));
    expect(res.status).toBe(401);
  });

  it('identifica o usuário pelo `sub` do token', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ ...ME, name: 'Eu', password: 'hash', createdAt: new Date() });

    const res = await request(app).get(`/user/${ME.id}`).set('Authorization', myToken);

    expect(res.status).toBe(200);
    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({ where: { id: ME.id } });
    expect(res.body).not.toHaveProperty('password');
  });
});

describe('POST /webhook/messages', () => {
  it('grava a transação no telefone do token, ignorando o userPhone do body', async () => {
    processUserMessageMock.mockResolvedValue({ valor: 50, tipo: 'gasto', categoria: 'mercado', comentario: '' });
    prismaMock.transaction.create.mockResolvedValue({});

    const res = await request(app)
      .post('/webhook/messages')
      .set('Authorization', myToken)
      .send({ userMessage: { id: '1', text: 'gastei 50 no mercado', userPhone: OTHER.phone } });

    expect(res.status).toBe(200);
    expect(prismaMock.transaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ phone: ME.phone }),
    });
  });
});

describe('/user/:id', () => {
  it('GET de outro usuário retorna 403 sem consultar o banco', async () => {
    const res = await request(app).get(`/user/${OTHER.id}`).set('Authorization', myToken);

    expect(res.status).toBe(403);
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
  });

  it('PUT de outro usuário retorna 403 sem alterar o banco', async () => {
    const res = await request(app)
      .put(`/user/${OTHER.id}`)
      .set('Authorization', myToken)
      .send({ name: 'Hacker' });

    expect(res.status).toBe(403);
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it('PUT do próprio usuário atualiza o nome', async () => {
    prismaMock.user.update.mockResolvedValue({ ...ME, name: 'Novo', password: 'hash', createdAt: new Date() });

    const res = await request(app)
      .put(`/user/${ME.id}`)
      .set('Authorization', myToken)
      .send({ name: 'Novo' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: ME.id, name: 'Novo' });
    expect(res.body).not.toHaveProperty('password');
  });
});

describe('GET /transactions', () => {
  it('busca só as transações do telefone do token', async () => {
    prismaMock.transaction.findMany.mockResolvedValue([]);

    const res = await request(app)
      .get('/transactions')
      .query({ startDate: '2026-10-01', endDate: '2026-10-23' })
      .set('Authorization', myToken);

    expect(res.status).toBe(200);
    expect(prismaMock.transaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ phone: ME.phone }) })
    );
  });
});
