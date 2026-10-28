// Ícones só do chat (mesmo traço dos ícones base em src/components/icons.tsx). Decorativos.
import type { ReactNode } from 'react';
import Svg, { Circle, Path } from 'react-native-svg';
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

export function ArrowDownIcon({ strokeWidth = 2.2, ...props }: IconProps) {
  return (
    <StrokeIcon strokeWidth={strokeWidth} {...props}>
      <Path d="M12 5v14M5 12l7 7 7-7" />
    </StrokeIcon>
  );
}

// Carrinho do canvas (categoria Mercado)
export function CartIcon({ strokeWidth = 2.2, ...props }: IconProps) {
  return (
    <StrokeIcon strokeWidth={strokeWidth} {...props}>
      <Path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6" />
    </StrokeIcon>
  );
}

// Etiqueta: demais categorias
export function TagIcon({ strokeWidth = 2.2, ...props }: IconProps) {
  return (
    <StrokeIcon strokeWidth={strokeWidth} {...props}>
      <Path d="M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z" />
      <Circle cx={7.5} cy={7.5} r={1.2} />
    </StrokeIcon>
  );
}

// Microfone do campo de mensagem (entrada por voz)
export function MicIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <Path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3z" />
      <Path d="M19 11a7 7 0 0 1-14 0M12 18v3" />
    </StrokeIcon>
  );
}

const CART_CATEGORIES = new Set(['mercado', 'mercadinho', 'compras']);

/** Ícone do chip de categoria no cartão Confirmar. */
export function CategoryIcon({ category, ...props }: IconProps & { category: string }) {
  return CART_CATEGORIES.has(category.trim().toLowerCase()) ? (
    <CartIcon {...props} />
  ) : (
    <TagIcon {...props} />
  );
}
