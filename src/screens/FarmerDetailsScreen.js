// Ported from AgriVision — presentation/auth/FarmerDetailsScreen.kt
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';

import { useApp } from '../context/AppContext';
import { AppHeader } from '../components';
import * as api from '../services/api';

const PRIMARY = '#2E7D32'; // primaryGreen
const LIGHT_GRAY = '#D3D3D3'; // Color.LightGray
const GRAY = '#9E9E9E'; // Color.Gray
const ERROR_RED = '#D32F2F';
const VERY_LIGHT_GREEN = '#E8F5E9';
const LABEL_BG = '#FAFCF8'; // blend of the screen gradient at label height

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
];

const LANGUAGES = [
  'English', 'Hindi', 'Punjabi', 'Bengali', 'Tamil', 'Telugu', 'Marathi',
  'Gujarati', 'Kannada', 'Malayalam', 'Odia',
];

// Section header — same look as the Kotlin SectionHeader
function SectionTitle({ text }) {
  return (
    <Text style={styles.sectionTitle}>{text}</Text>
  );
}

// Floating-label outlined text field, mirroring the Compose OutlinedTextField
function MaterialField({
  label,
  placeholder,
  value,
  onChangeText,
  icon,
  keyboardType = 'default',
  prefix,
  multiline,
  minHeight = 56,
  maxLength,
  readOnly,
  disabled,
  trailing,
  onTrailingPress,
}) {
  const [focused, setFocused] = useState(false);
  const float = focused || !!value || disabled;
  const borderColor = disabled ? LIGHT_GRAY : focused ? PRIMARY : LIGHT_GRAY;
  const labelColor = disabled ? GRAY : focused ? PRIMARY : GRAY;
  const iconOffset = icon ? 44 : 14;

  return (
    <View style={[styles.field, { borderColor, minHeight }]}>
      {!!icon && (
        <MaterialIcons name={icon} size={22} color={PRIMARY} style={styles.fieldIcon} />
      )}
      <Text
        pointerEvents="none"
        style={[
          styles.fieldLabel,
          float ? styles.fieldLabelFloat : { top: (minHeight - 20) / 2 },
          { color: labelColor, left: iconOffset },
        ]}
      >
        {label}
      </Text>
      <View style={styles.fieldBody}>
        {!!prefix && <Text style={styles.fieldPrefix}>{prefix}</Text>}
        <TextInput
          style={[
            styles.fieldInput,
            multiline && [styles.fieldInputMultiline, float && { paddingTop: 18 }],
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={focused ? placeholder : undefined}
          placeholderTextColor="#9E9E9E"
          keyboardType={keyboardType}
          maxLength={maxLength}
          multiline={multiline}
          editable={!readOnly && !disabled}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          returnKeyType="next"
        />
      </View>
      {!!trailing &&
        (onTrailingPress ? (
          <TouchableOpacity style={styles.fieldTrailingBtn} onPress={onTrailingPress} hitSlop={8}>
            {trailing}
          </TouchableOpacity>
        ) : (
          <View style={styles.fieldTrailingBtn}>{trailing}</View>
        ))}
    </View>
  );
}

// Read-only outlined field that opens a bottom-sheet option list (ExposedDropdownMenuBox)
function DropdownField({ label, value, icon, open, onPress }) {
  const float = open || !!value;
  const borderColor = open ? PRIMARY : LIGHT_GRAY;
  const labelColor = open ? PRIMARY : GRAY;
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[styles.field, { borderColor, minHeight: 56 }]}
    >
      {!!icon && <MaterialIcons name={icon} size={22} color={PRIMARY} style={styles.fieldIcon} />}
      {float && (
        <Text
          pointerEvents="none"
          style={[styles.fieldLabel, styles.fieldLabelFloat, { color: labelColor, left: icon ? 44 : 14 }]}
        >
          {label}
        </Text>
      )}
      <View style={styles.fieldBody}>
        <Text style={[styles.dropdownValue, { color: value ? '#000' : GRAY }]} numberOfLines={1}>
          {value || label}
        </Text>
      </View>
      <MaterialIcons
        name={open ? 'arrow-drop-up' : 'arrow-drop-down'}
        size={26}
        color={GRAY}
        style={styles.fieldTrailingBtn}
      />
    </TouchableOpacity>
  );
}

