import React from "react";
import { View, Text, Image, StyleSheet, TouchableOpacity } from "react-native";
import { useLocalSearchParams } from "expo-router";
import Header from "@/components/pest-disease/Header";
import { ChevronRight } from "lucide-react-native";
import RecommendationButton from "@/components/pest-disease/RecommendationButton";

export default function ProcessResult() {
  // Get params passed via router.push
  const { image } = useLocalSearchParams<{ image?: string }>();

  return (
    <View style={styles.container}>
      <Header title={"Pest & Disease Result"} backButton />

      {image ? (
        <Image
          source={{ uri: image }}
          style={styles.image}
          resizeMode="cover"
        />
      ) : (
        <Text>No image provided</Text>
      )}

      {/* TODO: display AI processing result here */}
      <Text style={styles.resultText}>Result: Healthy leaf</Text>

      <RecommendationButton
        title="Advanced Pest & Disease Recommendations"
        onPress={() => {}}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "flex-start", padding: 24 },
  title: { fontSize: 22, fontWeight: "600", marginBottom: 16 },
  image: { width: "100%", height: 350, borderRadius: 12, marginBottom: 16 },
  resultText: { fontSize: 18, fontWeight: "500", color: "#1A1A1A" },
  getRecommendationsButton: {
    flexDirection: "row",
    backgroundColor: "#34A853",
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  getRecommendationsText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    marginRight: 8,
  },
});
