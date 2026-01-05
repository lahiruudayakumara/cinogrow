import React from "react";
import { View, Text, Image, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import Header from "@/components/pest-disease/Header";
import { Lightbulb, TriangleAlert } from "lucide-react-native";
import { useTranslation } from "react-i18next";

type AdvancedResultType = {
  status: "infected" | "invalid" | "error";
  name?: string;
  confidence?: number;
  severity?: "High" | "Medium" | "Low" | "Moderate" | "Critical";
  category?: string;
  affected_area?: string;
  symptoms?: string[];
  cause?: string;
  life_cycle?: string;
  recommendations?: string[];
  message?: string;
};

export default function AdvancedResult() {
  const { image, data } = useLocalSearchParams<{
    image?: string;
    data?: string;
  }>();
  const { t } = useTranslation();

  let result: AdvancedResultType | null = null;
  try {
    result = data ? (JSON.parse(data) as AdvancedResultType) : null;
  } catch {
    result = null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={{ flex: 1 }}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ paddingBottom: 40, paddingHorizontal: 24 }}
      >
  <Header title={t("pestDisease.advancedButton", "Advanced Pest & Disease Recommendations")} backButton />

      {image && (
        <Image
          source={{ uri: image }}
          style={styles.image}
          resizeMode="cover"
        />
      )}

      {result ? (
        result.status === "infected" ? (
          <View style={{ marginTop: 16 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                width: "100%",
                padding: 6,
                backgroundColor: "#e0ffddff",
                borderRadius: 8,
              }}
            >
              <View>
                <Text style={styles.text}>{t("common.name", "Name")}: {result.name}</Text>
                <Text style={styles.text}>{t("pestDisease.category", "Category")}: {result.category}</Text>
              </View>
              <View
                style={{
                  width: "25%",
                  padding: 4,
                  borderRadius: 8,
                  justifyContent: "center",
                  alignItems: "center",
                  gap: 4,
                  backgroundColor:
                    result.severity === "Low"
                      ? "#7efc0082" // green
                      : result.severity === "Moderate"
                      ? "#ffd90045" // yellow
                      : result.severity === "High"
                      ? "#ff8c0051" // orange
                      : result.severity === "Critical"
                      ? "#ff440051" // red
                      : "#e0e0e0", // fallback
                }}
              >
                <TriangleAlert />
                <Text
                  style={{ fontSize: 9, color: "#1A1A1A", marginBottom: 8 }}
                >
                  {t("common.severity", "Severity")}: {result.severity}
                </Text>
              </View>
            </View>
            <View
              style={{
                marginTop: 8,
                padding: 8,
                backgroundColor: "#f0f8ffff",
                borderRadius: 8,
              }}
            >
              <Text style={styles.text}>{t("common.confidence", "Confidence")}: {result.confidence}%</Text>

              {/* Background bar */}
              <View
                style={{
                  height: 20,
                  width: "100%",
                  backgroundColor: "#E0E0E0", // gray background
                  borderRadius: 10,
                  overflow: "hidden",
                  marginTop: 4,
                }}
              >
                {/* Filled bar */}
                <View
                  style={{
                    height: "100%",
                    width:
                      result.confidence !== undefined
                        ? `${result.confidence}%`
                        : "0%", // fill according to confidence
                    backgroundColor:
                      (result.confidence ?? 0) >= 75
                        ? "#4CAF50" // green for high confidence
                        : (result.confidence ?? 0) >= 40
                        ? "#FFC107" // yellow for medium confidence
                        : "#F44336", // red for low confidence
                    borderRadius: 10,
                  }}
                />
              </View>
            </View>

            <View
              style={{
                marginTop: 8,
                backgroundColor: "#daffd7ff",
                padding: 8,
                borderRadius: 8,
              }}
            >
              <Text style={styles.text}>
                {t("pestDisease.affectedArea", "Affected Area")}: {result.affected_area}
              </Text>
            </View>

            <View
              style={{
                marginTop: 8,
                backgroundColor: "#fff4e5ff",
                padding: 8,
                borderRadius: 8,
              }}
            >
              <Text style={styles.text}>
                {t("pestDisease.symptoms", "Symptoms")}: {result.symptoms?.join(", ")}
              </Text>
            </View>

            <View
              style={{
                marginTop: 8,
                backgroundColor: "#f9e1f3ff",
                padding: 8,
                borderRadius: 8,
              }}
            >
              <Text style={styles.text}>{t("pestDisease.cause", "Cause")}: {result.cause}</Text>
            </View>

            <View
              style={{
                marginTop: 8,
                backgroundColor: "#d1f3fc7d",
                padding: 8,
                borderRadius: 8,
              }}
            >
              <Text style={styles.text}>{t("pestDisease.lifeCycle", "Life Cycle")}: {result.life_cycle}</Text>
            </View>
            <View style={{ marginTop: 16 }}>
              {result.recommendations && (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: 8,
                    gap: 8,
                    backgroundColor: "#fdc794ff",
                    padding: 8,
                    borderRadius: 6,
                  }}
                >
                  <Lightbulb color="#ff8800ff" />
                  <Text style={styles.resultText}>
                    {t("common.recommendation", "Recommendation")}: {result.recommendations}
                  </Text>
                </View>
              )}
            </View>
          </View>
        ) : (
          <Text style={styles.text}>
            {result.message || t("pestDisease.noAdvancedData", "No advanced data available")}
          </Text>
        )
      ) : (
  <Text style={styles.text}>{t("pestDisease.noData", "No data provided")}</Text>
      )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  image: { width: "100%", height: 350, borderRadius: 12, marginVertical: 16 },
  text: { fontSize: 16, color: "#1A1A1A", marginBottom: 8 },
  resultText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#1A1A1A",
    marginBottom: 8,
    paddingEnd: 24,
  },
});
