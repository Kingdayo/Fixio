import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Share,
  Alert,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { useTheme } from "../context/ThemeContext";
import { supabase } from "../services/supabase";
import { bugReportText, formatBugDate, type Bug } from "../utils/bug-utils";
import { ConfirmationModal } from "./ConfirmationModal";

type Props = {
  bug: Bug;
  onDocumentAnother?: () => void;
  onDeleted?: () => void;
  onUpdated?: () => void;
};

export const BugReportCard: React.FC<Props> = ({
  bug,
  onDocumentAnother,
  onDeleted,
  onUpdated,
}) => {
  const { colors } = useTheme();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [draft, setDraft] = useState(bug);

  const handleSave = async () => {
    setSaving(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const { error } = await supabase
      .from("bugs")
      .update({
        title: draft.title.trim(),
        module: draft.module.trim(),
        description: draft.description.trim(),
        expected_result: draft.expected_result.trim(),
        actual_result: draft.actual_result.trim(),
      })
      .eq("id", bug.id);

    setSaving(false);

    if (error) {
      Alert.alert("Error", "Your changes could not be saved. Please try again.");
      return;
    }

    setEditing(false);
    if (onUpdated) onUpdated();
    Alert.alert("Success", "Bug report updated successfully.");
  };

  const handleDelete = async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const { error } = await supabase.from("bugs").delete().eq("id", bug.id);
    setDeleteOpen(false);

    if (error) {
      Alert.alert("Error", "This bug could not be deleted. Please try again.");
      return;
    }

    if (onDeleted) onDeleted();
  };

  const handleCopy = async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Clipboard.setStringAsync(bugReportText(bug));
    Alert.alert("Copied", "Bug report copied to clipboard.");
  };

  const handleShare = async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await Share.share({
        title: bug.title,
        message: bugReportText(bug),
      });
    } catch {
      // Ignored if cancelled
    }
  };

  const display = editing ? draft : bug;

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.cardBorder },
      ]}
    >
      <View style={styles.headerRow}>
        <View style={styles.titleContainer}>
          <View style={styles.eyebrowRow}>
            <View style={[styles.glowDot, { backgroundColor: colors.brand }]} />
            <Text style={[styles.eyebrow, { color: colors.brand }]}>BUG REPORT</Text>
          </View>
          {editing ? (
            <TextInput
              style={[
                styles.titleInput,
                { color: colors.text, borderColor: colors.border, backgroundColor: colors.background },
              ]}
              value={draft.title}
              onChangeText={(text) => setDraft({ ...draft, title: text })}
              placeholder="Bug title"
              placeholderTextColor={colors.textMuted}
            />
          ) : (
            <Text style={[styles.title, { color: colors.text }]}>{display.title}</Text>
          )}
        </View>

        {!editing && (
          <View style={[styles.moduleBadge, { backgroundColor: colors.brand }]}>
            <Text style={styles.moduleBadgeText}>{display.module}</Text>
          </View>
        )}
      </View>

      <View
        style={[
          styles.detailsBox,
          { backgroundColor: colors.cardSecondary, borderColor: colors.cardBorder },
        ]}
      >
        <View style={styles.fieldRow}>
          <View style={styles.halfField}>
            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>MODULE</Text>
            {editing ? (
              <TextInput
                style={[
                  styles.textInput,
                  { color: colors.text, borderColor: colors.border, backgroundColor: colors.background },
                ]}
                value={draft.module}
                onChangeText={(text) => setDraft({ ...draft, module: text })}
              />
            ) : (
              <Text style={[styles.fieldValue, { color: colors.text }]}>{display.module}</Text>
            )}
          </View>

          <View style={styles.halfField}>
            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>DOCUMENTED DATE</Text>
            <Text style={[styles.fieldValue, { color: colors.text }]}>
              {formatBugDate(bug.created_at)}
            </Text>
          </View>
        </View>

        <View style={styles.fieldSection}>
          <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>DESCRIPTION</Text>
          {editing ? (
            <TextInput
              style={[
                styles.textArea,
                { color: colors.text, borderColor: colors.border, backgroundColor: colors.background },
              ]}
              multiline
              numberOfLines={3}
              value={draft.description}
              onChangeText={(text) => setDraft({ ...draft, description: text })}
            />
          ) : (
            <Text style={[styles.fieldBody, { color: colors.text }]}>{display.description}</Text>
          )}
        </View>

        <View style={styles.fieldSection}>
          <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>EXPECTED RESULT</Text>
          {editing ? (
            <TextInput
              style={[
                styles.textArea,
                { color: colors.text, borderColor: colors.border, backgroundColor: colors.background },
              ]}
              multiline
              numberOfLines={3}
              value={draft.expected_result}
              onChangeText={(text) => setDraft({ ...draft, expected_result: text })}
            />
          ) : (
            <Text style={[styles.fieldBody, { color: colors.text }]}>
              {display.expected_result}
            </Text>
          )}
        </View>

        <View style={styles.fieldSection}>
          <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>ACTUAL RESULT</Text>
          {editing ? (
            <TextInput
              style={[
                styles.textArea,
                { color: colors.text, borderColor: colors.border, backgroundColor: colors.background },
              ]}
              multiline
              numberOfLines={3}
              value={draft.actual_result}
              onChangeText={(text) => setDraft({ ...draft, actual_result: text })}
            />
          ) : (
            <Text style={[styles.fieldBody, { color: colors.text }]}>{display.actual_result}</Text>
          )}
        </View>
      </View>

      <View style={styles.actionsRow}>
        {editing ? (
          <>
            <TouchableOpacity
              onPress={() => void handleSave()}
              disabled={saving}
              style={[styles.btn, { backgroundColor: colors.brand }]}
            >
              <Text style={styles.btnBrandText}>{saving ? "Saving…" : "Save changes"}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setDraft(bug);
                setEditing(false);
              }}
              style={styles.btnGhost}
            >
              <Text style={[styles.btnGhostText, { color: colors.textMuted }]}>Cancel</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity
              onPress={() => {
                setDraft(bug);
                setEditing(true);
              }}
              style={[styles.btn, { backgroundColor: colors.brand }]}
            >
              <Text style={styles.btnBrandText}>Edit</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => void handleCopy()}
              style={[styles.btn, { backgroundColor: colors.secondary }]}
            >
              <Text style={[styles.btnText, { color: colors.secondaryText }]}>Copy</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => void handleShare()}
              style={[styles.btn, { backgroundColor: colors.secondary }]}
            >
              <Text style={[styles.btnText, { color: colors.secondaryText }]}>Share</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setDeleteOpen(true)} style={styles.btnGhost}>
              <Text style={[styles.btnGhostText, { color: colors.destructive }]}>Delete</Text>
            </TouchableOpacity>

            {Boolean(onDocumentAnother) && (
              <TouchableOpacity
                onPress={onDocumentAnother}
                style={[styles.btn, { backgroundColor: colors.primary, marginLeft: "auto" }]}
              >
                <Text style={styles.btnBrandText}>+ Document another</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>

      <ConfirmationModal
        visible={deleteOpen}
        title="Delete this bug?"
        description="Are you sure you want to permanently delete this bug report? This action cannot be undone."
        confirmLabel="Delete bug"
        isDestructive
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleteOpen(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    marginVertical: 10,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  titleContainer: {
    flex: 1,
  },
  eyebrowRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  glowDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    lineHeight: 26,
  },
  titleInput: {
    fontSize: 18,
    fontWeight: "700",
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    marginTop: 4,
  },
  moduleBadge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  moduleBadgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  detailsBox: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginTop: 16,
    gap: 14,
  },
  fieldRow: {
    flexDirection: "row",
    gap: 16,
  },
  halfField: {
    flex: 1,
  },
  fieldSection: {},
  fieldLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  fieldValue: {
    fontSize: 14,
    fontWeight: "600",
  },
  fieldBody: {
    fontSize: 14,
    lineHeight: 20,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 14,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    textAlignVertical: "top",
  },
  actionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
    marginTop: 16,
  },
  btn: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  btnBrandText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  btnText: {
    fontSize: 13,
    fontWeight: "600",
  },
  btnGhost: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  btnGhostText: {
    fontSize: 13,
    fontWeight: "600",
  },
});
