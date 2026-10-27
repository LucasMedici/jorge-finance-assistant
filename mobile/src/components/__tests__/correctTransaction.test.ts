import type { Transaction } from '../../services/transactions';
import {
  CorrectionForm,
  buildTransactionPatch,
  changeCorrectionType,
  formatAmountInput,
  formatCorrectionDate,
  getAmountError,
  getCorrectionErrorMessage,
  getInitialCorrectionForm,
  getTransactionDay,
  getTransactionType,
  isNotFoundError,
  parseAmountInput,
  sanitizeAmountInput,
  toCorrectionType,
} from '../correctTransaction';

// Meio-dia local, para o dia não depender do fuso de quem roda os testes
const localNoon = (year: number, month: number, day: number) =>
  new Date(year, month - 1, day, 12).toISOString();

const tx = (overrides: Partial<Transaction> = {}): Transaction => ({
  id: 'tx-1',
  phone: '11999999999',
  type: 'gasto',
  amount: 50,
  category: 'Mercado',
  description: 'compra no mercado',
  messageId: 'msg-1',
  createdAt: localNoon(2026, 10, 23),
  ...overrides,
});

const formOf = (transaction: Transaction, changes: Partial<CorrectionForm> = {}) => ({
  ...getInitialCorrectionForm(transaction),
  ...changes,
});

describe('parseAmountInput', () => {
  it.each([
    ['50', 50],
    ['50,00', 50],
    ['50,5', 50.5],
    ['0,99', 0.99],
    [',5', 0.5],
    ['50,', 50],
    ['1.234,56', 1234.56],
    ['1.234.567,8', 1234567.8],
    ['1.234', 1234],
    ['12.5', 12.5],
    ['12.50', 12.5],
    ['R$ 1.234,56', 1234.56],
    [' 7 ', 7],
    ['0', 0],
  ])('%p -> %p', (text, expected) => {
    expect(parseAmountInput(text)).toBe(expected);
  });

  it.each(['', ' ', ',', '.', 'abc', '1,2,3', '12,345', '1.23,45', '12.3.4', '1.234.5', '-5'])(
    '%p é inválido',
    (text) => {
      expect(parseAmountInput(text)).toBeNull();
    },
  );
});

describe('sanitizeAmountInput', () => {
  it('mantém só dígitos, vírgula e ponto', () => {
    expect(sanitizeAmountInput('R$ 1.234,56')).toBe('1.234,56');
    expect(sanitizeAmountInput('-50a')).toBe('50');
  });
});

describe('formatAmountInput', () => {
  it('formata no padrão do campo, sem R$', () => {
    expect(formatAmountInput(50)).toBe('50,00');
    expect(formatAmountInput(1234.5)).toBe('1.234,50');
    expect(formatAmountInput(0.1)).toBe('0,10');
  });

  it('volta ao mesmo número no parse', () => {
    expect(parseAmountInput(formatAmountInput(9876543.21))).toBe(9876543.21);
  });
});

describe('getAmountError', () => {
  it('aceita valor maior que zero', () => {
    expect(getAmountError('50,00')).toBeNull();
    expect(getAmountError('0,01')).toBeNull();
    expect(getAmountError('9.999.999.999,99')).toBeNull();
  });

  it('recusa vazio, inválido, zero e valor alto demais', () => {
    expect(getAmountError('')).toMatch(/válido/);
    expect(getAmountError('1,2,3')).toMatch(/válido/);
    expect(getAmountError('0')).toMatch(/maior que zero/);
    expect(getAmountError('0,00')).toMatch(/maior que zero/);
    expect(getAmountError('10.000.000.000,00')).toMatch(/alto/);
  });
});

describe('tipo', () => {
  it.each([
    ['gasto', 'gasto', 'gasto'],
    [' Receita ', 'receita', 'receita'],
    ['outro', 'outro', 'gasto'],
    ['', 'outro', 'gasto'],
  ])('%p -> %p / folha %p', (type, apiType, sheetType) => {
    expect(getTransactionType(type)).toBe(apiType);
    expect(toCorrectionType(type)).toBe(sheetType);
  });
});

