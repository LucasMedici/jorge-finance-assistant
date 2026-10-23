import AsyncStorage from "@react-native-async-storage/async-storage";
import { jwtDecode } from "jwt-decode";

export async function isTokenValid(token: string) {
    try{
        const decodedToken = jwtDecode(token);

        const currentTime = Date.now() / 1000; // Tempo atual em segundos

        if (decodedToken.exp && decodedToken.exp < currentTime) {
            await AsyncStorage.removeItem('userToken');
            return false;
        }

        return decodedToken.exp
    } catch (error) {
        await AsyncStorage.removeItem('userToken');
        return false;
    }
}