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

interface CourseModule {
  id: string;
  title: string;
  duration: string;
  icon: string;
  iconColor: string;
  backgroundColor: string;
  objectives: string;
  features: string[];
  benefits: string[];
  certification?: string;
  outcome: string;
}

const TRAINING_MODULES: CourseModule[] = [
  {
    id: '1',
    title: 'Cinnamon Peeler Training',
    duration: '5 days',
    icon: 'knife',
    iconColor: '#30D158',
    backgroundColor: 'rgba(48, 209, 88, 0.15)',
    objectives: 'Equip participants with essential skills for maintaining cinnamon quality, offering hands-on experience in effective peeling techniques, and proper maintenance of cinnamon plantations.',
    features: [
      'Proper techniques for cinnamon peeling',
      'Practical field training with experienced instructors',
      'Comprehensive knowledge for producing high-value cinnamon sticks',
    ],
    benefits: [
      'Learn scientific, technical and accurate methods',
      'Gain expertise in producing high-quality cinnamon sticks',
      'Achieve professional qualifications (NVQ-III certificate)',
    ],
    certification: 'NVQ-III certificate from National Apprenticeship Training Institute (RPL)',
    outcome: 'Acquire skills and knowledge to excel in cinnamon cultivation and processing.',
  },
  {
    id: '2',
    title: 'Grading, Processing & Value Addition',
    duration: '5 days',
    icon: 'package-variant',
    iconColor: '#FF9F0A',
    backgroundColor: 'rgba(255, 159, 10, 0.15)',
    objectives: 'Enhance skills in practical production of cinnamon-based products and introduce new value-adding capabilities.',
    features: [
      'Develop and demonstrate new cinnamon-related products',
      'Guide on market potential of products',
      'Proper production methods for cut cinnamon and powder',
      'Cinnamon grading techniques and sulfur fumigation',
      'Quality certificates for cinnamon products',
      'Cinnamon oil extraction process',
      'Laboratory quality control activities',
    ],
    benefits: [
      'Practical and theoretical knowledge in new product production',
      'Market potential and marketing strategies',
      'Quality control methods for cinnamon products',
    ],
    outcome: 'Thorough understanding of proper production, grading, and quality control methods.',
  },
  {
    id: '3',
    title: 'Good Agricultural Practices (GAP)',
    duration: '1 day',
    icon: 'sprout',
    iconColor: '#34C759',
    backgroundColor: 'rgba(52, 199, 89, 0.15)',
    objectives: 'Provide awareness of proper field management methods in cinnamon cultivation to maximize yield and quality.',
    features: [
      'Proper methods for cinnamon cultivation establishment',
      'Best practices for cinnamon harvesting',
      'Crop time table, agronomic practices and crop management',
    ],
    benefits: [
      'Develop cultivation establishment skills',
      'Learn proper harvesting techniques',
      'Enhance yield and quality through effective management',
    ],
    outcome: 'Possess knowledge and skills to follow GAP methods in all aspects of cinnamon cultivation.',
  },
];

const ADDITIONAL_MODULES = [
  'Good Manufacturing Practices (GMP) – Cinnamon Processing',
  'Soil and Nutrient Management',
  'Pest and Disease Management',
  'Organic Cinnamon Cultivation',
  'Cinnamon Oil Distillation',
  'Machinery Usage in Cultivation and Processing',
  'Cinnamon Nursery Management',
];

