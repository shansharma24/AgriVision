import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { colors, typography, spacing, radius, themed } from '../theme';
import { useApp } from '../context/AppContext';
import { AppHeader, AppCard, SectionHeader } from '../components';
import * as api from '../services/api';
import { liveSnapshot } from '../data/mockData';

// Voice command phrases for quick suggestions
const VOICE_COMMANDS = [
  { phrase: 'Soil status Zone 1 & Zone 2', hi: 'Zone 1 और Zone 2 की मिट्टी की स्थिति' },
  { phrase: 'Should I turn water pump on?', hi: 'क्या मुझे पानी का पंप चालू करना चाहिए?' },
  { phrase: 'Current mandi market prices', hi: 'आज के ताजा मंडी भाव' },
  { phrase: 'Crop disease prevention advice', hi: 'फसल रोग रोकथाम सलाह' },
  { phrase: 'Best fertilizer for wheat', hi: 'गेहूं के लिए सर्वोत्तम खाद' },
  { phrase: 'Weather forecast and rain chance', hi: 'मौसम पूर्वानुमान और बारिश की संभावना' },
];

export default function AssistantScreen() {
  const navigation = useNavigation();
  const { isDark, languageCode, t, selectedFarm, farms } = useApp();
  const theme = themed(isDark);
  const currentFarm = selectedFarm || (farms && farms[0]);

  const [listening, setListening] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const cycleRef = useRef(0);
  const pulse = useRef(new Animated.Value(0)).current;

  // Pulsing ring while "listening".
  useEffect(() => {
    if (listening) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 0, duration: 800, useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    }
    pulse.setValue(0);
  }, [listening, pulse]);

  const askChatGPT = async (phrase) => {
    setLoading(true);
    setResult({ phrase, response: 'Thinking...' });

    try {
      const res = await api.chatCompletion(
        [{ role: 'user', content: phrase }],
        {
          language: languageCode,
          farmContext: {
            name: currentFarm?.name || 'Alpha Farm',
            cropType: currentFarm?.cropType || 'Wheat',
            location: currentFarm?.location || 'India',
            nodes: liveSnapshot.nodes,
          },
        }
      );
      setResult({ phrase, response: res.content });
    } catch (e) {
      setResult({
        phrase,
        response: `Sorry, error connecting to KrishiMitri: ${e.message}`,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMicPress = () => {
    if (listening || loading) return;
    setListening(true);
    setResult(null);

    setTimeout(() => {
      const item = VOICE_COMMANDS[cycleRef.current % VOICE_COMMANDS.length];
      cycleRef.current += 1;
      setListening(false);
      const query = languageCode === 'hi' ? item.hi : item.phrase;
      askChatGPT(query);
    }, 1200);
  };

  const ringScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.7] });
  const ringOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] });

  return (
    <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: colors.primary }]}>
      <AppHeader
        title={t('assistant')}
        onMenu={() => navigation.goBack()}
        color={colors.primary}
        textColor="#FFFFFF"
      />
      <ScrollView
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Status banner */}
        <View style={styles.chatGptBadgeRow}>
          <View style={styles.liveGreenDot} />
          <Text style={styles.chatGptBadgeText}>{t('ai_powered_chatgpt')}</Text>
        </View>

        {/* Mic hero */}
        <View style={styles.micZone}>
          <View style={styles.micWrap}>
            {listening && (
              <Animated.View
                style={[
                  styles.pulseRing,
                  {
                    borderColor: theme.primary,
                    opacity: ringOpacity,
                    transform: [{ scale: ringScale }],
                  },
                ]}
              />
            )}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleMicPress}
              disabled={loading}
              style={[
                styles.micButton,
                { backgroundColor: listening ? colors.error : theme.primary },
              ]}
            >
              <MaterialIcons
                name={listening ? 'graphic-eq' : 'mic'}
                size={40}
                color="#FFFFFF"
              />
            </TouchableOpacity>
          </View>

          <Text style={[styles.statusText, { color: listening ? colors.error : theme.text }]}>
            {listening ? t('listening') : t('speak_query')}
          </Text>
          <Text style={[styles.statusHint, { color: theme.textMuted }]}>
            {listening
              ? 'KrishiMitri is listening...'
              : 'Tap mic or choose a question below to ask ChatGPT'}
          </Text>
        </View>

        {/* Echo + ChatGPT response */}
        {loading && (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="small" color={theme.primary} />
            <Text style={[styles.loadingText, { color: theme.primary }]}>Asking ChatGPT...</Text>
          </View>
        )}

        {!!result && !loading && (
          <AppCard style={styles.resultCard}>
            <Text style={[styles.resultLabel, { color: theme.textMuted }]}>Farmer Query</Text>
            <Text style={[styles.resultPhrase, { color: theme.primary }]}>“{result.phrase}”</Text>
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
              <MaterialIcons name="support-agent" size={16} color={colors.primary} style={{ marginRight: 6 }} />
              <Text style={[styles.resultLabel, { color: theme.primary }]}>KrishiMitri (ChatGPT)</Text>
            </View>
            <Text style={[styles.resultResponse, { color: theme.text }]}>{result.response}</Text>

            <TouchableOpacity
              style={styles.chatNavBtn}
              onPress={() => navigation.navigate('KrishiMitri')}
            >
              <Text style={styles.chatNavBtnText}>Open Full KrishiMitri Chat →</Text>
            </TouchableOpacity>
          </AppCard>
        )}

        {/* Hint commands */}
        <SectionHeader title={t('try_saying')} />
        <View style={styles.commandsWrap}>
          {VOICE_COMMANDS.map((cmd) => {
            const label = languageCode === 'hi' ? cmd.hi : cmd.phrase;
            return (
              <TouchableOpacity
                key={cmd.phrase}
                activeOpacity={0.75}
                disabled={listening || loading}
                onPress={() => askChatGPT(label)}
                style={[styles.commandChip, { backgroundColor: theme.surface, borderColor: theme.border }]}
              >
                <MaterialIcons name="chat-bubble-outline" size={14} color={theme.primary} style={{ marginRight: 6 }} />
                <Text style={[styles.commandText, { color: theme.text }]}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  micZone: { alignItems: 'center', marginTop: spacing.xl, marginBottom: spacing.xl },
  micWrap: { width: 110, height: 110, alignItems: 'center', justifyContent: 'center' },
  pulseRing: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 2,
  },
  micButton: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  statusText: { fontSize: typography.titleMedium.fontSize, fontWeight: '600', marginTop: spacing.lg },
  statusHint: { fontSize: typography.bodyMedium.fontSize, marginTop: spacing.xs },
  resultCard: { marginBottom: spacing.xl },
  resultLabel: { fontSize: typography.labelMedium.fontSize, fontWeight: '600', textTransform: 'uppercase' },
  resultPhrase: { fontSize: typography.titleMedium.fontSize, fontWeight: '600', marginTop: spacing.xs },
  divider: { height: 1, marginVertical: spacing.md },
  resultResponse: { fontSize: typography.bodyLarge.fontSize, marginTop: spacing.xs, lineHeight: 24 },
  commandsWrap: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -spacing.xs },
  commandChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    margin: spacing.xs,
  },
  commandText: { fontSize: typography.bodySmall.fontSize, fontWeight: '500' },
  chatGptBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8F5E9',
    borderRadius: radius.pill,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  liveGreenDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#2E7D32',
    marginRight: 6,
  },
  chatGptBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2E7D32',
  },
  loadingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  loadingText: {
    marginLeft: 8,
    fontWeight: '600',
    fontSize: 14,
  },
  chatNavBtn: {
    marginTop: 14,
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatNavBtnText: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 13,
  },
});
