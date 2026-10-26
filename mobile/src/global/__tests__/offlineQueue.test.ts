import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../../services/api';
import {
  OfflineQueueItem,
  addToOfflineQueue,
  getSendFailureAction,
  processOfflineQueue,
} from '../offlineQueue';
import { makeToken } from './makeToken';

jest.mock('../../services/api', () => ({ api: { post: jest.fn() } }));

const post = api.post as jest.Mock;

const ME = '5511999999999';
const OTHER = '5511888888888';

const item = (id: string, userPhone?: string): OfflineQueueItem => ({
  id,
  text: `mensagem ${id}`,
  sender: 'user',
  timestamp: '2026-10-01T12:00:00.000Z',
  userPhone,
});

// Erro no formato do axios quando o servidor responde
const httpError = (status: number, data?: unknown) =>
  Object.assign(new Error(`Request failed with status code ${status}`), {
    response: { status, data },
  });

// Erro do axios sem resposta (sem rede / timeout)
const networkError = () => Object.assign(new Error('Network Error'), { request: {} });

async function setQueue(items: OfflineQueueItem[]) {
  await AsyncStorage.setItem('offlineQueue', JSON.stringify(items));
}

async function queueIds(): Promise<string[]> {
  const raw = await AsyncStorage.getItem('offlineQueue');
  return (raw ? (JSON.parse(raw) as OfflineQueueItem[]) : []).map((i) => i.id);
}

const sentIds = () =>
  post.mock.calls.map(([, body]) => (body as { userMessage: OfflineQueueItem }).userMessage.id);

const flushPromises = () => new Promise((resolve) => setImmediate(resolve));

