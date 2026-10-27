import {
  INVALID_EMAIL,
  INVALID_PHONE,
  LOGIN_CREDENTIALS_ERROR,
  NETWORK_ERROR,
  REGISTER_INVALID_ERROR,
  REQUIRED_EMAIL,
  REQUIRED_PASSWORD,
  REQUIRED_PHONE,
  SERVER_ERROR,
  SHORT_PASSWORD,
  TOO_MANY_ATTEMPTS_ERROR,
  getBackendFieldErrors,
  getLoginFailure,
  getRegisterFailure,
  hasFieldErrors,
  validateLoginForm,
  validateRegisterForm,
} from '../formErrors';

// Erro no formato do axios quando o servidor responde
const httpError = (status: number, data?: unknown) =>
  Object.assign(new Error(`Request failed with status code ${status}`), {
    isAxiosError: true,
    response: { status, data },
  });

// Erro do axios sem resposta (sem rede / timeout)
const networkError = () =>
  Object.assign(new Error('Network Error'), { isAxiosError: true, request: {} });

describe('validateLoginForm', () => {
  it('pede e-mail e senha quando vazios', () => {
    expect(validateLoginForm({ email: '  ', password: '' })).toEqual({
      email: REQUIRED_EMAIL,
      password: REQUIRED_PASSWORD,
    });
  });

  it('sem erros quando os dois estão preenchidos', () => {
    const errors = validateLoginForm({ email: 'lucas@email.com', password: 'x' });
    expect(hasFieldErrors(errors)).toBe(false);
  });
});

describe('getLoginFailure', () => {
  it('401: credenciais erradas, marca o campo', () => {
    expect(getLoginFailure(httpError(401, { error: 'Invalid email or password' }))).toEqual({
      message: LOGIN_CREDENTIALS_ERROR,
      credentials: true,
    });
  });

  it('sem resposta: mensagem de conexão, sem marcar o campo', () => {
    expect(getLoginFailure(networkError())).toEqual({ message: NETWORK_ERROR, credentials: false });
  });

  it('429: usa a mensagem do backend', () => {
    const message = 'Muitas tentativas. Tente novamente em alguns minutos.';
    expect(getLoginFailure(httpError(429, { error: message }))).toEqual({
      message,
      credentials: false,
    });
  });

  it('429 sem mensagem: usa a padrão', () => {
    expect(getLoginFailure(httpError(429)).message).toBe(TOO_MANY_ATTEMPTS_ERROR);
  });

  it('500 e erros inesperados: mensagem de servidor', () => {
    expect(getLoginFailure(httpError(500, { error: 'Internal server error' })).message).toBe(
      SERVER_ERROR,
    );
    expect(getLoginFailure(new Error('Token inválido')).message).toBe(SERVER_ERROR);
  });
});

describe('validateRegisterForm', () => {
  it('campos vazios: mensagens de obrigatório do backend', () => {
    expect(validateRegisterForm({ email: '', password: '', phone: ' ' })).toEqual({
      email: REQUIRED_EMAIL,
      password: REQUIRED_PASSWORD,
      phone: REQUIRED_PHONE,
    });
  });

  it('formato: e-mail sem domínio, senha curta e telefone curto', () => {
    expect(validateRegisterForm({ email: 'lucas@', password: '12345', phone: '119999' })).toEqual({
      email: INVALID_EMAIL,
      password: SHORT_PASSWORD,
      phone: INVALID_PHONE,
    });
  });

  it('dados válidos (com espaços em volta do e-mail) passam', () => {
    const errors = validateRegisterForm({
      email: ' lucas@email.com ',
      password: '123456',
      phone: '11999999999',
    });
    expect(hasFieldErrors(errors)).toBe(false);
  });
});

describe('getBackendFieldErrors', () => {
  it('pega a primeira mensagem de cada campo pedido e ignora o resto', () => {
    const error = httpError(400, {
      error: 'x',
      fields: { email: ['E-mail inválido', 'outra'], extra: ['ignorado'], phone: [] },
    });
    expect(getBackendFieldErrors(error, ['email', 'phone'] as const)).toEqual({
      email: 'E-mail inválido',
    });
  });

  it('sem `fields` ou fora do formato: vazio', () => {
    expect(getBackendFieldErrors(httpError(400, { error: 'x' }), ['email'] as const)).toEqual({});
    expect(getBackendFieldErrors(httpError(400, { fields: 'x' }), ['email'] as const)).toEqual({});
    expect(getBackendFieldErrors(new Error('x'), ['email'] as const)).toEqual({});
  });
});

describe('getRegisterFailure', () => {
  it('400 com `fields`: erro em cada campo', () => {
    const error = httpError(400, {
      error: 'E-mail inválido; A senha deve ter pelo menos 6 caracteres',
      fields: {
        email: ['E-mail inválido'],
        password: ['A senha deve ter pelo menos 6 caracteres'],
      },
    });
    expect(getRegisterFailure(error)).toEqual({
      fields: { email: 'E-mail inválido', password: 'A senha deve ter pelo menos 6 caracteres' },
    });
  });

  it('400 sem `fields`: mensagem geral do backend (ou a padrão)', () => {
    expect(getRegisterFailure(httpError(400, { error: 'Dados inválidos' }))).toEqual({
      fields: {},
      general: 'Dados inválidos',
    });
    expect(getRegisterFailure(httpError(400))).toEqual({
      fields: {},
      general: REGISTER_INVALID_ERROR,
    });
  });

  it('409: mostra no campo duplicado', () => {
    expect(getRegisterFailure(httpError(409, { error: 'Este e-mail já está cadastrado' }))).toEqual(
      {
        fields: { email: 'Este e-mail já está cadastrado' },
      },
    );
    expect(
      getRegisterFailure(httpError(409, { error: 'Este telefone já está cadastrado' })),
    ).toEqual({ fields: { phone: 'Este telefone já está cadastrado' } });
  });

  it('409 sem campo conhecido: mensagem geral', () => {
    expect(getRegisterFailure(httpError(409, { error: 'Usuário já cadastrado' }))).toEqual({
      fields: {},
      general: 'Usuário já cadastrado',
    });
  });

  it('sem rede, 429 e 500: mensagem geral', () => {
    expect(getRegisterFailure(networkError()).general).toBe(NETWORK_ERROR);
    expect(getRegisterFailure(httpError(429)).general).toBe(TOO_MANY_ATTEMPTS_ERROR);
    expect(getRegisterFailure(httpError(500)).general).toBe(SERVER_ERROR);
  });
});
