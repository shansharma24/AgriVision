// Ported from AgriVision — presentation/addNewFarm/EditFarmScreen.kt
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation, useRoute } from '@react-navigation/native';

import { useApp } from '../context/AppContext';
import { LoadingView, EmptyState, PrimaryButton } from '../components';

/* ---------- FIXED LIGHT COLORS (EditFarmScreen.kt) ---------- */
const PRIMARY = '#2E7D32'; // PrimaryGreen
const BG = '#F4FBF6'; // LightGreenBg
const BORDER = '#BDBDBD'; // BorderGray
const TEXT_DARK = '#212121'; // TextDark
const IMG_BG = '#EAF6EF'; // ImagePickerSection box color
const GRAY = '#9E9E9E';

/* ---------- OPTION LISTS (matching the Kotlin lists exactly) ---------- */
const CROP_TYPES = ['🌾 Wheat', '🍚 Rice', '🌽 Corn', '🌿 Cotton', '🎋 Sugarcane', '🌱 Other'];
const SOIL_TYPES = ['🟤 Clay', '🟡 Sandy', '🟢 Loamy', '⚫ Black', '✏️ Custom'];
const WATER_SOURCES = ['💧 Borewell', '🏞️ Canal', '🌊 River', '✏️ Other'];
const IRRIGATION_TYPES = ['💧 Drip', '🌊 Sprinkler', '🚰 Flood', '✏️ Other'];

/* ---------- Header (TopAppBar: primary bg, close icon, "Edit Farm") ---------- */
function Header({ onClose }) {
  return (
    <View style={styles.header}>
      <TouchableOpacity style={styles.headerBtn} onPress={onClose} hitSlop={8}>
        <MaterialIcons name="close" size={26} color="#FFFFFF" />
      </TouchableOpacity>
      <View style={styles.headerTitleWrap}>
        <Text style={styles.headerTitle}>Edit Farm</Text>
      </View>
      <View style={styles.headerBtn} />
    </View>
  );
}

/* ---------- Image picker box (ImagePickerSection) ---------- */
function ImagePickerSection({ existingImageUrl, newImageUri, onPick }) {
  const showNew = !!newImageUri;
  const showExisting = !showNew && !!existingImageUrl;
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPick}
      style={styles.imagePicker}
    >
      {showNew ? (
        <Image source={{ uri: newImageUri }} style={styles.image} resizeMode="cover" />
      ) : showExisting ? (
        <Image source={{ uri: existingImageUrl }} style={styles.image} resizeMode="cover" />
      ) : (
        <MaterialIcons name="camera-alt" size={48} color={GRAY} />
      )}
    </TouchableOpacity>
  );
}

/* ---------- Outlined text field (LightTextField) ---------- */
function LightTextField({
  label,
  value,
  onChangeText,
  keyboardType = 'default',
  multiline,
  minHeight = 56,
}) {
  const [focused, setFocused] = useState(false);
  const float = focused || !!value;
  return (
    <View style={[styles.field, { borderColor: focused ? PRIMARY : BORDER, minHeight }]}>
      <Text
        pointerEvents="none"
        style={[
          styles.fieldLabel,
          float ? styles.fieldLabelFloat : { top: (minHeight - 20) / 2 },
          { color: focused ? PRIMARY : GRAY },
        ]}
      >
        {label}
      </Text>
      <TextInput
        style={[
          styles.fieldInput,
          multiline && [styles.fieldInputMultiline, float && { paddingTop: 20 }],
        ]}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        multiline={multiline}
        placeholderTextColor={GRAY}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        returnKeyType="next"
      />
    </View>
  );
}

/* ---------- Read-only dropdown field (LightDropdown) ---------- */
function LightDropdown({ label, value, open, onPress }) {
  const float = open || !!value;
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[styles.dropdownField, { borderColor: open ? PRIMARY : BORDER }]}
    >
      {float && (
        <Text
          pointerEvents="none"
          style={[styles.fieldLabel, styles.fieldLabelFloat, { color: open ? PRIMARY : GRAY }]}
        >
          {label}
        </Text>
      )}
      <Text style={[styles.dropdownValue, { color: value ? TEXT_DARK : GRAY }]} numberOfLines={1}>
        {value || label}
      </Text>
      <MaterialIcons
        name={open ? 'arrow-drop-up' : 'arrow-drop-down'}
        size={26}
        color={GRAY}
        style={styles.dropdownArrow}
      />
    </TouchableOpacity>
  );
}

