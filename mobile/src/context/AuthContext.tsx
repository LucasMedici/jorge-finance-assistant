import { createContext, useCallback, useEffect, useState } from "react";
import { Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { jwtDecode } from "jwt-decode";
import { isTokenValid } from "../global/isTokenValid";
import { setUnauthorizedHandler } from "../services/api";

interface TokenPayload {
  sub: string;
  email: string;
  name?: string;
  phone: string;
  exp?: number;
  iat?: number;
}

export type User = {
  id: string;
  email: string;
  name?: string;
  phone: string;
};

type AuthContextType = {
  user: User | null;
  loading: boolean;
  signIn: (token: string) => Promise<void>;
  signOut: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextType | null>(null);

function getUserFromToken(token: string): User | null {
  try {
    const decodedToken = jwtDecode<TokenPayload>(token);
    return {
      id: decodedToken.sub,
      email: decodedToken.email,
      name: decodedToken.name,
      phone: decodedToken.phone,
    };
  } catch (error) {
    return null;
  }
}

export function AuthProvider({children}: any) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    // Boot: restaura a sessão a partir do token salvo
    useEffect(() => {
        const loadUser = async () => {
            try {
                const token = await AsyncStorage.getItem('userToken');

                if (token && (await isTokenValid(token))) {
                    setUser(getUserFromToken(token));
                }
            } finally {
                setLoading(false);
            }
        };

        loadUser();
    }, []);

    // 401 em qualquer requisição: o interceptor já limpou o token, aqui só derruba a sessão
    useEffect(() => {
        setUnauthorizedHandler(() => {
            setUser(null);
            Alert.alert("Sessão expirada", "Faça login novamente para continuar.");
        });

        return () => setUnauthorizedHandler(null);
    }, []);

    const signIn = useCallback(async (token: string) => {
        const loggedUser = getUserFromToken(token);

        if (!loggedUser) {
            throw new Error("Token inválido");
        }

        await AsyncStorage.setItem('userToken', token);
        setUser(loggedUser);
    }, []);

    // Ao zerar o user, o stack troca para as telas de Login e desmonta as telas logadas
    const signOut = useCallback(async () => {
        try {
            await AsyncStorage.removeItem('userToken');
        } finally {
            setUser(null);
        }
    }, []);

    return (
        <AuthContext.Provider value={{user, loading, signIn, signOut}}>
            {children}
        </AuthContext.Provider>
    )
}
