// Regras da edição de nome no Perfil (funções puras, testadas em __tests__).
import { isAxiosError } from 'axios';
import { NETWORK_ERROR, getBackendFieldErrors, getBackendMessage } from '../login/formErrors';

// Mesma mensagem do backend (UpdateUserSchema)
export const EMPTY_NAME_ERROR = 'O nome não pode ficar vazio';
export const NAME_UPDATE_ERROR = 'Não foi possível salvar o nome. Tente de novo.';

export function validateName(name: string): string | undefined {
  return name.trim() ? undefined : EMPTY_NAME_ERROR;
}

export function getNameUpdateError(error: unknown): string {
  if (isAxiosError(error)) {
    if (!error.response) return NETWORK_ERROR;
    if (error.response.status === 400) {
      return (
        getBackendFieldErrors(error, ['name'] as const).name ??
        getBackendMessage(error) ??
        NAME_UPDATE_ERROR
      );
    }
  }
  return NAME_UPDATE_ERROR;
}

/** "Olá, Lucas!" com o primeiro nome; sem nome (ou ainda carregando), só "Olá!". */
export function getGreeting(name: string | null): string {
  const firstName = name?.trim().split(/\s+/)[0];
  return firstName ? `Olá, ${firstName}!` : 'Olá!';
}
