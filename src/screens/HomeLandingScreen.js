import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { colors, themed } from '../theme';
import { useApp } from '../context/AppContext';
import { AppDrawer } from '../components';

// ── Colors matching Screenshot 4 ────────────────────────────────────────────
const DarkGreen = '#1B4332';
const PageBg = '#F5F2EB';
const CardBackground = '#FFFFFF';
const HealthyGreen = '#276A3C';

function cleanCropType(cropType) {
  return String(cropType || '')
    .replace(/^(🌾|🍚|🌽|🌿|🎋|🫘|🥔|🍅|🥬|🌻|🫑|🧅|🥕|🫛|🌱)/, '')
    .trim();
}

export default function HomeLandingScreen() {
  const navigation = useNavigation();
  const { farms, selectedFarm, selectFarm, deleteFarm, user, isDark } = useApp();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sheetFarm, setSheetFarm] = useState(null);

  const userFarms = Array.isArray(farms) && farms.length > 0 ? farms : [
    {
      id: 'farm_greenyard',
      name: 'Greenyard Farms',
      location: 'tokyo',
      acres: 299,
      cropType: 'Wheat',
      status: 'HEALTHY',
    },
  ];

  const totalAcres = userFarms.reduce((sum, f) => sum + (Number(f.acres) || 0), 0) || 299;
  const uniqueCrops = [...new Set(userFarms.map((f) => f.cropType).filter(Boolean))];
  const cropCount = uniqueCrops.length > 0 ? uniqueCrops.length : 1;

  const userName =
    (user && user.name && user.name.trim() !== '') ? user.name : 'unknown';

  const openFarm = (farm) => {
    selectFarm(farm);
    navigation.navigate('Dashboard');
  };

  const goToEdit = (farm) => {
    selectFarm(farm);
    navigation.navigate('EditFarm', { farmId: farm.id });
  };

  const goToDelete = (farm) => {
    Alert.alert(
      'Delete Farm?',
      `You are about to permanently delete "${farm.name}".\n\n⚠️ This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteFarm(farm.id) },
      ],
      { cancelable: true }
    );
  };

  const closeSheet = () => setSheetFarm(null);
  const addFarm = () => navigation.navigate('AddFarm');

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: isDark ? colors.backgroundDark : PageBg }]} edges={['top']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={isDark ? colors.backgroundDark : PageBg} />

      {/* ── Top Bar ────────────────────────────────────────── */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.topBtn}
          activeOpacity={0.7}
          onPress={() => setDrawerOpen(true)}
        >
          <MaterialIcons name="menu" size={22} color={DarkGreen} />
        </TouchableOpacity>

        <View style={styles.topTitle}>
          <Text style={styles.topTitleText}>AgriVision</Text>
          <Text style={styles.topSubText}>AI-Powered Farming</Text>
        </View>

        <TouchableOpacity
          style={styles.topBtn}
          activeOpacity={0.7}
          onPress={() => {}}
        >
          <MaterialIcons name="refresh" size={22} color={DarkGreen} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Welcome row ─────────────────────────────── */}
        <View style={styles.welcomeRow}>
          <Text style={styles.welcomeText}>
            <Text style={styles.welcomePrefix}>Welcome back, </Text>
            <Text style={styles.welcomeName}>{userName}</Text>
            <Text style={styles.welcomePrefix}> 👋</Text>
          </Text>
        </View>

        {/* ── Stats row ─────────────────────────────── */}
        <View style={styles.statsRow}>
          <View style={[styles.statPillBase, { backgroundColor: '#DEF0DE' }]}>
            <Text style={styles.statPillEmoji}>🌿</Text>
            <Text style={[styles.statPillText, { color: DarkGreen }]}>
              {userFarms.length} {userFarms.length === 1 ? 'Farm' : 'Farms'}
            </Text>
          </View>

          <View style={[styles.statPillBase, { backgroundColor: '#FFF3DC', borderWidth: 1, borderColor: '#E8DCBE' }]}>
            <Text style={styles.statPillEmoji}>📐</Text>
            <Text style={[styles.statPillText, { color: '#5D4037' }]}>
              {totalAcres} acres
            </Text>
          </View>

          <View style={[styles.statPillBase, { backgroundColor: '#DEF0DE' }]}>
            <Text style={styles.statPillEmoji}>🌱</Text>
            <Text style={[styles.statPillText, { color: DarkGreen }]}>
              Crops {cropCount}
            </Text>
          </View>
        </View>

        {/* ── "My Farms" header ─────────────────────── */}
        <View style={styles.myFarmsHeader}>
          <View>
            <Text style={styles.myFarmsTitle}>My Farms</Text>
            <Text style={styles.myFarmsSub}>
              {userFarms.length} active {userFarms.length === 1 ? 'farm' : 'farms'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.arrowCircle}
            activeOpacity={0.7}
            onPress={() => openFarm(userFarms[0])}
          >
            <MaterialIcons name="arrow-forward" size={18} color={DarkGreen} />
          </TouchableOpacity>
        </View>

        {/* ── Farm cards ─────────────────────────────── */}
        {userFarms.map((farm) => (
          <FarmCard
            key={farm.id}
            farm={farm}
            onPress={() => openFarm(farm)}
            onLongPress={() => setSheetFarm(farm)}
          />
        ))}
      </ScrollView>

      {/* ── Floating pill nav bar + FAB ─────────────────── */}
      <PillNavBar navigation={navigation} onAddFarm={addFarm} />

      {/* ── Farm action sheet (Modal) ───────────────────── */}
      <Modal
        visible={!!sheetFarm}
        transparent
        animationType="slide"
        onRequestClose={closeSheet}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={closeSheet} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            {sheetFarm ? (
              <>
                <View style={styles.sheetFarmHeader}>
                  <Text style={styles.sheetFarmTitle}>{sheetFarm.name}</Text>
                  <Text style={styles.sheetFarmSubtitle}>{sheetFarm.location || 'tokyo'} • {sheetFarm.acres} acres</Text>
                </View>
                <TouchableOpacity
                  style={styles.actionItem}
                  onPress={() => {
                    const f = sheetFarm;
                    closeSheet();
                    openFarm(f);
                  }}
                >
                  <MaterialIcons name="insights" size={22} color={DarkGreen} />
                  <Text style={styles.actionText}>View Dashboard</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionItem}
                  onPress={() => {
                    const f = sheetFarm;
                    closeSheet();
                    goToEdit(f);
                  }}
                >
                  <MaterialIcons name="edit" size={22} color={DarkGreen} />
                  <Text style={styles.actionText}>Edit Farm Details</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionItem, { marginTop: 8 }]}
                  onPress={() => {
                    const f = sheetFarm;
                    closeSheet();
                    goToDelete(f);
                  }}
                >
                  <MaterialIcons name="delete" size={22} color="#D32F2F" />
                  <Text style={[styles.actionText, { color: '#D32F2F' }]}>Delete Farm</Text>
                </TouchableOpacity>
              </>
            ) : null}
          </View>
        </View>
      </Modal>

      {/* App Drawer */}
      <AppDrawer visible={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </SafeAreaView>
  );
}

// ── Farm Card ───────────────────────────────────────────────────────────────
function FarmCard({ farm, onPress, onLongPress }) {
  const cropChipText = cleanCropType(farm.cropType) || 'Wheat';

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.88}
      onPress={onPress}
      onLongPress={onLongPress}
    >
      <View style={styles.cardBody}>
        {/* Thumbnail with wheat graphic & checkmark badge */}
        <View style={styles.thumb}>
          <View style={styles.thumbGraphicWrap}>
            <Text style={styles.thumbEmoji}>🌾</Text>
          </View>
          <View style={styles.checkBadge}>
            <MaterialIcons name="check" size={13} color="#FFFFFF" />
          </View>
        </View>

        <View style={styles.cardInfo}>
          {/* Title Row with HEALTHY badge */}
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardName} numberOfLines={1}>
              {farm.name}
            </Text>
            <View style={styles.healthyBadge}>
              <MaterialIcons name="check-box" size={13} color="#FFFFFF" style={{ marginRight: 3 }} />
              <Text style={styles.healthyBadgeText}>HEALTHY</Text>
            </View>
          </View>

          {/* Location Row */}
          <View style={styles.locRow}>
            <MaterialIcons name="location-on" size={14} color="#9EADA2" />
            <Text style={styles.locText} numberOfLines={1}>
              {farm.location || 'tokyo'}
            </Text>
          </View>

          {/* Tags Row */}
          <View style={styles.chipRow}>
            <View style={styles.chip}>
              <Text style={styles.chipEmoji}>🌾</Text>
              <Text style={styles.chipText}>{cropChipText}</Text>
            </View>
            <View style={styles.chip}>
              <Text style={styles.chipEmoji}>📐</Text>
              <Text style={styles.chipText}>{Number(farm.acres) || 299} acres</Text>
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ── Floating Pill Nav Bar ───────────────────────────────────────────────────
function PillNavBar({ navigation, onAddFarm }) {
  return (
    <View style={styles.pillWrap}>
      <View style={styles.pill}>
        <TouchableOpacity style={styles.pillItem} activeOpacity={0.7} onPress={() => {}}>
          <MaterialIcons name="home" size={24} color={DarkGreen} />
          <Text style={[styles.pillLabel, { color: DarkGreen, fontWeight: '700' }]}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.pillItem}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('DiseaseDetection')}
        >
          <MaterialIcons name="local-florist" size={24} color="#8A968D" />
          <Text style={[styles.pillLabel, { color: '#8A968D' }]}>Detect</Text>
        </TouchableOpacity>

        <View style={styles.pillGap} />

        <TouchableOpacity
          style={styles.pillItem}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('KrishiMitri')}
        >
          <MaterialIcons name="chat" size={24} color="#8A968D" />
          <Text style={[styles.pillLabel, { color: '#8A968D' }]}>Chat</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.pillItem}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('Profile')}
        >
          <MaterialIcons name="person" size={24} color="#8A968D" />
          <Text style={[styles.pillLabel, { color: '#8A968D' }]}>Profile</Text>
        </TouchableOpacity>
      </View>

      {/* Center Elevated FAB */}
      <TouchableOpacity style={styles.fab} activeOpacity={0.85} onPress={onAddFarm}>
        <MaterialIcons name="add" size={30} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },

  // ── Top Bar ───────────────────────────────────────────────────────────────
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  topBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 3,
    elevation: 2,
  },
  topTitle: {
    alignItems: 'center',
  },
  topTitleText: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
    color: DarkGreen,
  },
  topSubText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#7A867B',
    marginTop: 1,
  },

  // ── Scroll Content ────────────────────────────────────────────────────────
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 130,
  },

  // ── Welcome Row ───────────────────────────────────────────────────────────
  welcomeRow: {
    marginTop: 10,
    paddingHorizontal: 18,
    marginBottom: 18,
  },
  welcomeText: {
    fontSize: 19,
  },
  welcomePrefix: {
    color: '#3A4A3E',
  },
  welcomeName: {
    fontWeight: '800',
    color: DarkGreen,
  },

  // ── Stats Row ─────────────────────────────────────────────────────────────
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    marginBottom: 24,
  },
  statPillBase: {
    flex: 1,
    height: 46,
    borderRadius: 23,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 1,
  },
  statPillEmoji: {
    fontSize: 13,
    marginRight: 5,
  },
  statPillText: {
    fontSize: 12,
    fontWeight: '700',
  },

  // ── My Farms Header ───────────────────────────────────────────────────────
  myFarmsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    marginBottom: 14,
  },
  myFarmsTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
    color: '#1A1A1A',
  },
  myFarmsSub: {
    fontSize: 12,
    color: '#7A887E',
    marginTop: 2,
  },
  arrowCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#DDE6DF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Farm Card ─────────────────────────────────────────────────────────────
  card: {
    marginHorizontal: 18,
    marginBottom: 14,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: DarkGreen,
    backgroundColor: CardBackground,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  cardBody: {
    flexDirection: 'row',
    padding: 14,
    alignItems: 'center',
  },
  thumb: {
    width: 80,
    height: 80,
    borderRadius: 18,
    backgroundColor: '#E2F3E7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbGraphicWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbEmoji: {
    fontSize: 42,
  },
  checkBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: DarkGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: {
    flex: 1,
    marginLeft: 14,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardName: {
    flex: 1,
    fontSize: 17,
    fontWeight: '800',
    color: '#1A1A1A',
    marginRight: 6,
  },
  healthyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: HealthyGreen,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  healthyBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.3,
    color: '#FFFFFF',
  },
  locRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  locText: {
    fontSize: 12,
    color: '#758578',
    marginLeft: 3,
  },
  chipRow: {
    flexDirection: 'row',
    marginTop: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2ED',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 7,
  },
  chipEmoji: {
    fontSize: 11,
    marginRight: 3,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2C3A30',
  },

  // ── Floating Pill Nav Bar ─────────────────────────────────────────────────
  pillWrap: {
    position: 'absolute',
    left: 18,
    right: 18,
    bottom: 16,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 68,
    borderRadius: 34,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 8,
  },
  pillGap: {
    width: 60,
  },
  pillItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    flex: 1,
  },
  pillLabel: {
    fontSize: 10,
    marginTop: 2,
  },
  fab: {
    position: 'absolute',
    alignSelf: 'center',
    bottom: 5,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: DarkGreen,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
    elevation: 8,
  },

  // ── Action Sheet Modal ────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.40)',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    backgroundColor: CardBackground,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.15)',
    marginBottom: 16,
  },
  sheetFarmHeader: {
    marginBottom: 14,
  },
  sheetFarmTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  sheetFarmSubtitle: {
    fontSize: 13,
    color: '#758578',
    marginTop: 2,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  actionText: {
    fontSize: 15,
    fontWeight: '600',
    color: DarkGreen,
    marginLeft: 12,
  },
});
