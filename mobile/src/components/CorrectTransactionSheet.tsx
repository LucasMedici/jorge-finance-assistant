import { useState } from 'react';
import {
  Alert,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { parseISO } from 'date-fns';
import { getCategories, type CategoryType } from '../global/categories';
import { fonts } from '../global/fonts';
import { themas } from '../global/themes';
import {
  deleteTransaction,
  toApiDate,
  updateTransaction,
  type Transaction,
} from '../services/transactions';
import Chip from './Chip';
import {
  type CorrectionForm,
  buildTransactionPatch,
  changeCorrectionType,
  formatCorrectionDate,
  getAmountError,
  getCorrectionErrorMessage,
  getInitialCorrectionForm,
  isNotFoundError,
  sanitizeAmountInput,
} from './correctTransaction';
import { AlertIcon, CalendarIcon, ChevronRightIcon, TrashIcon } from './icons';
import PrimaryButton from './PrimaryButton';
import SegmentedControl, { type SegmentedOption } from './SegmentedControl';
import Sheet from './Sheet';
import TextButton from './TextButton';

type CorrectTransactionSheetProps = {
  visible: boolean;
  /** Lançamento a corrigir. Pode virar `null` ao fechar: a folha mostra o último durante a saída. */
  transaction: Transaction | null;
  /** Tocar fora, voltar do Android ou salvar sem ter mudado nada. */
  onClose: () => void;
  /** Correção gravada (PATCH 200), com a transação como ficou. Quem usa fecha a folha. */
  onSaved: (transaction: Transaction) => void;
  /** Lançamento apagado (DELETE 204, ou 404 se já não existia). Quem usa fecha a folha. */
  onDeleted: (id: string) => void;
};

const TYPE_OPTIONS: readonly SegmentedOption<CategoryType>[] = [
  { value: 'gasto', label: 'Gasto' },
  { value: 'receita', label: 'Receita' },
];

/**
 * Folha "Corrigir lançamento": tipo, valor, categoria, descrição e data; salva com PATCH (só o que mudou)
 * e apaga com DELETE (com confirmação). Só funciona online: sem rede, avisa na própria folha.
 */
export default function CorrectTransactionSheet({
  visible,
  transaction,
  onClose,
  onSaved,
  onDeleted,
}: CorrectTransactionSheetProps) {
  // Mantém o último lançamento na tela enquanto a folha desce
  const [shown, setShown] = useState(transaction);
  if (transaction && transaction !== shown) setShown(transaction);

  // Cada abertura começa um formulário novo (descarta edições não salvas da vez anterior)
  const [openCount, setOpenCount] = useState(0);
  const [wasVisible, setWasVisible] = useState(visible);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) setOpenCount((count) => count + 1);
  }

  return (
    <Sheet
      visible={visible && shown !== null}
      onClose={onClose}
      contentStyle={styles.sheetContent}
      closeAccessibilityLabel="Fechar correção"
    >
      {shown && (
        <CorrectionFields
          key={`${shown.id}:${openCount}`}
          transaction={shown}
          onClose={onClose}
          onSaved={onSaved}
          onDeleted={onDeleted}
        />
      )}
    </Sheet>
  );
}

type CorrectionFieldsProps = Omit<CorrectTransactionSheetProps, 'visible' | 'transaction'> & {
  transaction: Transaction;
};

