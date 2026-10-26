// Cálculos da tela de relatórios (funções puras, sem React), testados em __tests__/summary.test.ts

export type TransactionType = "gasto" | "receita" | "outro";

// Item de GET /transactions (model `transaction` do backend)
export type Transaction = {
  id: string;
  type: string;
  amount: number;
  category?: string | null;
  description?: string | null;
  createdAt: string;
};

export const NO_CATEGORY = "Sem categoria";

// Normaliza o tipo vindo da API (string livre gerada pela IA)
export const getEntryType = (entry: Transaction): TransactionType => {
  const type = String(entry?.type ?? "").trim().toLowerCase();
  if (type === "gasto" || type === "receita") return type;
  return "outro";
};

export const getEntryAmount = (entry: Transaction): number => Number(entry?.amount) || 0;

export const getEntryCategory = (entry: Transaction): string => entry.category || NO_CATEGORY;

export type ReportSummary = {
  expenses: Transaction[];
  incomes: Transaction[];
  totalExpenses: number;
  totalIncome: number;
  balance: number;
};

// Só gastos entram no total e no gráfico; receitas e "outro" ficam de fora
export const summarizeTransactions = (entries: Transaction[]): ReportSummary => {
  const expenses = entries.filter((entry) => getEntryType(entry) === "gasto");
  const incomes = entries.filter((entry) => getEntryType(entry) === "receita");

  const totalExpenses = expenses.reduce((sum, entry) => sum + getEntryAmount(entry), 0);
  const totalIncome = incomes.reduce((sum, entry) => sum + getEntryAmount(entry), 0);

  return {
    expenses,
    incomes,
    totalExpenses,
    totalIncome,
    balance: totalIncome - totalExpenses,
  };
};

export type CategoryChartData = {
  labels: string[];
  datasets: { data: number[] }[];
};

// Soma os gastos por categoria, na ordem em que cada categoria aparece (formato do BarChart)
export const getChartDataByCategory = (expenses: Transaction[]): CategoryChartData => {
  const categoryMap = new Map<string, number>();

  expenses.forEach((entry) => {
    const category = getEntryCategory(entry);
    const current = categoryMap.get(category) || 0;
    categoryMap.set(category, current + getEntryAmount(entry));
  });

  return {
    labels: Array.from(categoryMap.keys()),
    datasets: [{ data: Array.from(categoryMap.values()) }],
  };
};
