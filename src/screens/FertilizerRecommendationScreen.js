// ─────────────────────────────────────────────────────────────────────────────
// AgriVision — Fertilizer Recommendation screen
// Ported from presentation/ai/FertilizerRecommendationScreen.kt
// Two-step wizard: (1) Farm Details → (2) Soil & Nutrient (ML) Inputs, then a
// predicted fertilizer + structured fertilizer plan. ML inference is mocked
// locally with a deterministic function that mirrors the ViewModel output
// format (Fertilizer: / Quantity: / Timing: / Purpose: blocks).
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { colors } from '../theme';
import { useApp } from '../context/AppContext';
import * as api from '../services/api';

// ── Screen-local palette (FertilizerRecommendationScreen.kt) ────────────────
const PRIMARY = colors.primary;            // PrimaryGreen 0xFF2E7D32
const PRIMARY_DARK = '#1B5E20';            // PrimaryGreenDark (text on light fills)
const ACCENT_SOFT = colors.accentGreenSoft; // AccentGreenSoft 0xFFC8E6C9
const LIGHT_BG = '#F4FBF6';                // LightBackground
const CARD_LIGHT = '#FFFFFF';              // CardLight
const BORDER_SOFT = '#D9E7DB';             // BorderSoft
const TEXT_SOFT = '#5F6F64';               // TextSoft
const PREDICTED_BG = '#E9F6EA';            // PredictedFertilizerCard container
const PURPOSE_TEXT = '#37473B';            // plan purpose body color
const ERROR_CONTAINER = '#F9DEDC';         // MaterialTheme errorContainer (light)
const ON_ERROR_CONTAINER = '#410E0B';      // MaterialTheme onErrorContainer (light)
const OVERLAY_DIM = 'rgba(0,0,0,0.18)';    // LoadingOverlay scrim

// Dark-mode surface tones consistent with the ported design system.
const DARK_BG = '#0A1C12';                 // dashboardDarkBg
const DARK_CARD = colors.cardDark;         // 0xFF153525
const DARK_GREEN_TEXT = '#A5D6A7';         // PrimaryGreenDark → readable on dark
const DARK_MUTED = '#B8D0C1';              // TextSoft → readable on dark
const DARK_BORDER = '#2A4A33';
const DARK_PREDICTED = '#1E3524';
const DARK_PURPOSE = '#CFE0D2';
const DARK_INPUT_TEXT = '#E8F5E9';

const SOIL_OPTIONS = ['Loamy', 'Sandy', 'Clay', 'Black', 'Red', 'Clayey'];

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ── Helpers ──────────────────────────────────────────────────────────────────
// Mirrors getFieldValue() in the Kotlin screen: first non-blank candidate wins.
function getFieldValue(farm, possibleNames, fallback) {
  if (!farm) return fallback;
  for (const field of possibleNames) {
    const v = farm[field];
    if (v !== undefined && v !== null && String(v).trim() !== '' && String(v) !== 'null') {
      return Array.isArray(v) ? v.join(', ') : String(v);
    }
  }
  return fallback;
}

// Mirrors parseStructuredPlans() in the Kotlin screen.
function parseStructuredPlans(text) {
  const normalized = String(text || '').replace(/\\n/g, '\n');
  const plans = [];
  const blocks = normalized.split('Fertilizer:').slice(1);
  for (const block of blocks) {
    const name = block.substring(0, block.indexOf('\n') === -1 ? block.length : block.indexOf('\n')).trim();
    const quantity = (block.match(/Quantity:(.*?)(\n|$)/) || [])[1]?.trim() || '';
    const timing = (block.match(/Timing:(.*?)(\n|$)/) || [])[1]?.trim() || '';
    const purpose = (block.match(/Purpose:(.*?)(\n|$)/) || [])[1]?.trim() || '';
    if (name) plans.push({ name, quantity, timing, purpose });
  }
  return plans;
}

