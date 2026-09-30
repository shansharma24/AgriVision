// ─────────────────────────────────────────────────────────────────────────────
// AgriVision — FAQ screen
// Ported from presentation/faq/FAQScreen.kt
// (header + search + category chips + expandable Q&A cards)
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { useApp } from '../context/AppContext';

// 🎨 Professional Color Scheme (FAQScreen.kt)
const PRIMARY_GREEN = '#2E7D32'; // 0xFF2E7D32
const SECONDARY_GREEN = '#388E3C'; // 0xFF388E3C
const ACCENT_GREEN = '#66BB6A'; // 0xFF66BB6A
const LIGHT_BACKGROUND = '#F5F5F5'; // 0xFFF5F5F5
const CARD_BACKGROUND = '#FFFFFF'; // 0xFFFFFFFF

// Compose Color.Gray / Color.DarkGray / Color.LightGray
const GRAY = '#888888';
const DARK_GRAY = '#444444';
const LIGHT_GRAY = '#D3D3D3';

// Hex color + alpha suffix helper (Color.copy(alpha) in Compose)
const withAlpha = (hex, alpha) => {
  const a = Math.round(alpha * 255).toString(16).padStart(2, '0');
  return `${hex}${a}`;
};

// 📝 FAQ Data Model (getFAQCategories() in FAQScreen.kt)
const FAQ_CATEGORIES = [
  {
    title: 'General',
    icon: 'info',
    color: '#1976D2',
    questions: [
      {
        question: 'What is AgriVision?',
        answer:
          'AgriVision is an AI-powered agricultural platform that helps farmers manage their farms efficiently using modern technology. It provides real-time monitoring, disease detection, market prices, and expert farming advice.',
      },
      {
        question: 'How do I get started with AgriVision?',
        answer:
          "Simply sign up with your phone number or email, complete your farmer profile, add your farm details, and you're ready to start! The app will guide you through each step.",
      },
      {
        question: 'Is AgriVision free to use?',
        answer:
          'Yes! AgriVision offers a free version with essential features. Premium features like advanced analytics and unlimited disease scans are available through our subscription plans.',
      },
      {
        question: 'Which languages are supported?',
        answer:
          'AgriVision currently supports English, Hindi, and several regional languages. You can change the language anytime from the settings.',
      },
      {
        question: 'Can I use AgriVision offline?',
        answer:
          'Some features like viewing saved farm data work offline. However, AI disease detection, market prices, and Krishi Mitri chat require an internet connection.',
      },
    ],
  },
  {
    title: 'Farm',
    icon: 'agriculture',
    color: '#388E3C',
    questions: [
      {
        question: 'How do I add a new farm?',
        answer:
          "Tap the 'Add Farm' button on the home screen, enter your farm details including name, location, crop type, and acreage. You can also add photos and set up sensors if available.",
      },
      {
        question: 'Can I manage multiple farms?',
        answer:
          'Yes! You can add and manage unlimited farms in your account. Switch between farms easily from the home screen.',
      },
      {
        question: 'How do I edit my farm details?',
        answer:
          "Long press on any farm card, select 'Edit Farm Details', make your changes, and save. You can update crop type, acreage, location, and other information.",
      },
      {
        question: 'What happens if I delete a farm?',
        answer:
          'Deleting a farm permanently removes all associated data including sensor history, logs, and analytics. This action cannot be undone, so please be careful!',
      },
      {
        question: 'How do I track different crops on the same farm?',
        answer:
          'Currently, each farm supports one primary crop type. If you grow multiple crops, we recommend creating separate farms for each major crop for better tracking and insights.',
      },
    ],
  },
  {
    title: 'Disease',
    icon: 'local-florist',
    color: '#E65100',
    questions: [
      {
        question: 'How does disease detection work?',
        answer:
          "Our AI analyzes photos of your plant leaves using advanced machine learning. Simply take a clear photo of the affected leaf, and within seconds you'll get disease identification and treatment recommendations.",
      },
      {
        question: 'Which crops are supported for disease detection?',
        answer:
          'We currently support disease detection for major crops including rice, wheat, corn, tomato, potato, cotton, and many more. The list is constantly expanding!',
      },
      {
        question: 'How accurate is the disease detection?',
        answer:
          'Our AI model has 90-95% accuracy based on extensive training data. However, for serious issues, we always recommend consulting with local agricultural experts.',
      },
      {
        question: 'What should I do after detecting a disease?',
        answer:
          'The app provides detailed treatment plans including immediate steps, organic treatments, chemical solutions, and prevention strategies. Follow the recommendations and monitor your crop regularly.',
      },
      {
        question: 'Can I save disease detection results?',
        answer:
          'Yes! All your disease detection results are automatically saved in your farm history. You can access them anytime from the Logs section.',
      },
    ],
  },
  {
    title: 'AI Chat',
    icon: 'chat',
    color: '#7CB342',
    questions: [
      {
        question: 'What is Krishi Mitri?',
        answer:
          'Krishi Mitri is your personal AI farming assistant powered by ChatGPT. Ask any agriculture-related question and get expert advice on farming practices, crop care, pest control, and more.',
      },
      {
        question: 'What kind of questions can I ask?',
        answer:
          'You can ask about crop cultivation, soil management, irrigation, fertilizers, pest control, weather impact, market trends, government schemes, and any other farming-related topics.',
      },
      {
        question: 'Is Krishi Mitri available 24/7?',
        answer:
          'Yes! Krishi Mitri is available round the clock to answer your farming questions. Get instant expert advice whenever you need it.',
      },
      {
        question: 'Can Krishi Mitri provide local recommendations?',
        answer:
          'Yes! Krishi Mitri considers your location, crop type, and local conditions when providing recommendations. Make sure your profile and farm details are complete for best results.',
      },
      {
        question: 'Is my conversation with Krishi Mitri private?',
        answer:
          'Absolutely! All conversations are private and encrypted. We never share your personal farming data with third parties.',
      },
    ],
  },
  {
    title: 'Market',
    icon: 'trending-up',
    color: '#D32F2F',
    questions: [
      {
        question: 'How often are market prices updated?',
        answer:
          'Market prices are updated in real-time from government and market sources. You can view live prices for major crops, vegetables, and commodities across different mandis.',
      },
      {
        question: 'Can I compare prices across different markets?',
        answer:
          'Yes! The Market Price feature allows you to compare prices across multiple mandis and markets to help you make better selling decisions.',
      },
      {
        question: 'What government schemes are available?',
        answer:
          'We provide comprehensive information about all major agricultural schemes including PM-KISAN, crop insurance, subsidies, loans, and state-specific programs. Check the Govt Schemes section regularly for updates.',
      },
      {
        question: 'How do I apply for government schemes?',
        answer:
          'Each scheme listing includes detailed eligibility criteria, required documents, and step-by-step application instructions. Some schemes also have direct links to official portals.',
      },
      {
        question: 'Can I get price alerts for my crops?',
        answer:
          "Premium users can set up custom price alerts. You'll receive notifications when prices for your selected crops reach your target threshold.",
      },
    ],
  },
  {
    title: 'Support',
    icon: 'settings',
    color: '#5E35B1',
    questions: [
      {
        question: 'Why is the app not working properly?',
        answer:
          'First, check your internet connection. Then try closing and reopening the app. If issues persist, clear app cache from your phone settings or reinstall the app.',
      },
      {
        question: 'How do I reset my password?',
        answer:
          "On the login screen, tap 'Forgot Password', enter your registered email or phone number, and follow the instructions sent to you.",
      },
      {
        question: 'My disease detection is taking too long. What should I do?',
        answer:
          'Disease detection usually takes 5-10 seconds. If it is taking longer, check your internet connection. Try taking a clearer photo with good lighting and retry.',
      },
      {
        question: 'How do I contact customer support?',
        answer:
          'You can reach our support team via the in-app chat, email at support@AgriVision.com, or call our helpline. We typically respond within 24 hours.',
      },
      {
        question: 'Is my data secure?',
        answer:
          'Yes! We use bank-level encryption to protect your data. Your farm information, photos, and personal details are stored securely and never shared without your permission.',
      },
      {
        question: 'How do I delete my account?',
        answer:
          'Go to Profile > Settings > Account > Delete Account. Please note this action is permanent and will delete all your data including farm records and history.',
      },
    ],
  },
];

