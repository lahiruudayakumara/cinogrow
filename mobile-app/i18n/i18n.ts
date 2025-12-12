import en from '@/assets/locales/en.json';
import si from '@/assets/locales/si.json';
import ta from '@/assets/locales/ta.json';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import languageDetector from './languageDetector';

i18n
    .use(languageDetector)
    .use(initReactI18next)
    .init({
        compatibilityJSON: 'v4',
        fallbackLng: 'en',
        resources: {
            en: { translation: en },
            si: { translation: si },
            ta: { translation: ta },
        },
        interpolation: {
            escapeValue: false,
        },
    });

export default i18n;