// ─────────────────────────────────────────────────────────────────────────────
// AgriVision — Market Price screen
// Ported from presentation/market/MarketPriceScreen.kt
// (search bar, Location/Grade filter chips, Today's Average Price card with
//  up/down indicator, Price Trend line chart with 7D/1M/3M range chips,
//  3-Day Prediction, and Nearby Mandis list). Calls api.getMarketPrices()
//  and falls back to the bundled MarketRepositoryMock dataset when null.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../theme';
import { useApp } from '../context/AppContext';
import * as api from '../services/api';

// ── Screen-local palette (MarketPriceScreen.kt) ──────────────────────────────
const PRIMARY_GREEN = '#2E7D32'; // primaryGreen — constant in both themes
const RED = '#FF0000';           // Compose Color.Red

const withAlpha = (hex, alpha) => {
  const r = parseInt(hex.substring(1, 3), 16);
  const g = parseInt(hex.substring(3, 5), 16);
  const b = parseInt(hex.substring(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
};

// ── Bundled dataset (MarketRepositoryMock.kt) ────────────────────────────────
const BUNDLED_DATA = {
  todayPrice: {
    commodity: 'Tomato',
    location: 'Pune',
    grade: 'A',
    unit: '₹ / Quintal',
    todayPrice: 2500,
    change: 50,
    lastUpdated: '10:30 AM',
  },
  trendPoints: [
    { dayLabel: 'Day 1', value: 2100 },
    { dayLabel: 'Day 2', value: 2200 },
    { dayLabel: 'Day 3', value: 2300 },
    { dayLabel: 'Day 4', value: 2350 },
    { dayLabel: 'Day 5', value: 2400 },
    { dayLabel: 'Day 6', value: 2480 },
    { dayLabel: 'Today', value: 2500 },
  ],
  predictions: [
    { label: 'Tomorrow', price: 2520 },
    { label: 'Day After', price: 2550 },
    { label: 'In 3 Days', price: 2530 },
  ],
  nearbyMandis: [
    { mandiName: 'Pune APMC', distanceKm: 15, price: 2510 },
    { mandiName: 'Manchar Market', distanceKm: 45, price: 2540 },
    { mandiName: 'Pimpri Mandi', distanceKm: 22, price: 2480 },
  ],
};

// ── Search bar (SearchBarCard.kt) ────────────────────────────────────────────
function SearchBarCard({ query, onChangeText, textPrimary, textSecondary, cardColor }) {
  return (
    <View style={[styles.card, styles.searchCard, { backgroundColor: cardColor }]}>
      <MaterialIcons name="search" size={24} color={textSecondary} />
      <TextInput
        style={[styles.searchInput, { color: textPrimary }]}
        value={query}
        onChangeText={onChangeText}
        placeholder="Tomato"
        placeholderTextColor={textSecondary}
        singleLine
      />
      <TouchableOpacity onPress={() => {}} hitSlop={8} style={styles.iconBtn}>
        <MaterialIcons name="mic" size={24} color={textSecondary} />
      </TouchableOpacity>
    </View>
  );
}

// ── Filter chip (FilterChipCard.kt) ──────────────────────────────────────────
function FilterChipCard({ icon, label, textPrimary, textSecondary, chipBg }) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => {}}
      style={[styles.filterChip, { backgroundColor: chipBg }]}
    >
      <MaterialIcons name={icon} size={20} color={textPrimary} />
      <Text style={[styles.filterChipLabel, { color: textPrimary }]} numberOfLines={1}>
        {label}
      </Text>
      <MaterialIcons name="arrow-drop-down" size={20} color={textSecondary} />
    </TouchableOpacity>
  );
}

// ── Today's price card (TodayPriceCard.kt) ───────────────────────────────────
function TodayPriceCard({ price, cardColor, textPrimary, textSecondary }) {
  const up = price.change >= 0;
  const sign = up ? '+' : '-';
  const percentChange =
    price.todayPrice !== 0
      ? (Math.abs(price.change) / Math.max(Math.abs(price.todayPrice - price.change), 1)) * 100
      : 0;
  const changeColor = up ? PRIMARY_GREEN : RED;
  const changeBg = up ? withAlpha(PRIMARY_GREEN, 0.15) : withAlpha(RED, 0.15);
  const changeIcon = up ? 'arrow-upward' : 'arrow-downward';

  return (
    <View style={[styles.card, styles.todayCard, { backgroundColor: cardColor }]}>
      <Text style={[styles.todayLabel, { color: textSecondary }]}>
        Today’s Average Price
      </Text>
      <Text style={[styles.todayPrice, { color: textPrimary }]}>
        ₹{price.todayPrice} / Quintal
      </Text>
      <View style={styles.changeRow}>
        <View style={[styles.changeBadge, { backgroundColor: changeBg }]}>
          <MaterialIcons name={changeIcon} size={16} color={changeColor} />
        </View>
        <Text style={[styles.changeText, { color: changeColor }]}>
          {sign}₹{Math.abs(price.change)} ({Math.abs(percentChange).toFixed(2)}%)
        </Text>
      </View>
      <View style={{ height: 4 }} />
      <Text style={[styles.lastUpdated, { color: textSecondary }]}>
        Last updated: {price.lastUpdated}
      </Text>
    </View>
  );
}

