import { getUser, updateMonthlyGoal, type UserProfile } from '../../services/user';
import {
  getMonthlyGoalState,
  loadMonthlyGoal,
  resetMonthlyGoal,
  saveMonthlyGoal,
  subscribeMonthlyGoal,
} from '../monthlyGoalStore';

jest.mock('../../services/user', () => ({
  getUser: jest.fn(),
  updateMonthlyGoal: jest.fn(),
}));

const mockGetUser = getUser as jest.MockedFunction<typeof getUser>;
const mockUpdate = updateMonthlyGoal as jest.MockedFunction<typeof updateMonthlyGoal>;

const profile = (id: string, monthlyGoal: number | null): UserProfile => ({
  id,
  email: `${id}@email.com`,
  phone: '11999999999',
  name: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  monthlyGoal,
});

// Promessa controlada pelo teste
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

beforeEach(() => {
  jest.resetAllMocks();
  resetMonthlyGoal();
});

describe('monthlyGoalStore', () => {
  it('carrega a meta do usuário e avisa quem está inscrito', async () => {
    mockGetUser.mockResolvedValue(profile('u1', 1500));
    const listener = jest.fn();
    const unsubscribe = subscribeMonthlyGoal(listener);

    const promise = loadMonthlyGoal('u1');
    expect(getMonthlyGoalState()).toEqual({ userId: 'u1', goal: null, loading: true, error: null });

    await promise;
    expect(getMonthlyGoalState()).toEqual({
      userId: 'u1',
      goal: 1500,
      loading: false,
      error: null,
    });
    expect(listener).toHaveBeenCalled();
    unsubscribe();
  });

  it('chamadas simultâneas fazem uma busca só', async () => {
    mockGetUser.mockResolvedValue(profile('u1', 800));
    await Promise.all([loadMonthlyGoal('u1'), loadMonthlyGoal('u1')]);
    expect(mockGetUser).toHaveBeenCalledTimes(1);
  });

  it('erro ao carregar vira mensagem e mantém a meta anterior', async () => {
    mockGetUser.mockResolvedValueOnce(profile('u1', 1500));
    await loadMonthlyGoal('u1');

    mockGetUser.mockRejectedValueOnce(new Error('falhou'));
    await loadMonthlyGoal('u1');
    expect(getMonthlyGoalState()).toEqual({
      userId: 'u1',
      goal: 1500,
      loading: false,
      error: 'Não foi possível carregar a meta.',
    });
  });

  it('salvar atualiza a meta para todos', async () => {
    mockGetUser.mockResolvedValue(profile('u1', 1500));
    await loadMonthlyGoal('u1');
    mockUpdate.mockResolvedValue(profile('u1', 2000));

    const listener = jest.fn();
    const unsubscribe = subscribeMonthlyGoal(listener);
    await saveMonthlyGoal('u1', 2000);

    expect(mockUpdate).toHaveBeenCalledWith('u1', 2000);
    expect(getMonthlyGoalState().goal).toBe(2000);
    expect(listener).toHaveBeenCalled();
    unsubscribe();
  });

  it('remover (null) zera a meta', async () => {
    mockGetUser.mockResolvedValue(profile('u1', 1500));
    await loadMonthlyGoal('u1');
    mockUpdate.mockResolvedValue(profile('u1', null));

    await saveMonthlyGoal('u1', null);
    expect(mockUpdate).toHaveBeenCalledWith('u1', null);
    expect(getMonthlyGoalState().goal).toBeNull();
  });

  it('erro ao salvar rejeita e mantém a meta', async () => {
    mockGetUser.mockResolvedValue(profile('u1', 1500));
    await loadMonthlyGoal('u1');
    const error = new Error('400');
    mockUpdate.mockRejectedValue(error);

    await expect(saveMonthlyGoal('u1', 2000)).rejects.toBe(error);
    expect(getMonthlyGoalState().goal).toBe(1500);
  });

  it('um carregamento que volta depois do salvamento não sobrescreve a meta nova', async () => {
    const pending = deferred<UserProfile>();
    mockGetUser.mockReturnValueOnce(pending.promise);
    const load = loadMonthlyGoal('u1');

    mockUpdate.mockResolvedValue(profile('u1', 2000));
    await saveMonthlyGoal('u1', 2000);

    pending.resolve(profile('u1', 1500));
    await load;
    expect(getMonthlyGoalState()).toMatchObject({ goal: 2000, loading: false });
  });

  it('sair da conta limpa a meta e ignora respostas atrasadas', async () => {
    const pendingLoad = deferred<UserProfile>();
    mockGetUser.mockReturnValueOnce(pendingLoad.promise);
    const load = loadMonthlyGoal('u1');

    const pendingSave = deferred<UserProfile>();
    mockUpdate.mockReturnValueOnce(pendingSave.promise);
    const save = saveMonthlyGoal('u1', 900);

    resetMonthlyGoal();
    pendingLoad.resolve(profile('u1', 1500));
    pendingSave.resolve(profile('u1', 900));
    await Promise.all([load, save]);

    expect(getMonthlyGoalState()).toEqual({
      userId: null,
      goal: null,
      loading: false,
      error: null,
    });
  });

  it('trocar de usuário não mostra a meta do anterior', async () => {
    mockGetUser.mockResolvedValueOnce(profile('u1', 1500));
    await loadMonthlyGoal('u1');

    const pending = deferred<UserProfile>();
    mockGetUser.mockReturnValueOnce(pending.promise);
    const load = loadMonthlyGoal('u2');
    expect(getMonthlyGoalState()).toMatchObject({ userId: 'u2', goal: null, loading: true });

    pending.resolve(profile('u2', 700));
    await load;
    expect(getMonthlyGoalState()).toMatchObject({ userId: 'u2', goal: 700 });
  });
});
