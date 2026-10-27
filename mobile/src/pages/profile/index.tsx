import React, { useCallback, useContext, useEffect, useState } from 'react';
import {
  Alert,
  BackHandler,
  Keyboard,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { style } from './styles';
import { themas } from '../../global/themes';
import { AuthContext } from '../../context/AuthContext';
import { api } from '../../services/api';
import { JorgeAvatar, PrimaryButton, TextButton } from '../../components';
import FormField from '../login/FormField';
import { ArrowLeftIcon } from '../login/icons';
import { getGreeting, getNameUpdateError, validateName } from './nameForm';
import type { RootStackScreenProps } from '../../routes/types';

export default function ProfilePage({ navigation }: RootStackScreenProps<'Profile'>) {
  // O App só protege o topo: a folha branca vai até a borda e empurra o conteúdo acima da barra do Android
  const insets = useSafeAreaInsets();
  // null = nome ainda não carregado (ou a busca falhou)
  const [userName, setUserName] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [tempName, setTempName] = useState('');
  const [nameError, setNameError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  const { user, signOut } = useContext(AuthContext)!;
  const appVersion = Constants.expoConfig?.version;

  // Handler para o botão de voltar do celular - volta para a tela anterior
  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        navigation.goBack();
        return true;
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);

      return () => subscription.remove();
    }, [navigation]),
  );

  const handleSave = async () => {
    if (saving || !user) return;

    const error = validateName(tempName);
    setNameError(error);
    if (error) return;

    const name = tempName.trim();
    Keyboard.dismiss();
    setSaving(true);
    try {
      const response = await api.put(`/user/${user.id}`, { name });

      if (response.status === 200) {
        setUserName(typeof response.data?.name === 'string' ? response.data.name : name);
        setIsEditing(false);
      }
    } catch (requestError) {
      setNameError(getNameUpdateError(requestError));
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = () => {
    setTempName(userName ?? '');
    setNameError(undefined);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setTempName(userName ?? '');
    setNameError(undefined);
    setIsEditing(false);
  };

  const handleLogout = async () => {
    Alert.alert('Confirmar Saída', 'Tem certeza de que deseja sair?', [
      {
        text: 'Cancelar',
        style: 'cancel',
      },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: async () => {
          try {
            // Limpa token + user; o stack volta para o Login e desmonta as telas logadas
            await signOut();
          } catch (error) {
            Alert.alert('Erro', 'Não foi possível fazer logout');
          }
        },
      },
    ]);
  };

  const handleGetUsername = useCallback(async () => {
    if (!user) return;

    try {
      const response = await api.get(`/user/${user.id}`);

      if (response.status === 200) {
        const name = typeof response.data?.name === 'string' ? response.data.name : '';
        setUserName(name);
        setTempName(name);
      }
    } catch (error) {
      return;
    }
  }, [user]);

  useEffect(() => {
    handleGetUsername();
  }, [handleGetUsername]);

  const nameLabel = userName === null ? '—' : userName.trim() || 'Sem nome';
  const nameIsEmpty = !userName?.trim();

  return (
    <View style={style.container}>
      <View style={style.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Voltar"
          style={({ pressed }) => [style.backButton, pressed && style.pressed]}
        >
          <ArrowLeftIcon size={22} color={themas.colors.white} />
        </Pressable>
        <Text style={style.headerTitle} accessibilityRole="header">
          Perfil
        </Text>
      </View>

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
            <JorgeAvatar size={64} accessibilityLabel={null} />
            <View style={style.heroText}>
              <Text style={style.greeting}>{getGreeting(userName)}</Text>
              <Text style={style.heroSubtitle}>Gerencie suas informações</Text>
            </View>
          </View>

          <View style={[style.sheet, { paddingBottom: 32 + insets.bottom }]}>
            {isEditing ? (
              <>
                <FormField
                  label="Nome"
                  value={tempName}
                  onChangeText={(value) => {
                    setTempName(value);
                    setNameError(undefined);
                  }}
                  placeholder="Digite seu nome"
                  autoCapitalize="words"
                  autoComplete="name"
                  textContentType="name"
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={handleSave}
                  editable={!saving}
                  error={nameError}
                />
                <View style={style.editActions}>
                  <PrimaryButton title="Salvar" onPress={handleSave} loading={saving} />
                  <TextButton title="Cancelar" onPress={handleCancel} disabled={saving} />
                </View>
              </>
            ) : (
              <View style={[style.infoRow, style.infoRowWithAction]}>
                <View style={style.infoText}>
                  <Text style={style.infoLabel}>Nome</Text>
                  <Text style={[style.infoValue, nameIsEmpty && style.infoValueEmpty]}>
                    {nameLabel}
                  </Text>
                </View>
                <Pressable
                  onPress={handleEdit}
                  accessibilityRole="button"
                  accessibilityLabel="Editar nome"
                  style={({ pressed }) => [style.editButton, pressed && style.pressed]}
                >
                  <Text style={style.editButtonText}>Editar</Text>
                </Pressable>
              </View>
            )}

            <View style={style.infoRow}>
              <View style={style.infoText}>
                <Text style={style.infoLabel}>E-mail</Text>
                <Text style={style.infoValue}>{user?.email ?? ''}</Text>
              </View>
            </View>

            <View style={style.infoRow}>
              <View style={style.infoText}>
                <Text style={style.infoLabel}>Versão do app</Text>
                <Text style={style.infoValue}>{appVersion ?? '—'}</Text>
              </View>
            </View>

            <TextButton
              title="Sair da conta"
              variant="destructive"
              onPress={handleLogout}
              style={style.logout}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
