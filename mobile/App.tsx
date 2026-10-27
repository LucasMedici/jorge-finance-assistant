import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLoadFonts } from './src/global/fonts';
import { themas } from './src/global/themes';
import Routes from './src/routes/stack.routes';

import { AuthProvider } from './src/context/AuthContext';
import { ConnectionProvider } from './src/context/ConectionContext';



export default function App() {
  const fontsLoaded = useLoadFonts();

  if (!fontsLoaded) {
    return null;
  }

  return (
    // AuthProvider por fora: o ConnectionProvider usa o user logado para enviar a fila offline
    <AuthProvider>
      <ConnectionProvider>
        <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: themas.colors.primary }}>
          <StatusBar backgroundColor={themas.colors.primary} />
          <Routes />
        </SafeAreaView>
      </ConnectionProvider>
    </AuthProvider>
    
  );
}
