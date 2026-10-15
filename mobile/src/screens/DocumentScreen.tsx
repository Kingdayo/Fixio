import React from "react";
import { View, Text, ScrollView, StyleSheet, SafeAreaView } from "react-native";
import { useTheme } from "../context/ThemeContext";
import { HeaderBar } from "../components/HeaderBar";
import { BugComposer } from "../components/BugComposer";

type DocumentScreenProps = {
  navigation: any;
};

export const DocumentScreen: React.FC<DocumentScreenProps> = ({ navigation }) => {
  const { colors } = useTheme();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <HeaderBar onNavigateProfile={() => navigation.navigate("Profile")} />

      <ScrollView contentContainerStyle={styles.container}>
        <Text style={[styles.eyebrow, { color: colors.textMuted }]}>DOCUMENT BUG</Text>
        <Text style={[styles.title, { color: colors.text }]}>
          Describe the bug in your own words.
        </Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          Write it exactly as you observed it. Fixio handles the title, module, description, expected
          result and actual result, and saves the record to your history.
        </Text>

        <View style={styles.composerWrapper}>
          <BugComposer
            heading="Raw bug observation"
            onSuccess={() => {
              // Bug report structured and saved
            }}
          />
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
    marginTop: 4,
    lineHeight: 32,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
  },
  composerWrapper: {
    marginTop: 20,
  },
});
