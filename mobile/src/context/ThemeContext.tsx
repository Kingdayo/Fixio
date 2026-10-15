import React, { createContext, useContext, useEffect, useState } from "react";
import { useColorScheme, Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

export type ThemeMode = "dark" | "light";

export type ThemeColors = {
  background: string;
  card: string;
  cardBorder: string;
  cardSecondary: string;
  text: string;
  textMuted: string;
  primary: string;
  primaryForeground: string;
  brand: string;
  brandForeground: string;
  secondary: string;
  secondaryText: string;
  border: string;
  destructive: string;
  destructiveForeground: string;
  isDark: boolean;
};

const darkColors: ThemeColors = {
  background: "#090D16",
  card: "#111827",
  cardBorder: "#1F2937",
  cardSecondary: "#1A2333",
  text: "#F9FAFB",
  textMuted: "#9CA3AF",
  primary: "#F97316",
  primaryForeground: "#FFFFFF",
  brand: "#F97316",
  brandForeground: "#FFFFFF",
  secondary: "#1F2937",
  secondaryText: "#E5E7EB",
  border: "#1F2937",
  destructive: "#EF4444",
  destructiveForeground: "#FFFFFF",
  isDark: true,
};

const lightColors: ThemeColors = {
  background: "#F8FAFC",
  card: "#FFFFFF",
  cardBorder: "#E2E8F0",
  cardSecondary: "#F1F5F9",
  text: "#0F172A",
  textMuted: "#64748B",
  primary: "#F97316",
  primaryForeground: "#FFFFFF",
  brand: "#F97316",
  brandForeground: "#FFFFFF",
  secondary: "#E2E8F0",
  secondaryText: "#1E293B",
  border: "#E2E8F0",
  destructive: "#EF4444",
  destructiveForeground: "#FFFFFF",
  isDark: false,
};

type ThemeContextType = {
  mode: ThemeMode;
  colors: ThemeColors;
  toggleTheme: () => void;
  setMode: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextType>({
  mode: "dark",
  colors: darkColors,
  toggleTheme: () => {},
  setMode: () => {},
});

const THEME_KEY = "fixio_theme_mode";

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>(systemScheme === "light" ? "light" : "dark");

  useEffect(() => {
    async function loadTheme() {
      try {
        let saved: string | null = null;
        if (Platform.OS === "web") {
          if (typeof localStorage !== "undefined") saved = localStorage.getItem(THEME_KEY);
        } else {
          saved = await SecureStore.getItemAsync(THEME_KEY);
        }
        if (saved === "light" || saved === "dark") {
          setModeState(saved);
        }
      } catch (err) {
        console.error("Failed to load saved theme:", err);
      }
    }
    void loadTheme();
  }, []);

  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode);
    if (Platform.OS === "web") {
      if (typeof localStorage !== "undefined") localStorage.setItem(THEME_KEY, newMode);
    } else {
      void SecureStore.setItemAsync(THEME_KEY, newMode);
    }
  };

  const toggleTheme = () => {
    setMode(mode === "dark" ? "light" : "dark");
  };

  const colors = mode === "dark" ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ mode, colors, toggleTheme, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
