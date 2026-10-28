import { AxiosError, AxiosHeaders } from 'axios';
import type { Transaction } from '../../../services/transactions';
import {
  type ChatItem,
  DELETED_MESSAGE,
  GENERIC_ERROR_MESSAGE,
  applyCorrection,
  applyDeletion,
  buildSuccessReply,
  confirmAll,
  confirmItem,
  formatCardDate,
  formatReceiptMeta,
  formatSignedAmount,
  getErrorReply,
  getGreeting,
  getJorgeStatus,
  getProfileInitial,
  getReceiptTitle,
  getTypeLabel,
  hasPendingConfirmation,
  transactionFromWebhook,
} from '../chat';
import { getKeyboardOverlap } from '../useKeyboardOverlap';

// 23/10/2026, 19:24 no fuso local
const NOW = new Date(2026, 9, 23, 19, 24);
const at = (...args: [number, number, number, number?, number?]) =>
  new Date(args[0], args[1], args[2], args[3] ?? 12, args[4] ?? 0).toISOString();

const tx = (overrides: Partial<Transaction> = {}): Transaction => ({
  id: 'tx-1',
  phone: '5511999999999',
  type: 'gasto',
  amount: 50,
  category: 'Mercado',
  description: null,
  messageId: 'msg-1',
  createdAt: at(2026, 9, 23, 19, 24),
  ...overrides,
});

const axiosError = (status: number, data: unknown) => {
  const error = new AxiosError('Request failed');
  error.response = {
    status,
    data,
    statusText: '',
    headers: {},
    config: { headers: new AxiosHeaders() },
  };
  return error;
};

describe('getGreeting', () => {
  it('cumprimenta conforme a hora, com o primeiro nome', () => {
    expect(getGreeting(new Date(2026, 9, 23, 8), 'Lucas Medici')).toBe(
      'Bom dia, Lucas! O que rolou hoje?',
    );
    expect(getGreeting(new Date(2026, 9, 23, 13), 'Lucas')).toBe(
      'Boa tarde, Lucas! O que rolou hoje?',
    );
    expect(getGreeting(new Date(2026, 9, 23, 19), ' Lucas ')).toBe(
      'Boa noite, Lucas! O que rolou hoje?',
    );
    expect(getGreeting(new Date(2026, 9, 23, 3), 'Lucas')).toBe(
      'Boa noite, Lucas! O que rolou hoje?',
    );
  });

  it('sem nome, só a saudação', () => {
    expect(getGreeting(new Date(2026, 9, 23, 8), null)).toBe('Bom dia! O que rolou hoje?');
    expect(getGreeting(new Date(2026, 9, 23, 8), '   ')).toBe('Bom dia! O que rolou hoje?');
  });
});

describe('getProfileInitial', () => {
  it('usa o nome, depois o e-mail', () => {
    expect(getProfileInitial('lucas', 'x@y.com')).toBe('L');
    expect(getProfileInitial(null, 'maria@y.com')).toBe('M');
    expect(getProfileInitial('  ', '  ')).toBe('?');
    expect(getProfileInitial('élio', null)).toBe('É');
  });
});

describe('getJorgeStatus', () => {
  const base = { busy: false, awaitingConfirmation: false, isConnected: true };

  it('pensando enquanto espera a API (tem prioridade)', () => {
    expect(getJorgeStatus({ ...base, busy: true, awaitingConfirmation: true })).toEqual({
      label: 'pensando…',
      tone: 'thinking',
    });
  });

  it('esperando conferir com cartão aberto', () => {
    expect(getJorgeStatus({ ...base, awaitingConfirmation: true }).label).toBe(
      'esperando você conferir',
    );
  });

  it('online ou sem conexão no resto do tempo', () => {
    expect(getJorgeStatus(base)).toEqual({ label: 'online', tone: 'idle' });
    expect(getJorgeStatus({ ...base, isConnected: false })).toEqual({
      label: 'sem conexão',
      tone: 'offline',
    });
  });
});

describe('transactionFromWebhook', () => {
  const context = { phone: '5511999999999', messageId: '1730000000000', now: NOW };

  it('monta a transação gravada a partir do 200', () => {
    expect(
      transactionFromWebhook(
        { id: 'abc', valor: 50, tipo: 'gasto', categoria: 'Mercado', comentario: ' pão ' },
        context,
      ),
    ).toEqual({
      id: 'abc',
      phone: '5511999999999',
      type: 'gasto',
      amount: 50,
      category: 'Mercado',
      description: 'pão',
      messageId: '1730000000000',
      createdAt: NOW.toISOString(),
    });
  });

  it('campos de texto vazios viram null e o tipo é normalizado', () => {
    const result = transactionFromWebhook(
      { id: 'abc', valor: 1200, tipo: 'Receita', categoria: '', comentario: '' },
      context,
    );
    expect(result).toMatchObject({ type: 'receita', category: null, description: null });
  });

  it('sem id ou sem valor numérico, não dá para montar o cartão', () => {
    expect(transactionFromWebhook({ valor: 50, tipo: 'gasto' }, context)).toBeNull();
    expect(transactionFromWebhook({ id: '  ', valor: 50 }, context)).toBeNull();
    expect(transactionFromWebhook({ id: 'abc', valor: '50' }, context)).toBeNull();
    expect(transactionFromWebhook({ id: 'abc', valor: NaN }, context)).toBeNull();
    expect(transactionFromWebhook(null, context)).toBeNull();
  });
});

