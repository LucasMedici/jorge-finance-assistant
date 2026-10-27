// Posição da imagem do Jorge dentro do círculo do avatar (função pura, testada em __tests__).
// A imagem inteira ocupa ~89% do diâmetro, um pouco à direita e para baixo do centro,
// para a mão acenando aparecer inteira (medidas do canvas: 64 -> 57/3/7, 132 -> 118/7/14).
const IMAGE_RATIO = 0.893;
const LEFT_RATIO = 0.053;
const TOP_RATIO = 0.106;

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