describe('getTransactionDay', () => {
  it('usa o dia local', () => {
    expect(getTransactionDay(new Date(2026, 9, 23, 23, 50).toISOString())).toBe('2026-10-23');
    expect(getTransactionDay(new Date(2026, 9, 24, 0, 10).toISOString())).toBe('2026-10-24');
  });
});

describe('getInitialCorrectionForm', () => {
  it('preenche a folha com a transação', () => {
    expect(getInitialCorrectionForm(tx())).toEqual({
      type: 'gasto',
      amount: '50,00',
      category: 'Mercado',
      description: 'compra no mercado',
      date: '2026-10-23',
    });
  });

  it('normaliza categoria antiga e trata campos ausentes', () => {
    expect(getInitialCorrectionForm(tx({ category: 'saude' })).category).toBe('Saúde');
    expect(getInitialCorrectionForm(tx({ category: 'restaurante' })).category).toBe('Outros');
    expect(getInitialCorrectionForm(tx({ category: null, description: null }))).toMatchObject({
      category: 'Outros',
      description: '',
    });
    expect(getInitialCorrectionForm(tx({ type: 'receita', category: 'salario' })).category).toBe(
      'Salário',
    );
  });
});

describe('changeCorrectionType', () => {
  it('troca o tipo e leva a categoria que não existe para "Outros"', () => {
    const form = getInitialCorrectionForm(tx());
    expect(changeCorrectionType(form, 'receita')).toMatchObject({
      type: 'receita',
      category: 'Outros',
    });
  });

  it('mantém o resto e devolve o mesmo objeto se o tipo não mudou', () => {
    const form = getInitialCorrectionForm(tx());
    expect(changeCorrectionType(form, 'gasto')).toBe(form);
    expect(changeCorrectionType(form, 'receita')).toMatchObject({
      amount: '50,00',
      description: 'compra no mercado',
      date: '2026-10-23',
    });
  });
});

describe('buildTransactionPatch', () => {
  it('nada mudou -> patch vazio', () => {
    const transaction = tx();
    expect(buildTransactionPatch(transaction, formOf(transaction))).toEqual({});
  });

  it('valor igual escrito de outro jeito não conta como mudança', () => {
    const transaction = tx({ amount: 1234.5 });
    expect(buildTransactionPatch(transaction, formOf(transaction, { amount: '1234,5' }))).toEqual(
      {},
    );
  });

  it('só os campos alterados', () => {
    const transaction = tx();
    expect(buildTransactionPatch(transaction, formOf(transaction, { amount: '42,50' }))).toEqual({
      amount: 42.5,
    });
    expect(
      buildTransactionPatch(transaction, formOf(transaction, { category: 'Comer fora' })),
    ).toEqual({ category: 'Comer fora' });
    expect(
      buildTransactionPatch(transaction, formOf(transaction, { description: ' feira ' })),
    ).toEqual({ description: 'feira' });
    expect(buildTransactionPatch(transaction, formOf(transaction, { date: '2026-10-20' }))).toEqual(
      { createdAt: '2026-10-20' },
    );
  });

  it('descrição apagada vira null; espaços a mais não contam', () => {
    const transaction = tx();
    expect(buildTransactionPatch(transaction, formOf(transaction, { description: '  ' }))).toEqual({
      description: null,
    });
    expect(
      buildTransactionPatch(
        transaction,
        formOf(transaction, { description: 'compra no mercado ' }),
      ),
    ).toEqual({});
  });

  it('categoria antiga normalizada só vai se o usuário trocar', () => {
    const transaction = tx({ category: 'restaurante' });
    expect(buildTransactionPatch(transaction, formOf(transaction))).toEqual({});
    expect(
      buildTransactionPatch(transaction, formOf(transaction, { category: 'Comer fora' })),
    ).toEqual({ category: 'Comer fora' });
  });

  it('trocar o tipo manda a categoria junto', () => {
    const transaction = tx({ category: 'Outros' });
    const form = changeCorrectionType(formOf(transaction), 'receita');
    expect(buildTransactionPatch(transaction, form)).toEqual({
      type: 'receita',
      category: 'Outros',
    });
  });

  it('transação "outro" salva como gasto', () => {
    const transaction = tx({ type: 'outro' });
    expect(buildTransactionPatch(transaction, formOf(transaction))).toEqual({
      type: 'gasto',
      category: 'Mercado',
    });
  });

  it('tipo com caixa diferente não conta como mudança', () => {
    const transaction = tx({ type: 'Gasto' });
    expect(buildTransactionPatch(transaction, formOf(transaction))).toEqual({});
  });

  it('valor inválido fica de fora', () => {
    const transaction = tx();
    expect(buildTransactionPatch(transaction, formOf(transaction, { amount: 'abc' }))).toEqual({});
  });

  it('várias mudanças juntas', () => {
    const transaction = tx();
    const form = {
      ...changeCorrectionType(formOf(transaction), 'receita'),
      amount: '3.500,00',
      category: 'Salário' as const,
      description: 'salário de outubro',
      date: '2026-10-05',
    };
    expect(buildTransactionPatch(transaction, form)).toEqual({
      type: 'receita',
      amount: 3500,
      category: 'Salário',
      description: 'salário de outubro',
      createdAt: '2026-10-05',
    });
  });
});

