import { StyleSheet } from 'react-native';
import { themas } from '../../global/themes';
import { fonts } from '../../global/fonts';

// Perfil no padrão v2: cabeçalho roxo (como em Lançamentos), o Jorge pequeno com a saudação
// e as informações numa folha branca (mesmos campos/caixas das folhas do canvas).
export const style = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: themas.colors.primary,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: themas.spacing.xxs,
    paddingTop: themas.spacing.md,
    paddingLeft: themas.spacing.md,
    paddingRight: themas.spacing.xl,
  },
  backButton: {
    width: themas.minTouchSize,
    height: themas.minTouchSize,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
  headerTitle: {
    flex: 1,
    fontFamily: fonts.semibold,
    fontSize: 20,
    lineHeight: 26,
    color: themas.colors.white,
  },

  scrollContent: {
    flexGrow: 1,
  },

  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: themas.spacing.lg,
    paddingTop: themas.spacing.xl,
    paddingHorizontal: themas.spacing.xxl,
    paddingBottom: themas.spacing.xxxl,
  },
  heroText: {
    flex: 1,
    gap: 2,
  },
  greeting: {
    fontFamily: fonts.bold,
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: -0.24,
    color: themas.colors.white,
  },
  heroSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 22,
    color: themas.colors.onPrimaryMuted,
  },

  sheet: {
    flexGrow: 1,
    gap: themas.spacing.lg,
    paddingTop: themas.spacing.xxxl,
    paddingHorizontal: themas.spacing.xxl,
    paddingBottom: 32,
    borderTopLeftRadius: themas.radius.sheet,
    borderTopRightRadius: themas.radius.sheet,
    backgroundColor: themas.colors.white,
  },

  // Caixa de informação (mesmo visual da linha de data do "Corrigir lançamento")
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: themas.spacing.md,
    minHeight: 64,
    paddingVertical: themas.spacing.md,
    paddingHorizontal: themas.spacing.lg,
    borderRadius: themas.radius.lg,
    backgroundColor: themas.colors.fillLight,
  },
  infoRowWithAction: {
    paddingRight: themas.spacing.xxs,
  },
  infoText: {
    flex: 1,
  },
  infoLabel: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 16,
    color: themas.colors.textMuted,
  },
  infoValue: {
    fontFamily: fonts.medium,
    fontSize: 16,
    lineHeight: 22,
    color: themas.colors.textDark,
  },
  infoValueEmpty: {
    color: themas.colors.textMuted,
  },
  editButton: {
    minWidth: themas.minTouchSize,
    minHeight: themas.minTouchSize,
    paddingHorizontal: themas.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButtonText: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    lineHeight: 20,
    color: themas.colors.primary,
  },

  editActions: {
    gap: themas.spacing.xs,
  },

  logout: {
    marginTop: themas.spacing.sm,
  },
});
