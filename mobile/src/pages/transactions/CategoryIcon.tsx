// Ícone de cada categoria na lista de lançamentos (traço de 1,8, como no canvas).
// Decorativo: o item da lista já diz a categoria em texto.
import type { ReactNode } from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { themas } from '../../global/themes';

// Pontos cheios (com o traço de 1,8 um ponto ficaria pequeno demais)
const dots = (points: [number, number][]) =>
  points.map(([cx, cy]) => (
    <Circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={1.4} fill={themas.colors.white} stroke="none" />
  ));

const GLYPHS: Record<string, ReactNode> = {
  Mercado: (
    <>
      <Path d="M3 4h2l2.4 10.2a1 1 0 0 0 1 .8h8.9a1 1 0 0 0 1-.8L20 8H6" />
      <Circle cx={9} cy={19.5} r={1.5} />
      <Circle cx={17} cy={19.5} r={1.5} />
    </>
  ),
  Mercadinho: <Path d="M6 8h12l-1 12H7zM9 8a3 3 0 0 1 6 0" />,
  'Comer fora': <Path d="M7 3v8M5 3v4a2 2 0 0 0 4 0V3M7 11v10M17 3c-2 0-3 2-3 5s1 4 3 4v9" />,
  Transporte: <Path d="M5 16l1.5-5h11L19 16M4 16h16v3H4zM7 19v2M17 19v2" />,
  Saúde: <Path d="M12 5v14M5 12h14" />,
  Lazer: <Path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6l-5.4 2.9 1.2-6-4.5-4.2 6.1-.7z" />,
  'Bebida e rolê': <Path d="M7 3h10l-1 7a4 4 0 0 1-8 0zM12 14v7M8 21h8" />,
  'Família e amigos': (
    <Path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />
  ),
  Compras: (
    <>
      <Path d="M3 12V4h8l10 10-8 8z" />
      <Circle cx={7.5} cy={7.5} r={1.2} />
    </>
  ),
  'Cuidados pessoais': (
    <Path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6" />
  ),
  Apostas: (
    <>
      <Rect x={4} y={4} width={16} height={16} rx={3} />
      {dots([
        [9, 9],
        [15, 9],
        [9, 15],
        [15, 15],
      ])}
    </>
  ),
  Salário: (
    <>
      <Rect x={3} y={6} width={18} height={12} rx={2} />
      <Circle cx={12} cy={12} r={2.5} />
    </>
  ),
  Freela: (
    <>
      <Rect x={3} y={7} width={18} height={13} rx={2} />
      <Path d="M9 7V5h6v2M3 13h18" />
    </>
  ),
};

// "Outros" e qualquer categoria sem desenho
const FALLBACK = (
  <>
    {dots([
      [6, 12],
      [12, 12],
      [18, 12],
    ])}
  </>
);

export default function CategoryIcon({ category, size = 20 }: { category: string; size?: number }) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={themas.colors.white}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {GLYPHS[category] ?? FALLBACK}
    </Svg>
  );
}
