// utils/adminAuth.ts
import AsyncStorage from "@react-native-async-storage/async-storage";

const ADMIN_USER_ID = "admin_user_001";
const ADMIN_SESSION_KEY = "sentrilock_admin_session";

export const saveAdminSession = async (userId: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(ADMIN_SESSION_KEY, userId);
    await AsyncStorage.setItem(
      `${ADMIN_SESSION_KEY}_timestamp`,
      Date.now().toString(),
    );
  } catch (error) {
    console.error("Error saving admin session:", error);
  }
};

export const getAdminUserId = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(ADMIN_SESSION_KEY);
  } catch (error) {
    console.error("Error getting admin session:", error);
    return null;
  }
};

export const clearAdminSession = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(ADMIN_SESSION_KEY);
    await AsyncStorage.removeItem(`${ADMIN_SESSION_KEY}_timestamp`);
  } catch (error) {
    console.error("Error clearing admin session:", error);
  }
};

export const isAdminLoggedIn = async (): Promise<boolean> => {
  try {
    const session = await AsyncStorage.getItem(ADMIN_SESSION_KEY);
    return !!session;
  } catch (error) {
    return false;
  }
};
