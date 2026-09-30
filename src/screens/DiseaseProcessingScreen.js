// ─────────────────────────────────────────────────────────────────────────────
// AgriVision — Disease Processing screen
// Ported from DiseaseProcessing.kt. Shows the captured leaf image inside a
// rounded card, a determinate circular progress ring (strokeWidth 8.dp,
// spring-animated), a live percent readout, staged status copy, and the
// "AgriVision AI Diagnosis" footer while the ML pipeline runs. On success it
// navigates to DiseaseResult with { crop, disease, confidence, imageUri }.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Image, Animated, Alert, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';

import { colors } from '../theme';
import { useApp } from '../context/AppContext';
import * as api from '../services/api';

// Screen-local palette (DiseaseProcessing.kt)
const PRIMARY_GREEN = colors.primary;   // accentGreen Color(0xFF2E7D32)
const CARD_HEIGHT = 300;                // Card height 300.dp
const RING_SIZE = 48;                   // CircularProgressIndicator default 48.dp
const RING_STROKE = 8;                  // strokeWidth 8.dp

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function withAlpha(hex, alpha) {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// Determinate circular progress ring (View-only — mirrors Compose
// CircularProgressIndicator(progress = animatedProgress, strokeWidth = 8.dp)).
// Two clipped half-ring pieces sweep clockwise from 12 o'clock:
//   right piece: rotation -180° → 0° as p goes 0 → 0.5
//   left  piece: rotation -180° → 0° as p goes 0.5 → 1
function ProgressRing({ progress, color, size = RING_SIZE, stroke = RING_STROKE }) {
  const R = size / 2;
  const rotR = progress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['-180deg', '0deg', '0deg'],
  });
  const rotL = progress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['-180deg', '-180deg', '0deg'],
  });

  return (
    <View style={{ width: size, height: size }}>
      {/* track ring */}
      <View
        style={{
          position: 'absolute', left: 0, top: 0, width: size, height: size,
          borderRadius: R, borderWidth: stroke, borderColor: withAlpha(color, 0.18),
        }}
      />
      {/* right half progress arc */}
      <View style={{ position: 'absolute', left: R, top: 0, width: R, height: size, overflow: 'hidden' }}>
        <Animated.View
          style={{
            position: 'absolute', left: -R, top: 0, width: size, height: size,
            transform: [{ rotate: rotR }],
          }}
        >
          <View
            style={{
              position: 'absolute', left: R, top: 0, width: R, height: size,
              borderWidth: stroke, borderColor: color, borderLeftColor: 'transparent',
              borderTopColor: 'transparent', borderBottomColor: 'transparent',
              borderTopRightRadius: R, borderBottomRightRadius: R,
            }}
          />
        </Animated.View>
      </View>
      {/* left half progress arc */}
      <View style={{ position: 'absolute', left: 0, top: 0, width: R, height: size, overflow: 'hidden' }}>
        <Animated.View
          style={{
            position: 'absolute', left: 0, top: 0, width: size, height: size,
            transform: [{ rotate: rotL }],
          }}
        >
          <View
            style={{
              position: 'absolute', left: 0, top: 0, width: R, height: size,
              borderWidth: stroke, borderColor: color, borderRightColor: 'transparent',
              borderTopColor: 'transparent', borderBottomColor: 'transparent',
              borderTopLeftRadius: R, borderBottomLeftRadius: R,
            }}
          />
        </Animated.View>
      </View>
    </View>
  );
}

