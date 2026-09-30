import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';

import { colors } from '../theme';
import { useApp } from '../context/AppContext';

// Screen-local palette (LanguageSelectionScreen.kt)
const LIGHT_BACKGROUND = '#FAFAFA';
const PRIMARY_GREEN = colors.primary; // 0xFF2E7D32
const LIGHT_GREEN = '#66BB6A';
const TITLE_TEXT = '#212121';
const SUBTITLE_TEXT = '#757575';
const BODY_TEXT = '#616161';
const BORDER_COLOR = colors.border; // #E0E0E0
const SELECTED_BG = '#E8F5E9';
const FLAG_BG = '#F5F5F5';

const LANGUAGES = [
  { nativeName: 'English', code: 'en', flag: '🇬🇧', englishName: 'English' },
  { nativeName: 'हिंदी', code: 'hi', flag: '🇮🇳', englishName: 'Hindi' },
  { nativeName: 'मराठी', code: 'mr', flag: '🇮🇳', englishName: 'Marathi' },
  { nativeName: 'తెలుగు', code: 'te', flag: '🇮🇳', englishName: 'Telugu' },
  { nativeName: 'தமிழ்', code: 'ta', flag: '🇮🇳', englishName: 'Tamil' },
  { nativeName: 'ગુજરાતી', code: 'gu', flag: '🇮🇳', englishName: 'Gujarati' },
  { nativeName: 'ಕನ್ನಡ', code: 'kn', flag: '🇮🇳', englishName: 'Kannada' },
  { nativeName: 'বাংলা', code: 'bn', flag: '🇮🇳', englishName: 'Bengali' },
  { nativeName: 'ਪੰਜਾਬੀ', code: 'pa', flag: '🇮🇳', englishName: 'Punjabi' },
];

export default function LanguageSelectionScreen() {
  const navigation = useNavigation();
  const { languageCode, setLanguage, t } = useApp();

  const [selectedLanguage, setSelectedLanguage] = useState(languageCode || 'en');
  const [visible, setVisible] = useState(false);

  const intro = useRef(new Animated.Value(0)).current;
  const cardAnims = useRef(LANGUAGES.map(() => new Animated.Value(0))).current;

  // LaunchedEffect(Unit) { delay(100); visible = true }
  useEffect(() => {
    const tTimer = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(tTimer);
  }, []);

  // AnimatedVisibility: fade + slide, staggered per language card.
  useEffect(() => {
    if (!visible) return;
    Animated.timing(intro, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
    cardAnims.forEach((anim, index) => {
      Animated.timing(anim, {
        toValue: 1,
        duration: 600,
        delay: 100 + index * 50,
        useNativeDriver: true,
      }).start();
    });
  }, [visible, intro, cardAnims]);

  const onContinue = async () => {
    const chosen = LANGUAGES.find((l) => l.code === selectedLanguage) || LANGUAGES[0];
    await setLanguage(chosen.code);
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.replace('Login');
    }
  };

  const introStyle = {
    opacity: intro,
    transform: [
      {
        translateY: intro.interpolate({
          inputRange: [0, 1],
          outputRange: [-20, 0],
        }),
      },
    ],
  };

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.topSafe}>
        {/* Top bar — white Surface, shadowElevation 2dp */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <LinearGradient
              colors={[PRIMARY_GREEN, LIGHT_GREEN]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.headerIconCircle}
            >
              <MaterialIcons name="language" size={24} color="#FFFFFF" />
            </LinearGradient>
            <View style={styles.headerTextCol}>
              <Text style={styles.headerTitle}>{t('choose_language')}</Text>
              <Text style={styles.headerSubtitle}>{t('select_preferred_language')}</Text>
            </View>
          </View>
        </View>
      </SafeAreaView>

      {/* Content */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={introStyle}>
          <View style={styles.infoCard}>
            <Text style={styles.infoEmoji}>🌐</Text>
            <Text style={styles.infoText}>
              Choose your preferred language for the best experience
            </Text>
          </View>
        </Animated.View>

        <View style={styles.spacerSmall} />

        {LANGUAGES.map((language, index) => {
          const isSelected = selectedLanguage === language.code;
          const cardAnim = cardAnims[index];
          return (
            <Animated.View
              key={language.code}
              style={{
                opacity: cardAnim,
                transform: [
                  {
                    translateY: cardAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [30, 0],
                    }),
                  },
                ],
              }}
            >
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => setSelectedLanguage(language.code)}
                style={[
                  styles.languageCard,
                  isSelected
                    ? {
                        backgroundColor: SELECTED_BG,
                        borderColor: PRIMARY_GREEN,
                        borderWidth: 2,
                        transform: [{ scale: 1.02 }],
                        ...styles.cardElevated,
                      }
                    : {
                        backgroundColor: '#FFFFFF',
                        borderColor: BORDER_COLOR,
                        borderWidth: 1,
                      },
                ]}
              >
                <View style={styles.languageInner}>
                  <View style={styles.languageLeft}>
                    <View style={[styles.flagCircle, isSelected && { backgroundColor: PRIMARY_GREEN }]}>
                      <Text style={[styles.flagText, isSelected && { color: '#FFFFFF', fontWeight: '800' }]}>
                        {language.code.toUpperCase()}
                      </Text>
                    </View>
                    <View>
                      <Text style={styles.nativeName}>{language.nativeName}</Text>
                      <Text style={styles.englishName}>{language.englishName}</Text>
                    </View>
                  </View>

                  {isSelected && (
                    <View style={styles.checkCircle}>
                      <MaterialIcons name="check" size={18} color="#FFFFFF" />
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            </Animated.View>
          );
        })}

        <View style={styles.spacerLarge} />
      </ScrollView>

      {/* Bottom bar — white Surface, shadowElevation 8dp */}
      <SafeAreaView edges={['bottom']} style={styles.bottomSafe}>
        <View style={styles.bottomBar}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={onContinue}
            style={styles.continueButton}
          >
            <Text style={styles.continueText}>{t('continue') || 'Continue'}</Text>
            <View style={{ width: 8 }} />
            <MaterialIcons name="check" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: LIGHT_BACKGROUND },
  topSafe: { backgroundColor: '#FFFFFF' },

  // Header
  header: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    columnGap: 12,
  },
  headerIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextCol: { justifyContent: 'center' },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: TITLE_TEXT,
  },
  headerSubtitle: {
    fontSize: 13,
    color: SUBTITLE_TEXT,
  },

  // Content
  scroll: { flex: 1, backgroundColor: LIGHT_BACKGROUND },
  scrollContent: { paddingHorizontal: 24, paddingVertical: 16 },

  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    padding: 16,
    columnGap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  infoEmoji: { fontSize: 28 },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: BODY_TEXT,
  },

  spacerSmall: { height: 8 },
  spacerLarge: { height: 16 },

  // Language card
  languageCard: {
    borderRadius: 16,
    marginTop: 12,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  cardElevated: {
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
  languageInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
  },
  languageLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 16,
  },
  flagCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: FLAG_BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flagText: { fontSize: 32 },
  nativeName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: TITLE_TEXT,
  },
  englishName: {
    fontSize: 13,
    color: SUBTITLE_TEXT,
  },
  checkCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: PRIMARY_GREEN,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Bottom bar
  bottomSafe: { backgroundColor: '#FFFFFF' },
  bottomBar: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 8,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 60,
    borderRadius: 16,
    backgroundColor: PRIMARY_GREEN,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  continueText: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});
