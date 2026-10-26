import {createContext, ReactNode, useContext, useEffect, useState} from "react";
import NetInfo from "@react-native-community/netinfo";
import { processOfflineQueue } from "../global/offlineQueue";
import { AuthContext } from "./AuthContext";

type ConnectionContextType = {
    isConnected: boolean;
};

export const ConnectionContext = createContext<ConnectionContextType>({
    isConnected: true,
})

export function ConnectionProvider({children}: {children: ReactNode}) {
    const [isConnected, setIsConnected] = useState(true);
    // Precisa estar dentro do AuthProvider (ver App.tsx)
    const userPhone = useContext(AuthContext)?.user?.phone;

    useEffect(() => {
        const unsubscribe = NetInfo.addEventListener(state => {
            setIsConnected(state.isConnected ?? true);
        });

        return () => {
            unsubscribe();
        };
    }, [])

    // Envia a fila quando a conexão volta e quando há um usuário logado (signIn ou sessão
    // restaurada no boot). Só vão as mensagens desse usuário.
    useEffect(() => {
        if(isConnected && userPhone) {
            processOfflineQueue(userPhone)
        }
    }, [isConnected, userPhone])

    return (
        <ConnectionContext.Provider value={{isConnected}}>
            {children}
        </ConnectionContext.Provider>
    )
}