/* ---------- Option list modal (ExposedDropdownMenu) ---------- */
function OptionSheet({ visible, options, onSelect, onClose }) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={onClose} />
      <View style={styles.modalSheet}>
        <View style={styles.modalHandle} />
        <ScrollView style={{ maxHeight: 420 }} keyboardShouldPersistTaps="handled">
          {options.map((opt) => (
            <TouchableOpacity
              key={opt}
              style={styles.modalOption}
              activeOpacity={0.7}
              onPress={() => onSelect(opt)}
            >
              <Text style={styles.modalOptionEmoji}>{opt.slice(0, 2)}</Text>
              <Text style={styles.modalOptionText}>{opt.slice(2).trim()}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

/* ---------- Form (mounted only once the farm is found) ---------- */
function EditFarmForm({ farm, onSave, onCancel }) {
  const { updateFarm } = useApp();

  // Pre-fill from the existing farm (remember { mutableStateOf(farm.*) })
  const [name, setName] = useState(farm.name || '');
  const [cropType, setCropType] = useState(farm.cropType || '');
  const [soilType, setSoilType] = useState(farm.soilType || '');
  const [customSoilType, setCustomSoilType] = useState('');
  const [acres, setAcres] = useState(farm.acres != null ? String(farm.acres) : '');
  const [location, setLocation] = useState(farm.location || '');
  const [waterSource, setWaterSource] = useState(farm.waterSource || '');
  const [irrigationType, setIrrigationType] = useState(farm.irrigationType || '');
  const [description, setDescription] = useState(farm.description || '');

  const [newImageUri, setNewImageUri] = useState(null);
  const [existingImageUrl, setExistingImageUrl] = useState(farm.imageUrl || null);
  const [saving, setSaving] = useState(false);

  // Which dropdown is open: null | 'crop' | 'soil' | 'water' | 'irrigation'
  const [openDropdown, setOpenDropdown] = useState(null);

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow access to your photos to pick an image.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });
    if (!result.canceled) setNewImageUri(result.assets[0].uri);
  };

  const save = () => {
    // Same validation as the Kotlin updateFarm()
    if (
      name.trim() === '' ||
      cropType.trim() === '' ||
      soilType.trim() === '' ||
      acres.trim() === '' ||
      location.trim() === ''
    ) {
      Alert.alert('Fill all required fields');
      return;
    }

    setSaving(true);

    // No Firebase storage in the RN build yet — a newly picked image keeps its
    // local URI (upload lands in src/services/api.js when the backend is wired).
    const imageUrl = newImageUri || existingImageUrl;

    updateFarm(farm.id, {
      name: name.trim(),
      cropType: cropType.trim(),
      soilType: soilType.includes('Custom') ? customSoilType : soilType,
      acres: parseInt(acres, 10) || farm.acres,
      location: location.trim(),
      imageUrl,
      waterSource,
      irrigationType,
      description,
    });

    setSaving(false);
    Alert.alert('Farm updated', '', [{ text: 'OK', onPress: onSave }]);
  };

  const openFor = (key) => () => {
    setOpenDropdown((cur) => (cur === key ? null : key));
  };

  const activeOptions =
    openDropdown === 'crop'
      ? CROP_TYPES
      : openDropdown === 'soil'
        ? SOIL_TYPES
        : openDropdown === 'water'
          ? WATER_SOURCES
          : openDropdown === 'irrigation'
            ? IRRIGATION_TYPES
            : [];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Header onClose={onCancel} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <ImagePickerSection
            existingImageUrl={existingImageUrl}
            newImageUri={newImageUri}
            onPick={pickImage}
          />

          <LightTextField label="Farm Name *" value={name} onChangeText={setName} />

          <LightDropdown
            label="Crop Type *"
            value={cropType}
            open={openDropdown === 'crop'}
            onPress={openFor('crop')}
          />

          <LightDropdown
            label="Soil Type *"
            value={soilType}
            open={openDropdown === 'soil'}
            onPress={openFor('soil')}
          />

          {soilType.includes('Custom') && (
            <LightTextField
              label="Custom Soil Type"
              value={customSoilType}
              onChangeText={setCustomSoilType}
            />
          )}

          <LightTextField
            label="Area (Acres) *"
            value={acres}
            onChangeText={(t) => setAcres(t.replace(/[^0-9]/g, ''))}
            keyboardType="number-pad"
          />

          <LightTextField label="Location *" value={location} onChangeText={setLocation} />

          <View style={styles.divider} />

          <LightDropdown
            label="Water Source"
            value={waterSource}
            open={openDropdown === 'water'}
            onPress={openFor('water')}
          />

          <LightDropdown
            label="Irrigation Type"
            value={irrigationType}
            open={openDropdown === 'irrigation'}
            onPress={openFor('irrigation')}
          />

          <LightTextField
            label="Description"
            value={description}
            onChangeText={setDescription}
            multiline
            minHeight={110}
          />

          <TouchableOpacity
            activeOpacity={0.85}
            disabled={saving}
            onPress={save}
            style={[styles.saveBtn, saving && { opacity: 0.6 }]}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.saveText}>Update Farm</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <OptionSheet
        visible={openDropdown !== null}
        options={activeOptions}
        onClose={() => setOpenDropdown(null)}
        onSelect={(opt) => {
          if (openDropdown === 'crop') setCropType(opt);
          else if (openDropdown === 'soil') setSoilType(opt);
          else if (openDropdown === 'water') setWaterSource(opt);
          else if (openDropdown === 'irrigation') setIrrigationType(opt);
          setOpenDropdown(null);
        }}
      />
    </SafeAreaView>
  );
}

