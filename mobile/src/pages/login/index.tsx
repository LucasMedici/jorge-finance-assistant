import React, { useContext, useRef, useState } from 'react';
import {
  BackHandler,
  Keyboard,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { style } from './styles';
import { api } from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import { JorgeAvatar, PrimaryButton } from '../../components';
import FormField from './FormField';
import {
  getLoginFailure,
  hasFieldErrors,
  validateLoginForm,
  type FieldErrors,
  type LoginFailure,
  type LoginField,
} from './formErrors';
import type { RootStackScreenProps } from '../../routes/types';

export default function LoginPage({ navigation }: RootStackScreenProps<'Login'>) {
  // O App só protege o topo: a folha branca vai até a borda e empurra o conteúdo acima da barra do Android
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<LoginField>>({});
  const [failure, setFailure] = useState<LoginFailure | null>(null);
  const [loading, setLoading] = useState(false);
  const passwordRef = useRef<TextInput>(null);
  const { signIn } = useContext(AuthContext)!;

  // Handler para o botão de voltar do celular - fecha o app
  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        BackHandler.exitApp();
        return true;
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);

      return () => subscription.remove();
    }, []),
  );

  // Ao digitar de novo, o erro daquele campo (e o de credenciais) some
  const handleChange = (field: LoginField, value: string) => {
    if (field === 'email') setEmail(value);
    else setPassword(value);
    setFieldErrors((errors) => ({ ...errors, [field]: undefined }));
    setFailure(null);
  };

  const handleLogin = async () => {
    if (loading) return;

    const errors = validateLoginForm({ email, password });
    setFieldErrors(errors);
    setFailure(null);
    if (hasFieldErrors(errors)) return;

    Keyboard.dismiss();
    setLoading(true);
    try {
      const response = await api.post('/auth/login', { email: email.trim(), password });

      if (response.status === 200) {
        // Salva o token e carrega o user; o stack troca para o MainApp sozinho
        await signIn(response.data.token);
      }
    } catch (error) {
      setFailure(getLoginFailure(error));
    } finally {
      setLoading(false);
    }
  };

  // Credencial errada e falhas de rede aparecem no mesmo lugar: abaixo da senha
  const passwordError = fieldErrors.password ?? failure?.message;
  const highlightPassword = Boolean(fieldErrors.password) || Boolean(failure?.credentials);

  return (
    <KeyboardAvoidingView style={style.container} behavior="padding">
      <ScrollView
        style={style.container}
        contentContainerStyle={style.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        bounces={false}
        overScrollMode="never"
      >
        <View style={style.hero}>
          <JorgeAvatar size={132} accessibilityLabel="Jorge acenando" />
          <View style={style.heroText}>
            <Text style={style.title} accessibilityRole="header">
              Bem-vindo de volta
            </Text>
            <Text style={style.subtitle}>Entre para ver seus gastos.</Text>
          </View>
        </View>

        <View style={[style.sheet, { paddingBottom: 32 + insets.bottom }]}>
          <FormField
            label="E-mail"
            value={email}
            onChangeText={(value) => handleChange('email', value)}
            placeholder="voce@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="next"
            submitBehavior="submit"
            onSubmitEditing={() => passwordRef.current?.focus()}
            editable={!loading}
            error={fieldErrors.email}
          />

          <FormField
            inputRef={passwordRef}
            label="Senha"
            password
            value={password}
            onChangeText={(value) => handleChange('password', value)}
            placeholder="Sua senha"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="current-password"
            textContentType="password"
            returnKeyType="go"
            onSubmitEditing={handleLogin}
            editable={!loading}
            error={passwordError}
            highlightError={highlightPassword}
          />

          <PrimaryButton
            title="Entrar"
            onPress={handleLogin}
            loading={loading}
            style={style.submit}
          />

          <View style={style.footer}>
            <Text style={style.footerText}>Ainda não tem conta?</Text>
            <Pressable
              onPress={() => navigation.navigate('Register')}
              accessibilityRole="link"
              hitSlop={12}
              disabled={loading}
            >
              <Text style={style.footerLink}>Criar conta</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
