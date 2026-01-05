import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Animated,
  Dimensions,
} from "react-native";
import { MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import type { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "@/navigation/OilYieldNavigator";
import { SafeAreaView } from "react-native-safe-area-context";

type NavigationProp = StackNavigationProp<RootStackParamList>;

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - 52) / 2;

function Greeting() {
  const [liked, setLiked] = useState(false);
  const scaleAnim = React.useRef(new Animated.Value(1)).current;
  const rotateAnim = React.useRef(new Animated.Value(0)).current;

  const handlePress = () => {
    Animated.parallel([
      Animated.sequence([
        Animated.spring(scaleAnim, {
          toValue: 0.98,
          useNativeDriver: true,
          speed: 50,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          friction: 3,
        }),
      ]),
      Animated.sequence([
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
    setLiked((v) => !v);
  };

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      {/* <TouchableOpacity
        style={styles.greetingContainer}
        activeOpacity={1}
        onPress={handlePress}
      >
        <BlurView intensity={60} tint="light" style={styles.greetingBlur}>
          <View style={styles.greetingContent}>
            <View style={styles.greetingTop}>
              <View>
                <Text style={styles.greetingLabel}>WELCOME BACK</Text>
                <Text style={styles.greetingTitle}>Hey farmer</Text>
              </View>
              <Animated.View style={[styles.emojiCircle, { transform: [{ rotate: spin }] }]}>
                <Text style={styles.emoji}>{liked ? '❤️' : '🌱'}</Text>
              </Animated.View>
            </View>
            <Text style={styles.greetingText}>
              {liked
                ? 'Your crops love your care — keep it growing!'
                : 'Your next batch of golden cinnamon oil awaits!'}
            </Text>
          </View>
        </BlurView>
      </TouchableOpacity> */}
    </Animated.View>
  );
}

function PrimaryActionCard() {
  const { t } = useTranslation();
  const router = useRouter();
  const scaleAnim = React.useRef(new Animated.Value(1)).current;
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 50,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 4,
      tension: 50,
    }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={styles.primaryActionWrapper}
        activeOpacity={1}
        onPress={() => router.push("/screens/Oil_yield/AddMaterialBatch")}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <View style={styles.primaryActionContent}>
          <View style={styles.primaryActionTop}>
            <View style={styles.primaryActionLeft}>
              <View style={styles.startBadge}>
                <MaterialCommunityIcons
                  name="star"
                  size={14}
                  color="#FF9F0A"
                />
                <Text style={styles.startBadgeText}>
                  {t("oil_yield.home.primary_action.start_badge")}
                </Text>
              </View>
              <Text style={styles.primaryActionTitle}>
                {t("oil_yield.home.primary_action.title")}
              </Text>
              <Text style={styles.primaryActionSubtitle}>
                {t("oil_yield.home.primary_action.subtitle")}
              </Text>
            </View>
            <Animated.View
              style={[
                styles.primaryActionIcon,
                { transform: [{ scale: pulseAnim }] },
              ]}
            >
              <MaterialCommunityIcons
                name="plus-circle"
                size={48}
                color="#4aab4e"
              />
            </Animated.View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

function GridCard({
  icon,
  iconColor,
  backgroundColor,
  title,
  subtitle,
  onPress,
  isLarge = false,
}: {
  icon: string;
  iconColor: string;
  backgroundColor: string;
  title: string;
  subtitle: string;
  onPress: () => void;
  isLarge?: boolean;
}) {
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
      speed: 50,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 4,
      tension: 50,
    }).start();
  };

  return (
    <Animated.View
      style={[
        { transform: [{ scale: scaleAnim }] },
        isLarge ? styles.gridCardLarge : styles.gridCard,
      ]}
    >
      <TouchableOpacity
        activeOpacity={1}
        style={styles.gridCardTouchable}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <BlurView intensity={70} tint="light" style={styles.gridCardBlur}>
          <View style={styles.gridCardInner}>
            <View style={[styles.gridIconCircle, { backgroundColor }]}>
              <MaterialCommunityIcons
                name={icon as any}
                size={isLarge ? 36 : 32}
                color={iconColor}
              />
            </View>
            <View style={styles.gridCardTextContainer}>
              <Text style={styles.gridCardTitle} numberOfLines={2}>
                {title}
              </Text>
              <Text style={styles.gridCardSubtitle} numberOfLines={2}>
                {subtitle}
              </Text>
            </View>
            <View style={styles.gridArrowContainer}>
              <View style={styles.gridArrowCircle}>
                <MaterialCommunityIcons
                  name="arrow-right"
                  size={16}
                  color={iconColor}
                />
              </View>
            </View>
          </View>
        </BlurView>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function OilScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <>
      <SafeAreaView style={styles.container}>
        <StatusBar
          barStyle="dark-content"
          backgroundColor="transparent"
          translucent
        />
        <View style={styles.background}>
          <ScrollView
            contentContainerStyle={styles.scrollContainer}
            showsVerticalScrollIndicator={false}
            bounces={true}
          >
            {/* Greeting Card */}
            <Greeting />

            {/* Primary Action Card - Add Material Batch */}
            <PrimaryActionCard />

            {/* Grid Layout Title */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {t("oil_yield.home.tools_title")}
              </Text>
            </View>

            {/* Grid Cards - 2 Column Layout */}
            <View style={styles.gridContainer}>
              <GridCard
                icon="flask-outline"
                iconColor="#4aab4e"
                backgroundColor="rgba(48, 209, 88, 0.15)"
                title={t("oil_yield.home.cards.yield_predictor_title")}
                subtitle={t("oil_yield.home.cards.yield_predictor_subtitle")}
                onPress={() => router.push("/oil-yield/predictor-second")}
              />

              <GridCard
                icon="steam"
                iconColor="#4aab4e"
                backgroundColor="rgba(48, 209, 88, 0.15)"
                title={t("oil_yield.home.cards.distillation_title")}
                subtitle={t("oil_yield.home.cards.distillation_subtitle")}
                onPress={() => router.push("/oil-yield/distillation-process")}
              />

              <GridCard
                icon="clipboard-check-outline"
                iconColor="#4aab4e"
                backgroundColor="rgba(48, 209, 88, 0.15)"
                title={t("oil_yield.home.cards.quality_title")}
                subtitle={t("oil_yield.home.cards.quality_subtitle")}
                onPress={() => router.push("/oil-yield/quality-guide")}
              />

              <GridCard
                icon="chart-line"
                iconColor="#4aab4e"
                backgroundColor="rgba(48, 209, 88, 0.15)"
                title={t("oil_yield.home.cards.price_predictor_title")}
                subtitle={t("oil_yield.home.cards.price_predictor_subtitle")}
                onPress={() => router.push("/oil-yield/price-predictor")}
              />
            </View>
          </ScrollView>
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFBFC',
  },
  background: {
    flex: 1,
    backgroundColor: "#F2F2F7",
  },
  scrollContainer: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  greetingContainer: {
    width: "100%",
    height: 140,
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  greetingBlur: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.85)",
    borderWidth: 0.5,
    borderColor: "rgba(0, 0, 0, 0.06)",
  },
  greetingContent: {
    flex: 1,
    padding: 20,
    justifyContent: "space-between",
  },
  greetingTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  greetingLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#8E8E93",
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  greetingTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#000000",
    letterSpacing: 0.2,
  },
  emojiCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(48, 209, 88, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  emoji: {
    fontSize: 28,
  },
  greetingText: {
    fontSize: 15,
    color: "#3C3C43",
    lineHeight: 20,
    letterSpacing: -0.24,
    fontWeight: "400",
    opacity: 0.8,
  },
  primaryActionWrapper: {
    width: "100%",
    borderRadius: 24,
    marginBottom: 28,
    backgroundColor: "rgba(48, 209, 88, 0.12)",
    borderWidth: 2,
    borderColor: "rgba(48, 209, 88, 0.25)",
    overflow: "hidden",
    shadowColor: "#ffffffff",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
  },
  primaryActionContent: {
  padding: 24,
  backgroundColor: "transparent",
},
  primaryActionTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  primaryActionLeft: {
    flex: 1,
    gap: 8,
    paddingRight: 16,
  },
  startBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: "rgba(255, 159, 10, 0.15)",
    alignSelf: "flex-start",
    marginBottom: 4,
  },
  startBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FF9F0A",
    letterSpacing: 0.6,
  },
  primaryActionTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#000000",
    letterSpacing: 0.2,
    marginBottom: 4,
  },
  primaryActionSubtitle: {
    fontSize: 14,
    color: "#3C3C43",
    lineHeight: 20,
    letterSpacing: -0.24,
    opacity: 0.8,
  },
  primaryActionIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(48, 209, 88, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(48, 209, 88, 0.3)",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#000000",
    letterSpacing: 0.35,
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 20,
  },
  gridCard: {
    width: CARD_WIDTH,
    height: 200,
  },
  gridCardLarge: {
    width: "100%",
    height: 200,
  },
  gridCardTouchable: {
    flex: 1,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  gridCardBlur: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderWidth: 0.5,
    borderColor: "rgba(0, 0, 0, 0.05)",
  },
  gridCardInner: {
    flex: 1,
    padding: 16,
    justifyContent: "space-between",
  },
  gridIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
  },
  gridCardTextContainer: {
    flex: 1,
    justifyContent: "center",
    marginVertical: 8,
  },
  gridCardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000000",
    marginBottom: 4,
    letterSpacing: -0.32,
  },
  gridCardSubtitle: {
    fontSize: 13,
    color: "#3C3C43",
    opacity: 0.6,
    letterSpacing: -0.08,
    fontWeight: "400",
  },
  gridArrowContainer: {
    alignSelf: "flex-end",
  },
  gridArrowCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
});