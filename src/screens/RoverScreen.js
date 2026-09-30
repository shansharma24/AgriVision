// ─────────────────────────────────────────────────────────────────────────────
// AgriVision — Rover screen
// Ported from RoverScreen.kt (a stub: centered top bar "Rover Control" + back
// arrow + "🚜 Rover control module coming soon..."). This port delivers the full
// Rover control module: video/camera feed placeholder, battery & connection
// status, D-pad controls (forward / left / right / stop), and a live sensor
// strip fed by api.subscribeLiveData(). No native video/camera modules — the
// feed is a placeholder.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors, radius, themed } from '../theme';
import { useApp } from '../context/AppContext';
import { AppHeader, AppCard } from '../components';
import * as api from '../services/api';
import { sensorNodes } from '../data/mockData';

// Screen-local palette (RoverScreen.kt accent + status colors)
const LIVE_RED = '#E53935';       // LIVE badge / disconnected
const FEED_LIGHT = '#E8EAE6';     // feed placeholder surface (light mode)
const FEED_DARK = '#101310';      // feed placeholder surface (dark mode)
const STATUS_GREEN = colors.success; // connected / good battery

// D-pad commands — label strings match the control pad copy.
const COMMANDS = {
  forward: { label: 'Moving Forward', icon: 'arrow-upward' },
  left: { label: 'Turning Left', icon: 'arrow-back' },
  right: { label: 'Turning Right', icon: 'arrow-forward' },
  stop: { label: 'Stopped', icon: 'stop' },
};

