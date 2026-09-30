// ─────────────────────────────────────────────────────────────────────────────
// AgriVision — Logs & History screen
// Ported from LogsScreen.kt + LogsViewModel.kt (presentation/logs).
// "Activity Log" top bar, date grouping (TODAY / YESTERDAY / "MMMM d, yyyy"),
// activity log cards with per-type icons and ON/OFF/ALERT status badges.
// Falls back to the bundled demo logs when api.getLogs() returns nothing.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';

import { colors, themed } from '../theme';
import { useApp } from '../context/AppContext';
import { AppDrawer, Chip, EmptyState } from '../components';
import * as api from '../services/api';

// Screen-local palette — LogsScreen.kt
const GREEN = '#1A7430';        // pump ON / healthy
const RED = '#C62828';          // alerts
const ORANGE = '#F57C00';       // pump OFF / neutral
const TEXT_PRIMARY = '#111827'; // card title
const TEXT_SECONDARY = '#6B7280'; // description / time / date header

// Type → icon mapping — ActivityLogCard (LogsScreen.kt)
const TYPE_ICONS = {
  irrigation: 'power-settings-new', // Icons.Default.PowerSettingsNew
  tds: 'science',                   // Icons.Default.Science
  moisture: 'grass',                // Icons.Default.Grass
  weather: 'cloud',                 // Icons.Default.Cloud
};

// Filter options — LogEntry.kt types + demo data
const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'irrigation', label: 'Irrigation' },
  { key: 'tds', label: 'TDS' },
  { key: 'alert', label: 'Alerts' },
  { key: 'moisture', label: 'Moisture' },
  { key: 'weather', label: 'Weather' },
];

// hh:mm a — LogsViewModel DateTimeFormatter.ofPattern("hh:mm a")
function formatAmPm(d) {
  let h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  return `${String(h).padStart(2, '0')}:${m} ${ampm}`;
}