describe('buildSuccessReply (resposta sem id)', () => {
  it('descreve o que foi registrado', () => {
    expect(
      buildSuccessReply({ valor: 50, tipo: 'gasto', categoria: 'Mercado', comentario: 'pão' }),
    ).toBe('Anotado ✅ Gasto de R$ 50,00 em Mercado.\n📝 pão');
    expect(buildSuccessReply({ valor: 10, tipo: 'receita' })).toBe(
      'Anotado ✅ Receita de R$ 10,00.',
    );
    expect(buildSuccessReply({})).toBe('Anotado ✅');
  });
});

describe('getErrorReply', () => {
  it('mostra o error do 400', () => {
    expect(
      getErrorReply(axiosError(400, { error: 'Não achei valor', code: 'NO_TRANSACTION' })),
    ).toBe('Não achei valor');
  });

  it('qualquer outra coisa vira a mensagem genérica', () => {
    expect(getErrorReply(axiosError(400, { error: '  ' }))).toBe(GENERIC_ERROR_MESSAGE);
    expect(getErrorReply(axiosError(500, { error: 'boom' }))).toBe(GENERIC_ERROR_MESSAGE);
    expect(getErrorReply(new Error('rede'))).toBe(GENERIC_ERROR_MESSAGE);
  });
});

describe('recibo', () => {
  it('título: descrição, senão categoria, senão tipo', () => {
    expect(getReceiptTitle(tx({ description: 'almoço com a equipe' }))).toBe('Almoço com a equipe');
    expect(getReceiptTitle(tx({ description: null, category: 'Freela' }))).toBe('Freela');
    expect(getReceiptTitle(tx({ description: ' ', category: null, type: 'receita' }))).toBe(
      'Receita',
    );
  });

  it('tipo · hora hoje; tipo · dia em outro dia', () => {
    expect(formatReceiptMeta(tx({ type: 'receita' }), NOW)).toBe('Receita · 19:24');
    expect(formatReceiptMeta(tx({ createdAt: at(2026, 9, 22, 9, 5) }), NOW)).toBe('Gasto · 22 out');
    expect(formatReceiptMeta(tx({ createdAt: at(2025, 11, 31) }), NOW)).toBe('Gasto · 31 dez 2025');
    expect(formatReceiptMeta(tx({ createdAt: 'nada' }), NOW)).toBe('Gasto');
  });

  it('valor com sinal', () => {
    expect(formatSignedAmount(tx({ type: 'receita', amount: 1200 }))).toBe('+ R$ 1.200,00');
    expect(formatSignedAmount(tx({ type: 'gasto', amount: 50 }))).toBe('− R$ 50,00');
    expect(formatSignedAmount(tx({ type: 'outro', amount: 10 }))).toBe('R$ 10,00');
  });

  it('rótulo do tipo', () => {
    expect(getTypeLabel(' GASTO ')).toBe('Gasto');
    expect(getTypeLabel('receita')).toBe('Receita');
    expect(getTypeLabel('outro')).toBe('Lançamento');
  });
});

describe('formatCardDate', () => {
  it('hoje, ontem, outro dia e outro ano', () => {
    expect(formatCardDate(at(2026, 9, 23, 0, 5), NOW)).toBe('Hoje, 23 out');
    expect(formatCardDate(at(2026, 9, 22, 23, 59), NOW)).toBe('Ontem, 22 out');
    expect(formatCardDate(at(2026, 4, 3), NOW)).toBe('3 mai');
    expect(formatCardDate(at(2025, 9, 23), NOW)).toBe('23 out 2025');
    expect(formatCardDate('invalida', NOW)).toBe('—');
  });
});

describe('itens da conversa', () => {
  const items: ChatItem[] = [
    { kind: 'greeting', id: 'g' },
    { kind: 'text', id: 'u1', sender: 'user', text: 'gastei 50' },
    { kind: 'transaction', id: 'c1', transaction: tx({ id: 'a' }), confirmed: true },
    { kind: 'transaction', id: 'c2', transaction: tx({ id: 'b' }), confirmed: false },
  ];

  it('sabe se há cartão aberto', () => {
    expect(hasPendingConfirmation(items)).toBe(true);
    expect(hasPendingConfirmation(items.slice(0, 3))).toBe(false);
  });

  it('confirmar fecha o cartão (vira recibo)', () => {
    const confirmed = confirmItem(items, 'c2');
    expect(confirmed[3]).toMatchObject({ confirmed: true });
    expect(hasPendingConfirmation(confirmed)).toBe(false);
  });

  it('confirmAll fecha todos e devolve o mesmo array se não havia nenhum', () => {
    expect(hasPendingConfirmation(confirmAll(items))).toBe(false);
    const none = items.slice(0, 3);
    expect(confirmAll(none)).toBe(none);
  });

  it('correção troca a transação e vira recibo', () => {
    const corrected = tx({ id: 'b', amount: 70, category: 'Comer fora' });
    const result = applyCorrection(items, corrected);
    expect(result[3]).toEqual({
      kind: 'transaction',
      id: 'c2',
      transaction: corrected,
      confirmed: true,
    });
    expect(result[2]).toBe(items[2]);
  });

  it('apagar troca o item por um aviso do Jorge', () => {
    const result = applyDeletion(items, 'a');
    expect(result[2]).toEqual({ kind: 'text', id: 'c1', sender: 'bot', text: DELETED_MESSAGE });
    expect(result[3]).toBe(items[3]);
  });
});

describe('getKeyboardOverlap', () => {
  it('quanto o teclado cobre do rodapé da tela', () => {
    expect(getKeyboardOverlap(700, 450)).toBe(250);
    expect(getKeyboardOverlap(700.2, 450)).toBe(251);
    expect(getKeyboardOverlap(400, 450)).toBe(0);
    expect(getKeyboardOverlap(NaN, 450)).toBe(0);
  });
});
