import { useContext, useEffect, useState, type ReactNode } from 'react';
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { themas } from '../global/themes';

type SheetProps = {
  visible: boolean;
  /** Chamado ao tocar fora da folha ou no botão voltar do Android. */
  onClose: () => void;
  children: ReactNode;
  /** Estilo do conteúdo (coluna com `gap` 18 por padrão, igual ao canvas). */
  contentStyle?: StyleProp<ViewStyle>;
  /** Rótulo do fundo escurecido para o leitor de tela. */
  closeAccessibilityLabel?: string;
};

const ANIMATION_MS = 220;
// Deslocamento inicial da folha; ela começa fora da tela e sobe até o lugar
const HIDDEN_OFFSET = 800;

// Folha branca que sobe do rodapé, com fundo escurecido. Fecha tocando fora ou com o voltar do Android.
export default function Sheet({
  visible,
  onClose,
  children,
  contentStyle,
  closeAccessibilityLabel = 'Fechar',
}: SheetProps) {
  // Mantém o Modal montado enquanto a animação de saída roda
  const [mounted, setMounted] = useState(visible);
  const [progress] = useState(() => new Animated.Value(visible ? 1 : 0));
  // Sem SafeAreaProvider acima, segue sem a margem extra
  const bottomInset = useContext(SafeAreaInsetsContext)?.bottom ?? 0;

  // Abrir monta na hora (ajuste de estado durante o render); fechar desmonta ao fim da animação
  if (visible && !mounted) setMounted(true);

  useEffect(() => {
    const animation = Animated.timing(progress, {
      toValue: visible ? 1 : 0,
      duration: ANIMATION_MS,
      easing: visible ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start(({ finished }) => {
      if (finished && !visible) setMounted(false);
    });

    return () => animation.stop();
  }, [visible, progress]);

  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [HIDDEN_OFFSET, 0] });

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
    >
      <Animated.View style={[styles.backdrop, { opacity: progress }]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={closeAccessibilityLabel}
        />
      </Animated.View>

      <KeyboardAvoidingView
        style={styles.keyboardArea}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        pointerEvents="box-none"
      >
        <Animated.View
          style={[
            styles.sheet,
            { paddingBottom: SHEET_PADDING_BOTTOM + bottomInset, transform: [{ translateY }] },
          ]}
          accessibilityViewIsModal
        >
          <View style={[styles.content, contentStyle]}>
            <View style={styles.handle} />
            {children}
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const SHEET_PADDING_BOTTOM = 28;

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: themas.colors.overlay,
  },
  keyboardArea: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '92%',
    paddingTop: 12,
    paddingHorizontal: 24,
    borderTopLeftRadius: themas.radius.sheet,
    borderTopRightRadius: themas.radius.sheet,
    backgroundColor: themas.colors.white,
  },
  content: {
    gap: 18,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: themas.colors.secondary,
  },
});
