import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, Pressable, ScrollView, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { format, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  AlertIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CorrectTransactionSheet,
  GoalBar,
  GoalSheet,
  SegmentedControl,
} from '../../components';
import { formatCurrency } from '../../global/formatCurrency';
import { themas } from '../../global/themes';
import { useAverageMonthlySpending } from '../../hooks/useAverageMonthlySpending';
import { useMonthlyGoal } from '../../hooks/useMonthlyGoal';
import type { ReportsStackScreenProps } from '../../routes/types';
import { getTransactions, type Transaction } from '../../services/transactions';
import { LegendLine } from './icons';
import PaceChart from './PaceChart';
import {
  PERIOD_OPTIONS,
  type ReportPeriod,
  canGoForward,
  capitalize,
  formatPeriodTitle,
  formatSpentLabel,
  getComparisonNames,
  getPeriodRange,
  getPreviousRange,
  isCurrentPeriod,
  monthName,
  shiftAnchor,
  toMonthParam,
} from './periods';
import { style } from './styles';
import {
  type CategoryRow,
  filterByRange,
  formatCategoryCaption,
  formatChange,
  formatGoalWarning,
  formatPaceSentence,
  getCategoryBreakdown,
  getEntryAmount,
  getEntryCategory,
  getEntryDate,
  getEntryTitle,
  hasDescription,
  getGoalForecast,
  getMonthPace,
  getPercentChange,
  getTopExpenses,
  sumExpenses,
} from './summary';

type LoadStatus = 'loading' | 'ready' | 'error';

