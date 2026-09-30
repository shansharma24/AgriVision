// ─────────────────────────────────────────────────────────────────────────────
// AgriVision — Government Schemes screen
// Ported from presentation/schemes/GovtSchemesScreen.kt
// (top bar with "My Schemes" action, rounded search bar with mic, Location /
//  Crop / Season filter dropdowns, scheme cards with Eligibility / Benefits /
//  Documents pill dialogs + "View Guide" dialog + "Apply Now" button that opens
//  the apply URL). Calls api.getGovtSchemes() and falls back to the bundled
//  scheme dataset when it returns null.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  Modal, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useApp } from '../context/AppContext';
import * as api from '../services/api';

// ── Screen-local palette (GovtSchemesScreen.kt) ─────────────────────────────
const PrimaryGreen = '#2E7D32';       // PrimaryGreen (constant in both themes)
const GuideGold = '#F4B000';          // "View Guide" text color
const PillBg = '#E0F2F1';             // IconTextPill circle background
const SearchPlaceholder = '#666666';  // search field placeholder

// ── Bundled scheme dataset (the exact list hard-coded in GovtSchemesScreen.kt)
//    Each entry carries every field from the Kotlin data class: name,
//    shortDescription (benefit/amount), fullDescription, ministry, eligibility,
//    benefits, documents, applyUrl, guide, icon, iconBgColor, location (state),
//    crop and season (tags).
const BUNDLED_SCHEMES = [
  {
    name: 'PM Kisan Samman Nidhi',
    shortDescription: '₹6,000 per year income support',
    fullDescription:
      'A central sector scheme with 100% funding from Govt. of India to provide ₹6,000 per year to landholding farmer families.',
    ministry: 'Ministry of Agriculture & Farmers Welfare',
    eligibility:
      'All landholding farmer families in the country are eligible, subject to exclusion criteria (institutional landholders, income tax payers, etc.).',
    benefits:
      '• ₹6,000 per year in three instalments of ₹2,000.\n• Direct benefit transfer (DBT) into bank account.\n• Helps in purchasing seeds, fertilisers and other inputs.\n• Fully funded by Central Government.',
    documents:
      '• Aadhaar card\n• Bank account details\n• Land records / Khatauni\n• Address details / mobile number',
    applyUrl: 'https://pmkisan.gov.in/',
    guide:
      "1. Visit pmkisan.gov.in and click on 'New Farmer Registration'.\n2. Enter Aadhaar number, select state and fill basic details.\n3. Add land details as per revenue records and submit.\n4. Complete e-KYC online or at nearest CSC centre.\n5. Track status under 'Beneficiary Status' on the PM-KISAN portal.",
    icon: 'account-balance',
    iconBgColor: '#E4F6EA',
    location: 'India',
    crop: 'All',
    season: 'All',
  },
  {
    name: 'Pradhan Mantri Fasal Bima Yojana',
    shortDescription: 'Insurance protection for crop loss',
    fullDescription:
      'Provides insurance coverage and financial support to farmers in the event of crop failure due to natural calamities, pests and diseases.',
    ministry: 'Ministry of Agriculture & Farmers Welfare',
    eligibility:
      'All farmers cultivating notified crops in notified areas can enrol, whether loanee or non-loanee, as per season guidelines.',
    benefits:
      '• Risk coverage from pre-sowing to post-harvest.\n• Very low farmer premium (2% for Kharif, 1.5% for Rabi – approx).\n• Remaining premium shared by Centre and States.\n• Claims directly credited to farmer’s bank account.',
    documents:
      '• Aadhaar card\n• Bank passbook\n• Land records / tenancy documents\n• Crop sowing certificate if required\n• Recent photograph (some states)',
    applyUrl: 'https://pmfby.gov.in/',
    guide:
      '1. Go to pmfby.gov.in and choose your state and season.\n2. Register as a farmer with Aadhaar, mobile and bank details.\n3. Select notified crop and insured area / land parcel.\n4. Pay the farmer’s share of premium online or through bank/CSC.\n5. Keep receipt and application number for claim reference.',
    icon: 'security',
    iconBgColor: '#E0F3F4',
    location: 'India',
    crop: 'Cereals',
    season: 'Kharif',
  },
  {
    name: 'PMKSY – Krishi Sinchai Yojana',
    shortDescription: 'Har Khet Ko Pani, Per Drop More Crop',
    fullDescription:
      'Improves on-farm water use efficiency and expands micro-irrigation (drip and sprinkler) so every field gets assured irrigation.',
    ministry: 'Ministry of Jal Shakti & Ministry of Agriculture',
    eligibility:
      'All farmers willing to install micro-irrigation systems (drip / sprinkler) on their fields as per state guidelines.',
    benefits:
      '• Capital subsidy on cost of drip / sprinkler system.\n• Saves 30–50% irrigation water.\n• Increases productivity and quality of crops.\n• Reduces fertiliser and labour cost.',
    documents:
      '• Land ownership proof / lease agreement\n• Aadhaar card\n• Bank account details\n• Quotation from approved micro-irrigation supplier',
    applyUrl: 'https://pmksy.gov.in/microirrigation/index.aspx',
    guide:
      '1. Contact your district agriculture / horticulture office or visit pmksy.gov.in.\n2. Choose approved supplier and system design for drip/sprinkler.\n3. Submit application with land records and bank details.\n4. After field verification, install the system on field.\n5. Subsidy is released to supplier / farmer as per state norms.',
    icon: 'water-drop',
    iconBgColor: '#E3F2FD',
    location: 'India',
    crop: 'Horticulture',
    season: 'All',
  },
  {
    name: 'Soil Health Card Scheme',
    shortDescription: 'Know your soil, use fertiliser correctly',
    fullDescription:
      'Provides Soil Health Cards to farmers with nutrient status and fertiliser recommendations for better and balanced use of inputs.',
    ministry: 'Ministry of Agriculture & Farmers Welfare',
    eligibility:
      'All farmers in India are eligible to get their fields tested and receive a Soil Health Card, usually once in a 2–3 year cycle.',
    benefits:
      '• Free / low-cost soil testing.\n• Nutrient and fertiliser recommendation for each plot.\n• Improves yield and reduces fertiliser cost.\n• Promotes balanced use of NPK and micronutrients.',
    documents:
      '• Basic farmer details (name, address, mobile)\n• Land details (survey number, area)\n• Sample IDs generated by soil testing lab / KVK / agriculture department.',
    applyUrl: 'https://soilhealth.dac.gov.in/',
    guide:
      '1. Visit nearest Krishi Vigyan Kendra, Agriculture Office or Soil Testing Lab.\n2. Take guidance to collect soil samples from your field.\n3. Submit samples with farmer and land details.\n4. Check Soil Health Card status on soilhealth.dac.gov.in or via mobile app.\n5. Follow nutrient and fertiliser recommendations given in the card.',
    icon: 'health-and-safety',
    iconBgColor: '#FFF3E0',
    location: 'India',
    crop: 'All',
    season: 'All',
  },
  {
    name: 'e-NAM – National Agriculture Market',
    shortDescription: 'Online mandi for better prices',
    fullDescription:
      'Pan-India electronic trading platform linking APMC mandis to create a unified national market for agricultural commodities.',
    ministry: 'Ministry of Agriculture & Farmers Welfare',
    eligibility:
      'Farmers, traders and FPOs registered with participating APMC mandis can trade on e-NAM as per mandi rules.',
    benefits:
      '• Transparent price discovery through online bidding.\n• Option to sell produce to buyers from other mandis / states.\n• Online payment and electronic weighing integration.\n• Better market access and reduced information gap.',
    documents:
      '• Aadhaar card\n• Bank account\n• Mobile number\n• Mandi registration documents (as required by local APMC).',
    applyUrl: 'https://enam.gov.in/web',
    guide:
      '1. Visit enam.gov.in and go to Farmer Registration section.\n2. Select your state and nearest e-NAM enabled mandi.\n3. Fill farmer profile with Aadhaar and bank details.\n4. Get farmer ID approved at mandi / through e-NAM helpdesk.\n5. Use e-NAM mobile app / portal to view prices and sell produce through online bidding.',
    icon: 'store',
    iconBgColor: '#F3E5F5',
    location: 'India',
    crop: 'All',
    season: 'All',
  },
];

