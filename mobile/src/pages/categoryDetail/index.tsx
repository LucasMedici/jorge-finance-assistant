import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, Pressable, ScrollView, Text, View } from 'react-native';
import Svg, { Line } from 'react-native-svg';
import { useFocusEffect } from '@react-navigation/native';
import { format, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CorrectTransactionSheet } from '../../components';
import { OTHER_CATEGORY } from '../../global/categories';
import { formatCurrency } from '../../global/formatCurrency';
import { themas } from '../../global/themes';
import type { ReportsStackScreenProps } from '../../routes/types';
import { getTransactions, type Transaction } from '../../services/transactions';
import { ArrowLeftIcon, LegendLine } from '../reports/icons';
import { getPeriodRange, monthName, parseMonthParam, shortMonthName } from '../reports/periods';
import {
  filterByRange,
  findCategoryRow,
  formatHistoryHeadline,
  getCategoryBreakdown,
  getCategoryHistory,
  getEntryAmount,
  getEntryCategory,
  getEntryDate,
  getEntryTitle,
  getHistoryRange,
  isExpense,
  sortByDateDesc,
} from '../reports/summary';
import { style } from './styles';

type LoadStatus = 'loading' | 'ready' | 'error';

// Altura da barra mais alta (o resto é proporcional), como no canvas
const MAX_BAR_HEIGHT = 120;

