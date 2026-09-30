// ─────────────────────────────────────────────────────────────────────────────
// AgriVision — Farm Nodes screen
// Ported from the dashboard "Soil Nodes" section (DashboardScreen.kt
// NodeSensorCardWithCircles / SingleSensorCircle). No dedicated Kotlin screen —
// FarmNodes routes to the dashboard nodes. Header with farm name, live sensor
// node cards for each node in sensorNodes, plus a "moisture low" alert.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { colors, themed } from '../theme';
import { useApp } from '../context/AppContext';
import { AppHeader, EmptyState } from '../components';
import * as api from '../services/api';
import { sensorNodes } from '../data/mockData';

// Screen-local palette (DashboardScreen.kt theme colors)
const PRIMARY_GREEN = colors.primary;   // 0xFF2E7D32
const STATUS_RED = '#E53935';           // soilStatusColor moisture < 30
const STATUS_AMBER = '#FFA000';         // soilStatusColor moisture < 50
const ALERT_BG = '#FFF3E0';             // AI Alert card container
const ALERT_ICON = '#FF9800';           // AI Alert Warning tint
const ALERT_TITLE = '#0A0F0B';          // AI Alert title color
const ALERT_BODY = '#424242';           // AI Alert body color

// ── Color helpers ────────────────────────────────────────────────────────────
function withAlpha(hex, alpha) {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// soilStatusColor(name, value) — DashboardScreen.kt
function statusColor(name, value) {
  switch (name) {
    case 'Moisture':
    case 'Humidity':
      if (value < 30) return STATUS_RED;
      if (value < 50) return STATUS_AMBER;
      return PRIMARY_GREEN;
    case 'pH':
      if (value < 5.5 || value > 8) return STATUS_RED;
      if (value < 6 || value > 7.5) return STATUS_AMBER;
      return PRIMARY_GREEN;
    case 'EC':
      if (value > 4) return STATUS_RED;
      if (value > 2) return STATUS_AMBER;
      return PRIMARY_GREEN;
    case 'Nitrogen':
    case 'Phosphorus':
    case 'Potassium':
      return STATUS_AMBER;
    case 'Soil Temp':
      if (value < 10 || value > 35) return STATUS_RED;
      if (value < 15 || value > 30) return STATUS_AMBER;
      return PRIMARY_GREEN;
    default:
      return PRIMARY_GREEN;
  }
}

// SingleSensorCircle progress — DashboardScreen.kt
function progressFor(name, value) {
  switch (name) {
    case 'Moisture':
    case 'Humidity':
      return value / 100;
    case 'pH':
      return value / 14;
    case 'EC':
      return value / 5;
    case 'Soil Temp':
      return value / 40;
    default:
      return value / 100;
  }
}

// SensorNode.toSoilNodeUi() — DashboardScreen.kt (+ humidity per sensor model)
function nodeParams(node, tr) {
  const list = [];
  if (node.moisture != null) {
    list.push({ name: tr ? tr('moisture') : 'Moisture', rawName: 'Moisture', value: node.moisture, display: `${Math.round(node.moisture)}%` });
  }
  if (node.temperature != null) {
    list.push({ name: tr ? tr('soil_temp') : 'Soil Temp', rawName: 'Soil Temp', value: node.temperature, display: `${Math.round(node.temperature)}°C` });
  }
  if (node.humidity != null) {
    list.push({ name: tr ? tr('humidity') : 'Humidity', rawName: 'Humidity', value: node.humidity, display: `${Math.round(node.humidity)}%` });
  }
  if (node.n != null) {
    list.push({ name: tr ? tr('nitrogen') : 'Nitrogen', rawName: 'Nitrogen', value: node.n, display: `${Math.round(node.n)} mg/kg` });
  }
  if (node.p != null) {
    list.push({ name: tr ? tr('phosphorus') : 'Phosphorus', rawName: 'Phosphorus', value: node.p, display: `${Math.round(node.p)} mg/kg` });
  }
  if (node.k != null) {
    list.push({ name: tr ? tr('potassium') : 'Potassium', rawName: 'Potassium', value: node.k, display: `${Math.round(node.k)} mg/kg` });
  }
  if (node.ph != null) {
    list.push({ name: tr ? tr('ph') : 'pH', rawName: 'pH', value: node.ph, display: node.ph.toFixed(1) });
  }
  if (node.ec != null) {
    list.push({ name: tr ? tr('ec') : 'EC', rawName: 'EC', value: node.ec, display: node.ec.toFixed(1) });
  }
  return list;
}

// ── Circular progress ring (View-only, no SVG) ───────────────────────────────
// Two clipped half-ring pieces sweep clockwise from 12 o'clock:
//   right piece: rotation -180° → 0° as p goes 0 → 0.5
//   left  piece: rotation -180° → 0° as p goes 0.5 → 1
function SensorRing({ progress, color, size = 78, stroke = 11, children }) {
  const p = Math.max(0, Math.min(1, progress));
  const R = size / 2;
  const rotR = -180 + 360 * Math.min(p, 0.5);
  const rotL = Math.min(0, -180 + 360 * (p - 0.5));

  return (
    <View style={{ width: size, height: size }}>
      {/* track ring */}
      <View
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: size,
          height: size,
          borderRadius: R,
          borderWidth: stroke,
          borderColor: withAlpha(color, 0.18),
        }}
      />
      {/* right half progress arc */}
      <View
        style={{
          position: 'absolute',
          left: R,
          top: 0,
          width: R,
          height: size,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            position: 'absolute',
            left: -R,
            top: 0,
            width: size,
            height: size,
            transform: [{ rotate: `${rotR}deg` }],
          }}
        >
          <View
            style={{
              position: 'absolute',
              left: R,
              top: 0,
              width: R,
              height: size,
              borderWidth: stroke,
              borderColor: color,
              borderLeftColor: 'transparent',
              borderTopColor: 'transparent',
              borderBottomColor: 'transparent',
              borderTopRightRadius: R,
              borderBottomRightRadius: R,
            }}
          />
        </View>
      </View>
      {/* left half progress arc */}
      <View
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: R,
          height: size,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: size,
            height: size,
            transform: [{ rotate: `${rotL}deg` }],
          }}
        >
          <View
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: R,
              height: size,
              borderWidth: stroke,
              borderColor: color,
              borderRightColor: 'transparent',
              borderTopColor: 'transparent',
              borderBottomColor: 'transparent',
              borderTopLeftRadius: R,
              borderBottomLeftRadius: R,
            }}
          />
        </View>
      </View>
      {/* center value */}
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {children}
      </View>
    </View>
  );
}