function CorrectionFields({ transaction, onClose, onSaved, onDeleted }: CorrectionFieldsProps) {
  const [form, setForm] = useState<CorrectionForm>(() => getInitialCorrectionForm(transaction));
  const [focusedField, setFocusedField] = useState<'amount' | 'description' | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [status, setStatus] = useState<'idle' | 'saving' | 'deleting'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [amountInvalid, setAmountInvalid] = useState(false);
  const busy = status !== 'idle';

  const updateForm = (changes: Partial<CorrectionForm>) => {
    setForm((current) => ({ ...current, ...changes }));
    setError(null);
  };

  const handleTypeChange = (type: CategoryType) => {
    if (busy) return;
    setForm((current) => changeCorrectionType(current, type));
    setError(null);
  };

  const handleAmountChange = (text: string) => {
    updateForm({ amount: sanitizeAmountInput(text) });
    setAmountInvalid(false);
  };

  const handleDateChange = (event: DateTimePickerEvent, date?: Date) => {
    setShowDatePicker(false);
    if (event.type === 'set' && date) updateForm({ date: toApiDate(date) });
  };

  const handleSave = async () => {
    if (busy) return;
    Keyboard.dismiss();

    const amountError = getAmountError(form.amount);
    if (amountError) {
      setAmountInvalid(true);
      setError(amountError);
      return;
    }

    const patch = buildTransactionPatch(transaction, form);
    if (Object.keys(patch).length === 0) {
      onClose();
      return;
    }

    setStatus('saving');
    setError(null);
    try {
      const updated = await updateTransaction(transaction.id, patch);
      onSaved(updated);
    } catch (saveError) {
      setError(getCorrectionErrorMessage(saveError, 'save'));
    } finally {
      setStatus('idle');
    }
  };

  const deleteConfirmed = async () => {
    setStatus('deleting');
    setError(null);
    try {
      await deleteTransaction(transaction.id);
      onDeleted(transaction.id);
    } catch (deleteError) {
      // Já não existia: para quem usa, dá no mesmo que apagar
      if (isNotFoundError(deleteError)) onDeleted(transaction.id);
      else setError(getCorrectionErrorMessage(deleteError, 'delete'));
    } finally {
      setStatus('idle');
    }
  };

  const handleDelete = () => {
    if (busy) return;
    Keyboard.dismiss();
    Alert.alert('Apagar lançamento?', 'Ele sai dos seus relatórios e não dá para desfazer.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Apagar', style: 'destructive', onPress: deleteConfirmed },
    ]);
  };

  const dateLabel = formatCorrectionDate(form.date);
  const amountBorder = amountInvalid
    ? styles.fieldError
    : focusedField === 'amount'
      ? styles.fieldFocused
      : null;

  // Só os campos rolam: com as 12 categorias a folha passa da tela e os botões ficam sempre à vista
  return (
    <View style={styles.body}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title} accessibilityRole="header">
            Corrigir lançamento
          </Text>
          <Text style={styles.subtitle}>Ajuste o que o Jorge entendeu.</Text>
        </View>

        <SegmentedControl
          options={TYPE_OPTIONS}
          value={form.type}
          onChange={handleTypeChange}
          accessibilityLabel="Tipo"
        />

        <View style={styles.field}>
          <Text style={styles.label} nativeID="corrigir-valor">
            Valor
          </Text>
          <View style={[styles.amountBox, amountBorder]}>
            <Text style={styles.currency}>R$</Text>
            <TextInput
              value={form.amount}
              onChangeText={handleAmountChange}
              onFocus={() => setFocusedField('amount')}
              onBlur={() => setFocusedField(null)}
              keyboardType="decimal-pad"
              placeholder="0,00"
              placeholderTextColor={themas.colors.controlOff}
              editable={!busy}
              accessibilityLabel="Valor em reais"
              accessibilityLabelledBy="corrigir-valor"
              style={styles.amountInput}
            />
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Categoria</Text>
          <View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabel="Categoria">
            {getCategories(form.type).map((category) => (
              <Chip
                key={category}
                label={category}
                selected={category === form.category}
                onPress={() => {
                  if (!busy) updateForm({ category });
                }}
              />
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label} nativeID="corrigir-descricao">
            Descrição
          </Text>
          <TextInput
            value={form.description}
            onChangeText={(description) => updateForm({ description })}
            onFocus={() => setFocusedField('description')}
            onBlur={() => setFocusedField(null)}
            placeholder="Ex.: compra no mercado"
            placeholderTextColor={themas.colors.controlOff}
            maxLength={500}
            editable={!busy}
            accessibilityLabel="Descrição"
            accessibilityLabelledBy="corrigir-descricao"
            style={[styles.textInput, focusedField === 'description' && styles.fieldFocused]}
          />
        </View>

        <Pressable
          onPress={() => {
            if (busy) return;
            Keyboard.dismiss();
            setShowDatePicker(true);
          }}
          accessibilityRole="button"
          accessibilityLabel={`Data: ${dateLabel}. Alterar data`}
          style={({ pressed }) => [styles.dateRow, pressed && styles.pressed]}
        >
          <CalendarIcon size={20} color={themas.colors.primary} />
          <View style={styles.dateText}>
            <Text style={styles.dateCaption}>Data</Text>
            <Text style={styles.dateValue}>{dateLabel}</Text>
          </View>
          <ChevronRightIcon size={18} color={themas.colors.textMuted} />
        </Pressable>
        {showDatePicker && (
          <DateTimePicker
            value={parseISO(form.date)}
            mode="date"
            display="default"
            maximumDate={new Date()}
            onChange={handleDateChange}
          />
        )}

        {error && (
          <View style={styles.errorBox} accessibilityRole="alert" accessibilityLiveRegion="polite">
            <AlertIcon size={18} color={themas.colors.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.actions}>
        <PrimaryButton
          title="Salvar correção"
          onPress={handleSave}
          loading={status === 'saving'}
          disabled={status === 'deleting'}
        />
        <TextButton
          title={status === 'deleting' ? 'Apagando…' : 'Apagar lançamento'}
          variant="destructive"
          icon={TrashIcon}
          onPress={handleDelete}
          disabled={busy}
        />
      </View>
    </View>
  );
}

const FIELD_BORDER = 2;

const styles = StyleSheet.create({
  // Deixa a folha encolher e a lista rolar quando o conteúdo passa da altura máxima
  sheetContent: {
    flexShrink: 1,
  },
  body: {
    flexShrink: 1,
  },
  scroll: {
    flexGrow: 0,
    flexShrink: 1,
  },
  content: {
    gap: 18,
  },
  header: {
    gap: 4,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: -0.24,
    color: themas.colors.textDark,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 22,
    color: themas.colors.textMuted,
  },
  field: {
    gap: 6,
  },
  label: {
    fontFamily: fonts.medium,
    fontSize: 14,
    lineHeight: 20,
    color: themas.colors.textDark,
  },
  amountBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 60,
    paddingHorizontal: 16,
    borderWidth: FIELD_BORDER,
    borderColor: 'transparent',
    borderRadius: themas.radius.lg,
    backgroundColor: themas.colors.fillLight,
  },
  currency: {
    fontFamily: fonts.medium,
    fontSize: 20,
    lineHeight: 26,
    color: themas.colors.textMuted,
  },
  amountInput: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 0,
    fontFamily: fonts.bold,
    fontSize: 28,
    color: themas.colors.textDark,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    // O rótulo fica a 8 dos chips (6 do campo + 2)
    paddingTop: 2,
  },
  textInput: {
    height: 52,
    paddingHorizontal: 16,
    paddingVertical: 0,
    borderWidth: FIELD_BORDER,
    borderColor: 'transparent',
    borderRadius: themas.radius.lg,
    backgroundColor: themas.colors.fillLight,
    fontFamily: fonts.regular,
    fontSize: 16,
    color: themas.colors.textDark,
  },
  fieldFocused: {
    borderColor: themas.colors.primary,
  },
  fieldError: {
    borderColor: themas.colors.error,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 52,
    paddingHorizontal: 16,
    borderRadius: themas.radius.lg,
    backgroundColor: themas.colors.fillLight,
  },
  pressed: {
    opacity: 0.8,
  },
  dateText: {
    flex: 1,
  },
  dateCaption: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 16,
    color: themas.colors.textMuted,
  },
  dateValue: {
    fontFamily: fonts.medium,
    fontSize: 15,
    lineHeight: 20,
    color: themas.colors.textDark,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    borderRadius: themas.radius.md,
    backgroundColor: themas.colors.fillLight,
  },
  errorText: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 14,
    lineHeight: 20,
    color: themas.colors.error,
  },
  actions: {
    gap: 4,
    paddingTop: 18,
  },
});
