// ─────────────────────────────────────────────────────────────────────────────
// AgriVision — Add New Farm screen
// Ported from presentation/addNewFarm/AddNewFarm.kt
// (multi-section farm creation form: farm info, location with live fetch,
//  water & irrigation, description, optional photo picker)
// ─────────────────────────────────────────────────────────────────────────────
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
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';

import { colors } from '../theme';
import { useApp } from '../context/AppContext';
import * as api from '../services/api';

// Screen-local palette (AddNewFarm.kt)
const PRIMARY = colors.primary;        // primaryGreen 0xFF2E7D32
const LIGHT_GREEN = '#66BB6A';         // lightGreen 0xFF66BB6A
const VERY_LIGHT_GREEN = '#E8F5E9';    // veryLightGreen 0xFFE8F5E9
const LIGHT_GRAY = '#D3D3D3';          // Color.LightGray
const GRAY = '#808080';                // Color.Gray
const ERROR_RED = colors.error;        // 0xFFD32F2F

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ── Dropdown options (AddNewFarm.kt) ────────────────────────────────────────
const CROP_TYPES = [
  '🌾 Wheat', '🍚 Rice', '🌽 Corn', '🌿 Cotton', '🎋 Sugarcane',
  '🌾 Barley', '🫘 Soybean', '🥔 Potato', '🍅 Tomato',
  '🥬 Vegetables', '🌻 Sunflower', '🫑 Chili', '🧅 Onion',
  '🥕 Carrot', '🫛 Pulses', '🌱 Other',
];

const SOIL_TYPES = [
  '🟤 Clay Soil', '🟡 Sandy Soil', '🟢 Loamy Soil',
  '🔵 Silt Soil', '🟫 Peat Soil', '⚪ Chalky Soil',
  '⚫ Black Soil', '🔴 Red Soil', '🟠 Alluvial Soil',
  '🌾 Laterite Soil', '✏️ Custom (Type Below)',
];

const WATER_SOURCES = [
  '💧 Borewell', '🏞️ Canal', '🌊 River', '💦 Pond/Lake',
  '🌧️ Rainwater', '🚰 Municipal Supply', '⛲ Tube Well', '✏️ Other (Specify Below)',
];

const IRRIGATION_TYPES = [
  '💧 Drip Irrigation', '🌊 Sprinkler', '🚰 Flood Irrigation',
  '🎋 Manual Watering', '💦 Rain-fed', '🔷 Mixed', '✏️ Other (Specify Below)',
];

// ── Section header (AddNewFarm.kt SectionHeader) ────────────────────────────
function SectionTitle({ text }) {
  return <Text style={styles.sectionTitle}>{text}</Text>;
}

// ── Outlined text field (AddNewFarm.kt CustomTextField) ─────────────────────
function OutlinedField({
  label,
  placeholder,
  value,
  onChangeText,
  icon,
  keyboardType = 'default',
  multiline,
  minHeight = 56,
  maxLength,
  editable = true,
  trailing,
  onTrailingPress,
  error,
}) {
  const [focused, setFocused] = useState(false);
  const float = focused || !!value;
  const borderColor = error ? ERROR_RED : focused ? PRIMARY : LIGHT_GRAY;
  const labelColor = error ? ERROR_RED : focused ? PRIMARY : GRAY;
  const iconOffset = icon ? 44 : 14;
  return (
    <View style={styles.fieldWrap}>
      <View style={[styles.field, { borderColor, minHeight }]}>
        {!!icon && <MaterialIcons name={icon} size={22} color={PRIMARY} style={styles.fieldIcon} />}
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
          <TextInput
            style={[
              styles.fieldInput,
              multiline && [styles.fieldInputMultiline, float && { paddingTop: 18 }],
            ]}
            value={value}
            onChangeText={onChangeText}
            placeholder={focused ? placeholder : undefined}
            placeholderTextColor={GRAY}
            keyboardType={keyboardType}
            maxLength={maxLength}
            multiline={multiline}
            editable={editable}
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
      {!!error && <Text style={styles.supportText}>{error}</Text>}
    </View>
  );
}

