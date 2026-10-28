// Posição da imagem do Jorge dentro do círculo do avatar (função pura, testada em __tests__).
// A arte do avatar (assets/v2/jorge_avatar.png) é um busto com o corpo cortado reto embaixo: a imagem fica
// maior que o círculo (115%), um pouco para a esquerda, para o corte cair fora do círculo e a mão acenando
// e a antena aparecerem inteiras.
const IMAGE_RATIO = 1.15;
const LEFT_RATIO = -0.1;
const TOP_RATIO = 0.08;

export type AvatarImageLayout = {
  width: number;
  height: number;
  left: number;
  top: number;
};

export function getAvatarImageLayout(size: number): AvatarImageLayout {
  const imageSize = Math.round(size * IMAGE_RATIO);
  return {
    width: imageSize,
    height: imageSize,
    left: Math.round(size * LEFT_RATIO),
    top: Math.round(size * TOP_RATIO),
  };
}
