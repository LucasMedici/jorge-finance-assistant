// Itens da conversa: balões, "digitando", recibo e cartão Confirmar/Corrigir
import { Pressable, Text, View } from 'react-native';
import { getTransactionType } from '../../components/correctTransaction';
import { ArrowUpIcon, CheckIcon } from '../../components';
import { formatCurrency } from '../../global/formatCurrency';
import { themas } from '../../global/themes';
import type { Transaction } from '../../services/transactions';
import {
  formatCardDate,
  formatReceiptMeta,
  formatSignedAmount,
  getReceiptTitle,
  getTypeLabel,
} from './chat';
import { ArrowDownIcon, CategoryIcon } from './icons';
import { style } from './styles';

export function TextBubble({ sender, text }: { sender: 'user' | 'bot'; text: string }) {
  const isUser = sender === 'user';
  return (
    <View style={[style.bubble, isUser ? style.userBubble : style.botBubble]}>
      <Text style={isUser ? style.userText : style.botText} selectable>
        {text}
      </Text>
    </View>
  );
}

export function TypingBubble() {
  return (
    <View
      style={style.typing}
      accessible
      accessibilityRole="text"
      accessibilityLabel="Jorge está digitando"
    >
      <View style={[style.typingDot, { backgroundColor: themas.colors.white }]} />
      <View style={[style.typingDot, { backgroundColor: themas.colors.onPrimaryMuted }]} />
      <View style={[style.typingDot, { backgroundColor: themas.colors.onPrimaryFaint }]} />
    </View>
  );
}

type ReceiptProps = {
  transaction: Transaction;
  now: Date;
  /** Abre a correção. */
  onPress: () => void;
};

/** Lançamento registrado: ícone, descrição, "tipo · hora" e valor com sinal. Toque para corrigir. */
export function Receipt({ transaction, now, onPress }: ReceiptProps) {
  const isIncome = getTransactionType(transaction.type) === 'receita';
  const title = getReceiptTitle(transaction);
  const meta = formatReceiptMeta(transaction, now);
  const amount = formatSignedAmount(transaction);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${meta}, ${amount}`}
      accessibilityHint="Abre a correção do lançamento"
      style={({ pressed }) => [style.receipt, pressed && style.pressed]}
    >
      <View
        style={[style.receiptIcon, isIncome ? style.receiptIconIncome : style.receiptIconExpense]}
      >
        {isIncome ? (
          <ArrowUpIcon size={20} color={themas.colors.textDark} />
        ) : (
          <ArrowDownIcon size={20} color={themas.colors.white} />
        )}
      </View>
      <View style={style.receiptText}>
        <Text style={style.receiptTitle} numberOfLines={1}>
          {title}
        </Text>
        <Text style={style.receiptMeta} numberOfLines={1}>
          {meta}
        </Text>
      </View>
      <Text style={[style.receiptAmount, isIncome && style.receiptAmountIncome]}>{amount}</Text>
    </Pressable>
  );
}

type ConfirmCardProps = {
  transaction: Transaction;
  now: Date;
  onConfirm: () => void;
  onCorrect: () => void;
};

/** "Entendi assim, confere?": o lançamento já está salvo; Confirmar só fecha o cartão. */
export function ConfirmCard({ transaction, now, onConfirm, onCorrect }: ConfirmCardProps) {
  const typeLabel = getTypeLabel(transaction.type);
  const amount = formatCurrency(Math.abs(transaction.amount));
  const category = transaction.category?.trim();
  const date = formatCardDate(transaction.createdAt, now);

  return (
    <View style={style.card}>
      <Text style={style.botText}>Entendi assim, confere?</Text>

      <View
        style={style.cardBox}
        accessible
        accessibilityLabel={`${typeLabel} de ${amount}${category ? `, ${category}` : ''}, ${date}`}
      >
        <View style={style.cardMain}>
          <View style={style.cardAmountColumn}>
            <Text style={style.cardType}>{typeLabel}</Text>
            <Text style={style.cardAmount} numberOfLines={1} adjustsFontSizeToFit>
              {amount}
            </Text>
          </View>
          {category ? (
            <View style={style.categoryPill}>
              <CategoryIcon category={category} size={14} color={themas.colors.secondary} />
              <Text style={style.categoryText} numberOfLines={1}>
                {category}
              </Text>
            </View>
          ) : null}
        </View>
        <View style={style.cardDateRow}>
          <Text style={style.cardDateLabel}>Data</Text>
          <Text style={style.cardDateValue}>{date}</Text>
        </View>
      </View>

      <View style={style.cardButtons}>
        <Pressable
          onPress={onConfirm}
          accessibilityRole="button"
          accessibilityLabel="Confirmar lançamento"
          style={({ pressed }) => [style.confirmButton, pressed && style.pressed]}
        >
          <CheckIcon size={16} color={themas.colors.textDark} strokeWidth={2.6} />
          <Text style={style.confirmText}>Confirmar</Text>
        </Pressable>
        <Pressable
          onPress={onCorrect}
          accessibilityRole="button"
          accessibilityLabel="Corrigir lançamento"
          style={({ pressed }) => [style.correctButton, pressed && style.pressed]}
        >
          <Text style={style.correctText}>Corrigir</Text>
        </Pressable>
      </View>
    </View>
  );
}
