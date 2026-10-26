import jwt from 'jsonwebtoken';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Prisma } from '../src/generated/prisma/client';

const { prismaMock, processUserMessageMock } = vi.hoisted(() => ({
  prismaMock: {
    transaction: { create: vi.fn(), findMany: vi.fn(), findUnique: vi.fn() },
  },
  processUserMessageMock: vi.fn(),
}));

vi.mock('../src/lib/prisma', () => ({ prisma: prismaMock }));
vi.mock('../src/services/chatService', () => ({ processUserMessage: processUserMessageMock }));

import { app } from '../src/app';

const ME = { id: 'user-me', email: 'me@example.com', phone: '5511999990000' };
const myToken = `Bearer ${jwt.sign(
  { sub: ME.id, email: ME.email, phone: ME.phone },
  process.env.JWT_SECRET as string
)}`;

const SUCCESS = { valor: 50, tipo: 'gasto', categoria: 'mercado', comentario: 'compras' };

function storedTransaction(overrides: Record<string, unknown> = {}) {
  return {
    id: 'tx-1',
    phone: ME.phone,
    type: 'gasto',
    amount: new Prisma.Decimal('50.90'),
    category: 'mercado',
    description: 'compras',
    messageId: '1730000000000',
    createdAt: new Date('2026-10-20T15:00:00Z'),
    ...overrides,
  };
}

function send(body: object) {
  return request(app).post('/webhook/messages').set('Authorization', myToken).send(body);
}

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.transaction.findUnique.mockResolvedValue(null);
  prismaMock.transaction.create.mockResolvedValue({});
});

describe('POST /webhook/messages — messageId (#6)', () => {
  it('grava o messageId vindo de userMessage.id', async () => {
    processUserMessageMock.mockResolvedValue(SUCCESS);

    const res = await send({ userMessage: { id: '1730000000000', text: 'gastei 50 no mercado' } });

    expect(res.status).toBe(200);
    expect(prismaMock.transaction.findUnique).toHaveBeenCalledWith({
      where: { phone_messageId: { phone: ME.phone, messageId: '1730000000000' } },
    });
    expect(prismaMock.transaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ phone: ME.phone, messageId: '1730000000000' }),
    });
  });

  it('aceita body.id por compatibilidade', async () => {
    processUserMessageMock.mockResolvedValue(SUCCESS);

    const res = await send({ id: 'legacy-1', userMessage: { text: 'gastei 50 no mercado' } });

    expect(res.status).toBe(200);
    expect(prismaMock.transaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ messageId: 'legacy-1' }),
    });
  });

  it('sem id grava com messageId null e não consulta duplicata', async () => {
    processUserMessageMock.mockResolvedValue(SUCCESS);

    const res = await send({ userMessage: { text: 'gastei 50 no mercado' } });

    expect(res.status).toBe(200);
    expect(prismaMock.transaction.findUnique).not.toHaveBeenCalled();
    expect(prismaMock.transaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ messageId: null }),
    });
  });

  it('mensagem já processada: devolve a transação existente sem chamar a OpenAI', async () => {
    prismaMock.transaction.findUnique.mockResolvedValue(storedTransaction());

    const res = await send({ userMessage: { id: '1730000000000', text: 'gastei 50,90 no mercado' } });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ valor: 50.9, tipo: 'gasto', categoria: 'mercado', comentario: 'compras' });
    expect(processUserMessageMock).not.toHaveBeenCalled();
    expect(prismaMock.transaction.create).not.toHaveBeenCalled();
  });

  it('corrida no create (P2002) é tratada como duplicata e responde 200', async () => {
    processUserMessageMock.mockResolvedValue(SUCCESS);
    prismaMock.transaction.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(storedTransaction({ amount: new Prisma.Decimal('50') }));
    prismaMock.transaction.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: 'test',
      })
    );

    const res = await send({ userMessage: { id: '1730000000000', text: 'gastei 50 no mercado' } });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ valor: 50, tipo: 'gasto', categoria: 'mercado', comentario: 'compras' });
    expect(prismaMock.transaction.findUnique).toHaveBeenCalledTimes(2);
  });

  it('outros erros do banco continuam 500', async () => {
    processUserMessageMock.mockResolvedValue(SUCCESS);
    prismaMock.transaction.create.mockRejectedValue(new Error('conexão caiu'));

    const res = await send({ userMessage: { id: '1730000000000', text: 'gastei 50 no mercado' } });

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: expect.any(String) });
  });
});

describe('POST /webhook/messages — contrato de resposta', () => {
  it('sucesso: 200 com { valor, tipo, categoria, comentario }', async () => {
    processUserMessageMock.mockResolvedValue(SUCCESS);

    const res = await send({ userMessage: { id: '1', text: 'gastei 50 no mercado' } });

    expect(res.status).toBe(200);
    expect(res.body).toEqual(SUCCESS);
  });

  it('erro de processamento: 400 com { error: comentário amigável, code }', async () => {
    const comentario =
      'Não encontrei um gasto ou receita com valor nessa mensagem. Tente algo como "gastei 50 reais no mercado".';
    processUserMessageMock.mockResolvedValue({
      error: 'NO_TRANSACTION',
      valor: null,
      tipo: 'outro',
      categoria: 'não identificado',
      comentario,
    });

    const res = await send({ userMessage: { id: '1', text: 'oi jorge' } });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: comentario, code: 'NO_TRANSACTION' });
    expect(prismaMock.transaction.create).not.toHaveBeenCalled();
  });

  it('erro inesperado: 500 com { error }', async () => {
    processUserMessageMock.mockRejectedValue(new Error('boom'));

    const res = await send({ userMessage: { id: '1', text: 'gastei 50 no mercado' } });

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: expect.any(String) });
  });
});

describe('POST /webhook/messages — amount Decimal (#15)', () => {
  it('arredonda o valor para 2 casas antes de gravar e na resposta', async () => {
    processUserMessageMock.mockResolvedValue({ ...SUCCESS, valor: 10.005 });

    const res = await send({ userMessage: { id: '1', text: 'gastei 10.005 no mercado' } });

    expect(res.status).toBe(200);
    const { amount } = prismaMock.transaction.create.mock.calls[0][0].data;
    expect(Prisma.Decimal.isDecimal(amount)).toBe(true);
    expect(amount.toFixed(2)).toBe('10.01');
    expect(res.body.valor).toBe(10.01);
  });
});
