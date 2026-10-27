import { api } from './api';

/** Perfil de `GET /user/:id` (sem a senha). `monthlyGoal`: meta mensal de gastos em reais, `null` sem meta. */
export type UserProfile = {
  id: string;
  email: string;
  phone: string;
  name: string | null;
  createdAt: string;
  monthlyGoal: number | null;
};

/** Corpo do 400 de `PUT /user/:id`: mensagem geral e mensagens por campo. */
export type UserValidationError = {
  error: string;
  fields?: Record<string, string[]>;
};

// `monthlyGoal` é Decimal no banco; o backend manda número, mas garante número ou null aqui
const normalizeProfile = (data: UserProfile): UserProfile => ({
  ...data,
  monthlyGoal:
    data.monthlyGoal === null || data.monthlyGoal === undefined ? null : Number(data.monthlyGoal),
});

export async function getUser(id: string): Promise<UserProfile> {
  const response = await api.get<UserProfile>(`/user/${id}`);
  return normalizeProfile(response.data);
}

/**
 * Define a meta mensal (> 0, até 2 casas) ou remove com `null`. Só altera a meta (o nome fica como está).
 * Erros: 400 com `UserValidationError` (veja `getGoalErrorMessage` em `global/monthlyGoal.ts`).
 */
export async function updateMonthlyGoal(id: string, value: number | null): Promise<UserProfile> {
  const response = await api.put<UserProfile>(`/user/${id}`, { monthlyGoal: value });
  return normalizeProfile(response.data);
}