// 🗂️ FAQ Card with Expandable Answer (FAQCard in FAQScreen.kt)
function FAQCard({ question, answer, categoryColor, card, qColor, aColor, dividerColor }) {
  const [expanded, setExpanded] = useState(false);
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: expanded ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [expanded, opacity]);

  return (
    <View style={[styles.faqCard, { backgroundColor: card, elevation: 3, shadowOpacity: 0.06 }]}>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => setExpanded(!expanded)}
        style={styles.faqCardInner}
        accessibilityRole="button"
        accessibilityLabel={expanded ? 'Collapse' : 'Expand'}
      >
        {/* Question Header */}
        <View style={styles.faqHeader}>
          <View style={styles.faqQuestionRow}>
            <View style={[styles.faqBadge, { backgroundColor: withAlpha(categoryColor, 0.15) }]}>
              <MaterialIcons name="help-outline" size={20} color={categoryColor} />
            </View>
            <Text style={[styles.faqQuestion, { color: qColor }]}>{question}</Text>
          </View>

          <View style={[styles.expandCircle, { backgroundColor: withAlpha(categoryColor, 0.1) }]}>
            <MaterialIcons
              name={expanded ? 'expand-less' : 'expand-more'}
              size={20}
              color={categoryColor}
            />
          </View>
        </View>

        {/* Answer (Expandable) */}
        {expanded && (
          <Animated.View style={{ opacity }}>
            <View style={[styles.divider, { backgroundColor: dividerColor }]} />
            <View style={styles.answerRow}>
              <View style={[styles.faqBadge, { backgroundColor: withAlpha(ACCENT_GREEN, 0.15) }]}>
                <MaterialIcons name="lightbulb-outline" size={20} color={ACCENT_GREEN} />
              </View>
              <Text style={[styles.faqAnswer, { color: aColor }]}>{answer}</Text>
            </View>
          </Animated.View>
        )}
      </TouchableOpacity>
    </View>
  );
}

