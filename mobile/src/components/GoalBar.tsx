import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { fonts } from '../global/fonts';
import { themas } from '../global/themes';
import { formatDaysLeft, getGoalLabels, getGoalProgress } from './goalProgress';
import { AlertIcon } from './icons';

type GoalBarProps = {
  /** Gasto no período. */
  spent: number;
  /** Meta do período; sem meta válida (0, negativa) a barra não aparece. */
  goal: number;
  /**
   * `compact` (padrão): topo do chat, barra de 6 e uma legenda ("86% da meta de R$ 1.500 · faltam 8 dias").
   * `full`: painel dos relatórios, barra de 10 com o percentual e "Restam R$ 215,10".
   */
  variant?: 'compact' | 'full';
  /** Dias até o fim do mês (só no `compact`). */
  daysLeft?: number;
  /**
   * Só no `full`: `false` esconde o "Restam R$ X"/"Meta atingida" (ex.: mês já fechado). Acima da meta,
   * o valor excedido continua aparecendo.
   */
  showRemaining?: boolean;
  style?: StyleProp<ViewStyle>;
};

// Progresso do gasto contra a meta, sobre o fundo roxo. Acima da meta a barra fica âmbar e aparece
// o ícone de alerta com o valor excedido (o aviso nunca depende só da cor).
export default function GoalBar({
  spent,
  goal,
  variant = 'compact',
  daysLeft,
  showRemaining = true,
  style,
}: GoalBarProps) {
  const progress = getGoalProgress(spent, goal);
  if (!progress) return null;

  const { percentLabel, statusLabel, accessibilityLabel } = getGoalLabels(progress, goal);
  const compact = variant === 'compact';
  const barColor = progress.isOver ? themas.colors.warning : themas.colors.secondary;
  const barHeight = compact ? 6 : 10;

  return (
    <View
      style={[compact ? styles.containerCompact : styles.containerFull, style]}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.min(progress.percent, 100) }}
    >
      <View style={[styles.track, { height: barHeight, borderRadius: barHeight / 2 }]}>
        <View
          style={[
            styles.fill,
            {
              width: `${progress.fill * 100}%`,
              borderRadius: barHeight / 2,
              backgroundColor: barColor,
            },
          ]}
        />
      </View>

      {compact ? (
        <View style={styles.captionRow}>
          {progress.isOver && <AlertIcon size={14} color={themas.colors.warning} />}
          <Text style={styles.caption}>
            {percentLabel}
            {progress.isOver ? (
              <Text style={styles.captionWarning}>{` · ${statusLabel}`}</Text>
            ) : (
              daysLeft !== undefined && ` · ${formatDaysLeft(daysLeft)}`
            )}
          </Text>
        </View>
      ) : (
        <View style={styles.fullRow}>
          <Text style={styles.fullPercent}>{percentLabel}</Text>
          {(showRemaining || progress.isOver) && (
            <View style={styles.fullStatus}>
              {progress.isOver && <AlertIcon size={16} color={themas.colors.warning} />}
              <Text style={[styles.fullStatusText, progress.isOver && styles.warningText]}>
                {statusLabel}
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  containerCompact: {
    gap: 10,
  },
  containerFull: {
    gap: 8,
  },
  track: {
    flexDirection: 'row',
    overflow: 'hidden',
    backgroundColor: themas.colors.onPrimaryTrack,
  },
  fill: {
    height: '100%',
  },
  captionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  caption: {
    flexShrink: 1,
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 16,
    color: themas.colors.onPrimaryMuted,
  },
  captionWarning: {
    fontFamily: fonts.semibold,
    color: themas.colors.warning,
  },
  fullRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  fullPercent: {
    flexShrink: 1,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  fullStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  fullStatusText: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    lineHeight: 20,
    color: themas.colors.white,
  },
  warningText: {
    color: themas.colors.warning,
  },
});
