import React, {useState, useEffect} from "react"; 
import {Text, View, Image, TextInput, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity, Alert, BackHandler} from "react-native";
import { useFocusEffect } from '@react-navigation/native';
import { style } from "./styles";
import { fonts } from "../../global/fonts";
import { themas } from "../../global/themes";

import jorgeAcenando from "../../assets/jorge_acenando.png";
import { api } from "../../services/api";

export default function RegisterPage({navigation}: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [number, setNumber] = useState('');

  // Handler para o botão de voltar do celular - fecha o app
  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        BackHandler.exitApp();
        return true;
      };

      const subscription = BackHandler.addEventListener(
        'hardwareBackPress',
        onBackPress,
      );

      return () => subscription.remove();
    }, [])
  );

  const handleRegister =  async () => {

    if(!email || !password || !number) {
      Alert.alert(
        "Campos obrigatórios", 
        "Por favor, preencha todos os campos.",
        [
          { text: "OK" },
        ]
      )
      return;
    }

    try{
      const response = await api.post(`/auth/signup`, {
          email,
          password,
          phone: number
        });

        if (response.status === 201) {
          navigation.navigate('Login');
        }
    } catch (error) {
      Alert.alert(
        "Erro ao efetuar Registro", 
        "Valide os dados e tente novamente.",
        [
          { text: "OK" },
        ]
      );
    }
  }

  return (
    <KeyboardAvoidingView 
      style={{flex: 1, backgroundColor: themas.colors.primary}}
      behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
      keyboardVerticalOffset={0}
    >
      <ScrollView 
        style={{flex: 1, backgroundColor: themas.colors.primary}}
        contentContainerStyle={style.scrollContainer}
        showsVerticalScrollIndicator={false}
        scrollEnabled={true}
        keyboardShouldPersistTaps="handled"
      >
        <View style={style.header}>
          <Image source={jorgeAcenando} resizeMode="contain" style={style.jorgeAcenandoLogo} />
          <Text style={style.title}>Bem-Vindo!</Text>
          <Text style={style.subtitle}>Efetue seu Cadastro</Text>
        </View>

        <View style={style.main}>
          <Text style={style.inputTitle}>Digite seu E-mail:</Text>
          <View style={style.inputBox}>
            <TextInput
              style={style.textInput}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none" 
              selectionColor={themas.colors.primary}
            />
          </View>

          <Text style={style.inputTitle}>Digite sua Senha:</Text>
          <View style={style.inputBox}>
            <TextInput
              style={style.textInput}
              value={password}
              onChangeText={setPassword}
              keyboardType="default"
              secureTextEntry
              autoCapitalize="none" 
              selectionColor={themas.colors.primary}
            />
          </View>

          <Text style={style.inputTitle}>Digite seu Telefone:</Text>
          <View style={style.inputBox}>
            <TextInput
              style={style.textInput}
              value={number}
              onChangeText={setNumber}
              keyboardType="number-pad"
              autoCapitalize="none" 
              selectionColor={themas.colors.primary}
            />
          </View>

          <TouchableOpacity style={style.button} onPress={handleRegister}>
            <Text style={style.textButton}>Cadastrar</Text>
          </TouchableOpacity>
        </View>

        <View style={style.footer}>
          <Text style={style.subtitle}>Já tem uma conta?</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={{fontFamily: fonts.regular, fontSize: 14, color: '#8DC63E'}}>Entrar agora</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
