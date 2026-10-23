import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';
import { useContext, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';

interface TokenPayload {
  sub: string;
  email: string;
  name: string;
  phone: string;
  exp: number;
  iat: number;
}

export function useLoadUserFromToken() {
  const authContext = useContext(AuthContext);
  const { setUser } = authContext!;

  useEffect(() => {
    const loadUser = async () => {
      const token = await AsyncStorage.getItem('userToken');

      if (!token) return;

      const decodedToken = jwtDecode<TokenPayload>(token);
      const userLogged = {
        id: decodedToken.sub,
        email: decodedToken.email,
        name: decodedToken.name,
        phone: decodedToken.phone,
      };
      setUser(userLogged);
    };

    loadUser();
  }, [setUser]);
}
