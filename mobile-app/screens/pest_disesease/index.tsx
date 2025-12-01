import React from "react";
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  StatusBar,
} from "react-native";
import {
  Camera,
  Upload,
  ChevronRight,
  ThumbsUp,
  ThumbsDown,
  Share2,
  MessageCircle,
} from "lucide-react-native";

export default function PestDiseaseScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Pest & Disease Recommendations</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Upload Card */}
        <View style={styles.uploadCard}>
          <View style={styles.plantIconContainer}>
            <Image
              source={{
                uri: "https://img.icons8.com/color/96/plant-under-sun.png",
              }}
              style={styles.plantIcon}
              resizeMode="contain"
            />
          </View>

          <Text style={styles.uploadTitle}>Upload Photo</Text>
          <Text style={styles.uploadSubtitle}>
            Capture the entire affected leaf in good natural light. Avoid
            shadows or glare and focus on visible symptoms like spots, holes,
            discoloration, or insects.
          </Text>

          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.cameraButton}>
              <Camera color="#34A853" size={24} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.chooseFileButton}>
              <Upload color="#fff" size={20} style={{ marginRight: 8 }} />
              <Text style={styles.chooseFileText}>Choose File</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ marginHorizontal: 16, marginBottom: 16 }}>
          <TouchableOpacity style={styles.getRecommendationsButton}>
            <Text style={styles.getRecommendationsText}>
              Get Complete Diseases & Pest Recommendations
            </Text>
            <ChevronRight color="#fff" size={20} />
          </TouchableOpacity>
        </View>

        {/* Recent Recommendations Header */}
        <Text style={styles.recentTitle}>Recent Recommendations</Text>

        {/* Recent Item 1 - Powdery Mildew */}
        <View style={styles.recentCardHigh}>
          <View style={styles.recentContent}>
            <Text style={styles.recentDate}>2025-01-10</Text>
            <Text style={styles.recentName}>Name: Powdery Mildew</Text>
            <View style={styles.severityRow}>
              <Text style={styles.severityLabel}>Severity:</Text>
              <View style={styles.highDot} />
              <Text style={styles.severityTextHigh}>High</Text>
            </View>
            <Text style={styles.recommendation} numberOfLines={1}>
              Recommendation: Apply fungicide containing sulfur or potassium
              bicarbonate...
            </Text>
          </View>
          <ChevronRight color="#999" size={24} />
        </View>

        {/* Recent Item 2 - Aphids */}
        <View style={styles.recentCardMedium}>
          <View style={styles.recentContent}>
            <Text style={styles.recentDate}>2025-01-10</Text>
            <Text style={styles.recentName}>Name: Aphids</Text>
            <View style={styles.severityRow}>
              <Text style={styles.severityLabel}>Severity:</Text>
              <View style={styles.mediumDot} />
              <Text style={styles.severityTextMedium}>Medium</Text>
            </View>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FFFB",
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#34A853",
    textAlign: "left",
  },
  uploadCard: {
    margin: 16,
    backgroundColor: "#fff",
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
  chooseFileText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
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
  recentTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#34A853",
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 12,
  },
  recentCardHigh: {
    marginHorizontal: 16,
    backgroundColor: "#FFEFEF",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#FFB3B3",
  },
  recentCardMedium: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: "#FFF8E1",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#FFE082",
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
  actionBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 16,
    backgroundColor: "#fff",
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  shareButton: {
    backgroundColor: "#34A853",
    padding: 10,
    borderRadius: 8,
  },
  moreText: {
    color: "#34A853",
    fontWeight: "600",
  },
});
