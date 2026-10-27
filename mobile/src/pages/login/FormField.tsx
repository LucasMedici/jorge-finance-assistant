// Campo de formulário das folhas brancas do v2 (Login, Cadastro e Perfil), medidas do canvas
// (Login-v2-D-Folha / Login-v2-D-Erro): rótulo 14, campo de 54 com preenchimento fillLight,
// borda roxa no foco e vermelha com a mensagem de erro logo abaixo.
// Ainda não existe nos componentes base; fica aqui até ser promovido para src/components.
import { useState, type Ref } from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { fonts } from '../../global/fonts';
import { themas } from '../../global/themes';
import { AlertCircleIcon, EyeIcon, EyeOffIcon } from './icons';

type FormFieldProps = Omit<TextInputProps, 'style' | 'secureTextEntry'> & {
  label: string;
  /** Mensagem mostrada abaixo do campo (com ícone, em vermelho). */
  error?: string;
  /** Se o erro também marca o campo em vermelho (padrão). `false` só mostra a mensagem. */
  highlightError?: boolean;
  /** Campo de senha: esconde o texto e mostra o botão de olho para revelar. */
  password?: boolean;
  inputRef?: Ref<TextInput>;
  style?: StyleProp<ViewStyle>;
};

export default function FormField({
  label,
  error,
  highlightError = true,
  password = false,
  inputRef,
  style,
  onFocus,
  onBlur,
  editable = true,
  ...inputProps
}: FormFieldProps) {
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const invalid = Boolean(error) && highlightError;

  return (
    <View style={[styles.group, style]}>
      <Text style={styles.label}>{label}</Text>
      <View
        style={[
          styles.box,
          password && styles.boxWithAction,
          focused && styles.boxFocused,
          invalid && styles.boxInvalid,
          !editable && styles.boxDisabled,
        ]}
      >
        <TextInput
          ref={inputRef}
          {...inputProps}
          editable={editable}
          secureTextEntry={password && !revealed}
          accessibilityLabel={label}
          accessibilityHint={error}
          aria-invalid={invalid}
          placeholderTextColor={themas.colors.controlOff}
          selectionColor={themas.colors.primary}
          cursorColor={themas.colors.primary}
          style={styles.input}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
        />
        {password && (
          <Pressable
            onPress={() => setRevealed((value) => !value)}
            accessibilityRole="button"
            accessibilityLabel={revealed ? 'Esconder senha' : 'Mostrar senha'}
            style={({ pressed }) => [styles.eyeButton, pressed && styles.pressed]}
          >
            {revealed ? (
              <EyeOffIcon size={22} color={themas.colors.textMuted} />
            ) : (
              <EyeIcon size={22} color={themas.colors.textMuted} />
            )}
          </Pressable>
        )}
      </View>
      {error ? <FieldMessage message={error} /> : null}
    </View>
  );
}

/** Mensagem de erro com ícone (também usada solta, para erros que não são de um campo). */
export function FieldMessage({
  message,
  style,
}: {
  message: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      style={[styles.message, style]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <View style={styles.messageIcon}>
        <AlertCircleIcon size={18} color={themas.colors.error} />
      </View>
      <Text style={styles.messageText}>{message}</Text>
    </View>
  );
}

// Fundo do campo com erro: o vermelho do tema bem claro (~7%) sobre o branco da folha (#FDF1F1 no canvas)
const ERROR_FILL = `${themas.colors.error}12`;

const styles = StyleSheet.create({
  group: {
    gap: 6,
  },
  label: {
    fontFamily: fonts.medium,
    fontSize: 14,
    lineHeight: 20,
    color: themas.colors.textDark,
  },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 54,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    borderRadius: themas.radius.lg,
    backgroundColor: themas.colors.fillLight,
  },
  boxWithAction: {
    paddingRight: 4,
  },
  boxFocused: {
    borderColor: themas.colors.primary,
  },
  boxInvalid: {
    borderColor: themas.colors.error,
    backgroundColor: ERROR_FILL,
  },
  boxDisabled: {
    opacity: 0.6,
  },
  input: {
    flex: 1,
    minWidth: 0,
    height: '100%',
    paddingVertical: 0,
    paddingHorizontal: 0,
    fontFamily: fonts.regular,
    fontSize: 16,
    color: themas.colors.textDark,
  },
  eyeButton: {
    width: themas.minTouchSize,
    height: themas.minTouchSize,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
  message: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  messageIcon: {
    marginTop: 1,
  },
  messageText: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: themas.colors.error,
  },
});
