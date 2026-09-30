import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Animated,
  ActivityIndicator,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';

import { colors } from '../theme';
import { useApp } from '../context/AppContext';

// Screen-local palette (presentation/IntroVideoScreen.kt)
const PRIMARY_GREEN = colors.primary; // Color(0xFF2E7D32)
const LOADER_GREEN = colors.primaryLight; // Color(0xFF4CAF50)
const TEXT_GRAY = '#808080'; // Color.Gray
const WHITE = '#FFFFFF';

// Circle container from the Kotlin (circleSize = 360.dp)
const CIRCLE_SIZE = 360;
// Radial glow container sits just outside it (circleSize + 6.dp)
const GLOW_SIZE = CIRCLE_SIZE + 6;
// Pulsing scale animation — infiniteRepeatable(tween(2500, Reverse))
const PULSE_DURATION = 1250; // one leg of the 2500ms reverse tween
const PULSE_MIN = 0.98;
const PULSE_MAX = 1.02;
// Entrance: fadeIn(tween(400)) + scaleIn(initialScale = 0.95f)
const ENTRANCE_DURATION = 400;
const ENTRANCE_SCALE = 0.95;
// The mp4 asset is a 132-byte placeholder (no expo-video), so we hold the
// splash for one full 2500ms pulse cycle plus the Kotlin's 300ms smooth
// transition delay before triggering navigation.
const SPLASH_DELAY_MS = PULSE_DURATION * 2 + 300;

const FastOutSlowIn = Easing.bezier(0.4, 0.0, 0.2, 1.0);

export default function SplashScreen() {
  const navigation = useNavigation();
  const { isLoggedIn, hydrated } = useApp();

  const [delayDone, setDelayDone] = useState(false);
  const navigatedRef = useRef(false);

  // Infinite scale pulse — rememberInfiniteTransition(scaleAnim)
  const pulse = useRef(new Animated.Value(PULSE_MIN)).current;
  // Entrance fade + scale — AnimatedVisibility enter
  const entrance = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: PULSE_MAX,
          duration: PULSE_DURATION,
          easing: FastOutSlowIn,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: PULSE_MIN,
          duration: PULSE_DURATION,
          easing: FastOutSlowIn,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();

    Animated.timing(entrance, {
      toValue: 1,
      duration: ENTRANCE_DURATION,
      easing: FastOutSlowIn,
      useNativeDriver: true,
    }).start();

    return () => loop.stop();
  }, [pulse, entrance]);

  // Hold the splash for the video-equivalent duration.
  useEffect(() => {
    const t = setTimeout(() => setDelayDone(true), SPLASH_DELAY_MS);
    return () => clearTimeout(t);
  }, []);

  // onFinish equivalent — Navigate based on the persisted session.
  useEffect(() => {
    if (!delayDone || !hydrated || navigatedRef.current) return;
    navigatedRef.current = true;
    if (isLoggedIn) {
      navigation.replace('HomeLanding');
    } else {
      navigation.replace('Onboarding');
    }
  }, [delayDone, hydrated, isLoggedIn, navigation]);

  return (
    <SafeAreaView edges={['top']} style={styles.root}>
      {/* Centered stage holds the circle and its radial glow */}
      <View style={styles.stage}>
        {/* Radial glow — Brush.radialGradient(PrimaryGreen.copy(alpha = 0.08f), Transparent) */}
        <LinearGradient
          colors={['rgba(46,125,50,0.08)', 'rgba(46,125,50,0)']}
          start={{ x: 0.5, y: 0.5 }}
          end={{ x: 1, y: 1 }}
          style={styles.glow}
        />

        {/* Circular video container with pulsing scale */}
        <Animated.View
          style={[
            styles.circle,
            { transform: [{ scale: pulse }] },
          ]}
        >
          {/* Column entrance: fade + scale from 0.95 */}
          <Animated.View
            style={[
              styles.content,
              {
                opacity: entrance,
                transform: [
                  {
                    scale: entrance.interpolate({
                      inputRange: [0, 1],
                      outputRange: [ENTRANCE_SCALE, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            <Image
              source={require('../../assets/app/app_logo11.png')}
              style={styles.logo}
              resizeMode="contain"
            />

            <View style={styles.spacer24} />

            <Text style={styles.subtitle}>AI Powered Crop Health</Text>

            <View style={styles.spacer32} />

            <ActivityIndicator size={32} color={LOADER_GREEN} />
          </Animated.View>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: WHITE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stage: {
    width: GLOW_SIZE,
    height: GLOW_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: GLOW_SIZE / 2,
  },
  circle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    backgroundColor: WHITE,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 180,
    height: 180,
  },
  spacer24: { height: 24 },
  spacer32: { height: 32 },
  subtitle: {
    fontSize: 16,
    color: TEXT_GRAY,
  },
});
