import { useEffect, useMemo, useRef, useState } from 'react';
import { LayoutChangeEvent, PanResponder, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';
import { subMonths } from 'date-fns';
import { fonts } from '../../global/fonts';
import { formatCurrency } from '../../global/formatCurrency';
import { themas } from '../../global/themes';
import { capitalize, monthName, shortMonthName } from './periods';
import { dayFromX, getChartScale, getSeriesPoints, toPath } from './chartScale';
import type { MonthPace } from './summary';

type PaceChartProps = {
  pace: MonthPace;
  monthStart: Date;
  /** Meta do mês (linha âmbar); `null` sem meta. */
  goal: number | null;
};

const HEIGHT = 176;
const PLOT_TOP = 12;
const PLOT_BOTTOM = 150;
const AXIS_LABEL_Y = 170;
const TOOLTIP_WIDTH = 164;
// Quanto tempo o valor do dia continua na tela depois de soltar o dedo
const TOOLTIP_HIDE_MS = 2500;

const MUTED_LABEL = 'rgba(255, 255, 255, 0.6)';
const PREVIOUS_LINE = 'rgba(255, 255, 255, 0.45)';
const AXIS_LINE = 'rgba(255, 255, 255, 0.22)';

const money = (value: number) => formatCurrency(value, { hideZeroCents: true });

// Gasto acumulado do mês contra o mês anterior, com a linha da meta e a projeção até o fim do mês.
// Tocar ou arrastar no gráfico mostra os valores do dia.
export default function PaceChart({ pace, monthStart, goal }: PaceChartProps) {
  const [width, setWidth] = useState(0);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Valores lidos pelo PanResponder (criado uma vez)
  const touchState = useRef({ width, days: pace.daysInMonth });
  touchState.current = { width, days: pace.daysInMonth };

  useEffect(
    () => () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    },
    [],
  );

  const panResponder = useMemo(() => {
    const select = (x: number) => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      const { width: chartWidth, days } = touchState.current;
      setSelectedDay(dayFromX(x, chartWidth, days));
    };
    const scheduleHide = () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(() => setSelectedDay(null), TOOLTIP_HIDE_MS);
    };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: (event) => select(event.nativeEvent.locationX),
      onPanResponderMove: (event) => select(event.nativeEvent.locationX),
      onPanResponderRelease: scheduleHide,
      // A rolagem da tela tomou o gesto: some com o valor
      onPanResponderTerminate: () => setSelectedDay(null),
      onPanResponderTerminationRequest: () => true,
    });
  }, []);

  // Um mês trocado (ou dados novos) apaga a seleção
  const [selectionKey, setSelectionKey] = useState(pace);
  if (selectionKey !== pace) {
    setSelectionKey(pace);
    setSelectedDay(null);
  }

  const handleLayout = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width);

  const { daysInMonth, refDay, current, previous, spent, projection } = pace;
  const monthLabel = capitalize(monthName(monthStart));
  const previousStart = subMonths(monthStart, 1);
  const previousLabel = capitalize(monthName(previousStart));
  const shortMonth = shortMonthName(monthStart);

  const maxValue = Math.max(spent, projection ?? 0, goal ?? 0, previous[previous.length - 1] ?? 0);
  const { yMax, ticks } = getChartScale(maxValue);
  const y = (value: number) => PLOT_BOTTOM - (value / yMax) * (PLOT_BOTTOM - PLOT_TOP);

  const currentPoints = getSeriesPoints(current, daysInMonth, width).map((p) => ({
    x: p.x,
    y: y(p.value),
  }));
  const previousPoints = getSeriesPoints(previous, daysInMonth, width).map((p) => ({
    x: p.x,
    y: y(p.value),
  }));
  const lastPoint = currentPoints[currentPoints.length - 1];
  const goalY = goal ? y(goal) : null;

  // Grade sem encostar no rótulo da meta nem no topo
  const visibleTicks = ticks.filter(
    (tick) => y(tick) > PLOT_TOP + 10 && (goalY === null || Math.abs(y(tick) - goalY) > 18),
  );

  // Rótulos do eixo X: "hoje" (mês atual) e as pontas, sem sobrepor
  const todayX = lastPoint.x;
  const showToday = pace.isCurrentMonth;
  const showStart = !showToday || todayX > 44;
  const showEnd = !showToday || width - todayX > 50;

  const accessibilityLabel = [
    `Gasto acumulado em ${monthName(monthStart)} comparado a ${monthName(previousStart)}.`,
    `${monthLabel}: ${formatCurrency(spent)} até o dia ${refDay};`,
    `${monthName(previousStart)} tinha ${formatCurrency(pace.previousAtSameDay)} no mesmo dia.`,
    projection !== null ? `Projeção para o fim do mês: ${money(Math.round(projection))}.` : '',
    goal ? `Meta: ${money(goal)}.` : '',
  ]
    .filter(Boolean)
    .join(' ');

  // Valores do dia tocado
  let tooltip: { x: number; rows: { label: string; value: number; color: string }[] } | null = null;
  if (selectedDay !== null && width > 0) {
    const rows: { label: string; value: number; color: string }[] = [];
    if (selectedDay <= current.length) {
      rows.push({
        label: monthLabel,
        value: current[selectedDay - 1],
        color: themas.colors.secondary,
      });
    } else if (projection !== null) {
      rows.push({
        label: 'Projeção',
        value: (spent / refDay) * selectedDay,
        color: themas.colors.secondary,
      });
    }
    if (selectedDay <= previous.length) {
      rows.push({ label: previousLabel, value: previous[selectedDay - 1], color: PREVIOUS_LINE });
    }
    tooltip = { x: (selectedDay / daysInMonth) * width, rows };
  }

  return (
    <View
      style={styles.container}
      onLayout={handleLayout}
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
      {...panResponder.panHandlers}
    >
      {width > 0 && (
        <Svg width={width} height={HEIGHT} style={styles.svg}>
          {visibleTicks.map((tick) => (
            <Line
              key={`grid-${tick}`}
              x1={0}
              x2={width}
              y1={y(tick)}
              y2={y(tick)}
              stroke={themas.colors.onPrimaryDivider}
              strokeWidth={1}
            />
          ))}
          {goalY !== null && (
            <Line
              x1={0}
              x2={width}
              y1={goalY}
              y2={goalY}
              stroke={themas.colors.warning}
              strokeOpacity={0.85}
              strokeWidth={1.5}
              strokeDasharray="6 4"
            />
          )}
          <Line
            x1={0}
            x2={width}
            y1={PLOT_BOTTOM}
            y2={PLOT_BOTTOM}
            stroke={AXIS_LINE}
            strokeWidth={1}
          />

          {visibleTicks.map((tick) => (
            <SvgText
              key={`tick-${tick}`}
              x={0}
              y={y(tick) - 4}
              fill={MUTED_LABEL}
              fontSize={11}
              fontFamily={fonts.regular}
            >
              {money(tick)}
            </SvgText>
          ))}
          {goalY !== null && goal !== null && (
            <SvgText
              x={0}
              y={goalY - 4}
              fill={themas.colors.warning}
              fontSize={11}
              fontFamily={fonts.semibold}
            >
              {`Meta ${money(goal)}`}
            </SvgText>
          )}

          {previous.some((value) => value > 0) && (
            <Path
              d={toPath(previousPoints)}
              stroke={PREVIOUS_LINE}
              strokeWidth={2}
              strokeDasharray="4 4"
              strokeLinejoin="round"
              fill="none"
            />
          )}
          {projection !== null && (
            <Path
              d={toPath([lastPoint, { x: width, y: y(projection) }])}
              stroke={themas.colors.secondary}
              strokeWidth={2.5}
              strokeDasharray="1 6"
              strokeLinecap="round"
              fill="none"
            />
          )}
          <Path
            d={toPath(currentPoints)}
            stroke={themas.colors.secondary}
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
            fill="none"
          />
          <Circle
            cx={lastPoint.x}
            cy={lastPoint.y}
            r={5}
            fill={themas.colors.secondary}
            stroke={themas.colors.primary}
            strokeWidth={2}
          />

          {tooltip && (
            <Line
              x1={tooltip.x}
              x2={tooltip.x}
              y1={PLOT_TOP}
              y2={PLOT_BOTTOM}
              stroke={MUTED_LABEL}
              strokeWidth={1}
            />
          )}

          {showStart && (
            <SvgText
              x={0}
              y={AXIS_LABEL_Y}
              fill={MUTED_LABEL}
              fontSize={11}
              fontFamily={fonts.regular}
            >
              {`1 ${shortMonth}`}
            </SvgText>
          )}
          {showToday && (
            <SvgText
              x={todayX}
              y={AXIS_LABEL_Y}
              textAnchor={todayX < 16 ? 'start' : width - todayX < 16 ? 'end' : 'middle'}
              fill={themas.colors.white}
              fontSize={11}
              fontFamily={fonts.semibold}
            >
              hoje
            </SvgText>
          )}
          {showEnd && (
            <SvgText
              x={width}
              y={AXIS_LABEL_Y}
              textAnchor="end"
              fill={MUTED_LABEL}
              fontSize={11}
              fontFamily={fonts.regular}
            >
              {`${daysInMonth} ${shortMonth}`}
            </SvgText>
          )}
        </Svg>
      )}

      {tooltip && selectedDay !== null && (
        <View
          pointerEvents="none"
          style={[
            styles.tooltip,
            {
              left: Math.min(
                Math.max(tooltip.x - TOOLTIP_WIDTH / 2, 0),
                Math.max(width - TOOLTIP_WIDTH, 0),
              ),
            },
          ]}
        >
          <Text style={styles.tooltipTitle}>{`${selectedDay} de ${monthName(monthStart)}`}</Text>
          {tooltip.rows.map((row) => (
            <View key={row.label} style={styles.tooltipRow}>
              <View style={[styles.tooltipSwatch, { backgroundColor: row.color }]} />
              <Text style={styles.tooltipText} numberOfLines={1}>
                {`${row.label}: ${formatCurrency(row.value)}`}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: HEIGHT,
  },
  svg: {
    overflow: 'visible',
  },
  tooltip: {
    position: 'absolute',
    top: 0,
    width: TOOLTIP_WIDTH,
    gap: 2,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: themas.colors.onPrimaryDivider,
    backgroundColor: themas.colors.surface,
  },
  tooltipTitle: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    lineHeight: 16,
    color: themas.colors.white,
  },
  tooltipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tooltipSwatch: {
    width: 10,
    height: 3,
    borderRadius: 2,
  },
  tooltipText: {
    flexShrink: 1,
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 16,
    color: themas.colors.white,
  },
});
