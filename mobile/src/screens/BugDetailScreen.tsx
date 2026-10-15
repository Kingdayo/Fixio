import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from "react-native";
import { ArrowLeft, ChevronDown, ChevronUp } from "lucide-react-native";
import { useTheme } from "../context/ThemeContext";
import { supabase } from "../services/supabase";
import type { Bug } from "../utils/bug-utils";
import { HeaderBar } from "../components/HeaderBar";
import { BugReportCard } from "../components/BugReportCard";
import { OrbitalLoader } from "../components/OrbitalLoader";

type BugDetailScreenProps = {
  navigation: any;
  route: {
    params: {
      bugId: string;
    };
  };
};

export const BugDetailScreen: React.FC<BugDetailScreenProps> = ({
  navigation,
  route,
}) => {
  const { colors } = useTheme();
  const { bugId } = route.params;
  const [bug, setBug] = useState<Bug | null>(null);
  const [loading, setLoading] = useState(true);
  const [showOriginal, setShowOriginal] = useState(false);

  const fetchBug = useCallback(async () => {
    if (!bugId) return;
    try {
      const { data, error } = await supabase
        .from("bugs")
        .select("id, title, module, description, expected_result, actual_result, raw_input, created_at, updated_at")
        .eq("id", bugId)
        .maybeSingle();

      if (!error && data) {
        setBug(data as Bug);
      } else {
        setBug(null);
      }
    } catch (err) {
      console.error("Error fetching bug detail:", err);
    } finally {
      setLoading(false);
    }
  }, [bugId]);

  useEffect(() => {
    void fetchBug();
  }, [fetchBug]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <HeaderBar onNavigateProfile={() => navigation.navigate("Profile")} />

      <ScrollView contentContainerStyle={styles.container}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <ArrowLeft size={16} color={colors.textMuted} />
          <Text style={[styles.backBtnText, { color: colors.textMuted }]}>
            Back to history
          </Text>
        </TouchableOpacity>

        {loading ? (
          <OrbitalLoader label="Loading bug report…" sublabel="Retrieving QA details" />
        ) : !bug ? (
          <View
            style={[
              styles.emptyCard,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
            ]}
          >
            <Text style={[styles.emptyText, { color: colors.text }]}>
              This bug report is no longer available.
            </Text>
          </View>
        ) : (
          <View style={styles.detailContent}>
            <BugReportCard
              bug={bug}
              onDocumentAnother={() => navigation.navigate("Document")}
              onDeleted={() => navigation.navigate("History")}
              onUpdated={() => void fetchBug()}
            />

            <TouchableOpacity
              onPress={() => setShowOriginal(!showOriginal)}
              style={[
                styles.collapsibleHeader,
                { backgroundColor: colors.card, borderColor: colors.cardBorder },
              ]}
            >
              <Text style={[styles.collapsibleTitle, { color: colors.text }]}>
                Original input observation
              </Text>
              {showOriginal ? (
                <ChevronUp size={18} color={colors.textMuted} />
              ) : (
                <ChevronDown size={18} color={colors.textMuted} />
              )}
            </TouchableOpacity>

            {showOriginal && (
              <View
                style={[
                  styles.collapsibleBody,
                  { backgroundColor: colors.cardSecondary, borderColor: colors.cardBorder },
                ]}
              >
                <Text style={[styles.rawText, { color: colors.text }]}>{bug.raw_input}</Text>
              </View>
            )}
          </View>
        )}
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
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 16,
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: "500",
  },
  emptyCard: {
    borderRadius: 20,
    padding: 30,
    alignItems: "center",
    borderWidth: 1,
    marginTop: 20,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: "600",
  },
  detailContent: {
    gap: 16,
  },
  collapsibleHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  collapsibleTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  collapsibleBody: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginTop: -8,
  },
  rawText: {
    fontSize: 14,
    lineHeight: 22,
  },
});
