import { api } from '../api';
import {
  Transaction,
  deleteTransaction,
  getTransactions,
  toApiDate,
  updateTransaction,
} from '../transactions';

jest.mock('../api', () => ({
  api: { get: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));

const mockedApi = api as unknown as {
  get: jest.Mock;
  patch: jest.Mock;
  delete: jest.Mock;
};

const tx: Transaction = {
  id: '6f1c2a54-0000-4000-8000-000000000001',
  phone: '11999999999',
  type: 'gasto',
  amount: 50,
  category: 'Mercado',
  description: 'compra no mercado',
  messageId: 'msg-1',
  createdAt: '2026-10-23T15:00:00.000Z',
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('toApiDate', () => {
  it('usa o dia local, não o UTC', () => {
    // 23h do dia 31 no fuso local: em UTC já seria outro dia em fusos negativos
    expect(toApiDate(new Date(2026, 9, 31, 23, 30))).toBe('2026-10-31');
    expect(toApiDate(new Date(2026, 0, 1, 0, 5))).toBe('2026-01-01');
  });
});

describe('getTransactions', () => {
  it('formata as datas e devolve a lista', async () => {
    mockedApi.get.mockResolvedValue({ data: [tx] });

    const result = await getTransactions(new Date(2026, 9, 1), new Date(2026, 9, 31, 22));

    expect(mockedApi.get).toHaveBeenCalledWith('/transactions', {
      params: { startDate: '2026-10-01', endDate: '2026-10-31' },
    });
    expect(result).toEqual([tx]);
  });

  it('aceita datas já em YYYY-MM-DD', async () => {
    mockedApi.get.mockResolvedValue({ data: [] });

    await getTransactions('2026-10-01', '2026-10-27');

    expect(mockedApi.get).toHaveBeenCalledWith('/transactions', {
      params: { startDate: '2026-10-01', endDate: '2026-10-27' },
    });
  });

  it('converte amount em número e trata resposta vazia', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: [{ ...tx, amount: '12.34' }] });
    expect((await getTransactions('2026-10-01', '2026-10-31'))[0].amount).toBe(12.34);

    mockedApi.get.mockResolvedValueOnce({ data: null });
    expect(await getTransactions('2026-10-01', '2026-10-31')).toEqual([]);
  });
});

describe('updateTransaction', () => {
  it('envia o PATCH só com o patch e devolve a transação', async () => {
    const updated = { ...tx, amount: 42.5 };
    mockedApi.patch.mockResolvedValue({ data: updated });

    const result = await updateTransaction(tx.id, { amount: 42.5 });

    expect(mockedApi.patch).toHaveBeenCalledWith(`/transactions/${tx.id}`, { amount: 42.5 });
    expect(result).toEqual(updated);
  });

  it('propaga o erro da API', async () => {
    mockedApi.patch.mockRejectedValue(new Error('falhou'));
    await expect(updateTransaction(tx.id, { amount: 1 })).rejects.toThrow('falhou');
  });
});

describe('deleteTransaction', () => {
  it('envia o DELETE', async () => {
    mockedApi.delete.mockResolvedValue({ status: 204 });

    await deleteTransaction(tx.id);

    expect(mockedApi.delete).toHaveBeenCalledWith(`/transactions/${tx.id}`);
  });
});
