// ─────────────────────────────────────────────────────────────────────────────
// AgriVision — Disease Detection screen
// Replicated to match screenshot media_1790187259852.jpg
// (image upload/capture options + crop-type dialog → DiseaseProcessing)
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';

import { useApp } from '../context/AppContext';

const GREEN_PRIMARY = '#2E7D32';

const CROP_OPTIONS = [
  'Tomato',
  'Potato',
  'Corn',
  'Rice',
  'Wheat',
  'Cotton',
  'Sugarcane',
  'Grape',
  'Apple',
  'Pepper',
  'Strawberry',
];

export default function DiseaseDetectionScreen() {
  const navigation = useNavigation();
  const { isDark } = useApp();

  const pageBg = isDark ? '#0D1F14' : '#F0F8F3';
  const cardWhite = isDark ? '#183824' : '#FFFFFF';
  const textDark = isDark ? '#E8F5E9' : '#112217';
  const textMuted = isDark ? '#8FA896' : '#7A8E80';
  const soonCardBg = isDark ? '#22222E' : '#EDEBF2';
  const soonIconColor = isDark ? '#9E9AA8' : '#827E8C';
  const soonBadgeBg = isDark ? '#333242' : '#DDD8E6';
  const soonTitleColor = isDark ? '#B8B4C4' : '#726E7D';
  const soonSubColor = isDark ? '#8C8898' : '#9692A0';

  const [lastImageUri, setLastImageUri] = useState(null);
  const [lastImageBase64, setLastImageBase64] = useState('');
  const [selectedCrop, setSelectedCrop] = useState('Tomato');
  const [showCropDialog, setShowCropDialog] = useState(false);

  // ── Gallery Picker ─────────────────────────────────────────────
  const openGallery = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Photo Library Permission Denied');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      base64: true,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setLastImageUri(result.assets[0].uri);
      setLastImageBase64(result.assets[0].base64 || '');
      setShowCropDialog(true);
    }
  };

  // ── Camera Capture ─────────────────────────────────────────────
  const openCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Camera Permission Denied');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
      base64: true,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setLastImageUri(result.assets[0].uri);
      setLastImageBase64(result.assets[0].base64 || '');
      setShowCropDialog(true);
    }
  };

  const cancelDialog = () => {
    setShowCropDialog(false);
    setLastImageUri(null);
    setLastImageBase64('');
  };

  const confirmAnalyze = () => {
    if (!lastImageUri) return;
    setShowCropDialog(false);
    navigation.navigate('DiseaseProcessing', {
      imageUri: lastImageUri,
      base64: lastImageBase64,
      cropType: selectedCrop,
    });
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor: pageBg }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={pageBg} />

      {/* Top App Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.7}
        >
          <MaterialIcons name="arrow-back" size={24} color={textDark} />
        </TouchableOpacity>
        <Text style={[styles.topBarTitle, { color: textDark }]}>Disease Detection</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <View style={styles.headerBlock}>
          <Text style={[styles.heading, { color: textDark }]}>
            How would you like to scan?
          </Text>
          <Text style={[styles.subtitle, { color: textMuted }]}>
            Upload or capture a clear image of the affected plant leaf
          </Text>
        </View>

        {/* Primary Scan Options Row */}
        <View style={styles.cardsRow}>
          {/* Card 1: Upload Image */}
          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: cardWhite }]}
            activeOpacity={0.85}
            onPress={openGallery}
          >
            <View style={styles.iconWrap}>
              <MaterialIcons name="image" size={38} color={GREEN_PRIMARY} />
            </View>
            <View style={styles.cardTextWrap}>
              <Text style={[styles.cardTitle, { color: textDark }]}>Upload Image</Text>
              <Text style={[styles.cardSub, { color: textMuted }]}>Choose from gallery</Text>
            </View>
          </TouchableOpacity>

          {/* Card 2: Take Photo */}
          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: cardWhite }]}
            activeOpacity={0.85}
            onPress={openCamera}
          >
            <View style={styles.iconWrap}>
              <MaterialIcons name="photo-camera" size={38} color={GREEN_PRIMARY} />
            </View>
            <View style={styles.cardTextWrap}>
              <Text style={[styles.cardTitle, { color: textDark }]}>Take Photo</Text>
              <Text style={[styles.cardSub, { color: textMuted }]}>Capture using camera</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Coming Soon Section */}
        <Text style={[styles.comingSoonHeading, { color: textMuted }]}>Coming Soon</Text>

        <View style={styles.cardsRow}>
          {/* Coming Soon 1: Rover Camera */}
          <View style={[styles.soonCard, { backgroundColor: soonCardBg }]}>
            <View style={styles.soonTopRow}>
              <MaterialIcons name="videocam" size={34} color={soonIconColor} />
              <View style={[styles.soonBadge, { backgroundColor: soonBadgeBg }]}>
                <Text style={[styles.soonBadgeText, { color: soonIconColor }]}>Soon</Text>
              </View>
            </View>
            <View style={styles.cardTextWrap}>
              <Text style={[styles.cardTitle, { color: soonTitleColor }]}>Rover Camera</Text>
              <Text style={[styles.cardSub, { color: soonSubColor }]}>Remote rover mode</Text>
            </View>
          </View>

          {/* Coming Soon 2: Auto Scan */}
          <View style={[styles.soonCard, { backgroundColor: soonCardBg }]}>
            <View style={styles.soonTopRow}>
              <MaterialIcons name="scanner" size={34} color={soonIconColor} />
              <View style={[styles.soonBadge, { backgroundColor: soonBadgeBg }]}>
                <Text style={[styles.soonBadgeText, { color: soonIconColor }]}>Soon</Text>
              </View>
            </View>
            <View style={styles.cardTextWrap}>
              <Text style={[styles.cardTitle, { color: soonTitleColor }]}>Auto Scan</Text>
              <Text style={[styles.cardSub, { color: soonSubColor }]}>Scan entire plant row</Text>
            </View>
          </View>
        </View>

        {/* Tips for Better Results Card */}
        <View style={[styles.tipsCard, { backgroundColor: cardWhite }]}>
          <View style={styles.tipsHeaderRow}>
            <MaterialIcons name="info" size={24} color={GREEN_PRIMARY} />
            <Text style={[styles.tipsHeading, { color: textDark }]}>Tips for Better Results</Text>
          </View>

          <View style={styles.tipsList}>
            <View style={styles.tipItemRow}>
              <Text style={styles.tipEmoji}>📸</Text>
              <Text style={[styles.tipText, { color: textDark }]}>
                Take clear, well-lit photos of affected leaves
              </Text>
            </View>

            <View style={styles.tipItemRow}>
              <Text style={styles.tipEmoji}>🔍</Text>
              <Text style={[styles.tipText, { color: textDark }]}>
                Focus on the diseased area
              </Text>
            </View>

            <View style={styles.tipItemRow}>
              <Text style={styles.tipEmoji}>☀️</Text>
              <Text style={[styles.tipText, { color: textDark }]}>
                Use natural daylight when possible
              </Text>
            </View>

            <View style={styles.tipItemRow}>
              <Text style={styles.tipEmoji}>📐</Text>
              <Text style={[styles.tipText, { color: textDark }]}>
                Fill the frame with the leaf
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Crop Selection Dialog */}
      <Modal transparent visible={showCropDialog} animationType="fade" onRequestClose={cancelDialog}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity activeOpacity={1} style={StyleSheet.absoluteFill} onPress={cancelDialog} />
          <View style={[styles.dialog, { backgroundColor: cardWhite }]}>
            <Text style={[styles.dialogTitle, { color: textDark }]}>Select Crop Type</Text>
            <Text style={[styles.dialogBody, { color: textMuted }]}>
              Choose the crop type for accurate disease detection:
            </Text>

            <ScrollView style={styles.cropList} keyboardShouldPersistTaps="handled">
              {CROP_OPTIONS.map((crop) => {
                const isSelected = selectedCrop === crop;
                return (
                  <TouchableOpacity
                    key={crop}
                    activeOpacity={0.7}
                    onPress={() => setSelectedCrop(crop)}
                    style={[
                      styles.cropRow,
                      { backgroundColor: isSelected ? '#2E7D321A' : 'transparent' },
                    ]}
                  >
                    <MaterialIcons
                      name={isSelected ? 'radio-button-checked' : 'radio-button-unchecked'}
                      size={20}
                      color={isSelected ? GREEN_PRIMARY : textMuted}
                    />
                    <View style={styles.cropTextWrap}>
                      <Text
                        style={[
                          styles.cropName,
                          { color: textDark, fontWeight: isSelected ? '700' : '400' },
                        ]}
                      >
                        {crop}
                      </Text>
                      {isSelected && (
                        <Text style={[styles.cropSelectedTag, { color: GREEN_PRIMARY }]}>Selected</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={styles.dialogActions}>
              <TouchableOpacity onPress={cancelDialog} style={styles.cancelBtn} hitSlop={4}>
                <Text style={[styles.cancelBtnText, { color: textMuted }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={confirmAnalyze} style={styles.analyzeBtn} activeOpacity={0.85}>
                <MaterialIcons name="check-circle" size={18} color="#FFFFFF" />
                <Text style={styles.analyzeText}>Analyze Disease</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },

  // ── Top App Bar ──
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 52,
  },
  backBtn: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -4,
  },
  topBarTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginLeft: 8,
  },

  // ── Scroll Content ──
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 36,
  },

  // ── Header Block ──
  headerBlock: {
    marginBottom: 24,
  },
  heading: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 13.5,
    lineHeight: 20,
    marginTop: 6,
  },

  // ── 2-Column Cards Row ──
  cardsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 14,
  },

  // ── Action Cards (Upload / Take Photo) ──
  actionCard: {
    flex: 1,
    minHeight: 146,
    borderRadius: 22,
    padding: 18,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  iconWrap: {
    alignItems: 'flex-start',
  },
  cardTextWrap: {
    marginTop: 22,
  },
  cardTitle: {
    fontSize: 15.5,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  cardSub: {
    fontSize: 12,
    marginTop: 3,
  },

  // ── Coming Soon Section ──
  comingSoonHeading: {
    fontSize: 17,
    fontWeight: '700',
    marginTop: 26,
    marginBottom: 14,
  },
  soonCard: {
    flex: 1,
    minHeight: 146,
    borderRadius: 22,
    padding: 18,
    justifyContent: 'space-between',
  },
  soonTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  soonBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  soonBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },

  // ── Tips Card ──
  tipsCard: {
    borderRadius: 22,
    padding: 20,
    marginTop: 28,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  tipsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  tipsHeading: {
    fontSize: 17,
    fontWeight: '700',
    marginLeft: 10,
  },
  tipsList: {
    gap: 14,
  },
  tipItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tipEmoji: {
    fontSize: 16,
    width: 24,
    textAlign: 'center',
  },
  tipText: {
    fontSize: 13.5,
    lineHeight: 19,
    flex: 1,
    marginLeft: 10,
    color: '#44554A',
  },

  // ── Crop selection dialog ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  dialog: {
    width: '100%',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 6,
  },
  dialogTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  dialogBody: {
    fontSize: 13.5,
    marginTop: 6,
  },
  cropList: {
    maxHeight: 340,
    marginTop: 16,
  },
  cropRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginVertical: 3,
  },
  cropTextWrap: {
    marginLeft: 12,
  },
  cropName: {
    fontSize: 15,
  },
  cropSelectedTag: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
  },
  dialogActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 18,
  },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  analyzeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: GREEN_PRIMARY,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  analyzeText: {
    color: '#FFFFFF',
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '600',
  },
});
