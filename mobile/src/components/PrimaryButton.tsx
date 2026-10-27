import type { ComponentType } from 'react';
import { ActivityIndicator, Pressable, StyleProp, StyleSheet, Text, ViewStyle } from 'react-native';
import { fonts } from '../global/fonts';
import { themas } from '../global/themes';
import type { IconProps } from './icons';

type PrimaryButtonProps = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  /** Mostra um indicador no lugar do texto e bloqueia o toque. */
  loading?: boolean;
  /** Ícone opcional à esquerda do texto (ex.: `CheckIcon`), desenhado em branco. */
  icon?: ComponentType<IconProps>;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

// Botão principal: roxo, 56 de altura, texto branco. Também nas folhas brancas.
export default function PrimaryButton({
  title,
  onPress,
  disabled = false,
  loading = false,
  icon: Icon,
  accessibilityLabel,
  style,
}: PrimaryButtonProps) {
  const inactive = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: inactive, busy: loading }}
      style={({ pressed }) => [
        styles.button,
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={themas.colors.white} />
      ) : (
        <>
          {Icon && <Icon size={20} color={themas.colors.white} strokeWidth={2.4} />}
          <Text style={styles.title}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 56,
    paddingHorizontal: 20,
    borderRadius: themas.radius.lg,
    backgroundColor: themas.colors.primary,
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.5,
  },
  title: {
    fontFamily: fonts.semibold,
    fontSize: 17,
    lineHeight: 22,
    color: themas.colors.white,
  },
});
