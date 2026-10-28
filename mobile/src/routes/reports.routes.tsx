import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { themas } from '../global/themes';
import CategoryDetailPage from '../pages/categoryDetail';
import ReportsPage from '../pages/reports';
import TransactionsPage from '../pages/transactions';
import type { ReportsStackParamList } from './types';

const Stack = createNativeStackNavigator<ReportsStackParamList>();

// Pilha da aba Relatórios: o painel e as telas que ele abre, todas com a barra de abas visível
export default function ReportsRoutes() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'none',
        contentStyle: { backgroundColor: themas.colors.primary },
      }}
    >
      <Stack.Screen name="Reports" component={ReportsPage} />
      <Stack.Screen name="CategoryDetail" component={CategoryDetailPage} />
      <Stack.Screen name="Transactions" component={TransactionsPage} />
    </Stack.Navigator>
  );
}
