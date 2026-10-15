import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Modal } from "react-native";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { ThemeToggle } from "./ThemeToggle";
import { initialsFrom } from "../utils/bug-utils";
import * as Haptics from "expo-haptics";

type HeaderBarProps = {
  title?: string;
  onNavigateProfile?: () => void;
};

export const HeaderBar: React.FC<HeaderBarProps> = ({ title, onNavigateProfile }) => {
  const { colors } = useTheme();
  const { user, profile, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const name = profile?.name || (user?.user_metadata?.["name"] as string) || "";
  const email = profile?.email || user?.email || "";

  const handleProfilePress = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMenuOpen(true);
  };

  const handleGoProfile = () => {
    setMenuOpen(false);
    if (onNavigateProfile) onNavigateProfile();
  };

  const handleSignOut = () => {
    setMenuOpen(false);
    void signOut();
  };

  return (
    <View style={[styles.header, { backgroundColor: colors.background, borderColor: colors.border }]}>
      <View style={styles.leftContainer}>
        <View style={[styles.logoBadge, { backgroundColor: colors.brand }]}>
          <Text style={styles.logoText}>F</Text>
        </View>
        <Text style={[styles.brandText, { color: colors.text }]}>Fixio</Text>
      </View>

      <View style={styles.rightContainer}>
        <ThemeToggle />
        <TouchableOpacity
          onPress={handleProfilePress}
          style={[styles.avatar, { backgroundColor: colors.primary }]}
          accessibilityLabel="User menu"
        >
          <Text style={styles.avatarText}>{initialsFrom(name, email)}</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={menuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setMenuOpen(false)}
        >
          <View
            style={[
              styles.menuCard,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
            ]}
          >
            <Text style={[styles.menuName, { color: colors.text }]}>{name || "Account"}</Text>
            <Text style={[styles.menuEmail, { color: colors.textMuted }]}>{email}</Text>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <TouchableOpacity style={styles.menuItem} onPress={handleGoProfile}>
              <Text style={[styles.menuItemText, { color: colors.text }]}>Profile & Settings</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={handleSignOut}>
              <Text style={[styles.menuItemText, { color: colors.destructive }]}>Log out</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  leftContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  logoBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold",
  },
  brandText: {
    fontSize: 18,
    fontWeight: "700",
  },
  rightContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 13,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-start",
    alignItems: "flex-end",
    paddingTop: 60,
    paddingRight: 16,
  },
  menuCard: {
    width: 220,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  menuName: {
    fontSize: 15,
    fontWeight: "600",
  },
  menuEmail: {
    fontSize: 12,
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  menuItem: {
    paddingVertical: 10,
  },
  menuItemText: {
    fontSize: 14,
    fontWeight: "500",
  },
});
