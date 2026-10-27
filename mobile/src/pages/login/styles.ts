import { StyleSheet } from 'react-native';
import { themas } from '../../global/themes';
import { fonts } from '../../global/fonts';

// Medidas do canvas (Login-v2-D-Folha): topo roxo com o Jorge e o título, formulário numa folha branca.
// O Cadastro usa os mesmos estilos.
export const style = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: themas.colors.primary,
  },
  scrollContent: {
    flexGrow: 1,
  },

  // Topo roxo: cresce e empurra o Jorge e o título para perto da folha
  hero: {
    flexGrow: 1,
    justifyContent: 'flex-end',
    gap: 18,
    paddingTop: themas.spacing.xxl,
    paddingHorizontal: themas.spacing.xxl,
    paddingBottom: 32,
  },
  heroText: {
    gap: 4,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -0.64,
    color: themas.colors.white,
  },
  subtitle: {
    fontFamily: fonts.medium,
    fontSize: 15,
    lineHeight: 22,
    color: themas.colors.secondary,
  },

  // Folha branca com o formulário
  sheet: {
    gap: themas.spacing.lg,
    paddingTop: themas.spacing.xxxl,
    paddingHorizontal: themas.spacing.xxl,
    paddingBottom: 32,
    borderTopLeftRadius: themas.radius.sheet,
    borderTopRightRadius: themas.radius.sheet,
    backgroundColor: themas.colors.white,
  },
  submit: {
    marginTop: themas.spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingTop: 6,
  },
  footerText: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: themas.colors.textMuted,
  },
  footerLink: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    lineHeight: 20,
    color: themas.colors.primary,
    textDecorationLine: 'underline',
  },
});
