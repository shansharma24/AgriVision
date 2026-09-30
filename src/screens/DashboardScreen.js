import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Image,
  Modal,
  Dimensions,
  StatusBar,
  RefreshControl,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { colors } from '../theme';
import { useApp } from '../context/AppContext';
import { AppDrawer } from '../components';
import * as api from '../services/api';
import { liveSnapshot } from '../data/mockData';

const { width: SCREEN_W } = Dimensions.get('window');
const SOIL_CARD_WIDTH = SCREEN_W - 32;

// ── Colors matching the screenshots ─────────────────────────────────────────
const PAGE_BG = '#F0F8F3';
const CARD_BG = '#FFFFFF';
const TEXT_DARK = '#112217';
const TEXT_MUTED = '#667C6D';
const TEXT_HINT = '#7A8E80';
const GREEN_PRIMARY = '#2E7D32';
const GREEN_DARK = '#1B4332';
const GREEN_MINT = '#EAF5EC';
const GREEN_CIRCLE = '#C8E6C9';
const BLUE_LIGHT = '#E1F5FE';
const BLUE_TEXT = '#0288D1';
const YELLOW_LIGHT = '#FFF9C4';
const YELLOW_TEXT = '#E68A00';
const GRAY_CIRCLE = '#E4ECF0';

// ── Soil Metric Color Grading & Config (mirrors media_1790186392335.png) ─────
function getSoilMetricConfig(type, rawValue) {
  const val = Number(rawValue) || 0;
  switch (type) {
    case 'moisture': {
      // Optimal: 50% - 80% (Dark Green #227B36)
      // Caution: 30% - 49% (Amber #FFA000)
      // Critical Low: < 30% (Red #E53935)
      // Waterlogged: > 80% (Blue #0288D1)
      let color = '#227B36';
      let track = '#E3EDE5';
      if (val < 30) {
        color = '#E53935';
        track = '#FFEBEE';
      } else if (val < 50) {
        color = '#FFA000';
        track = '#FFF8E1';
      } else if (val > 80) {
        color = '#0288D1';
        track = '#E1F5FE';
      }
      return {
        display: `${val}%`,
        color,
        textColor: color,
        track,
        isArc: true,
      };
    }
    case 'temperature': {
      // In screenshot: 0°C -> Text #227B36, faint circular border #DAE6DD
      let color = '#227B36';
      let track = '#DAE6DD';
      let textColor = '#227B36';
      if (val === 0) {
        color = '#DAE6DD';
        textColor = '#227B36';
        track = '#DAE6DD';
      } else if (val < 10) {
        color = '#0288D1';
        textColor = '#0288D1';
        track = '#0288D1';
      } else if (val <= 30) {
        color = '#227B36';
        textColor = '#227B36';
        track = '#227B36';
      } else if (val <= 38) {
        color = '#FFA000';
        textColor = '#FFA000';
        track = '#FFA000';
      } else {
        color = '#E53935';
        textColor = '#E53935';
        track = '#E53935';
      }
      return {
        display: `${val}°C`,
        color,
        textColor,
        track,
        isArc: false,
      };
    }
    case 'humidity': {
      // In screenshot: 0% -> Pale yellow/amber ring #FFE082, amber text #E69500
      let color = '#FFE082';
      let track = '#FFE082';
      let textColor = '#E69500';
      if (val === 0 || val < 30) {
        color = '#FFE082';
        track = '#FFE082';
        textColor = '#E69500';
      } else if (val < 45) {
        color = '#FFA000';
        track = '#FFA000';
        textColor = '#FFA000';
      } else if (val <= 75) {
        color = '#227B36';
        track = '#227B36';
        textColor = '#227B36';
      } else if (val <= 85) {
        color = '#0288D1';
        track = '#0288D1';
        textColor = '#0288D1';
      } else {
        color = '#E53935';
        track = '#E53935';
        textColor = '#E53935';
      }
      return {
        display: `${val}%`,
        color,
        textColor,
        track,
        isArc: false,
      };
    }
    case 'nitrogen': {
      // In screenshot: 846 mg/kg -> Solid red ring #EB3B3B, text #EB3B3B
      let color = '#EB3B3B';
      if (val >= 20 && val <= 80) {
        color = '#227B36';
      } else if (val <= 180) {
        color = '#FFA000';
      } else {
        color = '#EB3B3B';
      }
      return {
        display: `${val} mg/kg`,
        color,
        textColor: color,
        track: color,
        isArc: false,
      };
    }
    case 'phosphorus': {
      // In screenshot: 845 mg/kg -> Deep dark maroon #7F0010, text #7F0010
      let color = '#7F0010';
      if (val >= 20 && val <= 60) {
        color = '#227B36';
      } else if (val <= 150) {
        color = '#FFA000';
      } else if (val <= 300) {
        color = '#E53935';
      } else {
        color = '#7F0010';
      }
      return {
        display: `${val} mg/kg`,
        color,
        textColor: color,
        track: color,
        isArc: false,
      };
    }
    case 'potassium': {
      // In screenshot: 1014 mg/kg -> Solid coral red #EA3943, text #EA3943
      let color = '#EA3943';
      if (val >= 50 && val <= 250) {
        color = '#227B36';
      } else if (val <= 500) {
        color = '#FFA000';
      } else {
        color = '#EA3943';
      }
      return {
        display: `${val} mg/kg`,
        color,
        textColor: color,
        track: color,
        isArc: false,
      };
    }
    case 'ph': {
      // In screenshot: 3.0 -> Soft cream track #FDF1CE, orange arc #FF9800, text #E69100
      let color = '#FF9800';
      let track = '#FDF1CE';
      let textColor = '#E69100';
      if (val >= 6.0 && val <= 7.5) {
        color = '#227B36';
        track = '#E3EDE5';
        textColor = '#227B36';
      } else if (val >= 5.5 && val < 6.0) {
        color = '#FFA000';
        track = '#FFF8E1';
        textColor = '#FFA000';
      } else if (val > 7.5 && val <= 8.5) {
        color = '#FFA000';
        track = '#FFF8E1';
        textColor = '#FFA000';
      } else if (val > 8.5) {
        color = '#7B1FA2';
        track = '#F3E5F5';
        textColor = '#7B1FA2';
      }
      return {
        display: typeof rawValue === 'number' ? rawValue.toFixed(1) : `${rawValue}`,
        color,
        textColor,
        track,
        isArc: true,
      };
    }
    case 'ec': {
      // In screenshot: 922.0 -> Solid coral red #EA3943, text #EA3943
      let color = '#EA3943';
      if (val <= 2.0 || (val > 10 && val <= 300)) {
        color = '#227B36';
      } else if (val <= 4.0 || (val > 10 && val <= 600)) {
        color = '#FFA000';
      } else {
        color = '#EA3943';
      }
      return {
        display: typeof rawValue === 'number' ? rawValue.toFixed(1) : `${rawValue}`,
        color,
        textColor: color,
        track: color,
        isArc: false,
      };
    }
    default:
      return { display: `${val}`, color: '#227B36', textColor: '#227B36', track: '#227B36', isArc: false };
  }
}

