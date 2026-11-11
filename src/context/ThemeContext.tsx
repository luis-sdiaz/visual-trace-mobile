import {
  createContext,
  useCallback,
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
import {
  getStoredTheme,
  persistTheme,
  type Theme,
} from "@/services/themePreferenceService";

export type { Theme } from "@/services/themePreferenceService";

type ThemeContextValue = {
  theme: Theme;
  isDark: boolean;
  colors: ColorPalette;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  isLoaded: boolean;
};

const defaultThemeValue: ThemeContextValue = {
  theme: "light",
  isDark: false,
  colors: lightColors,
  toggleTheme: () => {},
  setTheme: () => {},
  isLoaded: true,
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function getToggledTheme(theme: Theme): Theme {
  return theme === "light" ? "dark" : "light";
}

export function ThemeProvider({ children }: PropsWithChildren) {
  const [theme, setThemeState] = useState<Theme>("light");
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let active = true;

    async function restoreTheme() {
      try {
        const storedTheme = await getStoredTheme();
        if (active) {
          if (storedTheme) {
            setThemeState(storedTheme);
          }
          setIsLoaded(true);
        }
      } catch (error) {
        console.error("[ThemeContext] No se pudo restaurar el tema:", error);
        if (active) {
          setIsLoaded(true);
        }
      }
    }

    void restoreTheme();
    return () => {
      active = false;
    };
  }, []);

  const setTheme = useCallback((nextTheme: Theme) => {
    setThemeState(nextTheme);
    void persistTheme(nextTheme).catch((error) => {
      console.error("[ThemeContext] No se pudo guardar el tema:", error);
    });
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(getToggledTheme(theme));
  }, [setTheme, theme]);

  const value = useMemo(
    () => ({
      theme,
      isDark: theme === "dark",
      colors: theme === "dark" ? darkColors : lightColors,
      toggleTheme,
      setTheme,
      isLoaded,
    }),
    [isLoaded, setTheme, theme, toggleTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  return context ?? defaultThemeValue;
}
