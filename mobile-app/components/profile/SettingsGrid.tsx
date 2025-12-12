import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Globe, Pencil, BellIcon, Lock } from "lucide-react-native";
import { t } from "i18next";

type Props = {
  onLanguagePress: () => void;
  onEditProfile?: () => void;
};

export default function SettingsGrid({ onLanguagePress, onEditProfile }: Props) {
  return (
    <View style={styles.settingsGrid}>
      <TouchableOpacity style={styles.settingCard} onPress={onLanguagePress}>
        <View style={styles.settingIconContainer}>
          <Globe color={"#2E7D32"} />
        </View>
        <Text style={styles.settingLabel}>{t('profile.language')}</Text>
        <Text style={styles.settingValue}>{t('profile.select')}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.settingCard} onPress={onEditProfile}>
        <View style={styles.settingIconContainer}>
          <Pencil color={"#2E7D32"} />
        </View>
        <Text style={styles.settingLabel}>{t('profile.edit_profile')}</Text>
        <Text style={styles.settingValue}>{t('profile.update_info')}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.settingCard}>
        <View style={styles.settingIconContainer}>
          <BellIcon color={"#2E7D32"} />
        </View>
        <Text style={styles.settingLabel}>{t('profile.notifications')}</Text>
        <Text style={styles.settingValue}>{t('profile.enable')}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.settingCard}>
        <View style={styles.settingIconContainer}>
          <Lock color={"#2E7D32"} />
        </View>
        <Text style={styles.settingLabel}>{t('profile.privacy')}</Text>
        <Text style={styles.settingValue}>{t('profile.settings')}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  settingsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 10,
    marginBottom: 20,
    marginLeft: 10,
  },
  settingCard: {
    width: "46%",
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 26,
    marginRight: "4%",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  settingIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#F0F1FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  settingValue: {
    fontSize: 12,
    color: "#666",
  },
});