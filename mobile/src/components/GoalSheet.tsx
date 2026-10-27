import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { fonts } from '../global/fonts';
import { formatCurrency } from '../global/formatCurrency';
import {
  GOAL_PRESETS,
  formatGoalInput,
  getGoalErrorMessage,
  parseGoalInput,
} from '../global/monthlyGoal';
import { themas } from '../global/themes';
import Chip from './Chip';
import { AlertIcon, ChartIcon } from './icons';
import PrimaryButton from './PrimaryButton';
import Sheet from './Sheet';
import TextButton from './TextButton';

type GoalSheetProps = {
  visible: boolean;
  onClose: () => void;
  /** Meta atual (preenche o campo ao abrir); `null` sem meta, e aí "Remover meta" não aparece. */
  currentGoal: number | null;
  /** Média mensal de gastos dos últimos 3 meses fechados; sem valor (ou 0) a dica não aparece. */
  averageSpending?: number | null;
  /**
   * Salva (`number`) ou remove (`null`) a meta. Ao resolver, a folha fecha; ao rejeitar, mostra o erro
   * na própria folha (mensagem via `getGoalErrorMessage`).
   */
  onSave: (value: number | null) => Promise<void> | void;
};

type SavingAction = 'save' | 'remove' | null;

const presetLabel = (value: number) => formatCurrency(value, { hideZeroCents: true });

// Folha "Meta de gastos do mês": valor com atalhos, dica da média recente, salvar e remover.
// A meta vale para todos os meses até ser mudada (sem "Repetir nos próximos meses").
export default function GoalSheet({
  visible,
  onClose,
  currentGoal,
  averageSpending,
  onSave,
}: GoalSheetProps) {
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<SavingAction>(null);
  const [wasVisible, setWasVisible] = useState(false);

  // Ao abrir, recomeça com a meta atual (ajuste de estado durante o render, sem efeito)
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) {
      setText(currentGoal ? formatGoalInput(currentGoal) : '');
      setError(null);
      setSaving(null);
    }
  }

  const parsed = parseGoalInput(text);
  const selectedPreset = parsed.ok ? parsed.value : null;
  const showHint = typeof averageSpending === 'number' && averageSpending > 0;

  const handleChangeText = (value: string) => {
    setText(value.replace(/[^\d.,]/g, ''));
    setError(null);
  };

  const submit = async (action: Exclude<SavingAction, null>, value: number | null) => {
    setSaving(action);
    setError(null);
    try {
      await onSave(value);
      setSaving(null);
      onClose();
    } catch (saveError) {
      setSaving(null);
      setError(getGoalErrorMessage(saveError));
    }
  };

  const handleSave = () => {
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    submit('save', parsed.value);
  };

  return (
    <Sheet visible={visible} onClose={onClose} contentStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title} accessibilityRole="header">
          Meta de gastos do mês
        </Text>
        <Text style={styles.subtitle}>Quanto você quer gastar, no máximo, por mês?</Text>
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Valor da meta</Text>
        <View style={styles.field}>
          <Text style={styles.currency}>R$</Text>
          <TextInput
            value={text}
            onChangeText={handleChangeText}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor={themas.colors.controlOff}
            maxLength={16}
            editable={saving === null}
            returnKeyType="done"
            onSubmitEditing={handleSave}
            accessibilityLabel="Valor da meta em reais"
            style={styles.input}
          />
        </View>
        <View style={styles.presets} accessibilityRole="radiogroup">
          {GOAL_PRESETS.map((preset) => (
            <Chip
              key={preset}
              label={presetLabel(preset)}
              selected={selectedPreset === preset}
              disabled={saving !== null}
              onPress={() => handleChangeText(formatGoalInput(preset))}
            />
          ))}
        </View>
      </View>

      {showHint && (
        <View style={styles.hint}>
          <View style={styles.hintIcon}>
            <ChartIcon size={16} color={themas.colors.textDark} />
          </View>
          <Text style={styles.hintText}>
            Nos últimos 3 meses você gastou, em média,{' '}
            <Text style={styles.hintValue}>
              {formatCurrency(Math.round(averageSpending), { hideZeroCents: true })}
            </Text>{' '}
            por mês.
          </Text>
        </View>
      )}

      {error && (
        <View style={styles.error} accessibilityRole="alert" accessibilityLiveRegion="polite">
          <AlertIcon size={18} color={themas.colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <View style={styles.actions}>
        <PrimaryButton
          title="Salvar meta"
          onPress={handleSave}
          loading={saving === 'save'}
          disabled={saving === 'remove'}
        />
        {currentGoal !== null && (
          <TextButton
            title="Remover meta"
            onPress={() => submit('remove', null)}
            disabled={saving !== null}
          />
        )}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 20,
  },
  header: {
    gap: 6,
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
  fieldGroup: {
    gap: 8,
  },
  label: {
    fontFamily: fonts.medium,
    fontSize: 14,
    lineHeight: 20,
    color: themas.colors.textDark,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 72,
    paddingHorizontal: 18,
    borderWidth: 2,
    borderColor: themas.colors.primary,
    borderRadius: 16,
    backgroundColor: themas.colors.fillLight,
  },
  currency: {
    fontFamily: fonts.medium,
    fontSize: 22,
    lineHeight: 28,
    color: themas.colors.textMuted,
  },
  input: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 0,
    fontFamily: fonts.bold,
    fontSize: 34,
    color: themas.colors.textDark,
  },
  presets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  hint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: themas.radius.md,
    backgroundColor: themas.colors.fillLight,
  },
  hintIcon: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: themas.colors.secondary,
  },
  hintText: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 21,
    color: themas.colors.textMuted,
  },
  hintValue: {
    fontFamily: fonts.semibold,
    color: themas.colors.textDark,
  },
  error: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 14,
    lineHeight: 20,
    color: themas.colors.error,
  },
  actions: {
    gap: 6,
  },
});
