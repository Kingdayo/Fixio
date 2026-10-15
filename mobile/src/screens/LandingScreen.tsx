import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from "react-native";
import { useTheme } from "../context/ThemeContext";
import { ThemeToggle } from "../components/ThemeToggle";
import * as Haptics from "expo-haptics";

type LandingScreenProps = {
  navigation: any;
};

export const LandingScreen: React.FC<LandingScreenProps> = ({ navigation }) => {
  const { colors } = useTheme();

  const handleStart = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate("Auth");
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <View style={styles.brandRow}>
            <View style={[styles.logoBadge, { backgroundColor: colors.brand }]}>
              <Text style={styles.logoText}>F</Text>
            </View>
            <Text style={[styles.brandName, { color: colors.text }]}>Fixio</Text>
          </View>
          <View style={styles.headerRight}>
            <ThemeToggle />
            <TouchableOpacity
              onPress={handleStart}
              style={[styles.signInBtn, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.signInBtnText}>Sign in</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.heroSection}>
          <Text style={[styles.eyebrow, { color: colors.textMuted }]}>Personal QA log</Text>
          <Text style={[styles.heroTitle, { color: colors.text }]}>
            Describe what broke. Get a proper bug report.
          </Text>
          <Text style={[styles.heroDescription, { color: colors.textMuted }]}>
            Paste the issue exactly as you saw it. Fixio writes the title, module, description,
            expected result and actual result, then files it to your own private history.
          </Text>

          <TouchableOpacity
            onPress={handleStart}
            style={[styles.ctaBtn, { backgroundColor: colors.brand }]}
          >
            <Text style={styles.ctaBtnText}>Start documenting</Text>
          </TouchableOpacity>
        </View>

        <View
          style={[
            styles.previewCard,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
        >
          <Text style={[styles.cardLabel, { color: colors.textMuted }]}>YOU TYPE</Text>
          <Text style={[styles.typedText, { color: colors.text }]}>
            “Google sign up gives server error.”
          </Text>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <Text style={[styles.cardLabel, { color: colors.brand }]}>FIXIO FILES</Text>
          <Text style={[styles.reportTitle, { color: colors.text }]}>
            Server Error During Google Sign-Up
          </Text>

          <View style={styles.grid}>
            <View style={styles.gridCol}>
              <Text style={[styles.fieldTitle, { color: colors.textMuted }]}>MODULE</Text>
              <Text style={[styles.fieldValue, { color: colors.text }]}>Sign Up - Google</Text>
            </View>
            <View style={styles.gridCol}>
              <Text style={[styles.fieldTitle, { color: colors.textMuted }]}>EXPECTED RESULT</Text>
              <Text style={[styles.fieldValue, { color: colors.text }]}>
                The user should be able to complete registration using Google.
              </Text>
            </View>
            <View style={styles.gridCol}>
              <Text style={[styles.fieldTitle, { color: colors.textMuted }]}>DESCRIPTION</Text>
              <Text style={[styles.fieldValue, { color: colors.text }]}>
                Attempting to register using Google returns a server error.
              </Text>
            </View>
            <View style={styles.gridCol}>
              <Text style={[styles.fieldTitle, { color: colors.textMuted }]}>ACTUAL RESULT</Text>
              <Text style={[styles.fieldValue, { color: colors.text }]}>
                The process returns a server error.
              </Text>
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
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
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
    fontSize: 20,
    fontWeight: "700",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  signInBtn: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  signInBtnText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 14,
  },
  heroSection: {
    marginVertical: 12,
  },
  eyebrow: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: "800",
    lineHeight: 38,
    marginTop: 8,
  },
  heroDescription: {
    fontSize: 16,
    lineHeight: 24,
    marginTop: 12,
  },
  ctaBtn: {
    borderRadius: 999,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignSelf: "flex-start",
    marginTop: 20,
  },
  ctaBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  previewCard: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    marginTop: 28,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
  },
  typedText: {
    fontSize: 16,
    fontWeight: "500",
    marginTop: 6,
  },
  divider: {
    height: 1,
    marginVertical: 16,
  },
  reportTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginTop: 6,
  },
  grid: {
    marginTop: 16,
    gap: 12,
  },
  gridCol: {},
  fieldTitle: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  fieldValue: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 2,
  },
});