// Local deterministic ML inference (mocked).
function mockInference(f) {
  const soil = String(f.soil || '').trim();
  const n = Number(f.nitrogen) || 40;
  const p = Number(f.phosphorus) || 30;
  const k = Number(f.potassium) || 20;
  const crop = String(f.crop || '').trim() || 'your crop';

  const PRED_BY_SOIL = {
    Loamy: 'NPK 19:19:19',
    Sandy: 'Urea + DAP',
    Clay: 'NPK 10:26:26',
    Black: 'DAP',
    Red: 'Single Super Phosphate (SSP)',
    Clayey: 'NPK 12:32:16',
  };
  const predictedFertilizer = PRED_BY_SOIL[soil] || 'NPK 19:19:19';

  const qty = (base, deficit) => Math.max(10, base + Math.round(deficit * 1.5));
  const nQty = qty(20, 45 - n);
  const pQty = qty(15, 30 - p);
  const kQty = qty(10, 30 - k);

  const resultText =
    'Fertilizer: ' + predictedFertilizer + '\n' +
    'Quantity: ' + nQty + ' kg/acre\n' +
    'Timing: Apply at sowing / transplanting\n' +
    'Purpose: Balanced nutrition for ' + crop + ' during vegetative growth\n' +
    'Fertilizer: Urea (Nitrogen top-up)\n' +
    'Quantity: ' + nQty + ' kg/acre\n' +
    'Timing: 30 days after sowing\n' +
    'Purpose: Boost nitrogen for healthy leaf growth\n' +
    'Fertilizer: Muriate of Potash (MOP)\n' +
    'Quantity: ' + kQty + ' kg/acre\n' +
    'Timing: At flowering stage\n' +
    'Purpose: Improves fruit quality and disease resistance';

  return { predictedFertilizer, resultText };
}

// Deterministic soil condition insights from the ML inputs.
function soilInsights(f) {
  const pH = Number(f.pH) || 6.5;
  const moisture = Number(f.moisture) || 45;
  const n = Number(f.nitrogen) || 40;
  const p = Number(f.phosphorus) || 30;
  const k = Number(f.potassium) || 20;
  const insights = [];
  if (pH < 6.0) insights.push('⚠️ Soil is acidic — apply lime to raise pH towards 6.5–7.');
  else if (pH > 7.5) insights.push('⚠️ Soil is alkaline — apply gypsum or organic compost to lower pH.');
  else insights.push('✅ Soil pH is in the ideal range for most crops.');
  if (moisture < 30) insights.push('💧 Moisture is low — schedule irrigation soon.');
  else if (moisture > 60) insights.push('💧 Moisture is high — ensure proper drainage to avoid root rot.');
  else insights.push('💧 Moisture level is suitable for healthy root growth.');
  if (n < 35) insights.push('🟢 Nitrogen is low — prioritise a nitrogen-rich fertiliser.');
  if (p < 25) insights.push('🟡 Phosphorus is low — apply phosphorus at sowing for root growth.');
  if (k < 25) insights.push('🟠 Potassium is low — apply potash at flowering stage.');
  if (n >= 45 && p >= 30 && k >= 30) insights.push('🌱 Nutrient levels are well balanced — maintain the current plan.');
  return insights;
}

// ── Theme object ─────────────────────────────────────────────────────────────
function useTheme(isDark) {
  return {
    isDark,
    bg: isDark ? DARK_BG : LIGHT_BG,
    card: isDark ? DARK_CARD : CARD_LIGHT,
    greenText: isDark ? DARK_GREEN_TEXT : PRIMARY_DARK, // PrimaryGreenDark as text
    textMuted: isDark ? DARK_MUTED : TEXT_SOFT,          // TextSoft
    border: isDark ? DARK_BORDER : BORDER_SOFT,
    predictedBg: isDark ? DARK_PREDICTED : PREDICTED_BG,
    purpose: isDark ? DARK_PURPOSE : PURPOSE_TEXT,
    inputText: isDark ? DARK_INPUT_TEXT : '#1A1C19',
  };
}

