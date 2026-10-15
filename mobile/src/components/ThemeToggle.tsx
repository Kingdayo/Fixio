import React from "react";
import { TouchableOpacity, StyleSheet } from "react-native";
import { Sun, Moon } from "lucide-react-native";
import { useTheme } from "../context/ThemeContext";
import * as Haptics from "expo-haptics";

export const ThemeToggle: React.FC = () => {
  const { mode, toggleTheme, colors } = useTheme();

  const handlePress = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleTheme();
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={[
        styles.button,
        { backgroundColor: colors.cardSecondary, borderColor: colors.cardBorder },
      ]}
      accessibilityLabel={`Switch to ${mode === "dark" ? "light" : "dark"} theme`}
    >
      {mode === "dark" ? (
        <Sun size={18} color={colors.brand} />
      ) : (
        <Moon size={18} color={colors.text} />
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
});
