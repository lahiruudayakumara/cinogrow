import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Linking,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface Standard {
  id: string;
  type: 'leaf' | 'bark';
  title: string;
  code: string;
  icon: string;
  iconColor: string;
  backgroundColor: string;
  characteristics: { label: string; value: string }[];
  chemicalComposition: { component: string; percentage: string }[];
}

const STANDARDS: Standard[] = [
  {
    id: '1',
    type: 'leaf',
    title: 'Cinnamon Leaf Oil',
    code: 'SLS 184:2012 & ISO 3524:2003',
    icon: 'leaf',
    iconColor: '#30D158',
    backgroundColor: 'rgba(48, 209, 88, 0.15)',
    characteristics: [
      { label: 'Appearance', value: 'Clear, mobile liquid, free from sediment' },
      { label: 'Color', value: 'Light to dark amber' },
      { label: 'Odor', value: 'Characteristic spicy, reminiscent of eugenol' },
      { label: 'Solubility', value: '1:2 in 70% ethanol at 28°C' },
      { label: 'Relative density', value: '1.0340 – 1.0500 at 28°C' },
      { label: 'Refractive index', value: '1.5250 – 1.5400 at 28°C' },
      { label: 'Optical rotation', value: '–2.5° to +2.0° at 28°C' },
    ],
    chemicalComposition: [
      { component: 'Eugenol', percentage: '75 – 85%' },
      { component: 'Cinnamaldehyde', percentage: '0.8 – 4.0%' },
      { component: 'Eugenol acetate', percentage: '1.3 – 3.0%' },
      { component: 'Cinnamyl acetate', percentage: '1.1 – 1.8%' },
      { component: 'Benzyl benzoate', percentage: '2.0 – 4.0%' },
      { component: 'Linalool', percentage: '1.5 – 3.5%' },
    ],
  },
  {
    id: '2',
    type: 'bark',
    title: 'Cinnamon Bark Oil',
    code: 'SLS 185:2012',
    icon: 'nature-people',
    iconColor: '#FF9F0A',
    backgroundColor: 'rgba(255, 159, 10, 0.15)',
    characteristics: [
      { label: 'Appearance', value: 'Clear, mobile liquid, free from sediment' },
      { label: 'Color', value: 'Pale yellow' },
      { label: 'Odor', value: 'Characteristic spicy, reminiscent of cinnamaldehyde' },
      { label: 'Solubility', value: '1:2 in 70% ethanol at 28°C' },
      { label: 'Relative density', value: '1.0100 – 1.0300 at 28°C' },
      { label: 'Refractive index', value: '1.5550 – 1.5800 at 28°C' },
      { label: 'Optical rotation', value: '–2.5° to +2.0° at 28°C' },
    ],
    chemicalComposition: [
      { component: 'Cinnamaldehyde', percentage: '30 – 75%' },
      { component: 'Eugenol', percentage: '0.5 – 40%' },
      { component: 'Cinnamyl acetate', percentage: '2 – 6%' },
      { component: 'Benzyl benzoate', percentage: '0 – 2%' },
      { component: 'Linalool', percentage: '1 – 6%' },
    ],
  },
];

const BARK_GRADES = [
  { grade: 'Superior', cinnamaldehyde: '≥ 60%', eugenol: '≤ 15%', color: '#30D158' },
  { grade: 'Special', cinnamaldehyde: '55 – 60%', eugenol: '≤ 25%', color: '#0A84FF' },
  { grade: 'Average', cinnamaldehyde: '45 – 54%', eugenol: '≤ 40%', color: '#FF9F0A' },
  { grade: 'Ordinary', cinnamaldehyde: '30 – 44%', eugenol: '—', color: '#8E8E93' },
];

