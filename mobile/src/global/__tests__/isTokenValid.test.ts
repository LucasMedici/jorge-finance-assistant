import AsyncStorage from '@react-native-async-storage/async-storage';
import { isTokenValid } from '../isTokenValid';
import { makeToken, nowInSeconds } from './makeToken';

describe('isTokenValid', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('aceita token com exp no futuro e mantém o token salvo', async () => {
    const token = makeToken({ sub: '1', phone: '5511999999999', exp: nowInSeconds() + 3600 });
    await AsyncStorage.setItem('userToken', token);

    await expect(isTokenValid(token)).resolves.toBe(true);
    expect(await AsyncStorage.getItem('userToken')).toBe(token);
  });

  it('aceita token sem exp', async () => {
    await expect(isTokenValid(makeToken({ sub: '1' }))).resolves.toBe(true);
  });

  it('rejeita token expirado e remove do AsyncStorage', async () => {
    const token = makeToken({ sub: '1', exp: nowInSeconds() - 60 });
    await AsyncStorage.setItem('userToken', token);

    await expect(isTokenValid(token)).resolves.toBe(false);
    expect(await AsyncStorage.getItem('userToken')).toBeNull();
  });

  it.each(['', 'nao-e-um-jwt', 'a.b.c', 'abc.%%%.def'])(
    'rejeita token malformado (%p) e remove do AsyncStorage',
    async (token) => {
      await AsyncStorage.setItem('userToken', 'qualquer');

      await expect(isTokenValid(token)).resolves.toBe(false);
      expect(await AsyncStorage.getItem('userToken')).toBeNull();
    }
  );
});
