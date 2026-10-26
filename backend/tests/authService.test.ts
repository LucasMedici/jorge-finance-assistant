import jwt from 'jsonwebtoken';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    user: { findUnique: vi.fn() },
  },
}));

vi.mock('../src/lib/prisma', () => ({ prisma: prismaMock }));

import { hashPassword, signLoginToken, verifyPassword } from '../src/services/authService';

const PASSWORD = 'segredo123';
const USER = { id: 'user-1', email: 'me@example.com', phone: '5511999990000', name: null, createdAt: new Date() };

beforeEach(() => {
  vi.clearAllMocks();
});

describe('hashPassword / verifyPassword', () => {
  it('gera um hash bcrypt diferente da senha e com salt aleatório', async () => {
    const a = await hashPassword(PASSWORD);
    const b = await hashPassword(PASSWORD);

    expect(a).not.toBe(PASSWORD);
    expect(a).toMatch(/^\$2[aby]\$10\$/);
    expect(a).not.toBe(b);
  });

  it('confere a senha correta e rejeita a errada', async () => {
    const hash = await hashPassword(PASSWORD);

    expect(await verifyPassword(PASSWORD, hash)).toBe(true);
    expect(await verifyPassword('outra-senha', hash)).toBe(false);
  });
});

describe('signLoginToken', () => {
  let hashed: string;

  beforeEach(async () => {
    hashed ??= await hashPassword(PASSWORD);
  });

  it('credenciais corretas → JWT com sub, email e phone', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ ...USER, password: hashed });

    const token = await signLoginToken(USER.email, PASSWORD);

    expect(typeof token).toBe('string');
    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({ where: { email: USER.email } });

    const payload = jwt.verify(token as string, process.env.JWT_SECRET as string) as jwt.JwtPayload;
    expect(payload).toMatchObject({ sub: USER.id, email: USER.email, phone: USER.phone });
    expect(payload).not.toHaveProperty('password');
    expect(payload.exp).toBeDefined();
  });

  it('e-mail inexistente → null', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    expect(await signLoginToken('ninguem@example.com', PASSWORD)).toBeNull();
  });

  it('senha errada → null', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ ...USER, password: hashed });

    expect(await signLoginToken(USER.email, 'senha-errada')).toBeNull();
  });
});