// ── Single sensor circle (DashboardScreen.kt SingleSensorCircle) ────────────
function SensorCircle({ param }) {
  const color = statusColor(param.rawName || param.name, param.value);
  const progress = progressFor(param.rawName || param.name, param.value);
  return (
    <View style={styles.circleCol}>
      <SensorRing progress={progress} color={color}>
        <Text style={[styles.circleValue, { color }]}>{param.display}</Text>
      </SensorRing>
      <Text style={styles.circleLabel}>{param.name}</Text>
    </View>
  );
}

// ── Node sensor card (DashboardScreen.kt NodeSensorCardWithCircles) ─────────
function NodeSensorCard({ title, params, isSyncing, onSync, isDark, t }) {
  const themeColors = themed(isDark);
  const rows = useMemo(() => {
    const out = [];
    for (let i = 0; i < params.length; i += 2) out.push(params.slice(i, i + 2));
    return out;
  }, [params]);

  return (
    <View style={[styles.nodeCard, { backgroundColor: themeColors.card }]}>
      <View style={styles.nodeHeader}>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
          <Text style={[styles.nodeTitle, { color: themeColors.text }]}>{title}</Text>
          <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: PRIMARY_GREEN, marginLeft: 8 }} />
        </View>
        <View style={styles.syncRow}>
          {isSyncing ? (
            <>
              <ActivityIndicator size="small" color={PRIMARY_GREEN} />
              <Text style={[styles.syncingText, { color: themeColors.textMuted }]}>
                {t ? t('syncing') : 'Syncing...'}
              </Text>
            </>
          ) : (
            <TouchableOpacity
              style={styles.syncBtn}
              activeOpacity={0.7}
              onPress={onSync}
              hitSlop={8}
            >
              <Text style={styles.syncText}>{t ? t('sync') : 'Sync'}</Text>
              <MaterialIcons name="sync" size={20} color={PRIMARY_GREEN} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {params.length === 0 ? (
        <Text style={[styles.noData, { color: themeColors.textMuted }]}>
          No sensor values available for this node.
        </Text>
      ) : (
        rows.map((row, ri) => (
          <View key={ri} style={styles.paramRow}>
            {row.map((param) => (
              <SensorCircle key={param.rawName || param.name} param={param} />
            ))}
          </View>
        ))
      )}
    </View>
  );
}