// LogEntry normalization — LogEntry.kt (id, title, description, type,
// time, pumpStatus, isAlert, timestamp)
function normalizeLog(raw) {
  const ts = raw.timestamp ? new Date(raw.timestamp) : new Date();
  return {
    id: raw.id || `log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    title: raw.title || '',
    description: raw.description || '',
    type: raw.type || 'alert',
    time: raw.time || formatAmPm(ts),
    pumpStatus: raw.pumpStatus == null ? 0 : raw.pumpStatus,
    isAlert: !!raw.isAlert,
    timestamp: ts,
  };
}

// ── Bundled sample logs — LogsViewModel.kt demoLogs() kept verbatim,
// plus additional firebase-style entries so filters stay populated. ──────────
function sampleLogs() {
  const now = new Date();
  const hAgo = (h) => new Date(now.getTime() - h * 3600 * 1000);
  const dAgo = (d) => new Date(now.getTime() - d * 86400 * 1000);
  const dAgoAt = (d, h, m) => {
    const x = dAgo(d);
    x.setHours(h, m, 0, 0);
    return x;
  };
  const entry = (id, title, description, type, ts, pumpStatus, isAlert) => ({
    id,
    title,
    description,
    type,
    time: formatAmPm(ts),
    pumpStatus,
    isAlert,
    timestamp: ts,
  });

  return [
    // demoLogs() — LogsViewModel.kt
    entry('demo1', 'Pump Turned ON', 'Manual irrigation started.', 'irrigation', hAgo(2), 1, false),
    entry('demo2', 'High TDS Alert', 'TDS reached 610 ppm.', 'tds', hAgo(1), 0, true),
    entry('demo3', 'Low Tank Level', 'Tank dropped below 20%.', 'alert', dAgo(1), 0, true),
    // Additional bundled entries (firebase-style + extra types)
    entry('demo4', 'Pump Turned OFF', 'Real-time update from IoT system.', 'irrigation', hAgo(3), 0, false),
    entry('demo5', 'High TDS Alert', 'TDS reached 610 ppm.', 'tds', dAgoAt(2, 10, 24), 0, true),
    entry('demo8', 'Low Tank Level', 'Tank level at 18%. Refill needed.', 'alert', dAgoAt(2, 18, 5), 0, true),
    entry('demo6', 'Soil Moisture Drop', 'Zone 1 moisture fell to 24%.', 'moisture', dAgoAt(3, 9, 12), 0, true),
    entry('demo7', 'Weather Update', 'Clear skies expected. High 33°C.', 'weather', dAgoAt(4, 14, 45), 0, false),
  ];
}

// groupLogsByDate — LogsScreen.kt: TODAY / YESTERDAY / "MMMM d, yyyy"
function groupLogsByDate(logs) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const startOf = (d) => {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  };
  const sameDay = (a, b) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  const groups = [];
  const index = {};
  logs.forEach((log) => {
    const d = startOf(log.timestamp);
    let label;
    if (sameDay(d, today)) label = 'TODAY';
    else if (sameDay(d, yesterday)) label = 'YESTERDAY';
    else label = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    if (!(label in index)) {
      index[label] = [];
      groups.push({ label, entries: index[label] });
    }
    index[label].push(log);
  });
  return groups;
}

// ── Activity log card — ActivityLogCard (LogsScreen.kt) ─────────────────────
function ActivityLogCard({ log, isDark }) {
  const t = themed(isDark);

  const icon = TYPE_ICONS[log.type] || 'warning';
  const tint = log.isAlert ? RED : log.type === 'irrigation' && log.pumpStatus === 1 ? GREEN : ORANGE;

  let badge = null;
  if (log.isAlert) {
    badge = { text: 'ALERT', color: RED };
  } else if (log.type === 'irrigation') {
    badge = {
      text: log.pumpStatus === 1 ? 'ON' : 'OFF',
      color: log.pumpStatus === 1 ? GREEN : ORANGE,
    };
  }

  return (
    <View style={[styles.card, { backgroundColor: t.card }]}>
      <View style={styles.cardRow}>
        <MaterialIcons name={icon} size={28} color={tint} />
        <View style={styles.cardBody}>
          <Text style={[styles.cardTitle, { color: t.text }]}>{log.title}</Text>
          <Text style={[styles.cardDesc, { color: t.textMuted }]}>{log.description}</Text>
          <Text style={[styles.cardTime, { color: t.textMuted }]}>{log.time}</Text>
        </View>
        {badge && (
          <Text style={[styles.badge, { color: badge.color }]}>{badge.text}</Text>
        )}
      </View>
    </View>
  );
}

export default function LogsScreen() {
  const navigation = useNavigation();
  const { params } = useRoute();
  const { farmId: routeFarmId } = params || {};
  const { selectedFarm, farms, isDark, t: tr } = useApp();
  const farmId =
    routeFarmId || (selectedFarm && selectedFarm.id) || (farms[0] && farms[0].id) || 'farm_alpha01';

  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [drawerOpen, setDrawerOpen] = useState(false);

  // LogsViewModel.loadLogs() — call api.getLogs(farmId), fall back to
  // bundled sample logs when empty, then merge + sort desc by timestamp.
  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    (async () => {
      let data;
      try {
        const remote = await api.getLogs(farmId);
        data = remote && remote.length ? remote : sampleLogs();
      } catch (e) {
        data = sampleLogs();
      }
      if (mounted) {
        setLogs(
          data
            .map(normalizeLog)
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        );
        setIsLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [farmId]);

  const themeColors = themed(isDark);

  const visible = logs.filter((log) => {
    if (filter === 'all') return true;
    if (filter === 'alert') return log.isAlert;
    return log.type === filter;
  });
  const groups = groupLogsByDate(visible);

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: themeColors.background }]} edges={['top']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={themeColors.background} />

      {/* Top app bar — LogsScreen.kt TopAppBar ("Activity Log") */}
      <View style={[styles.topBar, { backgroundColor: themeColors.background }]}>
        <TouchableOpacity onPress={() => setDrawerOpen(true)} hitSlop={8}>
          <MaterialIcons name="menu" size={26} color={themeColors.text} />
        </TouchableOpacity>
        <Text style={[styles.topBarTitle, { color: themeColors.text }]}>{tr ? tr('logs_history') : 'Activity Log'}</Text>
        <View style={{ width: 26 }} />
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={GREEN} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Filter chips by log type */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            {FILTERS.map((f) => (
              <Chip
                key={f.key}
                label={f.label}
                active={filter === f.key}
                color={colors.primary}
                onPress={() => setFilter(f.key)}
                style={styles.filterChip}
              />
            ))}
          </ScrollView>

          {groups.length === 0 ? (
            <EmptyState
              icon="history"
              title="No logs found"
              subtitle="No activity for this filter yet. New entries will show up here."
            />
          ) : (
            groups.map((group) => (
              <View key={group.label} style={styles.group}>
                <Text style={[styles.dateLabel, { color: t.textMuted }]}>{group.label}</Text>
                {group.entries.map((log) => (
                  <ActivityLogCard key={log.id} log={log} isDark={isDark} />
                ))}
              </View>
            ))
          )}

          {/* trailing spacer — LazyColumn Spacer(60.dp) */}
          <View style={{ height: 60 }} />
        </ScrollView>
      )}

      <AppDrawer visible={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 56,
  },
  topBarTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    marginLeft: 12,
  },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  content: {
    padding: 16,
    paddingBottom: 16,
  },

  filterRow: {
    paddingBottom: 4,
    marginBottom: 16,
  },
  filterChip: {
    marginRight: 8,
  },

  group: {
    marginBottom: 16,
  },
  dateLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 16,
  },

  card: {
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  cardBody: {
    flex: 1,
    marginLeft: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  cardDesc: {
    fontSize: 14,
    marginTop: 4,
  },
  cardTime: {
    fontSize: 12,
    marginTop: 4,
  },
  badge: {
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 8,
  },
});
