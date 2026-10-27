// Ícones das telas de relatórios (mesmos traços do canvas), desenhados com react-native-svg.
// Decorativos: o botão/linha que usa dá o rótulo de acessibilidade.
import type { ReactNode } from 'react';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import type { IconProps } from '../../components';
import { themas } from '../../global/themes';

function StrokeIcon({
  size = 20,
  color = themas.colors.white,
  strokeWidth = 2,
  children,
}: IconProps & { children: ReactNode }) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {children}
    </Svg>
  );
}

// Seta de voltar do cabeçalho (Detalhe e Lançamentos)
export function ArrowLeftIcon(props: IconProps) {
  return (
    <StrokeIcon size={22} {...props}>
      <Path d="M19 12H5M12 19l-7-7 7-7" />
    </StrokeIcon>
  );
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <StrokeIcon size={16} {...props}>
      <Path d="M6 9l6 6 6-6" />
    </StrokeIcon>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <Circle cx={11} cy={11} r={7} />
      <Path d="M20 20l-3.5-3.5" />
    </StrokeIcon>
  );
}

/** Amostra de linha da legenda dos gráficos (cheia, tracejada ou pontilhada). */
export function LegendLine({
  color,
  variant,
}: {
  color: string;
  variant: 'solid' | 'dashed' | 'dotted';
}) {
  const dash = variant === 'dashed' ? '4 3' : variant === 'dotted' ? '0.1 5' : undefined;
  return (
    <Svg
      width={16}
      height={4}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Line
        x1={variant === 'dotted' ? 1.5 : 0}
        x2={16}
        y1={2}
        y2={2}
        stroke={color}
        strokeWidth={variant === 'solid' ? 3 : variant === 'dotted' ? 3 : 2}
        strokeDasharray={dash}
        strokeLinecap={variant === 'dashed' ? 'butt' : 'round'}
      />
    </Svg>
  );
}
