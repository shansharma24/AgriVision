// ─────────────────────────────────────────────────────────────────────────────
// AgriVision — Manage Inventory (crop listing) screen
// Ported from presentation/crops/CropsScreen.kt
// (Manage Inventory top bar + add FAB, search + stock filter chips, crop list
//  cards with status pill and inline quantity stepper, crop detail dialog,
//  and an Add/Edit crop form with image picker, crop/type/status dropdowns and
//  a harvesting-date calendar). Calls api.getCrops() and falls back to the
//  bundled crop dataset when it returns null.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, FlatList, TouchableOpacity, TextInput,
  Image, Modal, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { useApp } from '../context/AppContext';
import * as api from '../services/api';

// ── Screen-local palette (CropsScreen.kt) ────────────────────────────────────
const PrimaryGreen = '#34D399';       // Vibrant emerald green
const SecondaryGreen = '#059669';     // Deeper green
const LightGreen = '#ECFEF4';         // Softer light green
const AccentGreen = '#6EE7B7';        // Brighter accent
const WarningRed = '#EF4444';
const Amber = '#F59E0B';              // statusColor for "Few Stock Remaining"
const BorderGray = '#E5E7EB';
const TextPrimary = '#111827';
const TextSecondary = '#6B7280';
const DarkCardColor = '#1F2937';
const BG_COLOR = '#F5FAF5';

