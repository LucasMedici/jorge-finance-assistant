import { StyleSheet } from 'react-native';
import { themas } from '../../global/themes';
import { fonts } from '../../global/fonts';

const { colors } = themas;

// Cantos dos balões: o do Jorge "sai" de cima à esquerda; o do usuário, de baixo à direita
const botCorners = {
  borderTopLeftRadius: 4,
  borderTopRightRadius: themas.radius.xl,
  borderBottomLeftRadius: themas.radius.xl,
  borderBottomRightRadius: themas.radius.xl,
};

// Medidas do canvas (Main.dc.html / Chat-v2-Processando.dc.html), tela de 390 de largura
export const style = StyleSheet.create({
  // Fundo roxo em toda a tela: se sobrar espaço embaixo do campo, fica da mesma cor
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },

  // ---- Cabeçalho
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingTop: 18,
    paddingRight: 20,
    paddingBottom: 14,
    paddingLeft: 16,
  },
  headerText: {
    flex: 1,
  },
  headerName: {
    fontFamily: fonts.semibold,
    fontSize: 18,
    lineHeight: 24,
    color: colors.white,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.secondary,
  },
  statusDotOffline: {
    backgroundColor: colors.controlOff,
  },
  statusText: {
    flexShrink: 1,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.onPrimaryMuted,
  },
  statusTextThinking: {
    color: colors.secondary,
  },
  profileButton: {
    width: themas.minTouchSize,
    height: themas.minTouchSize,
    borderRadius: themas.minTouchSize / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.onPrimaryTrack,
  },
  profileInitial: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    lineHeight: 20,
    color: colors.white,
  },
  pressed: {
    opacity: 0.7,
  },

  // ---- Resumo do mês
  summary: {
    gap: 10,
    paddingTop: 16,
    paddingHorizontal: 20,
    paddingBottom: 18,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.onPrimaryDivider,
    backgroundColor: colors.shade,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
  },
  summaryMonth: {
    flexShrink: 1,
    gap: 2,
  },
  summaryToday: {
    alignItems: 'flex-end',
    gap: 2,
    paddingBottom: 4,
  },
  summaryLabel: {
    fontFamily: fonts.medium,
    fontSize: 13,
    lineHeight: 18,
    color: colors.onPrimaryMuted,
  },
  summaryMonthValue: {
    fontFamily: fonts.bold,
    fontSize: 30,
    lineHeight: 36,
    letterSpacing: -0.6,
    color: colors.white,
  },
  summaryTodayValue: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    lineHeight: 20,
    color: colors.secondary,
  },
  summaryPlaceholder: {
    color: colors.onPrimaryMuted,
  },
  goalInvite: {
    alignSelf: 'flex-start',
  },
  goalInviteText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    lineHeight: 16,
    color: colors.secondary,
  },

  // ---- Conversa
  list: {
    flex: 1,
  },
  listContent: {
    flexGrow: 1,
    justifyContent: 'flex-end',
    gap: 10,
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  dayLabel: {
    alignSelf: 'center',
    paddingBottom: 4,
    fontFamily: fonts.medium,
    fontSize: 12,
    lineHeight: 16,
    color: colors.onPrimaryMuted,
  },
  bubble: {
    maxWidth: '80%',
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  botBubble: {
    alignSelf: 'flex-start',
    ...botCorners,
    backgroundColor: colors.surface,
  },
  userBubble: {
    alignSelf: 'flex-end',
    borderTopLeftRadius: themas.radius.xl,
    borderTopRightRadius: themas.radius.xl,
    borderBottomLeftRadius: themas.radius.xl,
    borderBottomRightRadius: 4,
    backgroundColor: colors.secondary,
  },
  botText: {
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 21,
    color: colors.white,
  },
  userText: {
    fontFamily: fonts.medium,
    fontSize: 15,
    lineHeight: 21,
    color: colors.textDark,
  },

  // Pontinhos de "digitando" (estáticos)
  typing: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 14,
    paddingHorizontal: 18,
    ...botCorners,
    backgroundColor: colors.surface,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  // Recibo do lançamento
  receipt: {
    alignSelf: 'flex-start',
    width: '88%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    ...botCorners,
    backgroundColor: colors.surface,
  },
  receiptIcon: {
    width: 40,
    height: 40,
    borderRadius: themas.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  receiptIconIncome: {
    backgroundColor: colors.secondary,
  },
  receiptIconExpense: {
    backgroundColor: colors.shadeStrong,
  },
  receiptText: {
    flex: 1,
  },
  receiptTitle: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    lineHeight: 20,
    color: colors.white,
  },
  receiptMeta: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 16,
    color: colors.onPrimaryMuted,
  },
  receiptAmount: {
    flexShrink: 0,
    fontFamily: fonts.bold,
    fontSize: 17,
    lineHeight: 22,
    color: colors.white,
  },
  receiptAmountIncome: {
    color: colors.secondary,
  },

  // Cartão "Entendi assim, confere?"
  card: {
    alignSelf: 'flex-start',
    width: '88%',
    gap: 12,
    paddingTop: 14,
    paddingHorizontal: 14,
    paddingBottom: 12,
    ...botCorners,
    backgroundColor: colors.surface,
  },
  cardBox: {
    borderRadius: themas.radius.lg,
    backgroundColor: colors.shadeStrong,
  },
  cardMain: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 8,
    paddingTop: 12,
    paddingHorizontal: 14,
    paddingBottom: 10,
  },
  cardAmountColumn: {
    flexShrink: 1,
    gap: 2,
  },
  cardType: {
    fontFamily: fonts.medium,
    fontSize: 12,
    lineHeight: 16,
    color: colors.onPrimaryMuted,
  },
  cardAmount: {
    fontFamily: fonts.bold,
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: -0.52,
    color: colors.white,
  },
  categoryPill: {
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: themas.radius.lg,
    backgroundColor: colors.secondarySoft,
  },
  categoryText: {
    flexShrink: 1,
    fontFamily: fonts.medium,
    fontSize: 13,
    lineHeight: 18,
    color: colors.secondary,
  },
  cardDateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    paddingTop: 9,
    paddingHorizontal: 14,
    paddingBottom: 11,
    borderTopWidth: 1,
    borderTopColor: colors.onPrimaryDivider,
  },
  cardDateLabel: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.onPrimaryMuted,
  },
  cardDateValue: {
    fontFamily: fonts.medium,
    fontSize: 13,
    lineHeight: 18,
    color: colors.white,
  },
  cardButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  confirmButton: {
    flex: 1,
    height: themas.minTouchSize,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: themas.radius.md,
    backgroundColor: colors.secondary,
  },
  confirmText: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textDark,
  },
  correctButton: {
    flex: 1,
    height: themas.minTouchSize,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.onPrimaryBorder,
    borderRadius: themas.radius.md,
  },
  correctText: {
    fontFamily: fonts.medium,
    fontSize: 14,
    lineHeight: 20,
    color: colors.white,
  },

  // ---- Atalhos e campo
  shortcuts: {
    flexGrow: 0,
    flexShrink: 0,
  },
  shortcutsContent: {
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  shortcut: {
    height: 36,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.secondaryBorder,
    borderRadius: 18,
  },
  shortcutText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    lineHeight: 18,
    color: colors.secondary,
  },
  disabled: {
    opacity: 0.5,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingTop: 8,
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  inputBox: {
    flex: 1,
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 18,
    borderRadius: 24,
    backgroundColor: colors.white,
  },
  input: {
    maxHeight: 120,
    paddingVertical: 12,
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 20,
    color: colors.textDark,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.secondary,
  },
});
