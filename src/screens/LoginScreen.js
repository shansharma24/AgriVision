// ─────────────────────────────────────────────────────────────────────────────
// AgriVision — Login screen
// Ported from presentation/auth/LoginScreen.kt
// (email/password login + signup tabs, Google sign-in, DigiLocker button)
// ─────────────────────────────────────────────────────────────────────────────
import React, { useRef, useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, Platform, KeyboardAvoidingView, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../theme';
import { useApp } from '../context/AppContext';
import * as api from '../services/api';

// Screen-local palette (LoginScreen.kt)
const primaryGreen = colors.primary;      // 0xFF2E7D32
const lightGreen = '#66BB6A';             // 0xFF66BB6A
const veryLightGreen = '#E8F5E9';         // 0xFFE8F5E9
const backgroundWhiteGreen = '#F1F8E9';   // 0xFFF1F8E9
const gray = '#888888';                   // Color.Gray
const darkGray = '#444444';               // Color.DarkGray
const lightGray = '#CCCCCC';              // Color.LightGray
const errorRed = colors.error;            // 0xFFD32F2F

const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ── Reusable outlined text field (LoginScreen.kt AuthTextField) ─────────────
function OutlinedField({
  label,
  placeholder,
  icon,
  value,
  onChangeText,
  error,
  keyboardType,
  returnKeyType,
  onSubmitEditing,
  inputRef,
  maxLength,
  prefix,
  autoCapitalize,
  secureTextEntry,
  rightAction,
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.fieldWrap}>
      <Text style={[styles.fieldLabel, { color: focused ? primaryGreen : gray }]}>{label}</Text>
      <View
        style={[
          styles.fieldBox,
          focused && styles.fieldBoxFocused,
          !!error && styles.fieldBoxError,
        ]}
      >
        {!!icon && <MaterialIcons name={icon} size={22} color={primaryGreen} style={styles.fieldIcon} />}
        {!!prefix && <Text style={styles.fieldPrefix}>{prefix}</Text>}
        <TextInput
          ref={inputRef}
          style={styles.fieldInput}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          keyboardType={keyboardType}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          maxLength={maxLength}
          autoCapitalize={autoCapitalize}
          secureTextEntry={secureTextEntry}
          placeholder={placeholder}
          placeholderTextColor={gray}
        />
        {rightAction}
      </View>
      {!!error && <Text style={styles.fieldError}>{error}</Text>}
    </View>
  );
}

// ── Password field with visibility toggle (PasswordTextField) ───────────────
function PasswordField({
  label,
  placeholder,
  value,
  onChangeText,
  error,
  visible,
  onToggle,
  returnKeyType,
  onSubmitEditing,
  inputRef,
}) {
  return (
    <OutlinedField
      label={label}
      placeholder={placeholder}
      icon="lock"
      value={value}
      onChangeText={onChangeText}
      error={error}
      returnKeyType={returnKeyType}
      onSubmitEditing={onSubmitEditing}
      inputRef={inputRef}
      secureTextEntry={!visible}
      rightAction={
        <TouchableOpacity onPress={onToggle} hitSlop={8} style={styles.visibilityBtn}>
          <MaterialIcons name={visible ? 'visibility' : 'visibility-off'} size={22} color={gray} />
        </TouchableOpacity>
      }
    />
  );
}

// ── Login/Signup tab button (TabButton) ─────────────────────────────────────
function TabButton({ text, selected, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[styles.tabButton, selected && styles.tabButtonSelected]}
    >
      <Text style={[styles.tabButtonText, selected && styles.tabButtonTextSelected]}>{text}</Text>
    </TouchableOpacity>
  );
}

// ── Fade transition for the animated auth content ───────────────────────────
function FadeView({ children, trigger }) {
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    opacity.setValue(0);
    Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }).start();
  }, [trigger, opacity]);
  return <Animated.View style={[styles.animatedWrap, { opacity }]}>{children}</Animated.View>;
}

