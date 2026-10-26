// Mock oficial do AsyncStorage (armazenamento em memória) para todos os testes
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
