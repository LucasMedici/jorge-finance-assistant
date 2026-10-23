import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  BackHandler,
} from "react-native";
import { useFocusEffect } from '@react-navigation/native';
import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { style } from "./styles";
import { themas } from "../../global/themes";

import { useContext } from "react";
import { AuthContext } from "../../context/AuthContext";
import { api } from "../../services/api";

export default function ProfilePage({ navigation }: any) {
  const [userName, setUserName] = useState("Usuário");
  const [isEditing, setIsEditing] = useState(false);
  const [tempName, setTempName] = useState(userName);

  const authContext = useContext(AuthContext);
  const { user } = authContext!;


  // Handler para o botão de voltar do celular - volta para a tela anterior
  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        // Volta para a tela anterior quando aperta voltar
        navigation.goBack();
        return true;
      };

      const subscription = BackHandler.addEventListener(
        'hardwareBackPress',
        onBackPress,
      );

      return () => subscription.remove();
    }, [navigation])
  );

  const handleSave = async () => {
    if (tempName.trim() === "") {
      Alert.alert("Erro", "O nome não pode estar vazio");
      return;
    }

    try{
      const response = await api.put(`/user/${user.id}`, {
        name: tempName,
      });

      if (response.status === 200) {
        setUserName(tempName);
        setIsEditing(false);
        Alert.alert("Sucesso", "Nome atualizado com sucesso!");
      }

    } catch (error) {
      Alert.alert("Erro", "Não foi possível atualizar o nome");
    }
  }


  const handleCancel = () => {
    setTempName(userName);
    setIsEditing(false);
  };

  const handleLogout = async () => {
    Alert.alert(
      "Confirmar Saída",
      "Tem certeza de que deseja sair?",
      [
        {
          text: "Cancelar",
          style: "cancel",
        },
        {
          text: "Sair",
          style: "destructive",
          onPress: async () => {
            try {
              await AsyncStorage.removeItem('userToken');
              navigation.navigate('Login');
            } catch (error) {
              Alert.alert("Erro", "Não foi possível fazer logout");
            }
          },
        },
      ]
    );
  };


  const handleGetUsername = async () => {
     try{
      const response = await api.get(`/user/${user.id}`);

      if (response.status === 200) {
        setUserName(response.data.name);
        setTempName(response.data.name);
      }

    } catch (error) {
      return
    }
  }

  useEffect(() => {
    handleGetUsername();
  }, []);

  return (
    <ScrollView style={style.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={style.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={28} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 15 }}>
          <Text style={style.headerTitle}>Perfil</Text>
          <Text style={style.headerSubtitle}>Gerencie suas informações</Text>
        </View>
      </View>

      {/* Conteúdo do Perfil */}
      <View style={style.profileContent}>
        {/* Avatar */}
        <View style={style.avatarContainer}>
          <View style={style.avatar}>
            <MaterialIcons name="person" size={50} color="#FFFFFF" />
          </View>
        </View>

        {/* Card de Nome */}
        <View style={style.card}>
          <Text style={style.cardLabel}>Nome</Text>

          {isEditing ? (
            <>
              <TextInput
                style={style.textInput}
                value={tempName}
                onChangeText={setTempName}
                placeholder="Digite seu nome"
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
              />

              <View style={style.buttonGroup}>
                <TouchableOpacity
                  style={[style.button, style.buttonSave]}
                  onPress={handleSave}
                >
                  <MaterialIcons name="check" size={20} color="#FFFFFF" />
                  <Text style={style.buttonText}>Salvar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[style.button, style.buttonCancel]}
                  onPress={handleCancel}
                >
                  <MaterialIcons name="close" size={20} color="#FFFFFF" />
                  <Text style={style.buttonText}>Cancelar</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <Text style={style.userName}>{userName}</Text>

              <TouchableOpacity
                style={style.editButton}
                onPress={() => {
                  setTempName(userName);
                  setIsEditing(true);
                }}
              >
                <MaterialIcons
                  name="edit"
                  size={18}
                  color={themas.colors.secondary}
                />
                <Text style={style.editButtonText}>Editar Nome</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Card de Email */}
        <View style={style.card}>
          <Text style={style.cardLabel}>Email</Text>
          <Text style={style.cardValue}>{user.email}</Text>
        </View>

        {/* Card de Versão */}
        <View style={style.card}>
          <Text style={style.cardLabel}>Versão do App</Text>
          <Text style={style.cardValue}>1.0.0</Text>
        </View>

        {/* Botão de Logout */}
        <TouchableOpacity
          style={style.logoutButton}
          onPress={handleLogout}
        >
          <MaterialIcons name="logout" size={20} color="#FFFFFF" />
          <Text style={style.logoutButtonText}>Sair da Conta</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 80 }} />
    </ScrollView>
  );
}