describe('formatCorrectionDate', () => {
  const now = new Date(2026, 9, 23, 15);

  it.each([
    ['2026-10-23', 'Hoje, 23 de outubro'],
    ['2026-10-22', 'Ontem, 22 de outubro'],
    ['2026-10-01', '1 de outubro'],
    ['2026-03-05', '5 de março'],
    ['2025-12-31', '31 de dezembro de 2025'],
  ])('%p -> %p', (day, expected) => {
    expect(formatCorrectionDate(day, now)).toBe(expected);
  });

  it('"Ontem" na virada do mês', () => {
    expect(formatCorrectionDate('2026-10-31', new Date(2026, 10, 1, 8))).toBe(
      'Ontem, 31 de outubro',
    );
  });
});

describe('erros', () => {
  it('sem resposta do servidor -> sem conexão', () => {
    expect(getCorrectionErrorMessage({ request: {}, code: 'ERR_NETWORK' }, 'save')).toMatch(
      /Sem conexão/,
    );
    expect(getCorrectionErrorMessage({ code: 'ECONNABORTED' }, 'delete')).toMatch(/Sem conexão/);
  });

  it('404, 401 e 400 com mensagem do backend', () => {
    expect(getCorrectionErrorMessage({ response: { status: 404 } }, 'save')).toBe(
      'Esse lançamento não existe mais.',
    );
    expect(getCorrectionErrorMessage({ response: { status: 401 } }, 'save')).toMatch(/sessão/);
    expect(
      getCorrectionErrorMessage(
        { response: { status: 400, data: { error: 'Valor muito alto' } } },
        'save',
      ),
    ).toBe('Valor muito alto');
  });

  it('o resto -> mensagem genérica da ação', () => {
    expect(getCorrectionErrorMessage({ response: { status: 500 } }, 'save')).toMatch(/salvar/);
    expect(getCorrectionErrorMessage(new Error('x'), 'delete')).toMatch(/apagar/);
    expect(getCorrectionErrorMessage(undefined, 'delete')).toMatch(/apagar/);
  });

  it('isNotFoundError', () => {
    expect(isNotFoundError({ response: { status: 404 } })).toBe(true);
    expect(isNotFoundError({ response: { status: 400 } })).toBe(false);
    expect(isNotFoundError(null)).toBe(false);
  });
});
