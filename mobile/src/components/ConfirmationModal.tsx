import React from "react";
import { View, Text, TouchableOpacity, Modal, StyleSheet } from "react-native";
import { useTheme } from "../context/ThemeContext";

type ConfirmationModalProps = {
  visible: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  visible,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  isDestructive = false,
  onConfirm,
  onCancel,
}) => {
  const { colors } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.description, { color: colors.textMuted }]}>{description}</Text>

          <View style={styles.actions}>
            <TouchableOpacity
              onPress={onCancel}
              style={[styles.button, styles.cancelButton, { backgroundColor: colors.secondary }]}
            >
              <Text style={[styles.buttonText, { color: colors.secondaryText }]}>{cancelLabel}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onConfirm}
              style={[
                styles.button,
                {
                  backgroundColor: isDestructive ? colors.destructive : colors.primary,
                },
              ]}
            >
              <Text style={[styles.buttonText, { color: "#FFFFFF" }]}>{confirmLabel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
  },
  description: {
    fontSize: 14,
    marginTop: 8,
    lineHeight: 20,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 20,
  },
  button: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minWidth: 90,
    alignItems: "center",
  },
  cancelButton: {},
  buttonText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
