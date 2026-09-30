// ─────────────────────────────────────────────────────────────────────────────
// AgriVision — Equipment screen
// Ported from presentation/equipment/EquipmentScreen.kt
// (Marketplace / My Equipment tabs, search + category filter chips, adaptive
//  2-column marketplace grid, summary cards + equipment list, cart dialog,
//  detail dialog, and an Add/Edit equipment form). Calls api.getEquipment()
//  and falls back to the bundled dataset when the API returns null.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, FlatList, TouchableOpacity, TextInput,
  Image, ActivityIndicator, Modal, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../theme';
import { useApp } from '../context/AppContext';
import * as api from '../services/api';

// ── Screen-local palette (EquipmentScreen.kt) ────────────────────────────────
const PRIMARY_GREEN = colors.primary;        // 0xFF2E7D32 PrimaryGreen
const SECONDARY_GREEN = '#388E3C';           // 0xFF388E3C
const LIGHT_GREEN = colors.drawerLightBg;    // 0xFFE8F5E9
const ACCENT_GREEN = '#A5D6A7';              // 0xFFA5D6A7
const DARK_BG = '#0F2F1D';                   // 0xFF0F2F1D
const DARK_CARD_COLOR = '#578571';           // 0xFF578571
const TEXT_PRIMARY_LIGHT = '#1B1B1B';
const TEXT_SECONDARY_LIGHT = '#555555';
const TEXT_PRIMARY_DARK = '#FFFFFF';
const TEXT_SECONDARY_DARK = '#B7E4C7';
const BORDER_GRAY = '#DADADA';               // 0xFFDADADA
const WARNING_RED = colors.error;            // 0xFFD32F2F
const GRAY = '#9E9E9E';

