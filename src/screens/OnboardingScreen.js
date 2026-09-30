// Onboarding — ported from
// app/src/main/java/com/AgriVision/presentation/onboarding/OnboardingScreen.kt
import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

// 🎨 PROFESSIONAL COLOR SCHEME
const PrimaryGreen = '#2E7D32';
const BackgroundWhite = '#FAFAFA';
const TitleColor = '#212121';
const DescriptionColor = '#616161';
const IndicatorInactive = '#E0E0E0';

const { width: SCREEN_W } = Dimensions.get('window');

const PAGES = [
  {
    title: 'Manage your farm finances',
    description:
      'AgriVision lets you plan, monitor and analyze all activities on your farm in a very simple and intuitive way. It provides real-time insight into daily progress of your crops , manages sales and, expenses  to ensure the health of your finances.',
    image: require('../../assets/app/onboarding1.png'),
  },
  {
    title: 'Disease and Pest Detection',
    description:
      'AgriVision disease prediction system informs farmers about the severity index of crop disease before hand so that farmers can precisely time their preventive measures.',
    image: require('../../assets/app/onboarding2.png'),
  },
  {
    title: 'Smart Farm Monitoring',
    description:
      'Monitor your crops with AI-powered insights. Get weather updates, soil health reports, and irrigation recommendations to maximize your yield.',
    image: require('../../assets/app/onboarding3.png'),
  },
];

export default function OnboardingScreen() {
  const navigation = useNavigation();
  const scrollRef = useRef(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [pagerHeight, setPagerHeight] = useState(0);
  const pageCount = PAGES.length;
  const isLastPage = currentPage === pageCount - 1;

  const indicatorAnim = useRef(
    PAGES.map((_, i) => new Animated.Value(i === 0 ? 32 : 10))
  ).current;

  useEffect(() => {
    PAGES.forEach((_, i) => {
      Animated.timing(indicatorAnim[i], {
        toValue: i === currentPage ? 32 : 10,
        duration: 300,
        useNativeDriver: false,
      }).start();
    });
  }, [currentPage, indicatorAnim]);

  const scrollToPage = (index) => {
    const clamped = Math.max(0, Math.min(pageCount - 1, index));
    scrollRef.current?.scrollTo({ x: clamped * SCREEN_W, animated: true });
  };

  const onMomentumScrollEnd = (e) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / e.nativeEvent.layoutMeasurement.width);
    setCurrentPage(Math.max(0, Math.min(pageCount - 1, index)));
  };

  const onFinish = () => {
    navigation.replace('Language');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.root}>
        {/* ✅ TOP BAR WITH BACK & SKIP */}
        <TopBar
          showBack={currentPage > 0}
          onBackClick={() => scrollToPage(currentPage - 1)}
          onSkipClick={onFinish}
        />

        {/* ✅ PAGER CONTENT */}
        <View
          style={styles.pager}
          onLayout={(e) => setPagerHeight(e.nativeEvent.layout.height)}
        >
          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            bounces={false}
            onMomentumScrollEnd={onMomentumScrollEnd}
            style={{ flex: 1 }}
          >
            {PAGES.map((page, index) => (
              <OnboardingPageContent
                key={`onboarding-page-${index}`}
                page={page}
                height={pagerHeight}
              />
            ))}
          </ScrollView>
        </View>

        {/* ✅ PAGE INDICATORS */}
        <PageIndicators currentPage={currentPage} indicatorAnim={indicatorAnim} />

        <View style={{ height: 24 }} />

        {/* ✅ CONTINUE BUTTON */}
        <ContinueButton
          isLastPage={isLastPage}
          onClick={() => {
            if (isLastPage) {
              onFinish();
            } else {
              scrollToPage(currentPage + 1);
            }
          }}
        />

        <View style={{ height: 32 }} />
      </View>
    </SafeAreaView>
  );
}

// ✅ TOP BAR
function TopBar({ showBack, onBackClick, onSkipClick }) {
  return (
    <View style={styles.topBar}>
      {showBack ? (
        <TouchableOpacity onPress={onBackClick} style={styles.backBtn} hitSlop={8}>
          <MaterialIcons name="undo" size={24} color={PrimaryGreen} />
        </TouchableOpacity>
      ) : (
        <View style={styles.backBtn} />
      )}

      <TouchableOpacity onPress={onSkipClick} hitSlop={8}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>
    </View>
  );
}

// ✅ PAGE CONTENT
function OnboardingPageContent({ page, height }) {
  return (
    <View style={{ width: SCREEN_W, height: height || 400 }}>
      <View style={styles.pageContent}>
        <View style={{ height: 20 }} />

        {/* TITLE */}
        <Text style={styles.title}>{page.title}</Text>

        <View style={{ height: 32 }} />

        {/* ILLUSTRATION */}
        <View style={styles.illustration}>
          <Image
            source={page.image}
            style={styles.illustrationImage}
            resizeMode="contain"
          />
        </View>

        <View style={{ height: 32 }} />

        {/* DESCRIPTION */}
        <Text style={styles.description}>{page.description}</Text>
      </View>
    </View>
  );
}

// ✅ PAGE INDICATORS
function PageIndicators({ currentPage, indicatorAnim }) {
  return (
    <View style={styles.indicatorRow}>
      {PAGES.map((_, index) => {
        const isSelected = index === currentPage;
        return (
          <View key={`indicator-${index}`} style={styles.indicatorGap}>
            <Animated.View
              style={[
                styles.indicator,
                {
                  width: indicatorAnim[index],
                  backgroundColor: isSelected ? PrimaryGreen : IndicatorInactive,
                },
              ]}
            />
          </View>
        );
      })}
    </View>
  );
}

// ✅ CONTINUE BUTTON
function ContinueButton({ isLastPage, onClick }) {
  return (
    <TouchableOpacity
      onPress={onClick}
      style={styles.continueBtn}
      activeOpacity={0.8}
    >
      <Text style={styles.continueText}>
        {isLastPage ? 'GET STARTED' : 'CONTINUE'}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BackgroundWhite },
  root: { flex: 1, backgroundColor: BackgroundWhite },

  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  skipText: { color: PrimaryGreen, fontSize: 16, fontWeight: '600' },

  // Pager
  pager: { flex: 1 },

  // Page content
  pageContent: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: TitleColor,
    textAlign: 'center',
    lineHeight: 32,
  },
  illustration: {
    width: '100%',
    height: 340,
    justifyContent: 'center',
    alignItems: 'center',
  },
  illustrationImage: { width: '100%', height: '100%' },
  description: {
    fontSize: 15,
    fontWeight: '400',
    color: DescriptionColor,
    textAlign: 'center',
    lineHeight: 22,
  },

  // Indicators
  indicatorRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  indicatorGap: { paddingHorizontal: 4 },
  indicator: { height: 10, borderRadius: 5 },

  // Continue button
  continueBtn: {
    marginHorizontal: 24,
    height: 56,
    borderRadius: 16,
    backgroundColor: PrimaryGreen,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  continueText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
  },
});
