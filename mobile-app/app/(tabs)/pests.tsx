import React, { useState, useEffect } from "react";
import {
  SafeAreaView,
  ScrollView,
  View,
  StyleSheet,
  StatusBar,
  Alert,
  Text,
  ActivityIndicator,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import Header from "@/components/pest-disease/Header";
import UploadCard from "@/components/pest-disease/UploadCard";
import RecentCard from "@/components/pest-disease/RecentCard";
import RecommendationButton from "@/components/pest-disease/RecommendationButton";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import axios from "axios";
import api from "@/config/api";

type Detection = {
  id: string | number;
  created_at: string;
  recommendation: string;
  confidence?: number;
  name?: string;
  severity?: string;
};

// Format ISO date string to readable format
function formatDate(isoString: string | undefined): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return isoString;
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function PestDiseaseScreen() {
  const { t } = useTranslation();
  const [detections, setDetections] = useState<Detection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const camPerm = await ImagePicker.requestCameraPermissionsAsync();
        const libPerm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (camPerm.status !== "granted" || libPerm.status !== "granted") {
          Alert.alert(
            "Permissions required",
            "Camera and media library permissions are required to upload photos."
          );
        }
      } catch (err) {
        console.warn("Permission request error:", err);
      }
    })();
    // Fetch detections
    const loadDetections = async () => {
      try {
        const response = await axios.get(
          `${api.API_BASE_URL}/pest-disease-detections`,
          { timeout: api.REQUEST_TIMEOUT, headers: api.DEFAULT_HEADERS }
        );
        const data = response.data?.data || response.data || [];
        setDetections(data);
      } catch (error) {
        console.log("Fetch error:", error);
        setDetections([]);
      } finally {
        setLoading(false);
      }
    };
    loadDetections();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={{ flex: 1, paddingHorizontal: 24 }}>
        <Header title={t("pest_disease.recommendations")} />
        <ScrollView showsVerticalScrollIndicator={false}>
          <UploadCard />
          <RecommendationButton
            disabled={false}
            title={t("pest_disease.get_recommendations")}
            onPress={() => router.push("/screens/pest-disease/RecentDetection")}
          />
          <Text style={styles.recentDetectionText}>{t("pestDisease.recentDetection", "Recent Detection")}</Text>
          {loading ? (
            <ActivityIndicator size="large" color="#0c6500" />
          ) : detections.length === 0 ? (
            <Text>No detection records found.</Text>
          ) : (
              detections.length > 0 && (
                <RecentCard
                  key={detections[detections.length - 1].id}
                  date={formatDate(detections[detections.length - 1].created_at)}
                  name={detections[detections.length - 1].name || t('pestDisease.unknown', 'Unknown Disease')}
                  severity={detections[detections.length - 1].severity || t('pestDisease.unknownSeverity', 'Unknown')}
                  recommendation={detections[detections.length - 1].recommendation || ''}
                />
              )
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FFFB",
  },
  recentDetectionText: {
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 4,
    marginBottom: 14,
  },
});