const withAlpha = (hex, alpha) => {
  const r = parseInt(hex.substring(1, 3), 16);
  const g = parseInt(hex.substring(3, 5), 16);
  const b = parseInt(hex.substring(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
};

// ── Bundled dataset (Firebase seed, mirrored from the Android source) ────────
const predefinedEquipment = [
  {
    name: 'Tractor',
    type: 'Tractors',
    imageUrl:
      'https://cdn.tractorsdekho.com/in/mahindra/yuvraj-215-nxt/mahindra-yuvraj-215-nxt-21206.jpg?impolicy=resize&imwidth=480',
  },
  {
    name: 'Harvester',
    type: 'Harvesters',
    imageUrl:
      'https://media.istockphoto.com/id/458307297/photo/john-deere-combine.jpg?s=612x612&w=0&k=20&c=SUIosnDYn7CW2gsgPFffU2MeZJ8BYsmcZJjQg4-UR18=',
  },
  {
    name: 'Sprayer',
    type: 'Sprayers',
    imageUrl:
      'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRs1pxkot3Vrqwk7z_v-XRiSYs9k7wrEsgEJA&s',
  },
  {
    name: 'Irrigation Pump',
    type: 'Irrigation',
    imageUrl:
      'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTXnpKC5n9eAw3VG_cAVP3sLFYuZtKK9cyQuA&s',
  },
  {
    name: 'Rotavator',
    type: 'Other',
    imageUrl:
      'https://www.mahindratractor.com/sites/default/files/styles/1532x912/public/2025-02/what-is-a-rotavator-uses-and-benefits-explained-detail.webp?itok=cYs8bgbI',
  },
];

const BUNDLED = {
  marketplace: [
    {
      id: 'mk_001', name: 'Mahindra Yuvraj 215 NXT', type: 'Tractors', idCode: 'MKT-101',
      status: 'AVAILABLE', nextService: 'Oct 12, 2026', operatingHours: 0, isMarketplace: true,
      tag: 'NEW', brand: 'Mahindra', price: '₹ 15,00,000', rentPerHour: 800, totalCost: 1500000,
      ownerName: 'Rajesh Patil', ownerPhone: '+91 98765 43210', location: 'Nashik, Maharashtra',
      imageUrl: predefinedEquipment[0].imageUrl, isLocal: false, timestamp: 1771000000000,
    },
    {
      id: 'mk_002', name: 'John Deere Harvester', type: 'Harvesting', idCode: 'MKT-102',
      status: 'AVAILABLE', nextService: 'Oct 20, 2026', operatingHours: 0, isMarketplace: true,
      tag: 'USED', brand: 'John Deere', price: '₹ 22,50,000', rentPerHour: 1500, totalCost: 2250000,
      ownerName: 'Suresh Kumar', ownerPhone: '+91 98765 43211', location: 'Pune, Maharashtra',
      imageUrl: predefinedEquipment[1].imageUrl, isLocal: false, timestamp: 1771100000000,
    },
    {
      id: 'mk_003', name: 'Kirloskar Irrigation Pump', type: 'Irrigation', idCode: 'MKT-103',
      status: 'AVAILABLE', nextService: 'Nov 01, 2026', operatingHours: 0, isMarketplace: true,
      tag: 'NEW', brand: 'Kirloskar', price: '₹ 45,000', rentPerHour: 60, totalCost: 45000,
      ownerName: 'Amit Deshmukh', ownerPhone: '+91 98765 43212', location: 'Nashik, Maharashtra',
      imageUrl: predefinedEquipment[3].imageUrl, isLocal: false, timestamp: 1771200000000,
    },
    {
      id: 'mk_004', name: 'Swaraj Field Sprayer', type: 'Sprayers', idCode: 'MKT-104',
      status: 'AVAILABLE', nextService: 'Oct 08, 2026', operatingHours: 0, isMarketplace: true,
      tag: 'USED', brand: 'Swaraj', price: '₹ 60,000', rentPerHour: 90, totalCost: 60000,
      ownerName: 'Vilas Jadhav', ownerPhone: '+91 98765 43213', location: 'Sangli, Maharashtra',
      imageUrl: predefinedEquipment[2].imageUrl, isLocal: false, timestamp: 1771300000000,
    },
    {
      id: 'mk_005', name: 'Rotavator 8FT', type: 'Other', idCode: 'MKT-105',
      status: 'AVAILABLE', nextService: 'Dec 01, 2026', operatingHours: 0, isMarketplace: true,
      tag: 'NEW', brand: 'Mahindra', price: '₹ 1,20,000', rentPerHour: 150, totalCost: 120000,
      ownerName: 'Nitin Pawar', ownerPhone: '+91 98765 43214', location: 'Kolhapur, Maharashtra',
      imageUrl: predefinedEquipment[4].imageUrl, isLocal: false, timestamp: 1771400000000,
    },
  ],
  equipment: [
    {
      id: 'eq_001', name: 'Tractor Yuvraj 215', type: 'Tractors', idCode: 'EQ-001',
      status: 'IN USE', nextService: 'Sep 30, 2026', operatingHours: 1240, isMarketplace: false,
      tag: 'NEW', brand: 'Mahindra', price: '', rentPerHour: 0, totalCost: 1500000,
      ownerName: '', ownerPhone: '', location: '', imageUrl: predefinedEquipment[0].imageUrl,
      isLocal: false, timestamp: 1770000000000,
    },
    {
      id: 'eq_002', name: 'Combine Harvester', type: 'Harvesters', idCode: 'EQ-002',
      status: 'MAINTENANCE', nextService: 'Sep 18, 2026', operatingHours: 880, isMarketplace: false,
      tag: 'USED', brand: 'John Deere', price: '', rentPerHour: 0, totalCost: 2250000,
      ownerName: '', ownerPhone: '', location: '', imageUrl: predefinedEquipment[1].imageUrl,
      isLocal: false, timestamp: 1770100000000,
    },
    {
      id: 'eq_003', name: 'Field Sprayer', type: 'Sprayers', idCode: 'EQ-003',
      status: 'IDLE', nextService: 'Oct 05, 2026', operatingHours: 210, isMarketplace: false,
      tag: 'USED', brand: 'Swaraj', price: '', rentPerHour: 0, totalCost: 60000,
      ownerName: '', ownerPhone: '', location: '', imageUrl: predefinedEquipment[2].imageUrl,
      isLocal: false, timestamp: 1770200000000,
    },
  ],
};

// ── Helpers ──────────────────────────────────────────────────────────────────
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatListedDate(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function formatLongDate(d) {
  return `${MONTHS[d.getMonth()]} ${String(d.getDate()).padStart(2, '0')}, ${d.getFullYear()}`;
}

function parsePrice(p) {
  if (p == null) return null;
  const n = Number(String(p).replace(/₹|,/g, '').trim());
  return isNaN(n) ? null : n;
}

function distinctById(arr) {
  const seen = {};
  return arr.filter((it) => {
    const k = it.id;
    if (seen[k]) return false;
    seen[k] = true;
    return true;
  });
}

// ── Image with placeholder fallback (AsyncImage port) ────────────────────────
function EquipmentImage({ url, height, radius, iconSize }) {
  const [failed, setFailed] = useState(false);
  const source = url && !failed ? url : null;
  if (!source) {
    return (
      <View style={[styles.imgPlaceholder, { height }]}>
        <MaterialIcons name="agriculture" size={iconSize || 40} color={PRIMARY_GREEN} />
      </View>
    );
  }
  return (
    <Image
      source={{ uri: url }}
      style={{ width: '100%', height, borderRadius: radius || 0 }}
      resizeMode="cover"
      onError={() => setFailed(true)}
    />
  );
}

// ── Summary card (SummaryCard.kt) ────────────────────────────────────────────
function SummaryCard({ title, value, textPrimary, textSecondary, isDark }) {
  return (
    <View
      style={[
        styles.summaryCard,
        { backgroundColor: isDark ? '#1E3A2B' : LIGHT_GREEN, borderColor: BORDER_GRAY },
      ]}
    >
      <Text style={[styles.summaryTitle, { color: textSecondary }]}>{title}</Text>
      <Text style={[styles.summaryValue, { color: textPrimary }]}>{value}</Text>
    </View>
  );
}

// ── Marketplace card (MarketplaceCard.kt) ────────────────────────────────────
function MarketplaceCard({ equipment, onPress, textPrimary, textSecondary, isDark }) {
  const listedDate = formatListedDate(equipment.timestamp);
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      style={[
        styles.marketCard,
        { backgroundColor: isDark ? colors.cardDark : '#FFFFFF', borderColor: BORDER_GRAY },
      ]}
    >
      <EquipmentImage url={equipment.imageUrl} height={130} radius={0} iconSize={44} />
      <View style={[styles.marketBody, { backgroundColor: isDark ? '#0F2F1D' : '#F9F9F9' }]}>
        <Text style={[styles.marketName, { color: textPrimary }]} numberOfLines={1}>
          {equipment.name}
        </Text>
        <View style={{ height: 4 }} />
        <Text style={[styles.marketBrand, { color: textSecondary }]}>
          Brand: {equipment.brand}
        </Text>
        <Text style={[styles.marketListed, { color: textSecondary }]}>
          Listed: {listedDate}
        </Text>
        <View style={{ height: 6 }} />
        <Text style={[styles.marketPrice, { color: PRIMARY_GREEN }]}>
          {equipment.price || `₹ ${equipment.totalCost}`}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ── My Equipment card (MyEquipmentCard.kt) ───────────────────────────────────
function MyEquipmentCard({ equipment, onPress, textPrimary, textSecondary, isDark }) {
  const statusColor =
    equipment.status === 'IN USE'
      ? PRIMARY_GREEN
      : equipment.status === 'MAINTENANCE'
        ? WARNING_RED
        : GRAY;
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      style={[
        styles.myCard,
        { backgroundColor: isDark ? colors.cardDark : '#FFFFFF', borderColor: BORDER_GRAY },
      ]}
    >
      <EquipmentImage url={equipment.imageUrl} height={80} radius={8} iconSize={32} />
      <View style={styles.myBody}>
        <Text style={[styles.myName, { color: textPrimary }]} numberOfLines={1}>
          {equipment.name}
        </Text>
        <Text style={[styles.myId, { color: textSecondary }]}>ID: {equipment.idCode}</Text>
        <View style={{ height: 4 }} />
        <View style={[styles.statusBadge, { backgroundColor: withAlpha(statusColor, 0.15) }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>{equipment.status}</Text>
        </View>
        <View style={{ height: 4 }} />
        <View style={styles.serviceRow}>
          <MaterialIcons name="calendar-today" size={16} color={textSecondary} />
          <Text style={[styles.myService, { color: textSecondary }]}>
            Next Service: {equipment.nextService}
          </Text>
        </View>
        <Text style={[styles.myHours, { color: textSecondary }]}>
          {equipment.operatingHours} Operating Hours
        </Text>
      </View>
      <Text style={styles.manageText}>Manage &gt;</Text>
    </TouchableOpacity>
  );
}

// ── Detail row (DetailRow.kt) ────────────────────────────────────────────────
function DetailRow({ label, value, textPrimary, textSecondary }) {
  return (
    <View style={styles.detailRow}>
      <Text style={[styles.detailLabel, { color: textSecondary }]}>{label}</Text>
      <Text style={[styles.detailValue, { color: textPrimary }]}>{value}</Text>
    </View>
  );
}

// ── Detail dialog (EquipmentDetailDialog.kt) ─────────────────────────────────
function EquipmentDetailDialog({
  equipment, isMarketplace, onDismiss, onAddToCart, onEdit,
  textPrimary, textSecondary, isDark,
}) {
  const rows = [
    ['Type', equipment.type],
    ['Status', equipment.status],
    ['Next Service', equipment.nextService],
    ['Operating Hours', String(equipment.operatingHours)],
    ['Owner', equipment.ownerName],
    ['Phone', equipment.ownerPhone],
    ['Location', equipment.location],
    ['Price', equipment.price],
  ];
  return (
    <Modal transparent visible animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.detailCard,
            { backgroundColor: isDark ? DARK_CARD_COLOR : LIGHT_GREEN, borderColor: BORDER_GRAY },
          ]}
        >
          <ScrollView showsVerticalScrollIndicator={false}>
            <EquipmentImage url={equipment.imageUrl} height={180} radius={16} iconSize={56} />
            <View style={{ height: 16 }} />
            <Text style={[styles.detailTitle, { color: textPrimary }]}>{equipment.name}</Text>
            <Text style={[styles.detailBrand, { color: textSecondary }]}>{equipment.brand}</Text>
            <View style={{ height: 12 }} />
            {rows.map(([label, value]) => (
              <DetailRow
                key={label}
                label={label}
                value={value}
                textPrimary={textPrimary}
                textSecondary={textSecondary}
              />
            ))}
            <View style={{ height: 20 }} />
            {isMarketplace ? (
              <TouchableOpacity style={styles.primaryBtn} onPress={onAddToCart}>
                <MaterialIcons name="shopping-cart" size={20} color="#FFFFFF" />
                <Text style={styles.primaryBtnText}>Add to Cart</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: SECONDARY_GREEN }]}
                onPress={onEdit}
              >
                <MaterialIcons name="edit" size={20} color="#FFFFFF" />
                <Text style={styles.primaryBtnText}>Edit Equipment</Text>
              </TouchableOpacity>
            )}
            <View style={{ height: 8 }} />
            <TouchableOpacity style={styles.outlinedBtn} onPress={onDismiss}>
              <Text style={styles.outlinedBtnText}>Close</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ── Cart dialog ──────────────────────────────────────────────────────────────
function CartDialog({
  visible, cartItems, onDismiss, onCheckout, onRemove, textPrimary, textSecondary,
}) {
  const total = cartItems.reduce(
    (sum, it) => sum + (parsePrice(it.price) ?? (Number(it.totalCost) || 0)),
    0
  );
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.modalOverlay}>
        <View style={styles.cartCard}>
          <Text style={[styles.cartTitle, { color: textPrimary }]}>My Cart</Text>
          <View style={{ height: 12 }} />
          {cartItems.length === 0 ? (
            <Text style={{ color: textSecondary }}>Cart is empty</Text>
          ) : (
            cartItems.map((item) => (
              <View key={item.id}>
                <View style={styles.cartRow}>
                  <View>
                    <Text style={[styles.cartItemName, { color: textPrimary }]}>{item.name}</Text>
                    <Text style={[styles.cartItemPrice, { color: PRIMARY_GREEN }]}>{item.price}</Text>
                  </View>
                  <TouchableOpacity onPress={() => onRemove(item.id)} hitSlop={8}>
                    <MaterialIcons name="delete" size={22} color={WARNING_RED} />
                  </TouchableOpacity>
                </View>
                <View style={styles.divider} />
              </View>
            ))
          )}
          <View style={{ height: 12 }} />
          <Text style={[styles.cartTotal, { color: textPrimary }]}>Total: ₹ {total}</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={onCheckout}>
            <Text style={styles.primaryBtnText}>Checkout</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ── Checkbox row (CheckboxRow.kt) ────────────────────────────────────────────
function CheckboxRow({ label, checked, onCheckedChange, textColor }) {
  return (
    <TouchableOpacity
      style={styles.checkboxRow}
      onPress={() => onCheckedChange(!checked)}
      activeOpacity={0.7}
    >
      <MaterialIcons
        name={checked ? 'check-box' : 'check-box-outline-blank'}
        size={24}
        color={checked ? PRIMARY_GREEN : '#757575'}
      />
      <Text style={[styles.checkboxLabel, { color: textColor }]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ── Dropdown field (ExposedDropdownMenu port) ────────────────────────────────
function DropdownField({ label, value, options, onSelect, textPrimary, textSecondary, isDark }) {
  const [open, setOpen] = useState(false);
  const modalCard = isDark ? '#1C2A21' : '#FFFFFF';
  return (
    <>
      <TouchableOpacity activeOpacity={0.7} style={styles.field} onPress={() => setOpen(true)}>
        <Text style={[styles.fieldLabel, { color: textSecondary }]}>{label}</Text>
        <View style={[styles.fieldBox, { borderColor: BORDER_GRAY }]}>
          <Text style={[styles.fieldInput, { color: textPrimary, flex: 1, paddingVertical: 12 }]}>
            {value}
          </Text>
          <MaterialIcons name="arrow-drop-down" size={24} color={textSecondary} />
        </View>
      </TouchableOpacity>
      <Modal transparent visible={open} animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            onPress={() => setOpen(false)}
            activeOpacity={1}
          />
          <View style={[styles.dropdownModal, { backgroundColor: modalCard }]}>
            {options.map((opt) => (
              <TouchableOpacity
                key={opt}
                style={styles.dropdownOption}
                onPress={() => {
                  onSelect(opt);
                  setOpen(false);
                }}
              >
                <Text style={{ color: textPrimary, fontSize: 16, fontWeight: '500' }}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </>
  );
}

// ── Select Equipment dropdown (predefinedEquipment list) ─────────────────────
function SelectEquipmentField({ value, onSelect, textPrimary, textSecondary, isDark }) {
  const [open, setOpen] = useState(false);
  const modalCard = isDark ? '#1C2A21' : '#FFFFFF';
  return (
    <>
      <TouchableOpacity activeOpacity={0.7} style={styles.field} onPress={() => setOpen(true)}>
        <Text style={[styles.fieldLabel, { color: textSecondary }]}>Select Equipment</Text>
        <View style={[styles.fieldBox, { borderColor: BORDER_GRAY }]}>
          <Text style={[styles.fieldInput, { color: textPrimary, flex: 1, paddingVertical: 12 }]}>
            {value || ''}
          </Text>
          <MaterialIcons name="arrow-drop-down" size={24} color={textSecondary} />
        </View>
      </TouchableOpacity>
      <Modal transparent visible={open} animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            onPress={() => setOpen(false)}
            activeOpacity={1}
          />
          <View style={[styles.dropdownModal, { backgroundColor: modalCard }]}>
            {predefinedEquipment.map((t) => (
              <TouchableOpacity
                key={t.name}
                style={styles.dropdownOption}
                onPress={() => {
                  onSelect(t);
                  setOpen(false);
                }}
              >
                <Text style={{ color: textPrimary, fontSize: 16, fontWeight: '500' }}>{t.name}</Text>
                <Text style={{ color: textSecondary, fontSize: 12 }}>{t.type}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </>
  );
}

// ── Generic form text field (OutlinedTextField port) ─────────────────────────
function FormField({ label, value, onChangeText, keyboardType, textPrimary, textSecondary }) {
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: textSecondary }]}>{label}</Text>
      <View style={[styles.fieldBox, { borderColor: BORDER_GRAY }]}>
        <TextInput
          style={[styles.fieldInput, { color: textPrimary }]}
          value={value}
          onChangeText={onChangeText}
          placeholder={label}
          placeholderTextColor={textSecondary}
          keyboardType={keyboardType}
        />
      </View>
    </View>
  );
}

// ── Form screen (EquipmentFormScreen.kt) ─────────────────────────────────────
function EquipmentFormScreen({
  isEditMode, initialEquipment, onBack, onSave, onDelete, textPrimary, textSecondary, isDark,
}) {
  const [name, setName] = useState(initialEquipment?.name || '');
  const [type, setType] = useState(initialEquipment?.type || '');
  const [idCode, setIdCode] = useState(initialEquipment?.idCode || '');
  const [status, setStatus] = useState(initialEquipment?.status || 'IN USE');
  const [nextService, setNextService] = useState(initialEquipment?.nextService || '');
  const [operatingHours, setOperatingHours] = useState(
    initialEquipment?.operatingHours != null ? String(initialEquipment.operatingHours) : '0'
  );
  const [isMarketplace, setIsMarketplace] = useState(initialEquipment?.isMarketplace || false);
  const [tag, setTag] = useState(initialEquipment?.tag || 'NEW');
  const [brand, setBrand] = useState(initialEquipment?.brand || '');
  const [price, setPrice] = useState(initialEquipment?.price || '');
  const [rentPerHour, setRentPerHour] = useState(
    initialEquipment?.rentPerHour != null ? String(initialEquipment.rentPerHour) : ''
  );
  const [totalCost, setTotalCost] = useState(
    initialEquipment?.totalCost != null ? String(initialEquipment.totalCost) : ''
  );
  const [ownerName, setOwnerName] = useState(initialEquipment?.ownerName || '');
  const [ownerPhone, setOwnerPhone] = useState(initialEquipment?.ownerPhone || '');
  const [location, setLocation] = useState(initialEquipment?.location || '');
  const [imageUrl, setImageUrl] = useState(initialEquipment?.imageUrl || '');
  const [localImageUri, setLocalImageUri] = useState(null);

  const showImage = !!(localImageUri || imageUrl);

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.7,
      });
      if (!result.canceled && result.assets && result.assets[0]) {
        setLocalImageUri(result.assets[0].uri);
      }
    } catch (e) {
      // ignore picker errors
    }
  };

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Name is required');
      return;
    }
    const rentHour = Number(rentPerHour) || 0;
    const cost = Number(totalCost) || 0;
    const hours = Number(operatingHours) || 0;
    const newEquipment = {
      id: initialEquipment?.id || '',
      name: name.trim(),
      type,
      idCode: idCode.trim(),
      status,
      nextService,
      operatingHours: hours,
      isMarketplace,
      tag,
      brand: brand.trim(),
      price: price.trim(),
      rentPerHour: rentHour,
      totalCost: cost,
      ownerName: ownerName.trim(),
      ownerPhone: ownerPhone.trim(),
      location: location.trim(),
      imageUrl,
      isLocal: !isMarketplace,
      lastEdited: Date.now(),
      timestamp: initialEquipment?.timestamp || Date.now(),
    };
    onSave(newEquipment);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled">
        <View
          style={[
            styles.formCard,
            { backgroundColor: isDark ? DARK_CARD_COLOR : LIGHT_GREEN },
          ]}
        >
          <View style={styles.formCardInner}>
            {/* Image upload box */}
            <TouchableOpacity
              style={[styles.imageBox, { backgroundColor: ACCENT_GREEN }]}
              onPress={pickImage}
              activeOpacity={0.85}
            >
              {showImage ? (
                <Image
                  source={localImageUri ? { uri: localImageUri } : { uri: imageUrl }}
                  style={styles.imageBoxImage}
                  resizeMode="cover"
                />
              ) : (
                <>
                  <MaterialIcons name="photo-camera" size={48} color={PRIMARY_GREEN} />
                  <Text style={[styles.uploadText, { color: textSecondary }]}>
                    Tap to Upload Image
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <View style={{ height: 24 }} />

            {/* Select Equipment */}
            <SelectEquipmentField
              value={name}
              onSelect={(t) => {
                setName(t.name);
                setType(t.type);
                setImageUrl(t.imageUrl);
              }}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
              isDark={isDark}
            />

            <View style={{ height: 16 }} />

            <FormField
              label="ID Code"
              value={idCode}
              onChangeText={setIdCode}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
            />

            <View style={{ height: 16 }} />

            <DropdownField
              label="Status"
              value={status}
              options={['IN USE', 'IDLE', 'MAINTENANCE']}
              onSelect={setStatus}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
              isDark={isDark}
            />

            <View style={{ height: 16 }} />

            {/* Next Service — date field (DatePickerDialog port) */}
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: textSecondary }]}>Next Service</Text>
              <View style={[styles.fieldBox, { borderColor: BORDER_GRAY }]}>
                <Text style={[styles.fieldInput, { color: textPrimary, flex: 1, paddingVertical: 12 }]}>
                  {nextService || ''}
                </Text>
                <TouchableOpacity
                  hitSlop={8}
                  onPress={() => {
                    const d = new Date();
                    d.setDate(d.getDate() + 30);
                    setNextService(formatLongDate(d));
                  }}
                >
                  <MaterialIcons name="calendar-month" size={22} color={textSecondary} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={{ height: 16 }} />

            <FormField
              label="Operating Hours"
              value={operatingHours}
              onChangeText={(t) => {
                if (t === '' || /^\d+$/.test(t)) setOperatingHours(t);
              }}
              keyboardType="number-pad"
              textPrimary={textPrimary}
              textSecondary={textSecondary}
            />

            <View style={{ height: 16 }} />

            <CheckboxRow
              label="List in Marketplace"
              checked={isMarketplace}
              onCheckedChange={setIsMarketplace}
              textColor={textPrimary}
            />

            {isMarketplace && (
              <>
                <View style={{ height: 16 }} />
                <DropdownField
                  label="Tag"
                  value={tag}
                  options={['NEW', 'USED']}
                  onSelect={setTag}
                  textPrimary={textPrimary}
                  textSecondary={textSecondary}
                  isDark={isDark}
                />
                <View style={{ height: 16 }} />
                <FormField
                  label="Brand"
                  value={brand}
                  onChangeText={setBrand}
                  textPrimary={textPrimary}
                  textSecondary={textSecondary}
                />
                <View style={{ height: 16 }} />
                <FormField
                  label="Price"
                  value={price}
                  onChangeText={setPrice}
                  textPrimary={textPrimary}
                  textSecondary={textSecondary}
                />
              </>
            )}

            <View style={{ height: 16 }} />

            <FormField
              label="Rent Per Hour"
              value={rentPerHour}
              onChangeText={(t) => {
                if (t === '' || /^\d*\.?\d*$/.test(t)) setRentPerHour(t);
              }}
              keyboardType="number-pad"
              textPrimary={textPrimary}
              textSecondary={textSecondary}
            />

            <View style={{ height: 16 }} />

            <FormField
              label="Total Cost"
              value={totalCost}
              onChangeText={(t) => {
                if (t === '' || /^\d*\.?\d*$/.test(t)) setTotalCost(t);
              }}
              keyboardType="number-pad"
              textPrimary={textPrimary}
              textSecondary={textSecondary}
            />

            <View style={{ height: 16 }} />

            <FormField
              label="Owner Name"
              value={ownerName}
              onChangeText={setOwnerName}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
            />

            <View style={{ height: 16 }} />

            <FormField
              label="Owner Phone"
              value={ownerPhone}
              onChangeText={setOwnerPhone}
              keyboardType="phone-pad"
              textPrimary={textPrimary}
              textSecondary={textSecondary}
            />

            <View style={{ height: 16 }} />

            <FormField
              label="Location"
              value={location}
              onChangeText={setLocation}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
            />

            <View style={{ height: 24 }} />

            <TouchableOpacity style={[styles.primaryBtn, styles.saveBtn]} onPress={handleSave}>
              <Text style={[styles.primaryBtnText, { fontSize: 16 }]}>Save</Text>
            </TouchableOpacity>

            {isEditMode && initialEquipment?.id && (
              <>
                <View style={{ height: 16 }} />
                <TouchableOpacity
                  style={styles.removeBtn}
                  onPress={() => onDelete(initialEquipment.id)}
                >
                  <Text style={styles.removeBtnText}>Remove</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
        <View style={{ height: 24 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ── Screen (EquipmentScreen.kt) ──────────────────────────────────────────────
export default function EquipmentScreen() {
  const navigation = useNavigation();
  const { isDark } = useApp();

  const bgColor = isDark ? DARK_BG : '#F4FBF6';
  const textPrimary = isDark ? TEXT_PRIMARY_DARK : TEXT_PRIMARY_LIGHT;
  const textSecondary = isDark ? TEXT_SECONDARY_DARK : TEXT_SECONDARY_LIGHT;

  const [currentScreen, setCurrentScreen] = useState('list');
  const [selectedTabIndex, setSelectedTabIndex] = useState(0); // 0 Marketplace, 1 My Equipment
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const [equipmentList, setEquipmentList] = useState([]);
  const [marketplaceList, setMarketplaceList] = useState([]);
  const [localEquipment, setLocalEquipment] = useState([]);
  const [cartItems, setCartItems] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [detailEquipment, setDetailEquipment] = useState(null);
  const [editingEquipment, setEditingEquipment] = useState(null);
  const [searchFocused, setSearchFocused] = useState(false);

  // api.getEquipment() → bundled dataset when it returns null (mock for now).
  useEffect(() => {
    let active = true;
    api
      .getEquipment()
      .then((res) => {
        if (!active) return;
        if (Array.isArray(res)) {
          setMarketplaceList(res);
          setEquipmentList([]);
        } else if (res && Array.isArray(res.marketplace)) {
          setMarketplaceList(res.marketplace);
          setEquipmentList(res.equipment || []);
        } else {
          setMarketplaceList(BUNDLED.marketplace);
          setEquipmentList(BUNDLED.equipment);
        }
        setIsLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setErrorMessage(err && err.message ? err.message : String(err));
        setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const isMarketplaceTab = selectedTabIndex === 0;
  const filters = isMarketplaceTab
    ? ['All', 'Tractors', 'Irrigation', 'Harvesting']
    : ['All', 'Tractors', 'Harvesters', 'Sprayers'];

  const combinedEquipment = distinctById([...localEquipment, ...equipmentList]);
  const baseList = isMarketplaceTab ? marketplaceList : combinedEquipment;
  const filteredList = baseList.filter(
    (it) =>
      ((it.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (it.brand || '').toLowerCase().includes(searchQuery.toLowerCase())) &&
      (selectedFilter === 'All' || it.type === selectedFilter)
  );

  const total = filteredList.length;
  const active = filteredList.filter(
    (it) => it.status === 'IN USE' || it.status === 'IDLE'
  ).length;
  const service = filteredList.filter((it) => it.status === 'MAINTENANCE').length;

  const handleAddToCart = (equipment) => {
    setCartItems((prev) => [...prev, equipment]);
    Alert.alert('Added to Cart');
  };

  const handleRemoveFromCart = (id) => {
    setCartItems((prev) => prev.filter((it) => it.id !== id));
  };

  const handleSave = (equipment) => {
    const key = equipment.id || `local_${Date.now()}`;
    if (equipment.isMarketplace) {
      const updated = { ...equipment, id: key, isLocal: false };
      setMarketplaceList((prev) => {
        const rest = prev.filter((it) => it.id !== key);
        return [updated, ...rest];
      });
      Alert.alert('Saved to Marketplace');
    } else {
      const updated = { ...equipment, id: key, isLocal: true };
      setLocalEquipment((prev) => {
        const rest = prev.filter((it) => it.id !== key);
        return [...rest, updated];
      });
      Alert.alert('Saved Locally');
    }
    setCurrentScreen('list');
    setEditingEquipment(null);
  };

  const handleDelete = (id) => {
    if (editingEquipment?.isMarketplace) {
      setMarketplaceList((prev) => prev.filter((it) => it.id !== id));
      Alert.alert('Removed from Marketplace');
    } else {
      setLocalEquipment((prev) => prev.filter((it) => it.id !== id));
      Alert.alert('Removed locally');
    }
    setCurrentScreen('list');
    setEditingEquipment(null);
  };

  const openEdit = (equipment) => {
    setEditingEquipment(equipment);
    setCurrentScreen('edit');
    setDetailEquipment(null);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: bgColor }]} edges={['top']}>
      {/* Top app bar (TopAppBar) */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.topBarBtn} hitSlop={8}>
          <MaterialIcons name="arrow-back" size={24} color={PRIMARY_GREEN} />
        </TouchableOpacity>
        <Text style={[styles.topBarTitle, { color: textPrimary }]}>Equipment</Text>
        <View style={styles.topBarActions}>
          <TouchableOpacity onPress={() => setShowCart(true)} style={styles.topBarBtn} hitSlop={8}>
            <MaterialIcons name="shopping-cart" size={24} color={textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => {}} style={styles.topBarBtn} hitSlop={8}>
            <MaterialIcons name="notifications" size={24} color={textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* TabRow (Marketplace / My Equipment) */}
      <View style={styles.tabRow}>
        {['Marketplace', 'My Equipment'].map((label, i) => {
          const selected = selectedTabIndex === i;
          return (
            <TouchableOpacity
              key={label}
              style={styles.tab}
              onPress={() => {
                setSelectedTabIndex(i);
                setSelectedFilter('All');
              }}
            >
              <Text
                style={[
                  styles.tabLabel,
                  {
                    color: selected ? PRIMARY_GREEN : textSecondary,
                    fontWeight: selected ? '700' : '400',
                  },
                ]}
              >
                {label}
              </Text>
              {selected && <View style={styles.tabIndicator} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {currentScreen !== 'list' ? (
        <EquipmentFormScreen
          isEditMode={currentScreen === 'edit'}
          initialEquipment={editingEquipment}
          onBack={() => {
            setCurrentScreen('list');
            setEditingEquipment(null);
          }}
          onSave={handleSave}
          onDelete={handleDelete}
          textPrimary={textPrimary}
          textSecondary={textSecondary}
          isDark={isDark}
        />
      ) : (
        <View style={styles.listWrap}>
          {/* Search field */}
          <View style={styles.searchWrap}>
            <View
              style={[
                styles.searchBox,
                { borderColor: searchFocused ? SECONDARY_GREEN : BORDER_GRAY },
              ]}
            >
              <MaterialIcons name="search" size={20} color={textSecondary} />
              <TextInput
                style={[styles.searchInput, { color: textPrimary }]}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search equipment, brands..."
                placeholderTextColor={textSecondary}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
              />
            </View>
          </View>

          {/* Filter chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}
          >
            {filters.map((label) => {
              const selected = selectedFilter === label;
              return (
                <TouchableOpacity
                  key={label}
                  onPress={() => setSelectedFilter(label)}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: selected ? PRIMARY_GREEN : LIGHT_GREEN,
                      borderColor: selected ? PRIMARY_GREEN : BORDER_GRAY,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      { color: selected ? '#FFFFFF' : textPrimary },
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {isLoading ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" color={PRIMARY_GREEN} />
            </View>
          ) : errorMessage != null ? (
            <View style={styles.centerBox}>
              <Text style={{ color: WARNING_RED }}>Error: {errorMessage}</Text>
            </View>
          ) : filteredList.length === 0 ? (
            <View style={styles.centerBox}>
              <Text style={{ color: textSecondary }}>No equipment found. Add a new one!</Text>
            </View>
          ) : isMarketplaceTab ? (
            <FlatList
              data={filteredList}
              keyExtractor={(it) => it.id}
              numColumns={2}
              contentContainerStyle={styles.gridContent}
              columnWrapperStyle={styles.gridRow}
              renderItem={({ item }) => (
                <MarketplaceCard
                  equipment={item}
                  onPress={() => setDetailEquipment(item)}
                  textPrimary={textPrimary}
                  textSecondary={textSecondary}
                  isDark={isDark}
                />
              )}
            />
          ) : (
            <View style={styles.myWrap}>
              <View style={styles.summaryRow}>
                <SummaryCard
                  title="TOTAL"
                  value={String(total)}
                  textPrimary={textPrimary}
                  textSecondary={textSecondary}
                  isDark={isDark}
                />
                <SummaryCard
                  title="ACTIVE"
                  value={String(active)}
                  textPrimary={textPrimary}
                  textSecondary={textSecondary}
                  isDark={isDark}
                />
                <SummaryCard
                  title="SERVICE"
                  value={String(service)}
                  textPrimary={textPrimary}
                  textSecondary={textSecondary}
                  isDark={isDark}
                />
              </View>
              <FlatList
                data={filteredList}
                keyExtractor={(it) => it.id}
                contentContainerStyle={styles.myListContent}
                renderItem={({ item }) => (
                  <MyEquipmentCard
                    equipment={item}
                    onPress={() => setDetailEquipment(item)}
                    textPrimary={textPrimary}
                    textSecondary={textSecondary}
                    isDark={isDark}
                  />
                )}
              />
            </View>
          )}
        </View>
      )}

      {/* Floating action button (Add) */}
      {currentScreen === 'list' && selectedTabIndex === 1 && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => {
            setEditingEquipment(null);
            setCurrentScreen('add');
          }}
        >
          <MaterialIcons name="add" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      )}

      {/* Cart dialog */}
      <CartDialog
        visible={showCart}
        cartItems={cartItems}
        onDismiss={() => setShowCart(false)}
        onCheckout={() => setShowCart(false)}
        onRemove={handleRemoveFromCart}
        textPrimary={textPrimary}
        textSecondary={textSecondary}
      />

      {/* Detail dialog */}
      {detailEquipment && (
        <EquipmentDetailDialog
          equipment={detailEquipment}
          isMarketplace={selectedTabIndex === 0}
          onDismiss={() => setDetailEquipment(null)}
          onAddToCart={() => handleAddToCart(detailEquipment)}
          onEdit={() => openEdit(detailEquipment)}
          textPrimary={textPrimary}
          textSecondary={textSecondary}
          isDark={isDark}
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
  topBarTitle: { flex: 1, fontSize: 18, fontWeight: '700', marginLeft: 4 },
  topBarActions: { flexDirection: 'row' },

  // ── Tabs ──
  tabRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: BORDER_GRAY,
  },
  tab: { flex: 1, alignItems: 'center', paddingTop: 12 },
  tabLabel: { fontSize: 15, paddingBottom: 10 },
  tabIndicator: {
    height: 3,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    alignSelf: 'stretch',
    backgroundColor: PRIMARY_GREEN,
  },

  // ── List section ──
  listWrap: { flex: 1 },
  searchWrap: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 4 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
  },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 12, marginLeft: 8 },
  chipRow: { paddingHorizontal: 20, paddingVertical: 8, gap: 8 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipText: { fontSize: 13, fontWeight: '500' },
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },

  // ── Marketplace grid ──
  gridContent: { padding: 16, paddingBottom: 32 },
  gridRow: { justifyContent: 'space-between', marginBottom: 12 },
  marketCard: {
    width: '48%',
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  marketBody: { padding: 12 },
  marketName: { fontSize: 16, fontWeight: '700' },
  marketBrand: { fontSize: 12 },
  marketListed: { fontSize: 11 },
  marketPrice: { fontSize: 16, fontWeight: '700' },

  // ── My Equipment summary + list ──
  myWrap: { flex: 1 },
  summaryRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: 8,
    alignItems: 'center',
  },
  summaryTitle: { fontSize: 12, fontWeight: '700' },
  summaryValue: { fontSize: 24, fontWeight: '700' },
  myListContent: { paddingHorizontal: 20, paddingVertical: 8, paddingBottom: 32, gap: 16 },
  myCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  myBody: { flex: 1, marginLeft: 16 },
  myName: { fontWeight: '700', fontSize: 16 },
  myId: { fontSize: 12 },
  statusBadge: { alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  statusText: { fontSize: 12, fontWeight: '500' },
  serviceRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  myService: { fontSize: 12 },
  myHours: { fontSize: 12 },
  manageText: { color: PRIMARY_GREEN, fontSize: 13, fontWeight: '600' },

  // ── Images ──
  imgPlaceholder: {
    width: '100%',
    backgroundColor: ACCENT_GREEN,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Detail dialog ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  detailCard: {
    width: '100%',
    maxHeight: '85%',
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
  },
  detailTitle: { fontSize: 20, fontWeight: '700' },
  detailBrand: { fontSize: 14 },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  detailLabel: { fontWeight: '600' },
  detailValue: { fontWeight: '400', marginLeft: 12, textAlign: 'right', flex: 1 },

  // ── Cart dialog ──
  cartCard: {
    width: '100%',
    maxHeight: '70%',
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    padding: 20,
  },
  cartTitle: { fontSize: 20, fontWeight: '700' },
  cartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  cartItemName: { fontWeight: '600' },
  cartItemPrice: { color: PRIMARY_GREEN },
  cartTotal: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  divider: { height: 1, backgroundColor: '#E0E0E0' },

  // ── Buttons ──
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: PRIMARY_GREEN,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
    minHeight: 48,
  },
  primaryBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  outlinedBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: PRIMARY_GREEN,
    borderRadius: 16,
    paddingVertical: 14,
    minHeight: 48,
  },
  outlinedBtnText: { color: PRIMARY_GREEN, fontSize: 15, fontWeight: '600' },

  // ── FAB ──
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: PRIMARY_GREEN,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },

  // ── Checkbox ──
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkboxLabel: { fontSize: 15 },

  // ── Dropdown ──
  dropdownModal: {
    width: '86%',
    borderRadius: 16,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  dropdownOption: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E0E0E0',
  },

  // ── Form ──
  formContent: { paddingHorizontal: 16, paddingVertical: 16 },
  formCard: { borderRadius: 24, width: '100%' },
  formCardInner: { padding: 24 },
  imageBox: {
    width: '100%',
    height: 200,
    borderRadius: 16,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageBoxImage: { width: '100%', height: 200 },
  uploadText: { marginTop: 60, textAlign: 'center' },
  field: { width: '100%' },
  fieldLabel: { fontSize: 12, marginBottom: 6, fontWeight: '500' },
  fieldBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  fieldInput: { fontSize: 15, paddingVertical: 12 },
  saveBtn: { height: 56 },
  removeBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: WARNING_RED,
    borderRadius: 16,
    paddingVertical: 14,
    minHeight: 48,
  },
  removeBtnText: { color: WARNING_RED, fontSize: 15, fontWeight: '600' },
});
