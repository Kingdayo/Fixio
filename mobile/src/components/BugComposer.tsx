import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import { Camera, Image as ImageIcon, X } from "lucide-react-native";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { structureAndSaveBug } from "../services/aiQA";
import type { Bug } from "../utils/bug-utils";
import { OrbitalLoader } from "./OrbitalLoader";
import { BugReportCard } from "./BugReportCard";

type BugComposerProps = {
  heading?: string;
  onSuccess?: (bug: Bug) => void;
};

export const BugComposer: React.FC<BugComposerProps> = ({
  heading = "Document a new bug",
  onSuccess,
}) => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [raw, setRaw] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Bug | null>(null);

  const handlePickImage = async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Permission to access photo gallery is required.");
      return;
    }

    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });

    if (!pickerResult.canceled && pickerResult.assets[0]) {
      setImageUri(pickerResult.assets[0].uri);
    }
  };

  const handleTakePhoto = async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Permission to access camera is required.");
      return;
    }

    const cameraResult = await ImagePicker.launchCameraAsync({
      quality: 0.8,
    });

    if (!cameraResult.canceled && cameraResult.assets[0]) {
      setImageUri(cameraResult.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    if (busy) return;
    if (!raw.trim()) {
      Alert.alert("Input required", "Please describe the bug before continuing.");
      return;
    }

    if (!user?.id) {
      Alert.alert("Authentication required", "Please sign in to document bugs.");
      return;
    }

    setBusy(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    let fullInput = raw.trim();
    if (imageUri) {
      fullInput += `\n[Attached Evidence Image: ${imageUri}]`;
    }

    const outcome = await structureAndSaveBug(fullInput, user.id);

    setBusy(false);

    if (!outcome.ok) {
      Alert.alert("Error", outcome.error);
      return;
    }

    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setResult(outcome.bug);
    setRaw("");
    setImageUri(null);
    if (onSuccess) onSuccess(outcome.bug);
  };

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.composerCard,
          { backgroundColor: colors.card, borderColor: colors.cardBorder },
        ]}
      >
        <View style={styles.headerRow}>
          <View style={[styles.headingBadge, { backgroundColor: colors.brand }]}>
            <Text style={styles.headingBadgeText}>F</Text>
          </View>
          <Text style={[styles.headingText, { color: colors.text }]}>{heading}</Text>
        </View>

        <View style={styles.inputContainer}>
          <TextInput
            style={[
              styles.textArea,
              {
                color: colors.text,
                backgroundColor: colors.background,
                borderColor: colors.border,
              },
            ]}
            multiline
            numberOfLines={5}
            placeholder="Example: When trying to sign up on mobile, the app crashes after clicking submit."
            placeholderTextColor={colors.textMuted}
            value={raw}
            onChangeText={setRaw}
            editable={!busy}
          />

          {busy && (
            <View
              style={[
                styles.loadingOverlay,
                { backgroundColor: colors.card },
              ]}
            >
              <OrbitalLoader
                label="Structuring QA Bug Report…"
                sublabel="Extracting titles, modules, expectations, and evidence"
              />
            </View>
          )}
        </View>

        {Boolean(imageUri) && (
          <View style={styles.imagePreviewContainer}>
            <Image source={{ uri: imageUri! }} style={styles.imagePreview} />
            <TouchableOpacity
              style={[styles.removeImageBtn, { backgroundColor: colors.destructive }]}
              onPress={() => setImageUri(null)}
            >
              <X size={14} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.actionsRow}>
          <TouchableOpacity
            onPress={() => void handlePickImage()}
            disabled={busy}
            style={[styles.iconBtn, { backgroundColor: colors.cardSecondary }]}
          >
            <ImageIcon size={18} color={colors.text} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => void handleTakePhoto()}
            disabled={busy}
            style={[styles.iconBtn, { backgroundColor: colors.cardSecondary }]}
          >
            <Camera size={18} color={colors.text} />
          </TouchableOpacity>

          {Boolean(raw || imageUri) && (
            <TouchableOpacity
              onPress={() => {
                setRaw("");
                setImageUri(null);
              }}
              disabled={busy}
              style={styles.clearBtn}
            >
              <Text style={[styles.clearBtnText, { color: colors.textMuted }]}>Clear</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={() => void handleSubmit()}
            disabled={busy || !raw.trim()}
            style={[
              styles.submitBtn,
              {
                backgroundColor: colors.brand,
                opacity: busy || !raw.trim() ? 0.5 : 1,
              },
            ]}
          >
            <Text style={styles.submitBtnText}>{busy ? "Organizing…" : "Document bug"}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {Boolean(result) && (
        <View style={styles.resultContainer}>
          <Text style={[styles.resultTitle, { color: colors.brand }]}>ORGANIZED QA REPORT</Text>
          <BugReportCard
            bug={result!}
            onDocumentAnother={() => setResult(null)}
            onDeleted={() => setResult(null)}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  composerCard: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  headingBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  headingBadgeText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 15,
  },
  headingText: {
    fontSize: 18,
    fontWeight: "700",
  },
  inputContainer: {
    position: "relative",
  },
  textArea: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    fontSize: 15,
    lineHeight: 22,
    minHeight: 120,
    textAlignVertical: "top",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  imagePreviewContainer: {
    position: "relative",
    marginTop: 12,
    alignSelf: "flex-start",
  },
  imagePreview: {
    width: 80,
    height: 80,
    borderRadius: 12,
  },
  removeImageBtn: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 14,
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  clearBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  clearBtnText: {
    fontSize: 14,
    fontWeight: "500",
  },
  submitBtn: {
    marginLeft: "auto",
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  submitBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  resultContainer: {
    marginTop: 20,
  },
  resultTitle: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.2,
    marginBottom: 8,
  },
});
