import { getAvatarImageLayout } from '../jorgeAvatarLayout';

describe('getAvatarImageLayout', () => {
  it('64 (chat) bate com o canvas', () => {
    expect(getAvatarImageLayout(64)).toEqual({ width: 57, height: 57, left: 3, top: 7 });
  });

  it('132 (login) bate com o canvas', () => {
    expect(getAvatarImageLayout(132)).toEqual({ width: 118, height: 118, left: 7, top: 14 });
  });

  it('a imagem fica dentro do círculo pela esquerda e por cima', () => {
    for (const size of [40, 64, 96, 132, 200]) {
      const { width, left, top } = getAvatarImageLayout(size);
      expect(width).toBeLessThan(size);
      expect(left).toBeGreaterThan(0);
      expect(top).toBeGreaterThan(left);
    }
  });
});
