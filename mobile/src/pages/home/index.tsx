import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  BackHandler,
  FlatList,
  Keyboard,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { ArrowUpIcon, CorrectTransactionSheet, GoalSheet } from '../../components';
import { AuthContext } from '../../context/AuthContext';
import { ConnectionContext } from '../../context/ConectionContext';
import { addToOfflineQueue } from '../../global/offlineQueue';
import { themas } from '../../global/themes';
import { useAverageMonthlySpending } from '../../hooks/useAverageMonthlySpending';
import { useMonthlyGoal } from '../../hooks/useMonthlyGoal';
import type { TabScreenProps } from '../../routes/types';
import { api } from '../../services/api';
import { getTransactions, type Transaction } from '../../services/transactions';
import { getUser } from '../../services/user';
import {
  type ChatItem,
  type WebhookSuccessResponse,
  OFFLINE_QUEUED_MESSAGE,
  OFFLINE_QUEUE_ERROR_MESSAGE,
  applyCorrection,
  applyDeletion,
  buildSuccessReply,
  confirmAll,
  confirmItem,
  getErrorReply,
  getGreeting,
  getJorgeStatus,
  getProfileInitial,
  hasPendingConfirmation,
  transactionFromWebhook,
} from './chat';
import { Header, MonthSummary } from './ChatHeader';
import { ConfirmCard, Receipt, TextBubble, TypingBubble } from './ChatItems';
import {
  type MonthSummary as MonthTotals,
  type ShortcutKey,
  PIX_PREFILL,
  SHORTCUTS,
  SHORTCUT_ERROR_REPLY,
  SHORTCUT_OFFLINE_REPLY,
  buildTodayReply,
  buildWeekReply,
  getDaysLeftInMonth,
  getMonthRange,
  getMonthSpentLabel,
  getShortcutRange,
  summarizeMonth,
} from './summary';
import { style } from './styles';
import { useKeyboardOverlap } from './useKeyboardOverlap';

// Mensagem do usuário como vai para POST /webhook/messages (e para a fila offline)
type UserMessage = {
  id: string;
  text: string;
  sender: 'user';
  timestamp: Date;
  userPhone: string;
};

