import { createContext, useState } from "react";

type AuthContextType = {
  user: any;
  setUser: (user: any) => void;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({children}: any) {
    const [user, setUser] = useState(null);

    return (
        <AuthContext.Provider value={{user, setUser}}>
            {children}
        </AuthContext.Provider>
    )
}