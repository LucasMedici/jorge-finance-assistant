import { Pressable, StyleProp, StyleSheet, Text, ViewStyle } from 'react-native';
import { fonts } from '../global/fonts';
import { themas } from '../global/themes';
import { CheckIcon } from './icons';

type ChipProps = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  disabled?: boolean;
  /**
   * Papel para o leitor de tela: `radio` (padrão, escolha única dentro de um grupo
   * `accessibilityRole="radiogroup"`), `checkbox` (escolha múltipla) ou `button`.
   */
  role?: 'radio' | 'checkbox' | 'button';
  style?: StyleProp<ViewStyle>;
};

// Chip para folhas brancas. Selecionado: fundo verde, texto escuro e check (nunca texto verde sobre branco).
export default function Chip({
  label,
  selected = false,
  onPress,
  disabled = false,
  role = 'radio',
  style,
}: ChipProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={HIT_SLOP}
      accessibilityRole={role}
      accessibilityLabel={label}
      accessibilityState={
        role === 'button' ? { selected, disabled } : { checked: selected, disabled }
      }
      style={({ pressed }) => [
        styles.chip,
        selected ? styles.chipSelected : styles.chipDefault,
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      {selected && <CheckIcon size={14} color={themas.colors.textDark} />}
      <Text style={[styles.label, selected ? styles.labelSelected : styles.labelDefault]}>
        {label}
      </Text>
    </Pressable>
  );
}

const CHIP_HEIGHT = 40;
// Completa a altura de 40 até a área mínima de toque
const HIT_SLOP = (themas.minTouchSize - CHIP_HEIGHT) / 2;

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: CHIP_HEIGHT,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderRadius: CHIP_HEIGHT / 2,
  },
  chipDefault: {
    borderColor: themas.colors.chipBorder,
    backgroundColor: themas.colors.white,
  },
  chipSelected: {
    borderColor: themas.colors.secondary,
    backgroundColor: themas.colors.secondary,
  },
  pressed: {
    opacity: 0.8,
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    fontSize: 14,
    lineHeight: 20,
  },
  labelDefault: {
    fontFamily: fonts.medium,
    color: themas.colors.primary,
  },
  labelSelected: {
    fontFamily: fonts.semibold,
    color: themas.colors.textDark,
  },
});