function SoilMetricRing({ label, type, value }) {
  const config = getSoilMetricConfig(type, value);
  const textColor = config.textColor || config.color;
  const isMgKg = config.display.includes('mg/kg');
  const isLong = config.display.length > 5;

  return (
    <View style={styles.metricRingCol}>
      <View
        style={[
          styles.metricRingBase,
          config.isArc
            ? {
                borderColor: config.track,
                borderTopColor: config.color,
                borderRightColor: config.color,
                borderBottomColor: type === 'moisture' ? config.color : config.track,
                borderLeftColor: config.track,
                transform: [{ rotate: '-45deg' }],
              }
            : {
                borderColor: config.track,
              },
        ]}
      >
        <View style={config.isArc ? { transform: [{ rotate: '45deg' }] } : null}>
          <Text
            style={[
              styles.metricRingValue,
              { color: textColor },
              isMgKg ? styles.metricRingValueMgKg : isLong ? styles.metricRingValueSmall : null,
            ]}
            numberOfLines={1}
          >
            {config.display}
          </Text>
        </View>
      </View>
      <Text style={styles.metricRingLabel}>{label}</Text>
    </View>
  );
}

// Normalize Firebase payload flexibly for Zone 1 or Zone 2
function extractNodeMetrics(liveSource, activeZone = 'zone_1') {
  const fallback = (liveSnapshot.nodes && liveSnapshot.nodes[activeZone]) || {
    moisture: 68,
    temperature: 0,
    humidity: 0,
    n: 846,
    p: 845,
    k: 1014,
    ph: 3.0,
    ec: 922.0,
  };

  if (!liveSource) return fallback;

  let raw = null;
  if (liveSource.nodes && typeof liveSource.nodes === 'object') {
    raw = liveSource.nodes[activeZone] ||
          liveSource.nodes[activeZone.replace('_', '')] ||
          (activeZone === 'zone_1' ? (liveSource.nodes.zone1 || liveSource.nodes['Zone 1']) : (liveSource.nodes.zone2 || liveSource.nodes['Zone 2']));
  }
  if (!raw && typeof liveSource === 'object') {
    raw = liveSource[activeZone] ||
          liveSource[activeZone.replace('_', '')] ||
          (activeZone === 'zone_1' ? (liveSource.zone1 || liveSource['Zone 1']) : (liveSource.zone2 || liveSource['Zone 2']));
  }
  if (!raw && Array.isArray(liveSource)) {
    raw = liveSource.find((n) => n.id === activeZone || n.name === activeZone || n.zone === activeZone);
  }
  if (!raw && liveSource && (liveSource.moisture !== undefined || liveSource.soil_moisture !== undefined || liveSource.n !== undefined)) {
    raw = liveSource;
  }
  if (!raw) return fallback;

  return {
    moisture: Number(raw.moisture ?? raw.soil_moisture ?? raw.soilMoisture ?? fallback.moisture),
    temperature: Number(raw.temperature ?? raw.temp ?? raw.soil_temp ?? raw.soilTemp ?? fallback.temperature),
    humidity: Number(raw.humidity ?? raw.air_humidity ?? raw.airHumidity ?? fallback.humidity),
    n: Number(raw.n ?? raw.nitrogen ?? raw.Nitrogen ?? fallback.n),
    p: Number(raw.p ?? raw.phosphorus ?? raw.Phosphorus ?? fallback.p),
    k: Number(raw.k ?? raw.potassium ?? raw.Potassium ?? fallback.k),
    ph: Number(raw.ph ?? raw.pH ?? raw.phLevel ?? fallback.ph),
    ec: Number(raw.ec ?? raw.EC ?? raw.electricalConductivity ?? fallback.ec),
  };
}

