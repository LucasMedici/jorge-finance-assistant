import React, { useState, useRef, useEffect, useContext } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  Image,
  ImageSourcePropType,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  BackHandler,
  Keyboard,
} from "react-native";
import { useFocusEffect } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { isAxiosError } from "axios";
import { style } from "./styles";
import { themas } from "../../global/themes";
import jorgePensando2 from "../../assets/jorge_pensando2.png";
import jorgePensando from "../../assets/jorge_pensando.png";
import jorgeContando from "../../assets/jorge_contando.png";
import jorgeContando2 from "../../assets/jorge_contando2.png";
import { formatCurrency } from "../../global/formatCurrency";
import { AuthContext } from "../../context/AuthContext";
import { ConnectionContext } from "../../context/ConectionContext";
import { api } from "../../services/api";
import { addToOfflineQueue } from "../../global/offlineQueue";
import type { TabScreenProps } from "../../routes/types";

interface Message {
  id: string;
  text: string;
  sender: "user" | "bot";
  timestamp: Date;
  userPhone?: string;
}

// Resposta de sucesso do POST /webhook/messages (200)
interface WebhookSuccessResponse {
  valor: number;
  tipo: "gasto" | "receita";
  categoria: string;
  comentario: string;
}

// Resposta de erro do POST /webhook/messages (400)
interface WebhookErrorResponse {
  error?: unknown;
  code?: string;
}

const GENERIC_ERROR_MESSAGE =
  "Desculpe, ocorreu um erro ao processar sua solicitação. Tente novamente.";

// Tempo que o Jorge fica "contando" depois de registrar, antes de voltar ao normal
const COUNTING_DURATION_MS = 1500;

// Monta a resposta do Jorge a partir do que o backend registrou
function buildSuccessReply(data: Partial<WebhookSuccessResponse>): string {
  if (typeof data.valor !== "number" || !Number.isFinite(data.valor)) {
    return "Anotado ✅";
  }

  const tipo = data.tipo === "receita" ? "Receita" : "Gasto";
  const categoria = typeof data.categoria === "string" ? data.categoria.trim() : "";
  const comentario = typeof data.comentario === "string" ? data.comentario.trim() : "";

  let reply = `Anotado ✅ ${tipo} de ${formatCurrency(data.valor)}`;
  reply += categoria ? ` em ${categoria}.` : ".";
  if (comentario) {
    reply += `\n📝 ${comentario}`;
  }
  return reply;
}

// Extrai a mensagem amigável de um erro 400; qualquer outro erro vira a mensagem genérica
function getErrorReply(error: unknown): string {
  if (isAxiosError<WebhookErrorResponse>(error) && error.response?.status === 400) {
    const message = error.response.data?.error;
    if (typeof message === "string" && message.trim() !== "") {
      return message;
    }
  }
  return GENERIC_ERROR_MESSAGE;
}

// Funções para pegar uma imagem aleatória entre duas opções
const getRandomThinkingImage = (): ImageSourcePropType =>
  Math.random() > 0.5 ? jorgePensando : jorgePensando2;

const getRandomCountingImage = (): ImageSourcePropType =>
  Math.random() > 0.5 ? jorgeContando : jorgeContando2;

