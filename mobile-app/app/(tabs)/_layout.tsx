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
      initialRouteName="index"
      screenOptions={{
        tabBarActiveTintColor: '#2E7D32', // Green color for better visibility
        tabBarInactiveTintColor: Colors[colorScheme ?? 'light'].tabIconDefault,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarBackground: TabBarBackground,
        sceneContainerStyle: {
          paddingTop: insets.top,
        },
        tabBarStyle: Platform.select({
          ios: {
            // Use a transparent background on iOS to show the blur effect
            height: 60 + insets.bottom,
            paddingBottom: insets.bottom,
            paddingTop: 8,
            paddingHorizontal: 20
          },
          default: {
            // Add specific Android styling if needed
            elevation: 4,
            height: 60 + insets.bottom,
            paddingBottom: insets.bottom,
            paddingTop: 8,
            backgroundColor: '#fff', // White background for Android
          },
        }),
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600', // Slightly bolder font
          marginBottom: Platform.OS === 'ios' ? 0 : 4,
        },
        tabBarItemStyle: {
          paddingVertical: 4,
          marginHorizontal: 5, // create a horizontal gap of ~10 between items
        },
        tabBarIndicatorStyle: {
          backgroundColor: '#2E7D32',
          height: 3,
        },
      }}>

      <Tabs.Screen
        name="fertilizer"
        options={{
          title: 'Fertilizer',
          tabBarIcon: ({ color, focused, size }) => (
            <Ionicons 
              name={focused ? "leaf" : "leaf-outline"} 
              size={size || 24} 
              color={focused ? '#2E7D32' : color} 
            />
          ),
        }}
      />

      <Tabs.Screen
        name="oil"
        options={{
          title: 'Oil',
          tabBarIcon: ({ color, focused, size }) => (
            <Ionicons 
              name={focused ? "flask" : "flask-outline"} 
              size={size || 24} 
              color={focused ? '#2E7D32' : color} 
            />
          ),
        }}
      />

      <Tabs.Screen
        name="index"
        options={{
          title: 'Weather',
          tabBarIcon: ({ color, focused, size }) => (
            <Ionicons 
              name={focused ? "partly-sunny" : "partly-sunny-outline"} 
              size={size || 24} 
              color={focused ? '#2E7D32' : color} 
            />
          ),
        }}
      />

      <Tabs.Screen
        name="pests"
        options={{
          title: 'Pests',
          tabBarIcon: ({ color, focused, size }) => (
            <Ionicons 
              name={focused ? "bug" : "bug-outline"} 
              size={size || 24} 
              color={focused ? '#2E7D32' : color} 
            />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused, size }) => (
            <Ionicons 
              name={focused ? "person" : "person-outline"} 
              size={size || 24} 
              color={focused ? '#2E7D32' : color} 
            />
          ),
        }}
      />
    </Tabs>
  );
}