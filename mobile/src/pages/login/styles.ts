import { StyleSheet } from 'react-native';
import { themas } from '../../global/themes';
import { fonts } from '../../global/fonts';

export const style = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    gap: 30,
    alignItems: 'center',
    backgroundColor: themas.colors.primary,
    paddingVertical: 40,
  },
  title: {
    fontFamily: fonts.medium,
    fontSize: 36,
    color: '#FFFFFF',
  },
  subtitle: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: '#8DC63E',
  },
  inputTitle: {
    fontFamily: fonts.medium,
    fontSize: 15,
    color: '#8DC63E',
    paddingTop: 20,
    alignSelf: 'flex-start',
    paddingLeft: 60,
  },
  header: {
    alignItems: 'center',
  },
  main: {
    width: '100%',
    alignItems: 'center',
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  textInput: {
    backgroundColor: themas.colors.inputBackgroud,
    width: '75%',
    height: 50,
    borderRadius: 15,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.39,
    shadowRadius: 8.3,

    elevation: 13,
  },
  button: {
    width: '30%',
    height: 50,
    backgroundColor: themas.colors.secondary,
    borderRadius: 15,
    marginTop: 30,
    alignItems: 'center',
    justifyContent: 'center',

    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.39,
    shadowRadius: 8.3,

    elevation: 13,
  },
  textButton: {
    fontFamily: fonts.medium,
    fontSize: 25,
    color: '#FFFFFF',
  },
  footer: {
    alignItems: 'center',
    marginTop: 30,
  },
  jorgeAcenandoLogo: {
    width: 200,
    height: 200,
    marginLeft: 30,
  },
});
