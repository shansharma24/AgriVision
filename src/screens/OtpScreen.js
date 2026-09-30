// ─────────────────────────────────────────────────────────────────────────────
// AgriVision — OTP screen
// Standalone OTP auth screen mirroring AuthRepository.kt test-mode flow:
//   sendOtp(phone) → verifyOtp(phone, code)
//   Test numbers: +919876543210 / OTP 123456, +919999888888 / OTP 654321
// Visual language matches LoginScreen.kt (gradient bg, elevated white card,
// green app icon, rounded fields, primary green buttons).
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, Platform, KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../theme';
import { useApp } from '../context/AppContext';
import * as api from '../services/api';

// Screen-local palette (matches LoginScreen.kt)
const primaryGreen = colors.primary;      // 0xFF2E7D32
const lightGreen = '#66BB6A';             // 0xFF66BB6A
const backgroundWhiteGreen = '#F1F8E9';   // 0xFFF1F8E9
const gray = '#888888';                   // Color.Gray
const lightGray = '#CCCCCC';              // Color.LightGray
const errorRed = colors.error;            // 0xFFD32F2F

function PrimaryButton({ text, onPress, loading, style }) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      disabled={loading}
      onPress={onPress}
      style={[styles.primaryButton, loading && { opacity: 0.6 }, style]}
    >
      {loading ? (
        <ActivityIndicator size="small" color="#FFFFFF" />
      ) : (
        <Text style={styles.primaryButtonText}>{text}</Text>
      )}
    </TouchableOpacity>
  );
}