const withAlpha = (hex, alpha) => {
  const r = parseInt(hex.substring(1, 3), 16);
  const g = parseInt(hex.substring(3, 5), 16);
  const b = parseInt(hex.substring(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
};

// ── Bundled crop dataset (CropsScreen.kt cropOptions + Crop model) ───────────
const CROP_OPTIONS = [
  { name: 'Wheat', imageUrl: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b' },
  { name: 'Rice', imageUrl: 'https://img.jagranjosh.com/images/2025/09/12/article/image/scientific-name-of-rice-1757656335124.jpg' },
  { name: 'Maize', imageUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTabjkABlfcZvwF0F3wgcH-3676jfEq6gcMHQ&s' },
  { name: 'Sugarcane', imageUrl: 'https://www.mahagro.com/cdn/shop/articles/iStock_000063947343_Medium_4e1c882b-faf0-4487-b45b-c2b557d32442.jpg?v=1541408129&width=1100' },
  { name: 'Cotton', imageUrl: 'https://images.ctfassets.net/3s5io6mnxfqz/4TV7YTCO1DJuMhhn7RD1Ol/b5a6c12340e6529a86bc1b557ed2d8f8/AdobeStock_136921602.jpeg' },
  { name: 'Potato', imageUrl: 'https://www.apnikheti.com/upload/crops/4727idea99293460-potato-Download.jpg' },
  { name: 'Tomato', imageUrl: 'https://static.vecteezy.com/system/resources/previews/049/995/072/non_2x/fresh-tomatoes-in-a-basket-png.png' },
];

const BUNDLED_CROPS = [
  { id: 'crop-wheat', name: 'Wheat', variety: 'Lok-1', type: 'Organic', areaAcres: 2.5, harvestingDate: '15/03/2026', quantity: 120, unit: 'KG', status: 'In Stock', imageUrl: CROP_OPTIONS[0].imageUrl, lastEdited: 0, timestamp: 6 },
  { id: 'crop-rice', name: 'Rice', variety: 'Basmati', type: 'Hybrid', areaAcres: 3.0, harvestingDate: '30/11/2026', quantity: 200, unit: 'KG', status: 'In Stock', imageUrl: CROP_OPTIONS[1].imageUrl, lastEdited: 0, timestamp: 5 },
  { id: 'crop-maize', name: 'Maize', variety: 'Sweet Corn', type: 'Heirloom', areaAcres: 1.5, harvestingDate: '20/04/2026', quantity: 80, unit: 'KG', status: 'Few Stock Remaining', imageUrl: CROP_OPTIONS[2].imageUrl, lastEdited: 0, timestamp: 4 },
  { id: 'crop-sugarcane', name: 'Sugarcane', variety: 'Co 86032', type: 'Organic', areaAcres: 4.0, harvestingDate: '25/12/2026', quantity: 500, unit: 'KG', status: 'In Stock', imageUrl: CROP_OPTIONS[3].imageUrl, lastEdited: 0, timestamp: 3 },
  { id: 'crop-cotton', name: 'Cotton', variety: 'BT Cotton', type: 'Hybrid', areaAcres: 2.0, harvestingDate: '10/10/2026', quantity: 150, unit: 'KG', status: 'Sold Out', imageUrl: CROP_OPTIONS[4].imageUrl, lastEdited: 0, timestamp: 2 },
  { id: 'crop-potato', name: 'Potato', variety: 'Kufri Jyoti', type: 'Organic', areaAcres: 1.2, harvestingDate: '05/02/2026', quantity: 60, unit: 'KG', status: 'Few Stock Remaining', imageUrl: CROP_OPTIONS[5].imageUrl, lastEdited: 0, timestamp: 1 },
  { id: 'crop-tomato', name: 'Tomato', variety: 'Winter Red', type: 'Organic', areaAcres: 0.8, harvestingDate: '22/01/2027', quantity: 40, unit: 'KG', status: 'In Stock', imageUrl: CROP_OPTIONS[6].imageUrl, lastEdited: 0, timestamp: 0 },
];

const FILTERS = ['All Stocks', 'Organic', 'Hybrid', 'Heirloom'];
const CROP_TYPES = ['Organic', 'Hybrid', 'Heirloom', 'GMO-Free'];
const STATUS_OPTIONS = ['In Stock', 'Few Stock Remaining', 'Sold Out'];

// ── Shared image with graceful fallback (AsyncImage placeholder) ─────────────
function CropImage({ uri, fallbackUri, style }) {
  const [failed, setFailed] = useState(false);
  const source = (uri && uri.trim()) ? uri : fallbackUri;
  if (failed || !source) {
    return (
      <View style={[style, styles.imageFallback]}>
        <MaterialIcons name="image" size={28} color={TextSecondary} />
      </View>
    );
  }
  return (
    <Image
      source={{ uri: source }}
      style={style}
      resizeMode="cover"
      onError={() => setFailed(true)}
    />
  );
}

// ── Detail dialog row (DetailRow) ────────────────────────────────────────────
function DetailRow({ label, value }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}:</Text>
      <Text style={styles.detailValue} numberOfLines={1} ellipsizeMode="tail">
        {value}
      </Text>
    </View>
  );
}

// ── Filter chip (FilterChip) ─────────────────────────────────────────────────
function FilterChip({ label, selected, onPress }) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={[
        styles.filterChip,
        selected ? { backgroundColor: PrimaryGreen } : { backgroundColor: 'transparent' },
      ]}
    >
      <Text style={[styles.filterChipText, { color: selected ? '#FFFFFF' : TextPrimary }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ── Crop list item (CropListItem) ────────────────────────────────────────────
function CropListItem({ crop, onPress, onQuantityChange }) {
  const statusColor =
    crop.status === 'Sold Out'
      ? WarningRed
      : crop.status === 'Few Stock Remaining'
        ? Amber
        : PrimaryGreen;

  return (
    <TouchableOpacity style={styles.cropCard} activeOpacity={0.85} onPress={onPress}>
      <CropImage uri={crop.imageUrl} fallbackUri="https://via.placeholder.com/120" style={styles.cropImage} />
      <View style={styles.cropInfo}>
        <Text style={styles.cropName} numberOfLines={1}>{crop.name || ''}</Text>
        <View style={styles.cropTypeRow}>
          <Text style={styles.cropType} numberOfLines={1}>{(crop.type || '').toUpperCase()}</Text>
          {!!(crop.variety && crop.variety.trim()) && (
            <Text style={styles.cropVariety} numberOfLines={1}>{crop.variety}</Text>
          )}
        </View>
        <View style={styles.harvestRow}>
          <MaterialIcons name="calendar-today" size={16} color={TextSecondary} />
          <Text style={styles.harvestText} numberOfLines={1}>
            Harvest: {crop.harvestingDate || ''}
          </Text>
        </View>
      </View>
      <View style={styles.cropRight}>
        <View style={[styles.statusBadge, { backgroundColor: withAlpha(statusColor, 0.12) }]}>
          <Text style={[styles.statusText, { color: statusColor }]} numberOfLines={1}>
            {(crop.status || '').toUpperCase()}
          </Text>
        </View>
        <View style={styles.qtyRow}>
          <TouchableOpacity
            onPress={() => { if (crop.quantity > 0) onQuantityChange(crop.quantity - 1); }}
            hitSlop={8}
          >
            <MaterialIcons name="remove-circle-outline" size={24} color={TextSecondary} />
          </TouchableOpacity>
          <Text style={styles.qtyText}>{crop.quantity} {crop.unit}</Text>
          <TouchableOpacity onPress={() => onQuantityChange(crop.quantity + 1)} hitSlop={8}>
            <MaterialIcons name="add-circle-outline" size={24} color={PrimaryGreen} />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ── Crop list view (CropListScreen) ──────────────────────────────────────────
function CropListView({
  crops, isLoading, errorMessage, searchQuery, selectedFilter,
  onSearchChange, onFilterChange, onShowDetail, onQuantityChange,
}) {
  const [searchFocused, setSearchFocused] = useState(false);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={PrimaryGreen} />
      </View>
    );
  }
  if (errorMessage) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Error: {errorMessage}</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={crops}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <CropListItem
          crop={item}
          onPress={() => onShowDetail(item)}
          onQuantityChange={(q) => onQuantityChange(item.id, q)}
        />
      )}
      ListHeaderComponent={
        <View style={styles.listHeader}>
          <View style={[styles.searchField, { borderColor: searchFocused ? PrimaryGreen : BorderGray }]}>
            <MaterialIcons name="search" size={24} color={TextSecondary} />
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={onSearchChange}
              placeholder="Find crop in inventory..."
              placeholderTextColor={TextSecondary}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
            />
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}
          >
            {FILTERS.map((label) => (
              <FilterChip
                key={label}
                label={label}
                selected={selectedFilter === label}
                onPress={() => onFilterChange(label)}
              />
            ))}
          </ScrollView>
        </View>
      }
      ListEmptyComponent={
        <View style={styles.listEmptyWrap}>
          <Text style={styles.emptyText}>No crops found. Add a new one!</Text>
        </View>
      }
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
    />
  );
}

