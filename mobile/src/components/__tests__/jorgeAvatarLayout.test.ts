import { getAvatarImageLayout } from '../jorgeAvatarLayout';

describe('getAvatarImageLayout', () => {
  it('64 (chat e perfil)', () => {
    expect(getAvatarImageLayout(64)).toEqual({ width: 74, height: 74, left: -6, top: 5 });
  });

  it('132 (login)', () => {
    expect(getAvatarImageLayout(132)).toEqual({ width: 152, height: 152, left: -13, top: 11 });
  });

  it('a imagem passa da borda de baixo do círculo (o corte reto do corpo fica escondido)', () => {
    for (const size of [40, 64, 96, 132, 200]) {
      const { height, left, top } = getAvatarImageLayout(size);
      expect(top + height).toBeGreaterThan(size);
      expect(left).toBeLessThan(0);
      expect(top).toBeGreaterThan(0);
    }
  });
});