// Bottom-sheet option list (Modal) — matches the Compose ExposedDropdownMenu
function OptionSheet({ visible, title, options, onSelect, onClose }) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={onClose} />
      <View style={styles.modalSheet}>
        <View style={styles.modalHandle} />
        <Text style={styles.modalTitle}>{title}</Text>
        <ScrollView style={{ maxHeight: 420 }} keyboardShouldPersistTaps="handled">
          {options.map((opt) => (
            <TouchableOpacity
              key={opt}
              style={styles.modalOption}
              activeOpacity={0.7}
              onPress={() => onSelect(opt)}
            >
              <Text style={styles.modalOptionText}>{opt}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

export default function FarmerDetailsScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { email } = route.params || {};
  const { user, setUser } = useApp();

  // Personal info
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [state, setState] = useState('');
  const [district, setDistrict] = useState('');
  const [pincode, setPincode] = useState('');

  // Optional fields
  const [aadhaarDigits, setAadhaarDigits] = useState('');
  const [aadhaarDisplay, setAadhaarDisplay] = useState('');
  const [farmSize, setFarmSize] = useState('');
  const [farmingExperience, setFarmingExperience] = useState('');
  const [primaryCrop, setPrimaryCrop] = useState('');
  const [language, setLanguage] = useState('English');

  // UI state
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingLocation, setFetchingLocation] = useState(false);

  // Dropdowns
  const [stateExpanded, setStateExpanded] = useState(false);
  const [languageExpanded, setLanguageExpanded] = useState(false);

  // Aadhaar auto-spacing: "XXXX XXXX XXXX" (AadhaarVisualTransformation)
  const formatAadhaar = (digits) => {
    const t = digits.slice(0, 12);
    let out = '';
    for (let i = 0; i < t.length; i++) {
      out += t[i];
      if (i === 3 || i === 7) out += ' ';
    }
    return out;
  };

  const handleAadhaarChange = (text) => {
    const digits = text.replace(/\D/g, '').slice(0, 12);
    setAadhaarDigits(digits);
    setAadhaarDisplay(formatAadhaar(digits));
    setErrorMessage('');
  };

  // ── Validation (matches the Kotlin exactly) ────────────────────────────
  const validatePhone = (p) => p.length === 10 && /^\d{10}$/.test(p);
  const validatePincode = (p) => p.length === 6 && /^\d{6}$/.test(p);
  const validateAadhaar = (a) => a.length === 12 && /^\d{12}$/.test(a);

  // ── Location (mock — real geocoding lands in src/services/api.js) ───────
  const requestLocation = () => {
    if (fetchingLocation) return;
    setFetchingLocation(true);
    setTimeout(() => {
      setAddress((v) => (v.trim() ? v : 'Village Road, Near Market, Nashik'));
      setState((v) => (v.trim() ? v : 'Maharashtra'));
      setDistrict((v) => (v.trim() ? v : 'Nashik'));
      setPincode((v) => (v.trim() ? v : '422001'));
      setFetchingLocation(false);
      Alert.alert('✅ Location fetched');
    }, 1200);
  };

  // ── Submit ─────────────────────────────────────────────────────────────
  const submit = async () => {
    if (!name.trim()) { setErrorMessage('⚠️ Please enter your full name'); return; }
    if (!validatePhone(phone)) { setErrorMessage('⚠️ Please enter a valid 10-digit mobile number'); return; }
    if (!address.trim()) { setErrorMessage('⚠️ Please enter your address'); return; }
    if (!state.trim()) { setErrorMessage('⚠️ Please select your state'); return; }
    if (!district.trim()) { setErrorMessage('⚠️ Please enter your district'); return; }
    if (!validatePincode(pincode)) { setErrorMessage('⚠️ Please enter a valid 6-digit PIN code'); return; }
    if (aadhaarDigits !== '' && !validateAadhaar(aadhaarDigits)) {
      setErrorMessage('⚠️ Please enter a valid 12-digit Aadhaar number');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    const profile = {
      uid: user?.uid || '',
      email: (email || '').trim(),
      name: name.trim(),
      phone: phone.trim(),
      address: address.trim(),
      state: state.trim(),
      district: district.trim(),
      pincode: pincode.trim(),
      farmingExperience: parseInt(farmingExperience, 10) || 0,
      totalLand: parseFloat(farmSize) || 0.0,
      language,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      profileImageUrl: '',
      isVerified: false,
    };

    try {
      await api.saveFarmerProfile(user?.uid || '', profile);
      setLoading(false);
      Alert.alert('✅ Profile saved successfully!', '', [
        {
          text: 'OK',
          onPress: () => {
            setUser({ email, ...profile });
            navigation.replace('HomeLanding');
          },
        },
      ]);
    } catch (e) {
      setLoading(false);
      const msg = '❌ Failed to save profile. Please try again.';
      setErrorMessage(msg);
      Alert.alert(msg);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader title="Complete Your Profile" color={PRIMARY} textColor="#FFFFFF" />
      <LinearGradient
        colors={['#FFFFFF', 'rgba(241,248,233,0.3)', '#FFFFFF']}
        style={styles.gradient}
      >
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Header card */}
            <View style={styles.headerCard}>
              <MaterialIcons name="person" size={36} color={PRIMARY} style={styles.headerIcon} />
              <View style={styles.flex}>
                <Text style={styles.headerTitle}>Farmer Registration</Text>
                <Text style={styles.headerSubtitle}>Please provide your details</Text>
              </View>
            </View>

            {/* Error message card */}
            {!!errorMessage && (
              <View style={styles.errorCard}>
                <MaterialIcons name="warning" size={24} color={ERROR_RED} style={styles.errorIcon} />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            )}

            {/* Personal Information */}
            <SectionTitle text="Personal Information" />

            <MaterialField
              label="Full Name *"
              placeholder="Enter your full name"
              value={name}
              onChangeText={(t) => { setName(t); setErrorMessage(''); }}
              icon="person"
            />

            <MaterialField
              label="Mobile Number *"
              placeholder="10-digit number"
              value={phone}
              onChangeText={(t) => { setPhone(t.replace(/\D/g, '').slice(0, 10)); setErrorMessage(''); }}
              icon="phone"
              keyboardType="phone-pad"
              prefix="+91 "
            />

            <MaterialField
              label="Email (Verified)"
              value={email}
              onChangeText={() => {}}
              icon="email"
              disabled
              trailing={<MaterialIcons name="check-circle" size={22} color={PRIMARY} />}
            />

            {/* ID Proof */}
            <SectionTitle text="ID Proof (Optional)" />

            <MaterialField
              label="Aadhaar Number"
              placeholder="12-digit Aadhaar number"
              value={aadhaarDisplay}
              onChangeText={handleAadhaarChange}
              icon="credit-card"
              keyboardType="number-pad"
              maxLength={14}
            />

            {/* Address Details */}
            <SectionTitle text="Address Details" />

            <MaterialField
              label="Full Address *"
              placeholder="House no., Street, Landmark"
              value={address}
              onChangeText={(t) => { setAddress(t); setErrorMessage(''); }}
              icon="home"
              multiline
              minHeight={90}
              trailing={
                fetchingLocation ? (
                  <ActivityIndicator size="small" color={PRIMARY} />
                ) : (
                  <MaterialIcons name="location-on" size={22} color={PRIMARY} />
                )
              }
              onTrailingPress={requestLocation}
            />

            <DropdownField
              label="State *"
              value={state}
              icon="map"
              open={stateExpanded}
              onPress={() => { setLanguageExpanded(false); setStateExpanded((v) => !v); }}
            />

            <MaterialField
              label="District *"
              placeholder="Enter your district"
              value={district}
              onChangeText={(t) => { setDistrict(t); setErrorMessage(''); }}
              icon="location-city"
            />

            <MaterialField
              label="PIN Code *"
              placeholder="6-digit PIN code"
              value={pincode}
              onChangeText={(t) => { setPincode(t.replace(/\D/g, '').slice(0, 6)); setErrorMessage(''); }}
              icon="pin-drop"
              keyboardType="number-pad"
            />

            {/* Farming Details */}
            <SectionTitle text="Farming Details (Optional)" />

            <MaterialField
              label="Farm Size (Acres)"
              placeholder="Enter farm size"
              value={farmSize}
              onChangeText={(t) => setFarmSize(t.replace(/[^\d.]/g, ''))}
              icon="terrain"
              keyboardType="numeric"
            />

            <MaterialField
              label="Farming Experience (Years)"
              placeholder="Years of experience"
              value={farmingExperience}
              onChangeText={(t) => setFarmingExperience(t.replace(/\D/g, '').slice(0, 2))}
              icon="timer"
              keyboardType="number-pad"
            />

            <MaterialField
              label="Primary Crop"
              placeholder="e.g., Wheat, Rice, Cotton"
              value={primaryCrop}
              onChangeText={setPrimaryCrop}
              icon="grass"
            />

            <DropdownField
              label="Preferred Language"
              value={language}
              icon="language"
              open={languageExpanded}
              onPress={() => { setStateExpanded(false); setLanguageExpanded((v) => !v); }}
            />

            <View style={styles.submitSpacer} />

            {/* Submit button */}
            <TouchableOpacity
              activeOpacity={0.85}
              disabled={loading}
              onPress={submit}
              style={[styles.submitBtn, loading && { opacity: 0.7 }]}
            >
              {loading ? (
                <View style={styles.submitRow}>
                  <ActivityIndicator color="#FFFFFF" size="small" />
                  <Text style={[styles.submitText, styles.submitTextSemi]}>Saving Profile...</Text>
                </View>
              ) : (
                <View style={styles.submitRow}>
                  <MaterialIcons name="check-circle" size={20} color="#FFFFFF" />
                  <Text style={[styles.submitText, styles.submitTextBold]}>Save & Continue</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Security notice */}
            <View style={styles.securityRow}>
              <MaterialIcons name="lock" size={14} color={GRAY} />
              <Text style={styles.securityText}>Your data is securely encrypted</Text>
            </View>

            <View style={{ height: 20 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>

      {/* Dropdown option sheets */}
      <OptionSheet
        visible={stateExpanded}
        title="Select your state"
        options={INDIAN_STATES}
        onClose={() => setStateExpanded(false)}
        onSelect={(opt) => { setState(opt); setStateExpanded(false); setErrorMessage(''); }}
      />
      <OptionSheet
        visible={languageExpanded}
        title="Select Language"
        options={LANGUAGES}
        onClose={() => setLanguageExpanded(false)}
        onSelect={(opt) => { setLanguage(opt); setLanguageExpanded(false); }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  flex: { flex: 1 },
  gradient: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingVertical: 16 },

  // Header card (veryLightGreen)
  headerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: VERY_LIGHT_GREEN,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  headerIcon: { marginRight: 12 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: PRIMARY },
  headerSubtitle: { fontSize: 13, color: GRAY, marginTop: 2 },

  // Error card (#FFEBEE)
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  errorIcon: { marginRight: 8 },
  errorText: { color: ERROR_RED, fontSize: 13, flex: 1 },

  // Section header
  sectionTitle: { fontSize: 15, fontWeight: '700', color: PRIMARY, marginBottom: 10, marginTop: 2 },

  // Outlined text field
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 14,
    position: 'relative',
    backgroundColor: 'transparent',
  },
  fieldIcon: { marginLeft: 12, marginRight: 4 },
  fieldBody: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  fieldPrefix: { fontSize: 16, fontWeight: '600', color: '#000', marginLeft: 2 },
  fieldInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
    paddingVertical: 0,
    paddingHorizontal: 8,
    minHeight: 54,
  },
  fieldInputMultiline: { textAlignVertical: 'top', paddingTop: 18 },
  fieldLabel: {
    position: 'absolute',
    fontSize: 16,
    backgroundColor: LABEL_BG,
    paddingHorizontal: 4,
  },
  fieldLabelFloat: {
    top: -9,
    fontSize: 12,
  },
  fieldTrailingBtn: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },

  // Dropdown field value text
  dropdownValue: { fontSize: 16, paddingHorizontal: 8 },

  // Option sheet modal
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 8,
    paddingBottom: 24,
    paddingTop: 8,
    maxHeight: 460,
  },
  modalHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#DDDDDD',
    marginBottom: 6,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: PRIMARY,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  modalOption: {
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E0E0E0',
  },
  modalOptionText: { fontSize: 16, color: '#212121' },

  // Submit button
  submitSpacer: { height: 16 },
  submitBtn: {
    height: 52,
    borderRadius: 14,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
  submitRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  submitText: { fontSize: 15, marginLeft: 8 },
  submitTextBold: { fontWeight: '700' },
  submitTextSemi: { fontWeight: '600' },

  // Security notice
  securityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    marginTop: 2,
  },
  securityText: { fontSize: 11, color: GRAY, marginLeft: 6 },
});
