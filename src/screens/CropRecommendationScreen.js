// ─────────────────────────────────────────────────────────────────────────────
// AgriVision — Crop Recommendation screen
// Ported from presentation/ai/CropRecommendationScreen.kt (professional version)
// The Kotlin runs a local TF-Lite model + OpenAI; here we use a deterministic
// local mock that returns the source's CropFull JSON structure, and read live
// sensor values through the api layer (src/services/api.js → mock data).
// ─────────────────────────────────────────────────────────────────────────────
import React, { useMemo, useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  Animated,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { colors } from '../theme';
import { useApp } from '../context/AppContext';
import * as api from '../services/api';

// ── Screen-local palette (CropRecommendationScreen.kt) ──────────────────────
const LIGHT = {
  bgScreen: '#F6FAF6',
  bgCard: '#FFFFFF',
  bgSoft: '#F7FBF7',
  bgLiveTag: '#BBEFBB',
  scoreTrack: '#E1EDE1',
  greenDark: '#234A27',
  greenMid: '#48894A',
  greenTrack: '#B6D9B6',
  greenPale: '#E4F4E4',
  textPri: '#151F15',
  textSec: '#3F533F',
  textMut: '#859985',
  textOnDark: '#FFFFFF',
  border: '#DCEBDC',
  divider: '#E8F0E8',
  errBg: '#FDECEC',
  errText: '#C62828',
};

const DARK = {
  bgScreen: '#1A1C19',
  bgCard: '#153525',
  bgSoft: '#10241A',
  bgLiveTag: '#24482A',
  scoreTrack: '#2A3A2A',
  greenDark: '#8FD08F',
  greenMid: '#6CB56F',
  greenTrack: '#3E6A43',
  greenPale: '#1E3524',
  textPri: '#E8F5E9',
  textSec: '#B8D0C1',
  textMut: '#9DBBA0',
  textOnDark: '#FFFFFF',
  border: '#2E4A32',
  divider: '#2E4A32',
  errBg: '#3A2222',
  errText: '#EF9A9A',
};

// Button fills keep the source's dark green in both modes (white text stays legible).
const BTN_BG = '#234A27';

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

// ── Helpers (mirror of Kotlin top-level functions) ───────────────────────────
function currentMonthName() {
  return new Date().toLocaleString('en-US', { month: 'long' });
}

function formatTime(ts) {
  const d = new Date(ts);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  let h = d.getHours();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${String(d.getDate()).padStart(2, '0')} ${months[d.getMonth()]} ${d.getFullYear()}, ${String(h).padStart(2, '0')}:${mm} ${ampm}`;
}

function formatAcres(a) {
  return Number.isInteger(a) ? String(a) : a.toFixed(1);
}

function inferIndianState(location) {
  if (!location) return '';
  const value = String(location).toLowerCase();
  const match = (keys) => keys.some((k) => value.includes(k));
  if (match(['punjab', 'ludhiana', 'amritsar'])) return 'Punjab';
  if (match(['haryana', 'karnal', 'hisar'])) return 'Haryana';
  if (match(['uttar pradesh', 'ghaziabad', 'lucknow', 'kanpur'])) return 'Uttar Pradesh';
  if (match(['bihar', 'patna'])) return 'Bihar';
  if (match(['rajasthan', 'jaipur'])) return 'Rajasthan';
  if (match(['madhya pradesh', 'bhopal', 'indore'])) return 'Madhya Pradesh';
  if (match(['maharashtra', 'pune', 'nagpur'])) return 'Maharashtra';
  if (match(['gujarat', 'ahmedabad', 'rajkot'])) return 'Gujarat';
  if (match(['west bengal', 'kolkata'])) return 'West Bengal';
  if (match(['odisha', 'bhubaneswar'])) return 'Odisha';
  if (match(['chhattisgarh', 'raipur'])) return 'Chhattisgarh';
  if (match(['telangana', 'hyderabad'])) return 'Telangana';
  if (match(['andhra pradesh', 'vijayawada'])) return 'Andhra Pradesh';
  if (match(['karnataka', 'bengaluru', 'mysuru'])) return 'Karnataka';
  if (match(['tamil nadu', 'coimbatore', 'chennai'])) return 'Tamil Nadu';
  if (match(['kerala', 'kochi', 'thrissur'])) return 'Kerala';
  if (match(['assam', 'guwahati'])) return 'Assam';
  return '';
}

// ── JSON parsing helpers (parseCropsFull in the Kotlin) ─────────────────────
const clampInt = (v, min, max) => Math.max(min, Math.min(max, v || min));

function strField(o, keys) {
  for (const k of keys) {
    const v = o[k];
    if (v === undefined || v === null) continue;
    const s = String(v).trim();
    if (s && s.toLowerCase() !== 'null') return s;
  }
  return '';
}

function intField(o, keys, def) {
  for (const k of keys) {
    const v = o[k];
    if (v === undefined || v === null) continue;
    const n = typeof v === 'number' ? v : parseInt(String(v), 10);
    if (!Number.isNaN(n)) return n;
  }
  return def;
}

function arrField(o, keys) {
  for (const k of keys) {
    const v = o[k];
    if (v === undefined || v === null) continue;
    if (Array.isArray(v)) {
      const out = v.map((i) => String(i).trim()).filter((s) => s && s.toLowerCase() !== 'null');
      if (out.length) return out;
    }
    const s = String(v).trim();
    if (s) {
      return s
        .split('\n').join(';')
        .split(';').join(';')
        .split('•').join(';')
        .split(';')
        .map((i) => i.trim().replace(/^[-•\s]+/, '').trim())
        .filter(Boolean);
    }
  }
  return [];
}

function parseCropObject(raw) {
  if (!raw) return null;
  let o = raw;
  if (typeof raw === 'string') {
    try {
      o = JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }
  const name = strField(o, ['name', 'crop', 'cropName', 'recommendedCrop']);
  if (!name) return null;
  return {
    name,
    scientific: strField(o, ['scientific', 'scientificName']),
    match: clampInt(intField(o, ['match', 'score', 'suitability'], 80), 1, 100),
    duration: strField(o, ['duration', 'cropDuration']),
    sowingTime: strField(o, ['sowingTime', 'sowing', 'bestSowingTime']),
    harvestTime: strField(o, ['harvestTime', 'harvest', 'harvestingTime']),
    yield: strField(o, ['yield', 'expectedYield']),
    soilFit: strField(o, ['soilFit', 'soilTypeFit', 'soilSuitability']),
    marketDemand: strField(o, ['marketDemand', 'demand', 'market']),
    waterNeeds: clampInt(intField(o, ['waterNeeds', 'waterNeed'], 50), 0, 100),
    pestRisk: clampInt(intField(o, ['pestRisk', 'risk'], 30), 0, 100),
    climateSuitability: clampInt(intField(o, ['climateSuitability', 'climateScore'], 80), 0, 100),
    whySuitable: strField(o, ['whySuitable', 'reason', 'why']),
    recommendedBecause: arrField(o, ['recommendedBecause', 'reasons', 'recommendedReasons']),
    changedParameters: arrField(o, ['changedParameters', 'parameterChanges', 'changes']),
    notRecommendedIf: strField(o, ['notRecommendedIf', 'avoidIf', 'warning']),
    mandiMspInrPerQuintal: o.mandiMspInrPerQuintal || o.msp,
    projectedGrossRevenueInrPerAcre: o.projectedGrossRevenueInrPerAcre || o.grossRevenue,
    rotationBonus: o.rotationBonus,
  };
}

function extractJsonArray(text) {
  const start = text.indexOf('[');
  if (start < 0) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === '\\') {
      escaped = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (!inString) {
      if (ch === '[') depth++;
      if (ch === ']') {
        depth--;
        if (depth === 0) return text.substring(start, i + 1);
      }
    }
  }
  return null;
}

function extractJsonObjects(text) {
  const out = [];
  let start = -1;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === '\\') {
      escaped = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (!inString) {
      if (ch === '{') {
        if (depth === 0) start = i;
        depth++;
      } else if (ch === '}') {
        depth--;
        if (depth === 0 && start >= 0) {
          out.push(text.substring(start, i + 1));
          start = -1;
        }
      }
    }
  }
  return out;
}

function parseCropsFull(text) {
  const cleaned = String(text)
    .replace(/```json/gi, '')
    .replace(/```JSON/gi, '')
    .replace(/```/g, '')
    .replace(/﻿/g, '')
    .trim();
  if (!cleaned) return [];

  let arr = null;
  const tryParse = (raw) => {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map(parseCropObject).filter(Boolean);
      return null;
    } catch (e) {
      return null;
    }
  };

  arr = tryParse(cleaned);
  if (!arr || arr.length === 0) {
    const candidate = extractJsonArray(cleaned);
    if (candidate) arr = tryParse(candidate);
  }
  if (!arr || arr.length === 0) {
    arr = extractJsonObjects(cleaned).map(parseCropObject).filter(Boolean);
  }

  const seen = new Set();
  const out = [];
  for (const crop of arr || []) {
    const key = String(crop.name || '').toLowerCase().trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(crop);
  }
  return out.slice(0, 3);
}

