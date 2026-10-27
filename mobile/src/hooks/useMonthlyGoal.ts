import { useCallback, useContext, useEffect, useSyncExternalStore } from 'react';
import { AuthContext } from '../context/AuthContext';
import {
  getMonthlyGoalState,
  loadMonthlyGoal,
  resetMonthlyGoal,
  saveMonthlyGoal,
  subscribeMonthlyGoal,
} from './monthlyGoalStore';

export type UseMonthlyGoal = {
  /** Meta mensal de gastos do usuário logado; `null` sem meta (ou ainda carregando). */
  goal: number | null;
  loading: boolean;
  /** Mensagem do erro ao carregar (a meta anterior, se havia, continua em `goal`). */
  error: string | null;
  /** Busca a meta de novo na API. */
  refresh: () => Promise<void>;
  /** Salva (`number`) ou remove (`null`); rejeita com o erro da API (use `getGoalErrorMessage`). */
  save: (value: number | null) => Promise<void>;
};

/**
 * Meta mensal do usuário logado. Todas as telas que usam o hook compartilham o mesmo estado:
 * a primeira busca a meta e, depois de `save`, todas recebem o valor novo. Não precisa de Provider.
 * Precisa estar dentro do `AuthProvider`.
 */
export function useMonthlyGoal(): UseMonthlyGoal {
  const userId = useContext(AuthContext)?.user?.id ?? null;
  const state = useSyncExternalStore(subscribeMonthlyGoal, getMonthlyGoalState);

  useEffect(() => {
    if (!userId) {
      if (getMonthlyGoalState().userId) resetMonthlyGoal();
      return;
    }
    // Só a primeira tela a montar (ou a troca de usuário) dispara a busca
    if (getMonthlyGoalState().userId !== userId) loadMonthlyGoal(userId);
  }, [userId]);

  const refresh = useCallback(async () => {
    if (userId) await loadMonthlyGoal(userId);
  }, [userId]);

  const save = useCallback(
    async (value: number | null) => {
      if (!userId) throw new Error('Usuário não está logado');
      await saveMonthlyGoal(userId, value);
    },
    [userId],
  );

  // Até o efeito rodar, o estado pode ser de outro usuário: não expõe a meta dele
  const isCurrentUser = userId !== null && state.userId === userId;

  return {
    goal: isCurrentUser ? state.goal : null,
    loading: userId !== null && (!isCurrentUser || state.loading),
    error: isCurrentUser ? state.error : null,
    refresh,
    save,
  };
}
