import React, { useState, useEffect } from "react";
import {
  SafeAreaView,
  ScrollView,
  View,
  StyleSheet,
  StatusBar,
  Alert,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import Header from "@/components/pest-disease/Header";
import UploadCard from "@/components/pest-disease/UploadCard";
import RecentCard from "@/components/pest-disease/RecentCard";
import RecommendationButton from "@/components/pest-disease/RecommendationButton";
import { t } from "i18next";

export default function PestDiseaseScreen() {
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
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={{ flex: 1, paddingHorizontal: 24 }}>
        <Header title={t("pest_disease.recommendations")} />
        <ScrollView showsVerticalScrollIndicator={false}>
          <UploadCard />
          <RecommendationButton
            disabled={true}
            title={t("pest_disease.get_recommendations")}
            onPress={() => {}}
          />
          <RecentCard
            date="2026-01-01"
            name="Powdery Mildew"
            severity="high"
            recommendation="Apply fungicide containing sulfur or potassium bicarbonate..."
          />
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
});
