import Header from "@/components/pest-disease/Header";
import RecentCard from "@/components/pest-disease/RecentCard";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

export default function RecentDetection() {
  const { t } = useTranslation();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={{ flex: 1 }}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ paddingBottom: 40, paddingHorizontal: 24 }}
      >
        <Header title={t("pestDisease.recentDetection", "Recent Detection")} backButton />

        <RecentCard
          date="2026-01-01"
          name={t("pestDisease.whiteRootDisease", "White Root Disease")}
          severity={t("pestDisease.high", "High")}
          recommendation={t(
            "pestDisease.whiteRootRecommendation",
            "Avoid planting in previously infected land..."
          )}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  image: { width: "100%", height: 350, borderRadius: 12, marginVertical: 16 },
  resultText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#1A1A1A",
    marginBottom: 8,
  },
});