// ── Deterministic local recommendation (the Kotlin runs TF-Lite + OpenAI) ────
// Ports `fallbackCropsByState` so the sample output structure is identical.
function fallbackCropsByState(state, location, soilType) {
  const s = String(state || '').toLowerCase();
  const soil = soilType || 'Loamy';
  const mk = (name, scientific, match, duration, sowingTime, harvestTime, yieldV, soilFit, marketDemand, waterNeeds, pestRisk, climateSuitability) => ({
    name,
    scientific,
    match,
    duration,
    sowingTime,
    harvestTime,
    yield: yieldV,
    soilFit,
    marketDemand,
    waterNeeds,
    pestRisk,
    climateSuitability,
    whySuitable: '',
    recommendedBecause: [],
    changedParameters: [],
    notRecommendedIf: '',
  });

  if (s.includes('punjab') || s.includes('haryana')) {
    return [
      mk('Wheat', 'Triticum aestivum', 93, '110-120 Days', 'Nov', 'Mar-Apr', '4.0-4.8 t/ha', `${soil} Soil`, 'High Demand', 45, 28, 90),
      mk('Mustard', 'Brassica juncea', 86, '95-110 Days', 'Oct-Nov', 'Feb-Mar', '1.4-1.8 t/ha', `${soil} Soil`, 'Good Demand', 32, 35, 84),
      mk('Gram', 'Cicer arietinum', 79, '100-115 Days', 'Oct-Nov', 'Feb-Mar', '1.8-2.4 t/ha', `${soil} Soil`, 'Stable Demand', 30, 33, 78),
    ];
  }
  if (s.includes('uttar pradesh') || s.includes('bihar')) {
    return [
      mk('Wheat', 'Triticum aestivum', 91, '110-125 Days', 'Nov', 'Mar-Apr', '3.8-4.6 t/ha', `${soil} Soil`, 'High Demand', 46, 30, 88),
      mk('Potato', 'Solanum tuberosum', 84, '90-110 Days', 'Oct-Nov', 'Jan-Feb', '22-28 t/ha', `${soil} Soil`, 'High Demand', 54, 38, 81),
      mk('Gram', 'Cicer arietinum', 78, '100-115 Days', 'Oct-Nov', 'Feb-Mar', '1.7-2.2 t/ha', `${soil} Soil`, 'Stable Demand', 30, 34, 77),
    ];
  }
  if (s.includes('maharashtra') || s.includes('madhya pradesh')) {
    return [
      mk('Soybean', 'Glycine max', 90, '90-110 Days', 'Jun-Jul', 'Sep-Oct', '1.8-2.6 t/ha', `${soil} Soil`, 'High Demand', 44, 36, 88),
      mk('Gram', 'Cicer arietinum', 85, '100-120 Days', 'Oct-Nov', 'Feb-Mar', '1.8-2.3 t/ha', `${soil} Soil`, 'Stable Demand', 31, 33, 82),
      mk('Wheat', 'Triticum aestivum', 77, '110-125 Days', 'Nov', 'Mar-Apr', '3.4-4.2 t/ha', `${soil} Soil`, 'High Demand', 49, 31, 75),
    ];
  }
  if (s.includes('gujarat') || s.includes('rajasthan')) {
    return [
      mk('Mustard', 'Brassica juncea', 89, '95-110 Days', 'Oct-Nov', 'Feb-Mar', '1.3-1.8 t/ha', `${soil} Soil`, 'Good Demand', 30, 34, 86),
      mk('Cumin', 'Cuminum cyminum', 83, '100-110 Days', 'Nov', 'Feb-Mar', '0.7-1.0 t/ha', `${soil} Soil`, 'Premium Demand', 26, 41, 80),
      mk('Gram', 'Cicer arietinum', 78, '100-115 Days', 'Oct-Nov', 'Feb-Mar', '1.5-2.0 t/ha', `${soil} Soil`, 'Stable Demand', 29, 35, 76),
    ];
  }
  if (s.includes('karnataka') || s.includes('telangana') || s.includes('andhra pradesh')) {
    return [
      mk('Maize', 'Zea mays', 88, '95-110 Days', 'Jun-Jul', 'Sep-Oct', '4.5-6.2 t/ha', `${soil} Soil`, 'High Demand', 50, 37, 86),
      mk('Groundnut', 'Arachis hypogaea', 84, '105-120 Days', 'Jun-Jul', 'Oct-Nov', '1.8-2.6 t/ha', `${soil} Soil`, 'Good Demand', 40, 36, 82),
      mk('Red Gram', 'Cajanus cajan', 79, '150-180 Days', 'Jun-Jul', 'Dec-Jan', '1.3-1.8 t/ha', `${soil} Soil`, 'Stable Demand', 34, 33, 77),
    ];
  }
  if (s.includes('tamil nadu') || s.includes('kerala')) {
    return [
      mk('Rice', 'Oryza sativa', 90, '110-135 Days', 'Jun-Jul', 'Oct-Nov', '4.0-5.5 t/ha', `${soil} Soil`, 'High Demand', 62, 39, 88),
      mk('Groundnut', 'Arachis hypogaea', 81, '105-120 Days', 'Jun-Jul', 'Oct-Nov', '1.7-2.4 t/ha', `${soil} Soil`, 'Good Demand', 40, 35, 79),
      mk('Black Gram', 'Vigna mungo', 76, '75-90 Days', 'Jul-Aug', 'Oct-Nov', '0.8-1.2 t/ha', `${soil} Soil`, 'Stable Demand', 28, 31, 75),
    ];
  }
  return [
    mk('Wheat', 'Triticum aestivum', 91, '110-120 Days', 'Nov', 'Mar-Apr', '4.0-4.8 t/ha', `${soil} Soil`, 'High Demand', 45, 28, 89),
    mk('Mustard', 'Brassica juncea', 83, '95-110 Days', 'Oct-Nov', 'Feb-Mar', '1.4-1.8 t/ha', `${soil} Soil`, 'Good Demand', 32, 35, 80),
    mk('Gram', 'Cicer arietinum', 74, '100-115 Days', 'Oct-Nov', 'Feb-Mar', '1.8-2.4 t/ha', `${soil} Soil`, 'Stable Demand', 30, 33, 76),
  ];
}