export default function HomePage({ navigation }: TabScreenProps<'HomeTab'>) {
  const { user } = useContext(AuthContext)!;
  const { isConnected } = useContext(ConnectionContext);
  const userId = user?.id;
  const { goal, loading: goalLoading, error: goalError, save: saveGoal } = useMonthlyGoal();

  const [items, setItems] = useState<ChatItem[]>([{ kind: 'greeting', id: 'greeting' }]);
  const [inputValue, setInputValue] = useState('');
  // Esperando o webhook ou a conta de um atalho: trava envio e atalhos
  const [busy, setBusy] = useState(false);
  // Trava síncrona contra envio duplo (o estado só atualiza no próximo render)
  const busyRef = useRef(false);
  const itemCounter = useRef(0);

  const [userName, setUserName] = useState<string | null>(null);
  const [totals, setTotals] = useState<MonthTotals | null>(null);
  // Data de referência do resumo e dos recibos; atualizada ao focar e a cada recarga do resumo
  const [now, setNow] = useState(() => new Date());
  const summaryRequest = useRef(0);

  const [correcting, setCorrecting] = useState<Transaction | null>(null);
  const [correctionVisible, setCorrectionVisible] = useState(false);
  const [goalSheetVisible, setGoalSheetVisible] = useState(false);
  const averageSpending = useAverageMonthlySpending(goalSheetVisible);

  const containerRef = useRef<View>(null);
  const listRef = useRef<FlatList<ChatItem>>(null);
  const inputRef = useRef<TextInput>(null);
  const keyboardOverlap = useKeyboardOverlap(containerRef);
  const keyboardOpen = keyboardOverlap > 0;

  const nextItemId = (suffix: string) => `${Date.now()}-${++itemCounter.current}-${suffix}`;

  const addItem = (item: ChatItem) => setItems((prev) => [...prev, item]);
  const addBotMessage = (text: string) =>
    addItem({ kind: 'text', id: nextItemId('bot'), sender: 'bot', text });

  // Gastos do mês e de hoje (GET /transactions do dia 1º até hoje). Em erro, mantém os últimos valores.
  const loadSummary = useCallback(async () => {
    const request = ++summaryRequest.current;
    const current = new Date();
    setNow(current);
    try {
      const { start, end } = getMonthRange(current);
      const transactions = await getTransactions(start, end);
      if (request === summaryRequest.current) setTotals(summarizeMonth(transactions, current));
    } catch (error) {
      console.log('Erro ao carregar o resumo do mês: ', error);
    }
  }, []);

  // Nome para a saudação e a inicial do perfil (pode ter mudado no Perfil)
  const loadUserName = useCallback(async () => {
    if (!userId) return;
    try {
      const profile = await getUser(userId);
      setUserName(profile.name);
    } catch (error) {
      console.log('Erro ao carregar o nome do usuário: ', error);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      loadSummary();
      loadUserName();

      // Botão voltar do Android: na Home, fecha o app (as folhas abertas tratam o voltar antes)
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        BackHandler.exitApp();
        return true;
      });
      return () => subscription.remove();
    }, [loadSummary, loadUserName]),
  );

  // Teclado abriu: a lista encolhe, mantém a última mensagem à vista
  useEffect(() => {
    if (keyboardOpen) listRef.current?.scrollToEnd({ animated: true });
  }, [keyboardOpen]);

  const lock = () => {
    busyRef.current = true;
    setBusy(true);
  };
  const unlock = () => {
    busyRef.current = false;
    setBusy(false);
  };

  // Mensagem nova do usuário: cartões ainda abertos viram recibo (o lançamento já está salvo)
  const addUserText = (text: string, id = nextItemId('user')) =>
    setItems((prev) => [...confirmAll(prev), { kind: 'text', id, sender: 'user', text }]);

  const handleSendMessage = async () => {
    if (inputValue.trim() === '' || busyRef.current) return;

    lock();
    Keyboard.dismiss();

    const userMessage: UserMessage = {
      id: Date.now().toString(),
      text: inputValue,
      sender: 'user',
      timestamp: new Date(),
      userPhone: user?.phone || 'unknown',
    };

    addUserText(userMessage.text, userMessage.id);
    setInputValue('');

    try {
      if (!isConnected) {
        // Sem conexão: guarda na fila offline para enviar quando a rede voltar
        try {
          await addToOfflineQueue(userMessage);
          addBotMessage(OFFLINE_QUEUED_MESSAGE);
        } catch (error) {
          console.log('Erro ao enviar mensagem a fila OFFLINE: ', error);
          addBotMessage(OFFLINE_QUEUE_ERROR_MESSAGE);
        }
        return;
      }

      try {
        const response = await api.post<WebhookSuccessResponse>(`/webhook/messages`, {
          userMessage,
        });
        const transaction = transactionFromWebhook(response.data, {
          phone: user?.phone ?? '',
          messageId: userMessage.id,
          now: new Date(),
        });
        if (transaction) {
          addItem({ kind: 'transaction', id: nextItemId('tx'), transaction, confirmed: false });
        } else {
          addBotMessage(buildSuccessReply(response.data));
        }
        loadSummary();
      } catch (error) {
        console.log('Erro ao enviar mensagem ao webhook: ', error);
        addBotMessage(getErrorReply(error));
      }
    } finally {
      unlock();
    }
  };

  // Atalhos: "Recebi um pix" só preenche o campo; os outros respondem com conta feita no app
  const handleShortcut = async (key: ShortcutKey, label: string) => {
    if (key === 'pix') {
      setInputValue(PIX_PREFILL);
      requestAnimationFrame(() => inputRef.current?.focus());
      return;
    }
    if (busyRef.current) return;

    lock();
    Keyboard.dismiss();
    addUserText(label);

    try {
      if (!isConnected) {
        addBotMessage(SHORTCUT_OFFLINE_REPLY);
        return;
      }
      const current = new Date();
      const { start, end } = getShortcutRange(key, current);
      const transactions = await getTransactions(start, end);
      addBotMessage(
        key === 'today'
          ? buildTodayReply(transactions, current)
          : buildWeekReply(transactions, current),
      );
    } catch (error) {
      console.log('Erro ao calcular atalho: ', error);
      addBotMessage(SHORTCUT_ERROR_REPLY);
    } finally {
      unlock();
    }
  };

  const openCorrection = (transaction: Transaction) => {
    Keyboard.dismiss();
    setCorrecting(transaction);
    setCorrectionVisible(true);
  };

  const handleCorrectionSaved = (transaction: Transaction) => {
    setItems((prev) => applyCorrection(prev, transaction));
    setCorrectionVisible(false);
    loadSummary();
  };

  const handleCorrectionDeleted = (id: string) => {
    setItems((prev) => applyDeletion(prev, id));
    setCorrectionVisible(false);
    loadSummary();
  };

  const renderItem = ({ item }: { item: ChatItem }) => {
    switch (item.kind) {
      case 'greeting':
        return <TextBubble sender="bot" text={getGreeting(now, userName)} />;
      case 'text':
        return <TextBubble sender={item.sender} text={item.text} />;
      case 'transaction':
        return item.confirmed ? (
          <Receipt
            transaction={item.transaction}
            now={now}
            onPress={() => openCorrection(item.transaction)}
          />
        ) : (
          <ConfirmCard
            transaction={item.transaction}
            now={now}
            onConfirm={() => setItems((prev) => confirmItem(prev, item.id))}
            onCorrect={() => openCorrection(item.transaction)}
          />
        );
    }
  };

  const status = getJorgeStatus({
    busy,
    awaitingConfirmation: hasPendingConfirmation(items),
    isConnected,
  });

  return (
    <View
      ref={containerRef}
      collapsable={false}
      style={[style.container, { paddingBottom: keyboardOverlap }]}
    >
      <Header
        status={status}
        profileInitial={getProfileInitial(userName, user?.email)}
        onProfilePress={() => navigation.navigate('Profile')}
      />

      {/* Com o teclado aberto o resumo sai, para sobrar espaço para a conversa */}
      {!keyboardOpen && (
        <MonthSummary
          monthLabel={getMonthSpentLabel(now)}
          monthSpent={totals?.monthSpent ?? null}
          todaySpent={totals?.todaySpent ?? null}
          goal={goal}
          showGoalInvite={!goalLoading && !goalError && goal === null && totals !== null}
          daysLeft={getDaysLeftInMonth(now)}
          onGoalPress={() => setGoalSheetVisible(true)}
        />
      )}

      <FlatList
        ref={listRef}
        style={style.list}
        data={items}
        extraData={[now, userName]}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={style.listContent}
        ListHeaderComponent={<Text style={style.dayLabel}>Hoje</Text>}
        ListFooterComponent={busy ? <TypingBubble /> : null}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
      />

      <ScrollView
        horizontal
        style={style.shortcuts}
        contentContainerStyle={style.shortcutsContent}
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {SHORTCUTS.map(({ key, label }) => {
          const disabled = busy && key !== 'pix';
          return (
            <Pressable
              key={key}
              onPress={() => handleShortcut(key, label)}
              disabled={disabled}
              accessibilityRole="button"
              accessibilityState={{ disabled }}
              hitSlop={4}
              style={({ pressed }) => [
                style.shortcut,
                pressed && style.pressed,
                disabled && style.disabled,
              ]}
            >
              <Text style={style.shortcutText}>{label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={style.composer}>
        <View style={style.inputBox}>
          <TextInput
            ref={inputRef}
            style={style.input}
            placeholder="Conta pro Jorge…"
            placeholderTextColor={themas.colors.controlOff}
            accessibilityLabel="Mensagem para o Jorge"
            value={inputValue}
            onChangeText={setInputValue}
            multiline
            maxLength={500}
          />
        </View>
        <Pressable
          onPress={handleSendMessage}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel="Enviar"
          accessibilityState={{ disabled: busy }}
          style={({ pressed }) => [
            style.sendButton,
            pressed && style.pressed,
            busy && style.disabled,
          ]}
        >
          <ArrowUpIcon size={22} color={themas.colors.textDark} />
        </Pressable>
      </View>

      <CorrectTransactionSheet
        visible={correctionVisible}
        transaction={correcting}
        onClose={() => setCorrectionVisible(false)}
        onSaved={handleCorrectionSaved}
        onDeleted={handleCorrectionDeleted}
      />

      <GoalSheet
        visible={goalSheetVisible}
        onClose={() => setGoalSheetVisible(false)}
        currentGoal={goal}
        averageSpending={averageSpending}
        onSave={saveGoal}
      />
    </View>
  );
}
