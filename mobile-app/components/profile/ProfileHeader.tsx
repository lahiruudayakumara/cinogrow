import React from "react";
import { View, Text, StyleSheet } from "react-native";

type Props = {
  name: string;
  email: string;
  memberSince?: string;
};

export default function ProfileHeader({ name, email, memberSince }: Props) {
  return (
    <View style={styles.profileCard}>
      <View style={styles.avatarContainer}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {name?.split(" ").map((n) => n[0]).slice(0, 2).join("")}
          </Text>
        </View>
        <View style={styles.statusBadge} />
      </View>
      <Text style={styles.name}>{name}</Text>
      <Text style={styles.email}>{email}</Text>
      {memberSince ? <Text style={styles.memberSince}>{memberSince}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  profileCard: {
    backgroundColor: "#fff",
    borderRadius: 24,
    paddingVertical: 30,
    paddingHorizontal: 20,
    alignItems: "center",
    marginTop: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    shadowColor: "#2E7D32",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 5,
  },
  avatarContainer: {
    position: "relative",
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#2E7D32",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    borderColor: "#fff",
  },
  avatarText: {
    fontSize: 36,
    fontWeight: "700",
    color: "#fff",
  },
  statusBadge: {
    position: "absolute",
    bottom: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#2E7D32",
    borderWidth: 3,
    borderColor: "#fff",
  },
  name: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  email: {
    fontSize: 15,
    color: "#666",
    marginBottom: 4,
  },
  memberSince: {
    fontSize: 13,
    color: "#999",
    marginTop: 4,
  },
});