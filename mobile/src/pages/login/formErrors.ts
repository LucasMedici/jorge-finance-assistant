// Validação e mensagens de erro dos formulários de Login e Cadastro (funções puras, testadas em __tests__).
// O Perfil reaproveita os helpers genéricos (getBackendMessage, getRequestFailureMessage).
import { isAxiosError } from 'axios';

export const LOGIN_CREDENTIALS_ERROR = 'E-mail ou senha não conferem. Confira e tente de novo.';
export const NETWORK_ERROR = 'Sem conexão com o servidor. Confira sua internet e tente de novo.';
export const SERVER_ERROR = 'Algo deu errado do nosso lado. Tente de novo em instantes.';
export const TOO_MANY_ATTEMPTS_ERROR = 'Muitas tentativas. Tente novamente em alguns minutos.';
export const REGISTER_INVALID_ERROR = 'Confira os dados e tente de novo.';

// Mesmas mensagens do backend (CreateUserSchema em backend/src/services/userService.ts)
export const REQUIRED_EMAIL = 'O e-mail é obrigatório';
export const REQUIRED_PASSWORD = 'A senha é obrigatória';
export const REQUIRED_PHONE = 'O telefone é obrigatório';
export const INVALID_EMAIL = 'E-mail inválido';
export const SHORT_PASSWORD = 'A senha deve ter pelo menos 6 caracteres';
export const INVALID_PHONE = 'Telefone inválido';

const MIN_PASSWORD_LENGTH = 6;
const MIN_PHONE_LENGTH = 10;
// Checagem leve de propósito: o backend valida de verdade; aqui só evita gastar tentativas do rate limit
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type FieldErrors<F extends string> = Partial<Record<F, string>>;

export type LoginField = 'email' | 'password';
export type RegisterField = 'email' | 'password' | 'phone';

export type LoginFailure = {
  message: string;
  /** true quando foi e-mail/senha errados: o campo de senha fica marcado em vermelho. */
  credentials: boolean;
};

export type RegisterFailure = {
  fields: FieldErrors<RegisterField>;
  /** Erro que não é de um campo específico (rede, servidor, limite de tentativas). */
  general?: string;
};

export function hasFieldErrors(errors: FieldErrors<string>): boolean {
  return Object.values(errors).some(Boolean);
}

/** Texto do `error` do backend, se for uma string não vazia. */
export function getBackendMessage(error: unknown): string | undefined {
  if (!isAxiosError(error)) return undefined;
  const message = (error.response?.data as { error?: unknown } | undefined)?.error;
  return typeof message === 'string' && message.trim() ? message.trim() : undefined;
}

/** Primeira mensagem de cada campo em `fields` (formato do 400 do backend: `{ campo: string[] }`). */
export function getBackendFieldErrors<F extends string>(
  error: unknown,
  keys: readonly F[],
): FieldErrors<F> {
  const result: FieldErrors<F> = {};
  if (!isAxiosError(error)) return result;

  const fields = (error.response?.data as { fields?: unknown } | undefined)?.fields;
  if (!fields || typeof fields !== 'object') return result;

  for (const key of keys) {
    const messages = (fields as Record<string, unknown>)[key];
    const first = Array.isArray(messages) ? messages.find((m) => typeof m === 'string') : undefined;
    if (first) result[key] = first;
  }
  return result;
}

/** Mensagem para falhas que não dependem do formulário: sem resposta, 429 e 5xx (ou erro inesperado). */
export function getRequestFailureMessage(error: unknown): string {
  if (isAxiosError(error)) {
    if (!error.response) return NETWORK_ERROR;
    if (error.response.status === 429) return getBackendMessage(error) ?? TOO_MANY_ATTEMPTS_ERROR;
  }
  return SERVER_ERROR;
}

export function validateLoginForm(values: {
  email: string;
  password: string;
}): FieldErrors<LoginField> {
  const errors: FieldErrors<LoginField> = {};
  if (!values.email.trim()) errors.email = REQUIRED_EMAIL;
  if (!values.password) errors.password = REQUIRED_PASSWORD;
  return errors;
}

export function getLoginFailure(error: unknown): LoginFailure {
  const status = isAxiosError(error) ? error.response?.status : undefined;
  // 401: credenciais erradas; 400: o backend não recebeu e-mail/senha (não deve acontecer com a validação acima)
  if (status === 401 || status === 400) {
    return { message: LOGIN_CREDENTIALS_ERROR, credentials: true };
  }
  return { message: getRequestFailureMessage(error), credentials: false };
}

export function validateRegisterForm(values: {
  email: string;
  password: string;
  phone: string;
}): FieldErrors<RegisterField> {
  const errors: FieldErrors<RegisterField> = {};
  const email = values.email.trim();
  const phone = values.phone.trim();

  if (!email) errors.email = REQUIRED_EMAIL;
  else if (!EMAIL_SHAPE.test(email)) errors.email = INVALID_EMAIL;

  if (!values.password) errors.password = REQUIRED_PASSWORD;
  else if (values.password.length < MIN_PASSWORD_LENGTH) errors.password = SHORT_PASSWORD;

  if (!phone) errors.phone = REQUIRED_PHONE;
  else if (phone.length < MIN_PHONE_LENGTH) errors.phone = INVALID_PHONE;

  return errors;
}

const REGISTER_FIELDS: readonly RegisterField[] = ['email', 'password', 'phone'];

export function getRegisterFailure(error: unknown): RegisterFailure {
  const status = isAxiosError(error) ? error.response?.status : undefined;

  if (status === 400) {
    const fields = getBackendFieldErrors(error, REGISTER_FIELDS);
    if (hasFieldErrors(fields)) return { fields };
    return { fields, general: getBackendMessage(error) ?? REGISTER_INVALID_ERROR };
  }

  if (status === 409) {
    // "Este e-mail já está cadastrado" / "Este telefone já está cadastrado" / "Usuário já cadastrado"
    const message = getBackendMessage(error) ?? 'Usuário já cadastrado';
    const lower = message.toLowerCase();
    if (lower.includes('e-mail')) return { fields: { email: message } };
    if (lower.includes('telefone')) return { fields: { phone: message } };
    return { fields: {}, general: message };
  }

  return { fields: {}, general: getRequestFailureMessage(error) };
}