export default function TrainingModules() {
  const [expandedModule, setExpandedModule] = useState<string | null>(null);

  const handleContact = () => {
    // Phone number for contact
    Linking.openURL('tel:+94412250151');
  };

  const CourseCard = ({ course }: { course: CourseModule }) => {
    const isExpanded = expandedModule === course.id;

    return (
      <View style={styles.courseCard}>
        <BlurView intensity={70} tint="light" style={styles.courseBlur}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setExpandedModule(isExpanded ? null : course.id)}
          >
            <View style={styles.courseHeader}>
              <View style={[styles.courseIconCircle, { backgroundColor: course.backgroundColor }]}>
                <MaterialCommunityIcons name={course.icon as any} size={28} color={course.iconColor} />
              </View>
              <View style={styles.courseHeaderText}>
                <Text style={styles.courseTitle}>{course.title}</Text>
                <View style={styles.courseMeta}>
                  <MaterialCommunityIcons name="clock-outline" size={14} color="#8E8E93" />
                  <Text style={styles.courseMetaText}>{course.duration}</Text>
                  <View style={styles.metaDot} />
                  <MaterialCommunityIcons name="account-group" size={14} color="#8E8E93" />
                  <Text style={styles.courseMetaText}>All ages</Text>
                </View>
              </View>
              <MaterialCommunityIcons 
                name={isExpanded ? "chevron-up" : "chevron-down"} 
                size={24} 
                color="#8E8E93" 
              />
            </View>

            {isExpanded && (
              <View style={styles.courseExpandedContent}>
                <View style={styles.courseDivider} />
                
                {/* Objectives */}
                <View style={styles.courseSection}>
                  <View style={styles.courseSectionHeader}>
                    <MaterialCommunityIcons name="target" size={18} color={course.iconColor} />
                    <Text style={styles.courseSectionTitle}>Objectives</Text>
                  </View>
                  <Text style={styles.courseSectionText}>{course.objectives}</Text>
                </View>

                {/* Features */}
                <View style={styles.courseSection}>
                  <View style={styles.courseSectionHeader}>
                    <MaterialCommunityIcons name="star" size={18} color={course.iconColor} />
                    <Text style={styles.courseSectionTitle}>Key Features</Text>
                  </View>
                  {course.features.map((feature, index) => (
                    <View key={index} style={styles.bulletItem}>
                      <View style={[styles.bulletDot, { backgroundColor: course.iconColor }]} />
                      <Text style={styles.bulletText}>{feature}</Text>
                    </View>
                  ))}
                </View>

                {/* Benefits */}
                <View style={styles.courseSection}>
                  <View style={styles.courseSectionHeader}>
                    <MaterialCommunityIcons name="gift" size={18} color={course.iconColor} />
                    <Text style={styles.courseSectionTitle}>Course Benefits</Text>
                  </View>
                  {course.benefits.map((benefit, index) => (
                    <View key={index} style={styles.bulletItem}>
                      <View style={[styles.bulletDot, { backgroundColor: course.iconColor }]} />
                      <Text style={styles.bulletText}>{benefit}</Text>
                    </View>
                  ))}
                </View>

                {/* Certification */}
                {course.certification && (
                  <View style={styles.certificationBadge}>
                    <MaterialCommunityIcons name="certificate" size={20} color="#5E5CE6" />
                    <Text style={styles.certificationText}>{course.certification}</Text>
                  </View>
                )}

                {/* Outcome */}
                <View style={styles.outcomeCard}>
                  <MaterialCommunityIcons name="check-circle" size={18} color="#30D158" />
                  <Text style={styles.outcomeText}>{course.outcome}</Text>
                </View>
              </View>
            )}
          </TouchableOpacity>
        </BlurView>
      </View>
    );
  };

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
              <MaterialCommunityIcons name="school" size={28} color="#5E5CE6" />
            </View>
          </View>
          <Text style={styles.header}>Training Modules</Text>
          <Text style={styles.headerSubtitle}>
            Free courses by National Cinnamon Research Center
          </Text>
        </View>

        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <BlurView intensity={50} tint="light" style={styles.infoBannerBlur}>
            <View style={styles.infoBannerContent}>
              <MaterialCommunityIcons name="information" size={20} color="#5E5CE6" />
              <Text style={styles.infoBannerText}>
                Free training for all stakeholders • 1-5 day courses
              </Text>
            </View>
          </BlurView>
        </View>

        {/* Center Info Card */}
        <View style={styles.centerCard}>
          <BlurView intensity={70} tint="light" style={styles.centerBlur}>
            <View style={styles.centerHeader}>
              <MaterialCommunityIcons name="map-marker" size={24} color="#FF3B30" />
              <View style={styles.centerTextContainer}>
                <Text style={styles.centerTitle}>National Cinnamon Research & Training Center</Text>
                <Text style={styles.centerLocation}>Palolpitiya, Thihagoda, Matara District</Text>
              </View>
            </View>
            <View style={styles.centerFeatures}>
              <View style={styles.centerFeature}>
                <MaterialCommunityIcons name="cash-multiple" size={16} color="#30D158" />
                <Text style={styles.centerFeatureText}>100% Free Training</Text>
              </View>
              <View style={styles.centerFeature}>
                <MaterialCommunityIcons name="account-group" size={16} color="#0A84FF" />
                <Text style={styles.centerFeatureText}>All Ages Welcome</Text>
              </View>
              <View style={styles.centerFeature}>
                <MaterialCommunityIcons name="gender-male-female" size={16} color="#FF9F0A" />
                <Text style={styles.centerFeatureText}>All Genders</Text>
              </View>
            </View>
          </BlurView>
        </View>

        {/* Main Courses */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Major Courses</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{TRAINING_MODULES.length}</Text>
          </View>
        </View>

        {TRAINING_MODULES.map((course) => (
          <CourseCard key={course.id} course={course} />
        ))}

        {/* Additional Modules */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Additional Modules</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{ADDITIONAL_MODULES.length}</Text>
          </View>
        </View>

        <View style={styles.additionalModulesCard}>
          <BlurView intensity={70} tint="light" style={styles.additionalModulesBlur}>
            <View style={styles.additionalModulesHeader}>
              <MaterialCommunityIcons name="view-module" size={20} color="#0A84FF" />
              <Text style={styles.additionalModulesTitle}>More Specialized Training</Text>
            </View>
            {ADDITIONAL_MODULES.map((module, index) => (
              <View key={index} style={styles.additionalModuleItem}>
                <MaterialCommunityIcons name="checkbox-marked-circle" size={18} color="#30D158" />
                <Text style={styles.additionalModuleText}>{module}</Text>
              </View>
            ))}
          </BlurView>
        </View>

        {/* Mobile Training Unit */}
        <View style={styles.mobileTrainingCard}>
          <BlurView intensity={70} tint="light" style={styles.mobileTrainingBlur}>
            <View style={styles.mobileTrainingHeader}>
              <View style={styles.mobileTrainingIcon}>
                <MaterialCommunityIcons name="truck" size={28} color="#FF9F0A" />
              </View>
              <Text style={styles.mobileTrainingTitle}>Mobile Training Unit</Text>
            </View>
            <Text style={styles.mobileTrainingText}>
              Our trainers reach rural areas to provide comprehensive on-site training. We bring the expertise to your location, making quality education accessible to all.
            </Text>
            <View style={styles.mobileTrainingFeatures}>
              <View style={styles.mobileTrainingFeature}>
                <MaterialCommunityIcons name="map-marker-radius" size={16} color="#FF9F0A" />
                <Text style={styles.mobileTrainingFeatureText}>On-site training</Text>
              </View>
              <View style={styles.mobileTrainingFeature}>
                <MaterialCommunityIcons name="account-star" size={16} color="#FF9F0A" />
                <Text style={styles.mobileTrainingFeatureText}>Expert trainers</Text>
              </View>
            </View>
          </BlurView>
        </View>

        {/* Contact Card */}
        <View style={styles.contactCard}>
          <BlurView intensity={70} tint="light" style={styles.contactBlur}>
            <MaterialCommunityIcons name="phone" size={32} color="#0A84FF" />
            <Text style={styles.contactTitle}>Need More Information?</Text>
            <Text style={styles.contactText}>
              Contact us for detailed information about training programs, schedules, and enrollment
            </Text>
            <TouchableOpacity style={styles.contactButton} onPress={handleContact} activeOpacity={0.8}>
              <BlurView intensity={100} tint="dark" style={styles.contactButtonBlur}>
                <MaterialCommunityIcons name="phone" size={20} color="#FFFFFF" />
                <Text style={styles.contactButtonText}>Contact Center</Text>
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
    backgroundColor: 'rgba(94, 92, 230, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: 'rgba(94, 92, 230, 0.2)',
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
    marginBottom: 20,
    shadowColor: '#5E5CE6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  infoBannerBlur: {
    flex: 1,
    backgroundColor: 'rgba(94, 92, 230, 0.08)',
    borderWidth: 0.5,
    borderColor: 'rgba(94, 92, 230, 0.15)',
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
    color: '#5E5CE6',
    letterSpacing: -0.08,
  },
  centerCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  centerBlur: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 0.5,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    padding: 18,
  },
  centerHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 16,
  },
  centerTextContainer: {
    flex: 1,
  },
  centerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 6,
    letterSpacing: -0.41,
  },
  centerLocation: {
    fontSize: 14,
    color: '#3C3C43',
    opacity: 0.7,
    letterSpacing: -0.08,
  },
  centerFeatures: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  centerFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
  },
  centerFeatureText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3C3C43',
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
  countBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
  },
  countBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#3C3C43',
    letterSpacing: -0.08,
  },
  courseCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  courseBlur: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 0.5,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  courseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
  },
  courseIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  courseHeaderText: {
    flex: 1,
  },
  courseTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 6,
    letterSpacing: -0.41,
  },
  courseMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  courseMetaText: {
    fontSize: 13,
    color: '#8E8E93',
    letterSpacing: -0.08,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#8E8E93',
    marginHorizontal: 4,
  },
  courseExpandedContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  courseDivider: {
    height: 0.5,
    backgroundColor: 'rgba(60, 60, 67, 0.18)',
    marginBottom: 16,
  },
  courseSection: {
    marginBottom: 16,
  },
  courseSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  courseSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: -0.24,
  },
  courseSectionText: {
    fontSize: 14,
    color: '#3C3C43',
    lineHeight: 20,
    letterSpacing: -0.24,
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 8,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 7,
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    color: '#3C3C43',
    lineHeight: 20,
    letterSpacing: -0.24,
  },
  certificationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(94, 92, 230, 0.08)',
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  certificationText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#5E5CE6',
    lineHeight: 18,
    letterSpacing: -0.08,
  },
  outcomeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: 'rgba(48, 209, 88, 0.08)',
    padding: 12,
    borderRadius: 10,
  },
  outcomeText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
    lineHeight: 20,
    letterSpacing: -0.24,
  },
  additionalModulesCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  additionalModulesBlur: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 0.5,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    padding: 18,
  },
  additionalModulesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(60, 60, 67, 0.18)',
  },
  additionalModulesTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: -0.41,
  },
  additionalModuleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  additionalModuleText: {
    flex: 1,
    fontSize: 14,
    color: '#3C3C43',
    letterSpacing: -0.24,
  },
  mobileTrainingCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: '#FF9F0A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  mobileTrainingBlur: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 159, 10, 0.2)',
    padding: 18,
  },
  mobileTrainingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  mobileTrainingIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 159, 10, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileTrainingTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: -0.24,
  },
  mobileTrainingText: {
    fontSize: 14,
    color: '#3C3C43',
    lineHeight: 20,
    letterSpacing: -0.24,
    marginBottom: 12,
  },
  mobileTrainingFeatures: {
    flexDirection: 'row',
    gap: 12,
  },
  mobileTrainingFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 159, 10, 0.1)',
  },
  mobileTrainingFeatureText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FF9F0A',
    letterSpacing: -0.08,
  },
  contactCard: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#0A84FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 4,
  },
  contactBlur: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 0.5,
    borderColor: 'rgba(10, 132, 255, 0.2)',
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
    shadowColor: '#0A84FF',
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