// ── Read-only dropdown field (AddNewFarm.kt CustomDropdown) ─────────────────
function DropdownField({ label, placeholder, value, icon, open, error, onPress }) {
  const float = open || !!value;
  const hasLabel = !!label;
  const borderColor = error ? ERROR_RED : open ? PRIMARY : LIGHT_GRAY;
  const labelColor = error ? ERROR_RED : open ? PRIMARY : GRAY;
  const iconOffset = icon ? 44 : 14;

  let bodyText;
  if (value) bodyText = value;
  else if (!hasLabel) bodyText = placeholder;
  else if (float) bodyText = placeholder;
  else bodyText = label;

  return (
    <View style={styles.fieldWrap}>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onPress}
        style={[styles.field, { borderColor, minHeight: 56 }]}
      >
        {!!icon && <MaterialIcons name={icon} size={22} color={PRIMARY} style={styles.fieldIcon} />}
        {hasLabel && (
          <Text
            pointerEvents="none"
            style={[
              styles.fieldLabel,
              float ? styles.fieldLabelFloat : { top: (56 - 20) / 2 },
              { color: labelColor, left: iconOffset },
            ]}
          >
            {label}
          </Text>
        )}
        <View style={styles.fieldBody}>
          <Text
            style={[styles.dropdownValue, { color: value ? '#000' : GRAY }]}
            numberOfLines={1}
          >
            {bodyText}
          </Text>
        </View>
        <MaterialIcons
          name={open ? 'arrow-drop-up' : 'arrow-drop-down'}
          size={26}
          color={GRAY}
          style={styles.fieldTrailingBtn}
        />
      </TouchableOpacity>
      {!!error && <Text style={styles.supportText}>{error}</Text>}
    </View>
  );
}

// ── Bottom-sheet option list (Modal) — matches the ExposedDropdownMenu ──────
function OptionSheet({ visible, title, options, onSelect, onClose }) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={onClose} />
      <View style={styles.modalSheet}>
        <View style={styles.modalHandle} />
        <Text style={styles.modalTitle}>{title}</Text>
        <ScrollView style={styles.modalList} keyboardShouldPersistTaps="handled">
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

// ── Farm Location field (multiline + auto-detect + map pin) ─────────────────
function LocationField({ value, onChangeText, error, isFetching, onDetect, onMap }) {
  const [focused, setFocused] = useState(false);
  const float = focused || !!value;
  const minHeight = 76;
  const borderColor = error ? ERROR_RED : focused ? PRIMARY : LIGHT_GRAY;
  const labelColor = error ? ERROR_RED : focused ? PRIMARY : GRAY;
  return (
    <View style={styles.fieldWrap}>
      <View style={[styles.field, { borderColor, minHeight }]}>
        <MaterialIcons name="location-on" size={22} color={PRIMARY} style={styles.fieldIcon} />
        <Text
          pointerEvents="none"
          style={[
            styles.fieldLabel,
            float ? styles.fieldLabelFloat : { top: (minHeight - 20) / 2 },
            { color: labelColor, left: 44 },
          ]}
        >
          Farm Location *
        </Text>
        <View style={styles.fieldBody}>
          <TextInput
            style={[styles.fieldInput, styles.fieldInputMultiline, float && { paddingTop: 18 }]}
            value={value}
            onChangeText={onChangeText}
            placeholder={focused ? 'Enter or auto-detect location' : undefined}
            placeholderTextColor={GRAY}
            multiline
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            returnKeyType="next"
          />
        </View>
        <TouchableOpacity
          style={styles.fieldTrailingBtn}
          onPress={onDetect}
          disabled={isFetching}
          hitSlop={6}
        >
          {isFetching ? (
            <ActivityIndicator size="small" color={PRIMARY} />
          ) : (
            <MaterialIcons name="my-location" size={22} color={PRIMARY} />
          )}
        </TouchableOpacity>
        <TouchableOpacity style={styles.fieldTrailingBtn} onPress={onMap} hitSlop={6}>
          <MaterialIcons name="map" size={22} color={PRIMARY} />
        </TouchableOpacity>
      </View>
      {!!error && <Text style={styles.supportText}>{error}</Text>}
    </View>
  );
}

