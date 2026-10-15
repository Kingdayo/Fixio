import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
} from "react-native";
import { useTheme } from "../context/ThemeContext";
import { supabase } from "../services/supabase";
import * as Haptics from "expo-haptics";

type ResetPasswordScreenProps = {
  navigation: any;
};

export const ResetPasswordScreen: React.FC<ResetPasswordScreenProps> = ({ navigation }) => {
  const { colors } = useTheme();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async () => {
    if (password.length < 8) {
      Alert.alert("Invalid password", "Password must be at least 8 characters long.");
      return;
    }

    setBusy(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);

    if (error) {
      Alert.alert("Error", error.message);
      return;
    }

    Alert.alert("Success", "Password updated successfully.", [
      { text: "OK", onPress: () => navigation.navigate("MainTabs") },
    ]);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={styles.container}>
        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
        >
          <Text style={[styles.title, { color: colors.text }]}>Set a new password</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Choose a secure new password for your Fixio account.
          </Text>

          <Text style={[styles.label, { color: colors.text }]}>New password</Text>
          <TextInput
            style={[
              styles.input,
              {
                color: colors.text,
                borderColor: colors.border,
                backgroundColor: colors.background,
              },
            ]}
            secureTextEntry
            placeholder="••••••••"
            placeholderTextColor={colors.textMuted}
            value={password}
            onChangeText={setPassword}
          />

          <TouchableOpacity
            onPress={() => void handleSubmit()}
            disabled={busy || password.length < 8}
            style={[
              styles.submitBtn,
              {
                backgroundColor: colors.primary,
                opacity: busy || password.length < 8 ? 0.6 : 1,
              },
            ]}
          >
            <Text style={styles.submitBtnText}>{busy ? "Saving…" : "Update password"}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 6,
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  submitBtn: {
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 20,
  },
  submitBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
});
