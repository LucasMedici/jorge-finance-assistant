import { StyleSheet } from 'react-native';
import { fonts } from '../../global/fonts';
import { themas } from '../../global/themes';

// Medidas do canvas "Relatórios v2 — Detalhe da categoria"
const MUTED = 'rgba(255, 255, 255, 0.75)';
const CAPTION = themas.colors.onPrimaryMuted;

export const style = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: themas.colors.primary,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  pressed: {
    opacity: 0.7,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 12,
    paddingHorizontal: 12,
  },
  back: {
    width: themas.minTouchSize,
    height: themas.minTouchSize,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  title: {
    flexShrink: 1,
    fontFamily: fonts.semibold,
    fontSize: 20,
    lineHeight: 26,
    color: themas.colors.white,
  },

  loading: {
    paddingVertical: 80,
    alignItems: 'center',
  },
  errorBox: {
    alignItems: 'flex-start',
    gap: 4,
    paddingTop: 24,
    paddingHorizontal: 24,
  },
  mutedText: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 21,
    color: MUTED,
  },
  link: {
    justifyContent: 'center',
    minHeight: themas.minTouchSize,
  },
  linkText: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    lineHeight: 20,
    color: themas.colors.secondary,
  },

  // Total do mês
  summary: {
    gap: 2,
    paddingTop: 20,
    paddingHorizontal: 24,
  },
  summaryLabel: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: MUTED,
  },
  summaryValue: {
    fontFamily: fonts.bold,
    fontSize: 40,
    lineHeight: 46,
    letterSpacing: -1.2,
    color: themas.colors.white,
  },
  summaryText: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: themas.colors.white,
  },

  // Últimos 6 meses
  chartSection: {
    gap: 12,
    paddingVertical: 28,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: themas.colors.onPrimaryDivider,
  },
  sectionTitle: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    lineHeight: 22,
    color: themas.colors.white,
  },
  bars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
    height: 150,
    paddingTop: 22,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.22)',
  },
  averageLine: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  bar: {
    flex: 1,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  barLabel: {
    position: 'absolute',
    top: -20,
    left: -20,
    right: -20,
    textAlign: 'center',
    fontFamily: fonts.semibold,
    fontSize: 12,
    lineHeight: 16,
    color: themas.colors.white,
  },
  monthLabels: {
    flexDirection: 'row',
    gap: 12,
  },
  monthLabel: {
    flex: 1,
    textAlign: 'center',
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 16,
    color: CAPTION,
  },
  monthLabelCurrent: {
    fontFamily: fonts.semibold,
    color: themas.colors.white,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendText: {
    flexShrink: 1,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: 'rgba(255, 255, 255, 0.8)',
  },

  // Lançamentos do mês
  listSection: {
    paddingTop: 24,
    paddingHorizontal: 24,
  },
  listTitle: {
    marginBottom: 6,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    minHeight: 64,
  },
  itemDivider: {
    borderBottomWidth: 1,
    borderBottomColor: themas.colors.onPrimaryDivider,
  },
  itemInfo: {
    flex: 1,
  },
  itemTitle: {
    fontFamily: fonts.medium,
    fontSize: 15,
    lineHeight: 20,
    color: themas.colors.white,
  },
  itemSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: CAPTION,
  },
  itemAmount: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    lineHeight: 20,
    color: themas.colors.white,
  },
});
