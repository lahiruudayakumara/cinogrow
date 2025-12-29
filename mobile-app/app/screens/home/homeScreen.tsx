import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Pressable, Text, Image, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';

type Action = {
	key: string;
	title: string;
	description: string;
	icon: keyof typeof Ionicons.glyphMap;
	to: Href;
	tint: string;
	gradient: string[];
};

const actions: Action[] = [
	{
		key: 'weather',
		title: 'Plan with Weather',
		description: 'View local forecast, manage farm and planting records.',
		icon: 'partly-sunny-outline',
		to: '/(tabs)',
		tint: '#2E7D32',
		gradient: ['#4CAF50', '#2E7D32'],
	},
	{
		key: 'fertilizer',
		title: 'Fertilizer Guidance',
		description: 'Analyze needs and track applications for your plots.',
		icon: 'leaf-outline',
		to: '/(tabs)/fertilizer',
		tint: '#388E3C',
		gradient: ['#66BB6A', '#388E3C'],
	},
	{
		key: 'pests',
		title: 'Pest & Disease',
		description: 'Upload leaf photos and get recommendations.',
		icon: 'bug-outline',
		to: '/(tabs)/pests',
		tint: '#00796B',
		gradient: ['#26A69A', '#00796B'],
	},
	{
		key: 'oil',
		title: 'Oil Yield',
		description: 'Estimate potential yield and compare records.',
		icon: 'flask-outline',
		to: '/(tabs)/oil',
		tint: '#5D4037',
		gradient: ['#8D6E63', '#5D4037'],
	},
	{
		key: 'profile',
		title: 'Profile & Settings',
		description: 'Language, subscriptions, and account preferences.',
		icon: 'person-outline',
		to: '/(tabs)/profile',
		tint: '#455A64',
		gradient: ['#78909C', '#455A64'],
	},
];

function AnimatedCard({ action, index, completed }: { action: Action; index: number; completed: boolean }) {
	const [scale] = useState(new Animated.Value(0));
	const [checkScale] = useState(new Animated.Value(0));
	const [pressed, setPressed] = useState(false);

	useEffect(() => {
		Animated.spring(scale, {
			toValue: 1,
			delay: index * 100,
			tension: 50,
			friction: 7,
			useNativeDriver: true,
		}).start();
	}, []);

	useEffect(() => {
		if (completed) {
			Animated.sequence([
				Animated.spring(checkScale, {
					toValue: 1.2,
					tension: 100,
					friction: 3,
					useNativeDriver: true,
				}),
				Animated.spring(checkScale, {
					toValue: 1,
					tension: 100,
					friction: 5,
					useNativeDriver: true,
				}),
			]).start();
		}
	}, [completed]);

	const handlePress = () => {
		Animated.sequence([
			Animated.timing(scale, {
				toValue: 0.95,
				duration: 100,
				useNativeDriver: true,
			}),
			Animated.spring(scale, {
				toValue: 1,
				tension: 100,
				friction: 5,
				useNativeDriver: true,
			}),
		]).start();
		router.push(action.to);
	};

	return (
		<Animated.View style={{ transform: [{ scale }] }}>
			<Pressable
				style={[styles.card, completed && styles.cardCompleted]}
				onPress={handlePress}
				onPressIn={() => setPressed(true)}
				onPressOut={() => setPressed(false)}
			>
				<LinearGradient
					colors={completed ? ['#4CAF50', '#2E7D32'] : [action.gradient[0] + '20', action.gradient[1] + '10']}
					start={{ x: 0, y: 0 }}
					end={{ x: 1, y: 1 }}
					style={styles.cardGradient}
				>
					<View style={styles.cardContent}>
						<View style={[styles.badge, { backgroundColor: completed ? '#FFFFFF30' : action.tint + '25' }]}>
							<Ionicons name={action.icon} size={24} color={completed ? '#FFF' : action.tint} />
						</View>
						<View style={styles.cardBody}>
							<View style={styles.cardTitleRow}>
								<View style={[styles.stepBadge, completed && styles.stepBadgeCompleted]}>
									<Text style={[styles.stepIndex, completed && styles.stepIndexCompleted]}>{index + 1}</Text>
								</View>
								<Text style={[styles.cardTitle, completed && styles.cardTitleCompleted]}>{action.title}</Text>
							</View>
							<Text style={[styles.cardDesc, completed && styles.cardDescCompleted]}>{action.description}</Text>
						</View>
						{completed ? (
							<Animated.View style={{ transform: [{ scale: checkScale }] }}>
								<View style={styles.checkMark}>
									<Ionicons name="checkmark-circle" size={28} color="#FFF" />
								</View>
							</Animated.View>
						) : (
							<Ionicons name="chevron-forward-outline" size={22} color={action.tint} />
						)}
					</View>
				</LinearGradient>
			</Pressable>
		</Animated.View>
	);
}