export default function EditFarmScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { farmId } = route.params || {};
  const { farms, hydrated } = useApp();

  const goBack = () => navigation.goBack();

  const farm = hydrated && farmId ? farms.find((f) => f.id === farmId) : null;

  if (!hydrated) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Header onClose={goBack} />
        <LoadingView />
      </SafeAreaView>
    );
  }

  if (!farm) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Header onClose={goBack} />
        <EmptyState
          icon="error-outline"
          title="Farm not found"
          subtitle="This farm may have been deleted."
          action={<PrimaryButton title="Go Back" onPress={goBack} />}
        />
      </SafeAreaView>
    );
  }

  return <EditFarmForm farm={farm} onSave={goBack} onCancel={goBack} />;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  flex: { flex: 1 },

  // TopAppBar (PrimaryGreen container, close icon, bold white title)
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    backgroundColor: PRIMARY,
    paddingHorizontal: 8,
    elevation: 4,
  },
  headerBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitleWrap: { flex: 1, justifyContent: 'center' },
  headerTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },

  // Scroll column: 20dp padding, 16dp spacing (spacedBy(16.dp))
  scroll: { padding: 20, paddingBottom: 40 },

  // Image picker box
  imagePicker: {
    height: 180,
    borderRadius: 16,
    backgroundColor: IMG_BG,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 16,
  },
  image: { width: '100%', height: '100%' },

  // Outlined text field (LightTextField)
  field: {
    position: 'relative',
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    backgroundColor: 'transparent',
  },
  fieldLabel: {
    position: 'absolute',
    left: 12,
    fontSize: 16,
    backgroundColor: BG,
    paddingHorizontal: 4,
  },
  fieldLabelFloat: { top: -9, fontSize: 12 },
  fieldInput: {
    flex: 1,
    fontSize: 16,
    color: TEXT_DARK,
    paddingVertical: 0,
    paddingHorizontal: 12,
    minHeight: 54,
  },
  fieldInputMultiline: { textAlignVertical: 'top' },

  // Dropdown field (LightDropdown)
  dropdownField: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    backgroundColor: 'transparent',
    paddingHorizontal: 12,
  },
  dropdownValue: { flex: 1, fontSize: 16, marginLeft: 12 },
  dropdownArrow: { marginRight: 0 },

  // Divider
  divider: { height: 1, backgroundColor: '#E0E0E0', marginVertical: 8 },

  // Update Farm button (54dp tall, full width)
  saveBtn: {
    height: 54,
    borderRadius: 20,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
  saveText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },

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
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E0E0E0',
  },
  modalOptionEmoji: { fontSize: 16, marginRight: 10 },
  modalOptionText: { fontSize: 16, color: TEXT_DARK },
});
