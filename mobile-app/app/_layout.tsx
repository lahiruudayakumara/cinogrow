import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/useColorScheme';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  if (!loaded) {
    // Async font loading only occurs in development.
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
        {/* Farm/Weather Screens */}
        <Stack.Screen
          name="farm-details"
          options={{
            title: "Farm Details",
            headerShown: true
          }}
        />
        <Stack.Screen
          name="farm-assistance"
          options={{
            title: "Farm Assistant",
            headerShown: true
          }}
        />
        <Stack.Screen
          name="past-yield-form"
          options={{
            title: "Past Yield",
            headerShown: true
          }}
        />
        <Stack.Screen
          name="yield-prediction"
          options={{
            title: "Yield Prediction",
            headerShown: true
          }}
        />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