export default function CategoryDetailPage({
  navigation,
  route,
}: ReportsStackScreenProps<'CategoryDetail'>) {
  const { category } = route.params;
  const monthStart = parseMonthParam(route.params.month, new Date());
  const monthKey = monthStart.getTime();

  const [entries, setEntries] = useState<Transaction[]>([]);
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [editing, setEditing] = useState<Transaction | null>(null);
  const requestId = useRef(0);

  const load = useCallback(async () => {
    const id = ++requestId.current;
    const range = getHistoryRange(new Date(monthKey));
    try {
      const data = await getTransactions(range.start, range.end);
      if (id !== requestId.current) return;
      setEntries(data);
      setStatus('ready');
    } catch (error) {
      if (id !== requestId.current) return;
      console.log('Erro ao buscar transações:', error);
      setStatus('error');
    }
  }, [monthKey]);

  useFocusEffect(
    useCallback(() => {
      load();
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        navigation.goBack();
        return true;
      });
      return () => subscription.remove();
    }, [load, navigation]),
  );

  // Membros e cor vêm do ranking do mês (o "Outros" é o grupo das categorias pequenas)
  const current = filterByRange(entries, getPeriodRange('month', monthStart));
  const previous = filterByRange(entries, getPeriodRange('month', subMonths(monthStart, 1)));
  const row = findCategoryRow(getCategoryBreakdown(current, previous), category);
  const categories = row?.categories ?? [category];
  const color = row?.color ?? themas.categoryOtherColor;
  const isGroup = category === OTHER_CATEGORY && categories.length > 1;

  const history = getCategoryHistory(entries, categories, monthStart);
  const total = history.months[history.months.length - 1].total;
  const maxValue = Math.max(...history.months.map((month) => month.total), history.average ?? 0);
  const barHeight = (value: number) => (maxValue > 0 ? (value / maxValue) * MAX_BAR_HEIGHT : 0);

  const list = sortByDateDesc(
    current.filter((entry) => isExpense(entry) && categories.includes(getEntryCategory(entry))),
  );
  const month = monthName(monthStart);

  const handleSaved = () => {
    setEditing(null);
    load();
  };

  const chartLabel = [
    `${category} por mês:`,
    history.months
      .map((item) => `${monthName(item.start)} ${formatCurrency(item.total)}`)
      .join('; '),
    history.average !== null ? `. Média ${formatCurrency(history.average)}.` : '.',
  ].join(' ');

  return (
    <View style={style.container}>
      <ScrollView contentContainerStyle={style.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={style.header}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={style.back}
            accessibilityRole="button"
            accessibilityLabel="Voltar para relatórios"
          >
            <ArrowLeftIcon />
          </Pressable>
          <View style={[style.dot, { backgroundColor: color }]} />
          <Text style={style.title} accessibilityRole="header" numberOfLines={1}>
            {category}
          </Text>
        </View>

        {status === 'loading' && (
          <View style={style.loading}>
            <ActivityIndicator size="large" color={themas.colors.secondary} />
          </View>
        )}

        {status === 'error' && (
          <View style={style.errorBox}>
            <Text style={style.mutedText}>Não foi possível carregar a categoria.</Text>
            <Pressable onPress={load} style={style.link} accessibilityRole="button">
              <Text style={style.linkText}>Tentar de novo</Text>
            </Pressable>
          </View>
        )}

        {status === 'ready' && (
          <>
            <View style={style.summary}>
              <Text style={style.summaryLabel}>{`Em ${month}`}</Text>
              <Text style={style.summaryValue} numberOfLines={1} adjustsFontSizeToFit>
                {formatCurrency(total)}
              </Text>
              <Text style={style.summaryText}>{formatHistoryHeadline(history)}</Text>
            </View>

            <View style={style.chartSection}>
              <Text style={style.sectionTitle} accessibilityRole="header">
                Últimos 6 meses
              </Text>
              <View
                style={style.bars}
                accessible
                accessibilityRole="image"
                accessibilityLabel={chartLabel}
              >
                {history.average !== null && history.average > 0 && (
                  <Svg
                    width="100%"
                    height={2}
                    style={[style.averageLine, { bottom: barHeight(history.average) - 1 }]}
                  >
                    <Line
                      x1="0"
                      x2="100%"
                      y1={1}
                      y2={1}
                      stroke="rgba(255, 255, 255, 0.4)"
                      strokeWidth={1}
                      strokeDasharray="3 3"
                    />
                  </Svg>
                )}
                {history.months.map((item, index) => {
                  const isCurrent = index === history.months.length - 1;
                  return (
                    <View
                      key={item.start.getTime()}
                      style={[
                        style.bar,
                        {
                          height: barHeight(item.total),
                          backgroundColor: isCurrent ? color : 'rgba(255, 255, 255, 0.28)',
                        },
                      ]}
                    >
                      {isCurrent && item.total > 0 && (
                        <Text style={style.barLabel} numberOfLines={1}>
                          {formatCurrency(Math.round(item.total), { hideZeroCents: true })}
                        </Text>
                      )}
                    </View>
                  );
                })}
              </View>
              <View style={style.monthLabels}>
                {history.months.map((item, index) => (
                  <Text
                    key={item.start.getTime()}
                    style={[
                      style.monthLabel,
                      index === history.months.length - 1 && style.monthLabelCurrent,
                    ]}
                  >
                    {shortMonthName(item.start)}
                  </Text>
                ))}
              </View>
              {history.average !== null && (
                <View style={style.legend}>
                  <LegendLine color="rgba(255, 255, 255, 0.6)" variant="dashed" />
                  <Text style={style.legendText}>
                    {`Média ${history.averageMonths === 1 ? 'do mês' : `dos ${history.averageMonths} meses`}: ${formatCurrency(history.average)}`}
                  </Text>
                </View>
              )}
            </View>

            <View style={style.listSection}>
              <Text style={[style.sectionTitle, style.listTitle]} accessibilityRole="header">
                {`Lançamentos de ${month}`}
              </Text>
              {list.length === 0 && (
                <Text style={style.mutedText}>{`Nenhum lançamento em ${month}.`}</Text>
              )}
              {list.map((entry, index) => {
                const date = format(getEntryDate(entry), "d 'de' MMMM", { locale: ptBR });
                const subtitle = isGroup ? `${getEntryCategory(entry)}, ${date}` : date;
                return (
                  <Pressable
                    key={entry.id}
                    onPress={() => setEditing(entry)}
                    style={({ pressed }) => [
                      style.item,
                      index < list.length - 1 && style.itemDivider,
                      pressed && style.pressed,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`${getEntryTitle(entry)}, ${subtitle}, ${formatCurrency(getEntryAmount(entry))}`}
                    accessibilityHint="Abre a correção do lançamento"
                  >
                    <View style={style.itemInfo}>
                      <Text style={style.itemTitle} numberOfLines={1}>
                        {getEntryTitle(entry)}
                      </Text>
                      <Text style={style.itemSubtitle} numberOfLines={1}>
                        {subtitle}
                      </Text>
                    </View>
                    <Text
                      style={style.itemAmount}
                    >{`− ${formatCurrency(getEntryAmount(entry))}`}</Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>

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
