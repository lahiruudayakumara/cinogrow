import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { ChevronRight } from "lucide-react-native";
import { t } from "i18next";

type Props = {
  date: string;
  name: string;
  severity: "high" | "medium" | "low" | any;
  recommendation?: string;
};

export default function RecentCard({ date, name, severity, recommendation }: Props) {
  const high = severity === "high";
  const medium = severity === "medium";

  return (
    <View style={high ? styles.recentCardHigh : styles.recentCardMedium}>
      <View style={styles.recentContent}>
        <Text style={styles.recentDate}>{date}</Text>
        <Text style={styles.recentName}>{t("common.name", "Name")}: {name}</Text>
        <View style={styles.severityRow}>
          <Text style={styles.severityLabel}>{t("common.severity", "Severity")}:</Text>
          <View style={high ? styles.highDot : styles.mediumDot} />
          <Text style={high ? styles.severityTextHigh : styles.severityTextMedium}>
            {high ? t("common.high", "High") : medium ? t("common.medium", "Medium") : t("common.low", "Low")}
          </Text>
        </View>
        {recommendation ? (
          <Text style={styles.recommendation} numberOfLines={1}>
            {t("common.recommendation", "Recommendation")}: {recommendation}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  recentCardHigh: {
    backgroundColor: "#FFEFEF",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#FFB3B3",
    marginBottom: 12,
  },
  recentCardMedium: {
    marginTop: 12,
    backgroundColor: "#FFF8E1",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#FFE082",
    marginBottom: 12,
  },
  recentContent: {
    flex: 1,
  },
  recentDate: {
    fontSize: 12,
    color: "#888",
    marginBottom: 4,
  },
  recentName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  severityRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  severityLabel: {
    fontSize: 14,
    color: "#666",
    marginRight: 8,
  },
  highDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#F44336",
    marginRight: 6,
  },
  mediumDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#FFC107",
    marginRight: 6,
  },
  severityTextHigh: {
    fontSize: 14,
    fontWeight: "600",
    color: "#F44336",
  },
  severityTextMedium: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FF8F00",
  },
  recommendation: {
    fontSize: 14,
    color: "#444",
  },
});