// Deterministic mock of `runHybridModel` + the LLM pass (returns CropFull list).
function generateMockRecommendation(snapshot) {
  const crops = fallbackCropsByState(snapshot.state, snapshot.location, snapshot.soilType);
  const mlCrop = crops.length ? crops[0].name : 'Wheat';
  const confidence = 0.87; // fixed → deterministic
  return { mlCrop, confidence, crops: crops.slice(0, 3) };
}

// ── Reusable sub-components ──────────────────────────────────────────────────
function OutlinedField({ c, label, value, onChange, placeholder, keyboardType, multiline }) {
  return (
    <View style={[styles.field, { borderColor: c.border, backgroundColor: c.bgCard }]}>
      <Text style={[styles.fieldLabel, { color: c.textMut }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={c.textMut}
        keyboardType={keyboardType}
        multiline={multiline}
        style={[styles.fieldInput, { color: c.textPri }]}
      />
    </View>
  );
}

function LocationInputCard({ c, locationInput, onLocationInputChange, detectedLocation, state }) {
  return (
    <View style={[styles.card16, { backgroundColor: c.bgSoft, borderColor: c.border }]}>
      <View style={styles.locRow}>
        <View style={[styles.locIcon, { backgroundColor: c.greenPale }]}>
          <MaterialIcons name="edit-location" size={22} color={c.greenDark} />
        </View>
        <View style={{ width: 12 }} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.locTitle, { color: c.textPri }]}>Enter Location Manually</Text>
          <Text style={[styles.locSub, { color: c.textMut }]}>
            {detectedLocation
              ? `Dashboard detected: ${detectedLocation}`
              : 'Dashboard location not available'}
          </Text>
        </View>
      </View>
      <View style={{ height: 12 }} />
      <OutlinedField
        c={c}
        label="Farm Location"
        value={locationInput}
        onChange={onLocationInputChange}
        placeholder="Enter village, city, district, state"
        multiline
      />
      {!!state && (
        <>
          <View style={{ height: 8 }} />
          <Text style={[styles.detectedState, { color: c.greenMid }]}>Detected state: {state}</Text>
        </>
      )}
    </View>
  );
}

