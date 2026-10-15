import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  RefreshControl,
} from "react-native";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../services/supabase";
import { dateGroupLabel, isSameMonth, isToday, type Bug } from "../utils/bug-utils";
import { HeaderBar } from "../components/HeaderBar";
import { BugComposer } from "../components/BugComposer";
import { OrbitalLoader } from "../components/OrbitalLoader";
import * as Haptics from "expo-haptics";

type DashboardScreenProps = {
  navigation: any;
};

export const DashboardScreen: React.FC<DashboardScreenProps> = ({ navigation }) => {
  const { colors } = useTheme();
  const { user, profile } = useAuth();
  const [bugs, setBugs] = useState<Bug[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchBugs = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from("bugs")
        .select("id, title, module, description, expected_result, actual_result, raw_input, created_at, updated_at")
        .order("created_at", { ascending: false });

      if (!error && data) {
        setBugs(data as Bug[]);
      }
    } catch (err) {
      console.error("Error fetching bugs:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void fetchBugs();
  }, [fetchBugs]);

  const onRefresh = () => {
    setRefreshing(true);
    void fetchBugs();
  };

  const firstName = (profile?.name || (user?.user_metadata?.["name"] as string) || "").split(" ")[0] || "there";

  const stats = [
    { label: "Total bugs", value: bugs.length },
    { label: "This month", value: bugs.filter((bug) => isSameMonth(bug.created_at)).length },
    { label: "Today", value: bugs.filter((bug) => isToday(bug.created_at)).length },
  ];

  const recent = bugs.slice(0, 6);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <HeaderBar onNavigateProfile={() => navigation.navigate("Profile")} />

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />
        }
      >
        <View style={styles.topRow}>
          <View>
            <Text style={[styles.eyebrow, { color: colors.textMuted }]}>DASHBOARD</Text>
            <Text style={[styles.greeting, { color: colors.text }]}>Hello {firstName}.</Text>
          </View>

          <TouchableOpacity
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              navigation.navigate("Document");
            }}
            style={[styles.docBtn, { backgroundColor: colors.brand }]}
          >
            <Text style={styles.docBtnText}>+ Document bug</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsGrid}>
          {stats.map((stat) => (
            <View
              key={stat.label}
              style={[
                styles.statCard,
                { backgroundColor: colors.card, borderColor: colors.cardBorder },
              ]}
            >
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>
                {stat.label.toUpperCase()}
              </Text>
              <Text style={[styles.statValue, { color: colors.text }]}>{stat.value}</Text>
            </View>
          ))}
        </View>

        <View style={styles.composerWrapper}>
          <BugComposer heading="Document a new bug" onSuccess={() => void fetchBugs()} />
        </View>

        <View style={styles.recentSection}>
          <View style={styles.recentHeader}>
            <Text style={[styles.recentTitle, { color: colors.text }]}>Recent bugs</Text>
            <TouchableOpacity onPress={() => navigation.navigate("History")}>
              <Text style={[styles.viewAllText, { color: colors.brand }]}>View all bugs</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <OrbitalLoader label="Loading your bugs…" sublabel="Fetching recent QA records" />
          ) : recent.length === 0 ? (
            <View
              style={[
                styles.emptyCard,
                { backgroundColor: colors.card, borderColor: colors.cardBorder },
              ]}
            >
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No bugs documented yet.</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
                Enter your first bug and it will automatically be organized into a professional QA report.
              </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate("Document")}
                style={[styles.emptyBtn, { backgroundColor: colors.brand }]}
              >
                <Text style={styles.emptyBtnText}>Document Your First Bug</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.recentList}>
              {recent.map((bug) => (
                <TouchableOpacity
                  key={bug.id}
                  onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    navigation.navigate("BugDetail", { bugId: bug.id });
                  }}
                  style={[
                    styles.recentCard,
                    { backgroundColor: colors.card, borderColor: colors.cardBorder },
                  ]}
                >
                  <View style={styles.recentMetaRow}>
                    <View style={[styles.recentBadge, { backgroundColor: colors.secondary }]}>
                      <Text style={[styles.recentBadgeText, { color: colors.secondaryText }]}>
                        {bug.module}
                      </Text>
                    </View>
                    <Text style={[styles.recentDate, { color: colors.textMuted }]}>
                      {dateGroupLabel(bug.created_at)}
                    </Text>
                  </View>
                  <Text style={[styles.recentCardTitle, { color: colors.text }]} numberOfLines={1}>
                    {bug.title}
                  </Text>
                  <Text style={[styles.recentCardDesc, { color: colors.textMuted }]} numberOfLines={2}>
                    {bug.description}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
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
  topRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
  },
  greeting: {
    fontSize: 28,
    fontWeight: "800",
    marginTop: 2,
  },
  docBtn: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  docBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  statsGrid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
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
    marginTop: 6,
  },
  composerWrapper: {
    marginBottom: 20,
  },
  recentSection: {
    marginTop: 10,
  },
  recentHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  recentTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: "600",
  },
  emptyCard: {
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    alignItems: "center",
    textAlign: "center",
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 20,
  },
  emptyBtn: {
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginTop: 16,
  },
  emptyBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  recentList: {
    gap: 12,
  },
  recentCard: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
  },
  recentMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  recentBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  recentBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  recentDate: {
    fontSize: 12,
  },
  recentCardTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  recentCardDesc: {
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
});
