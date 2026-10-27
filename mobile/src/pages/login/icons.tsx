// Ícones que ainda não existem em src/components/icons.tsx (mesmos traços do canvas).
// Usados pelo Login, Cadastro e Perfil; candidatos a ir para os componentes base.
import type { ReactNode } from 'react';
import Svg, { Circle, Path } from 'react-native-svg';
import type { IconProps } from '../../components';
import { themas } from '../../global/themes';

function StrokeIcon({
  size = 22,
  color = themas.colors.textMuted,
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

export function EyeIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <Path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
      <Circle cx={12} cy={12} r={3} />
    </StrokeIcon>
  );
}

// Olho riscado: senha visível (tocar esconde)
export function EyeOffIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <Path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
      <Circle cx={12} cy={12} r={3} />
      <Path d="M4 4l16 16" />
    </StrokeIcon>
  );
}

// Círculo com exclamação (erro de campo)
export function AlertCircleIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <Circle cx={12} cy={12} r={9} />
      <Path d="M12 7.5v5.5M12 16.5h.01" />
    </StrokeIcon>
  );
}

export function ArrowLeftIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <Path d="M19 12H5M12 19l-7-7 7-7" />
    </StrokeIcon>
  );
}
