// Estado da meta mensal compartilhado por todo o app (chat e relatórios leem a mesma meta e atualizam
// juntos depois de salvar), sem Provider: um store em módulo lido com `useSyncExternalStore` em
// `useMonthlyGoal`. Testado em __tests__/monthlyGoalStore.test.ts.
import { getGoalErrorMessage } from '../global/monthlyGoal';
import { getUser, updateMonthlyGoal } from '../services/user';

export type MonthlyGoalState = {
  /** Dono da meta carregada; `null` antes de carregar ou depois de sair. */
  userId: string | null;
  goal: number | null;
  loading: boolean;
  /** Mensagem de erro do último carregamento (em português). */
  error: string | null;
};

const INITIAL_STATE: MonthlyGoalState = { userId: null, goal: null, loading: false, error: null };

let state = INITIAL_STATE;
const listeners = new Set<() => void>();
// Cada carregamento/salvamento/reset incrementa; respostas de uma versão antiga são ignoradas
let version = 0;
// Muda ao sair da conta ou trocar de usuário: um salvamento que termina depois disso é ignorado
let session = 0;
let pendingLoad: { userId: string; promise: Promise<void> } | null = null;

function setState(patch: Partial<MonthlyGoalState>) {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
}

export function getMonthlyGoalState(): MonthlyGoalState {
  return state;
}

export function subscribeMonthlyGoal(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Busca a meta do usuário. Chamadas repetidas enquanto uma busca está em andamento reaproveitam a mesma. */
export function loadMonthlyGoal(userId: string): Promise<void> {
  if (pendingLoad?.userId === userId) return pendingLoad.promise;

  const requestVersion = ++version;
  if (state.userId === userId) {
    setState({ loading: true, error: null });
  } else {
    // Trocou de usuário: não mostra a meta do anterior enquanto carrega
    session++;
    setState({ userId, goal: null, loading: true, error: null });
  }

  const promise = getUser(userId)
    .then(
      (profile) => {
        if (requestVersion === version) setState({ goal: profile.monthlyGoal, loading: false });
      },
      (error) => {
        if (requestVersion === version) {
          setState({
            loading: false,
            error: getGoalErrorMessage(error, 'Não foi possível carregar a meta.'),
          });
        }
      },
    )
    .finally(() => {
      if (pendingLoad?.promise === promise) pendingLoad = null;
    });

  pendingLoad = { userId, promise };
  return promise;
}

/**
 * Salva (`number`) ou remove (`null`) a meta. Em caso de erro rejeita com o erro da API
 * (use `getGoalErrorMessage` para a mensagem) e mantém a meta anterior.
 */
export async function saveMonthlyGoal(userId: string, value: number | null): Promise<void> {
  const requestSession = session;
  const profile = await updateMonthlyGoal(userId, value);
  if (requestSession !== session) return;

  // Descarta carregamentos que começaram antes e voltariam com a meta antiga
  version++;
  pendingLoad = null;
  setState({ userId, goal: profile.monthlyGoal, loading: false, error: null });
}

/** Limpa a meta (ao sair da conta). */
export function resetMonthlyGoal() {
  version++;
  session++;
  pendingLoad = null;
  setState(INITIAL_STATE);
}
