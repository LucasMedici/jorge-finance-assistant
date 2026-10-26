import {createContext, ReactNode, useEffect, useState} from "react";
import NetInfo from "@react-native-community/netinfo";
import { processOfflineQueue } from "../global/offlineQueue";

type ConnectionContextType = {
    isConnected: boolean;
};

export const ConnectionContext = createContext<ConnectionContextType>({
    isConnected: true,
})

export function ConnectionProvider({children}: {children: ReactNode}) {
    const [isConnected, setIsConnected] = useState(true);

    useEffect(() => {
        const unsubscribe = NetInfo.addEventListener(state => {
            setIsConnected(state.isConnected ?? true);
        });

        return () => {
            unsubscribe();
        };
    }, [])

    useEffect(() => {
        if(isConnected) {
            processOfflineQueue()
        }
    }, [isConnected])

    return (
        <ConnectionContext.Provider value={{isConnected}}>
            {children}
        </ConnectionContext.Provider>
    )
}