function QuickAction({
	icon,
	label,
	gradient,
	to,
	index,
	itemWidth,
}: {
	icon: keyof typeof Ionicons.glyphMap;
	label: string;
	gradient: string[];
	to: Href;
	index: number;
	itemWidth?: number;
}) {
	const [scale] = useState(new Animated.Value(0));

	useEffect(() => {
		Animated.spring(scale, {
			toValue: 1,
			delay: 500 + index * 80,
			tension: 50,
			friction: 7,
			useNativeDriver: true,
		}).start();
	}, []);

	const handlePress = () => {
		Animated.sequence([
			Animated.timing(scale, {
				toValue: 0.9,
				duration: 100,
				useNativeDriver: true,
			}),
			Animated.spring(scale, {
				toValue: 1,
				tension: 100,
				friction: 5,
				useNativeDriver: true,
			}),
		]).start();
		router.push(to);
	};

	return (
		<Animated.View style={{ transform: [{ scale }] }}>
			<Pressable style={[styles.quick, itemWidth ? { width: itemWidth } : null]} onPress={handlePress}>
				<LinearGradient colors={gradient as unknown as readonly [string, string, ...string[]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.quickGradient}>
					<Ionicons name={icon} size={24} color="#FFF" />
				</LinearGradient>
				<Text style={styles.quickLabel}>{label}</Text>
			</Pressable>
		</Animated.View>
	);
}

function ProgressRing({ progress }: { progress: number }) {
	const [animatedProgress] = useState(new Animated.Value(0));

	useEffect(() => {
		Animated.timing(animatedProgress, {
			toValue: progress,
			duration: 1500,
			useNativeDriver: false,
		}).start();
	}, [progress]);

	return (
		<View style={styles.progressRing}>
			<Text style={styles.progressText}>{Math.round(progress)}%</Text>
			<Text style={styles.progressLabel}>Complete</Text>
		</View>
	);
}

export default function HomeScreen() {
	const insets = useSafeAreaInsets();
	const { t } = useTranslation();
	const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set(['weather', 'fertilizer']));
	const progress = (completedSteps.size / actions.length) * 100;

	// Responsive Quick Actions grid sizing
	const [gridWidth, setGridWidth] = useState(0);
	const spacing = 12;
	const numColumns = gridWidth >= 900 ? 4 : gridWidth >= 600 ? 3 : 2;
	const itemWidth = gridWidth
		? Math.floor((gridWidth - spacing * (numColumns - 1)) / numColumns)
		: undefined;

	const [headerOpacity] = useState(new Animated.Value(0));
	const [heroScale] = useState(new Animated.Value(0.9));

	useEffect(() => {
		Animated.parallel([
			Animated.timing(headerOpacity, {
				toValue: 1,
				duration: 600,
				useNativeDriver: true,
			}),
			Animated.spring(heroScale, {
				toValue: 1,
				tension: 50,
				friction: 7,
				useNativeDriver: true,
			}),
		]).start();
	}, []);

	return (
		<View style={[styles.container, { paddingTop: insets.top }]}>
			<ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
				<Animated.View style={[styles.header, { opacity: headerOpacity }]}>
					<View>
						<Text style={styles.greeting}>Hello, Farmer! 👋</Text>
						<Text style={styles.date}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</Text>
					</View>
					<ProgressRing progress={progress} />
				</Animated.View>

				<Animated.View style={{ transform: [{ scale: heroScale }] }}>
					<LinearGradient colors={['#A5D6A7', '#66BB6A', '#4CAF50']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
						<View style={styles.heroContent}>
							<View style={styles.heroTextWrap}>
								<Text style={styles.title}>{t('home.title', { defaultValue: 'Your Growth Journey' })}</Text>
								<Text style={styles.subtitle}>
									{t('home.subtitle', { defaultValue: 'Complete each phase to master your farm' })}
								</Text>
								<View style={styles.streakBadge}>
									<Ionicons name="flame" size={16} color="#FF6B35" />
									<Text style={styles.streakText}>3 day streak!</Text>
								</View>
							</View>
							<Image source={require('../../../assets/images/img/plant-under-sun.png')} resizeMode="contain" style={styles.heroImage} />
						</View>
					</LinearGradient>
				</Animated.View>

				<View style={styles.section}>
					<View style={styles.sectionHeader}>
						<Text style={styles.sectionTitle}>🎯 Your Mission</Text>
						<Text style={styles.sectionCaption}>
							{completedSteps.size} of {actions.length} phases completed
						</Text>
					</View>

					<View style={styles.stepList}>
						{actions.map((action, idx) => (
							<AnimatedCard key={action.key} action={action} index={idx} completed={completedSteps.has(action.key)} />
						))}
					</View>
				</View>

				<View style={styles.section}>
					<View style={styles.sectionHeader}>
						<Text style={styles.sectionTitle}>⚡ Quick Actions</Text>
					</View>
					<View
						style={styles.quickGrid}
						onLayout={(e) => setGridWidth(e.nativeEvent.layout.width)}
					>
						<QuickAction
							icon="cloud-outline"
							label={t('home.action.weather', { defaultValue: 'Weather' })}
							gradient={['#4CAF50', '#2E7D32']}
							to="/(tabs)"
							index={0}
							itemWidth={itemWidth}
						/>
						<QuickAction
							icon="leaf-outline"
							label={t('home.action.fertilizer', { defaultValue: 'Fertilizer' })}
							gradient={['#66BB6A', '#388E3C']}
							to="/(tabs)/fertilizer"
							index={1}
							itemWidth={itemWidth}
						/>
						<QuickAction
							icon="bug-outline"
							label={t('home.action.scan', { defaultValue: 'Scan Leaf' })}
							gradient={['#26A69A', '#00796B']}
							to="/(tabs)/pests"
							index={2}
							itemWidth={itemWidth}
						/>
						<QuickAction
							icon="flask-outline"
							label={t('home.action.yield', { defaultValue: 'Oil Yield' })}
							gradient={['#8D6E63', '#5D4037']}
							to="/(tabs)/oil"
							index={3}
							itemWidth={itemWidth}
						/>
					</View>
				</View>

				<View style={{ height: 40 }} />
			</ScrollView>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#F5F9F7',
	},
	content: {
		paddingHorizontal: 20,
		paddingBottom: 20,
	},
	header: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 20,
		paddingTop: 8,
	},
	greeting: {
		fontSize: 28,
		fontWeight: '700',
		color: '#1A1A1A',
		letterSpacing: -0.5,
	},
	date: {
		fontSize: 14,
		color: '#6B7280',
		marginTop: 2,
		fontWeight: '500',
	},
	progressRing: {
		width: 70,
		height: 70,
		borderRadius: 35,
		backgroundColor: '#FFF',
		alignItems: 'center',
		justifyContent: 'center',
		shadowColor: '#4CAF50',
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.2,
		shadowRadius: 8,
		elevation: 5,
	},
	progressText: {
		fontSize: 20,
		fontWeight: '800',
		color: '#4CAF50',
	},
	progressLabel: {
		fontSize: 9,
		fontWeight: '600',
		color: '#6B7280',
		marginTop: -2,
	},
	hero: {
		borderRadius: 24,
		overflow: 'hidden',
		marginBottom: 24,
		shadowColor: '#4CAF50',
		shadowOffset: { width: 0, height: 8 },
		shadowOpacity: 0.25,
		shadowRadius: 16,
		elevation: 8,
	},
	heroContent: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		padding: 20,
	},
	heroTextWrap: {
		flex: 1,
		paddingRight: 12,
	},
	title: {
		fontSize: 24,
		fontWeight: '800',
		color: '#FFF',
		letterSpacing: -0.5,
	},
	subtitle: {
		marginTop: 6,
		fontSize: 14,
		color: '#FFF',
		opacity: 0.9,
		fontWeight: '500',
	},
	streakBadge: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		backgroundColor: '#FFFFFF30',
		alignSelf: 'flex-start',
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 20,
		marginTop: 12,
	},
	streakText: {
		fontSize: 13,
		fontWeight: '700',
		color: '#FFF',
	},
	heroImage: {
		width: 90,
		height: 90,
	},
	section: {
		marginBottom: 24,
	},
	sectionHeader: {
		marginBottom: 16,
	},
	sectionTitle: {
		fontSize: 20,
		fontWeight: '700',
		color: '#1A1A1A',
		letterSpacing: -0.3,
	},
	sectionCaption: {
		marginTop: 4,
		fontSize: 13,
		color: '#6B7280',
		fontWeight: '500',
	},
	stepList: {
		gap: 12,
	},
	card: {
		borderRadius: 20,
		overflow: 'hidden',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 8,
		elevation: 3,
	},
	cardCompleted: {
		shadowColor: '#4CAF50',
		shadowOpacity: 0.3,
	},
	cardGradient: {
		borderRadius: 20,
	},
	cardContent: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 14,
		padding: 16,
	},
	badge: {
		width: 48,
		height: 48,
		borderRadius: 14,
		alignItems: 'center',
		justifyContent: 'center',
	},
	cardBody: {
		flex: 1,
	},
	cardTitleRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
		marginBottom: 6,
	},
	stepBadge: {
		width: 26,
		height: 26,
		borderRadius: 8,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#E3F2FD',
	},
	stepBadgeCompleted: {
		backgroundColor: '#FFFFFF40',
	},
	stepIndex: {
		fontSize: 13,
		fontWeight: '800',
		color: '#1976D2',
	},
	stepIndexCompleted: {
		color: '#FFF',
	},
	cardTitle: {
		fontSize: 16,
		fontWeight: '700',
		color: '#1A1A1A',
		letterSpacing: -0.2,
	},
	cardTitleCompleted: {
		color: '#FFF',
	},
	cardDesc: {
		fontSize: 13,
		color: '#6B7280',
		lineHeight: 18,
		fontWeight: '500',
	},
	cardDescCompleted: {
		color: '#FFF',
		opacity: 0.9,
	},
	checkMark: {
		width: 28,
		height: 28,
	},
	quickGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 12,
	},
	quick: {
		// width is set responsively; default keeps two columns
		width: '48%',
		backgroundColor: '#FFF',
		borderRadius: 18,
		padding: 16,
		alignItems: 'center',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.08,
		shadowRadius: 8,
		elevation: 2,
	},
	quickGradient: {
		width: 56,
		height: 56,
		borderRadius: 16,
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 12,
	},
	quickLabel: {
		fontSize: 14,
		fontWeight: '700',
		color: '#1A1A1A',
		textAlign: 'center',
		letterSpacing: -0.2,
	},
});