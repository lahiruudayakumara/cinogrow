import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { HapticTab } from '@/components/HapticTab';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarBackground: TabBarBackground,
        tabBarStyle: Platform.select({
          ios: {
            // Use a transparent background on iOS to show the blur effect
            height: 50, // removed safe area bottom inset
            paddingBottom: 10, // removed bottom padding
            paddingTop: 8,
            marginBottom: 10,
            paddingHorizontal: 20
          },
          default: {
            // Add specific Android styling if needed
            elevation: 4,
            height: 60, // removed safe area bottom inset for Android
            paddingBottom: 0, // removed bottom padding
            paddingTop: 8,
          },
        }),
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
          marginBottom: Platform.OS === 'ios' ? 0 : 4,
        },
        tabBarItemStyle: {
          paddingVertical: 4,
          marginHorizontal: 5, // create a horizontal gap of ~10 between items
        },
      }}>

      <Tabs.Screen
        name="index"
        options={{
          title: 'Weather',
          tabBarIcon: ({ color, size }) => <Ionicons name="partly-sunny" size={size || 24} color={color} />,
        }}
      />

      <Tabs.Screen
        name="fertilizer"
        options={{
          title: 'Fertilizer',
          tabBarIcon: ({ color, size }) => <Ionicons name="leaf-outline" size={size || 24} color={color} />,
        }}
      />

      <Tabs.Screen
        name="oil"
        options={{
          title: 'Oil',
          tabBarIcon: ({ color, size }) => <Ionicons name="flask-outline" size={size || 24} color={color} />,
        }}
      />

      <Tabs.Screen
        name="pests"
        options={{
          title: 'Pests',
          tabBarIcon: ({ color, size }) => <Ionicons name="bug-outline" size={size || 24} color={color} />,
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size || 24} color={color} />,
        }}
      />
    </Tabs>
  );
}