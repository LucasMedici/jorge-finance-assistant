import { useEffect, useState } from 'react';
import { Animated, Easing, Pressable, StyleProp, StyleSheet, ViewStyle } from 'react-native';
import { themas } from '../global/themes';

type SwitchProps = {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  /** Texto lido pelo leitor de tela (normalmente o mesmo rótulo mostrado ao lado). */
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

const TRACK_WIDTH = 52;
const TRACK_HEIGHT = 32;
const THUMB_SIZE = 24;
const THUMB_GAP = 4;
const THUMB_TRAVEL = TRACK_WIDTH - THUMB_SIZE - THUMB_GAP * 2;

// Switch do v2 (52x32): ligado = trilho verde; desligado = trilho cinza. Bolinha branca.
export default function Switch({
  value,
  onValueChange,
  disabled = false,
  accessibilityLabel,
  style,
}: SwitchProps) {
  const [position] = useState(() => new Animated.Value(value ? 1 : 0));

  useEffect(() => {
    const animation = Animated.timing(position, {
      toValue: value ? 1 : 0,
      duration: 150,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [value, position]);

  const translateX = position.interpolate({ inputRange: [0, 1], outputRange: [0, THUMB_TRAVEL] });

  return (
    <Pressable
      onPress={() => onValueChange(!value)}
      disabled={disabled}
      hitSlop={HIT_SLOP}
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: value, disabled }}
      style={[
        styles.track,
        value ? styles.trackOn : styles.trackOff,
        disabled && styles.disabled,
        style,
      ]}
    >
      <Animated.View style={[styles.thumb, { transform: [{ translateX }] }]} />
    </Pressable>
  );
}

// Completa a altura de 32 até a área mínima de toque
const HIT_SLOP = { top: 6, bottom: 6, left: 4, right: 4 };

const styles = StyleSheet.create({
  track: {
    width: TRACK_WIDTH,
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    padding: THUMB_GAP,
  },
  trackOn: {
    backgroundColor: themas.colors.secondary,
  },
  trackOff: {
    backgroundColor: themas.colors.controlOff,
  },
  disabled: {
    opacity: 0.5,
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: themas.colors.white,
  },
});
