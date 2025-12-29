import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Trophy } from "lucide-react-native";
import { t } from "i18next";

type Plan = { id: string; name: string; price: string; features: string[] };

type Props = {
  currentPlan: string;
  plans: Plan[];
  onOpenSubscription: () => void;
};

export default function SubscriptionCard({ currentPlan, plans, onOpenSubscription }: Props) {
  return (
    <View style={styles.subscriptionCard}>
      <View style={styles.subscriptionHeader}>
        <View>
          <Text style={styles.subscriptionLabel}>{t('profile.current_plan')}</Text>
          <Text style={styles.subscriptionPlan}>
            {plans.find((p) => p.id === currentPlan)?.name === "Free" ? t('profile.free_plan') : plans.find((p) => p.id === currentPlan)?.name}
          </Text>
        </View>
        <View style={styles.crownBadge}>
          <Trophy color={"#2E7D32"} />
        </View>
      </View>
      <TouchableOpacity style={styles.upgradeButton} onPress={onOpenSubscription}>
        <Text style={styles.upgradeButtonText}>
          {currentPlan === "free" ? t('profile.upgrade_to_premium') : t('profile.manage_subscription')}
        </Text>
        <Text style={styles.upgradeButtonArrow}>→</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  subscriptionCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 3,
  },
  subscriptionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  subscriptionLabel: {
    fontSize: 13,
    color: "#666",
    marginBottom: 4,
  },
  subscriptionPlan: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  crownBadge: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#2E7D3247",
    alignItems: "center",
    justifyContent: "center",
  },
  upgradeButton: {
    flexDirection: "row",
    backgroundColor: "#2E7D32",
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "space-between",
  },
  upgradeButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  upgradeButtonArrow: {
    fontSize: 20,
    color: "#fff",
    fontWeight: "600",
  },
});