// ─────────────────────────────────────────────────────────────────────────────
// AgriVision — Farm Map screen
// Ported from presentation/farmap/FarmMapScreen.kt
// (green top bar, stylized map placeholder with a farm marker, bottom farm info
//  card with Lat/Lon chips — Google Maps replaced by farm_placeholder2.png)
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ImageBackground, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { colors } from '../theme';
import { useApp } from '../context/AppContext';
import { AppHeader, EmptyState } from '../components';

// Screen-local palette (FarmMapScreen.kt)
const primaryGreen = colors.primary;   // 0xFF2E7D32
const chipBg = '#E8F5E9';              // InfoChip Surface color
const gray = colors.textSecondary;     // Color.Gray

// ── Info chip (FarmMapScreen.kt private InfoChip) ───────────────────────────
function InfoChip({ label }) {
  return (
    <View style={styles.chip}>
      <MaterialIcons name="location-on" size={14} color={primaryGreen} />
      <Text style={styles.chipLabel}>{label}</Text>
    </View>
  );
}

export default function FarmMapScreen() {
  const navigation = useNavigation();
  const { params } = useRoute();
  const { farmId } = params || {};
  const { farms } = useApp();

  const farm = farms.find((f) => f.id === farmId);

  const [zoom, setZoom] = useState(1);

  if (!farm) {
    return (
      <SafeAreaView style={styles.root} edges={['top']}>
        <AppHeader
          title="Farm Map"
          onBack={() => navigation.goBack()}
          color={colors.primary}
        />
        <EmptyState
          icon="map"
          title="Farm not found"
          subtitle="This farm may have been deleted. Go back and pick another one."
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <AppHeader
        title={farm.name}
        subtitle="Farm Location"
        onBack={() => navigation.goBack()}
        color={colors.primary}
      />

      <View style={styles.container}>
        {/* ---------- STYLIZED MAP PLACEHOLDER ---------- */}
        <ImageBackground
          source={require('../../assets/app/farm_placeholder2.png')}
          style={styles.map}
          imageStyle={{ transform: [{ scale: zoom }] }}
          resizeMode="cover"
        >
          {/* Farm marker (Google Maps Marker for farmLocation) */}
          <View style={styles.markerWrap} pointerEvents="none">
            <View style={styles.markerLabel}>
              <Text style={styles.markerTitle}>{farm.name}</Text>
              <Text style={styles.markerSnippet}>
                {farm.acres} acres • {farm.cropType}
              </Text>
            </View>
            <MaterialIcons name="location-pin" size={44} color={primaryGreen} />
          </View>

          {/* Zoom controls (GoogleMap uiSettings.zoomControlsEnabled) */}
          <View style={styles.zoomControls}>
            <TouchableOpacity
              style={styles.zoomBtn}
              activeOpacity={0.7}
              onPress={() => setZoom((z) => Math.min(3, z + 0.4))}
            >
              <Text style={styles.zoomText}>+</Text>
            </TouchableOpacity>
            <View style={styles.zoomDivider} />
            <TouchableOpacity
              style={styles.zoomBtn}
              activeOpacity={0.7}
              onPress={() => setZoom((z) => Math.max(1, z - 0.4))}
            >
              <Text style={styles.zoomText}>−</Text>
            </TouchableOpacity>
          </View>
        </ImageBackground>

        {/* ---------- FARM INFO CARD ---------- */}
        <View style={styles.card}>
          <View style={styles.cardRow}>
            <MaterialIcons name="agriculture" size={24} color={primaryGreen} />
            <View style={styles.cardTextWrap}>
              <Text style={styles.cardTitle}>{farm.name}</Text>
              <Text style={styles.cardSubtitle}>
                {farm.acres} acres • {farm.cropType}
              </Text>
            </View>
          </View>

          <View style={styles.chipRow}>
            <InfoChip label={`Lat: ${farm.lat.toFixed(6)}`} />
            <InfoChip label={`Lon: ${farm.lon.toFixed(6)}`} />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.backgroundLight },
  container: { flex: 1 },
  map: { flex: 1, backgroundColor: '#E8F5E9' },

  markerWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '50%',
    marginTop: -64,
    alignItems: 'center',
  },
  markerLabel: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: 'center',
    marginBottom: 2,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  markerTitle: { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
  markerSnippet: { fontSize: 11, color: gray, marginTop: 1 },

  zoomControls: {
    position: 'absolute',
    right: 12,
    top: 12,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  zoomBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  zoomText: { fontSize: 22, fontWeight: '600', color: '#333333' },
  zoomDivider: { height: StyleSheet.hairlineWidth, backgroundColor: '#CCCCCC' },

  card: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 8,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center' },
  cardTextWrap: { marginLeft: 12 },
  cardTitle: { fontSize: 18, fontWeight: '700', color: primaryGreen },
  cardSubtitle: { fontSize: 14, color: gray, marginTop: 2 },

  chipRow: { flexDirection: 'row', marginTop: 12, gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: chipBg,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipLabel: { fontSize: 12, fontWeight: '500', color: primaryGreen, marginLeft: 4 },
});
