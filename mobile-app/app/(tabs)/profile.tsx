import React, { useState } from "react";
import { ScrollView, Pressable, Text, StyleSheet } from "react-native";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n/i18n";

import ProfileHeader from "@/components/profile/ProfileHeader";
import SubscriptionCard from "@/components/profile/SubscriptionCard";
import SettingsGrid from "@/components/profile/SettingsGrid";
import { SubscriptionModal } from "@/components/profile/SubscriptionModal";
import { LanguageModal } from "@/components/profile/LanguageModal";
import { SafeAreaView } from "react-native-safe-area-context";

const languages = [
  { code: "en", label: "English" },
  { code: "si", label: "සිංහල" },
  { code: "ta", label: "தமிழ்" },
];

const subscriptionPlans = [
  {
    id: "free",
    name: "Free",
    price: "LKR 0",
    features: ["Basic features", "Limited access"],
  },
  {
    id: "pro",
    name: "Pro",
    price: "LKR 999/mo",
    features: ["All features", "Priority support", "Advanced analytics"],
  },
  {
    id: "premium",
    name: "Premium",
    price: "LKR 1,999/mo",
    features: ["Everything in Pro", "Custom branding", "API access"],
  },
];

export default function ProfileScreen() {
  useTranslation();
  const [selectedLanguage, setSelectedLanguage] = useState(i18n.language);
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const [subscriptionModalVisible, setSubscriptionModalVisible] =
    useState(false);
  const [currentPlan, setCurrentPlan] = useState("free");

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
    setSelectedLanguage(lang);
    setLanguageModalVisible(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={{ flex: 1, backgroundColor: "#F8F9FD" }}
        showsVerticalScrollIndicator={false}
      >
        <ProfileHeader
          name="John Doe"
          email="johndoe@example.com"
          memberSince="Member since Jan 2024"
        />
        <SubscriptionCard
          currentPlan={currentPlan}
          plans={subscriptionPlans}
          onOpenSubscription={() => setSubscriptionModalVisible(true)}
        />
        <SettingsGrid
          onLanguagePress={() => setLanguageModalVisible(true)}
          onEditProfile={() => {}}
        />
        <LanguageModal
          visible={languageModalVisible}
          languages={languages}
          selectedLanguage={selectedLanguage}
          onClose={() => setLanguageModalVisible(false)}
          onSelect={changeLanguage}
        />
        <SubscriptionModal
          visible={subscriptionModalVisible}
          plans={subscriptionPlans}
          currentPlan={currentPlan}
          onClose={() => setSubscriptionModalVisible(false)}
          onSelectPlan={(id) => setCurrentPlan(id)}
        />

        {/* Navigate to Home Screen */}
        <Pressable
          style={styles.navButton}
          onPress={() => router.push("/screens/home/homeScreen")}
          accessibilityRole="button"
          accessibilityLabel="Go to Home"
        >
          <Text style={styles.navButtonText}>Go to Home</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFBFC",
  },
  navButton: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 24,
    backgroundColor: "#2E7D32",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  navButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
