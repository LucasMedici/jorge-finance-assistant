import { AxiosError, AxiosHeaders } from 'axios';
import { formatGoalInput, getGoalErrorMessage, parseGoalInput } from '../monthlyGoal';

const axiosError = (status?: number, data?: unknown) => {
  const config = { headers: new AxiosHeaders() };
  return new AxiosError(
    'Request failed',
    status ? 'ERR_BAD_REQUEST' : 'ERR_NETWORK',
    config,
    undefined,
    status ? { status, statusText: '', headers: {}, config, data } : undefined,
  );
};

describe('parseGoalInput', () => {
  it.each([
    ['1500', 1500],
    ['1.500', 1500],
    ['1.500,50', 1500.5],
    ['1.500,5', 1500.5],
    ['1500,50', 1500.5],
    ['1500,', 1500],
    ['1500.50', 1500.5],
    ['12.5', 12.5],
    ['1.234.567,89', 1234567.89],
    [' 2.000 ', 2000],
    ['0,50', 0.5],
  ])('"%s" → %d', (text, value) => {
    expect(parseGoalInput(text)).toEqual({ ok: true, value });
  });

  it('vazio pede o valor', () => {
    expect(parseGoalInput('')).toEqual({ ok: false, error: 'Digite o valor da meta.' });
  });

  it.each(['abc', '1,500,00', '1.50.0', '15.00.0', '1.500,505', '1500.505', ',50', '1.5000'])(
    '"%s" é inválido',
    (text) => {
      expect(parseGoalInput(text)).toEqual({
        ok: false,
        error: 'Digite um valor válido, como 1.500 ou 1.500,50.',
      });
    },
  );

  it('zero não é meta', () => {
    expect(parseGoalInput('0')).toEqual({ ok: false, error: 'A meta precisa ser maior que zero.' });
    expect(parseGoalInput('0,00')).toMatchObject({ ok: false });
  });

  it('acima do limite do banco', () => {
    expect(parseGoalInput('10000000000')).toEqual({
      ok: false,
      error: 'Esse valor é alto demais para uma meta.',
    });
    expect(parseGoalInput('9.999.999.999,99')).toEqual({ ok: true, value: 9999999999.99 });
  });
});

describe('formatGoalInput', () => {
  it('sem centavos quando inteiro, com vírgula quando tem', () => {
    expect(formatGoalInput(1500)).toBe('1.500');
    expect(formatGoalInput(1500.5)).toBe('1.500,50');
    expect(formatGoalInput(80)).toBe('80');
  });

  it('volta ao mesmo valor no parse', () => {
    for (const value of [1, 999.99, 1500, 1500.5, 1234567.89]) {
      expect(parseGoalInput(formatGoalInput(value))).toEqual({ ok: true, value });
    }
  });
});

describe('getGoalErrorMessage', () => {
  it('usa a mensagem do campo no 400', () => {
    const error = axiosError(400, {
      error: 'Dados inválidos',
      fields: { monthlyGoal: ['A meta mensal deve ser maior que zero'] },
    });
    expect(getGoalErrorMessage(error)).toBe('A meta mensal deve ser maior que zero');
  });

  it('sem campo, usa o `error` do 400', () => {
    expect(getGoalErrorMessage(axiosError(400, { error: 'Informe o nome ou a meta mensal' }))).toBe(
      'Informe o nome ou a meta mensal',
    );
  });

  it('sem resposta: aviso de conexão', () => {
    expect(getGoalErrorMessage(axiosError())).toBe('Sem conexão com o servidor. Tente de novo.');
  });

  it('outros erros: mensagem padrão ou a informada', () => {
    expect(getGoalErrorMessage(axiosError(500, { error: 'Internal' }))).toBe(
      'Não foi possível salvar a meta. Tente de novo.',
    );
    expect(getGoalErrorMessage(new Error('boom'), 'Falhou')).toBe('Falhou');
  });
});