export default function RoverScreen() {
  const navigation = useNavigation();
  const { selectedFarm, isDark } = useApp();
  const t = themed(isDark);

  const [sensors, setSensors] = useState(sensorNodes);
  const [command, setCommand] = useState(null);
  const [battery, setBattery] = useState(82);
  const [connected, setConnected] = useState(true);

  // api.subscribeLiveData(farmId, cb) → live field values (mock polling)
  const farmId = selectedFarm?.id || 'farm_alpha01';
  useEffect(() => {
    const unsubscribe = api.subscribeLiveData(farmId, (snap) => {
      if (snap && snap.nodes) {
        setSensors(
          sensorNodes.map((n) => {
            const live = snap.nodes[n.id];
            return live ? { ...n, ...live } : n;
          })
        );
      }
    });
    return unsubscribe;
  }, [farmId]);

  // Simulate a small battery drain + recheck on each command.
  useEffect(() => {
    if (!command) return;
    const timer = setTimeout(() => setCommand(null), 1600);
    setBattery((b) => Math.max(10, b - 1));
    return () => clearTimeout(timer);
  }, [command]);

  // Live sensor strip values (first node of the selected farm's field).
  const live = useMemo(() => {
    const n = sensors[0];
    return [
      { name: 'Moisture', value: `${Math.round(n?.moisture ?? 0)}%`, icon: 'water-drop' },
      { name: 'Temp', value: `${Math.round(n?.temperature ?? 0)}°C`, icon: 'thermostat' },
      { name: 'Humidity', value: `${Math.round(n?.humidity ?? 0)}%`, icon: 'opacity' },
      { name: 'pH', value: (n?.ph ?? 0).toFixed(1), icon: 'science' },
      { name: 'EC', value: (n?.ec ?? 0).toFixed(1), icon: 'bolt' },
    ];
  }, [sensors]);

  const roverId = selectedFarm?.roverId || 'SK-ROVER-01';
  const farmName = selectedFarm?.name || 'No farm selected';
  const feedBg = isDark ? FEED_DARK : FEED_LIGHT;

  const sendCommand = (key) => {
    setConnected(true);
    setCommand(key);
  };

  // D-pad layout: Forward on top; Left / Stop / Right in the middle row.
  const pad = (
    <View style={styles.pad}>
      <ControlBtn cmd={COMMANDS.forward} isDark={isDark} onPress={() => sendCommand('forward')} />
      <View style={styles.padRow}>
        <ControlBtn cmd={COMMANDS.left} isDark={isDark} onPress={() => sendCommand('left')} />
        <ControlBtn cmd={COMMANDS.stop} isDark={isDark} stop onPress={() => sendCommand('stop')} />
        <ControlBtn cmd={COMMANDS.right} isDark={isDark} onPress={() => sendCommand('right')} />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: t.background }]} edges={['top']}>
      <AppHeader
        title="Rover Control"
        subtitle={farmName}
        onBack={() => navigation.goBack()}
        color={colors.primary}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Video / camera feed placeholder */}
        <View style={[styles.feed, { backgroundColor: feedBg, borderColor: t.border }]}>
          <View style={styles.feedLiveRow}>
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
            <Text style={styles.feedCam}>
              CAM {roverId}
            </Text>
          </View>
          <MaterialIcons name="videocam" size={72} color={isDark ? '#3A3D38' : '#B9BCB5'} />
          <Text style={[styles.feedLabel, { color: t.textMuted }]}>
            Camera feed placeholder
          </Text>
        </View>

        {/* Battery / connection status */}
        <AppCard style={styles.statusCard}>
          <View style={styles.statusRow}>
            <View style={[styles.statusItem, { borderColor: t.border }]}>
              <MaterialIcons
                name={connected ? 'bluetooth-connected' : 'bluetooth-disabled'}
                size={20}
                color={connected ? STATUS_GREEN : LIVE_RED}
              />
              <Text style={[styles.statusLabel, { color: t.textMuted }]}>Connection</Text>
              <Text style={[styles.statusValue, { color: connected ? STATUS_GREEN : LIVE_RED }]}>
                {connected ? 'Connected' : 'Disconnected'}
              </Text>
            </View>
            <View style={styles.statusDivider} />
            <View style={styles.statusItem}>
              <MaterialIcons
                name="battery-charging-full"
                size={20}
                color={battery > 20 ? colors.primary : LIVE_RED}
              />
              <Text style={[styles.statusLabel, { color: t.textMuted }]}>Battery</Text>
              <Text style={[styles.statusValue, { color: t.text }]}>{battery}%</Text>
            </View>
          </View>
        </AppCard>

        {/* Control pad */}
        <Text style={[styles.sectionTitle, { color: t.text }]}>Rover Controls</Text>
        {command && (
          <Text style={[styles.commandText, { color: colors.primary }]}>
            {COMMANDS[command].label}...
          </Text>
        )}
        {pad}

        {/* Live sensor strip */}
        <Text style={[styles.sectionTitle, { color: t.text }]}>Live Sensors</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.strip}
        >
          {live.map((s) => (
            <View key={s.name} style={[styles.sensorPill, { backgroundColor: t.card, borderColor: t.border }]}>
              <MaterialIcons name={s.icon} size={16} color={colors.primary} />
              <Text style={[styles.sensorName, { color: t.textMuted }]}>{s.name}</Text>
              <Text style={[styles.sensorValue, { color: t.text }]}>{s.value}</Text>
            </View>
          ))}
        </ScrollView>

        {/* Kotlin stub copy — kept verbatim */}
        <Text style={[styles.soon, { color: t.textMuted }]}>
          🚜 Rover control module coming soon...
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── D-pad button ─────────────────────────────────────────────────────────────
function ControlBtn({ cmd, isDark, stop, onPress }) {
  const size = 68;
  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={onPress}
      style={[
        styles.padBtn,
        {
          width: size,
          height: size,
          borderRadius: radius.lg,
          backgroundColor: stop ? LIVE_RED : (isDark ? colors.cardDark : colors.cardLight),
          borderColor: stop ? LIVE_RED : colors.primary,
        },
      ]}
    >
      <MaterialIcons name={cmd.icon} size={30} color={stop ? '#fff' : colors.primary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },

  // ── Camera feed placeholder ────────────────────────────────────────────────
  feed: {
    aspectRatio: 16 / 10,
    borderRadius: radius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 16,
  },
  feedLiveRow: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: LIVE_RED,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#fff',
    marginRight: 6,
  },
  liveText: { color: '#fff', fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  feedCam: { color: '#FFFFFF', fontSize: 11, fontWeight: '600', opacity: 0.85 },
  feedLabel: { marginTop: 8, fontSize: 12, fontWeight: '500' },

  // ── Status card ────────────────────────────────────────────────────────────
  statusCard: { flexDirection: 'row', marginBottom: 20 },
  statusRow: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  statusItem: { flex: 1, alignItems: 'center' },
  statusDivider: { width: 1, alignSelf: 'stretch', backgroundColor: '#E0E0E0', marginVertical: 2 },
  statusLabel: { fontSize: 11, marginTop: 4 },
  statusValue: { fontSize: 14, fontWeight: '700', marginTop: 2 },

  // ── Control pad ────────────────────────────────────────────────────────────
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  commandText: { fontSize: 14, fontWeight: '600', marginBottom: 12, textAlign: 'center' },
  pad: { alignItems: 'center', marginBottom: 24 },
  padRow: { flexDirection: 'row', marginTop: 12 },
  padBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    marginHorizontal: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },

  // ── Sensor strip ───────────────────────────────────────────────────────────
  strip: { paddingBottom: 4 },
  sensorPill: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 18,
    marginRight: 10,
    minWidth: 86,
  },
  sensorName: { fontSize: 11, marginTop: 6 },
  sensorValue: { fontSize: 16, fontWeight: '700', marginTop: 2 },

  soon: { textAlign: 'center', fontSize: 12, fontWeight: '600', marginTop: 24 },
});
