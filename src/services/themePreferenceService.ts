import AsyncStorage from "@react-native-async-storage/async-storage";

export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "@visualtrace/theme";

export async function getStoredTheme(): Promise<Theme | null> {
  const storedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
  return storedTheme === "light" || storedTheme === "dark" ? storedTheme : null;
}

export async function persistTheme(theme: Theme): Promise<void> {
  await AsyncStorage.setItem(THEME_STORAGE_KEY, theme);
}
