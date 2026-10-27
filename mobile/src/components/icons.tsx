// Ícones simples do redesign v2 (mesmos traços do canvas), desenhados com react-native-svg.
// São decorativos: quem usa dá o texto/rótulo de acessibilidade ao botão ou à linha.
import type { ReactNode } from 'react';
import Svg, { Path, Rect } from 'react-native-svg';
import { themas } from '../global/themes';

export type IconProps = {
  size?: number;
  color?: string;
  strokeWidth?: number;
};

type StrokeIconProps = IconProps & { children: ReactNode };

function StrokeIcon({
  size = 20,
  color = themas.colors.primary,
  strokeWidth = 2,
  children,
}: StrokeIconProps) {
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

export function CheckIcon({ strokeWidth = 3, ...props }: IconProps) {
  return (
    <StrokeIcon strokeWidth={strokeWidth} {...props}>
      <Path d="M5 12.5l4.5 4.5L19 7" />
    </StrokeIcon>
  );
}

export function ChevronLeftIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <Path d="M15 18l-6-6 6-6" />
    </StrokeIcon>
  );
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <Path d="M9 18l6-6-6-6" />
    </StrokeIcon>
  );
}

export function CalendarIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <Rect x={3.5} y={5} width={17} height={15} rx={2.5} />
      <Path d="M3.5 10h17M8 3v4M16 3v4" />
    </StrokeIcon>
  );
}

export function TrashIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <Path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
    </StrokeIcon>
  );
}

// Triângulo de alerta (usado com o âmbar: o aviso nunca depende só da cor)
export function AlertIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <Path d="M12 3l9.5 17h-19z" />
      <Path d="M12 10v4M12 17.5h.01" />
    </StrokeIcon>
  );
}

export function ArrowUpIcon({ strokeWidth = 2.2, ...props }: IconProps) {
  return (
    <StrokeIcon strokeWidth={strokeWidth} {...props}>
      <Path d="M12 19V5M5 12l7-7 7 7" />
    </StrokeIcon>
  );
}

// Ícones preenchidos da barra de abas
export function ChatIcon({ size = 22, color = themas.colors.secondary }: IconProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={color}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
    </Svg>
  );
}

export function ChartIcon({ size = 22, color = themas.colors.secondary }: IconProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={color}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Path d="M5 9.2h3V19H5zM10.6 5h2.8v14h-2.8zm5.6 8H19v6h-2.8z" />
    </Svg>
  );
}
