import { View, Text, TouchableOpacity, Modal, ScrollView, StyleSheet } from "react-native";

type Plan = { id: string; name: string; price: string; features: string[] };


export function SubscriptionModal({
  visible,
  plans,
  currentPlan,
  onClose,
  onSelectPlan,
}: {
  visible: boolean;
  plans: Plan[];
  currentPlan: string;
  onClose: () => void;
  onSelectPlan: (id: string) => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, styles.subscriptionModalContent]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Choose Your Plan</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.plansList} showsVerticalScrollIndicator={false}>
            {plans.map((plan) => (
              <TouchableOpacity
                key={plan.id}
                style={[styles.planCard, currentPlan === plan.id && styles.planCardActive]}
                onPress={() => {
                  onSelectPlan(plan.id);
                  onClose();
                }}
              >
                <View style={styles.planHeader}>
                  <Text style={[styles.planName, currentPlan === plan.id && styles.planNameActive]}>{plan.name}</Text>
                  {currentPlan === plan.id && (
                    <View style={styles.currentBadge}>
                      <Text style={styles.currentBadgeText}>Current</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.planPrice, currentPlan === plan.id && styles.planPriceActive]}>{plan.price}</Text>
                <View style={styles.featuresList}>
                  {plan.features.map((f, i) => (
                    <View key={i} style={styles.featureItem}>
                      <Text style={styles.featureCheck}>✓</Text>
                      <Text style={styles.featureText}>{f}</Text>
                    </View>
                  ))}
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
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