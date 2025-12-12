import { ChevronLeft } from "lucide-react-native";
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { useNavigation } from "@react-navigation/native";

interface HeaderProps {
  title: string;
  backButton?: boolean;
}

export default function Header({ title, backButton }: HeaderProps) {
  const navigation = useNavigation<any>();

  return (
    <View style={styles.header}>
      {backButton && (
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <ChevronLeft color="#34A853" size={20} />
        </TouchableOpacity>
      )}
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    paddingHorizontal: 0,
    paddingVertical: 16,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#34A853",
    marginLeft: 12,
    flex: 1,
  },
  backButton: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
    backgroundColor: "#E8F5E9",
  },
});