export default function HomePage({ navigation }: TabScreenProps<'HomeTab'>) {
  const authContext = useContext(AuthContext);
  const { user } = authContext!;
  const { isConnected } = useContext(ConnectionContext)


  // Função para obter mensagem de saudação baseada na hora
  const getGreeting = () => {
    const hour = new Date().getHours();
    
    if (hour >= 5 && hour < 12) {
      return "Bom dia!";
    } else if (hour >= 12 && hour < 18) {
      return "Boa tarde!";
    } else {
      return "Boa noite!";
    }
  };

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: `Olá, sou o Jorge, seu assistente financeiro. Como posso ajudá-lo hoje?`,
      sender: "bot",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [jorgeImage, setJorgeImage] = useState<ImageSourcePropType>(getRandomThinkingImage);
  const [isSending, setIsSending] = useState(false);
  // Trava síncrona contra envio duplo (o estado só atualiza no próximo render)
  const isSendingRef = useRef(false);
  const imageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flatListRef = useRef<FlatList>(null);

  const clearImageTimer = () => {
    if (imageTimerRef.current) {
      clearTimeout(imageTimerRef.current);
      imageTimerRef.current = null;
    }
  };

  // Limpa o timer da animação ao sair da tela
  useEffect(() => clearImageTimer, []);

  // Handler para o botão de voltar do celular - fecha o app se estiver em Home
  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        // Fecha o app quando está na Home
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

  const addBotMessage = (text: string) => {
    const botMessage: Message = {
      id: `${Date.now()}-bot`,
      text,
      sender: "bot",
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, botMessage]);
  };

  // Função para enviar mensagem
  const handleSendMessage = async () => {
    if (inputValue.trim() === "" || isSendingRef.current) return;

    isSendingRef.current = true;
    setIsSending(true);

    // Fecha o keyboard
    Keyboard.dismiss();

    // Jorge fica pensando enquanto espera a resposta
    clearImageTimer();
    setJorgeImage(getRandomThinkingImage());

    // Adiciona mensagem do usuário
    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputValue,
      sender: "user",
      timestamp: new Date(),
      userPhone: user?.phone || "unknown",
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");

    try {
      if (!isConnected) {
        // Sem conexão: guarda na fila offline para enviar quando a rede voltar
        try {
          await addToOfflineQueue(userMessage);
          addBotMessage("Você está offline. Sua mensagem foi salva e será enviada quando a conexão for restabelecida.");
        } catch (error) {
          console.log("Erro ao enviar mensagem a fila OFFLINE: ", error);
          addBotMessage("Tivemos problemas ao enviar sua mensagem para a fila OFFLINE. Reenvie quando estiver online.");
        }
        return;
      }

      try {
        const response = await api.post<WebhookSuccessResponse>(`/webhook/messages`, {
          userMessage,
        });
        addBotMessage(buildSuccessReply(response.data ?? {}));

        // Jorge "conta" o que registrou e depois volta ao normal
        setJorgeImage(getRandomCountingImage());
        imageTimerRef.current = setTimeout(() => {
          imageTimerRef.current = null;
          setJorgeImage(getRandomThinkingImage());
        }, COUNTING_DURATION_MS);
      } catch (error) {
        console.log("Erro ao enviar mensagem ao webhook: ", error);
        addBotMessage(getErrorReply(error));
      }
    } finally {
      isSendingRef.current = false;
      setIsSending(false);
    }
  };

  // Scroll automático para a última mensagem
  useEffect(() => {
    if (messages.length > 0) {
      flatListRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages, isSending]);

  const handleProfilePress = () => {
    navigation.navigate('Profile');
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.sender === "user";

    // mensagens do chat
    return (
      <View
        style={[
          style.messageContainer,
          isUser ? style.userMessageContainer : style.botMessageContainer,
        ]}
      >
        <View
          style={[
            style.messageBubble,
            isUser ? style.userBubble : style.botBubble,
          ]}
        >
          <Text
            style={[
              style.messageText,
              isUser ? style.userMessageText : style.botMessageText,
            ]}
          >
            {item.text}
          </Text>
        </View>
      </View>
    )
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: themas.colors.primary }}
      behavior={Platform.OS === "ios" ? "padding" : "padding"}
      keyboardVerticalOffset={0}
    >
      {/* Header com título e ícone de perfil */}
      <View style={style.topHeader}>
        <View style={style.headerTitleContainer}>
          <Text style={style.headerTitle}>Chat</Text>
          <Text style={style.headerSubtitle}>Fale com o Jorge</Text>
        </View>
        <Pressable
          style={style.profileIconButton}
          onPress={handleProfilePress}
        >
          <MaterialIcons name="person" size={28} color="#FFFFFF" />
        </Pressable>
      </View>

      {/* Bot Info Section */}
      <View style={style.botInfoSection}>
        <Image
          source={jorgeImage}
          resizeMode="contain"
          style={style.botImage}
        />
        <Text style={style.botTitle}>{getGreeting()}</Text>
      </View>

      {/* Chat Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={style.chatContainer}
        scrollEnabled={true}
        onEndReachedThreshold={0.1}
        ListFooterComponent={
          isSending ? (
            <View style={[style.messageContainer, style.botMessageContainer]}>
              <View style={[style.messageBubble, style.botBubble]}>
                <Text style={[style.messageText, style.typingText]}>
                  Jorge está digitando…
                </Text>
              </View>
            </View>
          ) : null
        }
      />

      {/* Input Footer */}
      <View style={style.inputFooter}>
        <View style={style.inputBox}>
          <TextInput
            style={style.textInput}
            placeholder="Digite sua mensagem..."
            placeholderTextColor="#999"
            value={inputValue}
            onChangeText={setInputValue}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[style.sendButton, isSending && style.sendButtonDisabled]}
            onPress={handleSendMessage}
            disabled={isSending}
          >
            <MaterialIcons name="send" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Espaço reservado para Tab Bar */}
      <View style={style.tabBarSpace} />
    </KeyboardAvoidingView>
  );
}
