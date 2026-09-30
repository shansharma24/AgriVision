import React from 'react';
import {
  View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, Modal, Animated,
  Dimensions, ScrollView, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors, radius, spacing } from '../theme';
import { useApp } from '../context/AppContext';

const { width: SCREEN_W } = Dimensions.get('window');

// ── Top app bar ──────────────────────────────────────────────────────────────
export function AppHeader({
  title,
  subtitle,
  onBack,
  onMenu,
  right,
  color = colors.primary,
  textColor = '#FFFFFF',
  style,
}) {
  return (
    <View style={[styles.header, { backgroundColor: color }, style]}>
      {onBack ? (
        <TouchableOpacity onPress={onBack} style={styles.headerBtn} hitSlop={8}>
          <MaterialIcons name="arrow-back" size={24} color={textColor} />
        </TouchableOpacity>
      ) : onMenu ? (
        <TouchableOpacity onPress={onMenu} style={styles.headerBtn} hitSlop={8}>
          <MaterialIcons name="menu" size={26} color={textColor} />
        </TouchableOpacity>
      ) : (
        <View style={styles.headerBtn} />
      )}
      <View style={styles.headerTitleWrap}>
        <Text style={[styles.headerTitle, { color: textColor }]} numberOfLines={1}>
          {title}
        </Text>
        {!!subtitle && (
          <Text style={[styles.headerSubtitle, { color: textColor }]} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>
      <View style={styles.headerBtn}>{right}</View>
    </View>
  );
}

// ── Primary action button ────────────────────────────────────────────────────
export function PrimaryButton({
  title,
  onPress,
  icon,
  loading,
  disabled,
  color = colors.primary,
  textColor = '#FFFFFF',
  style,
  outlined,
}) {
  const isDisabled = disabled || loading;
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={isDisabled ? undefined : onPress}
      style={[
        styles.button,
        outlined && { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: color },
        { backgroundColor: outlined ? 'transparent' : color },
        isDisabled && { opacity: 0.5 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={outlined ? color : textColor} />
      ) : (
        <>
          {!!icon && (
            <MaterialIcons
              name={icon}
              size={20}
              color={outlined ? color : textColor}
              style={{ marginRight: 8 }}
            />
          )}
          <Text style={[styles.buttonText, { color: outlined ? color : textColor }]}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

// ── Card ─────────────────────────────────────────────────────────────────────
export function AppCard({ children, style, onPress, dark }) {
  const { isDark } = useApp();
  const isDarkMode = dark ?? isDark;
  const Wrapper = onPress ? TouchableOpacity : View;
  return (
    <Wrapper
      activeOpacity={0.9}
      onPress={onPress}
      style={[
        styles.card,
        { backgroundColor: isDarkMode ? colors.cardDark : colors.cardLight },
        style,
      ]}
    >
      {children}
    </Wrapper>
  );
}

// ── Chip / pill ──────────────────────────────────────────────────────────────
export function Chip({ label, icon, active, color = colors.primary, onPress, style }) {
  const Wrapper = onPress ? TouchableOpacity : View;
  return (
    <Wrapper
      onPress={onPress}
      style={[
        styles.chip,
        { borderColor: color, backgroundColor: active ? color : `${color}18` },
        style,
      ]}
    >
      {!!icon && (
        <MaterialIcons name={icon} size={15} color={active ? '#fff' : color} style={{ marginRight: 5 }} />
      )}
      <Text style={[styles.chipText, { color: active ? '#fff' : color }]}>{label}</Text>
    </Wrapper>
  );
}

export function SectionHeader({ title, action, onAction, style }) {
  const { isDark } = useApp();
  return (
    <View style={[styles.sectionHeader, style]}>
      <Text style={[styles.sectionTitle, { color: isDark ? '#E8F5E9' : colors.textPrimary }]}>
        {title}
      </Text>
      {!!action && (
        <TouchableOpacity onPress={onAction}>
          <Text style={{ color: colors.primary, fontWeight: '600' }}>{action}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export function LoadingView({ label = 'Loading...', color = colors.primary }) {
  const { isDark } = useApp();
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={color} />
      {!!label && (
        <Text style={{ marginTop: 14, color: isDark ? '#B0B0B0' : '#757575' }}>{label}</Text>
      )}
    </View>
  );
}

export function EmptyState({ icon = 'inbox', title, subtitle, action }) {
  const { isDark } = useApp();
  return (
    <View style={styles.center}>
      <MaterialIcons name={icon} size={64} color={isDark ? '#4A4A4A' : '#C4C4C4'} />
      <Text style={{ fontSize: 17, fontWeight: '600', marginTop: 12, color: isDark ? '#E8F5E9' : '#212121' }}>
        {title}
      </Text>
      {!!subtitle && (
        <Text style={{ marginTop: 6, color: isDark ? '#B0B0B0' : '#757575', textAlign: 'center', paddingHorizontal: 32 }}>
          {subtitle}
        </Text>
      )}
      {!!action && <View style={{ marginTop: 18 }}>{action}</View>}
    </View>
  );
}

// ── Drawer (LeftNavigationDrawer) ──────────────────────────────────────────
const DRAWER_ITEMS = [
  { label: 'Dashboard', icon: 'home', route: 'Dashboard' },
  { label: 'Disease Detection', icon: 'pest-control', route: 'DiseaseDetection' },
  { label: 'Crop Recommendation', icon: 'grass', route: 'CropRecommendation' },
  { label: 'Fertilizer\nRecommendation', icon: 'eco', route: 'FertilizerRecommendation' },
  { label: 'Rover Control', icon: 'videocam', route: 'Rover' },
  { label: 'Logs & History', icon: 'history', route: 'Logs' },
  { label: 'KrishiMitri Chat', icon: 'support-agent', route: 'KrishiMitri' },
];

export function AppDrawer({ visible, onClose }) {
  const navigation = useNavigation();
  const { isDark, t } = useApp();
  const anim = React.useRef(new Animated.Value(0)).current;
  const isClosingRef = React.useRef(false);
  const drawerWidth = Math.min(SCREEN_W * 0.76, 320);

  const drawerItems = [
    { label: t('dashboard'), icon: 'home', route: 'Dashboard' },
    { label: t('disease_detection'), icon: 'pest-control', route: 'DiseaseDetection' },
    { label: t('crop_recommendation'), icon: 'grass', route: 'CropRecommendation' },
    { label: t('fertilizer_recommendation'), icon: 'eco', route: 'FertilizerRecommendation' },
    { label: t('market_prices'), icon: 'attach-money', route: 'MarketPrice' },
    { label: t('rover_control'), icon: 'videocam', route: 'Rover' },
    { label: t('logs_history'), icon: 'history', route: 'Logs' },
    { label: t('krishi_mitri'), icon: 'support-agent', route: 'KrishiMitri' },
    { label: t('choose_language'), icon: 'language', route: 'Language' },
  ];

  React.useEffect(() => {
    if (visible) {
      isClosingRef.current = false;
      anim.setValue(0);
      Animated.timing(anim, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, anim]);

  if (!visible) return null;

  const bg = isDark ? '#143322' : '#EAF5EC';
  const cardBg = isDark ? '#1E442F' : '#FFFFFF';
  const iconCircleBg = isDark ? '#2B573D' : '#E2F3E7';
  const textColor = isDark ? '#E8F5E9' : '#112217';
  const dividerColor = isDark ? '#2B573D' : '#D8E5DC';

  const handleClose = () => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;
    Animated.timing(anim, {
      toValue: 0,
      duration: 180,
      useNativeDriver: true,
    }).start(() => {
      isClosingRef.current = false;
      onClose();
    });
  };

  const go = (route) => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;
    Animated.timing(anim, {
      toValue: 0,
      duration: 160,
      useNativeDriver: true,
    }).start(() => {
      isClosingRef.current = false;
      onClose();
      navigation.navigate(route);
    });
  };

  const NavCard = ({ label, icon, route }) => (
    <TouchableOpacity
      style={[styles.navCard, { backgroundColor: cardBg }]}
      activeOpacity={0.8}
      onPress={() => go(route)}
    >
      <View style={[styles.navIconCircle, { backgroundColor: iconCircleBg }]}>
        <MaterialIcons name={icon} size={21} color={colors.primary} />
      </View>
      <Text style={[styles.navCardText, { color: textColor }]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <View style={styles.modalRoot}>
        {/* Full-screen backdrop: pressing anywhere closes the drawer */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={handleClose}
        >
          <Animated.View
            style={[
              styles.backdropOverlay,
              {
                opacity: anim,
              },
            ]}
          />
        </Pressable>

        {/* Dedicated right touch zone outside the drawer */}
        <Pressable
          style={[styles.outsideTouchZone, { left: drawerWidth }]}
          onPress={handleClose}
        />

        {/* Left Drawer Container */}
        <Animated.View
          style={[
            styles.drawer,
            {
              width: drawerWidth,
              backgroundColor: bg,
              transform: [
                {
                  translateX: anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-drawerWidth, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <SafeAreaView edges={['top', 'bottom']} style={styles.drawerSafe}>
            <Text style={[styles.drawerHeaderTitle, { color: textColor }]}>{t('navigation')}</Text>

            <ScrollView
              style={styles.drawerScroll}
              contentContainerStyle={styles.drawerScrollContent}
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              {drawerItems.map((item) => (
                <NavCard key={item.route} {...item} />
              ))}

              <View style={[styles.drawerNavDivider, { backgroundColor: dividerColor }]} />

              <NavCard label={t('profile')} icon="person" route="Profile" />
            </ScrollView>
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    height: 56,
    elevation: 4,
  },
  headerBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitleWrap: { flex: 1, justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '600' },
  headerSubtitle: { fontSize: 12, opacity: 0.85 },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    paddingHorizontal: 20,
    borderRadius: radius.md,
    minHeight: 48,
  },
  buttonText: { fontSize: 15, fontWeight: '600' },
  card: {
    borderRadius: radius.lg,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  chipText: { fontSize: 13, fontWeight: '500' },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 18, fontWeight: '600' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  modalRoot: {
    flex: 1,
  },
  backdropOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  outsideTouchZone: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    zIndex: 5,
  },
  drawer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    zIndex: 10,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowOffset: { width: 4, height: 0 },
    shadowRadius: 10,
    elevation: 16,
  },
  drawerSafe: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  drawerHeaderTitle: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  drawerScroll: {
    flex: 1,
  },
  drawerScrollContent: {
    paddingBottom: 24,
  },
  navCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    elevation: 1,
  },
  navIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navCardText: {
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 14,
    flex: 1,
    lineHeight: 20,
  },
  drawerNavDivider: {
    height: 1,
    marginVertical: 12,
    marginHorizontal: 4,
  },
});

export { spacing, radius };
