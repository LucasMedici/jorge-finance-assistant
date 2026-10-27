import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Pressable,
  ScrollView,
  SectionList,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Chip, CorrectTransactionSheet, Sheet } from '../../components';
import { formatCurrency } from '../../global/formatCurrency';
import { themas } from '../../global/themes';
import type { ReportsStackScreenProps } from '../../routes/types';
import { getTransactions, type Transaction } from '../../services/transactions';
import { ArrowLeftIcon, ChevronDownIcon, SearchIcon } from '../reports/icons';
import { getPeriodRange, monthName, parseMonthParam } from '../reports/periods';
import { getEntryCategory, getEntryTitle } from '../reports/summary';
import CategoryIcon from './CategoryIcon';
import { style } from './styles';
import {
  filterTransactions,
  formatEntryCaption,
  formatListSummary,
  formatMonthOption,
  formatSignedAmount,
  getCategoryFilters,
  getRecentMonths,
  groupByDay,
} from './transactionList';

type LoadStatus = 'loading' | 'ready' | 'error';

export default function TransactionsPage({
  navigation,
  route,
}: ReportsStackScreenProps<'Transactions'>) {
  const today = new Date();
  const [month, setMonth] = useState(() => parseMonthParam(route.params?.month, new Date()));
  const [category, setCategory] = useState<string | null>(route.params?.category ?? null);
  const [query, setQuery] = useState('');
  const [entries, setEntries] = useState<Transaction[]>([]);
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [monthSheetOpen, setMonthSheetOpen] = useState(false);
  const requestId = useRef(0);

  const load = useCallback(async () => {
    const id = ++requestId.current;
    const range = getPeriodRange('month', month);
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
  }, [month]);

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

  const chooseMonth = (value: Date) => {
    setMonthSheetOpen(false);
    if (value.getTime() === month.getTime()) return;
    setMonth(value);
    setEntries([]);
    setStatus('loading');
  };

  // Atualiza a lista na hora e confirma com a API (a correção pode ter mudado o mês)
  const handleSaved = (saved: Transaction) => {
    setEditing(null);
    setEntries((list) => list.map((entry) => (entry.id === saved.id ? saved : entry)));
    load();
  };
  const handleDeleted = (id: string) => {
    setEditing(null);
    setEntries((list) => list.filter((entry) => entry.id !== id));
    load();
  };

  const filters = getCategoryFilters(entries);
  if (category !== null && !filters.includes(category)) filters.push(category);
  const filtered = filterTransactions(entries, { query, category });
  const sections = groupByDay(filtered, today).map((group) => ({ ...group, data: group.items }));

  const months = getRecentMonths(today);
  if (!months.some((item) => item.getTime() === month.getTime())) months.push(month);

  const monthLabel = formatMonthOption(month, today);
  const filtering = query.trim() !== '' || category !== null;

  return (
    <View style={style.container}>
      <View style={style.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={style.back}
          accessibilityRole="button"
          accessibilityLabel="Voltar para relatórios"
        >
          <ArrowLeftIcon />
        </Pressable>
        <Text style={style.title} accessibilityRole="header" numberOfLines={1}>
          Lançamentos
        </Text>
        <Pressable
          onPress={() => setMonthSheetOpen(true)}
          style={({ pressed }) => [style.monthButton, pressed && style.pressed]}
          accessibilityRole="button"
          accessibilityLabel={`Mês: ${monthLabel}. Trocar o mês`}
        >
          <Text style={style.monthButtonText} numberOfLines={1}>
            {monthLabel}
          </Text>
          <ChevronDownIcon />
        </Pressable>
      </View>

      <View style={style.controls}>
        <View style={style.search}>
          <SearchIcon color="rgba(255, 255, 255, 0.75)" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar por descrição ou categoria"
            placeholderTextColor="rgba(255, 255, 255, 0.6)"
            returnKeyType="search"
            autoCorrect={false}
            accessibilityLabel="Buscar lançamentos"
            style={style.searchInput}
          />
        </View>

        {filters.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={style.chipsScroll}
            contentContainerStyle={style.chips}
            keyboardShouldPersistTaps="handled"
            accessibilityRole="radiogroup"
            accessibilityLabel="Categoria"
          >
            {[null, ...filters].map((item) => {
              const selected = item === category;
              const label = item ?? 'Todas';
              return (
                <Pressable
                  key={label}
                  onPress={() => setCategory(item)}
                  style={({ pressed }) => [
                    style.chip,
                    selected ? style.chipSelected : style.chipDefault,
                    pressed && style.pressed,
                  ]}
                  hitSlop={4}
                  accessibilityRole="radio"
                  accessibilityLabel={label}
                  accessibilityState={{ checked: selected }}
                >
                  <Text style={[style.chipText, selected && style.chipTextSelected]}>{label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        {status === 'ready' && <Text style={style.summary}>{formatListSummary(filtered)}</Text>}
      </View>

      {status === 'loading' && (
        <View style={style.loading}>
          <ActivityIndicator size="large" color={themas.colors.secondary} />
        </View>
      )}

      {status === 'error' && (
        <View style={style.message}>
          <Text style={style.messageText}>Não foi possível carregar os lançamentos.</Text>
          <Pressable onPress={load} style={style.link} accessibilityRole="button">
            <Text style={style.linkText}>Tentar de novo</Text>
          </Pressable>
        </View>
      )}

      {status === 'ready' && (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          style={style.list}
          contentContainerStyle={style.listContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          stickySectionHeadersEnabled={false}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Text style={[style.messageText, style.empty]}>
              {filtering
                ? 'Nenhum lançamento encontrado.'
                : `Nenhum lançamento em ${monthName(month)}.`}
            </Text>
          }
          renderSectionHeader={({ section }) => (
            <View style={style.dayHeader} accessibilityRole="header">
              <Text style={style.dayTitle}>{section.title}</Text>
              {section.total > 0 && (
                <Text style={style.dayTotal}>{formatCurrency(section.total)}</Text>
              )}
            </View>
          )}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => setEditing(item)}
              style={({ pressed }) => [style.item, pressed && style.pressed]}
              accessibilityRole="button"
              accessibilityLabel={`${getEntryTitle(item)}, ${formatEntryCaption(item)}, ${formatSignedAmount(item)}`}
              accessibilityHint="Abre a correção do lançamento"
            >
              <View style={style.itemIcon}>
                <CategoryIcon category={getEntryCategory(item)} />
              </View>
              <View style={style.itemInfo}>
                <Text style={style.itemTitle} numberOfLines={1}>
                  {getEntryTitle(item)}
                </Text>
                <Text style={style.itemCaption} numberOfLines={1}>
                  {formatEntryCaption(item)}
                </Text>
              </View>
              <Text style={style.itemAmount}>{formatSignedAmount(item)}</Text>
            </Pressable>
          )}
        />
      )}

      <Sheet
        visible={monthSheetOpen}
        onClose={() => setMonthSheetOpen(false)}
        closeAccessibilityLabel="Fechar a escolha do mês"
      >
        <Text style={style.sheetTitle} accessibilityRole="header">
          Escolha o mês
        </Text>
        <View style={style.sheetMonths} accessibilityRole="radiogroup">
          {months.map((item) => (
            <Chip
              key={item.getTime()}
              label={formatMonthOption(item, today)}
              selected={item.getTime() === month.getTime()}
              onPress={() => chooseMonth(item)}
            />
          ))}
        </View>
      </Sheet>

      <CorrectTransactionSheet
        visible={editing !== null}
        transaction={editing}
        onClose={() => setEditing(null)}
        onSaved={handleSaved}
        onDeleted={handleDeleted}
      />
    </View>
  );
}