// ── Generic options dropdown (ExposedDropdownMenu) ───────────────────────────
function OptionModal({ visible, options, onSelect, onClose }) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalWrap}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <View style={styles.optionSheet}>
          {options.map((opt) => (
            <TouchableOpacity
              key={opt}
              style={styles.optionItem}
              onPress={() => onSelect(opt)}
              activeOpacity={0.7}
            >
              <Text style={styles.optionText}>{opt}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </Modal>
  );
}

// ── Read-only select field (readOnly OutlinedTextField + trailing icon) ──────
function SelectField({ label, value, icon = 'arrow-drop-down', onPress }) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[styles.formField, styles.selectField]}
    >
      <Text style={styles.formFieldLabel}>{label}</Text>
      <View style={styles.selectRow}>
        <Text style={styles.selectValue} numberOfLines={1}>{value || ''}</Text>
        <MaterialIcons name={icon} size={24} color={TextSecondary} />
      </View>
    </TouchableOpacity>
  );
}

// ── Text input field (OutlinedTextField) ─────────────────────────────────────
function FormField({
  label, value, onChangeText, placeholder, keyboardType,
  trailingIcon, onTrailingPress, editable = true,
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[styles.formField, { borderColor: focused ? PrimaryGreen : BorderGray }]}>
      <Text style={styles.formFieldLabel}>{label}</Text>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.formFieldInput}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={TextSecondary}
          keyboardType={keyboardType}
          editable={editable}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        {!!trailingIcon && (
          <TouchableOpacity onPress={onTrailingPress} hitSlop={8}>
            <MaterialIcons name={trailingIcon} size={22} color={TextSecondary} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ── Calendar date picker (DatePickerDialog, dd/MM/yyyy) ──────────────────────
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const parseDMY = (str) => {
  if (!str) return new Date();
  const parts = str.split('/');
  if (parts.length === 3) {
    const d = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const y = parseInt(parts[2], 10);
    if (d && m && y) return new Date(y, m - 1, d);
  }
  return new Date();
};

const pad2 = (n) => String(n).padStart(2, '0');

function DatePickerModal({ visible, initialDate, onSelect, onClose }) {
  const init = parseDMY(initialDate);
  const [viewYear, setViewYear] = useState(init.getFullYear());
  const [viewMonth, setViewMonth] = useState(init.getMonth());
  const [selYear, setSelYear] = useState(init.getFullYear());
  const [selMonth, setSelMonth] = useState(init.getMonth());
  const [selDay, setSelDay] = useState(init.getDate());

  useEffect(() => {
    if (visible) {
      const d = parseDMY(initialDate);
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
      setSelYear(d.getFullYear());
      setSelMonth(d.getMonth());
      setSelDay(d.getDate());
    }
  }, [visible, initialDate]);

  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  const rows = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
  };
  const pick = (d) => {
    setSelDay(d); setSelMonth(viewMonth); setSelYear(viewYear);
    onSelect(`${pad2(d)}/${pad2(viewMonth + 1)}/${viewYear}`);
  };

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalWrap}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <View style={styles.dateSheet}>
          <Text style={styles.dateTitle}>Select Harvesting Date</Text>
          <View style={styles.dateHeader}>
            <TouchableOpacity onPress={prevMonth} hitSlop={8}>
              <MaterialIcons name="chevron-left" size={26} color={PrimaryGreen} />
            </TouchableOpacity>
            <Text style={styles.dateMonthLabel}>{MONTHS[viewMonth]} {viewYear}</Text>
            <TouchableOpacity onPress={nextMonth} hitSlop={8}>
              <MaterialIcons name="chevron-right" size={26} color={PrimaryGreen} />
            </TouchableOpacity>
          </View>
          <View style={styles.weekRow}>
            {WEEKDAYS.map((w, i) => (
              <Text key={`${w}${i}`} style={styles.weekLabel}>{w}</Text>
            ))}
          </View>
          {rows.map((row, ri) => (
            <View key={ri} style={styles.weekRow}>
              {row.map((d, ci) => {
                if (d === null) {
                  return <View key={`e${ri}-${ci}`} style={styles.dayCell} />;
                }
                const selected = viewYear === selYear && viewMonth === selMonth && d === selDay;
                return (
                  <TouchableOpacity
                    key={d}
                    style={[styles.dayCell, selected && styles.dayCellSelected]}
                    onPress={() => pick(d)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.dayText, selected && styles.dayTextSelected]}>{d}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>
      </View>
    </Modal>
  );
}

// ── Add / Edit crop form (CropFormScreen) ────────────────────────────────────
function CropForm({ isEditMode, initial, onBack, onSave, onDelete }) {
  const { isDark } = useApp();
  const [name, setName] = useState(initial?.name || '');
  const [variety, setVariety] = useState(initial?.variety || '');
  const [type, setType] = useState(initial?.type || 'Organic');
  const [area, setArea] = useState(initial?.areaAcres != null ? String(initial.areaAcres) : '');
  const [harvestingDate, setHarvestingDate] = useState(initial?.harvestingDate || '');
  const [quantity, setQuantity] = useState(initial?.quantity != null ? String(initial.quantity) : '0');
  const [unit, setUnit] = useState(initial?.unit || 'KG');
  const [status, setStatus] = useState(initial?.status || 'In Stock');
  const [imageUrl, setImageUrl] = useState(initial?.imageUrl || '');
  const [localImageUri, setLocalImageUri] = useState(null);
  const [showCropPicker, setShowCropPicker] = useState(false);
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Please allow photo access to select an image.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setLocalImageUri(result.assets[0].uri);
      setImageUrl(result.assets[0].uri);
    }
  };

  const imageSource = localImageUri || (imageUrl && imageUrl.trim() ? imageUrl : null);

  const handleSave = () => {
    const qty = parseInt(quantity, 10) || 0;
    const acres = parseFloat(area) || 0.0;
    if (!name.trim()) {
      Alert.alert('Crop name is required');
      return;
    }
    setSaving(true);
    const newCrop = {
      id: initial?.id || '',
      name: name.trim(),
      variety: variety.trim(),
      type,
      areaAcres: acres,
      harvestingDate,
      quantity: qty,
      unit,
      status,
      imageUrl: imageUrl.trim(),
      lastEdited: Date.now(),
      timestamp: initial?.timestamp || Date.now(),
    };
    // Brief latency to mirror the Firebase write, then commit locally.
    setTimeout(() => { setSaving(false); onSave(newCrop); }, 250);
  };

  return (
    <KeyboardAvoidingView
      style={styles.formContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.formScroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.formCard, { backgroundColor: isDark ? DarkCardColor : LightGreen }]}>
          {/* Image picker box */}
          <TouchableOpacity activeOpacity={0.85} onPress={pickImage} style={styles.imagePickerBox}>
            {imageSource ? (
              <Image source={{ uri: imageSource }} style={styles.imagePickerImg} resizeMode="cover" />
            ) : (
              <View style={styles.imagePickerHint}>
                <MaterialIcons name="camera-alt" size={48} color={PrimaryGreen} />
                <Text style={styles.imagePickerText}>Tap to Select Image</Text>
              </View>
            )}
          </TouchableOpacity>

          <SelectField label="Select Crop" value={name} onPress={() => setShowCropPicker(true)} />
          <OptionModal
            visible={showCropPicker}
            options={CROP_OPTIONS.map((o) => o.name)}
            onSelect={(optName) => {
              const opt = CROP_OPTIONS.find((o) => o.name === optName);
              if (opt) { setName(opt.name); setImageUrl(opt.imageUrl); }
              setShowCropPicker(false);
            }}
            onClose={() => setShowCropPicker(false)}
          />

          <FormField label="Variety" value={variety} onChangeText={setVariety} placeholder="e.g. Winter Red" />

          <SelectField label="Crop Type" value={type} onPress={() => setShowTypePicker(true)} />
          <OptionModal
            visible={showTypePicker}
            options={CROP_TYPES}
            onSelect={(v) => { setType(v); setShowTypePicker(false); }}
            onClose={() => setShowTypePicker(false)}
          />

          <FormField
            label="Area (Acres)"
            value={area}
            onChangeText={(t) => { if (/^\d*\.?\d*$/.test(t)) setArea(t); }}
            keyboardType="decimal-pad"
          />

          <SelectField
            label="Harvesting Date"
            value={harvestingDate}
            icon="calendar-month"
            onPress={() => setShowDatePicker(true)}
          />
          <DatePickerModal
            visible={showDatePicker}
            initialDate={harvestingDate}
            onSelect={(d) => { setHarvestingDate(d); setShowDatePicker(false); }}
            onClose={() => setShowDatePicker(false)}
          />

          <SelectField label="Status" value={status} onPress={() => setShowStatusPicker(true)} />
          <OptionModal
            visible={showStatusPicker}
            options={STATUS_OPTIONS}
            onSelect={(v) => { setStatus(v); setShowStatusPicker(false); }}
            onClose={() => setShowStatusPicker(false)}
          />

          <View style={styles.formRow}>
            <View style={styles.formRowItem}>
              <FormField
                label="Quantity"
                value={quantity}
                onChangeText={(t) => { if (/^\d*$/.test(t)) setQuantity(t); }}
                keyboardType="number-pad"
              />
            </View>
            <View style={styles.formRowItem}>
              <FormField label="Unit" value={unit} onChangeText={setUnit} />
            </View>
          </View>

          <TouchableOpacity
            style={styles.saveButton}
            activeOpacity={0.85}
            onPress={handleSave}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.saveButtonText}>
                {isEditMode ? 'Update Crop' : 'Save Crop'}
              </Text>
            )}
          </TouchableOpacity>

          {isEditMode && initial?.id ? (
            <TouchableOpacity
              style={styles.removeButton}
              activeOpacity={0.85}
              onPress={() => onDelete(initial.id)}
            >
              <Text style={styles.removeButtonText}>Remove Crop</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ── Crop detail dialog (showDetailDialog) ────────────────────────────────────
function DetailDialog({ crop, onClose, onEdit, onRemove }) {
  return (
    <Modal transparent visible animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalWrap}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <View style={styles.detailCard}>
          <Text style={styles.detailTitle}>Crop Details</Text>
          <CropImage uri={crop.imageUrl} fallbackUri="https://via.placeholder.com/300" style={styles.detailImage} />
          <DetailRow label="Name" value={crop.name} />
          <DetailRow label="Type" value={crop.type} />
          <DetailRow label="Variety" value={crop.variety} />
          <DetailRow label="Area" value={`${crop.areaAcres} Acres`} />
          <DetailRow label="Harvesting Date" value={crop.harvestingDate} />
          <DetailRow label="Quantity" value={`${crop.quantity} ${crop.unit}`} />
          <DetailRow label="Status" value={crop.status} />
          <View style={styles.detailActions}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: PrimaryGreen }]}
              activeOpacity={0.85}
              onPress={onEdit}
            >
              <Text style={styles.actionBtnText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: WarningRed }]}
              activeOpacity={0.85}
              onPress={onRemove}
            >
              <Text style={styles.actionBtnText}>Remove</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── Screen (CropsScreen) ─────────────────────────────────────────────────────