export default function ReportsPage({ navigation }: ReportsStackScreenProps<'Reports'>) {
  const [period, setPeriod] = useState<ReportPeriod>('month');
  const [anchor, setAnchor] = useState(() => new Date());
  const [entries, setEntries] = useState<Transaction[]>([]);
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [goalSheetOpen, setGoalSheetOpen] = useState(false);
  const requestId = useRef(0);

  const { goal, loading: goalLoading, save: saveGoal } = useMonthlyGoal();
  const averageSpending = useAverageMonthlySpending(goalSheetOpen);

  const today = new Date();
  const range = getPeriodRange(period, anchor);
  const previousRange = getPreviousRange(period, anchor);
  const isCurrent = isCurrentPeriod(period, anchor, today);
  const isMonth = period === 'month';

  // Período atual + anterior numa busca só (o anterior é a base das comparações)
  const load = useCallback(async () => {
    const id = ++requestId.current;
    const current = getPeriodRange(period, anchor);
    const previous = getPreviousRange(period, anchor);
    setStatus((value) => (value === 'ready' ? value : 'loading'));
    try {
      const data = await getTransactions(previous.start, current.end);
      if (id !== requestId.current) return;
      setEntries(data);
      setStatus('ready');
    } catch (error) {
      if (id !== requestId.current) return;
      console.log('Erro ao buscar transações:', error);
      setStatus('error');
    }
  }, [period, anchor]);

  // Busca ao entrar na tela (e ao voltar do detalhe/lançamentos, que podem ter corrigido algo)
  useFocusEffect(
    useCallback(() => {
      load();
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        BackHandler.exitApp();
        return true;
      });
      return () => subscription.remove();
    }, [load]),
  );

  const changePeriod = (value: ReportPeriod) => {
    setPeriod(value);
    setAnchor(new Date());
    setEntries([]);
    setStatus('loading');
  };

  const step = (direction: -1 | 1) => {
    setAnchor((value) => shiftAnchor(period, value, direction));
    setEntries([]);
    setStatus('loading');
  };

  // Recortes do período
  const currentEntries = filterByRange(entries, range);
  const previousEntries = filterByRange(entries, previousRange);
  const spent = sumExpenses(currentEntries);
  const names = getComparisonNames(period, previousRange);
  const categoryRows = getCategoryBreakdown(currentEntries, previousEntries);
  const topExpenses = getTopExpenses(currentEntries);
  // "Ver todos os lançamentos" abre a lista do mês (inclui receitas, para poder corrigi-las)
  const showSeeAll = isMonth && currentEntries.length > 0;

  // Mês usado pelo detalhe da categoria: o do painel, ou o último mês do período (até hoje)
  const detailMonth = isMonth ? range.start : startOfMonth(range.end < today ? range.end : today);

  const monthStart = range.start;
  const pace = isMonth ? getMonthPace(entries, monthStart, today) : null;
  const forecast = pace && goal ? getGoalForecast(pace, goal) : null;

  const openCategory = (row: CategoryRow) =>
    navigation.navigate('CategoryDetail', {
      category: row.label,
      month: toMonthParam(detailMonth),
    });

  const handleSaved = () => {
    setEditing(null);
    load();
  };

  const ready = status === 'ready';

  return (
    <View style={style.container}>
      <ScrollView contentContainerStyle={style.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={style.header}>
          <Text style={style.title} accessibilityRole="header">
            Relatórios
          </Text>
          <SegmentedControl
            tone="dark"
            options={PERIOD_OPTIONS}
            value={period}
            onChange={changePeriod}
            accessibilityLabel="Período"
          />
          <View style={style.periodRow}>
            <Pressable
              onPress={() => step(-1)}
              style={style.periodArrow}
              accessibilityRole="button"
              accessibilityLabel="Período anterior"
            >
              <ChevronLeftIcon color={themas.colors.white} />
            </Pressable>
            <Text style={style.periodTitle} numberOfLines={1}>
              {formatPeriodTitle(period, range)}
            </Text>
            <Pressable
              onPress={() => step(1)}
              disabled={!canGoForward(period, anchor, today)}
              style={style.periodArrow}
              accessibilityRole="button"
              accessibilityLabel="Próximo período"
              accessibilityState={{ disabled: !canGoForward(period, anchor, today) }}
            >
              <ChevronRightIcon
                color={
                  canGoForward(period, anchor, today)
                    ? themas.colors.white
                    : 'rgba(255, 255, 255, 0.35)'
                }
              />
            </Pressable>
          </View>
        </View>

        {status === 'loading' && (
          <View style={style.loading}>
            <ActivityIndicator size="large" color={themas.colors.secondary} />
          </View>
        )}

        {status === 'error' && (
          <View style={style.errorBox}>
            <Text style={style.errorText}>Não foi possível carregar os relatórios.</Text>
            <Pressable onPress={load} style={style.link} accessibilityRole="button" hitSlop={4}>
              <Text style={style.linkText}>Tentar de novo</Text>
            </Pressable>
          </View>
        )}

        {ready && (
          <>
            {/* Total do período e meta */}
            <View style={[style.section, style.totalSection]}>
              <View style={style.totalHeader}>
                <Text style={style.totalLabel}>{formatSpentLabel(period, range, isCurrent)}</Text>
                <Text style={style.totalValue} numberOfLines={1} adjustsFontSizeToFit>
                  {formatCurrency(spent)}
                </Text>
                {!isMonth && (
                  <Text style={style.totalComparison}>
                    {capitalize(
                      formatChange(getPercentChange(spent, sumExpenses(previousEntries)), names),
                    )}
                  </Text>
                )}
              </View>

              {isMonth && goal !== null && (
                <GoalBar spent={spent} goal={goal} variant="full" showRemaining={isCurrent} />
              )}

              {isMonth && isCurrent && goal !== null && (
                <Pressable
                  onPress={() => setGoalSheetOpen(true)}
                  style={style.link}
                  accessibilityRole="button"
                >
                  <Text style={style.linkText}>Editar meta do mês</Text>
                </Pressable>
              )}

              {isMonth && isCurrent && goal === null && !goalLoading && (
                <View style={style.goalInvite}>
                  <Text style={style.goalInviteText}>
                    Com uma meta, você vê quanto ainda pode gastar até o fim do mês.
                  </Text>
                  <Pressable
                    onPress={() => setGoalSheetOpen(true)}
                    style={style.link}
                    accessibilityRole="button"
                  >
                    <Text style={style.linkText}>Definir meta do mês</Text>
                  </Pressable>
                </View>
              )}
            </View>

            {/* Ritmo do mês */}
            {pace && (
              <View style={[style.section, style.sectionDivider, style.paceSection]}>
                <View style={style.sectionHeader}>
                  <Text style={style.sectionTitle} accessibilityRole="header">
                    Ritmo do mês
                  </Text>
                  <Text style={style.sectionText}>{formatPaceSentence(pace, monthStart)}</Text>
                </View>

                {(pace.spent > 0 || pace.previous.some((value) => value > 0)) && (
                  <>
                    <PaceChart pace={pace} monthStart={monthStart} goal={goal} />
                    <View style={style.legend}>
                      <View style={style.legendItem}>
                        <LegendLine color={themas.colors.secondary} variant="solid" />
                        <Text style={style.legendText}>{capitalize(monthName(monthStart))}</Text>
                      </View>
                      {pace.previous.some((value) => value > 0) && (
                        <View style={style.legendItem}>
                          <LegendLine color="rgba(255, 255, 255, 0.55)" variant="dashed" />
                          <Text style={style.legendText}>
                            {capitalize(monthName(previousRange.start))}
                          </Text>
                        </View>
                      )}
                      {pace.projection !== null && (
                        <View style={style.legendItem}>
                          <LegendLine color={themas.colors.secondary} variant="dotted" />
                          <Text style={style.legendText}>Projeção</Text>
                        </View>
                      )}
                      {goal !== null && (
                        <View style={style.legendItem}>
                          <LegendLine color={themas.colors.warning} variant="dashed" />
                          <Text style={style.legendText}>Meta</Text>
                        </View>
                      )}
                    </View>
                  </>
                )}

                {forecast && goal !== null && (
                  <View style={style.warning} accessibilityRole="alert">
                    <View style={style.warningIcon}>
                      <AlertIcon size={18} color={themas.colors.warning} />
                    </View>
                    <Text style={style.warningText}>
                      {formatGoalWarning(forecast, monthStart, pace.spent, goal).map(
                        (part, index) => (
                          <Text key={index} style={part.strong ? style.warningStrong : undefined}>
                            {part.text}
                          </Text>
                        ),
                      )}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Para onde foi o dinheiro */}
            <View style={[style.section, style.sectionDivider, style.categoriesSection]}>
              <Text style={style.sectionTitle} accessibilityRole="header">
                Para onde foi o dinheiro
              </Text>
              {categoryRows.length === 0 ? (
                <Text style={style.sectionText}>Nenhum gasto nesse período.</Text>
              ) : (
                categoryRows.map((row, index) => {
                  const caption = formatCategoryCaption(row, names);
                  const first = index === 0;
                  return (
                    <Pressable
                      key={row.label}
                      onPress={() => openCategory(row)}
                      style={({ pressed }) => [style.categoryRow, pressed && style.pressed]}
                      accessibilityRole="button"
                      accessibilityLabel={`${row.label}: ${formatCurrency(row.total)}, ${caption}`}
                      accessibilityHint="Abre o detalhe da categoria"
                    >
                      <View style={style.categoryTop}>
                        <Text style={[style.categoryName, first && style.strong]} numberOfLines={1}>
                          {row.label}
                        </Text>
                        <View style={style.categoryValueBox}>
                          <Text style={[style.categoryValue, first && style.strong]}>
                            {formatCurrency(row.total)}
                          </Text>
                          <ChevronRightIcon size={16} color="rgba(255, 255, 255, 0.6)" />
                        </View>
                      </View>
                      <View style={style.barTrack}>
                        <View
                          style={[
                            style.barFill,
                            { width: `${row.fill * 100}%`, backgroundColor: row.color },
                          ]}
                        />
                      </View>
                      <Text style={[style.categoryCaption, first && style.categoryCaptionFirst]}>
                        {caption}
                      </Text>
                    </Pressable>
                  );
                })
              )}
            </View>

            {/* Maiores gastos */}
            {(topExpenses.length > 0 || showSeeAll) && (
              <View style={[style.section, style.sectionDivider, style.topSection]}>
                {topExpenses.length > 0 && (
                  <Text style={[style.sectionTitle, style.topTitle]} accessibilityRole="header">
                    Maiores gastos
                  </Text>
                )}
                {topExpenses.map((entry) => {
                  const date = getEntryDate(entry);
                  return (
                    <Pressable
                      key={entry.id}
                      onPress={() => setEditing(entry)}
                      style={({ pressed }) => [style.topRow, pressed && style.pressed]}
                      accessibilityRole="button"
                      accessibilityLabel={`${getEntryTitle(entry)}, ${getEntryCategory(entry)}, ${format(date, "d 'de' MMMM", { locale: ptBR })}, ${formatCurrency(getEntryAmount(entry))}`}
                      accessibilityHint="Abre a correção do lançamento"
                    >
                      <View style={style.dateBox}>
                        <Text style={style.dateDay}>{date.getDate()}</Text>
                        <Text style={style.dateMonth}>{format(date, 'MMM', { locale: ptBR })}</Text>
                      </View>
                      <View style={style.topInfo}>
                        <Text style={style.topName} numberOfLines={1}>
                          {getEntryTitle(entry)}
                        </Text>
                        {hasDescription(entry) && (
                          <Text style={style.topCategory} numberOfLines={1}>
                            {getEntryCategory(entry)}
                          </Text>
                        )}
                      </View>
                      <Text style={style.topAmount}>
                        {`− ${formatCurrency(getEntryAmount(entry))}`}
                      </Text>
                    </Pressable>
                  );
                })}
                {showSeeAll && (
                  <Pressable
                    onPress={() =>
                      navigation.navigate('Transactions', { month: toMonthParam(monthStart) })
                    }
                    style={style.seeAll}
                    accessibilityRole="button"
                  >
                    <Text style={style.seeAllText}>
                      {currentEntries.length === 1
                        ? 'Ver o lançamento'
                        : `Ver todos os ${currentEntries.length} lançamentos`}
                    </Text>
                  </Pressable>
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>

      <GoalSheet
        visible={goalSheetOpen}
        onClose={() => setGoalSheetOpen(false)}
        currentGoal={goal}
        averageSpending={averageSpending}
        onSave={saveGoal}
      />

      <CorrectTransactionSheet
        visible={editing !== null}
        transaction={editing}
        onClose={() => setEditing(null)}
        onSaved={handleSaved}
        onDeleted={handleSaved}
      />
    </View>
  );
}