function EntryInputSection({
  c,
  sowingMonth,
  onSowingMonthChange,
  lastCrop,
  onLastCropChange,
  locationInput,
  onLocationInputChange,
  detectedLocation,
  state,
  farmSizeText,
  onFarmSizeChange,
}) {
  return (
    <View style={[styles.card20, { backgroundColor: c.bgCard, borderColor: c.border }]}>
      <Text style={[styles.inputTitle, { color: c.textPri }]}>Input Details</Text>
      <View style={{ height: 12 }} />
      <LocationInputCard
        c={c}
        locationInput={locationInput}
        onLocationInputChange={onLocationInputChange}
        detectedLocation={detectedLocation}
        state={state}
      />
      <View style={{ height: 12 }} />
      <OutlinedField
        c={c}
        label="Farm Size (Acres)"
        value={farmSizeText}
        onChange={onFarmSizeChange}
        keyboardType="decimal-pad"
      />
      <View style={{ height: 10 }} />
      <OutlinedField c={c} label="Month of Sowing" value={sowingMonth} onChange={onSowingMonthChange} />
      <View style={{ height: 10 }} />
      <OutlinedField c={c} label="Last Crop Grown" value={lastCrop} onChange={onLastCropChange} />
    </View>
  );
}

function BufferedLoadingCard({ c, location, visibleLines }) {
  return (
    <View style={[styles.card20, { backgroundColor: c.bgCard, borderColor: c.border }]}>
      <View style={styles.loadingRow}>
        <View style={styles.spinnerWrap}>
          <View style={[styles.spinnerTrack, { borderColor: c.greenTrack }]} />
          <ActivityIndicator size="large" color={c.greenDark} style={styles.spinner} />
        </View>
        <View style={{ width: 14 }} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.loadingTitle, { color: c.textPri }]}>
            Professional Calculation in Progress
          </Text>
          <Text style={[styles.loadingSub, { color: c.textMut }]}>
            Analyzing farm intelligence for {location}
          </Text>
        </View>
      </View>
      <View style={{ height: 16 }} />
      <View style={[styles.divider, { backgroundColor: c.divider }]} />
      <View style={{ height: 14 }} />
      {visibleLines.length === 0 ? (
        <Text style={[styles.loadingLine, { color: c.textSec }]}>
          Preparing recommendation workflow
        </Text>
      ) : (
        visibleLines.map((line, i) => (
          <Text key={i} style={[styles.loadingLine, { color: c.textSec }]}>
            {i + 1}. {line}
          </Text>
        ))
      )}
    </View>
  );
}

function SummaryTile({ c, title, value }) {
  return (
    <View style={[styles.tile, { backgroundColor: c.bgSoft }]}>
      <Text style={[styles.tileTitle, { color: c.textMut }]}>{title}</Text>
      <View style={{ height: 4 }} />
      <Text style={[styles.tileValue, { color: c.textPri }]} numberOfLines={2}>
        {value || '-'}
      </Text>
    </View>
  );
}

function ResultHeaderCard({ c, location, state, sowingMonth, lastCrop, farmSizeAcres }) {
  return (
    <View style={[styles.card18, { backgroundColor: c.bgCard, borderColor: c.border }]}>
      <Text style={[styles.contextTitle, { color: c.textPri }]}>Recommendation Context</Text>
      <View style={{ height: 10 }} />
      <View style={styles.tileRow}>
        <SummaryTile c={c} title="Location" value={location} />
        <SummaryTile c={c} title="State" value={state} />
      </View>
      <View style={{ height: 8 }} />
      <View style={styles.tileRow}>
        <SummaryTile c={c} title="Sowing Month" value={sowingMonth} />
        <SummaryTile c={c} title="Last Crop" value={lastCrop || 'Not Provided'} />
      </View>
      <View style={{ height: 8 }} />
      <View style={styles.tileRow}>
        <SummaryTile c={c} title="Farm Size" value={`${formatAcres(farmSizeAcres)} Acres`} />
        <SummaryTile c={c} title="Analysis Type" value="Professional Agronomic Match" />
      </View>
    </View>
  );
}

function ScoreBadge({ c, match }) {
  return (
    <View style={[styles.scoreBadge, { backgroundColor: c.greenPale, borderColor: c.greenTrack }]}>
      <Text style={[styles.scoreValue, { color: c.greenDark }]}>{match}%</Text>
      <Text style={[styles.scoreLabel, { color: c.greenMid }]}>Score</Text>
    </View>
  );
}

function ScoreBar({ c, score }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const t = setTimeout(() => {
      Animated.timing(anim, {
        toValue: Math.max(0, Math.min(100, score)) / 100,
        duration: 900,
        useNativeDriver: false,
      }).start();
    }, 100);
    return () => clearTimeout(t);
  }, [score, anim]);
  return (
    <View>
      <View style={styles.scoreRow}>
        <Text style={[styles.suitTitle, { color: c.textMut }]}>Suitability</Text>
        <Text style={[styles.suitValue, { color: c.greenDark }]}>{score}%</Text>
      </View>
      <View style={{ height: 7 }} />
      <View style={[styles.scoreTrack, { backgroundColor: c.scoreTrack }]}>
        <Animated.View
          style={[
            styles.scoreFill,
            { backgroundColor: c.greenDark, width: anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) },
          ]}
        />
      </View>
    </View>
  );
}

