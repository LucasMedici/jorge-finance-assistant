import type { ComponentType } from 'react';
import { Pressable, StyleProp, StyleSheet, Text, ViewStyle } from 'react-native';
import { fonts } from '../global/fonts';
import { themas } from '../global/themes';
import type { IconProps } from './icons';

type TextButtonProps = {
  title: string;
  onPress: () => void;
  /** `neutral` (padrão): texto apagado. `destructive`: vermelho, para apagar/remover. */
  variant?: 'neutral' | 'destructive';
  /** Ícone opcional à esquerda (ex.: `TrashIcon`), na mesma cor do texto. */
  icon?: ComponentType<IconProps>;
  disabled?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

// Botão só de texto (44 de altura), para ações secundárias nas folhas brancas.
export default function TextButton({
  title,
  onPress,
  variant = 'neutral',
  icon: Icon,
  disabled = false,
  accessibilityLabel,
  style,
}: TextButtonProps) {
  const color = variant === 'destructive' ? themas.colors.error : themas.colors.textMuted;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.button,
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      {Icon && <Icon size={18} color={color} />}
      <Text style={[styles.title, { color }]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: themas.minTouchSize,
    paddingHorizontal: 12,
  },
  pressed: {
    opacity: 0.6,
  },
  disabled: {
    opacity: 0.5,
  },
  title: {
    fontFamily: fonts.medium,
    fontSize: 15,
    lineHeight: 20,
  },
});
