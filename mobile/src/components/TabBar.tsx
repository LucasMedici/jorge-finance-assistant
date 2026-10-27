import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { fonts } from '../global/fonts';
import { themas } from '../global/themes';

const ACTIVE_COLOR = themas.colors.secondary;
const INACTIVE_COLOR = themas.colors.onPrimaryMuted;
const ICON_SIZE = 22;

// Barra de abas do v2 (Chat / Relatórios), para o `tabBar` do Bottom Tab Navigator:
//   <Tab.Navigator tabBar={(props) => <TabBar {...props} />}>
// Rótulo vem de `tabBarLabel` (string) ou `title`; ícone de `tabBarIcon` (ex.: ChatIcon, ChartIcon),
// chamado com a cor da aba (verde quando selecionada).
export default function TabBar({ state, descriptors, navigation, insets }: BottomTabBarProps) {
  return (
    <View
      accessibilityRole="tablist"
      style={[styles.bar, { height: BAR_HEIGHT + insets.bottom, paddingBottom: insets.bottom }]}
    >
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const focused = state.index === index;
        const color = focused ? ACTIVE_COLOR : INACTIVE_COLOR;
        const label =
          typeof options.tabBarLabel === 'string'
            ? options.tabBarLabel
            : (options.title ?? route.name);

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!focused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        const onLongPress = () => {
          navigation.emit({ type: 'tabLongPress', target: route.key });
        };

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            onLongPress={onLongPress}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
            testID={options.tabBarButtonTestID}
            style={styles.tab}
          >
            <View style={[styles.iconPill, focused && styles.iconPillActive]}>
              {options.tabBarIcon?.({ focused, color, size: ICON_SIZE })}
            </View>
            <Text style={[styles.label, focused ? styles.labelActive : styles.labelInactive]}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const BAR_HEIGHT = 64;

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: themas.colors.onPrimaryDivider,
    backgroundColor: themas.colors.tabBar,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  iconPill: {
    flexDirection: 'row',
    paddingVertical: 4,
    paddingHorizontal: 18,
    borderRadius: themas.radius.lg,
  },
  iconPillActive: {
    backgroundColor: themas.colors.secondarySoft,
  },
  label: {
    fontSize: 12,
    lineHeight: 14,
  },
  labelActive: {
    fontFamily: fonts.semibold,
    color: ACTIVE_COLOR,
  },
  labelInactive: {
    fontFamily: fonts.medium,
    color: INACTIVE_COLOR,
  },
});