function FinalCropCard({ c, crop, rank }) {
  return (
    <View style={[styles.card18, { backgroundColor: c.bgCard, borderColor: c.border }]}>
      <View style={styles.cropHeader}>
        <View style={{ flex: 1, paddingRight: 10 }}>
          <Text style={[styles.rankLabel, { color: c.textMut }]}>Recommendation {rank}</Text>
          <View style={{ height: 4 }} />
          <Text style={[styles.cropName, { color: c.textPri }]}>{crop.name}</Text>
          {!!crop.scientific && (
            <>
              <View style={{ height: 2 }} />
              <Text style={[styles.scientific, { color: c.textMut }]}>{crop.scientific}</Text>
            </>
          )}
        </View>
        <ScoreBadge c={c} match={crop.match} />
      </View>
      <View style={{ height: 14 }} />
      <ScoreBar c={c} score={crop.match} />
      <View style={{ height: 14 }} />
      <View style={styles.tileRow}>
        <SummaryTile c={c} title="Sowing" value={crop.sowingTime} />
        <SummaryTile c={c} title="Harvest" value={crop.harvestTime} />
      </View>
      <View style={{ height: 8 }} />
      <View style={styles.tileRow}>
        <SummaryTile c={c} title="Duration" value={crop.duration} />
        <SummaryTile c={c} title="Expected Yield" value={crop.yield} />
      </View>
      <View style={{ height: 8 }} />
      <View style={styles.tileRow}>
        <SummaryTile c={c} title="Soil" value={crop.soilFit} />
        <SummaryTile c={c} title="Demand" value={crop.marketDemand} />
      </View>

      {/* 2024-25 ICAR Mandi MSP & Projected Profitability */}
      {!!crop.mandiMspInrPerQuintal && (
        <View style={[styles.mspCard, { backgroundColor: c.greenPale, borderColor: c.greenTrack }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MaterialIcons name="currency-rupee" size={16} color={c.greenDark} />
              <Text style={{ fontSize: 13, fontWeight: '700', color: c.greenDark }}>
                2024-25 MSP: ₹{crop.mandiMspInrPerQuintal}/qtl
              </Text>
            </View>
            {!!crop.projectedGrossRevenueInrPerAcre && (
              <Text style={{ fontSize: 12, fontWeight: '600', color: c.greenDark }}>
                Est: ₹{crop.projectedGrossRevenueInrPerAcre.toLocaleString('en-IN')}/acre
              </Text>
            )}
          </View>
          {!!crop.rotationBonus && (
            <View style={{ marginTop: 6, flexDirection: 'row', alignItems: 'center' }}>
              <MaterialIcons name="autorenew" size={14} color={c.greenDark} />
              <Text style={{ marginLeft: 4, fontSize: 11.5, fontWeight: '600', color: c.greenMid }}>
                Rotation: {crop.rotationBonus}
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

function RefreshDialog({ c, visible, onCancel, onConfirm }) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <TouchableOpacity activeOpacity={1} style={StyleSheet.absoluteFill} onPress={onCancel} />
        <View style={[styles.dialog, { backgroundColor: c.bgCard }]}>
          <View style={[styles.dialogIcon, { backgroundColor: c.greenPale }]}>
            <MaterialIcons name="refresh" size={26} color={c.greenDark} />
          </View>
          <Text style={[styles.dialogTitle, { color: c.textPri }]}>Recalculate Recommendation?</Text>
          <Text style={[styles.dialogBody, { color: c.textSec }]}>
            The entry form will open again with your current values. You can edit location manually and generate a fresh result.
          </Text>
          <TouchableOpacity onPress={onConfirm} style={[styles.dialogConfirm, { backgroundColor: BTN_BG }]}>
            <Text style={styles.dialogConfirmText}>Open Entry Again</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onCancel} style={[styles.dialogCancel, { borderColor: c.border }]}>
            <Text style={[styles.dialogCancelText, { color: c.textMut }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ── Screen ───────────────────────────────────────────────────────────────────
export default function CropRecommendationScreen() {
  const navigation = useNavigation();
  const { isDark, selectedFarm } = useApp();
  const c = useMemo(() => (isDark ? DARK : LIGHT), [isDark]);

  // Live sensor nodes (Kotlin reads these from the DashboardViewModel → api layer here)
  const nodes = useMemo(() => {
    try {
      return api.getSensorNodes() || [];
    } catch (e) {
      return [];
    }
  }, []);

  const realNodes = useMemo(
    () =>
      nodes.filter(
        (n) =>
          n.n != null || n.p != null || n.k != null || n.ph != null || n.temperature != null || n.humidity != null
      ),
    [nodes]
  );

  const avg = (list) => (list.length ? list.reduce((a, b) => a + b, 0) / list.length : 0);
  const avgN = useMemo(() => avg(realNodes.map((n) => n.n).filter((v) => v != null)), [realNodes]);
  const avgP = useMemo(() => avg(realNodes.map((n) => n.p).filter((v) => v != null)), [realNodes]);
  const avgK = useMemo(() => avg(realNodes.map((n) => n.k).filter((v) => v != null)), [realNodes]);
  const avgPh = useMemo(() => avg(realNodes.map((n) => n.ph).filter((v) => v != null)), [realNodes]);
  const avgTemp = useMemo(() => avg(realNodes.map((n) => n.temperature).filter((v) => v != null)), [realNodes]);
  const avgHumidity = useMemo(() => avg(realNodes.map((n) => n.humidity).filter((v) => v != null)), [realNodes]);

  const detectedLocation = useMemo(() => (selectedFarm && selectedFarm.location) || '', [selectedFarm]);
  const rainfallDisplay = '-';
  const soilTypeDisplay = useMemo(() => (selectedFarm && selectedFarm.soilType) || '', [selectedFarm]);
  const irrigationSummary = 'Based on live field records';

  const weatherSummary = useMemo(() => {
    const t = avgTemp > 0 ? `${Math.round(avgTemp)} C` : '-';
    const h = avgHumidity > 0 ? `${Math.round(avgHumidity)}%` : '-';
    return `Temp ${t}, Humidity ${h}, Rain ${rainfallDisplay}`;
  }, [avgTemp, avgHumidity]);

  const [sowingMonth, setSowingMonth] = useState(currentMonthName());
  const [lastCrop, setLastCrop] = useState('');
  const [userLocationInput, setUserLocationInput] = useState('');
  const [farmSizeText, setFarmSizeText] = useState('2.5');
  const [mlInfo, setMlInfo] = useState('');

  const [screenMode, setScreenMode] = useState('ENTRY');
  const [resultText, setResultText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showRefreshDialog, setShowRefreshDialog] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(0);

  const [loadingMessages, setLoadingMessages] = useState([]);
  const [visibleLoadingCount, setVisibleLoadingCount] = useState(0);

  useEffect(() => {
    if (!userLocationInput && detectedLocation) setUserLocationInput(detectedLocation);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detectedLocation]);

  const finalLocation = (userLocationInput.trim() || detectedLocation.trim());
  const detectedState = inferIndianState(finalLocation);
  const farmSizeAcres = parseFloat(farmSizeText) || 0;

  const farmSnapshot = useMemo(
    () => ({
      location: finalLocation,
      state: detectedState,
      soilType: soilTypeDisplay || 'Loamy',
      rainfall: rainfallDisplay,
      avgN,
      avgP,
      avgK,
      avgPh,
      avgTemp,
      avgHumidity,
      irrigationSummary,
      weatherSummary,
      nodeCount: realNodes.length,
      farmSizeAcres,
    }),
    [finalLocation, detectedState, soilTypeDisplay, avgN, avgP, avgK, avgPh, avgTemp, avgHumidity, irrigationSummary, weatherSummary, realNodes.length, farmSizeAcres]
  );

  const crops = useMemo(() => {
    if (!resultText) return [];
    return parseCropsFull(resultText);
  }, [resultText]);

  // Buffered loading card (runBufferedLoading)
  const runBufferedLoading = async (input, snapshot) => {
    const loc = snapshot.location || 'Pending selection';
    const staged = [
      'Initializing agronomic recommendation engine',
      `Validating selected farm location: ${loc}`,
      `Identifying regional crop zone for ${snapshot.state || 'Unknown state'}`,
      `Reading soil sensor network from ${snapshot.nodeCount} active field node(s)`,
      'Aggregating nitrogen, phosphorus, potassium and pH values',
      'Reviewing field moisture, irrigation pattern and atmospheric trend',
      `Standardizing farm size input: ${formatAcres(snapshot.farmSizeAcres)} acres`,
      'Estimating land-capacity suitability for small and medium plot planning',
      `Checking seasonal alignment for sowing month: ${input.sowingMonth}`,
      `Reviewing crop rotation impact from previous crop: ${input.lastCrop || 'Not specified'}`,
      `Evaluating weather and rainfall profile for ${snapshot.location || 'selected farm'}`,
      'Computing state-specific crop suitability scores',
      'Adjusting recommendations for land area, field practicality and expected output',
      'Ranking top crop options for final recommendation report',
    ];
    setLoadingMessages([]);
    setVisibleLoadingCount(0);
    for (let i = 0; i < staged.length; i++) {
      setLoadingMessages((prev) => [...prev, staged[i]]);
      await delay(i < 5 ? 220 : 320);
      setVisibleLoadingCount(i + 1);
    }
  };

  const resetToEntryForRecalculate = () => {
    setSowingMonth(currentMonthName());
    setLastCrop('Wheat');
    setUserLocationInput(detectedLocation);
    setFarmSizeText('2.5');
    setScreenMode('ENTRY');
    setResultText('');
    setError(null);
    setMlInfo('');
  };

  const launchRecommendation = async (reason) => {
    if (realNodes.length === 0) {
      setError('No live farm node data available yet.');
      return;
    }
    if (!sowingMonth.trim()) {
      setError('Please enter sowing month.');
      return;
    }
    if (!finalLocation.trim()) {
      setError('Please enter location manually or use dashboard location.');
      return;
    }
    if (farmSizeAcres <= 0) {
      setError('Please enter a valid farm size in acres.');
      return;
    }

    const input = {
      sowingMonth: sowingMonth.trim(),
      lastCrop: lastCrop.trim(),
      location: finalLocation,
      state: detectedState,
      farmSizeText: farmSizeText.trim(),
      farmSizeAcres,
    };

    setLoading(true);
    setError(null);
    setResultText('');

    try {
      await runBufferedLoading(input, farmSnapshot);

      // Call on-device 22-crop recommendation engine with 2024-25 MSP benchmarks
      const aiResults = await api.getCropRecommendation({
        nitrogen: farmSnapshot.avgN,
        phosphorus: farmSnapshot.avgP,
        potassium: farmSnapshot.avgK,
        ph: farmSnapshot.avgPh,
        temperature: farmSnapshot.avgTemp,
        humidity: farmSnapshot.avgHumidity,
        previousCrop: input.lastCrop,
        rainfall: 120,
      });

      let parsed = [];
      let mlCrop = 'Wheat';
      let confidence = 0.87;

      if (Array.isArray(aiResults) && aiResults.length > 0) {
        mlCrop = aiResults[0].name;
        confidence = (aiResults[0].confidencePct || 87) / 100;
        parsed = aiResults.map((item) => ({
          name: item.name,
          scientific: item.scientific || `${item.name} sp.`,
          match: item.confidencePct || 85,
          duration: item.durationDays ? `${item.durationDays} Days` : '110-120 Days',
          sowingTime: input.sowingMonth || 'Nov',
          harvestTime: 'Mar-Apr',
          yield: item.yieldTonAcre ? `${item.yieldTonAcre} t/acre` : '3.5-4.5 t/ha',
          soilFit: `${farmSnapshot.soilType || 'Loamy'} Soil`,
          marketDemand: (item.confidencePct || 85) >= 80 ? 'High Demand' : 'Good Demand',
          waterNeeds: item.waterNeed === 'High' ? 80 : item.waterNeed === 'Low' ? 30 : 50,
          pestRisk: 30,
          climateSuitability: item.confidencePct || 85,
          whySuitable: item.whySuitable || `Optimal for ${farmSnapshot.location} conditions with balanced NPK.`,
          recommendedBecause: [
            item.mandiMspInrPerQuintal ? `2024-25 Mandi MSP benchmark: ₹${item.mandiMspInrPerQuintal}/quintal` : null,
            item.projectedGrossRevenueInrPerAcre ? `Projected gross revenue: ₹${Number(item.projectedGrossRevenueInrPerAcre).toLocaleString('en-IN')}/acre` : null,
            item.rotationBonus ? `Rotation benefit: ${item.rotationBonus}` : null,
          ].filter(Boolean),
          mandiMspInrPerQuintal: item.mandiMspInrPerQuintal,
          projectedGrossRevenueInrPerAcre: item.projectedGrossRevenueInrPerAcre,
          rotationBonus: item.rotationBonus,
        }));
      } else {
        const fallback = generateMockRecommendation(farmSnapshot);
        mlCrop = fallback.mlCrop;
        confidence = fallback.confidence;
        parsed = fallback.crops;
      }

      if (!parsed || parsed.length === 0) {
        setError('Response came, but no valid crop data was generated.');
      } else {
        const finalJson = JSON.stringify(parsed.slice(0, 3));
        setMlInfo(`ML Prediction: ${mlCrop} (${Math.round(confidence * 100)}%)`);
        setResultText(finalJson);
        setLastUpdatedAt(Date.now());
        setScreenMode('RESULT');
      }
    } catch (e) {
      setError((e && e.message) || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  // Subtle fade/slide for the result section (AnimatedVisibility fadeIn + slideInVertically)
  const resultAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (screenMode === 'RESULT' && crops.length > 0 && !loading) {
      Animated.timing(resultAnim, { toValue: 1, duration: 320, useNativeDriver: true }).start();
    } else {
      resultAnim.setValue(0);
    }
  }, [screenMode, crops.length, loading, resultAnim]);

  return (
    <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: c.bgScreen }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={c.bgCard} />

      {/* Top app bar (TopAppBar in Kotlin) */}
      <View style={[styles.topBar, { backgroundColor: c.bgCard }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={8}>
          <MaterialIcons name="arrow-back" size={24} color={c.textPri} />
        </TouchableOpacity>
        <View style={styles.topTitleWrap}>
          <Text style={[styles.topTitle, { color: c.textPri }]}>Crop Recommendation</Text>
          <Text style={[styles.topSubtitle, { color: c.greenMid }]} numberOfLines={1}>
            {finalLocation || 'Location not selected'}
          </Text>
        </View>
        <View style={styles.topActions}>
          {crops.length > 0 && (
            <View style={[styles.resultTag, { backgroundColor: c.bgLiveTag, borderColor: c.greenTrack }]}>
              <Text style={[styles.resultTagText, { color: c.greenDark }]}>RESULT</Text>
            </View>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {lastUpdatedAt > 0 && !loading && screenMode === 'RESULT' && (
          <Text style={[styles.lastUpdated, { color: c.textMut }]}>
            Last updated: {formatTime(lastUpdatedAt)}
          </Text>
        )}

        {screenMode === 'ENTRY' && !loading && (
          <View style={styles.fullWidth}>
            <EntryInputSection
              c={c}
              sowingMonth={sowingMonth}
              onSowingMonthChange={setSowingMonth}
              lastCrop={lastCrop}
              onLastCropChange={setLastCrop}
              locationInput={userLocationInput}
              onLocationInputChange={setUserLocationInput}
              detectedLocation={detectedLocation}
              state={detectedState}
              farmSizeText={farmSizeText}
              onFarmSizeChange={(v) => setFarmSizeText(v.replace(/[^0-9.]/g, ''))}
            />
            <View style={{ height: 18 }} />
            <TouchableOpacity
              onPress={() => launchRecommendation('manual_first')}
              activeOpacity={0.85}
              style={[styles.primaryBtn, { backgroundColor: BTN_BG }]}
            >
              <Text style={styles.primaryBtnText}>Generate Crop Recommendation</Text>
            </TouchableOpacity>
          </View>
        )}

        {loading && (
          <View style={styles.fullWidth}>
            <BufferedLoadingCard
              c={c}
              location={finalLocation || 'selected farm'}
              visibleLines={loadingMessages.slice(0, visibleLoadingCount)}
            />
            <View style={{ height: 18 }} />
          </View>
        )}

        {!!error && !loading && (
          <View style={[styles.errorCard, { backgroundColor: c.errBg }]}>
            <Text style={[styles.errorText, { color: c.errText }]}>{error}</Text>
          </View>
        )}

        {crops.length > 0 && !loading && screenMode === 'RESULT' && (
          <Animated.View
            style={[
              styles.fullWidth,
              {
                opacity: resultAnim,
                transform: [
                  {
                    translateY: resultAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [24, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <ResultHeaderCard
              c={c}
              location={farmSnapshot.location}
              state={farmSnapshot.state}
              sowingMonth={sowingMonth}
              lastCrop={lastCrop}
              farmSizeAcres={farmSnapshot.farmSizeAcres}
            />
            <View style={{ height: 14 }} />
            {!!mlInfo && (
              <Text style={[styles.mlInfo, { color: c.greenMid }]}>{mlInfo}</Text>
            )}
            {!!mlInfo && <View style={{ height: 8 }} />}
            <Text style={[styles.finalTitle, { color: c.textPri }]}>Final Crop Result</Text>
            <View style={{ height: 10 }} />
            {crops.slice(0, 3).map((crop, i) => (
              <View key={`crop-${i}`}>
                <FinalCropCard c={c} crop={crop} rank={i + 1} />
                <View style={{ height: 12 }} />
              </View>
            ))}
            <View style={{ height: 10 }} />
            <TouchableOpacity
              onPress={() => setShowRefreshDialog(true)}
              activeOpacity={0.85}
              style={[styles.secondaryBtn, { backgroundColor: BTN_BG }]}
            >
              <Text style={styles.primaryBtnText}>Recalculate Recommendation</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        <View style={{ height: 36 }} />
      </ScrollView>

      <RefreshDialog
        c={c}
        visible={showRefreshDialog}
        onCancel={() => setShowRefreshDialog(false)}
        onConfirm={() => {
          setShowRefreshDialog(false);
          resetToEntryForRecalculate();
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },

  // ── Top app bar ──
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    paddingHorizontal: 4,
    elevation: 1,
  },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  topTitleWrap: { flex: 1, justifyContent: 'center' },
  topTitle: { fontSize: 16, fontWeight: '700' },
  topSubtitle: { fontSize: 11, fontWeight: '500', marginTop: 1 },
  topActions: {
    paddingRight: 12,
    minWidth: 88,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  resultTag: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  resultTagText: { fontSize: 11, fontWeight: '600' },

  // ── Scroll content ──
  scrollContent: {
    paddingHorizontal: 18,
    paddingVertical: 16,
    alignItems: 'center',
    paddingBottom: 36,
  },
  fullWidth: { alignSelf: 'stretch' },
  lastUpdated: { fontSize: 11, paddingBottom: 10, alignSelf: 'center' },

  // ── Cards ──
  card16: { borderRadius: 16, borderWidth: 1, padding: 14 },
  card18: { borderRadius: 18, borderWidth: 1, padding: 16 },
  card20: { borderRadius: 20, borderWidth: 1, padding: 16 },

  // ── Input details ──
  inputTitle: { fontSize: 16, fontWeight: '700' },

  // ── Outlined field ──
  field: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  fieldLabel: { fontSize: 11, fontWeight: '600', marginBottom: 4 },
  fieldInput: { fontSize: 15, paddingVertical: 2, minHeight: 22 },

  // ── Location card ──
  locRow: { flexDirection: 'row', alignItems: 'center' },
  locIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locTitle: { fontSize: 13, fontWeight: '600' },
  locSub: { fontSize: 11, marginTop: 2 },
  detectedState: { fontSize: 11, fontWeight: '600' },

  // ── Buttons ──
  primaryBtn: {
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtn: {
    height: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },

  // ── Error card ──
  errorCard: {
    width: '100%',
    borderRadius: 14,
    marginBottom: 16,
  },
  errorText: { fontSize: 13, padding: 14 },

  // ── Buffered loading ──
  loadingRow: { flexDirection: 'row', alignItems: 'center' },
  spinnerWrap: { width: 54, height: 54, alignItems: 'center', justifyContent: 'center' },
  spinnerTrack: {
    ...StyleSheet.absoluteFillObject,
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 6,
  },
  spinner: { position: 'absolute' },
  loadingTitle: { fontSize: 15, fontWeight: '700' },
  loadingSub: { fontSize: 12, marginTop: 3 },
  divider: { height: 1, width: '100%' },
  loadingLine: { fontSize: 13, paddingVertical: 4 },

  // ── Result context ──
  contextTitle: { fontSize: 15, fontWeight: '700' },
  tileRow: { flexDirection: 'row', gap: 8 },
  tile: {
    flex: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  tileTitle: { fontSize: 10, fontWeight: '700' },
  tileValue: { fontSize: 13, fontWeight: '600' },
  mlInfo: { fontSize: 13, fontWeight: '600', alignSelf: 'center' },
  finalTitle: { fontSize: 17, fontWeight: '700', alignSelf: 'center' },

  // ── Final crop card ──
  cropHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  rankLabel: { fontSize: 10, fontWeight: '700' },
  cropName: { fontSize: 20, fontWeight: '700' },
  scientific: { fontSize: 11 },

  // ── Score badge & bar ──
  scoreBadge: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
  },
  scoreValue: { fontSize: 18, fontWeight: '800' },
  scoreLabel: { fontSize: 10, fontWeight: '600' },
  scoreRow: { flexDirection: 'row', justifyContent: 'space-between' },
  suitTitle: { fontSize: 11, fontWeight: '600' },
  suitValue: { fontSize: 11, fontWeight: '700' },
  scoreTrack: {
    width: '100%',
    height: 10,
    borderRadius: 50,
    overflow: 'hidden',
  },
  scoreFill: { height: 10, borderRadius: 50 },

  // ── Refresh dialog ──
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  dialog: {
    width: '100%',
    borderRadius: 22,
    padding: 20,
    alignItems: 'center',
  },
  dialogIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  dialogTitle: {
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  dialogBody: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 16,
  },
  dialogConfirm: {
    alignSelf: 'stretch',
    height: 48,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  dialogConfirmText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  dialogCancel: {
    alignSelf: 'stretch',
    height: 48,
    borderRadius: 40,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialogCancelText: { fontSize: 15, fontWeight: '500' },

  // ── Mandi MSP card ──
  mspCard: {
    marginTop: 12,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
  },
});
