import { translations } from './translations.js';

export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧', short: 'EN' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिंदी', flag: '🇮🇳', short: 'हिं' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', flag: '🇮🇳', short: 'मरा' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', flag: '🇮🇳', short: 'తె' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', flag: '🇮🇳', short: 'தமி' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', flag: '🇮🇳', short: 'ગુ' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', flag: '🇮🇳', short: 'ಕ' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', flag: '🇮🇳', short: 'বাং' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', flag: '🇮🇳', short: 'ਪੰ' },
];

/**
 * Normalizes any language input (code, English name, native name, or short code)
 * into a standardized 2-letter code ('en', 'hi', etc.)
 */
export function normalizeLanguageCode(langInput) {
  if (!langInput) return 'en';
  const clean = String(langInput).trim().toLowerCase();

  if (clean === 'en' || clean === 'english') return 'en';
  if (clean === 'hi' || clean === 'hindi' || clean.includes('हिंदी') || clean.includes('हिन्दी')) return 'hi';
  if (clean === 'mr' || clean === 'marathi' || clean.includes('मराठी')) return 'mr';
  if (clean === 'te' || clean === 'telugu' || clean.includes('తెలుగు')) return 'te';
  if (clean === 'ta' || clean === 'tamil' || clean.includes('தமிழ்')) return 'ta';
  if (clean === 'gu' || clean === 'gujarati' || clean.includes('ગુજરાતી')) return 'gu';
  if (clean === 'kn' || clean === 'kannada' || clean.includes('ಕನ್ನಡ')) return 'kn';
  if (clean === 'bn' || clean === 'bengali' || clean.includes('বাংলা')) return 'bn';
  if (clean === 'pa' || clean === 'punjabi' || clean.includes('ਪੰਜਾਬੀ')) return 'pa';

  // Check prefix
  const match = SUPPORTED_LANGUAGES.find(
    (l) => clean.startsWith(l.code) || clean.startsWith(l.name.toLowerCase())
  );
  return match ? match.code : 'en';
}

/**
 * Translates a key for a given language code. Falls back to English, then the key itself.
 * Supports placeholder interpolation: t('chat_welcome', 'hi', { name: 'Ramesh' })
 */
export function translate(key, lang = 'en', params = {}) {
  const code = normalizeLanguageCode(lang);
  const langDict = translations[code] || translations.en;
  let text = langDict[key] || translations.en[key] || key;

  if (typeof text === 'string' && params && typeof params === 'object') {
    Object.keys(params).forEach((paramKey) => {
      text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), params[paramKey]);
    });
  }

  return text;
}

export function getLanguageInfo(lang) {
  const code = normalizeLanguageCode(lang);
  return SUPPORTED_LANGUAGES.find((l) => l.code === code) || SUPPORTED_LANGUAGES[0];
}

export { translations };
