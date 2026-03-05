import React, { useState } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { useTranslation } from "react-i18next";
import Header from "@/components/pest-disease/Header";
import RecommendationButton from "@/components/pest-disease/RecommendationButton";
import { detectPestDisease } from "@/services/pestDiseaseAPI";
import { Lightbulb } from "lucide-react-native";

type DetectionResult = {
  status: "infected" | "invalid" | "error";
  name?: string;
  confidence?: number;
  severity?: "High" | "Medium" | "Low";
  recommendation?: string;
  category?: string;
  affected_area?: string;
  symptoms?: string[];
  cause?: string;
  life_cycle?: string;
  recommendations?: string[];
  message?: string;
};

export default function ProcessResult() {
  const { t } = useTranslation();
  const { image, data } = useLocalSearchParams<{
    image?: string;
    data?: string;
  }>();
  const [loading, setLoading] = useState(false);

  // Parse normal detection result
  let result: DetectionResult | null = null;
  try {
    result = data ? (JSON.parse(data) as DetectionResult) : null;
  } catch {
    result = null;
  }

  const handleAdvancedRecommendations = async () => {
    if (!image) return;
    try {
      setLoading(true);

      // Call backend in advanced mode
      const advancedResult = await detectPestDisease(image, "advanced");

      if (advancedResult.status === "infected") {
        // Navigate to advanced result page
        router.push({
          pathname: "/screens/pest-disease/AdvancedResult",
          params: {
            image,
            data: JSON.stringify(advancedResult),
          },
        });
      } else {
        Alert.alert(
          "Error",
          advancedResult.message || "No advanced data available"
        );
      }
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to fetch advanced detection");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={{ flex: 1 }}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ paddingBottom: 40, paddingHorizontal: 24 }}
      >
      <Header title={t("pestDisease.resultTitle", "Pest & Disease Result")} backButton />

      {image ? (
        <Image
          source={{ uri: image }}
          style={styles.image}
          resizeMode="cover"
        />
      ) : (
        <Text>{t("common.noImage", "No image provided")}</Text>
      )}

      {result ? (
        result.status === "infected" ? (
          <View>
            <View
              style={{
                marginTop: 8,
                width: "100%",
                padding: 12,
                borderRadius: 8,
                backgroundColor:
                  result.severity === "Low"
                    ? "#7efc0082" // apple green
                    : result.severity === "Medium"
                    ? "#ffd90045" // yellow
                    : "#ff440051", // red for high
              }}
            >
              <Text style={styles.resultText}>
                {t("common.name", "Name")}: {result.name}
              </Text>
              <Text style={styles.resultText}>
                {t("common.confidence", "Confidence")}: {result.confidence}%
              </Text>
              <Text style={styles.resultText}>
                {t("common.severity", "Severity")}: {result.severity}
              </Text>
            </View>

            <View style={{ marginTop: 16 }}>
              {result.recommendation && (
                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8, gap: 8, backgroundColor: "#fdc794ff", padding: 8, borderRadius: 6 }}>
                  <Lightbulb color="#ff8800ff" />
                  <Text style={styles.resultText}>
                    {t("common.recommendation", "Recommendation")}: {result.recommendation}
                  </Text>
                </View>
              )}
            </View>
          </View>
        ) : (
          <Text style={[styles.resultText, { marginTop: 16 }]}> 
            {result.message || t("pestDisease.noValidResult", "No valid detection result")}
          </Text>
        )
      ) : (
        <Text style={[styles.resultText, { marginTop: 16 }]}> 
          {t("pestDisease.noData", "No detection data available")}
        </Text>
      )}


      {loading ? <ActivityIndicator style={{ marginTop: 36 }} /> : (
        <RecommendationButton
        title={
          loading
            ? t("common.loading", "Loading...")
            : t("pestDisease.advancedButton", "Advanced Pest & Disease Recommendations")
        }
        onPress={handleAdvancedRecommendations}
        disabled={loading}
      />
      )}
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
    paddingEnd: 24,
  },
});
