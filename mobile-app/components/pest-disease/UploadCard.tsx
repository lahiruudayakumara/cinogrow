import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Camera, Upload, CloudUpload } from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { detectPestDisease } from "@/services/pestDiseaseAPI";
import { t } from "i18next";

export default function UploadCard() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });
      const uri =
        // @ts-ignore
        result?.assets?.[0]?.uri ??
        // @ts-ignore
        (result?.cancelled === false ? result?.uri : null);
      if (uri) setSelectedImage(uri);
    } catch (e) {
      console.warn("Image picker error:", e);
    }
  };

  const takePhoto = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.8,
      });
      const uri =
        // @ts-ignore
        result?.assets?.[0]?.uri ??
        (result?.canceled === false && result?.assets?.length
          ? result.assets[0].uri
          : null);
      if (uri) setSelectedImage(uri);
    } catch (e) {
      console.warn("Camera error:", e);
    }
  };

const submitForDetection = async () => {
  if (!selectedImage) return;

  try {
    setLoading(true);

    // Call backend in normal mode
    const res = await detectPestDisease(selectedImage, "normal");

    if (res.status === "infected") {
      // Alert.alert(
      //   t("pest_disease.result_title", { defaultValue: "Detection Result" }),
      //   `${t("pest_disease.name", { defaultValue: "Name" })}: ${res.name}\n` +
      //   `${t("pest_disease.confidence", { defaultValue: "Confidence" })}: ${res.confidence}%\n` +
      //   `${t("pest_disease.severity", { defaultValue: "Severity" })}: ${res.severity}\n` +
      //   `${res.recommendation ? t("pest_disease.recommendation", { defaultValue: "Recommendation" }) + ": " + res.recommendation : ""}`
      // );

      // Navigate to result page
      try {
        router.push({
          pathname: "/screens/pest-disease/ProcessResult",
          params: { data: JSON.stringify(res), image: selectedImage },
        });
      } catch {}
    } else if (res.status === "invalid" || res.status === "error") {
      Alert.alert(
        t("common.error", { defaultValue: "Error" }),
        res.message
      );
    }
  } catch (e: any) {
    Alert.alert(
      t("common.error", { defaultValue: "Error" }),
      e?.message || "Unknown error"
    );
  } finally {
    setLoading(false);
  }
};

  return (
    <View style={styles.uploadCard}>
      <View style={styles.plantIconContainer}>
        {selectedImage ? (
          <View style={{ alignItems: "center", justifyContent: "center" }}>
            <Image
              source={{ uri: selectedImage }}
              style={[
                styles.plantIcon,
                selectedImage ? { width: 300, height: 240, borderRadius: 12, marginTop: 150 } : { width: 120, height: 120, borderRadius: 12 },
              ]}
              resizeMode="cover"
            />
            <TouchableOpacity
              style={styles.removeOverlay}
              onPress={() => setSelectedImage(null)}
              accessibilityLabel="Remove selected image"
            >
              <Text style={styles.removeText}>{t("pest_disease.remove")}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Image
            source={require("@/assets/images/img/plant-under-sun.png")}
            style={styles.plantIcon}
            resizeMode="contain"
          />
        )}
      </View>

      {!selectedImage ? (
        <>
          <Text style={styles.uploadTitle}>
            {t("pest_disease.upload_photo")}
          </Text>
          <Text style={styles.uploadSubtitle}>
            {t("pest_disease.upload_instructions")}
          </Text>
        </>
      ) : (
        <View style={{ height: 140 }}></View>
      )}

      {selectedImage ? (
        <TouchableOpacity
          style={styles.processButton}
          onPress={submitForDetection}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" style={{ marginRight: 8 }} />
          ) : (
            <CloudUpload color="#fff" size={20} style={{ marginRight: 8 }} />
          )}
          <Text style={styles.chooseFileText}>
            {loading
              ? t("pest_disease.processing", { defaultValue: "Processing..." })
              : t("pest_disease.process_image")}
          </Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.cameraButton} onPress={takePhoto} disabled={loading}>
            <Camera color="#34A853" size={24} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.chooseFileButton} onPress={pickImage} disabled={loading}>
            <Upload color="#fff" size={20} style={{ marginRight: 8 }} />
            <Text style={styles.chooseFileText}>
              {t("pest_disease.choose_file")}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  uploadCard: {
    backgroundColor: "rgba(255, 255, 255, 1)",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#34A853",
    borderStyle: "dashed",
  },
  plantIconContainer: {
    width: 100,
    height: 100,
    backgroundColor: "#E8F5E9",
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  plantIcon: {
    width: 60,
    height: 60,
  },
  uploadTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 8,
  },
  uploadSubtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  buttonRow: {
    display: "flex",
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  cameraButton: {
    backgroundColor: "#E8F5E9",
    padding: 14,
    borderRadius: 12,
  },
  processButton: {
    display: "flex",
    justifyContent: "center",
    flexDirection: "row",
    backgroundColor: "#34A853",
    paddingHorizontal: 24,
    paddingVertical: 14,
    width: "100%",
    borderRadius: 12,
    alignItems: "center",
  },
  chooseFileButton: {
    display: "flex",
    justifyContent: "center",
    flexDirection: "row",
    backgroundColor: "#34A853",
    paddingHorizontal: 24,
    paddingVertical: 14,
    width: "80%",
    borderRadius: 12,
    alignItems: "center",
  },
  removeOverlay: {
    position: "absolute",
    bottom: -60,
    right: 8,
    backgroundColor: "#FF5252",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FF5252",
  },
  removeText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  chooseFileText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
});
