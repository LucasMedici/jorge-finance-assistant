import { NETWORK_ERROR } from '../../login/formErrors';
import {
  EMPTY_NAME_ERROR,
  NAME_UPDATE_ERROR,
  getGreeting,
  getNameUpdateError,
  validateName,
} from '../nameForm';

const httpError = (status: number, data?: unknown) =>
  Object.assign(new Error(`Request failed with status code ${status}`), {
    isAxiosError: true,
    response: { status, data },
  });

describe('validateName', () => {
  it('nome vazio ou só espaços é inválido', () => {
    expect(validateName('')).toBe(EMPTY_NAME_ERROR);
    expect(validateName('   ')).toBe(EMPTY_NAME_ERROR);
  });

  it('nome preenchido é válido', () => {
    expect(validateName(' Lucas ')).toBeUndefined();
  });
});

describe('getNameUpdateError', () => {
  it('400: mensagem do campo `name` do backend', () => {
    const error = httpError(400, { error: 'x', fields: { name: ['O nome não pode ficar vazio'] } });
    expect(getNameUpdateError(error)).toBe('O nome não pode ficar vazio');
  });

  it('400 sem `fields`: mensagem geral do backend', () => {
    expect(getNameUpdateError(httpError(400, { error: 'Informe o nome ou a meta mensal' }))).toBe(
      'Informe o nome ou a meta mensal',
    );
  });

  it('sem rede: mensagem de conexão', () => {
    const error = Object.assign(new Error('Network Error'), { isAxiosError: true, request: {} });
    expect(getNameUpdateError(error)).toBe(NETWORK_ERROR);
  });

  it('outros erros: mensagem padrão', () => {
    expect(getNameUpdateError(httpError(500))).toBe(NAME_UPDATE_ERROR);
    expect(getNameUpdateError(new Error('x'))).toBe(NAME_UPDATE_ERROR);
  });
});

describe('getGreeting', () => {
  it('usa o primeiro nome', () => {
    expect(getGreeting('Lucas Medici')).toBe('Olá, Lucas!');
    expect(getGreeting('  Lucas  ')).toBe('Olá, Lucas!');
  });

  it('sem nome ou ainda carregando: só "Olá!"', () => {
    expect(getGreeting(null)).toBe('Olá!');
    expect(getGreeting('')).toBe('Olá!');
    expect(getGreeting('   ')).toBe('Olá!');
  });
});