export default function AddNewFarmScreen() {
  const navigation = useNavigation();
  const { user, addFarm } = useApp();

  // ---------------- Fields ----------------
  const [name, setName] = useState('');
  const [cropType, setCropType] = useState('');
  const [soilType, setSoilType] = useState('');
  const [customSoilType, setCustomSoilType] = useState('');
  const [acres, setAcres] = useState('');
  const [locationText, setLocationText] = useState('');
  const [lat, setLat] = useState(null);
  const [lon, setLon] = useState(null);
  const [farmImageUri, setFarmImageUri] = useState(null);
  const [waterSource, setWaterSource] = useState('');
  const [customWaterSource, setCustomWaterSource] = useState('');
  const [irrigationType, setIrrigationType] = useState('');
  const [customIrrigationType, setCustomIrrigationType] = useState('');
  const [farmDescription, setFarmDescription] = useState('');

  // Validation States
  const [nameError, setNameError] = useState(null);
  const [cropTypeError, setCropTypeError] = useState(null);
  const [soilTypeError, setSoilTypeError] = useState(null);
  const [acresError, setAcresError] = useState(null);
  const [locationError, setLocationError] = useState(null);

  // Loading States
  const [isSaving, setIsSaving] = useState(false);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [soilAutoDetected, setSoilAutoDetected] = useState(false);

  // Dropdown expanded states
  const [cropTypeExpanded, setCropTypeExpanded] = useState(false);
  const [soilTypeExpanded, setSoilTypeExpanded] = useState(false);
  const [waterSourceExpanded, setWaterSourceExpanded] = useState(false);
  const [irrigationExpanded, setIrrigationExpanded] = useState(false);

  const openDropdown = (which) => {
    setCropTypeExpanded(which === 'crop');
    setSoilTypeExpanded(which === 'soil');
    setWaterSourceExpanded(which === 'water');
    setIrrigationExpanded(which === 'irrigation');
    if (which === 'soil') setSoilAutoDetected(false); // clear auto-detect on manual change
  };

  // ── Image picker (expo-image-picker) ──────────────────────────────────────
  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setFarmImageUri(result.assets[0].uri);
      }
    } catch (e) {
      Alert.alert('Image picker failed', e.message);
    }
  };

  // ── Location fetch with soil detection (mocked; real geocoding lands in
  //    src/services/api.js). The Android app requests location permissions —
  //    here they are mocked as granted. ──────────────────────────────────────
  const requestLocation = () => {
    if (isFetchingLocation) return;
    const locationPermissionGranted = true; // TODO: expo-location permission
    if (!locationPermissionGranted) {
      Alert.alert('📍 Location permission denied');
      setLocationError('Location permission required');
      return;
    }
    setLocationError(null);
    setIsFetchingLocation(true);
    setTimeout(() => {
      // Mock geocode — region maps to Maharashtra → Black Soil (fetchLocationAndSoil)
      setLat(19.9975);
      setLon(73.7898);
      setLocationText('Village Road, Near Market, Nashik, Maharashtra 422001');
      setSoilType('⚫ Black Soil');
      setSoilAutoDetected(true);
      setLocationError(null);
      setIsFetchingLocation(false);
      Alert.alert('✅ Location & soil auto-detected');
    }, 1200);
  };

  const onMapPin = () => {
    Alert.alert('🗺️ Map view coming soon!');
  };

  // ── Validation Function (AddNewFarm.kt validateFields) ────────────────────
  const validateFields = () => {
    let isValid = true;

    if (!name.trim()) {
      setNameError('Farm name is required');
      isValid = false;
    } else {
      setNameError(null);
    }

    if (!cropType.trim()) {
      setCropTypeError('Crop type is required');
      isValid = false;
    } else {
      setCropTypeError(null);
    }

    if (!soilType.trim()) {
      setSoilTypeError('Soil type is required');
      isValid = false;
    } else if (soilType.includes('Custom') && !customSoilType.trim()) {
      setSoilTypeError('Please specify custom soil type');
      isValid = false;
    } else {
      setSoilTypeError(null);
    }

    if (!acres.trim()) {
      setAcresError('Area is required');
      isValid = false;
    } else if (isNaN(parseFloat(acres)) || parseFloat(acres) <= 0) {
      setAcresError('Enter valid area');
      isValid = false;
    } else {
      setAcresError(null);
    }

    if (!locationText.trim()) {
      setLocationError('Location is required');
      isValid = false;
    } else {
      setLocationError(null);
    }

    return isValid;
  };

  // ── Save Function ─────────────────────────────────────────────────────────
  const saveFarm = async () => {
    if (!validateFields()) {
      Alert.alert('⚠️ Please fix all errors');
      return;
    }

    if (!user || !user.uid) {
      Alert.alert('❌ Error: User not logged in');
      return;
    }

    setIsSaving(true);
    try {
      // Upload image if selected (mocked — the local URI stands in for the
      // Firebase Storage download URL that uploadImage() would return).
      let imageUrl = null;
      if (farmImageUri) {
        setIsUploadingImage(true);
        await delay(700);
        imageUrl = farmImageUri;
        setIsUploadingImage(false);
      }
      await delay(500);

      // Get final values (use custom if "Other"/"Custom" selected)
      const finalSoilType = soilType.includes('Custom') ? customSoilType : soilType;
      const finalWaterSource = waterSource.includes('Other') ? customWaterSource : waterSource;
      const finalIrrigationType = irrigationType.includes('Other') ? customIrrigationType : irrigationType;

      const farm = {
        name: name.trim(),
        location: locationText.trim(),
        lat: lat || 0.0,
        lon: lon || 0.0,
        acres: Math.trunc(parseFloat(acres)),
        cropType: cropType.trim(),
        soilType: finalSoilType.trim(),
        backgroundRes: 'farm_placeholder',
        ownerId: user.uid,
        userEmail: user.email || '',
        imageUrl,
        waterSource: finalWaterSource.trim(),
        irrigationType: finalIrrigationType.trim(),
        description: farmDescription.trim(),
        status: 'HEALTHY',
        isActive: true,
      };

      await api.saveFarm(farm);
      addFarm(farm);
      setIsSaving(false);
      Alert.alert('🌾 Farm Added Successfully!', '', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      setIsSaving(false);
      setIsUploadingImage(false);
      Alert.alert(`❌ Failed: ${e.message || 'Something went wrong'}`);
    }
  };

  const busy = isSaving || isUploadingImage;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* TopAppBar — agriculture icon + "Add New Farm" on primaryGreen */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.headerBtn}
          hitSlop={8}
        >
          <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <MaterialIcons name="agriculture" size={24} color="#FFFFFF" />
          <Text style={styles.headerTitle}>Add New Farm</Text>
        </View>
        <View style={styles.headerBtn} />
      </View>

      <KeyboardAvoidingView
        style={styles.body}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Farm Information Section */}
          <SectionTitle text="🌾 Farm Information" />

          {/* Optional photo picker */}
          {farmImageUri ? (
            <View style={styles.photoPreviewWrap}>
              <Image source={{ uri: farmImageUri }} style={styles.photoPreview} resizeMode="cover" />
              <TouchableOpacity
                style={styles.photoRemove}
                onPress={() => setFarmImageUri(null)}
                hitSlop={8}
              >
                <MaterialIcons name="close" size={16} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={styles.photoCaption}>Farm Photo (Optional)</Text>
            </View>
          ) : (
            <TouchableOpacity style={styles.photoPicker} activeOpacity={0.8} onPress={pickImage}>
              <MaterialIcons name="add-photo-alternate" size={30} color={PRIMARY} />
              <Text style={styles.photoPickerText}>Add Farm Photo (Optional)</Text>
              <Text style={styles.photoPickerSub}>Tap to pick an image from gallery</Text>
            </TouchableOpacity>
          )}

          <OutlinedField
            label="Farm Name *"
            placeholder="e.g., Green Valley Farm"
            icon="agriculture"
            value={name}
            onChangeText={(t) => {
              setName(t);
              setNameError(null);
            }}
            error={nameError}
          />

          <DropdownField
            label="Crop Type *"
            placeholder="Select crop type"
            icon="eco"
            value={cropType}
            open={cropTypeExpanded}
            error={cropTypeError}
            onPress={() => openDropdown('crop')}
          />

          {/* Soil Type with Auto-detect indicator */}
          <View style={styles.soilHeaderRow}>
            <Text style={[styles.soilHeaderText, { color: soilAutoDetected ? PRIMARY : '#000' }]}>
              Soil Type *
            </Text>
            {soilAutoDetected && (
              <View style={styles.autoDetectRow}>
                <MaterialIcons name="check-circle" size={16} color={PRIMARY} />
                <Text style={styles.autoDetectText}>Auto-detected</Text>
              </View>
            )}
          </View>

          <DropdownField
            label=""
            placeholder="Auto-detect or select manually"
            icon="terrain"
            value={soilType}
            open={soilTypeExpanded}
            error={soilTypeError}
            onPress={() => openDropdown('soil')}
          />

          {soilType.includes('Custom') && (
            <OutlinedField
              label="Specify Soil Type *"
              placeholder="Enter custom soil type"
              icon="edit"
              value={customSoilType}
              onChangeText={(t) => {
                setCustomSoilType(t);
                setSoilTypeError(null);
              }}
            />
          )}

          <OutlinedField
            label="Area (Acres) *"
            placeholder="e.g., 25.5"
            icon="landscape"
            keyboardType="decimal-pad"
            value={acres}
            onChangeText={(t) => {
              if (t === '' || /^\d*\.?\d*$/.test(t)) {
                setAcres(t);
                setAcresError(null);
              }
            }}
            error={acresError}
          />

          <View style={styles.divider} />

          {/* Location Section */}
          <SectionTitle text="📍 Location Details" />

          <LocationField
            value={locationText}
            onChangeText={(t) => {
              setLocationText(t);
              setLocationError(null);
            }}
            error={locationError}
            isFetching={isFetchingLocation}
            onDetect={requestLocation}
            onMap={onMapPin}
          />

          {/* Coordinates Display */}
          {lat !== null && lon !== null && (
            <View style={styles.coordCard}>
              <MaterialIcons name="gps-fixed" size={22} color={PRIMARY} />
              <View style={styles.coordBody}>
                <Text style={styles.coordLabel}>GPS Coordinates</Text>
                <Text style={styles.coordValue}>
                  {`Lat: ${lat.toFixed(6)} | Lon: ${lon.toFixed(6)}`}
                </Text>
              </View>
            </View>
          )}

          <View style={styles.divider} />

          {/* Water & Irrigation Section */}
          <SectionTitle text="💧 Water & Irrigation (Optional)" />

          <DropdownField
            label="Water Source"
            placeholder="Select water source"
            icon="water-drop"
            value={waterSource}
            open={waterSourceExpanded}
            onPress={() => openDropdown('water')}
          />

          {waterSource.includes('Other') && (
            <OutlinedField
              label="Specify Water Source"
              placeholder="Enter water source"
              icon="edit"
              value={customWaterSource}
              onChangeText={setCustomWaterSource}
            />
          )}

          <DropdownField
            label="Irrigation Type"
            placeholder="Select irrigation method"
            icon="shower"
            value={irrigationType}
            open={irrigationExpanded}
            onPress={() => openDropdown('irrigation')}
          />

          {irrigationType.includes('Other') && (
            <OutlinedField
              label="Specify Irrigation Type"
              placeholder="Enter irrigation method"
              icon="edit"
              value={customIrrigationType}
              onChangeText={setCustomIrrigationType}
            />
          )}

          <OutlinedField
            label="Farm Description (Optional)"
            placeholder="Add any additional details..."
            icon="description"
            value={farmDescription}
            onChangeText={setFarmDescription}
            multiline
            minHeight={100}
            maxLength={500}
          />

          {/* Save Button */}
          <TouchableOpacity
            activeOpacity={0.85}
            disabled={busy}
            onPress={saveFarm}
            style={[styles.saveButton, busy && styles.saveButtonDisabled]}
          >
            {busy ? (
              <View style={styles.saveRow}>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={styles.saveButtonText}>
                  {isUploadingImage ? 'Uploading Image...' : 'Saving Farm...'}
                </Text>
              </View>
            ) : (
              <View style={styles.saveRow}>
                <MaterialIcons name="save" size={22} color="#FFFFFF" />
                <Text style={styles.saveButtonText}>Save Farm</Text>
              </View>
            )}
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Dropdown option sheets */}
      <OptionSheet
        visible={cropTypeExpanded}
        title="Select crop type"
        options={CROP_TYPES}
        onClose={() => setCropTypeExpanded(false)}
        onSelect={(opt) => {
          setCropType(opt);
          setCropTypeError(null);
          setCropTypeExpanded(false);
        }}
      />
      <OptionSheet
        visible={soilTypeExpanded}
        title="Auto-detect or select manually"
        options={SOIL_TYPES}
        onClose={() => setSoilTypeExpanded(false)}
        onSelect={(opt) => {
          setSoilType(opt);
          setSoilTypeError(null);
          setSoilAutoDetected(false);
          setSoilTypeExpanded(false);
        }}
      />
      <OptionSheet
        visible={waterSourceExpanded}
        title="Select water source"
        options={WATER_SOURCES}
        onClose={() => setWaterSourceExpanded(false)}
        onSelect={(opt) => {
          setWaterSource(opt);
          setWaterSourceExpanded(false);
        }}
      />
      <OptionSheet
        visible={irrigationExpanded}
        title="Select irrigation method"
        options={IRRIGATION_TYPES}
        onClose={() => setIrrigationExpanded(false)}
        onSelect={(opt) => {
          setIrrigationType(opt);
          setIrrigationExpanded(false);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: PRIMARY },
  body: { flex: 1, backgroundColor: '#FFFFFF' },
  scroll: { padding: 20, gap: 16 },

  // Header (TopAppBar)
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    height: 56,
    backgroundColor: PRIMARY,
    elevation: 4,
  },
  headerBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitleWrap: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#FFFFFF', marginLeft: 12 },

  // Section header
  sectionTitle: { fontSize: 17, fontWeight: '700', color: PRIMARY },

  // Divider
  divider: { height: 1, backgroundColor: LIGHT_GRAY },

  // Outlined field
  fieldWrap: {},
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    position: 'relative',
    backgroundColor: 'transparent',
  },
  fieldIcon: { marginLeft: 12, marginRight: 4 },
  fieldBody: { flex: 1, flexDirection: 'row', alignItems: 'center' },
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
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 4,
  },
  fieldLabelFloat: { top: -9, fontSize: 12 },
  fieldTrailingBtn: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  supportText: { color: ERROR_RED, fontSize: 12, marginLeft: 14, marginTop: 3 },

  // Dropdown
  dropdownValue: { fontSize: 16, paddingHorizontal: 8, flex: 1 },

  // Soil header row + auto-detect
  soilHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  soilHeaderText: { fontSize: 14, fontWeight: '600' },
  autoDetectRow: { flexDirection: 'row', alignItems: 'center' },
  autoDetectText: { fontSize: 12, color: PRIMARY, fontWeight: '500', marginLeft: 4 },

  // GPS coordinates card
  coordCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: VERY_LIGHT_GREEN,
    borderRadius: 12,
    padding: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
  },
  coordBody: { marginLeft: 10 },
  coordLabel: { fontSize: 11, fontWeight: '500', color: GRAY },
  coordValue: { fontSize: 13, fontWeight: '600', color: PRIMARY, marginTop: 2 },

  // Photo picker
  photoPicker: {
    height: 130,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: LIGHT_GRAY,
    backgroundColor: VERY_LIGHT_GREEN,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPickerText: { fontSize: 14, fontWeight: '600', color: PRIMARY, marginTop: 8 },
  photoPickerSub: { fontSize: 12, color: GRAY, marginTop: 4 },
  photoPreviewWrap: { borderRadius: 12, overflow: 'hidden' },
  photoPreview: { width: '100%', height: 160 },
  photoRemove: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 12,
    padding: 4,
  },
  photoCaption: {
    position: 'absolute',
    bottom: 8,
    left: 12,
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },

  // Save button
  saveButton: {
    height: 56,
    borderRadius: 14,
    backgroundColor: PRIMARY,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
  saveButtonDisabled: { backgroundColor: 'rgba(46, 125, 50, 0.6)' },
  saveRow: { flexDirection: 'row', alignItems: 'center' },
  saveButtonText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', marginLeft: 10 },

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
  modalList: { maxHeight: 420 },
  modalOption: {
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E0E0E0',
  },
  modalOptionText: { fontSize: 14, color: '#212121' },
});