// ── Price line chart (PriceLineChart.kt, view-only no SVG) ───────────────────
function PriceLineChart({ points, lineColor, fillColor }) {
  const [width, setWidth] = useState(0);

  if (!points || points.length === 0) return null;

  const H = 164; // 180dp box minus vertical 8dp padding each side
  const pad = 8;
  const min = Math.min(...points.map((p) => p.value));
  const max = Math.max(...points.map((p) => p.value));
  const range = Math.max(max - min, 1);
  const innerW = Math.max(width - pad * 2, 0);
  const stepX = points.length > 1 ? innerW / (points.length - 1) : 0;

  const mapped = points.map((p, i) => {
    const ratio = (p.value - min) / range;
    const y = H - ratio * H;
    return { x: pad + stepX * i, y: pad + y };
  });

  const stroke = 6;
  const segments = [];
  for (let i = 0; i < mapped.length - 1; i++) {
    const a = mapped[i];
    const b = mapped[i + 1];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist === 0) continue;
    const angle = Math.atan2(dy, dx);
    segments.push(
      <View
        key={`seg${i}`}
        style={{
          position: 'absolute',
          left: a.x - dist / 2,
          top: a.y - stroke / 2,
          width: dist,
          height: stroke,
          borderRadius: stroke / 2,
          backgroundColor: lineColor,
          transform: [{ rotate: `${angle}rad` }],
        }}
      />
    );
  }

  // Area fill under the line — scanline approximation of the filled polygon
  const bands = [];
  if (width > 0) {
    for (let y = 0; y <= H; y++) {
      const yy = y + pad;
      const xs = [];
      for (let i = 0; i < mapped.length - 1; i++) {
        const a = mapped[i];
        const b = mapped[i + 1];
        const yMin = Math.min(a.y, b.y);
        const yMax = Math.max(a.y, b.y);
        if (yy >= yMin && yy <= yMax && b.x !== a.x) {
          const t = (yy - a.y) / (b.y - a.y);
          if (t >= 0 && t <= 1) xs.push(a.x + t * (b.x - a.x));
        }
      }
      if (xs.length >= 2) {
        const x1 = Math.min(...xs);
        const x2 = Math.max(...xs);
        bands.push(
          <View
            key={`band${y}`}
            style={{ position: 'absolute', left: x1, top: yy, width: x2 - x1, height: 1, backgroundColor: fillColor }}
          />
        );
      }
    }
  }

  return (
    <View style={styles.chart} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {bands}
      {segments}
      {mapped.map((p, i) => (
        <View
          key={`dot${i}`}
          style={{
            position: 'absolute',
            left: p.x - 5,
            top: p.y - 5,
            width: 10,
            height: 10,
            borderRadius: 5,
            backgroundColor: lineColor,
          }}
        />
      ))}
    </View>
  );
}