export default function DiseaseProcessingScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { isDark, language } = useApp();

  const { imageUri, cropType, base64 } = route.params || {};

  // DiseaseProcessing.kt palette
  const surfaceColor = isDark ? colors.cardDark : '#FFFFFF';   // 0xFF153525 / Color.White
  const textPrimary = isDark ? '#E8F5E9' : '#1A3C34';          // textPrimary (both themes)
  const gradientColors = isDark
    ? ['#0A1C12', '#0F2418', '#0A1C12']
    : ['#F5FAF5', '#E8F5E9', '#F5FAF5'];

  const [progress, setProgress] = useState(0);
  const [currentStatus, setCurrentStatus] = useState('Preparing image...');
  const [errorMessage, setErrorMessage] = useState(null);
  const [percent, setPercent] = useState(0);

  const animatedProgress = useRef(new Animated.Value(0)).current;
  const statusOpacity = useRef(new Animated.Value(1)).current;
  const aliveRef = useRef(true);

  // animateFloatAsState(progress) — spring toward the target value.
  useEffect(() => {
    Animated.spring(animatedProgress, {
      toValue: progress,
      useNativeDriver: false,
    }).start();
  }, [progress, animatedProgress]);

  // Live percent readout from the animated value: "${(p * 100).toInt()}%".
  useEffect(() => {
    const id = animatedProgress.addListener(({ value }) => {
      setPercent(Math.round(Math.max(0, Math.min(1, value)) * 100));
    });
    return () => animatedProgress.removeListener(id);
  }, [animatedProgress]);

  // If we arrive without an image, pop back (mirrors the source guard).
  useEffect(() => {
    if (!imageUri) navigation.goBack();
  }, [imageUri, navigation]);

  // AnimatedVisibility(true, enter = fadeIn(), exit = fadeOut()) on status text.
  useEffect(() => {
    Animated.sequence([
      Animated.timing(statusOpacity, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(statusOpacity, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();
  }, [currentStatus, statusOpacity]);

  // AlertDialog on failure — "Analysis Error" / message / "Return".
  useEffect(() => {
    if (!errorMessage) return;
    Alert.alert('Analysis Error', errorMessage, [
      { text: 'Return', onPress: () => navigation.goBack() },
    ]);
  }, [errorMessage, navigation]);

  // LaunchedEffect(imageUri, selectedCrop) — staged processing pipeline.
  useEffect(() => {
    if (!imageUri) return;
    aliveRef.current = true;
    const run = async () => {
      try {
        // ---------------- STATUS STEP 1 ----------------
        setCurrentStatus('Loading image...');
        await sleep(500);
        if (!aliveRef.current) return;
        setProgress(0.15);

        // ---------------- STATUS STEP 2 ----------------
        setCurrentStatus('Optimizing image...');
        await sleep(600);
        if (!aliveRef.current) return;
        setProgress(0.30);

        // ---------------- STATUS STEP 3 ----------------
        setCurrentStatus('Running TensorFlow model...');
        await sleep(600);
        if (!aliveRef.current) return;
        setProgress(0.50);

        // ML prediction with on-device INT8 model & Hierarchical Logit Masking
        const langCode = (language || '').toLowerCase().startsWith('hi') ? 'hi' : 'en';
        const result = await api.predictDisease(imageUri, cropType, langCode, base64);

        // ---------------- STATUS STEP 4 ----------------
        setCurrentStatus('Validating with AI vision...');
        await sleep(700);
        if (!aliveRef.current) return;
        setProgress(0.75);

        // ---------------- STATUS STEP 5 ----------------
        setCurrentStatus('Cross-checking results...');
        await sleep(600);
        if (!aliveRef.current) return;
        setProgress(0.90);

        setCurrentStatus('Diagnosis complete');
        setProgress(1);
        await sleep(800);
        if (!aliveRef.current) return;

        navigation.navigate('DiseaseResult', {
          crop: result.crop || cropType,
          disease: result.disease,
          confidence: result.confidence,
          confidencePct: result.confidencePct,
          imageUri,
          diseaseKey: result.diseaseKey,
          hindiName: result.hindiName,
          chlorosisIndex: result.chlorosisIndex,
          lesionNormalizedBBox: result.lesionNormalizedBBox,
          knapsackSprayerDosage: result.knapsackSprayerDosage,
          symptoms: result.symptoms,
          pesticideAdvisory: result.pesticideAdvisory,
          organicRemedy: result.organicRemedy,
          applicationSchedule: result.applicationSchedule,
          isNotLeaf: Boolean(result.isNotLeaf),
          isWrongCrop: Boolean(result.isWrongCrop),
        });
      } catch (e) {
        if (!aliveRef.current) return;
        setErrorMessage(`Analysis failed: ${e.message}`);
      }
    };
    run();
    return () => {
      aliveRef.current = false;
    };
  }, [imageUri, cropType, base64, navigation, language]);

  return (
    <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: surfaceColor }]}>
      {/* TopAppBar — title + back */}
      <View style={[styles.topBar, { backgroundColor: surfaceColor }]}>
        <TouchableOpacity
          style={styles.backBtn}
          activeOpacity={0.7}
          hitSlop={8}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={24} color={textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.topBarTitle, { color: textPrimary }]} numberOfLines={1}>
          {`Analyzing ${cropType || ''}`}
        </Text>
      </View>

      {/* Gradient background + centered content */}
      <LinearGradient colors={gradientColors} style={styles.gradient}>
        <View style={styles.content}>
          {/* Captured image card */}
          <View style={[styles.imageCard, { backgroundColor: surfaceColor }]}>
            <Image
              source={{ uri: imageUri }}
              style={styles.image}
              resizeMode="cover"
            />
          </View>

          <View style={styles.spacer40} />

          <ProgressRing progress={animatedProgress} color={PRIMARY_GREEN} />

          <View style={styles.spacer20} />

          <Text style={[styles.percentText, { color: textPrimary }]}>{percent}%</Text>

          <View style={styles.spacer12} />

          <Animated.View style={{ opacity: statusOpacity, alignSelf: 'stretch' }}>
            <Text style={[styles.statusText, { color: textPrimary }]} numberOfLines={2}>
              {currentStatus}
            </Text>
          </Animated.View>

          <View style={styles.spacer20} />

          <Text style={[styles.footerText, { color: withAlpha(textPrimary, 0.6) }]}>
            AgriVision AI Diagnosis
          </Text>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  topBarTitle: { flex: 1, fontSize: 22, fontWeight: '600', marginRight: 44 },
  gradient: { flex: 1 },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageCard: {
    width: '100%',
    height: CARD_HEIGHT,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 5 },
    elevation: 10,
  },
  image: { width: '100%', height: '100%' },
  spacer40: { height: 40 },
  spacer20: { height: 20 },
  spacer12: { height: 12 },
  percentText: { fontSize: 26, fontWeight: '700' },
  statusText: { fontSize: 16, textAlign: 'center' },
  footerText: { fontSize: 12 },
});
