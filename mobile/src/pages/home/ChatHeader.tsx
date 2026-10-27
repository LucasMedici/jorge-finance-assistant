// Topo do chat: Jorge com o status, botão do perfil e o resumo do mês com a barra da meta
import { Pressable, Text, View } from 'react-native';
import { GoalBar, JorgeAvatar } from '../../components';
import { getGoalLabels, getGoalProgress } from '../../components/goalProgress';
import { formatCurrency } from '../../global/formatCurrency';
import type { JorgeStatus } from './chat';
import { style } from './styles';

type HeaderProps = {
  status: JorgeStatus;
  profileInitial: string;
  onProfilePress: () => void;
};

export function Header({ status, profileInitial, onProfilePress }: HeaderProps) {
  return (
    <View style={style.header}>
      <JorgeAvatar size={64} accessibilityLabel={null} />
      <View style={style.headerText}>
        <Text style={style.headerName} accessibilityRole="header">
          Jorge
        </Text>
        <View
          style={style.statusRow}
          accessible
          accessibilityLabel={`Jorge: ${status.label}`}
          accessibilityLiveRegion="polite"
        >
          <View style={[style.statusDot, status.tone === 'offline' && style.statusDotOffline]} />
          <Text
            style={[style.statusText, status.tone === 'thinking' && style.statusTextThinking]}
            numberOfLines={1}
          >
            {status.label}
          </Text>
        </View>
      </View>
      <Pressable
        onPress={onProfilePress}
        accessibilityRole="button"
        accessibilityLabel="Perfil"
        style={({ pressed }) => [style.profileButton, pressed && style.pressed]}
      >
        <Text style={style.profileInitial}>{profileInitial}</Text>
      </Pressable>
    </View>
  );
}

type MonthSummaryProps = {
  /** "Gasto em outubro" */
  monthLabel: string;
  /** `null` enquanto não carregou (mostra "—"). */
  monthSpent: number | null;
  todaySpent: number | null;
  /** Meta do mês; `null` sem meta. */
  goal: number | null;
  /** Mostra o convite para definir meta (sem meta e já carregada). */
  showGoalInvite: boolean;
  daysLeft: number;
  /** Abre a folha da meta (definir ou editar). */
  onGoalPress: () => void;
};

export function MonthSummary({
  monthLabel,
  monthSpent,
  todaySpent,
  goal,
  showGoalInvite,
  daysLeft,
  onGoalPress,
}: MonthSummaryProps) {
  const monthText = monthSpent === null ? '—' : formatCurrency(monthSpent);
  const todayText = todaySpent === null ? '—' : formatCurrency(todaySpent);
  const progress = goal !== null && monthSpent !== null ? getGoalProgress(monthSpent, goal) : null;

  return (
    <View style={style.summary}>
      <View style={style.summaryRow}>
        <View
          style={style.summaryMonth}
          accessible
          accessibilityLabel={`${monthLabel}: ${monthText}`}
        >
          <Text style={style.summaryLabel}>{monthLabel}</Text>
          <Text
            style={[style.summaryMonthValue, monthSpent === null && style.summaryPlaceholder]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {monthText}
          </Text>
        </View>
        <View style={style.summaryToday} accessible accessibilityLabel={`Hoje: ${todayText}`}>
          <Text style={style.summaryLabel}>Hoje</Text>
          <Text
            style={[style.summaryTodayValue, todaySpent === null && style.summaryPlaceholder]}
            numberOfLines={1}
          >
            {todayText}
          </Text>
        </View>
      </View>

      {progress && goal !== null && monthSpent !== null ? (
        <Pressable
          onPress={onGoalPress}
          accessibilityRole="button"
          accessibilityLabel={getGoalLabels(progress, goal).accessibilityLabel}
          accessibilityHint="Abre a meta do mês para editar"
          style={({ pressed }) => pressed && style.pressed}
        >
          <GoalBar spent={monthSpent} goal={goal} daysLeft={daysLeft} />
        </Pressable>
      ) : showGoalInvite ? (
        <Pressable
          onPress={onGoalPress}
          accessibilityRole="button"
          hitSlop={14}
          style={({ pressed }) => [style.goalInvite, pressed && style.pressed]}
        >
          <Text style={style.goalInviteText}>Definir uma meta para o mês</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