export default function LabCertification() {
  const [selectedStandard, setSelectedStandard] = useState<string>('1');

  const handleContact = () => {
    Linking.openURL('tel:+94412250151');
  };

  const standard = STANDARDS.find(s => s.id === selectedStandard)!;

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        {/* Header */}
        <View style={styles.headerContainer}>
          <View style={styles.headerIconContainer}>
            <View style={styles.headerIconCircle}>
              <MaterialCommunityIcons name="flask-outline" size={28} color="#FF9F0A" />
            </View>
          </View>
          <Text style={styles.header}>Lab Certification</Text>
          <Text style={styles.headerSubtitle}>
            Quality standards for cinnamon oil export
          </Text>
        </View>

        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <BlurView intensity={50} tint="light" style={styles.infoBannerBlur}>
            <View style={styles.infoBannerContent}>
              <MaterialCommunityIcons name="certificate" size={20} color="#FF9F0A" />
              <Text style={styles.infoBannerText}>
                Sri Lankan & international standards compliance
              </Text>
            </View>
          </BlurView>
        </View>

        {/* Oil Type Selector */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Select Oil Type</Text>
        </View>

        <View style={styles.selectorContainer}>
          {STANDARDS.map((std) => (
            <TouchableOpacity
              key={std.id}
              style={[
                styles.selectorOption,
                selectedStandard === std.id && styles.selectorOptionSelected,
              ]}
              onPress={() => setSelectedStandard(std.id)}
              activeOpacity={0.7}
            >
              <BlurView
                intensity={selectedStandard === std.id ? 80 : 60}
                tint="light"
                style={styles.selectorBlur}
              >
                <View style={[styles.selectorIconCircle, { backgroundColor: std.backgroundColor }]}>
                  <MaterialCommunityIcons name={std.icon as any} size={24} color={std.iconColor} />
                </View>
                <View style={styles.selectorTextContainer}>
                  <Text style={[
                    styles.selectorTitle,
                    selectedStandard === std.id && styles.selectorTitleSelected
                  ]}>
                    {std.title}
                  </Text>
                  <Text style={styles.selectorCode}>{std.code}</Text>
                </View>
                {selectedStandard === std.id && (
                  <MaterialCommunityIcons name="check-circle" size={24} color={std.iconColor} />
                )}
              </BlurView>
            </TouchableOpacity>
          ))}
        </View>

        {/* Oil Content & Yield */}
        <View style={styles.yieldCard}>
          <BlurView intensity={70} tint="light" style={styles.yieldBlur}>
            <View style={styles.yieldHeader}>
              <MaterialCommunityIcons name="water-percent" size={24} color={standard.iconColor} />
              <Text style={styles.yieldTitle}>Oil Content & Yield</Text>
            </View>
            {standard.type === 'leaf' ? (
              <View style={styles.yieldContent}>
                <View style={styles.yieldItem}>
                  <Text style={styles.yieldLabel}>Oil content</Text>
                  <Text style={styles.yieldValue}>Up to 4%</Text>
                </View>
                <View style={styles.yieldDivider} />
                <View style={styles.yieldItem}>
                  <Text style={styles.yieldLabel}>Industrial yield</Text>
                  <Text style={styles.yieldValue}>1% of leaf mass</Text>
                </View>
                <View style={styles.yieldDivider} />
                <View style={styles.yieldItem}>
                  <Text style={styles.yieldLabel}>Annual yield</Text>
                  <Text style={styles.yieldValue}>100-200 kg/ha/year</Text>
                </View>
              </View>
            ) : (
              <View style={styles.yieldContent}>
                <View style={styles.yieldItem}>
                  <Text style={styles.yieldLabel}>Oil content</Text>
                  <Text style={styles.yieldValue}>3.0 – 4.0%</Text>
                </View>
                <View style={styles.yieldDivider} />
                <View style={styles.yieldItem}>
                  <Text style={styles.yieldLabel}>Raw materials</Text>
                  <Text style={styles.yieldValue}>Quills, Featherings, Chips</Text>
                </View>
              </View>
            )}
          </BlurView>
        </View>

        {/* Bark Oil Grades (only for bark) */}
        {standard.type === 'bark' && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Bark Oil Grades</Text>
            </View>

            <View style={styles.gradesCard}>
              <BlurView intensity={70} tint="light" style={styles.gradesBlur}>
                <View style={styles.gradesHeader}>
                  <MaterialCommunityIcons name="star-circle" size={20} color="#FF9F0A" />
                  <Text style={styles.gradesTitle}>Classification by Cinnamaldehyde Content</Text>
                </View>
                {BARK_GRADES.map((grade, index) => (
                  <View key={index} style={styles.gradeRow}>
                    <View style={[styles.gradeColorIndicator, { backgroundColor: grade.color }]} />
                    <View style={styles.gradeInfo}>
                      <Text style={styles.gradeName}>{grade.grade} Grade</Text>
                      <View style={styles.gradeDetails}>
                        <View style={styles.gradeDetail}>
                          <Text style={styles.gradeDetailLabel}>Cinnamaldehyde:</Text>
                          <Text style={styles.gradeDetailValue}>{grade.cinnamaldehyde}</Text>
                        </View>
                        <View style={styles.gradeDetail}>
                          <Text style={styles.gradeDetailLabel}>Eugenol:</Text>
                          <Text style={styles.gradeDetailValue}>{grade.eugenol}</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                ))}
              </BlurView>
            </View>
          </>
        )}

        {/* Physical Characteristics */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Physical Characteristics</Text>
        </View>

        <View style={styles.characteristicsCard}>
          <BlurView intensity={70} tint="light" style={styles.characteristicsBlur}>
            {standard.characteristics.map((char, index) => (
              <View key={index} style={styles.characteristicRow}>
                <View style={styles.characteristicLabel}>
                  <MaterialCommunityIcons name="circle-small" size={20} color={standard.iconColor} />
                  <Text style={styles.characteristicLabelText}>{char.label}</Text>
                </View>
                <Text style={styles.characteristicValue}>{char.value}</Text>
              </View>
            ))}
          </BlurView>
        </View>

        {/* Chemical Composition */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Chemical Composition</Text>
        </View>

        <View style={styles.compositionCard}>
          <BlurView intensity={70} tint="light" style={styles.compositionBlur}>
            <View style={styles.compositionHeader}>
              <MaterialCommunityIcons name="flask" size={20} color={standard.iconColor} />
              <Text style={styles.compositionTitle}>Main Components (% by weight)</Text>
            </View>
            {standard.chemicalComposition.map((comp, index) => {
              const getBarWidth = (percentage: string): string => {
                if (percentage.includes('–')) {
                  const max = parseInt(percentage.split('–')[1]);
                  return `${Math.min(max, 100)}%`;
                }
                return percentage;
              };
              
              return (
                <View key={index} style={styles.compositionRow}>
                  <Text style={styles.compositionComponent}>{comp.component}</Text>
                  <View style={styles.compositionBar}>
                    <View
                      style={[
                        styles.compositionBarFill,
                        {
                          width: getBarWidth(comp.percentage) as any,
                          backgroundColor: standard.iconColor,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.compositionPercentage}>{comp.percentage}</Text>
                </View>
              );
            })}
          </BlurView>
        </View>

        {/* Extraction Methods */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Extraction Methods</Text>
        </View>

        <View style={styles.methodsCard}>
          <BlurView intensity={70} tint="light" style={styles.methodsBlur}>
            <View style={styles.methodsHeader}>
              <MaterialCommunityIcons name="cog" size={20} color="#0A84FF" />
              <Text style={styles.methodsTitle}>Available Techniques</Text>
            </View>
            <View style={styles.methodsList}>
              <View style={styles.methodItem}>
                <MaterialCommunityIcons name="check-circle" size={18} color="#30D158" />
                <View style={styles.methodTextContainer}>
                  <Text style={styles.methodName}>Steam Distillation</Text>
                  <Text style={styles.methodBadge}>Primary Industrial Method</Text>
                </View>
              </View>
              <View style={styles.methodItem}>
                <MaterialCommunityIcons name="water" size={18} color="#0A84FF" />
                <Text style={styles.methodName}>Hydro Distillation</Text>
              </View>
              <View style={styles.methodItem}>
                <MaterialCommunityIcons name="waves" size={18} color="#0A84FF" />
                <Text style={styles.methodName}>Steam-Hydro Distillation</Text>
              </View>
              <View style={styles.methodDivider} />
              <Text style={styles.methodsSectionTitle}>Modern Technologies</Text>
              <View style={styles.methodItem}>
                <MaterialCommunityIcons name="flask-outline" size={18} color="#8E8E93" />
                <Text style={styles.methodNameSecondary}>Supercritical CO₂ Extraction</Text>
              </View>
              <View style={styles.methodItem}>
                <MaterialCommunityIcons name="microwave" size={18} color="#8E8E93" />
                <Text style={styles.methodNameSecondary}>Microwave Extraction</Text>
              </View>
              <View style={styles.methodItem}>
                <MaterialCommunityIcons name="waveform" size={18} color="#8E8E93" />
                <Text style={styles.methodNameSecondary}>Ultrasonic Wave Extraction</Text>
              </View>
              <View style={styles.methodNote}>
                <MaterialCommunityIcons name="information" size={16} color="#8E8E93" />
                <Text style={styles.methodNoteText}>
                  Modern methods not yet used on industrial scale
                </Text>
              </View>
            </View>
          </BlurView>
        </View>

        {/* Applications */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Applications & Uses</Text>
        </View>

        <View style={styles.applicationsCard}>
          <BlurView intensity={70} tint="light" style={styles.applicationsBlur}>
            <View style={styles.applicationsHeader}>
              <MaterialCommunityIcons name="basket" size={20} color="#5E5CE6" />
              <Text style={styles.applicationsTitle}>Industry Applications</Text>
            </View>
            {standard.type === 'leaf' ? (
              <View style={styles.applicationsList}>
                <View style={styles.applicationItem}>
                  <MaterialCommunityIcons name="spray-bottle" size={18} color="#5E5CE6" />
                  <Text style={styles.applicationText}>Perfumes and fragrances</Text>
                </View>
                <View style={styles.applicationItem}>
                  <MaterialCommunityIcons name="bug" size={18} color="#5E5CE6" />
                  <Text style={styles.applicationText}>Insect repellents</Text>
                </View>
                <View style={styles.applicationItem}>
                  <MaterialCommunityIcons name="spray" size={18} color="#5E5CE6" />
                  <Text style={styles.applicationText}>Disinfectants</Text>
                </View>
                <View style={styles.applicationItem}>
                  <MaterialCommunityIcons name="pill" size={18} color="#5E5CE6" />
                  <Text style={styles.applicationText}>Pharmaceutical products</Text>
                </View>
              </View>
            ) : (
              <View style={styles.applicationsList}>
                <View style={styles.applicationItem}>
                  <MaterialCommunityIcons name="food" size={18} color="#5E5CE6" />
                  <Text style={styles.applicationText}>Food flavoring agent</Text>
                </View>
                <View style={styles.applicationItem}>
                  <MaterialCommunityIcons name="cup" size={18} color="#5E5CE6" />
                  <Text style={styles.applicationText}>Beverage production</Text>
                </View>
                <View style={styles.applicationItem}>
                  <MaterialCommunityIcons name="spray-bottle" size={18} color="#5E5CE6" />
                  <Text style={styles.applicationText}>Perfume manufacturing</Text>
                </View>
                <View style={styles.applicationItem}>
                  <MaterialCommunityIcons name="pill" size={18} color="#5E5CE6" />
                  <Text style={styles.applicationText}>Medicinal products</Text>
                </View>
              </View>
            )}
          </BlurView>
        </View>

        {/* Contact Card */}
        <View style={styles.contactCard}>
          <BlurView intensity={70} tint="light" style={styles.contactBlur}>
            <MaterialCommunityIcons name="certificate" size={32} color="#30D158" />
            <Text style={styles.contactTitle}>Get Your Oil Certified</Text>
            <Text style={styles.contactText}>
              Contact National Cinnamon Research Center for laboratory testing and quality certification for export
            </Text>
            <TouchableOpacity style={styles.contactButton} onPress={handleContact} activeOpacity={0.8}>
              <BlurView intensity={100} tint="dark" style={styles.contactButtonBlur}>
                <MaterialCommunityIcons name="phone" size={20} color="#FFFFFF" />
                <Text style={styles.contactButtonText}>Contact Lab</Text>
              </BlurView>
            </TouchableOpacity>
          </BlurView>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  scrollContainer: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerContainer: {
    marginBottom: 24,
  },
  headerIconContainer: {
    marginBottom: 16,
  },
  headerIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 159, 10, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 159, 10, 0.2)',
  },
  header: {
    fontSize: 34,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 8,
    letterSpacing: 0.4,
  },
  headerSubtitle: {
    fontSize: 15,
    color: '#3C3C43',
    opacity: 0.6,
    lineHeight: 20,
    letterSpacing: -0.24,
  },
  infoBanner: {
    height: 48,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 24,
    shadowColor: '#FF9F0A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  infoBannerBlur: {
    flex: 1,
    backgroundColor: 'rgba(255, 159, 10, 0.08)',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 159, 10, 0.15)',
  },
  infoBannerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  infoBannerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF9F0A',
    letterSpacing: -0.08,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: 0.35,
  },
  selectorContainer: {
    gap: 12,
    marginBottom: 20,
  },
  selectorOption: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  selectorOptionSelected: {
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 4,
  },
  selectorBlur: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 0.5,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
  },
  selectorIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectorTextContainer: {
    flex: 1,
  },
  selectorTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
    letterSpacing: -0.41,
  },
  selectorTitleSelected: {
    fontWeight: '700',
  },
  selectorCode: {
    fontSize: 13,
    color: '#8E8E93',
    letterSpacing: -0.08,
  },
  yieldCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  yieldBlur: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 0.5,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    padding: 18,
  },
  yieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(60, 60, 67, 0.18)',
  },
  yieldTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: -0.41,
  },
  yieldContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  yieldItem: {
    flex: 1,
    alignItems: 'center',
  },
  yieldLabel: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 6,
    letterSpacing: -0.08,
  },
  yieldValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: -0.24,
    textAlign: 'center',
  },
  yieldDivider: {
    width: 0.5,
    height: 40,
    backgroundColor: 'rgba(60, 60, 67, 0.18)',
    marginHorizontal: 8,
  },
  gradesCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  gradesBlur: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 0.5,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    padding: 18,
  },
  gradesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(60, 60, 67, 0.18)',
  },
  gradesTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: -0.24,
  },
  gradeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
    padding: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
  },
  gradeColorIndicator: {
    width: 4,
    height: 48,
    borderRadius: 2,
  },
  gradeInfo: {
    flex: 1,
  },
  gradeName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 6,
    letterSpacing: -0.24,
  },
  gradeDetails: {
    gap: 4,
  },
  gradeDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  gradeDetailLabel: {
    fontSize: 13,
    color: '#8E8E93',
    letterSpacing: -0.08,
  },
  gradeDetailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
    letterSpacing: -0.08,
  },
  characteristicsCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  characteristicsBlur: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 0.5,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    padding: 18,
  },
  characteristicRow: {
    marginBottom: 12,
  },
  characteristicLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  characteristicLabelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    letterSpacing: -0.08,
  },
  characteristicValue: {
    fontSize: 14,
    color: '#3C3C43',
    paddingLeft: 32,
    letterSpacing: -0.24,
  },
  compositionCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  compositionBlur: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 0.5,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    padding: 18,
  },
  compositionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(60, 60, 67, 0.18)',
  },
  compositionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: -0.24,
  },
  compositionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  compositionComponent: {
    width: 130,
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    letterSpacing: -0.08,
  },
  compositionBar: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
    overflow: 'hidden',
  },
  compositionBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  compositionPercentage: {
    width: 70,
    fontSize: 13,
    fontWeight: '700',
    color: '#000000',
    textAlign: 'right',
    letterSpacing: -0.08,
  },
  methodsCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  methodsBlur: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 0.5,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    padding: 18,
  },
  methodsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(60, 60, 67, 0.18)',
  },
  methodsTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: -0.41,
  },
  methodsList: {
    gap: 10,
  },
  methodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  methodTextContainer: {
    flex: 1,
  },
  methodName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    letterSpacing: -0.24,
  },
  methodNameSecondary: {
    fontSize: 14,
    color: '#8E8E93',
    letterSpacing: -0.24,
  },
  methodBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#30D158',
    marginTop: 2,
    letterSpacing: -0.06,
  },
  methodDivider: {
    height: 0.5,
    backgroundColor: 'rgba(60, 60, 67, 0.18)',
    marginVertical: 8,
  },
  methodsSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#8E8E93',
    marginTop: 4,
    letterSpacing: -0.08,
  },
  methodNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
    padding: 10,
    borderRadius: 8,
    marginTop: 4,
  },
  methodNoteText: {
    flex: 1,
    fontSize: 12,
    color: '#8E8E93',
    letterSpacing: -0.08,
  },
  applicationsCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  applicationsBlur: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 0.5,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    padding: 18,
  },
  applicationsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(60, 60, 67, 0.18)',
  },
  applicationsTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: -0.41,
  },
  applicationsList: {
    gap: 12,
  },
  applicationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  applicationText: {
    fontSize: 14,
    color: '#3C3C43',
    letterSpacing: -0.24,
  },
  contactCard: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#30D158',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 4,
  },
  contactBlur: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 0.5,
    borderColor: 'rgba(48, 209, 88, 0.2)',
    padding: 24,
    alignItems: 'center',
  },
  contactTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
    marginTop: 12,
    marginBottom: 8,
    letterSpacing: 0.35,
  },
  contactText: {
    fontSize: 14,
    color: '#3C3C43',
    textAlign: 'center',
    lineHeight: 20,
    letterSpacing: -0.24,
    marginBottom: 20,
  },
  contactButton: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#30D158',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  contactButtonBlur: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 18,
  },
  contactButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.41,
  },
});
