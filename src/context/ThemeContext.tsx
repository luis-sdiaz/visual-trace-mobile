import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";

import {
  darkColors,
  lightColors,
  type ColorPalette,
} from "@/constants/colors";

export type Theme = "light" | "dark";

type ThemeContextValue = {
  theme: Theme;
  isDark: boolean;
  colors: ColorPalette;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
};

const THEME_STORAGE_KEY = "@visualtrace/theme";

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function getToggledTheme(theme: Theme): Theme {
  return theme === "light" ? "dark" : "light";
}

export function ThemeProvider({ children }: PropsWithChildren) {
  const [theme, setThemeState] = useState<Theme>("light");

  useEffect(() => {
    let active = true;

    async function restoreTheme() {
      try {
        const storedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (active && (storedTheme === "light" || storedTheme === "dark")) {
          setThemeState(storedTheme);
        }
      } catch (error) {
        console.error("[ThemeContext] No se pudo restaurar el tema:", error);
      }
    }

    void restoreTheme();
    return () => {
      active = false;
    };
  }, []);

  function setTheme(nextTheme: Theme) {
    setThemeState(nextTheme);
    void AsyncStorage.setItem(THEME_STORAGE_KEY, nextTheme).catch((error) => {
      console.error("[ThemeContext] No se pudo guardar el tema:", error);
    });
  }

  function toggleTheme() {
    setTheme(getToggledTheme(theme));
  }

  const value = useMemo(
    () => ({
      theme,
      isDark: theme === "dark",
      colors: theme === "dark" ? darkColors : lightColors,
      toggleTheme,
      setTheme,
    }),
    [theme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
