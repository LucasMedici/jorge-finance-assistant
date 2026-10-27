import React, { useRef, useState } from 'react';
import {
  Alert,
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
import { style } from './styles';
import { api } from '../../services/api';
import { JorgeAvatar, PrimaryButton } from '../../components';
import FormField, { FieldMessage } from '../login/FormField';
import {
  getRegisterFailure,
  hasFieldErrors,
  validateRegisterForm,
  type FieldErrors,
  type RegisterField,
} from '../login/formErrors';
import type { RootStackScreenProps } from '../../routes/types';

export default function RegisterPage({ navigation }: RootStackScreenProps<'Register'>) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [number, setNumber] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<RegisterField>>({});
  const [generalError, setGeneralError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const passwordRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);

  // Handler para o botão de voltar do celular - volta para o Login
  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        navigation.navigate('Login');
        return true;
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);

      return () => subscription.remove();
    }, [navigation]),
  );

  const setters: Record<RegisterField, (value: string) => void> = {
    email: setEmail,
    password: setPassword,
    phone: setNumber,
  };

  // Ao digitar de novo, o erro daquele campo some
  const handleChange = (field: RegisterField, value: string) => {
    setters[field](value);
    setFieldErrors((errors) => ({ ...errors, [field]: undefined }));
    setGeneralError(undefined);
  };

  const handleRegister = async () => {
    if (loading) return;

    const errors = validateRegisterForm({ email, password, phone: number });
    setFieldErrors(errors);
    setGeneralError(undefined);
    if (hasFieldErrors(errors)) return;

    Keyboard.dismiss();
    setLoading(true);
    try {
      const response = await api.post('/auth/signup', {
        email: email.trim(),
        password,
        phone: number.trim(),
      });

      if (response.status === 201) {
        Alert.alert('Conta criada', 'Agora é só entrar com seu e-mail e senha.');
        navigation.navigate('Login');
      }
    } catch (error) {
      const failure = getRegisterFailure(error);
      setFieldErrors(failure.fields);
      setGeneralError(failure.general);
    } finally {
      setLoading(false);
    }
  };

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
              Criar sua conta
            </Text>
            <Text style={style.subtitle}>Comece a anotar seus gastos com o Jorge.</Text>
          </View>
        </View>

        <View style={style.sheet}>
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
            placeholder="Pelo menos 6 caracteres"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="next"
            submitBehavior="submit"
            onSubmitEditing={() => phoneRef.current?.focus()}
            editable={!loading}
            error={fieldErrors.password}
          />

          <FormField
            inputRef={phoneRef}
            label="Telefone"
            value={number}
            onChangeText={(value) => handleChange('phone', value)}
            placeholder="Só números, com DDD"
            keyboardType="number-pad"
            autoComplete="tel"
            textContentType="telephoneNumber"
            returnKeyType="done"
            onSubmitEditing={handleRegister}
            editable={!loading}
            error={fieldErrors.phone}
          />

          {generalError ? <FieldMessage message={generalError} /> : null}

          <PrimaryButton
            title="Criar conta"
            onPress={handleRegister}
            loading={loading}
            style={style.submit}
          />

          <View style={style.footer}>
            <Text style={style.footerText}>Já tem uma conta?</Text>
            <Pressable
              onPress={() => navigation.navigate('Login')}
              accessibilityRole="link"
              hitSlop={12}
              disabled={loading}
            >
              <Text style={style.footerLink}>Entrar</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