// 🔍 Empty Search State (EmptySearchState in FAQScreen.kt)
function EmptySearchState({ isDark }) {
  const gray = isDark ? '#B0B0B0' : GRAY;
  return (
    <View style={styles.emptyState}>
      <MaterialIcons name="search-off" size={100} color={withAlpha(GRAY, 0.25)} />
      <Text style={[styles.emptyTitle, { color: gray }]}>No results found</Text>
      <Text style={[styles.emptySubtitle, { color: withAlpha(gray, 0.7) }]}>
        Try a different search term
      </Text>
    </View>
  );
}

// ── Screen ───────────────────────────────────────────────────────────────────
export default function FAQScreen() {
  const navigation = useNavigation();
  const { isDark, t } = useApp();

  const [selectedCategory, setSelectedCategory] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  const backgroundColor = isDark ? '#1A1C19' : LIGHT_BACKGROUND;
  const card = isDark ? '#153525' : CARD_BACKGROUND;
  const qColor = isDark ? '#E8F5E9' : DARK_GRAY;
  const aColor = isDark ? '#B0B0B0' : GRAY;
  const dividerColor = isDark ? '#2A2A2A' : withAlpha(LIGHT_GRAY, 0.3);
  const placeholderColor = isDark ? '#B0B0B0' : GRAY;
  const inputTextColor = isDark ? '#E8F5E9' : '#1A1C19';

  const currentCategory = FAQ_CATEGORIES[selectedCategory];

  // Filtered questions (matches Kotlin search logic)
  const filteredQuestions =
    searchQuery === ''
      ? currentCategory.questions
      : FAQ_CATEGORIES.flatMap((c) => c.questions).filter(
          (it) =>
            it.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
            it.answer.toLowerCase().includes(searchQuery.toLowerCase())
        );

  const searching = searchQuery !== '';

  return (
    <SafeAreaView edges={['top']} style={[styles.safe, { backgroundColor }]}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={PRIMARY_GREEN}
      />

      {/* Top app bar (TopAppBar in FAQScreen.kt) */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={8}>
          <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>{t ? t('faq') : 'FAQ'}</Text>
      </View>

      <View style={styles.body}>
        {/* 🔍 Search Bar */}
        <View style={[styles.searchCard, { backgroundColor: card, elevation: 4, shadowOpacity: 0.08 }]}>
          <MaterialIcons name="search" size={24} color={SECONDARY_GREEN} />
          <TextInput
            style={[styles.searchInput, { color: inputTextColor }]}
            placeholder="Search questions..."
            placeholderTextColor={placeholderColor}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
            returnKeyType="search"
            selectionColor={SECONDARY_GREEN}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={8}>
              <MaterialIcons name="close" size={20} color={placeholderColor} />
            </TouchableOpacity>
          )}
        </View>

        {/* 📂 Category Chips Row */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
        >
          {FAQ_CATEGORIES.map((category, index) => {
            const isSelected = selectedCategory === index;
            return (
              <TouchableOpacity
                key={category.title}
                activeOpacity={0.8}
                onPress={() => setSelectedCategory(index)}
                style={[
                  styles.chip,
                  {
                    height: 40,
                    backgroundColor: isSelected ? category.color : withAlpha(category.color, 0.1),
                    borderWidth: isSelected ? 2 : 1,
                    borderColor: isSelected ? category.color : withAlpha(category.color, 0.3),
                  },
                ]}
              >
                <MaterialIcons
                  name={category.icon}
                  size={18}
                  color={isSelected ? '#FFFFFF' : category.color}
                />
                <Text
                  style={[
                    styles.chipText,
                    {
                      color: isSelected ? '#FFFFFF' : category.color,
                      fontWeight: isSelected ? '700' : '500',
                    },
                  ]}
                >
                  {category.title}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={{ height: 16 }} />

        {/* ❓ Questions List / Empty state */}
        {filteredQuestions.length === 0 ? (
          <EmptySearchState isDark={isDark} />
        ) : (
          <ScrollView
            style={styles.list}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Show category name if searching */}
            {searching && (
              <View
                style={[
                  styles.infoBanner,
                  { backgroundColor: withAlpha(currentCategory.color, 0.1) },
                ]}
              >
                <MaterialIcons name="info" size={20} color={currentCategory.color} />
                <Text style={[styles.infoText, { color: currentCategory.color }]}>
                  {`Found ${filteredQuestions.length} result${filteredQuestions.length > 1 ? 's' : ''}`}
                </Text>
              </View>
            )}

            {filteredQuestions.map((faqItem) => (
              <FAQCard
                key={faqItem.question}
                question={faqItem.question}
                answer={faqItem.answer}
                categoryColor={currentCategory.color}
                card={card}
                qColor={qColor}
                aColor={aColor}
                dividerColor={dividerColor}
              />
            ))}
          </ScrollView>
        )}
      </View>
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
    backgroundColor: PRIMARY_GREEN,
    elevation: 4,
  },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  topBarTitle: { fontSize: 22, fontWeight: '700', color: '#FFFFFF', marginLeft: 4 },

  body: { flex: 1 },

  // ── Search bar card ──
  searchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    shadowColor: '#000',
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  searchInput: { flex: 1, height: 52, fontSize: 15, marginLeft: 8, padding: 0 },

  // ── Category chips row ──
  chipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    paddingHorizontal: 14,
    gap: 6,
  },
  chipText: { fontSize: 14 },

  // ── Questions list ──
  list: { flex: 1 },
  listContent: { paddingHorizontal: 16, paddingBottom: 16, gap: 12 },

  // Search info banner
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  infoText: { fontSize: 14, fontWeight: '600' },

  // ── FAQ card ──
  faqCard: {
    borderRadius: 16,
    shadowColor: '#000',
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  faqCardInner: { padding: 16 },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  faqQuestionRow: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  faqBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  faqQuestion: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
    marginTop: 7,
  },
  expandCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  divider: { height: 1, marginTop: 16, marginBottom: 16 },
  answerRow: { flexDirection: 'row', gap: 12 },
  faqAnswer: { flex: 1, fontSize: 14, lineHeight: 21 },

  // ── Empty state ──
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyTitle: { fontSize: 20, fontWeight: '700' },
  emptySubtitle: { fontSize: 14 },
});