export default function CropsScreen() {
  const navigation = useNavigation();
  const { isDark } = useApp();
  const [crops, setCrops] = useState(BUNDLED_CROPS);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('All Stocks');
  const [currentScreen, setCurrentScreen] = useState('list'); // 'list' | 'add' | 'edit'
  const [editingCrop, setEditingCrop] = useState(null);
  const [detailCrop, setDetailCrop] = useState(null);

  // Firebase listener → api.getCrops(); keep the bundled dataset when null.
  useEffect(() => {
    let active = true;
    api
      .getCrops()
      .then((res) => {
        if (active && Array.isArray(res)) setCrops(res);
      })
      .catch((err) => {
        if (active) setErrorMessage(err.message || 'Failed to load crops');
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => { active = false; };
  }, []);

  const filteredCrops = crops.filter(
    (c) =>
      ((c.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.variety || '').toLowerCase().includes(searchQuery.toLowerCase())) &&
      (selectedFilter === 'All Stocks' || c.type === selectedFilter)
  );

  const changeQuantity = (cropId, newQty) => {
    setCrops((prev) =>
      prev.map((c) => (c.id === cropId ? { ...c, quantity: newQty } : c))
    );
  };

  const handleSave = (crop) => {
    if (crop.id) {
      setCrops((prev) => prev.map((c) => (c.id === crop.id ? crop : c)));
    } else {
      const id = `crop_${Date.now()}`;
      setCrops((prev) => [{ ...crop, id, timestamp: Date.now() }, ...prev]);
    }
    setCurrentScreen('list');
    setEditingCrop(null);
    Alert.alert('Crop saved');
  };

  const handleRemove = (id) => {
    setCrops((prev) => prev.filter((c) => c.id !== id));
    setDetailCrop(null);
    setCurrentScreen('list');
    setEditingCrop(null);
    Alert.alert('Crop removed');
  };

  const handleBack = () => {
    if (currentScreen !== 'list') {
      setCurrentScreen('list');
      setEditingCrop(null);
    } else {
      navigation.goBack();
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: BG_COLOR }]} edges={['top']}>
      {/* Top app bar (TopAppBar) */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.topBarBtn} onPress={handleBack} hitSlop={8}>
          <MaterialIcons name="arrow-back" size={24} color={PrimaryGreen} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Manage Inventory</Text>
        <View style={styles.topBarBtn} />
      </View>

      {currentScreen === 'list' ? (
        <CropListView
          crops={filteredCrops}
          isLoading={isLoading}
          errorMessage={errorMessage}
          searchQuery={searchQuery}
          selectedFilter={selectedFilter}
          onSearchChange={setSearchQuery}
          onFilterChange={setSelectedFilter}
          onShowDetail={setDetailCrop}
          onQuantityChange={changeQuantity}
        />
      ) : (
        <CropForm
          isEditMode={currentScreen === 'edit'}
          initial={editingCrop}
          onBack={handleBack}
          onSave={handleSave}
          onDelete={handleRemove}
        />
      )}

      {/* Floating action button (FAB, list only) */}
      {currentScreen === 'list' && (
        <TouchableOpacity
          style={styles.fab}
          activeOpacity={0.85}
          onPress={() => { setEditingCrop(null); setCurrentScreen('add'); }}
        >
          <MaterialIcons name="add" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      )}

      {/* Detail dialog */}
      {detailCrop && (
        <DetailDialog
          crop={detailCrop}
          onClose={() => setDetailCrop(null)}
          onEdit={() => {
            setEditingCrop(detailCrop);
            setDetailCrop(null);
            setCurrentScreen('edit');
          }}
          onRemove={() => handleRemove(detailCrop.id)}
        />
      )}
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
  },
  topBarBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  topBarTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: TextPrimary,
  },

  // ── Shared center / modal scaffold ──
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errorText: { color: WarningRed, fontSize: 16 },
  emptyText: { color: TextSecondary, fontSize: 16 },
  listEmptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  modalWrap: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },

  // ── Search + chips header ──
  listHeader: { paddingHorizontal: 20, paddingTop: 32, paddingBottom: 8 },
  searchField: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 52,
  },
  searchInput: { flex: 1, fontSize: 16, color: TextPrimary, marginLeft: 10 },
  chipRow: { flexDirection: 'row', paddingTop: 16, gap: 8 },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BorderGray,
  },
  filterChipText: { fontSize: 14, fontWeight: '500' },

  // ── Crop list ──
  listContent: { flexGrow: 1, paddingHorizontal: 20, paddingBottom: 96 },
  cropCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  cropImage: { width: 88, height: 88, borderRadius: 16 },
  imageFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BorderGray,
  },
  cropInfo: { flex: 1, marginLeft: 16 },
  cropName: { fontSize: 18, fontWeight: '600', color: TextPrimary },
  cropTypeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  cropType: { fontSize: 14, fontWeight: '500', color: PrimaryGreen, maxWidth: '60%' },
  cropVariety: { fontSize: 14, color: TextSecondary, marginLeft: 8, flex: 1 },
  harvestRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  harvestText: { fontSize: 13, color: TextSecondary, marginLeft: 4, flex: 1 },
  cropRight: { alignItems: 'flex-end', marginLeft: 12 },
  statusBadge: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 4,
  },
  statusText: { fontSize: 12, fontWeight: '600' },
  qtyRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 4 },
  qtyText: { fontSize: 16, fontWeight: '500', color: TextPrimary, paddingHorizontal: 2 },

  // ── FAB ──
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 28,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: PrimaryGreen,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },

  // ── Detail dialog ──
  detailCard: {
    alignSelf: 'stretch',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  detailTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: TextPrimary,
    textAlign: 'center',
    marginBottom: 16,
  },
  detailImage: { width: '100%', height: 180, borderRadius: 12, marginBottom: 24 },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  detailLabel: { fontWeight: '500', color: TextPrimary },
  detailValue: { color: TextPrimary, flexShrink: 1, marginLeft: 16 },
  detailActions: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    marginTop: 24,
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
  },
  actionBtnText: { color: '#FFFFFF', fontWeight: '600', fontSize: 15 },

  // ── Options modal ──
  optionSheet: {
    alignSelf: 'stretch',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
  },
  optionItem: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BorderGray,
  },
  optionText: { fontSize: 15, color: TextPrimary },

  // ── Date picker modal ──
  dateSheet: {
    alignSelf: 'stretch',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
  },
  dateTitle: { fontSize: 18, fontWeight: '700', color: TextPrimary, textAlign: 'center', marginBottom: 12 },
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  dateMonthLabel: { fontSize: 16, fontWeight: '600', color: TextPrimary },
  weekRow: { flexDirection: 'row', marginBottom: 2 },
  weekLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: TextSecondary,
    paddingVertical: 6,
  },
  dayCell: { flex: 1, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 18, margin: 1 },
  dayCellSelected: { backgroundColor: PrimaryGreen },
  dayText: { fontSize: 14, color: TextPrimary },
  dayTextSelected: { color: '#FFFFFF', fontWeight: '600' },

  // ── Add / Edit form ──
  formContainer: { flex: 1 },
  formScroll: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40 },
  formCard: {
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
  },
  imagePickerBox: {
    width: '100%',
    height: 200,
    borderRadius: 16,
    backgroundColor: AccentGreen,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  imagePickerImg: { width: '100%', height: '100%' },
  imagePickerHint: { alignItems: 'center' },
  imagePickerText: { color: TextSecondary, marginTop: 12, textAlign: 'center' },
  formField: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: BorderGray,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 16,
  },
  formFieldLabel: { fontSize: 12, color: TextSecondary, marginBottom: 4 },
  inputRow: { flexDirection: 'row', alignItems: 'center' },
  formFieldInput: { flex: 1, fontSize: 16, color: TextPrimary, paddingVertical: 2 },
  selectField: { justifyContent: 'center' },
  selectRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  selectValue: { flex: 1, fontSize: 16, color: TextPrimary, paddingVertical: 2 },
  formRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  formRowItem: { flex: 1 },
  saveButton: {
    height: 56,
    borderRadius: 16,
    backgroundColor: PrimaryGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  removeButton: {
    marginTop: 16,
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: WarningRed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeButtonText: { color: WarningRed, fontSize: 16, fontWeight: '600' },
});
