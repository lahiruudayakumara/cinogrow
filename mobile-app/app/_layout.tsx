import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack, usePathname } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";

import { useColorScheme } from "@/hooks/useColorScheme";
import { I18nextProvider } from "react-i18next";
import i18n from "@/i18n/i18n";
import AppHeader from "@/components/AppHeader";

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const pathname = usePathname();
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  if (!loaded) {
    // Async font loading only occurs in development.
    return null;
  }

  // Don't show header on splash screen
  const showHeader = pathname !== '/splash' && pathname !== '/';

  return (
    <I18nextProvider i18n={i18n}>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <View style={{ flex: 1 }}>
          {showHeader && <AppHeader />}
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen 
              name="splash" 
              options={{ 
                headerShown: false,
                animation: 'fade'
              }} 
            />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            
            <Stack.Screen name="+not-found" />
          </Stack>
        </View>
        <StatusBar style="auto" />
      </ThemeProvider>
    </I18nextProvider>
  );
}
