import { StyleSheet } from 'react-native';
import { fonts } from '../../global/fonts';
import { themas } from '../../global/themes';

// Medidas do canvas "Todos os lançamentos" (margens de 20)
const MUTED = 'rgba(255, 255, 255, 0.75)';
const CAPTION = themas.colors.onPrimaryMuted;
const GUTTER = 20;

export const style = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: themas.colors.primary,
  },
  pressed: {
    opacity: 0.7,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingTop: 12,
    paddingLeft: 12,
    paddingRight: GUTTER,
  },
  back: {
    width: themas.minTouchSize,
    height: themas.minTouchSize,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontFamily: fonts.semibold,
    fontSize: 20,
    lineHeight: 26,
    color: themas.colors.white,
  },
  monthButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 40,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
  },
  monthButtonText: {
    fontFamily: fonts.medium,
    fontSize: 14,
    lineHeight: 20,
    color: themas.colors.white,
  },

  // Busca, chips e resumo
  controls: {
    gap: 12,
    paddingTop: 16,
    paddingHorizontal: GUTTER,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 48,
    paddingHorizontal: 16,
    borderRadius: themas.radius.lg,
    backgroundColor: themas.colors.surface,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    height: 48,
    padding: 0,
    fontFamily: fonts.regular,
    fontSize: 15,
    color: themas.colors.white,
  },
  // Os chips rolam de borda a borda da tela
  chipsScroll: {
    marginHorizontal: -GUTTER,
    flexGrow: 0,
  },
  chips: {
    gap: 8,
    paddingHorizontal: GUTTER,
  },
  chip: {
    justifyContent: 'center',
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
  },
  chipDefault: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
  },
  chipSelected: {
    backgroundColor: themas.colors.secondary,
  },
  chipText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    lineHeight: 18,
    color: themas.colors.white,
  },
  chipTextSelected: {
    fontFamily: fonts.semibold,
    color: themas.colors.textDark,
  },
  summary: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: MUTED,
  },

  loading: {
    paddingVertical: 80,
    alignItems: 'center',
  },
  message: {
    alignItems: 'flex-start',
    gap: 4,
    paddingTop: 24,
    paddingHorizontal: GUTTER,
  },
  messageText: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 21,
    color: MUTED,
  },
  empty: {
    paddingTop: 16,
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

  // Lista por dia
  list: {
    flex: 1,
  },
  listContent: {
    paddingTop: 8,
    paddingHorizontal: GUTTER,
    paddingBottom: 24,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: 12,
    paddingTop: 14,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: themas.colors.onPrimaryDivider,
  },
  dayTitle: {
    flexShrink: 1,
    fontFamily: fonts.semibold,
    fontSize: 14,
    lineHeight: 20,
    color: themas.colors.white,
  },
  dayTotal: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: MUTED,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 64,
  },
  itemIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: themas.radius.md,
    backgroundColor: 'rgba(0, 0, 0, 0.18)',
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
  itemCaption: {
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

  // Folha de escolher o mês
  sheetTitle: {
    fontFamily: fonts.bold,
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: -0.24,
    color: themas.colors.textDark,
  },
  sheetMonths: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
});
