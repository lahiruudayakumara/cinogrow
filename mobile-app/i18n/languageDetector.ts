import { NativeModules, Platform } from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { LanguageDetectorAsyncModule } from 'i18next';

const languageDetector: LanguageDetectorAsyncModule = {
  type: 'languageDetector',
  async: true,
  detect: (callback) => {
    AsyncStorage.getItem('user-language')
      .then((savedLanguage) => {
        if (savedLanguage) {
          callback(savedLanguage);
        } else {
          const locale =
            Platform.OS === 'ios'
              ? NativeModules.SettingsManager.settings.AppleLocale ||
                NativeModules.SettingsManager.settings.AppleLanguages[0]
              : NativeModules.I18nManager.localeIdentifier;

          callback(locale?.split('_')[0] || 'it');
        }
      })
      .catch((err) => {
        console.warn('Language detection failed', err);
        callback('it');
      });
  },
  init: () => {},
  cacheUserLanguage: (lng) => {
    AsyncStorage.setItem('user-language', lng);
  },
};

export default languageDetector;