beforeEach(async () => {
  await AsyncStorage.clear();
  post.mockReset();
  post.mockResolvedValue({ status: 200, data: {} });
  await AsyncStorage.setItem('userToken', makeToken({ sub: '1', phone: ME }));
  jest.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('addToOfflineQueue', () => {
  it('acrescenta ao fim da fila', async () => {
    await addToOfflineQueue(item('a', ME));
    await addToOfflineQueue(item('b', ME));
    expect(await queueIds()).toEqual(['a', 'b']);
  });
});

describe('processOfflineQueue', () => {
  it('envia só os itens do usuário logado e mantém os de outra conta', async () => {
    await setQueue([item('a', ME), item('b', OTHER), item('c'), item('d', ME)]);

    await processOfflineQueue(ME);

    expect(post).toHaveBeenCalledWith('/webhook/messages', { userMessage: item('a', ME) });
    expect(sentIds()).toEqual(['a', 'd']);
    expect(await queueIds()).toEqual(['b', 'c']);
  });

  it('remove da fila os itens enviados com 200', async () => {
    await setQueue([item('a', ME), item('b', ME)]);

    await processOfflineQueue(ME);

    expect(sentIds()).toEqual(['a', 'b']);
    expect(await queueIds()).toEqual([]);
  });

  it('não faz nada sem usuário', async () => {
    await setQueue([item('a', ME)]);

    await processOfflineQueue(null);
    await processOfflineQueue(undefined);

    expect(post).not.toHaveBeenCalled();
    expect(await queueIds()).toEqual(['a']);
  });

  it('não envia quando o token salvo é de outra conta', async () => {
    await AsyncStorage.setItem('userToken', makeToken({ sub: '2', phone: OTHER }));
    await setQueue([item('a', ME)]);

    await processOfflineQueue(ME);

    expect(post).not.toHaveBeenCalled();
    expect(await queueIds()).toEqual(['a']);
  });

  it.each(['NO_TRANSACTION', 'EMPTY_MESSAGE', 'MESSAGE_TOO_LONG', 'INVALID_JSON_RESPONSE'])(
    '400 %s descarta o item e continua com os próximos',
    async (code) => {
      await setQueue([item('a', ME), item('b', ME), item('c', OTHER)]);
      post.mockRejectedValueOnce(httpError(400, { error: 'erro', code }));

      await processOfflineQueue(ME);

      expect(sentIds()).toEqual(['a', 'b']);
      expect(await queueIds()).toEqual(['c']);
    }
  );

  it('outros 4xx (ex.: 404, 413) também descartam', async () => {
    await setQueue([item('a', ME), item('b', ME), item('c', ME)]);
    post.mockRejectedValueOnce(httpError(404)).mockRejectedValueOnce(httpError(413));

    await processOfflineQueue(ME);

    expect(sentIds()).toEqual(['a', 'b', 'c']);
    expect(await queueIds()).toEqual([]);
  });

  it.each(['OPENAI_API_ERROR', 'OPENAI_REFUSAL', 'OPENAI_NO_RESPONSE'])(
    '400 %s mantém o item e para a fila',
    async (code) => {
      await setQueue([item('a', ME), item('b', ME)]);
      post.mockRejectedValueOnce(httpError(400, { error: 'erro', code }));

      await processOfflineQueue(ME);

      expect(sentIds()).toEqual(['a']);
      expect(await queueIds()).toEqual(['a', 'b']);
    }
  );

  it.each([
    ['500', () => httpError(500)],
    ['502', () => httpError(502, '<html>Bad Gateway</html>')],
    ['503', () => httpError(503)],
    ['401', () => httpError(401, { error: 'Token inválido' })],
    ['408', () => httpError(408)],
    ['429', () => httpError(429)],
    ['erro de rede', networkError],
  ])('%s mantém o item e para a fila', async (_label, makeError) => {
    await setQueue([item('a', ME), item('b', ME)]);
    post.mockRejectedValueOnce(makeError());

    await processOfflineQueue(ME);

    expect(sentIds()).toEqual(['a']);
    expect(await queueIds()).toEqual(['a', 'b']);
  });

  it('itens mantidos são reenviados na próxima execução', async () => {
    await setQueue([item('a', ME), item('b', ME)]);
    post.mockRejectedValueOnce(httpError(503));

    await processOfflineQueue(ME);
    await processOfflineQueue(ME);

    expect(sentIds()).toEqual(['a', 'a', 'b']);
    expect(await queueIds()).toEqual([]);
  });

  it('não roda em paralelo: chamada concorrente espera e não reenvia a mesma mensagem', async () => {
    await setQueue([item('a', ME), item('b', ME)]);

    let releaseFirst: () => void = () => {};
    post.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          releaseFirst = () => resolve({ status: 200, data: {} });
        })
    );

    const first = processOfflineQueue(ME);
    await processOfflineQueue(ME); // retorna na hora: já existe uma execução em andamento
    await processOfflineQueue(ME);

    await flushPromises();
    expect(sentIds()).toEqual(['a']);

    releaseFirst();
    await first;

    // A re-execução pendente roda ao final, mas não encontra nada novo para enviar
    expect(sentIds()).toEqual(['a', 'b']);
    expect(await queueIds()).toEqual([]);
  });

  it('mensagem adicionada durante o envio é enviada pela re-execução pendente', async () => {
    await setQueue([item('a', ME)]);

    let releaseFirst: () => void = () => {};
    post.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          releaseFirst = () => resolve({ status: 200, data: {} });
        })
    );

    const first = processOfflineQueue(ME);
    await flushPromises();
    await addToOfflineQueue(item('b', ME));
    await processOfflineQueue(ME);

    releaseFirst();
    await first;

    expect(sentIds()).toEqual(['a', 'b']);
    expect(await queueIds()).toEqual([]);
  });
});

describe('getSendFailureAction', () => {
  it.each([
    [httpError(400, { code: 'NO_TRANSACTION' }), 'discard'],
    [httpError(400, { error: 'sem código' }), 'discard'],
    [httpError(400), 'discard'],
    [httpError(403), 'discard'],
    [httpError(422, { code: 'X' }), 'discard'],
    [httpError(400, { code: 'OPENAI_API_ERROR' }), 'retry'],
    [httpError(401), 'retry'],
    [httpError(408), 'retry'],
    [httpError(429), 'retry'],
    [httpError(500), 'retry'],
    [httpError(504), 'retry'],
    [networkError(), 'retry'],
    [new Error('qualquer'), 'retry'],
    [null, 'retry'],
    [undefined, 'retry'],
  ])('%p -> %p', (error, expected) => {
    expect(getSendFailureAction(error)).toBe(expected);
  });
});
