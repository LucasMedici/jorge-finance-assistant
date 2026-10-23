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
        startDate: startDate.toISOString().split("T")[0],
        endDate: endDate.toISOString().split("T")[0],
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

  // 🔥 Gera dados do gráfico dinamicamente
  const getChartDataByCategory = () => {
    const categoryMap = new Map<string, number>();

    entries.forEach((entry) => {
      const current = categoryMap.get(entry.category) || 0;
      categoryMap.set(entry.category, current + entry.amount);
    });

    const labels = Array.from(categoryMap.keys());
    const data = Array.from(categoryMap.values());

    return {
      labels,
      datasets: [{ data }],
    };
  };

  const chartData = getChartDataByCategory();

  // 🔥 CALCULA A SOMA TOTAL DE GASTOS
  const totalExpenses = entries.reduce((sum, entry) => sum + entry.amount, 0);

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
        <Text style={style.totalAmount}>
          R$ {totalExpenses.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </Text>
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
        ) : entries.length === 0 ? (
          // 🔥 SEM DADOS
          <Text style={{ textAlign: "center", paddingVertical: 20, color: '#ffffff' }}>
            Nenhuma transação encontrada no período.
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

        {entries.slice(0, 10).map((entry) => (
          <View key={entry.id} style={style.lastEntryItem}>
            <Text style={style.lastEntryText}>
              {entry.category} - R$ {entry.amount.toLocaleString("pt-BR")} (
              {format(new Date(entry.createdAt), "dd/MM/yyyy")}
              )
            </Text>
          </View>
        ))}
      </View>

      <View style={{ height: 80 }} />
    </ScrollView>
  );
}
