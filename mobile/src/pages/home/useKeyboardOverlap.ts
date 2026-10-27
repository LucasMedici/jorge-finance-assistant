import { useEffect, useState, type RefObject } from 'react';
import { Keyboard, Platform, type KeyboardEvent, type View } from 'react-native';

/**
 * Quanto o teclado cobre de uma área cujo rodapé está em `containerBottom` (coordenadas da janela).
 * Arredonda para cima para não sobrar 1px escondido.
 */
export function getKeyboardOverlap(containerBottom: number, keyboardTop: number): number {
  if (!Number.isFinite(containerBottom) || !Number.isFinite(keyboardTop)) return 0;
  return Math.max(0, Math.ceil(containerBottom - keyboardTop));
}

/**
 * Espaço a reservar embaixo da tela para o campo ficar acima do teclado.
 *
 * Substitui o `KeyboardAvoidingView` no chat: com edge-to-edge no Android a janela não encolhe, a tela fica
 * acima da TabBar (que o teclado cobre) e o KAV, que mede só o layout relativo, erra a conta e ainda deixa um
 * espaço do tamanho da barra de navegação depois de fechar o teclado. Aqui a conta é feita com a posição
 * real da tela na janela (`measureInWindow`) contra o topo do teclado, e fechar o teclado sempre zera.
 */
export function useKeyboardOverlap(containerRef: RefObject<View | null>): number {
  const [overlap, setOverlap] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onShow = (event: KeyboardEvent) => {
      const keyboardTop = event.endCoordinates.screenY;
      const container = containerRef.current;
      if (!container) return;
      container.measureInWindow((_x, y, _width, height) => {
        setOverlap(getKeyboardOverlap(y + height, keyboardTop));
      });
    };

    const subscriptions = [
      Keyboard.addListener(showEvent, onShow),
      Keyboard.addListener(hideEvent, () => setOverlap(0)),
    ];
    if (Platform.OS === 'ios') {
      subscriptions.push(Keyboard.addListener('keyboardWillChangeFrame', onShow));
    }

    return () => subscriptions.forEach((subscription) => subscription.remove());
  }, [containerRef]);

  return overlap;
}
