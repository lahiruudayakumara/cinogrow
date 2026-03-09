import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, ActivityIndicator, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Header from "@/components/pest-disease/Header";
import RecentCard from "@/components/pest-disease/RecentCard";
import { useTranslation } from "react-i18next";
import axios from "axios";
import api from "@/config/api";

type Detection = {
  id: string | number;
  created_at: string;
  recommendation: string;
  confidence?: number;
  name?: string;
};

export default function RecentDetection() {
  const { t } = useTranslation();
  const [detections, setDetections] = useState<Detection[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch detections using this function
  const loadDetections = async () => {
    try {
      const response = await axios.get(
        `${api.API_BASE_URL}/pest-disease-detections`,
        { timeout: api.REQUEST_TIMEOUT, headers: api.DEFAULT_HEADERS }
      );

      console.log("API Response:", response.data);

      // Handle different response formats
      const data = response.data?.data || response.data || [];
      setDetections(data);
    } catch (error) {
      console.log("Fetch error:", error);
      setDetections([]); // Clear on error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetections(); // Load data on mount
  }, []);

  // Loader
  if (loading) {
    return (
      <SafeAreaView style={styles.loader}>
        <ActivityIndicator size="large" color="#0c6500" />
      </SafeAreaView>
    );
  }

  // No data
  if (!detections.length) {
    return (
      <SafeAreaView style={styles.container} edges={["bottom", "left", "right"]}>
        <Header title={t("pestDisease.recentDetection", "Recent Detection")} backButton />
        <Text style={styles.emptyText}>No detection records found.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["bottom", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Header title={t("pestDisease.recentDetection", "Recent Detection")} backButton />

        {detections.map((item) => (
          <RecentCard
            key={item.id}
            date={item.created_at}
            name={item.name || t('pestDisease.unknown', 'Unknown Disease')}
            severity={item.confidence ? `${Math.round(item.confidence * 100)}%` : "Unknown"}
            recommendation={item.recommendation}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    textAlign: "center",
    fontSize: 16,
    color: "#555",
  },
});