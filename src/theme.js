// AgriVision design system — ported from Compose theme
// (presentation/theme/Color.kt, Type.kt, AgriVisionTheme.kt + per-screen palettes)

export const colors = {
  // Core palette (theme/Color.kt)
  primary: '#2E7D32', // TealPrimary / strong green
  primaryLight: '#4CAF50', // TealLight / fresh green
  onPrimary: '#FFFFFF',

  // Backgrounds
  backgroundLight: '#FBFDF8',
  backgroundDark: '#1A1C19',
  surfaceLight: '#FBFDF8',
  surfaceDark: '#1A1C19',

  // Text
  textPrimary: '#1A1C19',
  textSecondary: '#616161',

  // Accents
  info: '#0288D1',
  error: '#D32F2F',
  warning: '#F57C00',
  success: '#2E7D32',

  // Dashboard palette (presentation/dashboard/DashboardScreen.kt)
  accentGreenSoft: '#C8E6C9',
  dashboardLightBg: '#F3FBF5',
  dashboardDarkBg: '#0A1C12',
  cardLight: '#FFFFFF',
  cardDark: '#153525',

  // Drawer (LeftNavigationDrawer.kt)
  drawerLightBg: '#E8F5E9',
  drawerDarkBg: '#0D1F14',
  drawerLightText: '#0A140D',
  drawerDarkText: '#E8F5E9',

  // Chat (ChatTheme.kt)
  chat: {
    light: {
      background: '#F8F9FA',
      surface: '#FFFFFF',
      primary: '#4CAF50',
      primaryContainer: '#E8F5E9',
      userBubble: '#4CAF50',
      botBubble: '#FFFFFF',
      userText: '#FFFFFF',
      botText: '#212121',
      inputBackground: '#FAFAFA',
      inputBorder: '#E0E0E0',
      quickReplyBg: '#FFFFFF',
      quickReplyBorder: '#4CAF50',
    },
    dark: {
      background: '#0F0F0F',
      surface: '#1C1C1C',
      primary: '#66BB6A',
      primaryContainer: '#2E7D32',
      userBubble: '#66BB6A',
      botBubble: '#262626',
      userText: '#000000',
      botText: '#E8E8E8',
      inputBackground: '#262626',
      inputBorder: '#3F3F3F',
      quickReplyBg: '#262626',
      quickReplyBorder: '#66BB6A',
    },
  },

  // Generic chips / borders
  border: '#E0E0E0',
  divider: '#E0E0E0',
  mutedBg: '#F5F5F5',
};

// Typography scale — theme/Type.kt
export const typography = {
  displayLarge: { fontSize: 34, lineHeight: 40, fontWeight: '700' },
  headlineLarge: { fontSize: 28, lineHeight: 36, fontWeight: '600' },
  titleLarge: { fontSize: 22, lineHeight: 28, fontWeight: '600' },
  titleMedium: { fontSize: 18, lineHeight: 24, fontWeight: '500' },
  titleSmall: { fontSize: 14, lineHeight: 20, fontWeight: '500' },
  bodyLarge: { fontSize: 16, lineHeight: 24, fontWeight: '400' },
  bodyMedium: { fontSize: 14, lineHeight: 20, fontWeight: '400' },
  bodySmall: { fontSize: 12, lineHeight: 16, fontWeight: '400' },
  labelLarge: { fontSize: 14, lineHeight: 20, fontWeight: '600' },
  labelMedium: { fontSize: 12, lineHeight: 16, fontWeight: '500' },
  labelSmall: { fontSize: 11, lineHeight: 16, fontWeight: '500' },
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const radius = { sm: 8, md: 12, lg: 16, xl: 24, pill: 999 };

// Dark/light surface helpers so screens can stay readable in both modes.
export function themed(isDark) {
  return {
    isDark,
    background: isDark ? colors.backgroundDark : colors.backgroundLight,
    surface: isDark ? colors.surfaceDark : '#FFFFFF',
    card: isDark ? colors.cardDark : colors.cardLight,
    text: isDark ? '#E8F5E9' : colors.textPrimary,
    textMuted: isDark ? '#B0B0B0' : colors.textSecondary,
    border: isDark ? '#2A2A2A' : colors.border,
    primary: isDark ? colors.primaryLight : colors.primary,
    info: colors.info,
    error: colors.error,
  };
}
