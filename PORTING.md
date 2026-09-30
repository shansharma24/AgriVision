# Porting guide — Compose (Kotlin) → React Native (Expo)

You are porting ONE screen of the Android app **AgriVision** into the existing
Expo project at the repo root. Produce a faithful visual replica: same layout,
same colors, same copy, same icons, same interactions. Do not redesign.

## Hard rules

- **Plain JavaScript only** (no TypeScript, no JSX-in-.ts).
- Each screen is one file `src/screens/<Name>.js` and must
  `export default function <Name>(...)`.
- **Do not edit any other file.** Everything you need already exists.
- Never import a file that does not exist. Allowed imports are listed below.
- Reuse the design system — do not invent new colors. Use `src/theme.js`.
- Use `MaterialIcons` (or `Ionicons`/`FontAwesome5`) from `@expo/vector-icons`
  for every icon; match the Compose icon's meaning.
- Wrap the screen in `SafeAreaView` from `react-native-safe-area-context`
  (use `edges={['top']}` when you draw your own header) or use `<AppHeader/>`.
- Long content goes in `ScrollView`. Lists use `FlatList` only if long.
- Keep every visible string exactly as in the Kotlin source (emoji included).
- Add `key` props to mapped children. No console warnings.
- Prefer `useState`/`useEffect`; no external state libraries.
- If the Kotlin uses a network/ML/Firebase call, call the matching function in
  `src/services/api.js` (it returns mock data for now) and keep the loading /
  error UI the source shows.

## Available imports

```js
import { View, Text, StyleSheet, ScrollView, FlatList, TouchableOpacity,
  TextInput, Image, ImageBackground, ActivityIndicator, Modal, Switch,
  Alert, Dimensions, StatusBar, Platform, Linking, RefreshControl,
  KeyboardAvoidingView, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons, FontAwesome5, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation, useRoute } from '@react-navigation/native';

import { colors, typography, spacing, radius, themed } from '../theme';
import { useApp } from '../context/AppContext';
import { AppHeader, AppCard, PrimaryButton, Chip, SectionHeader,
  LoadingView, EmptyState } from '../components';
import * as api from '../services/api';
import { liveSnapshot, sensorNodes } from '../data/mockData';
```

- `useApp()` gives: `{ isLoggedIn, user, setUser, farms, selectedFarm,
  selectFarm, addFarm, updateFarm, deleteFarm, language, setLanguage, isDark,
  toggleTheme, login, logout, hydrated }`.
- Navigation: `const navigation = useNavigation();` then
  `navigation.navigate('Route', { ...params })`, `navigation.goBack()`,
  `navigation.replace('Route')`, `navigation.popToTop()`.

## Route names & params (mirror of Screen.kt)

| Route | Params |
|---|---|
| Splash, Onboarding, Language, Login, Otp, HomeLanding, Dashboard, AddFarm, Profile, KrishiMitri, CropRecommendation, FertilizerRecommendation, DiseaseDetection, MarketPrice, Rover, Logs, Assistant, GovtSchemes, Crops, Equipment, FAQ | — |
| FarmerDetails | `{ email }` |
| EditFarm | `{ farmId }` |
| FarmNodes | `{ farmId }` |
| FarmMap | `{ farmId }` |
| DiseaseProcessing | `{ imageUri, cropType }` |
| DiseaseResult | `{ crop, disease, confidence, imageUri }` |

Read params with `const { farmId } = useRoute().params || {}`.

## Assets (copied from the Android app)

Reference with a relative path from `src/screens/`, i.e. `../../assets/app/<file>`:

`app_logo11.jpeg`, `bot.png`, `farm_placeholder.png`, `farm_placeholder2.png`,
`img.png`, `leaf_pic.png`, `onboarding1.png`, `onboarding2.png`,
`onboarding3.png`, `tomato_early_blight.png`

The `.mp4` files are 132-byte placeholders — for the splash video use
`app_logo11.jpeg` with an animated fade/scale instead.

Static requires must be literal: `require('../../assets/app/onboarding1.png')`.

## Theme tokens

```js
colors.primary        // #2E7D32
colors.primaryLight   // #4CAF50
colors.backgroundLight// #FBFDF8
colors.backgroundDark // #1A1C19
colors.textPrimary    // #1A1C19
colors.textSecondary  // #616161
colors.info           // #0288D1
colors.error          // #D32F2F
colors.warning        // #F57C00
colors.accentGreenSoft// #C8E6C9
colors.dashboardLightBg // #F3FBF5
colors.dashboardDarkBg  // #0A1C12
colors.cardDark       // #153525
colors.cardLight      // #FFFFFF
```
`themed(isDark)` returns `{ background, surface, card, text, textMuted, border, primary }`.

Screen-local palettes in the Kotlin files (e.g. `PrimaryGreen`, `AccentGreenSoft`,
`LightBackground`, `CardDark`) map onto the tokens above. A dark/light pair in
Kotlin maps to `isDark ? <dark> : <light>` from `useApp()` when the screen
already reads `ThemeState.isDarkTheme`; otherwise port the light values only.

## Fidelity checklist

1. Same top bar (title, back/menu, actions) — use `AppHeader` when it matches.
2. Same cards, radii (16), padding (16), elevation/shadow.
3. Same labels, units (`%`, `°C`, `mS/cm`, `ppm`), and emoji.
4. Same chips / status colors / progress bars.
5. Same navigation targets on every tap.
6. Empty / loading / error states preserved.
