import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
} from "react-native";
import { Eye, EyeOff } from "lucide-react-native";
import { useTheme } from "../context/ThemeContext";
import { supabase } from "../services/supabase";
import * as Haptics from "expo-haptics";

type AuthScreenProps = {
  navigation: any;
};

export const AuthScreen: React.FC<AuthScreenProps> = ({ navigation }) => {
  const { colors } = useTheme();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async () => {
    if (busy) return;
    if (!email.trim() || !password) {
      Alert.alert("Input required", "Please enter your email and password.");
      return;
    }

    setBusy(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      if (mode === "signup") {
        if (password !== confirmPassword) {
          Alert.alert("Password mismatch", "Passwords do not match.");
          setBusy(false);
          return;
        }

        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { name: name.trim() },
          },
        });

        if (error) throw error;
        Alert.alert("Account created", "Welcome to Fixio!");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) throw error;
      }
    } catch (err: any) {
      Alert.alert("Authentication error", err.message || "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      Alert.alert("Email required", "Please enter your email address first.");
      return;
    }

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
    if (error) {
      Alert.alert("Error", error.message);
    } else {
      Alert.alert("Check your inbox", "Password reset instructions sent to your email.");
    }
  };

  const handleGoogleSignIn = async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      "Google Sign-In",
      "Google Sign-In is configured via web OAuth. Enter your credentials or sign up directly."
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <View style={[styles.logoBadge, { backgroundColor: colors.brand }]}>
            <Text style={styles.logoText}>F</Text>
          </View>
          <Text style={[styles.brandName, { color: colors.text }]}>Fixio</Text>
        </View>

        <View
          style={[
            styles.authCard,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
        >
          <Text style={[styles.title, { color: colors.text }]}>
            {mode === "signin" ? "Sign in to Fixio" : "Create your account"}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Your bug history stays private to your account.
          </Text>

          <View style={styles.form}>
            {mode === "signup" && (
              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.text }]}>Name</Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      color: colors.text,
                      borderColor: colors.border,
                      backgroundColor: colors.background,
                    },
                  ]}
                  placeholder="Ada Lovelace"
                  placeholderTextColor={colors.textMuted}
                  value={name}
                  onChangeText={setName}
                />
              </View>
            )}

            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.text }]}>Email</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    color: colors.text,
                    borderColor: colors.border,
                    backgroundColor: colors.background,
                  },
                ]}
                placeholder="you@company.com"
                placeholderTextColor={colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.text }]}>Password</Text>
              <View style={styles.passwordWrapper}>
                <TextInput
                  style={[
                    styles.input,
                    styles.passwordInput,
                    {
                      color: colors.text,
                      borderColor: colors.border,
                      backgroundColor: colors.background,
                    },
                  ]}
                  secureTextEntry={!showPassword}
                  placeholder="••••••••"
                  placeholderTextColor={colors.textMuted}
                  value={password}
                  onChangeText={setPassword}
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff size={20} color={colors.textMuted} />
                  ) : (
                    <Eye size={20} color={colors.textMuted} />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {mode === "signup" && (
              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.text }]}>Confirm Password</Text>
                <View style={styles.passwordWrapper}>
                  <TextInput
                    style={[
                      styles.input,
                      styles.passwordInput,
                      {
                        color: colors.text,
                        borderColor: colors.border,
                        backgroundColor: colors.background,
                      },
                    ]}
                    secureTextEntry={!showConfirmPassword}
                    placeholder="••••••••"
                    placeholderTextColor={colors.textMuted}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                  />
                  <TouchableOpacity
                    style={styles.eyeBtn}
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff size={20} color={colors.textMuted} />
                    ) : (
                      <Eye size={20} color={colors.textMuted} />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <TouchableOpacity
              onPress={() => void handleSubmit()}
              disabled={busy}
              style={[
                styles.submitBtn,
                { backgroundColor: colors.primary, opacity: busy ? 0.7 : 1 },
              ]}
            >
              <Text style={styles.submitBtnText}>
                {busy ? "Working…" : mode === "signin" ? "Sign in" : "Create account"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => void handleGoogleSignIn()}
              style={[
                styles.googleBtn,
                { backgroundColor: colors.secondary, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.googleBtnText, { color: colors.secondaryText }]}>
                Continue with Google
              </Text>
            </TouchableOpacity>

            <View style={styles.footerRow}>
              <TouchableOpacity
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setMode(mode === "signin" ? "signup" : "signin");
                }}
              >
                <Text style={[styles.switchModeText, { color: colors.brand }]}>
                  {mode === "signin" ? "Create an account" : "I already have an account"}
                </Text>
              </TouchableOpacity>

              {mode === "signin" && (
                <TouchableOpacity onPress={() => void handleForgotPassword()}>
                  <Text style={[styles.forgotText, { color: colors.textMuted }]}>
                    Forgot password?
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    padding: 20,
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginVertical: 20,
  },
  logoBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "bold",
  },
  brandName: {
    fontSize: 22,
    fontWeight: "700",
  },
  authCard: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  form: {
    marginTop: 20,
    gap: 14,
  },
  field: {},
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
  passwordWrapper: {
    position: "relative",
    justifyContent: "center",
  },
  passwordInput: {
    paddingRight: 44,
  },
  eyeBtn: {
    position: "absolute",
    right: 12,
    padding: 6,
  },
  submitBtn: {
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 6,
  },
  submitBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  googleBtn: {
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
  },
  googleBtnText: {
    fontSize: 15,
    fontWeight: "600",
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
  },
  switchModeText: {
    fontSize: 14,
    fontWeight: "600",
  },
  forgotText: {
    fontSize: 14,
  },
});