// ── Full-width primary button (PrimaryButton) ───────────────────────────────
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

// ── Social sign-in button (SocialButton) ────────────────────────────────────
function SocialButton({
  text,
  icon,
  onPress,
  enabled,
  backgroundColor,
  textColor,
  borderColor,
  style,
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      disabled={!enabled}
      onPress={onPress}
      style={[styles.socialButton, { backgroundColor, borderColor }, style]}
    >
      <MaterialIcons name={icon} size={20} color={textColor} style={styles.socialButtonIcon} />
      <Text style={[styles.socialButtonText, { color: textColor }]}>{text}</Text>
    </TouchableOpacity>
  );
}

export default function LoginScreen() {
  const navigation = useNavigation();
  const { login } = useApp();

  // State (LoginScreen.kt)
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);

  // Validation states
  const [emailError, setEmailError] = useState(null);
  const [passwordError, setPasswordError] = useState(null);
  const [confirmPasswordError, setConfirmPasswordError] = useState(null);
  const [phoneError, setPhoneError] = useState(null);

  const passwordRef = useRef(null);
  const phoneRef = useRef(null);
  const confirmRef = useRef(null);

  // ── Validation functions ──────────────────────────────────────────────────
  const validateEmail = (value) => {
    let err = null;
    if (!value || value.trim() === '') err = 'Email is required';
    else if (!EMAIL_RE.test(value.trim())) err = 'Invalid email format';
    setEmailError(err);
    return err === null;
  };

  const validatePassword = (value) => {
    let err = null;
    if (!value) err = 'Password is required';
    else if (value.length < 6) err = 'Password must be at least 6 characters';
    else if (!/\d/.test(value)) err = 'Password must contain at least one number';
    else if (!/[A-Za-z]/.test(value)) err = 'Password must contain at least one letter';
    setPasswordError(err);
    return err === null;
  };

  const validateConfirmPassword = (value, confirm) => {
    let err = null;
    if (!confirm) err = 'Please confirm your password';
    else if (value !== confirm) err = 'Passwords do not match';
    setConfirmPasswordError(err);
    return err === null;
  };

  const validatePhoneNumber = (value) => {
    let err = null;
    if (!value) err = 'Phone number is required';
    else if (value.length !== 10) err = 'Phone number must be 10 digits';
    else if (!/^\d+$/.test(value)) err = 'Phone number must contain only digits';
    setPhoneError(err);
    return err === null;
  };

  // ── Auth actions ──────────────────────────────────────────────────────────
  // api.js has no email/password endpoint yet — mirror the Firebase mock (see
  // services/api.js). Loading/error UI is preserved from the Kotlin source.
  const performLogin = async () => {
    if (!validateEmail(email) || !validatePassword(password)) return;
    setLoading(true);
    try {
      await delay(800);
      const userEmail = email.trim();
      await login(userEmail);
      navigation.replace('FarmerDetails', { email: userEmail });
    } catch (e) {
      Alert.alert('Login failed', `Login failed: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const performSignup = async () => {
    if (
      !validateEmail(email) ||
      !validatePassword(password) ||
      !validateConfirmPassword(password, confirmPassword) ||
      !validatePhoneNumber(phoneNumber)
    ) {
      return;
    }
    setLoading(true);
    try {
      await delay(900);
      Alert.alert('Account Created', 'Account created! Verification email sent.');
      const userEmail = email.trim();
      await login(userEmail);
      navigation.replace('FarmerDetails', { email: userEmail });
    } catch (e) {
      Alert.alert('Signup failed', `Signup failed: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (email.trim() !== '' && validateEmail(email)) {
      await delay(500);
      Alert.alert('Password Reset', `Password reset email sent to ${email.trim()}`);
    } else {
      Alert.alert('Password Reset', 'Please enter a valid email address');
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const result = await api.signInWithGoogle();
      const userEmail = result?.email;
      if (!userEmail) {
        Alert.alert('Google Sign-In', 'Email not found from Google account');
        return;
      }
      await login(userEmail);
      navigation.replace('FarmerDetails', { email: userEmail });
    } catch (e) {
      Alert.alert('Google sign-in failed', `Google sign-in failed: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDigiLocker = () => {
    Alert.alert('DigiLocker', 'DigiLocker integration coming soon!');
  };

  const switchMode = (loginMode) => {
    setIsLoginMode(loginMode);
    setEmailError(null);
    setPasswordError(null);
    setConfirmPasswordError(null);
    setPhoneError(null);
  };

  // ── Forms ─────────────────────────────────────────────────────────────────
  const loginForm = (
    <View style={styles.form}>
      <OutlinedField
        label="Email Address"
        placeholder="Enter your email"
        icon="email"
        value={email}
        onChangeText={(t) => {
          setEmail(t.trim());
          setEmailError(null);
        }}
        keyboardType="email-address"
        autoCapitalize="none"
        returnKeyType="next"
        onSubmitEditing={() => passwordRef.current?.focus()}
        error={emailError}
      />
      <View style={styles.fieldGap} />
      <PasswordField
        label="Password"
        placeholder="Enter your password"
        value={password}
        onChangeText={(t) => {
          setPassword(t);
          setPasswordError(null);
        }}
        visible={passwordVisible}
        onToggle={() => setPasswordVisible(!passwordVisible)}
        returnKeyType="done"
        onSubmitEditing={performLogin}
        inputRef={passwordRef}
        error={passwordError}
      />
      <TouchableOpacity style={styles.forgotBtn} onPress={handleForgotPassword}>
        <Text style={styles.forgotText}>Forgot Password?</Text>
      </TouchableOpacity>
      <PrimaryButton text="Login" onPress={performLogin} loading={loading} />
    </View>
  );

  const signupForm = (
    <View style={styles.form}>
      <OutlinedField
        label="Email Address"
        placeholder="your.email@example.com"
        icon="email"
        value={email}
        onChangeText={(t) => {
          setEmail(t.trim());
          setEmailError(null);
        }}
        keyboardType="email-address"
        autoCapitalize="none"
        returnKeyType="next"
        onSubmitEditing={() => phoneRef.current?.focus()}
        error={emailError}
      />
      <View style={styles.fieldGap} />
      <OutlinedField
        label="Phone Number"
        placeholder="10-digit mobile number"
        icon="phone"
        value={phoneNumber}
        onChangeText={(t) => {
          const digits = t.replace(/\D/g, '');
          if (digits.length <= 10) {
            setPhoneNumber(digits);
            setPhoneError(null);
          }
        }}
        keyboardType="number-pad"
        returnKeyType="next"
        inputRef={phoneRef}
        maxLength={10}
        prefix="+91 "
        onSubmitEditing={() => passwordRef.current?.focus()}
        error={phoneError}
      />
      <View style={styles.fieldGap} />
      <PasswordField
        label="Password"
        placeholder="Min 6 chars with letter & number"
        value={password}
        onChangeText={(t) => {
          setPassword(t);
          setPasswordError(null);
        }}
        visible={passwordVisible}
        onToggle={() => setPasswordVisible(!passwordVisible)}
        returnKeyType="next"
        onSubmitEditing={() => confirmRef.current?.focus()}
        inputRef={passwordRef}
        error={passwordError}
      />
      <View style={styles.fieldGap} />
      <PasswordField
        label="Confirm Password"
        placeholder="Re-enter your password"
        value={confirmPassword}
        onChangeText={(t) => {
          setConfirmPassword(t);
          setConfirmPasswordError(null);
        }}
        visible={confirmPasswordVisible}
        onToggle={() => setConfirmPasswordVisible(!confirmPasswordVisible)}
        returnKeyType="done"
        onSubmitEditing={performSignup}
        inputRef={confirmRef}
        error={confirmPasswordError}
      />
      <PrimaryButton
        text="Create Account"
        onPress={performSignup}
        loading={loading}
        style={{ marginTop: 20 }}
      />
    </View>
  );

  // ── Render ────────────────────────────────────────────────────────────────
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
            {/* Full-width elevated card (RoundedCornerShape 0, elevation 8) */}
            <View style={styles.card}>
              {/* App icon with green gradient */}
              <LinearGradient
                colors={[primaryGreen, lightGreen]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.appIcon}
              >
                <MaterialIcons name="eco" size={36} color="#FFFFFF" />
              </LinearGradient>

              <Text style={styles.brandTitle}>AgriVision</Text>
              <Text style={styles.brandSubtitle}>
                {isLoginMode ? 'Welcome Back!' : 'Create Account'}
              </Text>

              {/* Toggle tabs — full width */}
              <View style={styles.tabs}>
                <TabButton text="Login" selected={isLoginMode} onPress={() => switchMode(true)} />
                <TabButton text="Sign Up" selected={!isLoginMode} onPress={() => switchMode(false)} />
              </View>

              {/* Animated content — fade between login / signup */}
              <FadeView trigger={isLoginMode}>
                {isLoginMode ? loginForm : signupForm}
              </FadeView>

              {/* Divider — full width */}
              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>  OR  </Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Google sign-in — full width */}
              <SocialButton
                text="Continue with Google"
                icon="account-circle"
                onPress={handleGoogleSignIn}
                enabled={!loading}
                backgroundColor={veryLightGreen}
                textColor={primaryGreen}
                borderColor={lightGray}
                style={styles.googleButton}
              />

              {/* DigiLocker — full width (disabled) */}
              <SocialButton
                text="Continue with DigiLocker"
                icon="account-balance"
                onPress={handleDigiLocker}
                enabled={false}
                backgroundColor="rgba(204,204,204,0.3)"
                textColor={gray}
                borderColor="rgba(204,204,204,0.3)"
              />

              {/* Terms & Privacy (signup only) */}
              {!isLoginMode && (
                <Text style={styles.termsText}>
                  {'By creating an account, you agree to our\nTerms of Service and Privacy Policy'}
                </Text>
              )}
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
  appIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitle: {
    marginTop: 16,
    fontSize: 28,
    fontWeight: '800',
    color: primaryGreen,
    letterSpacing: 0.5,
  },
  brandSubtitle: {
    marginTop: 4,
    fontSize: 15,
    fontWeight: '500',
    color: gray,
  },
  tabs: {
    flexDirection: 'row',
    width: '100%',
    marginTop: 24,
    backgroundColor: veryLightGreen,
    borderRadius: 30,
    padding: 4,
    justifyContent: 'space-evenly',
  },
  tabButton: {
    flex: 1,
    height: 42,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabButtonSelected: {
    backgroundColor: primaryGreen,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  tabButtonText: {
    fontSize: 15,
    fontWeight: '400',
    color: darkGray,
  },
  tabButtonTextSelected: {
    fontWeight: '700',
    color: '#FFFFFF',
  },
  animatedWrap: { width: '100%' },
  form: { width: '100%' },
  fieldGap: { height: 14 },
  fieldWrap: { width: '100%' },
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
  visibilityBtn: { padding: 2, marginLeft: 8 },
  forgotBtn: { alignSelf: 'flex-end', marginTop: 4, paddingVertical: 6 },
  forgotText: { color: primaryGreen, fontSize: 13, fontWeight: '600' },
  primaryButton: {
    width: '100%',
    height: 50,
    marginTop: 16,
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
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginTop: 20,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: lightGray },
  dividerText: { color: gray, fontSize: 13, fontWeight: '500' },
  googleButton: { marginTop: 20 },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: 48,
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  socialButtonIcon: { marginRight: 10 },
  socialButtonText: { fontSize: 14, fontWeight: '600' },
  termsText: {
    marginTop: 16,
    fontSize: 11,
    color: gray,
    textAlign: 'center',
    lineHeight: 15,
  },
});
