import bcrypt from 'bcryptjs';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Prisma } from '../src/generated/prisma/client';

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    user: { findUnique: vi.fn(), create: vi.fn() },
  },
}));

vi.mock('../src/lib/prisma', () => ({ prisma: prismaMock }));
// O app importa o chatService (rota do webhook); mockado para não instanciar o cliente OpenAI.
vi.mock('../src/services/chatService', () => ({ processUserMessage: vi.fn() }));

import { app } from '../src/app';

const VALID = { email: 'novo@example.com', password: 'segredo123', phone: '5511999990000' };

function p2002(target: unknown) {
  return new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: Prisma.prismaVersion.client,
    meta: { target },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('POST /auth/signup — validação (400)', () => {
  it('body vazio → 400 com erro por campo, sem tocar no banco', async () => {
    const res = await request(app).post('/auth/signup').send({});

    expect(res.status).toBe(400);
    expect(typeof res.body.error).toBe('string');
    expect(res.body.fields).toEqual({
      email: ['O e-mail é obrigatório'],
      password: ['A senha é obrigatória'],
      phone: ['O telefone é obrigatório'],
    });
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  it('sem body (nem Content-Type) → 400', async () => {
    const res = await request(app).post('/auth/signup');

    expect(res.status).toBe(400);
    expect(Object.keys(res.body.fields)).toEqual(expect.arrayContaining(['email', 'password', 'phone']));
  });

  it('campos inválidos → 400 com as mensagens de cada campo', async () => {
    const res = await request(app)
      .post('/auth/signup')
      .send({ email: 'nao-e-email', password: '123', phone: '119' });

    expect(res.status).toBe(400);
    expect(res.body.fields).toEqual({
      email: ['E-mail inválido'],
      password: ['A senha deve ter pelo menos 6 caracteres'],
      phone: ['Telefone inválido'],
    });
    expect(res.body.error).toContain('E-mail inválido');
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  it('tipos errados → 400', async () => {
    const res = await request(app).post('/auth/signup').send({ ...VALID, password: 123456, phone: 5511999990000 });

    expect(res.status).toBe(400);
    expect(res.body.fields).toEqual({ password: ['Senha inválida'], phone: ['Telefone inválido'] });
  });
});

describe('POST /auth/signup — duplicidade (409)', () => {
  it('e-mail já cadastrado → 409 sem criar usuário', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 'u1', email: VALID.email });

    const res = await request(app).post('/auth/signup').send(VALID);

    expect(res.status).toBe(409);
    expect(res.body).toEqual({ error: 'Este e-mail já está cadastrado' });
    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({ where: { email: VALID.email } });
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  it.each([
    ['telefone (lista de campos)', ['phone'], 'Este telefone já está cadastrado'],
    ['telefone (nome da constraint)', 'user_phone_key', 'Este telefone já está cadastrado'],
    ['e-mail (corrida entre requisições)', ['email'], 'Este e-mail já está cadastrado'],
    ['campo desconhecido', undefined, 'Usuário já cadastrado'],
  ])('P2002 no create — %s → 409', async (_label, target, message) => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockRejectedValue(p2002(target));

    const res = await request(app).post('/auth/signup').send(VALID);

    expect(res.status).toBe(409);
    expect(res.body).toEqual({ error: message });
  });

  it('outro erro do banco → 500 genérico', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockRejectedValue(new Error('connection refused'));

    const res = await request(app).post('/auth/signup').send(VALID);

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Internal server error' });
  });
});

describe('POST /auth/signup — sucesso (201)', () => {
  it('cria o usuário com a senha em hash e nunca devolve a senha', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockImplementation(async ({ data }: { data: typeof VALID }) => ({
      id: 'user-1',
      name: null,
      createdAt: new Date(),
      ...data,
    }));

    const res = await request(app).post('/auth/signup').send(VALID);

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id: 'user-1', email: VALID.email, phone: VALID.phone });
    expect(JSON.stringify(res.body)).not.toContain(VALID.password);

    const { data } = prismaMock.user.create.mock.calls[0][0];
    expect(data.email).toBe(VALID.email);
    expect(data.phone).toBe(VALID.phone);
    expect(data.password).not.toBe(VALID.password);
    expect(await bcrypt.compare(VALID.password, data.password)).toBe(true);
  });

  it('ignora campos extras do body', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockImplementation(async ({ data }: { data: typeof VALID }) => ({ id: 'user-2', ...data }));

    const res = await request(app)
      .post('/auth/signup')
      .send({ ...VALID, id: 'forjado', name: 'Admin' });

    expect(res.status).toBe(201);
    expect(res.body.id).toBe('user-2');
    expect(prismaMock.user.create.mock.calls[0][0].data).not.toHaveProperty('id');
    expect(prismaMock.user.create.mock.calls[0][0].data).not.toHaveProperty('name');
  });
});