export default function OtpScreen() {
  const navigation = useNavigation();
  const { login } = useApp();

  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('phone'); // 'phone' | 'otp'
  const [loading, setLoading] = useState(false);
  const [phoneError, setPhoneError] = useState(null);
  const [otpError, setOtpError] = useState(null);
  const [sentTo, setSentTo] = useState(null);
  const [focusedPhone, setFocusedPhone] = useState(false);
  const [focusedOtp, setFocusedOtp] = useState(false);

  const fullPhone = '+91' + phone;

  // AuthRepository.kt validatePhoneNumber
  const validatePhone = () => {
    let err = null;
    if (!phone) err = 'Phone number is required';
    else if (phone.length !== 10) err = 'Phone number must be 10 digits';
    else if (!/^\d+$/.test(phone)) err = 'Phone number must contain only digits';
    setPhoneError(err);
    return err === null;
  };

  // AuthRepository.kt sendOtp
  const handleSendOtp = async () => {
    if (!validatePhone()) return;
    setLoading(true);
    setOtpError(null);
    try {
      await api.sendOtp(fullPhone);
      setStep('otp');
      setSentTo(fullPhone);
    } catch (e) {
      Alert.alert('Failed to send OTP', e.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  // AuthRepository.kt resendOtp
  const handleResend = async () => {
    setLoading(true);
    try {
      await api.sendOtp(fullPhone);
      Alert.alert('OTP Resent', `A new OTP was sent to ${fullPhone}`);
    } catch (e) {
      Alert.alert('Failed to resend OTP', e.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  // AuthRepository.kt verifyOtp → successful login → FarmerDetails
  const handleVerify = async () => {
    if (!otp || otp.length !== 6) {
      setOtpError('Please enter the 6-digit OTP');
      return;
    }
    setLoading(true);
    setOtpError(null);
    try {
      const result = await api.verifyOtp(fullPhone, otp);
      const email = result?.email || `${fullPhone}@AgriVision.app`;
      await login(email);
      navigation.replace('FarmerDetails', { email });
    } catch (e) {
      setOtpError('Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#FFFFFF', `${backgroundWhiteGreen}66`, '#FFFFFF']}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={styles.safe}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Elevated white card (RoundedCornerShape 0, elevation 8) */}
            <View style={styles.card}>
              <TouchableOpacity
                style={styles.backBtn}
                onPress={() => navigation.goBack()}
                hitSlop={8}
              >
                <MaterialIcons name="arrow-back" size={24} color={primaryGreen} />
              </TouchableOpacity>

              {/* App icon with green gradient */}
              <LinearGradient
                colors={[primaryGreen, lightGreen]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.appIcon}
              >
                <MaterialIcons name="verified-user" size={36} color="#FFFFFF" />
              </LinearGradient>

              <Text style={styles.title}>Verify OTP</Text>
              <Text style={styles.subtitle}>
                {step === 'phone'
                  ? 'Enter your mobile number to receive a verification code'
                  : `We sent a verification code to ${sentTo || ''}`}
              </Text>

              {step === 'phone' ? (
                <>
                  <View style={styles.fieldWrap}>
                    <Text style={styles.fieldLabel}>Phone Number</Text>
                    <View
                      style={[
                        styles.fieldBox,
                        focusedPhone && styles.fieldBoxFocused,
                        !!phoneError && styles.fieldBoxError,
                      ]}
                    >
                      <MaterialIcons name="phone" size={22} color={primaryGreen} style={styles.fieldIcon} />
                      <Text style={styles.fieldPrefix}>+91 </Text>
                      <TextInput
                        style={styles.fieldInput}
                        value={phone}
                        onChangeText={(t) => {
                          const digits = t.replace(/\D/g, '');
                          if (digits.length <= 10) {
                            setPhone(digits);
                            setPhoneError(null);
                          }
                        }}
                        keyboardType="number-pad"
                        maxLength={10}
                        placeholder="10-digit mobile number"
                        placeholderTextColor={gray}
                        onFocus={() => setFocusedPhone(true)}
                        onBlur={() => setFocusedPhone(false)}
                      />
                    </View>
                    {!!phoneError && <Text style={styles.fieldError}>{phoneError}</Text>}
                  </View>

                  <PrimaryButton text="Send OTP" onPress={handleSendOtp} loading={loading} />
                </>
              ) : (
                <>
                  <View style={styles.fieldWrap}>
                    <Text style={styles.fieldLabel}>OTP</Text>
                    <View
                      style={[
                        styles.otpBox,
                        focusedOtp && styles.fieldBoxFocused,
                        !!otpError && styles.fieldBoxError,
                      ]}
                    >
                      <TextInput
                        style={styles.otpInput}
                        value={otp}
                        onChangeText={(t) => {
                          const digits = t.replace(/\D/g, '').slice(0, 6);
                          setOtp(digits);
                          setOtpError(null);
                        }}
                        keyboardType="number-pad"
                        maxLength={6}
                        placeholder="------"
                        placeholderTextColor={gray}
                        onFocus={() => setFocusedOtp(true)}
                        onBlur={() => setFocusedOtp(false)}
                      />
                    </View>
                    {!!otpError && <Text style={styles.fieldError}>{otpError}</Text>}
                  </View>

                  <PrimaryButton
                    text="Verify & Login"
                    onPress={handleVerify}
                    loading={loading}
                    style={{ marginTop: 20 }}
                  />

                  <TouchableOpacity
                    style={styles.resendBtn}
                    onPress={handleResend}
                    disabled={loading}
                  >
                    <Text style={styles.resendText}>Resend OTP</Text>
                  </TouchableOpacity>
                </>
              )}

              {/* Test-mode hint (AuthRepository.kt testNumbers) */}
              <Text style={styles.testHint}>
                {'Test numbers:\n+91 98765 43210 — OTP 123456\n+91 99998 88888 — OTP 654321'}
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: backgroundWhiteGreen },
  safe: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 36,
  },
  card: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 8,
  },
  backBtn: {
    alignSelf: 'flex-start',
    padding: 2,
    marginBottom: 8,
  },
  appIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    marginTop: 16,
    fontSize: 28,
    fontWeight: '800',
    color: primaryGreen,
    letterSpacing: 0.5,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 15,
    fontWeight: '500',
    color: gray,
    textAlign: 'center',
  },
  fieldWrap: { width: '100%', marginTop: 24 },
  fieldLabel: { fontSize: 12, fontWeight: '500', marginBottom: 4 },
  fieldBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: lightGray,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    minHeight: 54,
  },
  fieldBoxFocused: {
    borderColor: primaryGreen,
    backgroundColor: 'rgba(241,248,233,0.3)',
  },
  fieldBoxError: {
    borderColor: errorRed,
  },
  fieldIcon: { marginRight: 8 },
  fieldPrefix: { color: gray, fontSize: 14, marginRight: 4 },
  fieldInput: {
    flex: 1,
    fontSize: 14,
    color: '#000000',
    paddingVertical: 12,
  },
  fieldError: {
    color: errorRed,
    fontSize: 11,
    marginLeft: 14,
    marginTop: 3,
  },
  otpBox: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: lightGray,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpInput: {
    width: '100%',
    fontSize: 22,
    fontWeight: '700',
    color: '#000000',
    textAlign: 'center',
    letterSpacing: 10,
    paddingVertical: 12,
  },
  primaryButton: {
    width: '100%',
    height: 50,
    marginTop: 20,
    borderRadius: 12,
    backgroundColor: primaryGreen,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 6,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  resendBtn: { marginTop: 16, padding: 4 },
  resendText: { color: primaryGreen, fontSize: 14, fontWeight: '600' },
  testHint: {
    marginTop: 20,
    fontSize: 11,
    color: gray,
    textAlign: 'center',
    lineHeight: 16,
  },
});
