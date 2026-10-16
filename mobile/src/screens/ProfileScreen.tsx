import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  Switch,
} from "react-native";
import * as Notifications from "expo-notifications";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../services/supabase";
import { formatBugDate } from "../utils/bug-utils";
import { HeaderBar } from "../components/HeaderBar";
import * as Haptics from "expo-haptics";

type ProfileScreenProps = {
  navigation: any;
};

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ navigation }) => {
  const { colors, mode, setMode } = useTheme();
  const { user, profile, refreshProfile, signOut } = useAuth();

  const [name, setName] = useState("");
  const [savingName, setSavingName] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  const [bugCount, setBugCount] = useState(0);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  useEffect(() => {
    if (profile?.name !== undefined) {
      setName(profile.name);
    }
  }, [profile?.name]);

  useEffect(() => {
    async function getBugCount() {
      if (!user?.id) return;
      try {
        const { count } = await supabase
          .from("bugs")
          .select("id", { count: "exact", head: true });
        if (count !== null) setBugCount(count);
      } catch {
        // Fallback
      }
    }
    void getBugCount();

    async function checkNotifications() {
      try {
        if (typeof Notifications?.getPermissionsAsync === "function") {
          const settings = await Notifications.getPermissionsAsync();
          setNotificationsEnabled(
            Boolean(
              settings?.granted ||
                settings?.ios?.status === Notifications.IosAuthorizationStatus?.AUTHORIZED
            )
          );
        }
      } catch {
        setNotificationsEnabled(false);
      }
    }
    void checkNotifications();
  }, [user?.id]);

  const handleToggleNotifications = async (value: boolean) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (value) {
      try {
        if (typeof Notifications?.requestPermissionsAsync === "function") {
          const { status } = await Notifications.requestPermissionsAsync();
          setNotificationsEnabled(status === "granted");
          if (status === "granted") {
            Alert.alert("Notifications enabled", "You will receive updates for important QA activity.");
          } else {
            Alert.alert("Permission required", "Notification permissions were not granted.");
          }
        } else {
          setNotificationsEnabled(true);
        }
      } catch {
        setNotificationsEnabled(true);
        Alert.alert("Notifications preference updated", "In-app notifications are enabled.");
      }
    } else {
      setNotificationsEnabled(false);
    }
  };

  const handleSaveName = async () => {
    if (!user?.id || !name.trim()) return;
    setSavingName(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const { error } = await supabase
      .from("profiles")
      .update({ name: name.trim() })
      .eq("id", user.id);

    setSavingName(false);

    if (error) {
      Alert.alert("Error", "Your name could not be saved. Please try again.");
      return;
    }

    await refreshProfile();
    Alert.alert("Success", "Profile updated successfully.");
  };

  const handleChangePassword = async () => {
    if (!currentPassword || newPassword.length < 8) return;
    setSavingPassword(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
      current_password: currentPassword,
    });

    setSavingPassword(false);

    if (error) {
      Alert.alert("Error", error.message);
      return;
    }

    setCurrentPassword("");
    setNewPassword("");
    Alert.alert("Success", "Password updated successfully.");
  };

  const handleSignOut = async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await signOut();
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <HeaderBar />

      <ScrollView contentContainerStyle={styles.container}>
        <Text style={[styles.eyebrow, { color: colors.textMuted }]}>PROFILE</Text>
        <Text style={[styles.title, { color: colors.text }]}>Your account</Text>

        <View style={styles.statsGrid}>
          <View
            style={[
              styles.statCard,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
            ]}
          >
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>BUGS DOCUMENTED</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>{bugCount}</Text>
          </View>

          <View
            style={[
              styles.statCard,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
            ]}
          >
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>EMAIL</Text>
            <Text style={[styles.statValueText, { color: colors.text }]} numberOfLines={1}>
              {profile?.email || user?.email || "—"}
            </Text>
          </View>

          <View
            style={[
              styles.statCard,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
            ]}
          >
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>MEMBER SINCE</Text>
            <Text style={[styles.statValueText, { color: colors.text }]}>
              {profile?.created_at ? formatBugDate(profile.created_at) : "—"}
            </Text>
          </View>
        </View>

        <View style={styles.sectionsContainer}>
          {/* Display Name Section */}
          <View
            style={[
              styles.sectionCard,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Display Name</Text>
            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Display name</Text>
            <TextInput
              style={[
                styles.input,
                { color: colors.text, borderColor: colors.border, backgroundColor: colors.background },
              ]}
              value={name}
              onChangeText={setName}
            />
            <TouchableOpacity
              onPress={() => void handleSaveName()}
              disabled={savingName || !name.trim()}
              style={[
                styles.saveBtn,
                { backgroundColor: colors.brand, opacity: savingName || !name.trim() ? 0.6 : 1 },
              ]}
            >
              <Text style={styles.saveBtnText}>{savingName ? "Saving…" : "Save name"}</Text>
            </TouchableOpacity>
          </View>

          {/* Password Section */}
          <View
            style={[
              styles.sectionCard,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Change Password</Text>

            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Current password</Text>
            <TextInput
              style={[
                styles.input,
                { color: colors.text, borderColor: colors.border, backgroundColor: colors.background },
              ]}
              secureTextEntry
              value={currentPassword}
              onChangeText={setCurrentPassword}
            />

            <Text style={[styles.fieldLabel, { color: colors.textMuted, marginTop: 12 }]}>
              New password
            </Text>
            <TextInput
              style={[
                styles.input,
                { color: colors.text, borderColor: colors.border, backgroundColor: colors.background },
              ]}
              secureTextEntry
              placeholder="Min 8 characters"
              placeholderTextColor={colors.textMuted}
              value={newPassword}
              onChangeText={setNewPassword}
            />

            <TouchableOpacity
              onPress={() => void handleChangePassword()}
              disabled={savingPassword || newPassword.length < 8 || !currentPassword}
              style={[
                styles.saveBtn,
                {
                  backgroundColor: colors.primary,
                  opacity: savingPassword || newPassword.length < 8 || !currentPassword ? 0.6 : 1,
                },
              ]}
            >
              <Text style={styles.saveBtnText}>
                {savingPassword ? "Saving…" : "Change password"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Preferences Section */}
          <View
            style={[
              styles.sectionCard,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Preferences</Text>

            <View style={styles.prefRow}>
              <View>
                <Text style={[styles.prefTitle, { color: colors.text }]}>Dark Theme</Text>
                <Text style={[styles.prefSubtitle, { color: colors.textMuted }]}>
                  Use dark palette UI
                </Text>
              </View>
              <Switch
                value={mode === "dark"}
                onValueChange={(val) => setMode(val ? "dark" : "light")}
                trackColor={{ false: colors.border, true: colors.brand }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <View style={styles.prefRow}>
              <View>
                <Text style={[styles.prefTitle, { color: colors.text }]}>In-App Notifications</Text>
                <Text style={[styles.prefSubtitle, { color: colors.textMuted }]}>
                  Receive QA updates
                </Text>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={(val) => void handleToggleNotifications(val)}
                trackColor={{ false: colors.border, true: colors.brand }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => void handleSignOut()}
          style={[styles.logoutBtn, { backgroundColor: colors.secondary }]}
        >
          <Text style={[styles.logoutBtnText, { color: colors.text }]}>Log out</Text>
        </TouchableOpacity>
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
    paddingBottom: 40,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    marginTop: 2,
    marginBottom: 16,
  },
  statsGrid: {
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "800",
    marginTop: 4,
  },
  statValueText: {
    fontSize: 15,
    fontWeight: "600",
    marginTop: 4,
  },
  sectionsContainer: {
    gap: 16,
  },
  sectionCard: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 6,
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  saveBtn: {
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 10,
    alignSelf: "flex-start",
    marginTop: 14,
  },
  saveBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  prefRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  prefTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  prefSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginVertical: 14,
  },
  logoutBtn: {
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 24,
  },
  logoutBtnText: {
    fontSize: 15,
    fontWeight: "700",
  },
});
