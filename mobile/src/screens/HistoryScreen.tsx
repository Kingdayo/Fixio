import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  RefreshControl,
  Alert,
} from "react-native";
import { Search, CheckSquare, Square, Trash2, Filter } from "lucide-react-native";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../services/supabase";
import {
  formatBugDate,
  groupBugsByDay,
  isSameMonth,
  isToday,
  type Bug,
} from "../utils/bug-utils";
import { HeaderBar } from "../components/HeaderBar";
import { OrbitalLoader } from "../components/OrbitalLoader";
import { ConfirmationModal } from "../components/ConfirmationModal";
import * as Haptics from "expo-haptics";

type Sort = "newest" | "oldest" | "edited";
type Range = "all" | "today" | "month";

type HistoryScreenProps = {
  navigation: any;
};

export const HistoryScreen: React.FC<HistoryScreenProps> = ({ navigation }) => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [bugs, setBugs] = useState<Bug[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [query, setQuery] = useState("");
  const [selectedModule, setSelectedModule] = useState("all");
  const [range, setRange] = useState<Range>("all");
  const [sort, setSort] = useState<Sort>("newest");

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);

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

  const modules = useMemo(
    () => Array.from(new Set(bugs.map((bug) => bug.module).filter(Boolean))).sort(),
    [bugs]
  );

  const filtersActive = Boolean(query) || selectedModule !== "all" || range !== "all" || sort !== "newest";

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    let list = bugs.filter((bug) => {
      if (selectedModule !== "all" && bug.module !== selectedModule) return false;
      if (range === "today" && !isToday(bug.created_at)) return false;
      if (range === "month" && !isSameMonth(bug.created_at)) return false;
      if (!needle) return true;
      return [bug.title, bug.module, bug.description, bug.expected_result, bug.actual_result]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });

    list = [...list].sort((a, b) => {
      if (sort === "oldest") return a.created_at.localeCompare(b.created_at);
      if (sort === "edited") return b.updated_at.localeCompare(a.updated_at);
      return b.created_at.localeCompare(a.created_at);
    });

    return list;
  }, [bugs, query, selectedModule, range, sort]);

  const groups = groupBugsByDay(filtered);
  const allFilteredIds = useMemo(() => filtered.map((b) => b.id), [filtered]);
  const isAllSelected =
    allFilteredIds.length > 0 && allFilteredIds.every((id) => selectedIds.has(id));

  const toggleSelectAll = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allFilteredIds));
    }
  };

  const toggleSelectGroup = (groupBugIds: string[]) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const isGroupFullySelected = groupBugIds.every((id) => selectedIds.has(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (isGroupFullySelected) {
        for (const id of groupBugIds) next.delete(id);
      } else {
        for (const id of groupBugIds) next.add(id);
      }
      return next;
    });
  };

  const toggleSelectBug = (bugId: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(bugId)) next.delete(bugId);
      else next.add(bugId);
      return next;
    });
  };

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0 || isDeleting) return;
    setIsDeleting(true);

    const idsToDelete = Array.from(selectedIds);
    const { error } = await supabase.from("bugs").delete().in("id", idsToDelete);

    setIsDeleting(false);
    setDeleteConfirmOpen(false);

    if (error) {
      Alert.alert("Error", "Failed to delete selected bugs. Please try again.");
      return;
    }

    const count = idsToDelete.length;
    setSelectedIds(new Set());
    void fetchBugs();
    Alert.alert("Success", `${count} ${count === 1 ? "bug report" : "bug reports"} deleted.`);
  };

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
            <Text style={[styles.eyebrow, { color: colors.textMuted }]}>BUG HISTORY</Text>
            <Text style={[styles.title, { color: colors.text }]}>
              {bugs.length} documented {bugs.length === 1 ? "bug" : "bugs"}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => navigation.navigate("Document")}
            style={[styles.docBtn, { backgroundColor: colors.brand }]}
          >
            <Text style={styles.docBtnText}>+ Document bug</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.controlsSection}>
          <View
            style={[
              styles.searchBar,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
            ]}
          >
            <Search size={18} color={colors.textMuted} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search titles, modules, descriptions…"
              placeholderTextColor={colors.textMuted}
              value={query}
              onChangeText={setQuery}
            />
          </View>

          <View style={styles.filterRow}>
            <TouchableOpacity
              onPress={() => setFilterMenuOpen(!filterMenuOpen)}
              style={[
                styles.filterToggleBtn,
                { backgroundColor: colors.cardSecondary, borderColor: colors.cardBorder },
              ]}
            >
              <Filter size={16} color={colors.text} />
              <Text style={[styles.filterToggleText, { color: colors.text }]}>
                Filters & Sorting {filtersActive ? "•" : ""}
              </Text>
            </TouchableOpacity>

            {filtered.length > 0 && (
              <TouchableOpacity
                onPress={toggleSelectAll}
                style={[
                  styles.selectAllBtn,
                  { backgroundColor: colors.cardSecondary, borderColor: colors.cardBorder },
                ]}
              >
                {isAllSelected ? (
                  <CheckSquare size={16} color={colors.brand} />
                ) : (
                  <Square size={16} color={colors.textMuted} />
                )}
                <Text style={[styles.selectAllText, { color: colors.text }]}>
                  {isAllSelected ? "Deselect all" : "Select all"}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {filterMenuOpen && (
            <View
              style={[
                styles.filterPanel,
                { backgroundColor: colors.card, borderColor: colors.cardBorder },
              ]}
            >
              <Text style={[styles.filterGroupTitle, { color: colors.textMuted }]}>SORT ORDER</Text>
              <View style={styles.chipRow}>
                {(["newest", "oldest", "edited"] as Sort[]).map((s) => (
                  <TouchableOpacity
                    key={s}
                    onPress={() => setSort(s)}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: sort === s ? colors.brand : colors.cardSecondary,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: sort === s ? "#FFFFFF" : colors.text },
                      ]}
                    >
                      {s === "newest" ? "Newest first" : s === "oldest" ? "Oldest first" : "Recently edited"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.filterGroupTitle, { color: colors.textMuted, marginTop: 12 }]}>
                DATE RANGE
              </Text>
              <View style={styles.chipRow}>
                {(["all", "today", "month"] as Range[]).map((r) => (
                  <TouchableOpacity
                    key={r}
                    onPress={() => setRange(r)}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: range === r ? colors.brand : colors.cardSecondary,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: range === r ? "#FFFFFF" : colors.text },
                      ]}
                    >
                      {r === "all" ? "Any date" : r === "today" ? "Today" : "This month"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {modules.length > 0 && (
                <>
                  <Text style={[styles.filterGroupTitle, { color: colors.textMuted, marginTop: 12 }]}>
                    MODULE
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.chipRow}>
                      <TouchableOpacity
                        onPress={() => setSelectedModule("all")}
                        style={[
                          styles.chip,
                          {
                            backgroundColor: selectedModule === "all" ? colors.brand : colors.cardSecondary,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            { color: selectedModule === "all" ? "#FFFFFF" : colors.text },
                          ]}
                        >
                          All modules
                        </Text>
                      </TouchableOpacity>

                      {modules.map((m) => (
                        <TouchableOpacity
                          key={m}
                          onPress={() => setSelectedModule(m)}
                          style={[
                            styles.chip,
                            {
                              backgroundColor: selectedModule === m ? colors.brand : colors.cardSecondary,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.chipText,
                              { color: selectedModule === m ? "#FFFFFF" : colors.text },
                            ]}
                          >
                            {m}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </>
              )}

              {filtersActive && (
                <TouchableOpacity
                  onPress={() => {
                    setQuery("");
                    setSelectedModule("all");
                    setRange("all");
                    setSort("newest");
                  }}
                  style={styles.clearFilterBtn}
                >
                  <Text style={[styles.clearFilterText, { color: colors.brand }]}>
                    Reset all filters
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {selectedIds.size > 0 && (
          <View
            style={[
              styles.batchBar,
              { backgroundColor: colors.card, borderColor: colors.brand },
            ]}
          >
            <Text style={[styles.batchCountText, { color: colors.text }]}>
              {selectedIds.size} {selectedIds.size === 1 ? "report" : "reports"} selected
            </Text>
            <TouchableOpacity
              onPress={() => setDeleteConfirmOpen(true)}
              style={[styles.batchDeleteBtn, { backgroundColor: colors.destructive }]}
            >
              <Trash2 size={14} color="#FFFFFF" />
              <Text style={styles.batchDeleteText}>Delete ({selectedIds.size})</Text>
            </TouchableOpacity>
          </View>
        )}

        {loading ? (
          <OrbitalLoader label="Loading bug history…" sublabel="Fetching all QA records" />
        ) : bugs.length === 0 ? (
          <View
            style={[
              styles.emptyCard,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
            ]}
          >
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No bugs documented yet.</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate("Document")}
              style={[styles.emptyBtn, { backgroundColor: colors.brand }]}
            >
              <Text style={styles.emptyBtnText}>Document Your First Bug</Text>
            </TouchableOpacity>
          </View>
        ) : filtered.length === 0 ? (
          <View
            style={[
              styles.emptyCard,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
            ]}
          >
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No matching bugs found.</Text>
            <TouchableOpacity
              onPress={() => {
                setQuery("");
                setSelectedModule("all");
                setRange("all");
                setSort("newest");
              }}
            >
              <Text style={[styles.clearFilterText, { color: colors.brand, marginTop: 8 }]}>
                Clear filters
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.groupsContainer}>
            {groups.map((group) => {
              const groupBugIds = group.bugs.map((b) => b.id);
              const isGroupFullySelected =
                groupBugIds.length > 0 && groupBugIds.every((id) => selectedIds.has(id));

              return (
                <View key={group.date} style={styles.groupSection}>
                  <View style={styles.groupHeader}>
                    <TouchableOpacity
                      onPress={() => toggleSelectGroup(groupBugIds)}
                      style={styles.checkboxTouch}
                    >
                      {isGroupFullySelected ? (
                        <CheckSquare size={18} color={colors.brand} />
                      ) : (
                        <Square size={18} color={colors.textMuted} />
                      )}
                    </TouchableOpacity>
                    <Text style={[styles.groupLabel, { color: colors.textMuted }]}>
                      {group.label.toUpperCase()}
                    </Text>
                    <View style={[styles.groupBadge, { backgroundColor: colors.secondary }]}>
                      <Text style={[styles.groupBadgeText, { color: colors.secondaryText }]}>
                        {group.bugs.length}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.bugsList}>
                    {group.bugs.map((bug) => {
                      const isSelected = selectedIds.has(bug.id);
                      return (
                        <View
                          key={bug.id}
                          style={[
                            styles.bugRowCard,
                            {
                              backgroundColor: isSelected ? `${colors.brand}15` : colors.card,
                              borderColor: isSelected ? colors.brand : colors.cardBorder,
                            },
                          ]}
                        >
                          <TouchableOpacity
                            onPress={() => toggleSelectBug(bug.id)}
                            style={styles.checkboxTouch}
                          >
                            {isSelected ? (
                              <CheckSquare size={20} color={colors.brand} />
                            ) : (
                              <Square size={20} color={colors.textMuted} />
                            )}
                          </TouchableOpacity>

                          <TouchableOpacity
                            onPress={() => {
                              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                              navigation.navigate("BugDetail", { bugId: bug.id });
                            }}
                            style={styles.bugContent}
                          >
                            <View style={styles.bugMetaRow}>
                              <View
                                style={[styles.moduleTag, { backgroundColor: colors.secondary }]}
                              >
                                <Text
                                  style={[styles.moduleTagText, { color: colors.secondaryText }]}
                                >
                                  {bug.module}
                                </Text>
                              </View>
                              <Text style={[styles.bugDate, { color: colors.textMuted }]}>
                                {formatBugDate(bug.created_at)}
                              </Text>
                            </View>
                            <Text
                              style={[styles.bugTitleText, { color: colors.text }]}
                              numberOfLines={1}
                            >
                              {bug.title}
                            </Text>
                            <Text
                              style={[styles.bugDescText, { color: colors.textMuted }]}
                              numberOfLines={2}
                            >
                              {bug.description}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <ConfirmationModal
          visible={deleteConfirmOpen}
          title={`Delete ${selectedIds.size} bug reports?`}
          description={`Are you sure you want to permanently delete ${selectedIds.size} selected reports? This action cannot be undone.`}
          confirmLabel="Delete selected"
          isDestructive
          onConfirm={() => void handleBatchDelete()}
          onCancel={() => setDeleteConfirmOpen(false)}
        />
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
    marginBottom: 16,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
  },
  title: {
    fontSize: 24,
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
  controlsSection: {
    gap: 10,
    marginBottom: 16,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 46,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  filterToggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  filterToggleText: {
    fontSize: 13,
    fontWeight: "600",
  },
  selectAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  selectAllText: {
    fontSize: 13,
    fontWeight: "600",
  },
  filterPanel: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    marginTop: 6,
  },
  filterGroupTitle: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipText: {
    fontSize: 12,
    fontWeight: "600",
  },
  clearFilterBtn: {
    marginTop: 12,
    alignSelf: "flex-start",
  },
  clearFilterText: {
    fontSize: 13,
    fontWeight: "600",
  },
  batchBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  batchCountText: {
    fontSize: 14,
    fontWeight: "700",
  },
  batchDeleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  batchDeleteText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  emptyCard: {
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    alignItems: "center",
    marginVertical: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
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
  groupsContainer: {
    gap: 20,
  },
  groupSection: {},
  groupHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  checkboxTouch: {
    padding: 4,
  },
  groupLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
  },
  groupBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  groupBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  bugsList: {
    gap: 10,
  },
  bugRowCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    gap: 10,
  },
  bugContent: {
    flex: 1,
  },
  bugMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  moduleTag: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  moduleTagText: {
    fontSize: 11,
    fontWeight: "600",
  },
  bugDate: {
    fontSize: 11,
  },
  bugTitleText: {
    fontSize: 15,
    fontWeight: "700",
  },
  bugDescText: {
    fontSize: 13,
    marginTop: 2,
  },
});
