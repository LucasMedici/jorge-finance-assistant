import type { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

// Pilha da aba Relatórios (reports.routes.tsx). `month` sempre em `yyyy-MM`.
export type ReportsStackParamList = {
  Reports: undefined;
  /** `category` = nome da categoria, ou "Outros" para o grupo das categorias pequenas do mês. */
  CategoryDetail: { category: string; month: string };
  /** Sem `month`, o mês atual; `category` já abre com o filtro escolhido. */
  Transactions: { month?: string; category?: string } | undefined;
};

// Abas do MainApp (tab.routes.tsx)
export type TabParamList = {
  HomeTab: undefined;
  ReportsTab: NavigatorScreenParams<ReportsStackParamList> | undefined;
};

// Stack raiz (stack.routes.tsx). Login/Register só existem sem user; MainApp/Profile só com user.
export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  MainApp: NavigatorScreenParams<TabParamList> | undefined;
  Profile: undefined;
};

export type RootStackScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<
  RootStackParamList,
  T
>;

// Telas das abas também navegam no stack raiz (ex.: Home -> Profile)
export type TabScreenProps<T extends keyof TabParamList> = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, T>,
  RootStackScreenProps<keyof RootStackParamList>
>;

// Telas da pilha de Relatórios: navegam na pilha, nas abas e no stack raiz
export type ReportsStackScreenProps<T extends keyof ReportsStackParamList> = CompositeScreenProps<
  NativeStackScreenProps<ReportsStackParamList, T>,
  TabScreenProps<'ReportsTab'>
>;

// Tipagem padrão de useNavigation()
declare global {
  namespace ReactNavigation {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface RootParamList extends RootStackParamList {}
  }
}
