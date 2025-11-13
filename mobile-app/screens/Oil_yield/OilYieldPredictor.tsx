import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ImageBackground,
  StatusBar,
  ScrollView,
} from 'react-native';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '@/navigation/OilYieldNavigator';

type NavigationProp = StackNavigationProp<RootStackParamList>;

function Greeting() {
  const [liked, setLiked] = useState(false);

  return (
    <TouchableOpacity
      style={styles.greetingContainer}
      activeOpacity={0.9}
      onPress={() => setLiked(v => !v)}
    >
      <Text style={styles.greetingTitle}>Hey farmer 🌱</Text>
      <Text style={styles.greetingText}>
        {liked
          ? 'Your crops love your care — keep it growing!'
          : 'Your next batch of golden cinnamon oil awaits!'}
      </Text>
    </TouchableOpacity>
  );
}

export default function OilScreen() {
  const navigation = useNavigation<NavigationProp>();

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#FAFAF5" />
      <ImageBackground
        source={require('../../assets/images/img/1.jpg')}
        style={styles.background}
        imageStyle={{ opacity: 0.12 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.headerContainer}>
            <Text style={styles.header}>CinoGrow</Text>
            <View style={styles.headerBadge}>
              <MaterialCommunityIcons name="leaf" size={22} color="#2E7D32" />
            </View>
          </View>

          {/* Greeting */}
          <Greeting />

          {/* Cards */}
          <View style={styles.cardsContainer}>
            {/* Oil Yield Predictor */}
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.card}
              onPress={() => navigation.navigate('OilYieldPredictorSecond')}
            >
              <BlurView intensity={30} tint="light" style={styles.cardBlur}>
                <View
                  style={[styles.iconCircle, { backgroundColor: 'rgba(46, 125, 50, 0.1)' }]}
                >
                  <MaterialCommunityIcons name="flask-outline" size={34} color="#2E7D32" />
                </View>
                <View style={styles.cardContent}>
                  <Text style={styles.cardTitle}>Oil Yield Predictor</Text>
                  <Text style={styles.cardSubtitle}>
                    Estimate your cinnamon oil yield
                  </Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={26} color="#A0A0A0" />
              </BlurView>
            </TouchableOpacity>

            {/* Drying Process */}
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.card}
              onPress={() => navigation.navigate('DryingProcess')}
            >
              <BlurView intensity={30} tint="light" style={styles.cardBlur}>
                <View
                  style={[styles.iconCircle, { backgroundColor: 'rgba(255, 152, 0, 0.1)' }]}
                >
                  <Feather name="sun" size={34} color="#FF9500" />
                </View>
                <View style={styles.cardContent}>
                  <Text style={styles.cardTitle}>Drying Process</Text>
                  <Text style={styles.cardSubtitle}>
                    Track and optimize drying time
                  </Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={26} color="#A0A0A0" />
              </BlurView>
            </TouchableOpacity>

            {/* Distillation Process */}
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.card}
              onPress={() => navigation.navigate('DistillationProcess')}
            >
              <BlurView intensity={30} tint="light" style={styles.cardBlur}>
                <View
                  style={[styles.iconCircle, { backgroundColor: 'rgba(88, 86, 214, 0.1)' }]}
                >
                  <MaterialCommunityIcons name="steam" size={34} color="#5856D6" />
                </View>
                <View style={styles.cardContent}>
                  <Text style={styles.cardTitle}>Distillation Process</Text>
                  <Text style={styles.cardSubtitle}>
                    Monitor your distillation progress
                  </Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={26} color="#A0A0A0" />
              </BlurView>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Empowering Cinnamon Farmers with AI
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
    backgroundColor: '#FAFAF5', // soft ivory
  },
  scrollContainer: {
    paddingTop: 70,
    paddingHorizontal: 20,
    paddingBottom: 50,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  header: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1B5E20',
    letterSpacing: 0.4,
    fontFamily: 'serif',
  },
  headerBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  greetingContainer: {
    width: '100%',
    backgroundColor: 'rgba(240, 255, 240, 0.95)',
    borderRadius: 18,
    paddingVertical: 28,
    paddingHorizontal: 20,
    marginBottom: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 0.6,
    borderColor: 'rgba(76,175,80,0.15)',
  },
  greetingTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1B5E20',
    marginBottom: 6,
  },
  greetingText: {
    fontSize: 15,
    color: '#4E7048',
    lineHeight: 22,
    letterSpacing: -0.2,
    fontWeight: '500',
  },
  cardsContainer: {
    gap: 16,
  },
  card: {
    width: '100%',
    height: 95,
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
    backgroundColor: 'rgba(255,255,255,0.8)',
  },
  cardBlur: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    borderWidth: 0.6,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  iconCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: {
    flex: 1,
    marginLeft: 18,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1B5E20',
    marginBottom: 3,
    letterSpacing: -0.3,
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#4E7048',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 40,
    gap: 6,
  },
  footerText: {
    fontSize: 13,
    color: '#4E7048',
    fontWeight: '500',
  },
});
