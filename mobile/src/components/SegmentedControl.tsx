import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { fonts } from '../global/fonts';
import { themas } from '../global/themes';

export type SegmentedOption<T extends string> = {
  value: T;
  label: string;
};

type SegmentedControlProps<T extends string> = {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** `light` (padrão): sobre folha branca (Gasto/Receita). `dark`: sobre o roxo (período dos relatórios). */
  tone?: 'light' | 'dark';
  /** Nome do grupo lido pelo leitor de tela (ex.: "Tipo", "Período"). */
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

// Seletor segmentado: trilho claro (ou escuro sobre o roxo) e opção selecionada em verde com texto escuro.
export default function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  tone = 'light',
  accessibilityLabel,
  style,
}: SegmentedControlProps<T>) {
  const dark = tone === 'dark';

  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
      style={[styles.track, dark ? styles.trackDark : styles.trackLight, style]}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => {
              if (!selected) onChange(option.value);
            }}
            hitSlop={TRACK_PADDING}
            accessibilityRole="radio"
            accessibilityLabel={option.label}
            accessibilityState={{ checked: selected }}
            style={[
              styles.segment,
              dark ? styles.segmentDark : styles.segmentLight,
              selected && styles.segmentSelected,
            ]}
          >
            <Text
              numberOfLines={1}
              style={[
                styles.label,
                selected ? styles.labelSelected : dark ? styles.labelDark : styles.labelLight,
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const TRACK_PADDING = 4;

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    gap: 4,
    padding: TRACK_PADDING,
    borderRadius: themas.radius.lg,
  },
  trackLight: {
    backgroundColor: themas.colors.fillLight,
  },
  trackDark: {
    backgroundColor: 'rgba(0, 0, 0, 0.18)',
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: themas.radius.sm,
  },
  segmentLight: {
    height: 40,
  },
  segmentDark: {
    height: 36,
  },
  segmentSelected: {
    backgroundColor: themas.colors.secondary,
  },
  label: {
    fontSize: 14,
    lineHeight: 20,
  },
  labelLight: {
    fontFamily: fonts.medium,
    color: themas.colors.primary,
  },
  labelDark: {
    fontFamily: fonts.medium,
    color: 'rgba(255, 255, 255, 0.75)',
  },
  labelSelected: {
    fontFamily: fonts.semibold,
    color: themas.colors.textDark,
  },
});
