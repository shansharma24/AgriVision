// Ported from AgriVision — presentation/profile/ProfileScreen.kt
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { useApp } from '../context/AppContext';
import { AppHeader } from '../components';

// Screen palette (ProfileScreen.kt)
const PRIMARY_GREEN = '#2E7D32'; // PrimaryGreen
const ACCENT_GREEN_SOFT = '#C8E6C9'; // TopAppBar light container
const ERROR_RED = '#D32F2F'; // Logout button
const AVATAR_BG = 'rgba(46, 125, 50, 0.3)'; // PrimaryGreen.copy(alpha = 0.3f)

const BG_DARK = '#07150F';
const BG_LIGHT = '#F4FFF7';
const CARD_DARK = '#10271A';
const TEXT_PRIMARY_DARK = '#E8F5E9';
const TEXT_PRIMARY_LIGHT = '#09150C';
const TEXT_SECONDARY_DARK = '#B5CBB8';
const TEXT_SECONDARY_LIGHT = '#5F6C63';

export default function ProfileScreen() {
  const navigation = useNavigation();
  const { isDark, user, logout } = useApp();

  const background = isDark ? BG_DARK : BG_LIGHT;
  const cardColor = isDark ? CARD_DARK : '#FFFFFF';
  const textPrimary = isDark ? TEXT_PRIMARY_DARK : TEXT_PRIMARY_LIGHT;
  const textSecondary = isDark ? TEXT_SECONDARY_DARK : TEXT_SECONDARY_LIGHT;

  // 👉 User details (mirrors Firebase auth currentUser)
  const userName = user?.name || 'Farmer User';
  const userPhone = user?.phone || 'Unknown';
  const userDistrict = user?.district || 'Your district';

  const handleLogout = () => {
    logout();
    navigation.replace('Onboarding');
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: background }]} edges={['top']}>
      <AppHeader
        title="Profile"
        onBack={() => navigation.goBack()}
        color={isDark ? CARD_DARK : ACCENT_GREEN_SOFT}
        textColor={textPrimary}
      />

      <View style={[styles.body, { backgroundColor: background }]}>
        {/* ==================== USER INFO ==================== */}
        <View>
          {/* Avatar + Name + Details */}
          <View style={styles.userRow}>
            <View style={styles.avatar}>
              <MaterialIcons name="person" size={40} color="#FFFFFF" />
            </View>
            <View style={styles.userDetails}>
              <Text style={[styles.userName, { color: textPrimary }]}>{userName}</Text>
              <Text style={[styles.userMeta, { color: textSecondary }]}>Phone: {userPhone}</Text>
              <Text style={[styles.userMeta, { color: textSecondary }]}>District: {userDistrict}</Text>
            </View>
          </View>

          {/* Account Section */}
          <View style={[styles.card, { backgroundColor: cardColor }]}>
            <Text style={[styles.cardTitle, { color: textPrimary }]}>Account</Text>
            <Text style={[styles.cardText, { color: textSecondary }]}>
              Linked farms: 1 (default)
            </Text>
            <Text style={[styles.cardText, { color: textSecondary }]}>
              Login method: Phone / Google
            </Text>
          </View>

          {/* Settings Section */}
          <View style={[styles.card, { backgroundColor: cardColor }]}>
            <View style={styles.settingsRow}>
              <MaterialIcons name="settings" size={24} color={PRIMARY_GREEN} />
              <View style={styles.settingsText}>
                <Text style={[styles.cardTitle, { color: textPrimary }]}>App Settings</Text>
                <Text style={[styles.settingsSubtitle, { color: textSecondary }]}>
                  Language &amp; theme are managed from Dashboard.
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* ==================== LOGOUT BUTTON ==================== */}
        <View>
          <View style={[styles.divider, { backgroundColor: textSecondary, opacity: 0.3 }]} />
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleLogout}
            style={styles.logoutBtn}
          >
            <MaterialIcons name="logout" size={20} color="#FFFFFF" />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
  },
  userRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: AVATAR_BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userDetails: { flex: 1, marginLeft: 16 },
  userName: { fontSize: 20, fontWeight: '700' },
  userMeta: { fontSize: 13, marginTop: 2 },
  card: {
    borderRadius: 18,
    padding: 14,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardTitle: { fontSize: 16, fontWeight: '600' },
  cardText: { fontSize: 13, marginTop: 6 },
  settingsRow: { flexDirection: 'row', alignItems: 'center' },
  settingsText: { flex: 1, marginLeft: 8 },
  settingsSubtitle: { fontSize: 12, marginTop: 2 },
  divider: { height: 1 },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderRadius: 14,
    backgroundColor: ERROR_RED,
    marginTop: 12,
  },
  logoutText: { color: '#FFFFFF', fontWeight: '600', marginLeft: 8 },
});
