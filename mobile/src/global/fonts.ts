import {
  useFonts,
  Prompt_300Light,
  Prompt_400Regular,
  Prompt_500Medium,
  Prompt_600SemiBold,
  Prompt_700Bold,
} from '@expo-google-fonts/prompt';

export const useLoadFonts = () => {
  const [fontsLoaded] = useFonts({
    Prompt_300Light,
    Prompt_400Regular,
    Prompt_500Medium,
    Prompt_600SemiBold,
    Prompt_700Bold,
  });

  return fontsLoaded;
};

export const fonts = {
  light: 'Prompt_300Light',
  regular: 'Prompt_400Regular',
  medium: 'Prompt_500Medium',
  semibold: 'Prompt_600SemiBold',
  bold: 'Prompt_700Bold',
};