export default function FarmNodesScreen() {
  const navigation = useNavigation();
  const { params } = useRoute();
  const { farmId } = params || {};
  const { farms, isDark, t } = useApp();
  const farm = farms.find((f) => f.id === farmId);

  const [nodes, setNodes] = useState(sensorNodes);
  const [syncingId, setSyncingId] = useState(null);

  // api.subscribeLiveData(farmId, cb) → live values (mock polling for now)
  useEffect(() => {
    const unsubscribe = api.subscribeLiveData(farmId, (snap) => {
      if (snap && snap.nodes) {
        setNodes(
          sensorNodes.map((n) => {
            const live = snap.nodes[n.id];
            return live ? { ...n, ...live } : n;
          })
        );
      }
    });
    return unsubscribe;
  }, [farmId]);

  const handleSync = (nodeId) => {
    if (syncingId === nodeId) return;
    setSyncingId(nodeId);
    setTimeout(() => setSyncingId(null), 700);
  };

  const moistureValues = nodes.map((n) => n.moisture).filter((v) => v != null);
  const avgMoisture = moistureValues.length
    ? moistureValues.reduce((a, b) => a + b, 0) / moistureValues.length
    : null;
  const anyLowMoisture = moistureValues.some((v) => v < 30);
  const alertMessage =
    avgMoisture != null && avgMoisture < 25
      ? 'Soil moisture is very low. Plan irrigation within next 12–24 hours with light to moderate watering.'
      : 'Soil moisture is low. Plan irrigation within next 12–24 hours with light to moderate watering.';

  if (!farm) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: themed(isDark).background }]} edges={['top']}>
        <AppHeader
          title={t ? t('farm_nodes') : 'Farm Nodes'}
          onBack={() => navigation.goBack()}
          color={colors.primary}
        />
        <EmptyState
          icon="sensors"
          title="Farm not found"
          subtitle="This farm may have been deleted. Go back and pick another one."
        />
      </SafeAreaView>
    );
  }

  const themeColors = themed(isDark);

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: themeColors.background }]} edges={['top']}>
      <AppHeader
        title={farm.name}
        subtitle={t ? t('farm_nodes') : 'Farm Nodes'}
        onBack={() => navigation.goBack()}
        color={colors.primary}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Moisture-low alert (AI Alert style) */}
        {anyLowMoisture && (
          <View style={styles.alertCard}>
            <MaterialIcons name="warning" size={28} color={ALERT_ICON} />
            <View style={styles.alertBody}>
              <Text style={styles.alertTitle}>{t ? t('field_alerts') : 'Moisture Alert'}</Text>
              <Text style={styles.alertText}>{alertMessage}</Text>
            </View>
          </View>
        )}

        <Text style={[styles.sectionTitle, { color: themeColors.text }]}>{t ? t('soil_nodes') : 'Soil Nodes'}</Text>

        {nodes.map((node) => {
          const nodeTitle =
            node.id === 'zone_1'
              ? (t ? t('zone_1') : 'Zone 1')
              : node.id === 'zone_2'
                ? (t ? t('zone_2') : 'Zone 2')
                : (node.name || `Node ${node.id}`);

          return (
            <NodeSensorCard
              key={node.id}
              title={nodeTitle}
              params={nodeParams(node, t)}
              isSyncing={syncingId === node.id}
              onSync={() => handleSync(node.id)}
              isDark={isDark}
              t={t}
            />
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },

  alertCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: ALERT_BG,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  alertBody: { marginLeft: 14, flex: 1 },
  alertTitle: { fontSize: 15, fontWeight: '700', color: ALERT_TITLE },
  alertText: { fontSize: 13, color: ALERT_BODY, lineHeight: 18, marginTop: 4 },

  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 10 },

  nodeCard: {
    borderRadius: 20,
    padding: 14,
    marginBottom: 16,
    minHeight: 220,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  nodeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  nodeTitle: { fontSize: 16, fontWeight: '700' },
  nodeSubtitle: { fontSize: 11, marginTop: 2 },
  syncRow: { flexDirection: 'row', alignItems: 'center' },
  syncBtn: { flexDirection: 'row', alignItems: 'center', padding: 4 },
  syncText: { fontSize: 12, color: PRIMARY_GREEN, marginRight: 2 },
  syncingText: { fontSize: 11, marginLeft: 6 },
  noData: { textAlign: 'center', fontSize: 12, paddingVertical: 24 },

  paramRow: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    marginTop: 12,
  },
  circleCol: { alignItems: 'center' },
  circleValue: { fontSize: 13, fontWeight: '700' },
  circleLabel: { fontSize: 10, color: '#757575', marginTop: 6 },
});
