import { t } from "i18next";
import React from "react";
import { View, Text, TouchableOpacity, Modal, StyleSheet } from "react-native";

type Language = { code: string; label: string };

export function LanguageModal({
  visible,
  languages,
  selectedLanguage,
  onClose,
  onSelect,
}: {
  visible: boolean;
  languages: Language[];
  selectedLanguage: string;
  onClose: () => void;
  onSelect: (code: string) => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('profile.select_language')}</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.languageList}>
            {languages.map((l) => (
              <TouchableOpacity
                key={l.code}
                style={[
                  styles.languageOption,
                  selectedLanguage === l.code && styles.languageOptionActive,
                ]}
                onPress={() => onSelect(l.code)}
              >
                <Text style={[styles.languageLabel, selectedLanguage === l.code && styles.languageLabelActive]}>
                  {l.label}
                </Text>
                {selectedLanguage === l.code && <Text style={styles.checkmark}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: 20,
    paddingBottom: 40,
    paddingHorizontal: 20,
    maxHeight: "70%",
  },
  subscriptionModalContent: { maxHeight: "80%" },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  modalTitle: { fontSize: 16, fontWeight: "700", color: "#1A1A1A" },
  modalClose: { fontSize: 20, color: "#999", fontWeight: "300" },
  languageList: { paddingTop: 8 },
  languageOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: "#F8F9FD",
    borderRadius: 16,
    marginBottom: 12,
  },
  languageOptionActive: { backgroundColor: "#2E7D32" },
  languageLabel: { fontSize: 14, fontWeight: "600", color: "#1A1A1A", flex: 1 },
  languageLabelActive: { color: "#fff" },
  checkmark: { fontSize: 22, color: "#fff", fontWeight: "700" },
  plansList: { paddingTop: 8 },
  planCard: {
    backgroundColor: "#F8F9FD",
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: "transparent",
  },
  planCardActive: { backgroundColor: "#F0F1FF", borderColor: "#2E7D32" },
  planHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  planName: { fontSize: 22, fontWeight: "700", color: "#1A1A1A" },
  planNameActive: { color: "#2E7D32" },
  currentBadge: { backgroundColor: "#2E7D32", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  currentBadgeText: { fontSize: 12, fontWeight: "600", color: "#fff" },
  planPrice: { fontSize: 18, fontWeight: "600", color: "#666", marginBottom: 16 },
  planPriceActive: { color: "#2E7D32" },
  featuresList: { marginTop: 8 },
  featureItem: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  featureCheck: { fontSize: 16, color: "#2E7D32", marginRight: 10, fontWeight: "700" },
  featureText: { fontSize: 15, color: "#333" },
});