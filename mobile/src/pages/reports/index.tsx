import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  BackHandler,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { BarChart } from "react-native-chart-kit";
import DateTimePicker from "@react-native-community/datetimepicker";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { style } from "./styles";
import { themas } from "../../global/themes";
import { api } from "../../services/api";

type TransactionType = "gasto" | "receita" | "outro";

// Normaliza o tipo vindo da API (string livre gerada pela IA)
const getEntryType = (entry: any): TransactionType => {
  const type = String(entry?.type ?? "").trim().toLowerCase();
  if (type === "gasto" || type === "receita") return type;
  return "outro";
};

const getEntryAmount = (entry: any): number => Number(entry?.amount) || 0;

const formatCurrency = (value: number) =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Data local em YYYY-MM-DD (toISOString usa UTC e pula um dia à noite no Brasil)
const toApiDate = (date: Date) => format(date, "yyyy-MM-dd");

export default function ReportsPage({ navigation }: any) {
  const screenWidth = Dimensions.get("window").width;

  const [startDate, setStartDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  );
  const [endDate, setEndDate] = useState(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const [entries, setEntries] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // 🔥 FUNÇÃO QUE CHAMA SUA API
  const fetchTransactions = async () => {
    try {
      setIsLoading(true);

      const payload = {
        startDate: toApiDate(startDate),
        endDate: toApiDate(endDate),
      };


      const response = await api.get('/transactions', { params: payload });
      setEntries(response.data || []);
    } catch (err) {
      console.log("Erro ao buscar transações:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // 🔥 BUSCA QUANDO A PÁGINA ABRE
  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        BackHandler.exitApp();
        return true;
      };

      fetchTransactions(); // busca ao entrar

      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        onBackPress
      );

      return () => subscription.remove();
    }, [])
  );

  // 🔥 BUSCA QUANDO AS DATAS MUDAM
  useEffect(() => {
    fetchTransactions();
  }, [startDate, endDate]);

  // Só gastos entram no total e no gráfico; receitas e "outro" ficam de fora
  const expenses = entries.filter((entry) => getEntryType(entry) === "gasto");
  const incomes = entries.filter((entry) => getEntryType(entry) === "receita");

  // 🔥 Gera dados do gráfico dinamicamente
  const getChartDataByCategory = () => {
    const categoryMap = new Map<string, number>();

    expenses.forEach((entry) => {
      const category = entry.category || "Sem categoria";
      const current = categoryMap.get(category) || 0;
      categoryMap.set(category, current + getEntryAmount(entry));
    });

    const labels = Array.from(categoryMap.keys());
    const data = Array.from(categoryMap.values());

    return {
      labels,
      datasets: [{ data }],
    };
  };

  const chartData = getChartDataByCategory();

  // 🔥 CALCULA OS TOTAIS DO PERÍODO
  const totalExpenses = expenses.reduce((sum, entry) => sum + getEntryAmount(entry), 0);
  const totalIncome = incomes.reduce((sum, entry) => sum + getEntryAmount(entry), 0);
  const balance = totalIncome - totalExpenses;

  const handleStartDateChange = (event: any, selectedDate?: Date) => {
    setShowStartPicker(false);
    if (selectedDate) setStartDate(selectedDate);
  };

  const handleEndDateChange = (event: any, selectedDate?: Date) => {
    setShowEndPicker(false);
    if (selectedDate) setEndDate(selectedDate);
  };

  return (
    <ScrollView style={style.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={style.header}>
        <View style={{ flex: 1, marginLeft: 15 }}>
          <Text style={style.headerTitle}>Relatórios</Text>
          <Text style={style.headerSubtitle}>Análise de gastos</Text>
        </View>
      </View>

      {/* Seleção de datas */}
      <View style={style.datePickerContainer}>
        <TouchableOpacity
          style={style.datePickerButton}
          onPress={() => setShowStartPicker(true)}
        >
          <Text style={style.datePickerText}>
            Início: {format(startDate, "dd/MM/yyyy", { locale: ptBR })}
          </Text>
        </TouchableOpacity>
        {showStartPicker && (
          <DateTimePicker
            value={startDate}
            mode="date"
            display="default"
            onChange={handleStartDateChange}
          />
        )}

        <TouchableOpacity
          style={style.datePickerButton}
          onPress={() => setShowEndPicker(true)}
        >
          <Text style={style.datePickerText}>
            Fim: {format(endDate, "dd/MM/yyyy", { locale: ptBR })}
          </Text>
        </TouchableOpacity>
        {showEndPicker && (
          <DateTimePicker
            value={endDate}
            mode="date"
            display="default"
            onChange={handleEndDateChange}
          />
        )}
      </View>

      {/* Card de Total de Gastos */}
      <View style={style.totalContainer}>
        <Text style={style.totalLabel}>Total de Gastos</Text>
        <Text style={style.totalAmount}>R$ {formatCurrency(totalExpenses)}</Text>
      </View>

      {/* Receitas e saldo do período */}
      <View style={style.summaryContainer}>
        <View style={style.summaryCard}>
          <Text style={style.summaryLabel}>Receitas</Text>
          <Text style={style.summaryAmount}>R$ {formatCurrency(totalIncome)}</Text>
        </View>
        <View style={[style.summaryCard, balance < 0 && style.summaryCardNegative]}>
          <Text style={style.summaryLabel}>Saldo</Text>
          <Text style={[style.summaryAmount, balance < 0 && style.summaryAmountNegative]}>
            {balance < 0 ? "- " : ""}R$ {formatCurrency(Math.abs(balance))}
          </Text>
        </View>
      </View>

      {/* Gráfico */}
      <View style={style.chartContainer}>
        <Text style={style.chartTitle}>Gastos por Categoria</Text>

        {isLoading ? (
          // 🔥 LOADING NO LUGAR DO GRÁFICO
          <View
            style={{
              height: 200,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <ActivityIndicator size="large" color={themas.colors.secondary} />
          </View>
        ) : expenses.length === 0 ? (
          // 🔥 SEM DADOS
          <Text style={{ textAlign: "center", paddingVertical: 20, color: '#ffffff' }}>
            Nenhum gasto encontrado no período.
          </Text>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={style.chartScrollContainer}
          >
            <BarChart
              data={chartData}
              width={Math.max(chartData.labels.length * 80, screenWidth - 100)}
              height={200}
              yAxisLabel="R$ "
              yAxisSuffix=""
              chartConfig={{
                backgroundColor: themas.colors.primary,
                backgroundGradientFrom: themas.colors.primary,
                backgroundGradientTo: themas.colors.primary,
                color: () => themas.colors.secondary,
                labelColor: () => "#FFFFFF",
                decimalPlaces: 0,
                propsForBackgroundLines: {
                  strokeWidth: "1",
                  stroke: "rgba(141, 198, 62, 0.2)",
                  strokeDasharray: "5,5",
                },
                propsForLabels: { fontSize: 10 },
              }}
              style={{ borderRadius: 8, marginVertical: 8 }}
              withInnerLines={true}
              fromZero={true}
              segments={3}
            />
          </ScrollView>
        )}
      </View>

      {/* Últimas entradas */}
      <View style={style.lastEntriesContainer}>
        <Text style={style.lastEntriesTitle}>Últimas Entradas</Text>

        {entries.length === 0 && !isLoading && (
          <Text style={style.lastEntryEmpty}>Nenhuma transação encontrada no período.</Text>
        )}

        {entries.slice(0, 10).map((entry) => {
          const type = getEntryType(entry);
          const sign = type === "receita" ? "+ " : type === "gasto" ? "- " : "";

          return (
            <View
              key={entry.id}
              style={[
                style.lastEntryItem,
                type === "gasto" && style.lastEntryItemExpense,
                type === "outro" && style.lastEntryItemOther,
              ]}
            >
              <View style={style.lastEntryInfo}>
                <Text style={style.lastEntryText}>{entry.category || "Sem categoria"}</Text>
                <Text style={style.lastEntryDate}>
                  {type === "receita" ? "Receita" : type === "gasto" ? "Gasto" : "Outro"} ·{" "}
                  {format(new Date(entry.createdAt), "dd/MM/yyyy")}
                </Text>
              </View>
              <Text
                style={[
                  style.lastEntryAmount,
                  type === "receita" && style.lastEntryAmountIncome,
                  type === "outro" && style.lastEntryAmountOther,
                ]}
              >
                {sign}R$ {formatCurrency(getEntryAmount(entry))}
              </Text>
            </View>
          );
        })}
      </View>

      <View style={{ height: 80 }} />
    </ScrollView>
  );
}
