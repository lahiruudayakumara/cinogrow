import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ImageBackground,
  StatusBar,
  ScrollView,
  Animated,
  Dimensions,
} from 'react-native';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '@/navigation/OilYieldNavigator';

type NavigationProp = StackNavigationProp<RootStackParamList>;

const { width } = Dimensions.get('window');
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
    setLiked(v => !v);
  };

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
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
        isLarge ? styles.gridCardLarge : styles.gridCard
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
              <MaterialCommunityIcons name={icon as any} size={isLarge ? 36 : 32} color={iconColor} />
            </View>
            <View style={styles.gridCardTextContainer}>
              <Text style={styles.gridCardTitle} numberOfLines={2}>{title}</Text>
              <Text style={styles.gridCardSubtitle} numberOfLines={2}>{subtitle}</Text>
            </View>
            <View style={styles.gridArrowContainer}>
              <View style={styles.gridArrowCircle}>
                <MaterialCommunityIcons name="arrow-right" size={16} color={iconColor} />
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

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <ImageBackground
        source={require('../../assets/images/img/1.jpg')}
        style={styles.background}
        imageStyle={{ opacity: 0.05 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          bounces={true}
        >
          {/* Header with Floating Action */}
          <View style={styles.headerContainer}>
            <View style={styles.headerLeft}>
              <View style={styles.logoContainer}>
                <MaterialCommunityIcons name="leaf" size={24} color="#30D158" />
              </View>
              <View>
                <Text style={styles.header}>CinoGrow</Text>
                <View style={styles.statusBadge}>
                  <View style={styles.statusDot} />
                  <Text style={styles.statusText}>Active</Text>
                </View>
              </View>
            </View>
            <TouchableOpacity style={styles.profileButton} activeOpacity={0.7}>
              <MaterialCommunityIcons name="account-circle" size={32} color="#8E8E93" />
            </TouchableOpacity>
          </View>

          {/* Greeting Card */}
          <Greeting />

          {/* Grid Layout Title */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Oil Production</Text>
            <Text style={styles.sectionCount}>6 tools</Text>
          </View>

          {/* Grid Cards - 2 Column Layout */}
          <View style={styles.gridContainer}>
            <GridCard
              icon="flask-outline"
              iconColor="#30D158"
              backgroundColor="rgba(48, 209, 88, 0.15)"
              title="Oil Yield Predictor"
              subtitle="Estimate yield"
              onPress={() => navigation.navigate('OilYieldPredictorSecond')}
            />
            
            <GridCard
              icon="white-balance-sunny"
              iconColor="#FF9F0A"
              backgroundColor="rgba(255, 159, 10, 0.15)"
              title="Drying Process"
              subtitle="Optimize time"
              onPress={() => navigation.navigate('DryingProcess')}
            />
            
            <GridCard
              icon="steam"
              iconColor="#5E5CE6"
              backgroundColor="rgba(94, 92, 230, 0.15)"
              title="Distillation"
              subtitle="Track progress"
              onPress={() => navigation.navigate('DistillationProcess')}
            />
            
            <GridCard
              icon="clipboard-check-outline"
              iconColor="#0A84FF"
              backgroundColor="rgba(10, 132, 255, 0.15)"
              title="Oil Quality"
              subtitle="Assess quality"
              onPress={() => navigation.navigate('OilQualityGuide')}
            />
            
            <GridCard
              icon="chart-line"
              iconColor="#FF3B30"
              backgroundColor="rgba(255, 59, 48, 0.15)"
              title="Oil Price Predictor"
              subtitle="Market forecast"
              onPress={() => navigation.navigate('OilPricePredictor')}
            />

            <GridCard
              icon="plus-circle-outline"
              iconColor="#30D158"
              backgroundColor="rgba(48, 209, 88, 0.15)"
              title="Add Material Batch"
              subtitle="Record a new batch"
              onPress={() => navigation.navigate('AddMaterialBatch')}
            />
          </View>

          {/* Research Center Section */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Research Center Services</Text>
            <View style={styles.newBadge}>
              <Text style={styles.newBadgeText}>NEW</Text>
            </View>
          </View>

          {/* Research Center Info Card */}
          <View style={styles.researchInfoCard}>
            <BlurView intensity={60} tint="light" style={styles.researchInfoBlur}>
              <View style={styles.researchInfoHeader}>
                <View style={styles.researchIconLarge}>
                  <MaterialCommunityIcons name="school" size={32} color="#5E5CE6" />
                </View>
                <View style={styles.researchInfoTextContainer}>
                  <Text style={styles.researchInfoTitle}>National Cinnamon Research</Text>
                  <Text style={styles.researchInfoSubtitle}>Palolpitiya, Thihagoda, Matara</Text>
                  <View style={styles.researchBadgesRow}>
                    <View style={styles.researchMicroBadge}>
                      <MaterialCommunityIcons name="certificate" size={12} color="#30D158" />
                      <Text style={styles.researchMicroBadgeText}>Free Training</Text>
                    </View>
                    <View style={styles.researchMicroBadge}>
                      <MaterialCommunityIcons name="account-group" size={12} color="#0A84FF" />
                      <Text style={styles.researchMicroBadgeText}>All Ages</Text>
                    </View>
                  </View>
                </View>
              </View>
            </BlurView>
          </View>

          {/* Research Center Feature Cards */}
          <View style={styles.gridContainer}>
            <GridCard
              icon="school-outline"
              iconColor="#5E5CE6"
              backgroundColor="rgba(94, 92, 230, 0.15)"
              title="Training Modules"
              subtitle="Free courses • 1-5 days"
              onPress={() => navigation.navigate('TrainingModules')}
            />
            
            <GridCard
              icon="flask-outline"
              iconColor="#FF9F0A"
              backgroundColor="rgba(255, 159, 10, 0.15)"
              title="Lab Certification"
              subtitle="Export standards"
              onPress={() => navigation.navigate('LabCertification')}
            />
          </View>

          {/* Quick Stats Widget */}
          <View style={styles.statsWidget}>
            <BlurView intensity={50} tint="light" style={styles.statsBlur}>
              <View style={styles.statsContent}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>95%</Text>
                  <Text style={styles.statLabel}>Accuracy</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>2.4K</Text>
                  <Text style={styles.statLabel}>Predictions</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>24/7</Text>
                  <Text style={styles.statLabel}>Support</Text>
                </View>
              </View>
            </BlurView>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <View style={styles.footerBadge}>
              <MaterialCommunityIcons name="shield-check" size={14} color="#30D158" />
              <Text style={styles.footerBadgeText}>AI Powered</Text>
            </View>
            <Text style={styles.footerText}>
              Empowering Cinnamon Farmers
            </Text>
          </View>
        </ScrollView>
      </ImageBackground>
    </>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  scrollContainer: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingTop: 4,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(48, 209, 88, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: 'rgba(48, 209, 88, 0.2)',
  },
  header: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: 0.2,
    marginBottom: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#30D158',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#30D158',
    letterSpacing: -0.08,
  },
  profileButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  greetingContainer: {
    width: '100%',
    height: 140,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  greetingBlur: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderWidth: 0.5,
    borderColor: 'rgba(0, 0, 0, 0.06)',
  },
  greetingContent: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between',
  },
  greetingTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  greetingLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8E8E93',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  greetingTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: 0.2,
  },
  emojiCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(48, 209, 88, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 28,
  },
  greetingText: {
    fontSize: 15,
    color: '#3C3C43',
    lineHeight: 20,
    letterSpacing: -0.24,
    fontWeight: '400',
    opacity: 0.8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: 0.35,
  },
  sectionCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
    letterSpacing: -0.08,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  gridCard: {
    width: CARD_WIDTH,
    height: 160,
  },
  gridCardLarge: {
    width: '100%',
    height: 160,
  },
  gridCardTouchable: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  gridCardBlur: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 0.5,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  gridCardInner: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
  },
  gridIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  gridCardTextContainer: {
    flex: 1,
    justifyContent: 'center',
    marginVertical: 8,
  },
  gridCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 4,
    letterSpacing: -0.32,
  },
  gridCardSubtitle: {
    fontSize: 13,
    color: '#3C3C43',
    opacity: 0.6,
    letterSpacing: -0.08,
    fontWeight: '400',
  },
  gridArrowContainer: {
    alignSelf: 'flex-end',
  },
  gridArrowCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsWidget: {
    width: '100%',
    height: 80,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  statsBlur: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderWidth: 0.5,
    borderColor: 'rgba(0, 0, 0, 0.04)',
  },
  statsContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 12,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: 0.35,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8E8E93',
    letterSpacing: -0.06,
  },
  statDivider: {
    width: 0.5,
    height: 40,
    backgroundColor: 'rgba(60, 60, 67, 0.18)',
  },
  footer: {
    alignItems: 'center',
    marginTop: 16,
    gap: 12,
  },
  footerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(48, 209, 88, 0.12)',
  },
  footerBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#30D158',
    letterSpacing: 0.2,
  },
  footerText: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '500',
    letterSpacing: -0.08,
  },
  newBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(94, 92, 230, 0.15)',
  },
  newBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#5E5CE6',
    letterSpacing: 0.2,
  },
  researchInfoCard: {
    width: '100%',
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: '#5E5CE6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 4,
  },
  researchInfoBlur: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 0.5,
    borderColor: 'rgba(94, 92, 230, 0.2)',
  },
  researchInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 20,
  },
  researchIconLarge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(94, 92, 230, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  researchInfoTextContainer: {
    flex: 1,
    gap: 6,
  },
  researchInfoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: -0.24,
  },
  researchInfoSubtitle: {
    fontSize: 13,
    color: '#3C3C43',
    opacity: 0.6,
    letterSpacing: -0.08,
  },
  researchBadgesRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  researchMicroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
  },
  researchMicroBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#3C3C43',
    letterSpacing: -0.06,
  },
});