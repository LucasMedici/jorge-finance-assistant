import { Image, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import jorgeAcenando from '../assets/jorge_acenando.png';
import { themas } from '../global/themes';
import { getAvatarImageLayout } from './jorgeAvatarLayout';

type JorgeAvatarProps = {
  /** Diâmetro do círculo. Usos no v2: 64 (chat) e 132 (login). */
  size?: number;
  style?: StyleProp<ViewStyle>;
  /** Rótulo lido pelo leitor de tela; `null` esconde o avatar (quando é só decorativo). */
  accessibilityLabel?: string | null;
};

// Jorge acenando, inteiro, dentro de um círculo roxo. Estático (sem animação).
export default function JorgeAvatar({
  size = 64,
  style,
  accessibilityLabel = 'Jorge',
}: JorgeAvatarProps) {
  const decorative = accessibilityLabel === null;

  return (
    <View
      style={[styles.circle, { width: size, height: size, borderRadius: size / 2 }, style]}
      accessible={!decorative}
      accessibilityRole={decorative ? undefined : 'image'}
      accessibilityLabel={accessibilityLabel ?? undefined}
      accessibilityElementsHidden={decorative}
      importantForAccessibility={decorative ? 'no-hide-descendants' : 'auto'}
    >
      <Image
        source={jorgeAcenando}
        resizeMode="contain"
        fadeDuration={0}
        style={[styles.image, getAvatarImageLayout(size)]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: themas.colors.surface,
  },
  image: {
    position: 'absolute',
  },
});
