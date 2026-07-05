import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export type Theme = "default" | "dark" | "cartoon";

const STORAGE_KEY = "app-theme";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "default",
  setTheme: () => {},
});

const CLASS_MAP: Record<Theme, string> = {
  default: "",
  dark: "dark",
  cartoon: "cartoon",
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    return (localStorage.getItem(STORAGE_KEY) as Theme) ?? "default";
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("dark", "cartoon");
    const cls = CLASS_MAP[theme];
    if (cls) root.classList.add(cls);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const setTheme = useCallback((next: Theme) => setThemeState(next), []);

  return (
    <ThemeContext value={{ theme, setTheme }}>{children}</ThemeContext>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
