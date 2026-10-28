import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ChartIcon, ChatIcon, TabBar } from '../components';

import HomePage from '../pages/home';
import ReportsPage from '../pages/reports';
import type { TabParamList } from './types';

const Tab = createBottomTabNavigator<TabParamList>();

export default function TabRoutes() {
  return (
    <Tab.Navigator tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tab.Screen
        name="HomeTab"
        component={HomePage}
        options={{
          tabBarLabel: 'Chat',
          tabBarIcon: ({ color, size }) => <ChatIcon size={size} color={color} />,
        }}
      />

      <Tab.Screen
        name="ReportsTab"
        component={ReportsPage}
        options={{
          tabBarLabel: 'Relatórios',
          tabBarIcon: ({ color, size }) => <ChartIcon size={size} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}
