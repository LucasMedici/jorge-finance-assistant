import { StyleSheet } from 'react-native';
import { fonts } from '../../global/fonts';
import { themas } from '../../global/themes';

// Medidas do canvas "Relatórios v2 — Painel do mês" (390 de largura, margens de 24)
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
  strong: {
    fontFamily: fonts.semibold,
  },

  // Cabeçalho: título, período e mês
  header: {
    gap: 16,
    paddingTop: 20,
    paddingHorizontal: 24,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 26,
    lineHeight: 32,
    color: themas.colors.white,
  },
  periodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  periodArrow: {
    width: themas.minTouchSize,
    height: themas.minTouchSize,
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodTitle: {
    flexShrink: 1,
    fontFamily: fonts.semibold,
    fontSize: 16,
    lineHeight: 22,
    color: themas.colors.white,
    textAlign: 'center',
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
  errorText: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 21,
    color: MUTED,
  },

  // Seções
  section: {
    paddingHorizontal: 24,
  },
  sectionDivider: {
    borderTopWidth: 1,
    borderTopColor: themas.colors.onPrimaryDivider,
  },
  sectionHeader: {
    gap: 4,
  },
  sectionTitle: {
    fontFamily: fonts.semibold,
    fontSize: 18,
    lineHeight: 24,
    color: themas.colors.white,
  },
  sectionText: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 21,
    color: MUTED,
  },

  // Total e meta
  totalSection: {
    gap: 14,
    paddingTop: 12,
    paddingBottom: 28,
  },
  totalHeader: {
    gap: 2,
  },
  totalLabel: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: MUTED,
  },
  totalValue: {
    fontFamily: fonts.bold,
    fontSize: 42,
    lineHeight: 48,
    letterSpacing: -1.26,
    color: themas.colors.white,
  },
  totalComparison: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: themas.colors.white,
  },
  link: {
    alignSelf: 'flex-start',
    justifyContent: 'center',
    minHeight: 36,
  },
  linkText: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    lineHeight: 20,
    color: themas.colors.secondary,
  },
  goalInvite: {
    gap: 4,
  },
  goalInviteText: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 21,
    color: MUTED,
  },

  // Ritmo do mês
  paceSection: {
    gap: 14,
    paddingVertical: 28,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 16,
    rowGap: 6,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  warning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: themas.radius.md,
    borderWidth: 1,
    borderColor: 'rgba(242, 184, 75, 0.35)',
    backgroundColor: 'rgba(242, 184, 75, 0.12)',
  },
  warningIcon: {
    marginTop: 2,
  },
  warningText: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 21,
    color: themas.colors.white,
  },
  warningStrong: {
    fontFamily: fonts.semibold,
  },

  // Para onde foi o dinheiro
  categoriesSection: {
    gap: 18,
    paddingVertical: 28,
  },
  categoryRow: {
    gap: 8,
  },
  categoryTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  categoryName: {
    flexShrink: 1,
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 20,
    color: themas.colors.white,
  },
  categoryValueBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  categoryValue: {
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 20,
    color: themas.colors.white,
  },
  barTrack: {
    height: 10,
    borderRadius: 5,
    flexDirection: 'row',
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  barFill: {
    height: 10,
    borderRadius: 5,
  },
  categoryCaption: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: CAPTION,
  },
  categoryCaptionFirst: {
    color: themas.colors.white,
  },

  // Maiores gastos
  topSection: {
    gap: 6,
    paddingTop: 28,
    paddingBottom: 20,
  },
  topTitle: {
    marginBottom: 8,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 60,
  },
  dateBox: {
    width: 44,
    alignItems: 'center',
    paddingVertical: 6,
    borderRadius: themas.radius.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.16)',
  },
  dateDay: {
    fontFamily: fonts.bold,
    fontSize: 16,
    lineHeight: 18,
    color: themas.colors.white,
  },
  dateMonth: {
    fontFamily: fonts.regular,
    fontSize: 11,
    lineHeight: 14,
    color: CAPTION,
  },
  topInfo: {
    flex: 1,
  },
  topName: {
    fontFamily: fonts.medium,
    fontSize: 15,
    lineHeight: 20,
    color: themas.colors.white,
  },
  topCategory: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: CAPTION,
  },
  topAmount: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    lineHeight: 20,
    color: themas.colors.white,
  },
  seeAll: {
    alignSelf: 'flex-start',
    justifyContent: 'center',
    minHeight: themas.minTouchSize,
  },
  seeAllText: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    lineHeight: 20,
    color: themas.colors.secondary,
  },
});