export default function DashboardScreen() {
  const navigation = useNavigation();
  const {
    isDark,
    toggleTheme,
    language,
    languageCode,
    languageInfo,
    setLanguage,
    t,
    supportedLanguages,
    farms,
    selectedFarm,
    selectFarm,
    user,
  } = useApp();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [voiceVisible, setVoiceVisible] = useState(false);
  const [voiceQuery, setVoiceQuery] = useState('');
  const [voiceAnswer, setVoiceAnswer] = useState(null);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [farmPickerVisible, setFarmPickerVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Active farm
  const currentFarm = selectedFarm || (farms && farms[0]) || {
    id: 'farm_greenyard',
    name: 'Greenyard Farms',
    location: 'tokyo',
    acres: 299,
    cropType: 'Wheat',
    status: 'HEALTHY',
  };

  const farmName = currentFarm.name || 'Greenyard Farms';
  const farmLocation = (currentFarm.location || 'tokyo').toLowerCase();

  // User name
  const userName =
    (user && user.name && user.name.trim() !== '') ? user.name : t('farmer');

  // Live sensor & system data
  const [live, setLive] = useState(liveSnapshot);
  useEffect(() => {
    if (!currentFarm.id) return undefined;
    const unsub = api.subscribeLiveData(currentFarm.id, (data) => setLive(data));
    return unsub;
  }, [currentFarm.id]);

  // Irrigation & systems
  const [pumpOn, setPumpOn] = useState(false);
  const [lastUpdatedTime, setLastUpdatedTime] = useState('09:24 pm');

  // Soil Nodes Zone selection & Horizontal Swipe (Zone 1 <-> Zone 2)
  const [activeZone, setActiveZone] = useState('zone_1');
  const soilScrollRef = React.useRef(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const syncAnim = React.useRef(new Animated.Value(0)).current;

  const scrollToZone = (zone) => {
    setActiveZone(zone);
    const targetX = zone === 'zone_1' ? 0 : SOIL_CARD_WIDTH;
    soilScrollRef.current?.scrollTo({ x: targetX, animated: true });
  };

  const handleSoilScroll = (event) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const pageIndex = Math.round(offsetX / SOIL_CARD_WIDTH);
    const targetZone = pageIndex === 0 ? 'zone_1' : 'zone_2';
    if (targetZone !== activeZone) {
      setActiveZone(targetZone);
    }
  };

  const onSync = () => {
    if (isSyncing) return;
    setIsSyncing(true);
    syncAnim.setValue(0);
    Animated.timing(syncAnim, {
      toValue: 1,
      duration: 700,
      useNativeDriver: true,
    }).start(() => {
      setIsSyncing(false);
    });
    setLive({ ...liveSnapshot });
  };

  const spin = syncAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const nodeData1 = extractNodeMetrics(live, 'zone_1');
  const nodeData2 = extractNodeMetrics(live, 'zone_2');

  // Weather state matching Screenshot 3
  const [weather, setWeather] = useState({
    temp: 21,
    feelsLike: 22,
    condition: 'Clouds',
    humidity: 94,
    wind: 10,
    visibility: 10,
    tempMax: 21,
    tempMin: 21,
    city: farmLocation,
  });

  const fetchWeather = React.useCallback(async () => {
    try {
      const data = await api.getWeather(currentFarm.lat, currentFarm.lon, farmLocation);
      if (data) {
        setWeather({
          temp: data.temp ?? 21,
          feelsLike: data.feelsLike ?? 22,
          condition: data.condition || 'Clouds',
          humidity: data.humidity ?? 94,
          wind: data.wind ?? 10,
          visibility: data.visibility ?? 10,
          tempMax: data.tempMax ?? 21,
          tempMin: data.tempMin ?? 21,
          city: data.city || farmLocation,
        });
      }
    } catch (e) {
      // Keep existing weather state on network error
    }
  }, [currentFarm.lat, currentFarm.lon, farmLocation]);

  useEffect(() => {
    fetchWeather();
  }, [fetchWeather, currentFarm.id]);

  const onRefresh = async () => {
    setRefreshing(true);
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const ampm = hours >= 12 ? 'pm' : 'am';
    const formattedHours = hours % 12 || 12;
    const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;
    setLastUpdatedTime(`${formattedHours}:${formattedMinutes} ${ampm}`);
    await fetchWeather();
    setRefreshing(false);
  };

  // Quick modules navigation
  const goTo = (routeName) => {
    if (routeName) {
      navigation.navigate(routeName, { farmId: currentFarm.id });
    }
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: isDark ? colors.dashboardDarkBg : PAGE_BG }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={isDark ? colors.dashboardDarkBg : PAGE_BG} />

      {/* ── Top Bar ────────────────────────────────────────── */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => setDrawerOpen(true)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.menuBtn}
          activeOpacity={0.7}
        >
          <MaterialIcons name="menu" size={26} color={isDark ? '#E8F5E9' : TEXT_DARK} />
        </TouchableOpacity>

        <View style={styles.topBarTitleWrap}>
          <Text style={[styles.topBarTitle, { color: isDark ? '#E8F5E9' : TEXT_DARK }]}>
            {t('app_title')}
          </Text>
          <Text style={styles.topBarSub}>{t('app_subtitle')}</Text>
        </View>

        <View style={styles.topBarRight}>
          <TouchableOpacity
            onPress={() => {
              const isHi = (languageCode || language || '').toLowerCase().startsWith('hi');
              setLanguage(isHi ? 'en' : 'hi');
            }}
            style={styles.langPill}
            activeOpacity={0.7}
          >
            <Text style={[styles.langText, { color: isDark ? '#E8F5E9' : TEXT_DARK }]}>
              {(languageCode || language || '').toLowerCase().startsWith('hi') ? 'HI' : 'EN'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={toggleTheme}
            style={[
              styles.themeBtn,
              { backgroundColor: isDark ? colors.cardDark : CARD_BG },
            ]}
            activeOpacity={0.7}
          >
            <MaterialIcons
              name={isDark ? 'light-mode' : 'dark-mode'}
              size={20}
              color={isDark ? '#FDD835' : TEXT_DARK}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Scrollable Content ─────────────────────────────── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GREEN_PRIMARY} />}
      >
        {/* ── Greeting ─────────────────────────────────────── */}
        <View style={styles.greetingSection}>
          <Text style={[styles.greetingTitle, { color: isDark ? '#E8F5E9' : TEXT_DARK }]}>
            {`Namaste, ${userName} 🙏`}
          </Text>
          <Text style={styles.greetingDate}>
            {new Date().getHours() < 12 ? t('good_morning') : new Date().getHours() < 17 ? t('good_afternoon') : t('good_evening')} • {new Date().toLocaleDateString(languageCode === 'en' ? 'en-US' : 'hi-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
          </Text>
          <Text style={styles.greetingSub}>{farmName}</Text>
        </View>

        {/* ── Current Farm Card ─────────────────────────────── */}
        <TouchableOpacity
          style={[styles.currentFarmCard, { backgroundColor: isDark ? colors.cardDark : CARD_BG }]}
          activeOpacity={0.85}
          onPress={() => setFarmPickerVisible(true)}
        >
          <View style={styles.farmTractorCircle}>
            <MaterialIcons name="agriculture" size={28} color="#FFFFFF" />
          </View>
          <View style={styles.farmInfo}>
            <Text style={styles.currentFarmLabel}>{t('current_farm')}</Text>
            <Text style={[styles.farmNameText, { color: isDark ? '#E8F5E9' : TEXT_DARK }]} numberOfLines={1}>
              {farmName}
            </Text>
            <View style={styles.farmLocRow}>
              <MaterialIcons name="location-on" size={13} color={GREEN_PRIMARY} />
              <Text style={styles.farmLocText}>{farmLocation} • {t('active_iot_gateway')}</Text>
            </View>
          </View>
          <MaterialIcons name="arrow-drop-down" size={28} color={GREEN_PRIMARY} />
        </TouchableOpacity>

        {/* ── Weather Section Card ───────────────────────────── */}
        <View style={[styles.weatherCard, { backgroundColor: isDark ? '#143322' : GREEN_MINT }]}>
          {/* Top row: location & crescent moon */}
          <View style={styles.weatherTopRow}>
            <View style={styles.weatherLocBadge}>
              <MaterialIcons name="location-on" size={15} color={GREEN_PRIMARY} />
              <Text style={[styles.weatherLocText, { color: isDark ? '#E8F5E9' : TEXT_DARK }]}>
                {weather.city || farmLocation}
              </Text>
            </View>
            <Ionicons name="moon" size={22} color="#FBC02D" />
          </View>

          {/* Main row: Big Temp & Condition + Cloud Graphic */}
          <View style={styles.weatherMainRow}>
            <View>
              <Text style={[styles.weatherTempText, { color: isDark ? '#E8F5E9' : TEXT_DARK }]}>
                {weather.temp}°
              </Text>
              <Text style={[styles.weatherCondText, { color: isDark ? '#E8F5E9' : TEXT_DARK }]}>
                {weather.condition.toLowerCase().includes('cloud') ? t('cloudy') : weather.condition.toLowerCase().includes('rain') ? t('rain') : t('clear')}
              </Text>
            </View>

            {/* Cloud Illustration */}
            <View style={styles.cloudWrapper}>
              <View style={styles.cloudBackDrop}>
                <Ionicons name="cloud" size={82} color={isDark ? '#234C34' : '#D5E5DA'} />
              </View>
              <View style={styles.cloudFrontDrop}>
                <Ionicons name="cloud" size={72} color={isDark ? '#2E6142' : '#E8F2EC'} />
              </View>
            </View>
          </View>

          {/* Metrics Row 1: Feels like & Min/Max */}
          <View style={styles.weatherMetricsRow1}>
            <View style={styles.metricItem}>
              <MaterialIcons name="device-thermostat" size={16} color={GREEN_PRIMARY} />
              <Text style={styles.metricText}>{t('feels_like')} {weather.feelsLike}°</Text>
            </View>
            <Text style={styles.metricText}>
              ↑ {weather.tempMax}° / ↓ {weather.tempMin}°
            </Text>
          </View>

          {/* Metrics Row 2: Humidity, Wind, Visibility */}
          <View style={styles.weatherMetricsRow2}>
            <View style={styles.metricItem}>
              <MaterialIcons name="opacity" size={16} color={GREEN_PRIMARY} />
              <Text style={styles.metricBoldText}>{weather.humidity}%</Text>
            </View>
            <View style={styles.metricItem}>
              <MaterialIcons name="air" size={16} color={GREEN_PRIMARY} />
              <Text style={styles.metricBoldText}>{weather.wind} km/h</Text>
            </View>
            <View style={styles.metricItem}>
              <MaterialIcons name="visibility" size={16} color={GREEN_PRIMARY} />
              <Text style={styles.metricBoldText}>{weather.visibility} km</Text>
            </View>
          </View>
        </View>

        {/* ── Soil Nodes Section (Swipe Zone 1 <-> Zone 2) ───── */}
        <View style={styles.soilSectionHeaderRow}>
          <Text style={[styles.sectionHeading, { color: isDark ? '#E8F5E9' : TEXT_DARK, marginBottom: 0 }]}>
            {t('soil_nodes')}
          </Text>
          <View style={styles.paginationDotsRow}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => scrollToZone('zone_1')}
              style={[styles.pageDot, activeZone === 'zone_1' ? styles.pageDotActive : styles.pageDotInactive]}
            />
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => scrollToZone('zone_2')}
              style={[styles.pageDot, activeZone === 'zone_2' ? styles.pageDotActive : styles.pageDotInactive]}
            />
          </View>
        </View>

        {/* Swipeable Zone Container */}
        <ScrollView
          ref={soilScrollRef}
          horizontal
          pagingEnabled
          nestedScrollEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleSoilScroll}
          scrollEventThrottle={16}
          decelerationRate="fast"
          style={styles.soilPagerScrollView}
          contentContainerStyle={{ width: SOIL_CARD_WIDTH * 2 }}
        >
          {/* ── ZONE 1 CARD ── */}
          <View style={[styles.soilCard, { width: SOIL_CARD_WIDTH, backgroundColor: isDark ? colors.cardDark : CARD_BG }]}>
            {/* Card Header: Zone 1 & Sync button */}
            <View style={styles.soilCardHeader}>
              <View style={styles.zoneTitleRow}>
                <Text style={[styles.soilZoneTitle, { color: isDark ? '#E8F5E9' : TEXT_DARK }]}>
                  {t('zone_1')}
                </Text>
                <View style={styles.liveGreenDot} />
              </View>

              <TouchableOpacity
                style={styles.syncBtn}
                activeOpacity={0.7}
                onPress={onSync}
              >
                <Text style={styles.syncText}>{isSyncing ? t('syncing') : t('sync')}</Text>
                <Animated.View style={isSyncing ? { transform: [{ rotate: spin }] } : null}>
                  <MaterialIcons name="sync" size={20} color="#4CAF50" />
                </Animated.View>
              </TouchableOpacity>
            </View>

            {/* 4 Rows x 2 Columns Metric Ring Gauges for Zone 1 */}
            <View style={styles.metricRingsGrid}>
              <View style={styles.metricRingsRow}>
                <SoilMetricRing label={t('moisture')} type="moisture" value={nodeData1.moisture} />
                <SoilMetricRing label={t('soil_temp')} type="temperature" value={nodeData1.temperature} />
              </View>
              <View style={styles.metricRingsRow}>
                <SoilMetricRing label={t('humidity')} type="humidity" value={nodeData1.humidity} />
                <SoilMetricRing label={t('nitrogen')} type="nitrogen" value={nodeData1.n} />
              </View>
              <View style={styles.metricRingsRow}>
                <SoilMetricRing label={t('phosphorus')} type="phosphorus" value={nodeData1.p} />
                <SoilMetricRing label={t('potassium')} type="potassium" value={nodeData1.k} />
              </View>
              <View style={styles.metricRingsRow}>
                <SoilMetricRing label={t('ph')} type="ph" value={nodeData1.ph} />
                <SoilMetricRing label={t('ec')} type="ec" value={nodeData1.ec} />
              </View>
            </View>
          </View>

          {/* ── ZONE 2 CARD ── */}
          <View style={[styles.soilCard, { width: SOIL_CARD_WIDTH, backgroundColor: isDark ? colors.cardDark : CARD_BG }]}>
            {/* Card Header: Zone 2 & Sync button */}
            <View style={styles.soilCardHeader}>
              <View style={styles.zoneTitleRow}>
                <Text style={[styles.soilZoneTitle, { color: isDark ? '#E8F5E9' : TEXT_DARK }]}>
                  {t('zone_2')}
                </Text>
                <View style={styles.liveGreenDot} />
              </View>

              <TouchableOpacity
                style={styles.syncBtn}
                activeOpacity={0.7}
                onPress={onSync}
              >
                <Text style={styles.syncText}>{isSyncing ? t('syncing') : t('sync')}</Text>
                <Animated.View style={isSyncing ? { transform: [{ rotate: spin }] } : null}>
                  <MaterialIcons name="sync" size={20} color="#4CAF50" />
                </Animated.View>
              </TouchableOpacity>
            </View>

            {/* 4 Rows x 2 Columns Metric Ring Gauges for Zone 2 */}
            <View style={styles.metricRingsGrid}>
              <View style={styles.metricRingsRow}>
                <SoilMetricRing label={t('moisture')} type="moisture" value={nodeData2.moisture} />
                <SoilMetricRing label={t('soil_temp')} type="temperature" value={nodeData2.temperature} />
              </View>
              <View style={styles.metricRingsRow}>
                <SoilMetricRing label={t('humidity')} type="humidity" value={nodeData2.humidity} />
                <SoilMetricRing label={t('nitrogen')} type="nitrogen" value={nodeData2.n} />
              </View>
              <View style={styles.metricRingsRow}>
                <SoilMetricRing label={t('phosphorus')} type="phosphorus" value={nodeData2.p} />
                <SoilMetricRing label={t('potassium')} type="potassium" value={nodeData2.k} />
              </View>
              <View style={styles.metricRingsRow}>
                <SoilMetricRing label={t('ph')} type="ph" value={nodeData2.ph} />
                <SoilMetricRing label={t('ec')} type="ec" value={nodeData2.ec} />
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Smart Irrigation Card */}
        <TouchableOpacity
          style={[styles.irrigationCard, { backgroundColor: isDark ? colors.cardDark : CARD_BG }]}
          activeOpacity={0.8}
          onPress={onRefresh}
        >
          <Text style={[styles.irrigationTitle, { color: isDark ? '#E8F5E9' : TEXT_DARK }]}>
            {t('smart_irrigation')}
          </Text>
          <Text style={styles.irrigationSub}>{t('last_updated')}: {lastUpdatedTime}</Text>
          <View style={styles.cardDivider} />
          <Text style={styles.irrigationTap}>{t('tap_to_refresh')}</Text>
        </TouchableOpacity>

        {/* ── Field Alerts Card ─────────────────────────────── */}
        <View style={[styles.alertsCard, { backgroundColor: isDark ? colors.cardDark : CARD_BG }]}>
          <View style={styles.alertsHeaderRow}>
            <Text style={[styles.alertsTitle, { color: isDark ? '#E8F5E9' : TEXT_DARK }]}>
              {t('field_alerts')}
            </Text>
            <Text style={styles.alertsCount}>1</Text>
          </View>
          <Text style={styles.alertsSub}>{t('active_conditions')}</Text>
          <View style={styles.alertContentRow}>
            <View style={styles.alertBar} />
            <Text style={[styles.alertMessage, { color: isDark ? '#E8F5E9' : '#222222' }]} numberOfLines={1}>
              {t('moisture_alert_body')}
            </Text>
          </View>
        </View>

        {/* ── Farm Systems (2x3 Grid) ────────────────────────── */}
        <Text style={[styles.sectionHeading, { color: isDark ? '#E8F5E9' : TEXT_DARK }]}>
          {t('farm_systems')}
        </Text>
        <View style={styles.systemsGrid}>
          {/* Card 1: TDS */}
          <View style={[styles.systemCard, { backgroundColor: isDark ? colors.cardDark : CARD_BG }]}>
            <View style={styles.systemTopRow}>
              <View style={[styles.systemIconCircle, { backgroundColor: '#E2F3E7' }]}>
                <MaterialIcons name="invert-colors" size={20} color={GREEN_PRIMARY} />
              </View>
              <View style={styles.systemTextWrap}>
                <Text style={[styles.systemName, { color: isDark ? '#E8F5E9' : TEXT_DARK }]}>{t('tds')}</Text>
                <Text style={styles.systemValue}>0 ppm</Text>
              </View>
            </View>
            <Text style={[styles.systemStatusText, { color: GREEN_PRIMARY }]}>{t('good')}</Text>
          </View>

          {/* Card 2: Rain Sensor */}
          <View style={[styles.systemCard, { backgroundColor: isDark ? colors.cardDark : CARD_BG }]}>
            <View style={styles.systemTopRow}>
              <View style={[styles.systemIconCircle, { backgroundColor: BLUE_LIGHT }]}>
                <Ionicons name="umbrella-outline" size={20} color={BLUE_TEXT} />
              </View>
              <View style={styles.systemTextWrap}>
                <Text style={[styles.systemName, { color: isDark ? '#E8F5E9' : TEXT_DARK }]}>{t('rain_sensor')}</Text>
                <Text style={styles.systemValue}>{t('no_rain')}</Text>
              </View>
            </View>
            <Text style={[styles.systemStatusText, { color: BLUE_TEXT }]}>{t('dry')}</Text>
          </View>

          {/* Card 3: Pump Status */}
          <View style={[styles.systemCard, { backgroundColor: isDark ? colors.cardDark : CARD_BG }]}>
            <View style={styles.systemTopRow}>
              <View style={[styles.systemIconCircle, { backgroundColor: GRAY_CIRCLE }]}>
                <MaterialIcons name="water-damage" size={20} color="#546E7A" />
              </View>
              <View style={styles.systemTextWrap}>
                <Text style={[styles.systemName, { color: isDark ? '#E8F5E9' : TEXT_DARK }]}>{t('pump_status')}</Text>
                <Text style={styles.systemValue}>{pumpOn ? 'ON' : 'OFF'}</Text>
              </View>
            </View>
            <View style={styles.switchRow}>
              <Switch
                value={pumpOn}
                onValueChange={setPumpOn}
                thumbColor="#FFFFFF"
                trackColor={{ false: '#78909C', true: GREEN_PRIMARY }}
                style={{ transform: [{ scaleX: 0.9 }, { scaleY: 0.9 }] }}
              />
            </View>
          </View>

          {/* Card 4: Tank Level */}
          <View style={[styles.systemCard, { backgroundColor: isDark ? colors.cardDark : CARD_BG }]}>
            <View style={styles.systemTopRow}>
              <View style={[styles.systemIconCircle, { backgroundColor: '#E2F3E7' }]}>
                <MaterialIcons name="opacity" size={20} color={GREEN_PRIMARY} />
              </View>
              <View style={styles.systemTextWrap}>
                <Text style={[styles.systemName, { color: isDark ? '#E8F5E9' : TEXT_DARK }]}>{t('tank_level')}</Text>
                <Text style={styles.systemValue}>0%</Text>
              </View>
            </View>
            <Text style={[styles.systemStatusText, { color: GREEN_PRIMARY }]}>{t('enough_water')}</Text>
          </View>

          {/* Card 5: Solar Charging */}
          <View style={[styles.systemCard, { backgroundColor: isDark ? colors.cardDark : CARD_BG }]}>
            <View style={styles.systemTopRow}>
              <View style={[styles.systemIconCircle, { backgroundColor: YELLOW_LIGHT }]}>
                <MaterialIcons name="bolt" size={20} color="#FBC02D" />
              </View>
              <View style={styles.systemTextWrap}>
                <Text style={[styles.systemName, { color: isDark ? '#E8F5E9' : TEXT_DARK }]}>{t('solar_charging')}</Text>
                <Text style={styles.systemValue}>{t('charging')}</Text>
              </View>
            </View>
            <Text style={[styles.systemStatusText, { color: YELLOW_TEXT }]}>1.4 kW</Text>
          </View>

          {/* Card 6: Irrigation */}
          <View style={[styles.systemCard, { backgroundColor: isDark ? colors.cardDark : CARD_BG }]}>
            <View style={styles.systemTopRow}>
              <View style={[styles.systemIconCircle, { backgroundColor: BLUE_LIGHT }]}>
                <MaterialIcons name="waves" size={20} color={BLUE_TEXT} />
              </View>
              <View style={styles.systemTextWrap}>
                <Text style={[styles.systemName, { color: isDark ? '#E8F5E9' : TEXT_DARK }]}>{t('irrigation')}</Text>
                <Text style={styles.systemValue}>Next in 2 hrs</Text>
              </View>
            </View>
            <Text style={[styles.systemStatusText, { color: BLUE_TEXT }]}>{t('auto_mode')}</Text>
          </View>
        </View>

        {/* ── Logs & History Section ─────────────────────────── */}
        <TouchableOpacity
          style={[styles.historyCard, { backgroundColor: isDark ? colors.cardDark : CARD_BG }]}
          activeOpacity={0.85}
          onPress={() => goTo('Logs')}
        >
          <View style={styles.historyTopRow}>
            <Text style={[styles.historyTitle, { color: isDark ? '#E8F5E9' : TEXT_DARK }]}>
              {t('logs_history')}
            </Text>
            <MaterialIcons name="history" size={24} color={GREEN_PRIMARY} />
          </View>
          <Text style={styles.historySub}>{t('last_7_days_events')}</Text>

          {/* 7-Day Bar Chart */}
          <View style={styles.chartContainer}>
            {[
              { day: 'Mon', h: 65 },
              { day: 'Tue', h: 105 },
              { day: 'Wed', h: 78 },
              { day: 'Thu', h: 115 },
              { day: 'Fri', h: 95 },
              { day: 'Sat', h: 130 },
              { day: 'Sun', h: 105 },
            ].map((item) => (
              <View key={item.day} style={styles.barCol}>
                <View style={[styles.barPill, { height: item.h }]} />
                <Text style={styles.barDayText}>{item.day}</Text>
              </View>
            ))}
          </View>
        </TouchableOpacity>

        {/* ── Quick Modules Section ──────────────────────────── */}
        <Text style={[styles.sectionHeading, { color: isDark ? '#E8F5E9' : TEXT_DARK }]}>
          {t('quick_actions')}
        </Text>
        <View style={styles.quickModulesRow}>
          {/* Disease */}
          <TouchableOpacity
            style={styles.quickModuleItem}
            activeOpacity={0.8}
            onPress={() => goTo('DiseaseDetection')}
          >
            <View style={styles.quickModuleCircle}>
              <MaterialIcons name="pest-control" size={24} color={GREEN_PRIMARY} />
            </View>
            <Text style={styles.quickModuleLabel}>{t('disease_detection')}</Text>
          </TouchableOpacity>

          {/* Rover */}
          <TouchableOpacity
            style={styles.quickModuleItem}
            activeOpacity={0.8}
            onPress={() => goTo('Rover')}
          >
            <View style={styles.quickModuleCircle}>
              <MaterialIcons name="videocam" size={24} color={GREEN_PRIMARY} />
            </View>
            <Text style={styles.quickModuleLabel}>{t('rover_control')}</Text>
          </TouchableOpacity>

          {/* Market */}
          <TouchableOpacity
            style={styles.quickModuleItem}
            activeOpacity={0.8}
            onPress={() => goTo('MarketPrice')}
          >
            <View style={styles.quickModuleCircle}>
              <MaterialIcons name="attach-money" size={24} color={GREEN_PRIMARY} />
            </View>
            <Text style={styles.quickModuleLabel}>{t('market_prices')}</Text>
          </TouchableOpacity>

          {/* Logs */}
          <TouchableOpacity
            style={styles.quickModuleItem}
            activeOpacity={0.8}
            onPress={() => goTo('Logs')}
          >
            <View style={styles.quickModuleCircle}>
              <MaterialIcons name="history" size={24} color={GREEN_PRIMARY} />
            </View>
            <Text style={styles.quickModuleLabel}>{t('logs_short')}</Text>
          </TouchableOpacity>

          {/* KrishiMitri Assistant */}
          <TouchableOpacity
            style={styles.quickModuleItem}
            activeOpacity={0.8}
            onPress={() => goTo('KrishiMitri')}
          >
            <View style={styles.quickModuleCircle}>
              <MaterialIcons name="support-agent" size={24} color={GREEN_PRIMARY} />
            </View>
            <Text style={styles.quickModuleLabel}>{t('assistant')}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* ── Fixed Floating Action Buttons (Bottom-Right) ───── */}
      <View style={styles.fabContainer}>
        {/* Mic FAB */}
        <TouchableOpacity
          style={styles.micFab}
          activeOpacity={0.85}
          onPress={() => {
            setVoiceQuery('');
            setVoiceAnswer(null);
            setVoiceVisible(true);
          }}
        >
          <MaterialIcons name="mic" size={26} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Farmer Mascot FAB */}
        <TouchableOpacity
          style={styles.botFab}
          activeOpacity={0.85}
          onPress={() => goTo('KrishiMitri')}
        >
          <Image
            source={require('../../assets/app/bot.png')}
            style={styles.botImage}
            resizeMode="cover"
          />
        </TouchableOpacity>
      </View>

      {/* ── Voice Assistant Modal (Connected to ChatGPT) ────── */}
      {voiceVisible && (
        <Modal transparent animationType="fade" visible={voiceVisible} onRequestClose={() => setVoiceVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setVoiceVisible(false)} />
            <View style={[styles.voiceCard, { backgroundColor: isDark ? colors.cardDark : CARD_BG }]}>
              <View style={styles.voiceIconCircle}>
                <MaterialIcons name="mic" size={32} color={GREEN_PRIMARY} />
              </View>
              <Text style={[styles.voiceTitle, { color: isDark ? '#E8F5E9' : TEXT_DARK }]}>
                {t('voice_assistant')}
              </Text>
              <Text style={styles.voiceSub}>
                {t('ai_powered_chatgpt')}
              </Text>

              {/* Quick AI Prompts */}
              <Text style={[styles.voicePromptHeading, { color: isDark ? '#E8F5E9' : TEXT_DARK }]}>
                {t('try_saying')}:
              </Text>
              <View style={styles.voicePromptsContainer}>
                {[
                  `How is soil in ${activeZone === 'zone_1' ? 'Zone 1' : 'Zone 2'}?`,
                  'Should I irrigate my crop today?',
                  'What are current mandi prices for wheat?',
                  'Best fertilizer schedule for my farm?',
                ].map((promptText) => (
                  <TouchableOpacity
                    key={promptText}
                    style={styles.voicePromptChip}
                    onPress={() => {
                      setVoiceQuery(promptText);
                      setVoiceLoading(true);
                      setVoiceAnswer(null);
                      api.chatCompletion(
                        [{ role: 'user', content: promptText }],
                        {
                          language: languageCode,
                          farmContext: {
                            name: farmName,
                            cropType: currentFarm.cropType,
                            location: currentFarm.location,
                            nodes: live.nodes,
                            weather,
                          },
                        }
                      )
                        .then((res) => setVoiceAnswer(res.content))
                        .catch((err) => setVoiceAnswer(err.message || 'Error'))
                        .finally(() => setVoiceLoading(false));
                    }}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons name="chat-bubble-outline" size={14} color={GREEN_PRIMARY} />
                    <Text style={styles.voicePromptText}>{promptText}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Query & Answer Display */}
              {voiceLoading && (
                <View style={styles.voiceLoadingRow}>
                  <ActivityIndicator size="small" color={GREEN_PRIMARY} />
                  <Text style={styles.voiceLoadingText}>Asking KrishiMitri ChatGPT...</Text>
                </View>
              )}

              {!!voiceAnswer && (
                <ScrollView style={styles.voiceAnswerBox} showsVerticalScrollIndicator={false}>
                  <Text style={styles.voiceAnswerQuery}>"{voiceQuery}"</Text>
                  <Text style={[styles.voiceAnswerText, { color: isDark ? '#E8F5E9' : TEXT_DARK }]}>
                    {voiceAnswer}
                  </Text>
                </ScrollView>
              )}

              <View style={styles.voiceModalActions}>
                <TouchableOpacity
                  style={styles.voiceChatBtn}
                  onPress={() => {
                    setVoiceVisible(false);
                    goTo('KrishiMitri');
                  }}
                >
                  <MaterialIcons name="support-agent" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.voiceChatBtnText}>{t('krishi_mitri_short')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.voiceCloseBtn}
                  onPress={() => setVoiceVisible(false)}
                >
                  <Text style={styles.voiceCloseText}>{t('done')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}



      {/* ── Farm Selector Modal ────────────────────────────── */}
      {farmPickerVisible && (
        <Modal
          transparent
          animationType="slide"
          visible={farmPickerVisible}
          onRequestClose={() => setFarmPickerVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setFarmPickerVisible(false)} />
            <View style={styles.farmSheet}>
              <View style={styles.sheetHandle} />
              <Text style={styles.sheetTitle}>{t('select_farm')}</Text>
              {(farms || []).map((f) => {
                const isSelected = f.id === currentFarm.id;
                return (
                  <TouchableOpacity
                    key={f.id}
                    style={[styles.sheetFarmItem, isSelected && styles.sheetFarmItemSelected]}
                    onPress={() => {
                      selectFarm(f);
                      setFarmPickerVisible(false);
                    }}
                  >
                    <View style={styles.farmTractorCircleSmall}>
                      <MaterialIcons name="agriculture" size={20} color="#FFFFFF" />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.sheetFarmName}>{f.name}</Text>
                      <Text style={styles.sheetFarmSub}>{f.location || 'tokyo'} • {f.cropType || 'Wheat'}</Text>
                    </View>
                    {isSelected && <MaterialIcons name="check" size={20} color={GREEN_PRIMARY} />}
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity
                style={styles.homeLandingBtn}
                onPress={() => {
                  setFarmPickerVisible(false);
                  navigation.navigate('HomeLanding');
                }}
              >
                <MaterialIcons name="dashboard" size={18} color="#FFFFFF" />
                <Text style={styles.homeLandingBtnText}>{t('all_farms')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* App Drawer */}
      <AppDrawer visible={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </SafeAreaView>
  );
}

// ── Styles matching screenshots ─────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },

  // ── Top Bar ───────────────────────────────────────────────────────────────
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  menuBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  topBarTitleWrap: {
    alignItems: 'center',
  },
  topBarTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  topBarSub: {
    fontSize: 11,
    color: '#4D7C5D',
    marginTop: 1,
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  langPill: {
    height: 30,
    paddingHorizontal: 12,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#8CA594',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  langText: {
    fontSize: 12,
    fontWeight: '700',
  },
  themeBtn: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Greeting ──────────────────────────────────────────────────────────────
  greetingSection: {
    marginTop: 12,
    marginBottom: 16,
  },
  greetingTitle: {
    fontSize: 25,
    fontWeight: '800',
  },
  greetingDate: {
    fontSize: 13,
    color: TEXT_MUTED,
    marginTop: 4,
  },
  greetingSub: {
    fontSize: 13,
    color: TEXT_MUTED,
    marginTop: 2,
  },

  // ── Current Farm Card ─────────────────────────────────────────────────────
  currentFarmCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 14,
  },
  farmTractorCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: GREEN_PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  farmInfo: {
    flex: 1,
    marginLeft: 14,
  },
  currentFarmLabel: {
    fontSize: 11,
    color: TEXT_HINT,
  },
  farmNameText: {
    fontSize: 17,
    fontWeight: '700',
    marginTop: 2,
  },
  farmLocRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  farmLocText: {
    fontSize: 13,
    color: TEXT_MUTED,
    marginLeft: 3,
  },

  // ── Weather Card ──────────────────────────────────────────────────────────
  weatherCard: {
    borderRadius: 22,
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 3,
    elevation: 1,
    marginBottom: 20,
  },
  weatherTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  weatherLocBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  weatherLocText: {
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 4,
  },
  weatherMainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  weatherTempText: {
    fontSize: 54,
    fontWeight: '800',
    lineHeight: 60,
  },
  weatherCondText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 2,
  },
  cloudWrapper: {
    width: 90,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cloudBackDrop: {
    position: 'absolute',
    top: 0,
    right: 4,
    opacity: 0.8,
  },
  cloudFrontDrop: {
    position: 'absolute',
    bottom: 2,
    right: 12,
  },
  weatherMetricsRow1: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 18,
  },
  weatherMetricsRow2: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metricText: {
    fontSize: 13,
    color: '#4B6252',
    fontWeight: '500',
    marginLeft: 4,
  },
  metricBoldText: {
    fontSize: 13,
    color: '#4B6252',
    fontWeight: '700',
    marginLeft: 4,
  },

  // ── Section Titles ────────────────────────────────────────────────────────
  sectionHeading: {
    fontSize: 19,
    fontWeight: '800',
    marginTop: 8,
    marginBottom: 2,
  },
  sectionSubHeading: {
    fontSize: 13,
    color: TEXT_HINT,
    marginBottom: 12,
    marginTop: 2,
  },

  // ── Soil Nodes Card (media_1790186392335.png) ──────────────────────────────
  soilCard: {
    borderRadius: 22,
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 16,
    marginTop: 8,
  },
  soilCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 18,
  },
  soilZoneTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  soilZoneSub: {
    fontSize: 12,
    color: TEXT_HINT,
    marginTop: 2,
  },
  syncBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  syncText: {
    fontSize: 13,
    color: '#4CAF50',
    fontWeight: '600',
    marginRight: 4,
  },
  metricRingsGrid: {
    width: '100%',
  },
  metricRingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 18,
  },
  metricRingCol: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 120,
  },
  metricRingBase: {
    width: 86,
    height: 86,
    borderRadius: 43,
    borderWidth: 3.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  metricRingValue: {
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  metricRingValueSmall: {
    fontSize: 12.5,
  },
  metricRingValueMgKg: {
    fontSize: 11.5,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  metricRingLabel: {
    fontSize: 12,
    color: TEXT_HINT,
    marginTop: 6,
    textAlign: 'center',
    fontWeight: '500',
  },
  paginationDotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 2,
  },
  pageDot: {
    marginHorizontal: 3,
  },
  pageDotActive: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: GREEN_PRIMARY,
  },
  pageDotInactive: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#C8E6C9',
  },

  // ── Smart Irrigation Card ─────────────────────────────────────────────────
  irrigationCard: {
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 16,
  },
  irrigationTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  irrigationSub: {
    fontSize: 12,
    color: TEXT_HINT,
    marginTop: 4,
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#EDF2EE',
    marginVertical: 14,
  },
  irrigationTap: {
    fontSize: 12,
    color: '#8E9F94',
  },

  // ── Field Alerts Card ─────────────────────────────────────────────────────
  alertsCard: {
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 18,
  },
  alertsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  alertsTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  alertsCount: {
    fontSize: 15,
    fontWeight: '800',
    color: GREEN_PRIMARY,
  },
  alertsSub: {
    fontSize: 12,
    color: TEXT_HINT,
    marginTop: 2,
    marginBottom: 14,
  },
  alertContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  alertBar: {
    width: 4,
    height: 30,
    borderRadius: 2,
    backgroundColor: '#FF9800',
  },
  alertMessage: {
    flex: 1,
    fontSize: 13,
    marginLeft: 10,
  },

  // ── Farm Systems 2x3 Grid ─────────────────────────────────────────────────
  systemsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 16,
  },
  systemCard: {
    width: '48%',
    borderRadius: 20,
    padding: 14,
    minHeight: 112,
    justifyContent: 'space-between',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  systemTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  systemIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  systemTextWrap: {
    marginLeft: 10,
    flex: 1,
  },
  systemName: {
    fontSize: 13,
    fontWeight: '700',
  },
  systemValue: {
    fontSize: 12,
    color: TEXT_HINT,
    marginTop: 2,
  },
  systemStatusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  switchRow: {
    alignItems: 'flex-start',
    marginTop: 4,
  },

  // ── Logs & History Card ───────────────────────────────────────────────────
  historyCard: {
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 20,
  },
  historyTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  historySub: {
    fontSize: 12,
    color: TEXT_HINT,
    marginTop: 2,
    marginBottom: 16,
  },
  chartContainer: {
    height: 145,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 6,
    paddingBottom: 4,
  },
  barCol: {
    alignItems: 'center',
    flex: 1,
  },
  barPill: {
    width: 18,
    borderRadius: 9,
    backgroundColor: GREEN_PRIMARY,
  },
  barDayText: {
    fontSize: 11,
    color: TEXT_HINT,
    marginTop: 8,
  },

  // ── Quick Modules ─────────────────────────────────────────────────────────
  quickModulesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 8,
    marginBottom: 24,
  },
  quickModuleItem: {
    alignItems: 'center',
    flex: 1,
  },
  quickModuleCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: GREEN_CIRCLE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickModuleLabel: {
    fontSize: 11,
    color: '#4A6051',
    marginTop: 6,
    fontWeight: '600',
  },

  bottomSpacer: {
    height: 80,
  },

  // ── Fixed Bottom-Right Floating Buttons ───────────────────────────────────
  fabContainer: {
    position: 'absolute',
    right: 16,
    bottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
  },
  micFab: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: GREEN_PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
    elevation: 6,
    marginRight: 10,
  },
  botFab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
    elevation: 6,
    overflow: 'hidden',
  },
  botImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },

  // ── Modals & Sheets ───────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  voiceCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
  },
  voiceIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  voiceTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: TEXT_DARK,
    marginBottom: 8,
  },
  voiceSub: {
    fontSize: 14,
    color: TEXT_MUTED,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  voiceCloseBtn: {
    backgroundColor: GREEN_PRIMARY,
    borderRadius: 14,
    paddingHorizontal: 28,
    paddingVertical: 12,
  },
  voiceCloseText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },

  farmSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    paddingBottom: 36,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CCCCCC',
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT_DARK,
    marginBottom: 14,
  },
  sheetFarmItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    marginBottom: 8,
    backgroundColor: '#F7FAF8',
  },
  sheetFarmItemSelected: {
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: GREEN_PRIMARY,
  },
  farmTractorCircleSmall: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: GREEN_PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetFarmName: {
    fontSize: 15,
    fontWeight: '700',
    color: TEXT_DARK,
  },
  sheetFarmSub: {
    fontSize: 12,
    color: TEXT_MUTED,
    marginTop: 2,
  },
  homeLandingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: GREEN_DARK,
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 12,
  },
  homeLandingBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
    marginLeft: 8,
  },

  // ── Swipeable Zones & Header Styles ────────────────────────────────────────
  soilSectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    marginTop: 4,
  },
  swipeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  swipeBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: GREEN_PRIMARY,
    marginLeft: 4,
  },
  soilPagerScrollView: {
    width: SOIL_CARD_WIDTH,
    marginBottom: 16,
  },
  zoneTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  liveFieldBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginLeft: 8,
  },
  liveGreenDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#2E7D32',
    marginRight: 5,
  },
  liveFieldBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2E7D32',
  },
  zoneCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#EEF3F0',
  },
  zoneNavHintBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: '#E8F5E9',
  },
  zoneNavHintText: {
    fontSize: 12,
    fontWeight: '700',
    color: GREEN_PRIMARY,
  },
  langFlag: {
    fontSize: 13,
    marginRight: 4,
  },

  // ── Voice Assistant ChatGPT Styles ─────────────────────────────────────────
  voicePromptHeading: {
    fontSize: 13,
    fontWeight: '700',
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  voicePromptsContainer: {
    width: '100%',
    marginBottom: 12,
  },
  voicePromptChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F8F3',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#E2F3E7',
  },
  voicePromptText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1B4332',
    marginLeft: 8,
  },
  voiceLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  voiceLoadingText: {
    fontSize: 13,
    color: GREEN_PRIMARY,
    fontWeight: '600',
    marginLeft: 8,
  },
  voiceAnswerBox: {
    width: '100%',
    maxHeight: 140,
    backgroundColor: '#F7FAF8',
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2F3E7',
  },
  voiceAnswerQuery: {
    fontSize: 11,
    fontWeight: '700',
    color: '#667C6D',
    marginBottom: 4,
  },
  voiceAnswerText: {
    fontSize: 13,
    lineHeight: 19,
  },
  voiceModalActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 8,
  },
  voiceChatBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: GREEN_PRIMARY,
    borderRadius: 14,
    paddingVertical: 12,
    marginRight: 8,
  },
  voiceChatBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