// ── HeaderCard ───────────────────────────────────────────────────────────────
function HeaderCard({ crop, location, hasRecommendation, onRecalculate }) {
  return (
    <View style={styles.headerCard}>
      <View style={styles.headerCardInner}>
        <View style={styles.headerIconCircle}>
          <MaterialIcons name="science" size={28} color={PRIMARY} />
        </View>
        <View style={styles.headerTextWrap}>
          <Text style={styles.headerCrop} numberOfLines={1}>{crop}</Text>
          <Text style={styles.headerLocation} numberOfLines={1}>{location}</Text>
        </View>
        {hasRecommendation && (
          <TouchableOpacity onPress={onRecalculate} style={styles.headerRefreshBtn} hitSlop={8}>
            <MaterialIcons name="refresh" size={24} color={PRIMARY_DARK} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ── StepIndicator ────────────────────────────────────────────────────────────
function StepChip({ number, title, active, theme }) {
  return (
    <View style={styles.stepChip}>
      <View style={[styles.stepCircle, { backgroundColor: active ? PRIMARY : ACCENT_SOFT }]}>
        <Text
          style={[
            styles.stepNumber,
            { color: active ? '#FFFFFF' : PRIMARY_DARK },
          ]}
        >
          {number}
        </Text>
      </View>
      <Text
        style={[
          styles.stepTitle,
          { color: active ? theme.greenText : theme.textMuted },
          active && { fontWeight: '600' },
        ]}
      >
        {title}
      </Text>
    </View>
  );
}

function StepIndicator({ currentStep, theme }) {
  return (
    <View style={[styles.stepCard, { backgroundColor: theme.card }]}>
      <View style={styles.stepCardInner}>
        <StepChip number={1} title="Farm Details" active={currentStep === 1} theme={theme} />
        <Text style={[styles.stepDash, { color: theme.textMuted }]}>—</Text>
        <StepChip number={2} title="Soil Inputs" active={currentStep === 2} theme={theme} />
      </View>
    </View>
  );
}

// ── FormCard ─────────────────────────────────────────────────────────────────
function FormCard({ title, subtitle, theme, children }) {
  return (
    <View style={[styles.formCard, { backgroundColor: theme.card }]}>
      <Text style={[styles.formTitle, { color: theme.greenText }]}>{title}</Text>
      <Text style={[styles.formSubtitle, { color: theme.textMuted }]}>{subtitle}</Text>
      <View style={styles.formBody}>{children}</View>
    </View>
  );
}

// ── Outlined text field (matches OutlinedTextField with rounded 16 shape) ────
function StyledInputField({ label, value, onChangeText, keyboardType = 'default', theme }) {
  const [focused, setFocused] = useState(false);
  const float = focused || !!value;
  const borderColor = focused ? PRIMARY : theme.border;
  const labelColor = focused ? PRIMARY : theme.textMuted;
  return (
    <View style={styles.fieldWrap}>
      <View style={[styles.field, { borderColor }]}>
        <Text
          pointerEvents="none"
          style={[
            styles.fieldLabel,
            float ? styles.fieldLabelFloat : { top: (56 - 20) / 2 },
            { color: labelColor, backgroundColor: theme.card },
          ]}
        >
          {label}
        </Text>
        <View style={styles.fieldBody}>
          <TextInput
            style={[styles.fieldInput, { color: theme.inputText }]}
            value={value}
            onChangeText={onChangeText}
            placeholderTextColor={theme.textMuted}
            keyboardType={keyboardType}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
          />
        </View>
      </View>
    </View>
  );
}

// ── Read-only dropdown field (matches ExposedDropdownMenuBox) ────────────────
function DropdownField({ label, value, theme, open, onPress }) {
  const float = open || !!value;
  const borderColor = open ? PRIMARY : theme.border;
  const labelColor = open ? PRIMARY : theme.textMuted;
  return (
    <View style={styles.fieldWrap}>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onPress}
        style={[styles.field, { borderColor }]}
      >
        <Text
          pointerEvents="none"
          style={[
            styles.fieldLabel,
            float ? styles.fieldLabelFloat : { top: (56 - 20) / 2 },
            { color: labelColor, backgroundColor: theme.card },
          ]}
        >
          {label}
        </Text>
        <View style={styles.fieldBody}>
          <Text style={[styles.dropdownValue, { color: value ? theme.inputText : theme.textMuted }]} numberOfLines={1}>
            {value || label}
          </Text>
        </View>
        <View style={styles.fieldTrailingBtn}>
          <MaterialIcons name={open ? 'arrow-drop-up' : 'arrow-drop-down'} size={26} color={theme.textMuted} />
        </View>
      </TouchableOpacity>
    </View>
  );
}

// ── Bottom-sheet option list (DropdownMenu equivalent) ───────────────────────
function OptionSheet({ visible, title, options, selected, onSelect, onClose, theme }) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={onClose} />
      <View style={[styles.modalSheet, { backgroundColor: theme.card }]}>
        <View style={styles.modalHandle} />
        <Text style={[styles.modalTitle, { color: theme.greenText }]}>{title}</Text>
        <ScrollView style={styles.modalList} keyboardShouldPersistTaps="handled">
          {options.map((opt) => {
            const isSelected = opt === selected;
            return (
              <TouchableOpacity
                key={opt}
                style={styles.modalOption}
                activeOpacity={0.7}
                onPress={() => onSelect(opt)}
              >
                <Text style={[styles.modalOptionText, { color: isSelected ? PRIMARY : theme.inputText, fontWeight: isSelected ? '600' : '400' }]}>
                  {opt}
                </Text>
                {isSelected && <MaterialIcons name="check" size={20} color={PRIMARY} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
}

// ── PredictedFertilizerCard ──────────────────────────────────────────────────
function PredictedFertilizerCard({ fertilizerName, bagsPerAcre, theme }) {
  return (
    <View style={[styles.predictedCard, { backgroundColor: theme.predictedBg }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={[styles.predictedLabel, { color: theme.greenText }]}>ML Predicted Fertilizer</Text>
        <View style={{ backgroundColor: 'rgba(46,125,50,0.15)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: theme.greenText }}>Qualcomm Edge AI INT8</Text>
        </View>
      </View>
      <Text style={[styles.predictedName, { color: theme.greenText }]}>{fertilizerName}</Text>
      {!!bagsPerAcre && (
        <View style={{ marginTop: 6, flexDirection: 'row', alignItems: 'center' }}>
          <MaterialIcons name="inventory" size={16} color={PRIMARY} />
          <Text style={{ marginLeft: 6, fontSize: 13, fontWeight: '600', color: theme.greenText }}>
            Standard Retail Bags: {bagsPerAcre}
          </Text>
        </View>
      )}
    </View>
  );
}

// ── LegumeSavingsBanner ──────────────────────────────────────────────────────
function LegumeSavingsBanner({ savings, theme }) {
  if (!savings || !savings.savingsInr) return null;
  return (
    <View style={[styles.savingsBanner, { backgroundColor: theme.isDark ? '#1C3220' : '#E8F5E9', borderColor: PRIMARY }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <MaterialIcons name="eco" size={24} color={PRIMARY} />
        <View style={{ marginLeft: 10, flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: theme.greenText }}>
            Biological Rhizobium Credit Applied!
          </Text>
          <Text style={{ fontSize: 12, marginTop: 2, color: theme.purpose }}>
            Previous legume fixed {savings.nitrogenCreditKg} kg N/acre. Farmer saves{' '}
            <Text style={{ fontWeight: '700', color: PRIMARY }}>₹{savings.savingsInr.toLocaleString('en-IN')}</Text> on synthetic Urea bags!
          </Text>
        </View>
      </View>
    </View>
  );
}

// ── ErrorCard ────────────────────────────────────────────────────────────────
function ErrorCard({ message }) {
  return (
    <View style={styles.errorCard}>
      <MaterialIcons name="science" size={20} color={colors.error} />
      <Text style={styles.errorText}>{message}</Text>
    </View>
  );
}

// ── Plan card pieces ─────────────────────────────────────────────────────────
function DetailRow({ title, value, theme }) {
  return (
    <View style={styles.detailRow}>
      <Text style={[styles.detailTitle, { color: theme.textMuted }]}>{title}</Text>
      <Text style={[styles.detailValue, { color: theme.greenText }]}>{value}</Text>
    </View>
  );
}

function ProfessionalFertilizerCard({ plan, index, theme }) {
  return (
    <View style={[styles.planCard, { backgroundColor: theme.card }]}>
      <View style={styles.planHeader}>
        <View style={styles.planIndexCircle}>
          <Text style={[styles.planIndex, { color: theme.greenText }]}>{index}</Text>
        </View>
        <Text style={[styles.planName, { color: theme.greenText, flex: 1 }]}>{plan.name}</Text>
      </View>
      <View style={{ height: 16 }} />
      <DetailRow title="Quantity" value={plan.quantity} theme={theme} />
      <View style={{ height: 8 }} />
      <DetailRow title="Timing" value={plan.timing} theme={theme} />
      <View style={{ height: 16 }} />
      <Text style={[styles.planPurposeLabel, { color: theme.textMuted }]}>Purpose</Text>
      <View style={{ height: 4 }} />
      <Text style={[styles.planPurpose, { color: theme.purpose }]}>{plan.purpose}</Text>
    </View>
  );
}

// ── RecommendationSection ────────────────────────────────────────────────────
function RecommendationSection({ crop, location, plans, insights, onRecalculate, theme }) {
  return (
    <View>
      <Text style={[styles.recTitle, { color: theme.greenText }]}>Recommended Fertilizer Plan</Text>
      <View style={{ height: 4 }} />
      <Text style={[styles.recSubtitle, { color: theme.textMuted }]}>
        Tailored for {crop} cultivation in {location}
      </Text>
      <View style={{ height: 18 }} />

      {plans.map((plan, index) => (
        <View key={`${plan.name}-${index}`} style={index > 0 && { marginTop: 14 }}>
          <ProfessionalFertilizerCard plan={plan} index={index + 1} theme={theme} />
        </View>
      ))}

      {insights.length > 0 && (
        <>
          <View style={{ height: 18 }} />
          <View style={[styles.insightsCard, { backgroundColor: theme.predictedBg }]}>
            <Text style={[styles.insightsTitle, { color: theme.greenText }]}>Soil Condition Insights</Text>
            <View style={{ height: 8 }} />
            {insights.map((insight, i) => (
              <Text key={`${insight}-${i}`} style={[styles.insightItem, { color: theme.purpose }]}>
                {insight}
              </Text>
            ))}
          </View>
        </>
      )}

      <View style={{ height: 18 }} />
      <TouchableOpacity onPress={onRecalculate} activeOpacity={0.85} style={styles.recalcBtn}>
        <MaterialIcons name="refresh" size={20} color="#FFFFFF" />
        <Text style={styles.recalcBtnText}>Recalculate Recommendation</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── BottomActionBar ──────────────────────────────────────────────────────────
function BottomActionBar({ currentStep, isLoading, theme, insets, onBack, onNext, onCalculate }) {
  return (
    <View style={[styles.bottomBar, { backgroundColor: theme.card, paddingBottom: insets.bottom + 12 }]}>
      {currentStep === 2 && (
        <TouchableOpacity onPress={onBack} activeOpacity={0.85} style={[styles.bottomBtn, { backgroundColor: ACCENT_SOFT }]}>
          <Text style={[styles.bottomBtnText, { color: PRIMARY_DARK }]}>Back</Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity
        onPress={currentStep === 1 ? onNext : onCalculate}
        activeOpacity={0.85}
        disabled={isLoading}
        style={[styles.bottomBtn, { backgroundColor: PRIMARY, opacity: isLoading ? 0.6 : 1 }]}
      >
        {isLoading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={[styles.bottomBtnText, styles.bottomBtnTextWhite]}>
            {currentStep === 1 ? 'Next' : 'Calculate Recommendation'}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

// ── LoadingOverlay ───────────────────────────────────────────────────────────
function LoadingOverlay() {
  return (
    <View style={styles.loadingOverlay}>
      <View style={styles.loadingCard}>
        <ActivityIndicator size="large" color={PRIMARY} />
        <View style={{ height: 16 }} />
        <Text style={styles.loadingTitle}>Generating recommendation...</Text>
        <View style={{ height: 6 }} />
        <Text style={styles.loadingSubtitle}>Using ML and AI to prepare your fertilizer plan</Text>
      </View>
    </View>
  );
}

// ── Screen ───────────────────────────────────────────────────────────────────
export default function FertilizerRecommendationScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { isDark, selectedFarm } = useApp();
  const theme = useTheme(isDark);

  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [showRecalculateDialog, setShowRecalculateDialog] = useState(false);
  const [showSoilSheet, setShowSoilSheet] = useState(false);
  const [error, setError] = useState(null);
  const [predictedFertilizer, setPredictedFertilizer] = useState('');
  const [bagsPerAcre, setBagsPerAcre] = useState('');
  const [customPlans, setCustomPlans] = useState([]);
  const [legumeSavings, setLegumeSavings] = useState(null);
  const [resultText, setResultText] = useState('');

  const [form, setForm] = useState({
    crop: '',
    location: '',
    area: '',
    month: '',
    cropGrowthStage: '',
    season: '',
    irrigationType: '',
    previousCrop: '',
    previousFertilizerUsed: '',
    totalFarm: '',
    soil: 'Loamy',
    pH: '6.5',
    moisture: '45',
    temp: '30',
    humidity: '60',
    nitrogen: '40',
    phosphorus: '30',
    potassium: '20',
  });

  const update = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  // Prefill from the selected dashboard farm (LaunchedEffect(selectedFarm)).
  useEffect(() => {
    if (!selectedFarm) return;
    const farm = selectedFarm;
    setForm((f) => ({
      ...f,
      crop: getFieldValue(farm, ['cropType', 'crop'], f.crop),
      location: getFieldValue(farm, ['location', 'village', 'district'], f.location),
      area: getFieldValue(farm, ['area', 'farmArea', 'acres'], f.area),
      month: getFieldValue(farm, ['month', 'sowingMonth'], f.month),
      cropGrowthStage: getFieldValue(farm, ['cropGrowthStage', 'growthStage'], f.cropGrowthStage),
      season: getFieldValue(farm, ['season'], f.season),
      irrigationType: getFieldValue(farm, ['irrigationType', 'irrigation'], f.irrigationType),
      previousCrop: getFieldValue(farm, ['previousCrop'], f.previousCrop),
      previousFertilizerUsed: getFieldValue(
        farm,
        ['previousFertilizerUsed', 'fertilizerUsed', 'fertilizersUsed'],
        f.previousFertilizerUsed
      ),
      totalFarm: getFieldValue(farm, ['totalFarm', 'farmSize', 'acres'], f.totalFarm),
      soil: getFieldValue(farm, ['soilType', 'soil'], f.soil),
      pH: getFieldValue(farm, ['soilPH', 'soilPh', 'ph', 'pH'], f.pH),
      moisture: getFieldValue(farm, ['soilMoisture', 'moisture'], f.moisture),
      temp: getFieldValue(farm, ['temperature', 'temp'], f.temp),
      humidity: getFieldValue(farm, ['humidity'], f.humidity),
      nitrogen: getFieldValue(farm, ['nitrogen', 'n'], f.nitrogen),
      phosphorus: getFieldValue(farm, ['phosphorus', 'p'], f.phosphorus),
      potassium: getFieldValue(farm, ['potassium', 'k'], f.potassium),
    }));
  }, [selectedFarm]);

  const generate = async () => {
    setError(null);
    setPredictedFertilizer('');
    setBagsPerAcre('');
    setCustomPlans([]);
    setLegumeSavings(null);
    setResultText('');
    setIsLoading(true);
    try {
      const res = await api.getFertilizerRecommendation({
        crop: form.crop,
        nitrogen: form.nitrogen,
        phosphorus: form.phosphorus,
        potassium: form.potassium,
        ph: form.pH,
        previousCrop: form.previousCrop,
        soil: form.soil,
      });
      setPredictedFertilizer(res.recommendedFertilizer || res.primaryFertilizer || 'Neem-Coated Urea');
      setBagsPerAcre(res.bagsPerAcre || '');
      if (res.isLegumeSavingsActive || res.farmerSavingsInr > 0) {
        setLegumeSavings({
          savingsInr: res.farmerSavingsInr,
          nitrogenCreditKg: res.nitrogenCreditKg,
        });
      }
      if (Array.isArray(res.detailedPlans) && res.detailedPlans.length > 0) {
        setCustomPlans(res.detailedPlans);
      } else {
        const { resultText: text } = mockInference(form);
        setResultText(text);
      }
    } catch (e) {
      setError(e.message || 'Failed to calculate recommendation');
    } finally {
      setIsLoading(false);
    }
  };

  const confirmRecalculate = () => {
    setShowRecalculateDialog(false);
    setPredictedFertilizer('');
    setBagsPerAcre('');
    setCustomPlans([]);
    setLegumeSavings(null);
    setResultText('');
    setError(null);
    generate();
  };

  const plans = customPlans.length > 0 ? customPlans : parseStructuredPlans(resultText);
  const insights = soilInsights(form);
  const hasRecommendation = predictedFertilizer.trim() !== '' || resultText.trim() !== '';

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle="light-content" backgroundColor={PRIMARY} />

      {/* TopAppBar (PrimaryGreen, statusBarsPadding) */}
      <SafeAreaView edges={['top']} style={styles.topBarSafe}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={8}>
            <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>Fertilizer Advisor</Text>
        </View>
      </SafeAreaView>

      {/* Body */}
      <View style={[styles.body, { backgroundColor: theme.bg }]}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <HeaderCard
            crop={form.crop.trim() || 'Select crop from dashboard'}
            location={form.location.trim() || 'Enter location'}
            hasRecommendation={hasRecommendation}
            onRecalculate={() => setShowRecalculateDialog(true)}
          />

          <View style={{ height: 16 }} />

          <StepIndicator currentStep={currentStep} theme={theme} />

          <View style={{ height: 16 }} />

          {currentStep === 1 ? (
            <FormCard title="Farm Information" subtitle="Review auto-filled data and complete missing details" theme={theme}>
              <StyledInputField label="Crop" value={form.crop} onChangeText={update('crop')} theme={theme} />
              <View style={{ height: 12 }} />
              <StyledInputField label="Location" value={form.location} onChangeText={update('location')} theme={theme} />
              <View style={{ height: 12 }} />
              <StyledInputField label="Area" value={form.area} onChangeText={update('area')} theme={theme} />
              <View style={{ height: 12 }} />
              <StyledInputField label="Month" value={form.month} onChangeText={update('month')} theme={theme} />
              <View style={{ height: 12 }} />
              <StyledInputField label="Crop growth stage" value={form.cropGrowthStage} onChangeText={update('cropGrowthStage')} theme={theme} />
              <View style={{ height: 12 }} />
              <StyledInputField label="Season" value={form.season} onChangeText={update('season')} theme={theme} />
              <View style={{ height: 12 }} />
              <StyledInputField label="Irrigation type" value={form.irrigationType} onChangeText={update('irrigationType')} theme={theme} />
              <View style={{ height: 12 }} />
              <StyledInputField label="Previous crop" value={form.previousCrop} onChangeText={update('previousCrop')} theme={theme} />
              <View style={{ height: 12 }} />
              <StyledInputField label="Previous fertilizer used" value={form.previousFertilizerUsed} onChangeText={update('previousFertilizerUsed')} theme={theme} />
              <View style={{ height: 12 }} />
              <StyledInputField label="Total farm" value={form.totalFarm} onChangeText={update('totalFarm')} theme={theme} />
            </FormCard>
          ) : (
            <FormCard title="Soil & Nutrient Inputs" subtitle="These values are used by the ML model" theme={theme}>
              <DropdownField
                label="Soil type"
                value={form.soil}
                theme={theme}
                open={showSoilSheet}
                onPress={() => setShowSoilSheet(true)}
              />
              <View style={{ height: 12 }} />
              <StyledInputField label="Soil pH" value={form.pH} onChangeText={update('pH')} keyboardType="numeric" theme={theme} />
              <View style={{ height: 12 }} />
              <StyledInputField label="Soil moisture" value={form.moisture} onChangeText={update('moisture')} keyboardType="numeric" theme={theme} />
              <View style={{ height: 12 }} />
              <StyledInputField label="Temperature" value={form.temp} onChangeText={update('temp')} keyboardType="numeric" theme={theme} />
              <View style={{ height: 12 }} />
              <StyledInputField label="Humidity" value={form.humidity} onChangeText={update('humidity')} keyboardType="numeric" theme={theme} />
              <View style={{ height: 12 }} />
              <StyledInputField label="Nitrogen (N)" value={form.nitrogen} onChangeText={update('nitrogen')} keyboardType="numeric" theme={theme} />
              <View style={{ height: 12 }} />
              <StyledInputField label="Phosphorus (P)" value={form.phosphorus} onChangeText={update('phosphorus')} keyboardType="numeric" theme={theme} />
              <View style={{ height: 12 }} />
              <StyledInputField label="Potassium (K)" value={form.potassium} onChangeText={update('potassium')} keyboardType="numeric" theme={theme} />
            </FormCard>
          )}

          <View style={{ height: 20 }} />

          {predictedFertilizer.trim() !== '' && (
            <>
              <PredictedFertilizerCard
                fertilizerName={predictedFertilizer}
                bagsPerAcre={bagsPerAcre}
                theme={theme}
              />
              <View style={{ height: 16 }} />
              {legumeSavings && (
                <>
                  <LegumeSavingsBanner savings={legumeSavings} theme={theme} />
                  <View style={{ height: 16 }} />
                </>
              )}
            </>
          )}

          {error && (
            <>
              <ErrorCard message={error} />
              <View style={{ height: 16 }} />
            </>
          )}

          {plans.length > 0 && (
            <RecommendationSection
              crop={form.crop.trim() || 'your crop'}
              location={form.location.trim() || 'your location'}
              plans={plans}
              insights={insights}
              onRecalculate={() => setShowRecalculateDialog(true)}
              theme={theme}
            />
          )}

          <View style={{ height: 100 }} />
        </ScrollView>
      </View>

      {/* BottomActionBar (bottomBar) */}
      <BottomActionBar
        currentStep={currentStep}
        isLoading={isLoading}
        theme={theme}
        insets={insets}
        onBack={() => setCurrentStep(1)}
        onNext={() => setCurrentStep(2)}
        onCalculate={generate}
      />

      {isLoading && <LoadingOverlay />}

      {/* Recalculate dialog (AlertDialog, rounded 20) */}
      <Modal transparent visible={showRecalculateDialog} animationType="fade" onRequestClose={() => setShowRecalculateDialog(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setShowRecalculateDialog(false)} />
          <View style={[styles.dialog, { backgroundColor: theme.card }]}>
            <Text style={[styles.dialogTitle, { color: theme.greenText }]}>Recalculate recommendation</Text>
            <View style={{ height: 12 }} />
            <Text style={[styles.dialogBody, { color: theme.textMuted }]}>
              Previous recommendation will be removed and a new recommendation will be generated.
            </Text>
            <View style={styles.dialogActions}>
              <TouchableOpacity onPress={() => setShowRecalculateDialog(false)} style={styles.dialogBtn} hitSlop={4}>
                <Text style={[styles.dialogBtnText, { color: theme.textMuted }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={confirmRecalculate} style={styles.dialogBtn} hitSlop={4}>
                <Text style={[styles.dialogBtnText, { color: theme.greenText }]}>Continue</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Soil type dropdown sheet */}
      <OptionSheet
        visible={showSoilSheet}
        title="Soil type"
        options={SOIL_OPTIONS}
        selected={form.soil}
        onSelect={(opt) => {
          setForm((f) => ({ ...f, soil: opt }));
          setShowSoilSheet(false);
        }}
        onClose={() => setShowSoilSheet(false)}
        theme={theme}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  // ── Top app bar (TopAppBar, PrimaryGreen) ──
  topBarSafe: { backgroundColor: PRIMARY },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    paddingHorizontal: 4,
  },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  topBarTitle: { fontSize: 20, fontWeight: '600', color: '#FFFFFF', marginLeft: 4 },

  // ── Body ──
  body: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16 },

  // ── HeaderCard ──
  headerCard: {
    backgroundColor: ACCENT_SOFT,
    borderRadius: 24,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  headerCardInner: { flexDirection: 'row', alignItems: 'center', padding: 18 },
  headerIconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(255,255,255,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextWrap: { flex: 1, marginLeft: 14 },
  headerCrop: { fontSize: 21, fontWeight: '700', color: PRIMARY_DARK },
  headerLocation: { fontSize: 14, color: '#1B5E20', opacity: 0.75, marginTop: 2 },
  headerRefreshBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },

  // ── StepIndicator ──
  stepCard: {
    borderRadius: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  stepCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  stepChip: { flexDirection: 'row', alignItems: 'center' },
  stepCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumber: { fontSize: 13, fontWeight: '700' },
  stepTitle: { fontSize: 14, fontWeight: '500', marginLeft: 8 },
  stepDash: { fontSize: 14 },

  // ── FormCard ──
  formCard: {
    borderRadius: 24,
    padding: 18,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  formTitle: { fontSize: 18, fontWeight: '600' },
  formSubtitle: { fontSize: 13, marginTop: 4 },
  formBody: { marginTop: 16 },

  // ── Outlined fields ──
  fieldWrap: { width: '100%' },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    borderRadius: 16,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    position: 'relative',
    backgroundColor: 'transparent',
  },
  fieldLabel: {
    position: 'absolute',
    left: 14,
    fontSize: 16,
    paddingHorizontal: 4,
  },
  fieldLabelFloat: { top: -9, fontSize: 12 },
  fieldBody: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start' },
  fieldInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 0,
    paddingHorizontal: 4,
    minHeight: 54,
  },
  fieldTrailingBtn: {
    minWidth: 36,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdownValue: { fontSize: 16, paddingHorizontal: 4, flex: 1 },

  // ── Modal (OptionSheet + dialog) ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  modalSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#CCCCCC', alignSelf: 'center', marginVertical: 10 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginTop: 8 },
  modalList: { maxHeight: 320, marginTop: 8 },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  modalOptionText: { fontSize: 16 },

  dialog: { width: '100%', maxWidth: 400, borderRadius: 20, padding: 20 },
  dialogTitle: { fontSize: 18, fontWeight: '600' },
  dialogBody: { fontSize: 14, lineHeight: 20 },
  dialogActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 18, gap: 8 },
  dialogBtn: { paddingHorizontal: 12, paddingVertical: 10 },
  dialogBtnText: { fontSize: 14, fontWeight: '600' },

  // ── PredictedFertilizerCard ──
  predictedCard: {
    borderRadius: 20,
    padding: 18,
  },
  predictedLabel: { fontSize: 14, fontWeight: '500' },
  predictedName: { fontSize: 22, fontWeight: '700', marginTop: 6 },

  // ── ErrorCard ──
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: ERROR_CONTAINER,
    padding: 16,
  },
  errorText: { color: ON_ERROR_CONTAINER, fontSize: 14, marginLeft: 10, flex: 1 },

  // ── Plan cards ──
  planCard: {
    borderRadius: 20,
    padding: 18,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  planHeader: { flexDirection: 'row', alignItems: 'center' },
  planIndexCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(46,125,50,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  planIndex: { fontSize: 14, fontWeight: '700' },
  planName: { fontSize: 17, fontWeight: '700' },
  planPurposeLabel: { fontSize: 14, fontWeight: '500' },
  planPurpose: { fontSize: 14, lineHeight: 20 },
  detailRow: { flexDirection: 'row', alignItems: 'center' },
  detailTitle: { fontSize: 14, fontWeight: '500', width: 100 },
  detailValue: { fontSize: 15, fontWeight: '600', flex: 1 },

  // ── Insights ──
  insightsCard: { borderRadius: 20, padding: 18 },
  insightsTitle: { fontSize: 15, fontWeight: '600' },
  insightItem: { fontSize: 14, lineHeight: 20, marginTop: 6 },

  // ── Recommendation section ──
  recTitle: { fontSize: 19, fontWeight: '600' },
  recSubtitle: { fontSize: 13 },
  recalcBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PRIMARY,
    borderRadius: 16,
    paddingVertical: 14,
  },
  recalcBtnText: { color: '#FFFFFF', fontWeight: '600', fontSize: 15, marginLeft: 8 },

  // ── BottomActionBar ──
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -2 },
    elevation: 10,
  },
  bottomBtn: {
    flex: 1,
    minHeight: 50,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomBtnText: { fontSize: 15, fontWeight: '600' },
  bottomBtnTextWhite: { color: '#FFFFFF' },

  // ── LoadingOverlay ──
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: OVERLAY_DIM,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 30,
    paddingVertical: 24,
    alignItems: 'center',
    elevation: 12,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  loadingTitle: { fontSize: 16, fontWeight: '600', color: PRIMARY_DARK },
  loadingSubtitle: { fontSize: 13, color: TEXT_SOFT },
  savingsBanner: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 14,
  },
});