// ── Price trend card (PriceTrendCard.kt) ─────────────────────────────────────
function PriceTrendCard({ selectedRange, onRangeSelected, trendPoints, cardColor, textPrimary, textSecondary, t }) {
  const ranges = ['7D', '1M', '3M'];
  return (
    <View style={[styles.card, styles.trendCard, { backgroundColor: cardColor }]}>
      <View style={styles.trendHeader}>
        <Text style={[styles.sectionTitle, { color: textPrimary }]}>{t ? t('price_trend') : 'Price Trend'}</Text>
        <View style={styles.rangeRow}>
          {ranges.map((label) => {
            const isSelected = selectedRange === label;
            return (
              <TouchableOpacity
                key={label}
                activeOpacity={0.7}
                onPress={() => onRangeSelected(label)}
                style={[
                  styles.rangeChip,
                  isSelected
                    ? { backgroundColor: PRIMARY_GREEN, borderColor: PRIMARY_GREEN }
                    : { backgroundColor: 'transparent', borderColor: withAlpha(PRIMARY_GREEN, 0.4) },
                ]}
              >
                <Text
                  style={[styles.rangeChipText, { color: isSelected ? '#FFFFFF' : PRIMARY_GREEN }]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
      <View style={{ height: 8 }} />
      <PriceLineChart
        points={trendPoints}
        lineColor={PRIMARY_GREEN}
        fillColor={withAlpha(PRIMARY_GREEN, 0.18)}
      />
    </View>
  );
}

// ── Prediction small card (PredictionSmallCard.kt) ───────────────────────────
function PredictionSmallCard({ label, price, textPrimary, textSecondary }) {
  return (
    <View style={[styles.predictionCard, { borderColor: withAlpha(PRIMARY_GREEN, 0.25) }]}>
      <Text style={[styles.predictionLabel, { color: textSecondary }]}>{label}</Text>
      <Text style={[styles.predictionPrice, { color: textPrimary }]}>₹{price}</Text>
      <Text style={[styles.predictionUnit, { color: textSecondary }]}>/ Quintal</Text>
    </View>
  );
}

// ── 3-Day prediction card (PredictionCard.kt) ────────────────────────────────
function PredictionCard({ predictions, cardColor, textPrimary, textSecondary }) {
  return (
    <View style={[styles.card, styles.predictionCardWrap, { backgroundColor: cardColor }]}>
      <View style={styles.predictionHeader}>
        <Text style={[styles.sectionTitle, { color: textPrimary }]}>3-Day Prediction</Text>
        <Text style={[styles.bestSellingLabel, { color: textSecondary }]}>Best Selling Day</Text>
      </View>
      <View style={{ height: 4 }} />
      <View style={styles.predictionRow}>
        {predictions.map((day) => (
          <PredictionSmallCard
            key={day.label}
            label={day.label}
            price={day.price}
            textPrimary={textPrimary}
            textSecondary={textSecondary}
          />
        ))}
      </View>
      <View style={{ height: 10 }} />
      <View style={[styles.bestDayBox, { backgroundColor: withAlpha(PRIMARY_GREEN, 0.06) }]}>
        <MaterialIcons name="local-offer" size={20} color={PRIMARY_GREEN} />
        <View style={{ marginLeft: 8, flex: 1 }}>
          <Text style={[styles.bestDayTitle, { color: PRIMARY_GREEN }]}>
            Best Day to Sell: Friday
          </Text>
          <Text style={[styles.bestDaySubtitle, { color: textSecondary }]}>
            Prices expected to peak due to increased weekend demand.
          </Text>
        </View>
      </View>
    </View>
  );
}

// ── Nearby mandis section (NearbyMandisSection.kt) ───────────────────────────
function NearbyMandisSection({ items, cardColor, textPrimary, textSecondary, t }) {
  return (
    <View style={styles.mandisWrap}>
      <Text style={[styles.sectionTitle, { color: textPrimary }]}>
        {t ? t('nearby_mandis') : 'Prices in Nearby Mandis'}
      </Text>
      {items.map((mandi) => (
        <View key={mandi.mandiName} style={[styles.card, styles.mandiCard, { backgroundColor: cardColor }]}>
          <View style={styles.mandiLeft}>
            <Text style={[styles.mandiName, { color: textPrimary }]}>{mandi.mandiName}</Text>
            <Text style={[styles.mandiDistance, { color: textSecondary }]}>
              {mandi.distanceKm} km away
            </Text>
          </View>
          <View style={styles.mandiRight}>
            <Text style={[styles.mandiPrice, { color: PRIMARY_GREEN }]}>₹{mandi.price}</Text>
            <Text style={[styles.mandiUnit, { color: textSecondary }]}>/ Quintal</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

// ── Screen (MarketPriceScreen.kt) ────────────────────────────────────────────
export default function MarketPriceScreen() {
  const navigation = useNavigation();
  const { isDark, t } = useApp();

  const backgroundColor = isDark ? '#0F1A15' : '#F4F6F5';
  const cardColor = isDark ? '#162920' : '#FFFFFF';
  const textPrimary = isDark ? '#EAF7EC' : '#0B140C';
  const textSecondary = isDark ? '#A9C3AF' : '#9E9E9E'; // Compose Color.Gray
  const chipBg = isDark ? '#1F3328' : '#E4F3E6';

  const [commodityQuery, setCommodityQuery] = useState('Tomato');
  const [selectedLocation] = useState('Pune');
  const [selectedGrade] = useState('A');
  const [selectedRange, setSelectedRange] = useState('7D');
  const [data, setData] = useState(BUNDLED_DATA);

  // In the Android app this data comes from MarketRepositoryMock (a future
  // Retrofit/API call). Call api.getMarketPrices() and keep the bundled
  // dataset when the API returns null.
  useEffect(() => {
    let active = true;
    api
      .getMarketPrices()
      .then((res) => {
        if (active && res) setData(res);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const marketPrice = data.todayPrice;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor }]} edges={['top']}>
      {/* Top app bar (CenterAlignedTopAppBar) */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.topBarBtn}
          hitSlop={8}
        >
          <MaterialIcons name="arrow-back" size={24} color={textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.topBarTitle, { color: textPrimary }]}>{t ? t('market_prices') : 'Market Insights'}</Text>
        <TouchableOpacity onPress={() => {}} style={styles.topBarBtn} hitSlop={8}>
          <MaterialIcons name="share" size={22} color={textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Search */}
        <SearchBarCard
          query={commodityQuery}
          onChangeText={setCommodityQuery}
          textPrimary={textPrimary}
          textSecondary={textSecondary}
          cardColor={cardColor}
        />

        {/* Filters row (Location / Grade) */}
        <View style={styles.filterRow}>
          <View style={styles.filterChipFlex}>
            <FilterChipCard
              icon="place"
              label={`Location: ${selectedLocation}`}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
              chipBg={chipBg}
            />
          </View>
          <View style={styles.filterChipFlex}>
            <FilterChipCard
              icon="grade"
              label={`Grade: ${selectedGrade}`}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
              chipBg={chipBg}
            />
          </View>
        </View>

        {/* Today's price */}
        <TodayPriceCard
          price={marketPrice}
          cardColor={cardColor}
          textPrimary={textPrimary}
          textSecondary={textSecondary}
        />

        {/* Trend graph */}
        <PriceTrendCard
          selectedRange={selectedRange}
          onRangeSelected={setSelectedRange}
          trendPoints={data.trendPoints}
          cardColor={cardColor}
          textPrimary={textPrimary}
          textSecondary={textSecondary}
          t={t}
        />

        {/* 3-day prediction */}
        <PredictionCard
          predictions={data.predictions}
          cardColor={cardColor}
          textPrimary={textPrimary}
          textSecondary={textSecondary}
        />

        {/* Nearby mandis */}
        <NearbyMandisSection
          items={data.nearbyMandis}
          cardColor={cardColor}
          textPrimary={textPrimary}
          textSecondary={textSecondary}
          t={t}
        />

        <View style={{ height: 24 }} />
      </ScrollView>
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
  topBarTitle: { flex: 1, textAlign: 'center', fontSize: 20, fontWeight: '700' },

  // ── Layout ──
  content: { paddingHorizontal: 16, paddingVertical: 8, gap: 12 },
  filterRow: { flexDirection: 'row', gap: 8 },
  filterChipFlex: { flex: 1 },

  // ── Generic card ──
  card: {
    borderRadius: 18,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },

  // ── Search bar ──
  searchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
  },
  searchInput: { flex: 1, fontSize: 16, paddingVertical: 4, marginLeft: 8 },
  iconBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },

  // ── Filter chips ──
  filterChip: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 50,
    paddingHorizontal: 12,
    gap: 6,
  },
  filterChipLabel: { fontSize: 13, fontWeight: '500', flexShrink: 1 },

  // ── Today price ──
  todayCard: { padding: 16, gap: 8 },
  todayLabel: { fontSize: 13 },
  todayPrice: { fontSize: 26, fontWeight: '700' },
  changeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  changeBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  changeText: { fontSize: 13 },
  lastUpdated: { fontSize: 11 },

  // ── Price trend ──
  trendCard: { padding: 16, gap: 10 },
  trendHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: { fontSize: 16, fontWeight: '600' },
  rangeRow: { flexDirection: 'row', gap: 6 },
  rangeChip: {
    height: 30,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rangeChipText: { fontSize: 12, fontWeight: '500' },
  chart: { width: '100%', height: 180 },

  // ── Prediction ──
  predictionCardWrap: { padding: 16, gap: 10 },
  predictionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bestSellingLabel: { fontSize: 13 },
  predictionRow: { flexDirection: 'row', gap: 10 },
  predictionCard: {
    flex: 1,
    height: 80,
    borderRadius: 14,
    borderWidth: 1,
    padding: 10,
    justifyContent: 'space-between',
  },
  predictionLabel: { fontSize: 11 },
  predictionPrice: { fontSize: 15, fontWeight: '600' },
  predictionUnit: { fontSize: 10 },
  bestDayBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 10,
  },
  bestDayTitle: { fontSize: 13, fontWeight: '500' },
  bestDaySubtitle: { fontSize: 11, marginTop: 2 },

  // ── Nearby mandis ──
  mandisWrap: { gap: 8 },
  mandiCard: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mandiLeft: { gap: 2 },
  mandiName: { fontWeight: '500' },
  mandiDistance: { fontSize: 11 },
  mandiRight: { alignItems: 'flex-end' },
  mandiPrice: { fontSize: 16, fontWeight: '700' },
  mandiUnit: { fontSize: 11 },
});
