import { NativeModules, Platform } from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { LanguageDetectorAsyncModule } from 'i18next';

// Check if we're in a web environment during SSR
const isWeb = Platform.OS === 'web';
const hasWindow = typeof window !== 'undefined';

const languageDetector: LanguageDetectorAsyncModule = {
  type: 'languageDetector',
  async: true,
  detect: (callback) => {
    // For web without window (SSR), fallback immediately
    if (isWeb && !hasWindow) {
      callback('en');
      return;
    }

    // Try to get saved language from AsyncStorage
    AsyncStorage.getItem('user-language')
      .then((savedLanguage) => {
        if (savedLanguage) {
          callback(savedLanguage);
        } else {
          // Get device language
          let locale = 'en';
          
          if (Platform.OS === 'web' && hasWindow) {
            // Web browser language
            locale = navigator.language.split('-')[0];
          } else if (Platform.OS === 'ios' && NativeModules.SettingsManager) {
            locale = NativeModules.SettingsManager.settings.AppleLocale ||
                     NativeModules.SettingsManager.settings.AppleLanguages?.[0] || 'en';
          } else if (Platform.OS === 'android' && NativeModules.I18nManager) {
            locale = NativeModules.I18nManager.localeIdentifier;
          }

          callback(locale?.split('_')[0] || 'en');
        }
      })
      .catch((err) => {
        console.warn('Language detection failed', err);
        callback('en');
      });
  },
  init: () => {},
  cacheUserLanguage: (lng) => {
    // Don't try to cache during SSR
    if (isWeb && !hasWindow) {
      return;
    }
    
    AsyncStorage.setItem('user-language', lng).catch((err) => {
      console.warn('Failed to cache language:', err);
    });
  },
};

export default languageDetector;