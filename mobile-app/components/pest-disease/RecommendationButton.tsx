import React from "react";
import { TouchableOpacity, Text, StyleSheet, View } from "react-native";
import { ChevronRight } from "lucide-react-native";

interface RecommendationButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
}

export default function RecommendationButton({
  title,
  onPress,
  disabled,
}: RecommendationButtonProps) {
  return (
    <View style={{ marginVertical: 18 }}>
      <TouchableOpacity style={{ ...styles.button, opacity: disabled ? 0.5 : 1 }} onPress={onPress} disabled={disabled}>
        <Text style={styles.text}>{title}</Text>
        <ChevronRight color="#fff" size={20} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    backgroundColor: "#34A853",
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  text: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    marginRight: 8,
  },
});