// Distinct filter option lists (Kotlin builds them with options.distinct()).
const LOCATION_OPTIONS = ['All', 'India'];
const CROP_OPTIONS = ['All', 'Cereals', 'Horticulture']; // from ["All","All","Cereals","Horticulture"]
const SEASON_OPTIONS = ['All', 'Kharif', 'Rabi']; // from ["All","Kharif","Rabi","All"]

// ── Search bar (OutlinedTextField + Spacer(8)) ───────────────────────────────
function SearchBar({ query, onChangeText }) {
  return (
    <>
      <View style={styles.searchBar}>
        <MaterialIcons name="search" size={24} color="#000000" />
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={onChangeText}
          placeholder="Search for schemes..."
          placeholderTextColor={SearchPlaceholder}
          singleLine
        />
        {/* Mic: Android voice recognizer has no RN equivalent — kept as a no-op */}
        <TouchableOpacity onPress={() => {}} hitSlop={8} style={styles.searchMicBtn}>
          <MaterialIcons name="mic" size={24} color="#000000" />
        </TouchableOpacity>
      </View>
      <View style={{ height: 8 }} />
    </>
  );
}

// ── Filter dropdown (FilterDropdown — AssistChip + DropdownMenu) ─────────────
function FilterDropdown({ label, selected, options, chipBg, sheetBg, textPrimary, textSecondary, onSelect }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => setExpanded(true)}
        style={[styles.filterChip, { backgroundColor: chipBg }]}
      >
        <Text style={[styles.filterChipLabel, { color: textPrimary }]} numberOfLines={1}>
          {label}: {selected}
        </Text>
        <MaterialIcons name="arrow-drop-down" size={18} color={textSecondary} />
      </TouchableOpacity>

      <Modal
        transparent
        visible={expanded}
        animationType="fade"
        onRequestClose={() => setExpanded(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setExpanded(false)}
        />
        <View style={[styles.optionSheet, { backgroundColor: sheetBg }]}>
          <View style={styles.optionSheetHandle} />
          <ScrollView style={{ maxHeight: 320 }} keyboardShouldPersistTaps="handled">
            {options.map((option) => (
              <TouchableOpacity
                key={option}
                activeOpacity={0.7}
                style={styles.optionRow}
                onPress={() => {
                  onSelect(option);
                  setExpanded(false);
                }}
              >
                <Text style={[styles.optionText, { color: textPrimary }]}>{option}</Text>
                {selected === option && (
                  <MaterialIcons name="check" size={20} color={PrimaryGreen} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

// ── Icon + text pill (IconTextPill) ──────────────────────────────────────────
function IconTextPill({ icon, label, textPrimary, onPress }) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={styles.pill}
    >
      <View style={styles.pillCircle}>
        <MaterialIcons name={icon} size={16} color={PrimaryGreen} />
      </View>
      <Text style={[styles.pillLabel, { color: textPrimary }]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ── Info dialog (InfoDialog — AlertDialog) ───────────────────────────────────
function InfoDialog({ title, content, dialogBg, dialogText, onDismiss }) {
  return (
    <Modal transparent visible animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.modalBackdrop}>
        <View style={[styles.dialogCard, { backgroundColor: dialogBg }]}>
          <Text style={[styles.dialogTitle, { color: dialogText }]}>{title}</Text>
          <ScrollView style={styles.dialogBody} showsVerticalScrollIndicator>
            <Text style={[styles.dialogContent, { color: dialogText }]}>{content}</Text>
          </ScrollView>
          <View style={styles.dialogActions}>
            <TouchableOpacity onPress={onDismiss} hitSlop={8}>
              <Text style={styles.dialogOk}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── Scheme card (SchemeCard) ─────────────────────────────────────────────────
function SchemeCard({ scheme, cardColor, textPrimary, textSecondary, dialogBg, onApplied }) {
  const [showEligibility, setShowEligibility] = useState(false);
  const [showBenefits, setShowBenefits] = useState(false);
  const [showDocuments, setShowDocuments] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  const apply = () => {
    onApplied(scheme);
    Linking.openURL(scheme.applyUrl).catch(() => {});
  };

  return (
    <View style={[styles.schemeCard, { backgroundColor: cardColor }]}>
      {showEligibility && (
        <InfoDialog
          title={`Eligibility – ${scheme.name}`}
          content={scheme.eligibility}
          dialogBg={dialogBg}
          dialogText={textPrimary}
          onDismiss={() => setShowEligibility(false)}
        />
      )}
      {showBenefits && (
        <InfoDialog
          title={`Benefits – ${scheme.name}`}
          content={scheme.benefits}
          dialogBg={dialogBg}
          dialogText={textPrimary}
          onDismiss={() => setShowBenefits(false)}
        />
      )}
      {showDocuments && (
        <InfoDialog
          title={`Documents – ${scheme.name}`}
          content={scheme.documents}
          dialogBg={dialogBg}
          dialogText={textPrimary}
          onDismiss={() => setShowDocuments(false)}
        />
      )}
      {showGuide && (
        <InfoDialog
          title={`How to Apply – ${scheme.name}`}
          content={scheme.guide}
          dialogBg={dialogBg}
          dialogText={textPrimary}
          onDismiss={() => setShowGuide(false)}
        />
      )}

      {/* Header row: icon tile + name + description */}
      <View style={styles.cardHeader}>
        <View style={[styles.cardIcon, { backgroundColor: scheme.iconBgColor }]}>
          <MaterialIcons name={scheme.icon} size={24} color={PrimaryGreen} />
        </View>
        <View style={styles.cardHeaderText}>
          <Text style={[styles.cardTitle, { color: textPrimary }]}>{scheme.name}</Text>
          <Text style={[styles.cardDesc, { color: textSecondary }]}>{scheme.fullDescription}</Text>
        </View>
      </View>

      {/* Eligibility / Benefits / Documents pills */}
      <View style={styles.pillRow}>
        <IconTextPill
          icon="people"
          label="Eligibility"
          textPrimary={textPrimary}
          onPress={() => setShowEligibility(true)}
        />
        <IconTextPill
          icon="verified-user"
          label="Benefits"
          textPrimary={textPrimary}
          onPress={() => setShowBenefits(true)}
        />
        <IconTextPill
          icon="description"
          label="Documents"
          textPrimary={textPrimary}
          onPress={() => setShowDocuments(true)}
        />
      </View>

      <View style={{ height: 8 }} />

      {/* Apply Now + View Guide */}
      <View style={styles.cardFooter}>
        <TouchableOpacity activeOpacity={0.85} onPress={apply} style={styles.applyBtn}>
          <Text style={styles.applyBtnText}>Apply Now</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setShowGuide(true)} hitSlop={8}>
          <Text style={styles.guideBtn}>View Guide</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Screen (GovtSchemesScreen.kt) ────────────────────────────────────────────
export default function GovtSchemesScreen() {
  const navigation = useNavigation();
  const { isDark, t } = useApp();

  // isDark-aware palette from the Kotlin file.
  const backgroundColor = isDark ? '#08160F' : '#FFFFFF';
  const cardColor = isDark ? '#10261A' : '#F7FFF9';
  const textPrimary = isDark ? '#6FB672' : '#000000';
  const textSecondary = isDark ? '#B5CBB8' : '#000000';
  const topBarColor = isDark ? '#10261A' : '#FFFFFF';
  const dialogBg = isDark ? '#1B2C20' : '#FFFFFF';
  const chipBg = isDark ? '#10261A' : '#FFFFFF';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('All');
  const [selectedCrop, setSelectedCrop] = useState('All');
  const [selectedSeason, setSelectedSeason] = useState('All');
  const [appliedSchemes, setAppliedSchemes] = useState([]);
  const [showMySchemes, setShowMySchemes] = useState(false);
  const [schemes, setSchemes] = useState(BUNDLED_SCHEMES);

  // In the Android app this list is hard-coded in the composable; still call
  // api.getGovtSchemes() (mock returns null) and keep the bundled dataset.
  useEffect(() => {
    let active = true;
    api
      .getGovtSchemes()
      .then((res) => {
        if (active && Array.isArray(res) && res.length) setSchemes(res);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  // Apply search + filters (same logic as the Kotlin filter).
  const filteredSchemes = schemes.filter((scheme) => {
    const q = searchQuery.trim().toLowerCase();
    const matchesQuery =
      q.length === 0 ||
      scheme.name.toLowerCase().includes(q) ||
      scheme.shortDescription.toLowerCase().includes(q) ||
      scheme.fullDescription.toLowerCase().includes(q);
    const matchesLocation = selectedLocation === 'All' || scheme.location === selectedLocation;
    const matchesCrop = selectedCrop === 'All' || scheme.crop === selectedCrop;
    const matchesSeason = selectedSeason === 'All' || scheme.season === selectedSeason;
    return matchesQuery && matchesLocation && matchesCrop && matchesSeason;
  });

  const markApplied = (scheme) => {
    setAppliedSchemes((prev) =>
      prev.some((s) => s.name === scheme.name) ? prev : [...prev, scheme]
    );
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: backgroundColor }]} edges={['top']}>
      {/* Top app bar (TopAppBar) */}
      <View style={[styles.topBar, { backgroundColor: topBarColor }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.topBarBtn}
          hitSlop={8}
        >
          <MaterialIcons name="arrow-back" size={24} color={textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.topBarTitle, { color: textPrimary }]}>{t ? t('govt_schemes') : 'Government Schemes'}</Text>
        <TouchableOpacity onPress={() => setShowMySchemes(true)} style={styles.mySchemesBtn} hitSlop={8}>
          <Text style={[styles.mySchemesText, { color: textPrimary }]}>{t ? t('my_schemes') : 'My Schemes'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Search bar */}
        <SearchBar query={searchQuery} onChangeText={setSearchQuery} />

        {/* Filter row: Location / Crop / Season */}
        <View style={styles.filterRow}>
          <FilterDropdown
            label="Location"
            selected={selectedLocation}
            options={LOCATION_OPTIONS}
            chipBg={chipBg}
            sheetBg={dialogBg}
            textPrimary={textPrimary}
            textSecondary={textSecondary}
            onSelect={setSelectedLocation}
          />
          <FilterDropdown
            label="Crop"
            selected={selectedCrop}
            options={CROP_OPTIONS}
            chipBg={chipBg}
            sheetBg={dialogBg}
            textPrimary={textPrimary}
            textSecondary={textSecondary}
            onSelect={setSelectedCrop}
          />
          <FilterDropdown
            label="Season"
            selected={selectedSeason}
            options={SEASON_OPTIONS}
            chipBg={chipBg}
            sheetBg={dialogBg}
            textPrimary={textPrimary}
            textSecondary={textSecondary}
            onSelect={setSelectedSeason}
          />
        </View>

        <View style={{ height: 6 }} />

        {/* Scheme cards */}
        {filteredSchemes.map((scheme) => (
          <SchemeCard
            key={scheme.name}
            scheme={scheme}
            cardColor={cardColor}
            textPrimary={textPrimary}
            textSecondary={textSecondary}
            dialogBg={dialogBg}
            onApplied={markApplied}
          />
        ))}

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* My Schemes dialog */}
      <Modal
        transparent
        visible={showMySchemes}
        animationType="fade"
        onRequestClose={() => setShowMySchemes(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.dialogCard, { backgroundColor: dialogBg }]}>
            <Text style={[styles.dialogTitle, { color: textPrimary }]}>My Schemes</Text>
            {appliedSchemes.length === 0 ? (
              <Text style={[styles.dialogContent, { color: textPrimary }]}>
                You have not applied to any scheme yet.
              </Text>
            ) : (
              <ScrollView style={styles.dialogBody} showsVerticalScrollIndicator>
                {appliedSchemes.map((s) => (
                  <Text key={s.name} style={[styles.appliedItem, { color: textPrimary }]}>
                    • {s.name}
                  </Text>
                ))}
              </ScrollView>
            )}
            <View style={styles.dialogActions}>
              <TouchableOpacity onPress={() => setShowMySchemes(false)} hitSlop={8}>
                <Text style={styles.dialogOk}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },

  // ── Top app bar (TopAppBar) ──
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    paddingHorizontal: 4,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  topBarBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  topBarTitle: { flex: 1, fontSize: 18, fontWeight: '600' },
  mySchemesBtn: { paddingHorizontal: 8, height: 44, alignItems: 'center', justifyContent: 'center' },
  mySchemesText: { fontSize: 13, fontWeight: '500' },

  // ── Layout ──
  content: { paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  filterRow: { flexDirection: 'row', gap: 8 },

  // ── Search bar (rounded 22, white field) ──
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D0D0D0',
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  searchInput: { flex: 1, fontSize: 15, fontWeight: '600', color: '#000000', marginLeft: 10, paddingVertical: 8 },
  searchMicBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },

  // ── Filter chip (AssistChip, rounded 16) ──
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(46,125,50,0.35)',
  },
  filterChipLabel: { fontSize: 11, fontWeight: '500' },

  // ── Scheme card (Card, rounded 20, elevation 2) ──
  schemeCard: {
    borderRadius: 20,
    padding: 16,
    gap: 10,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeaderText: { flex: 1, marginLeft: 12 },
  cardTitle: { fontSize: 18, fontWeight: '600' },
  cardDesc: { fontSize: 13, marginTop: 3, lineHeight: 18 },

  // ── Pill row (Eligibility / Benefits / Documents) ──
  pillRow: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    marginTop: 4,
  },
  pill: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: 'center',
  },
  pillCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: PillBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillLabel: { fontSize: 11, fontWeight: '500', marginTop: 4 },

  // ── Footer (Apply Now + View Guide) ──
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  applyBtn: {
    backgroundColor: PrimaryGreen,
    borderRadius: 30,
    paddingHorizontal: 24,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  guideBtn: { color: GuideGold, fontSize: 14, fontWeight: '600' },

  // ── Dropdown option sheet ──
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  optionSheet: {
    alignSelf: 'stretch',
    borderRadius: 18,
    paddingVertical: 8,
    paddingHorizontal: 4,
    maxHeight: 360,
  },
  optionSheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#9E9E9E',
    marginVertical: 8,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  optionText: { fontSize: 15, fontWeight: '500' },

  // ── Info / My Schemes dialog (AlertDialog) ──
  dialogCard: {
    borderRadius: 24,
    padding: 24,
    width: '100%',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  dialogTitle: { fontSize: 20, fontWeight: '600', marginBottom: 12 },
  dialogBody: { maxHeight: 320, marginBottom: 4 },
  dialogContent: { fontSize: 15, lineHeight: 20 },
  appliedItem: { fontSize: 14, marginVertical: 3, lineHeight: 20 },
  dialogActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12 },
  dialogOk: { color: PrimaryGreen, fontSize: 14, fontWeight: '600', paddingHorizontal: 8, paddingVertical: 6 },
});
