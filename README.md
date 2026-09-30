# AgriVision — React Native (Expo) replica

A faithful React Native / Expo rewrite of the **AgriVision** smart-farming app
(originally a native Android Jetpack Compose app in this repo). Built for
**Expo Go** — no native builds needed.

## Run it

```bash
npm install
npx expo start        # scan the QR with Expo Go (Android/iOS)
```

## Project layout

```
App.js                        Root: SafeAreaProvider → AppProvider → Navigator
app.json                      Expo config (name AgriVision, permissions, plugins)
assets/app/                   Images copied from the Android app's res/drawable + res/raw
src/
  theme.js                    Colors & typography ported from Compose theme
  context/AppContext.js       Session, user, farms CRUD, language, dark mode
  navigation/AppNavigator.js  All routes (mirrors Screen.kt)
  components/index.js         AppHeader, AppDrawer, AppCard, PrimaryButton, Chip, etc.
  data/mockData.js            Seed farms, sensor nodes, live snapshot, languages
  services/api.js             ⚠️ All backend calls live here (see below)
  screens/                    One file per screen (26 screens)
```

## Routes (mirror of `Screen.kt`)

Splash, Onboarding, Language, Login, Otp, FarmerDetails, HomeLanding,
Dashboard, AddFarm, EditFarm, FarmNodes, FarmMap, Profile, KrishiMitri,
CropRecommendation, FertilizerRecommendation, DiseaseDetection,
DiseaseProcessing, DiseaseResult, MarketPrice, Rover, Logs, Assistant,
GovtSchemes, Crops, Equipment, FAQ.

## Adding the real APIs

Everything network/ML/Firebase related is funnelled through
**`src/services/api.js`**. It currently returns local mock data so the app is
fully usable offline. To go live, replace the bodies there:

| Function | Backend |
|---|---|
| `sendOtp` / `verifyOtp` / `signInWithGoogle` | Firebase Auth (see `AuthRepository.kt`, test numbers `+919876543210`→`123456`) |
| `getFarmerProfile` / `saveFarmerProfile` | Firestore `farmers` |
| `getFarms` / `saveFarm` / `removeFarm` | Firestore `farms` |
| `predictDisease` | ML server `POST disease/predict` (see `ApiService.kt`) |
| `chatCompletion` | OpenAI `v1/chat/completions` (`CONFIG.OPENAI_API_KEY`) |
| `subscribeLiveData` | Firebase Realtime DB `dashboard/farmer_SK001/farm_alpha01/live` |
| `getWeather` | OpenWeather (`CONFIG.OPENWEATHER_API_KEY`) |

ML models shipped with the Android app (`crop_model.tflite`,
`fertilizer_model.tflite`, `SoilSuitabilityModel.tflite`, `*.pkl`, `*.json`)
can be found under `../AgriVision_tech-main/app/src/main/assets/` if you want
to later run inference on-device with `@tensorflow/tfjs-react-native` or an
Expo-compatible tflite binding.

## Notes

- The dashboard drawer is a custom component (`AppDrawer`) — no
  react-native-gesture-handler required, safe for Expo Go.
- Disease detection uses `expo-image-picker` (camera + gallery) with an
  animated analysis screen and an AI expert panel.
- The `Assistant` screen simulates voice commands locally (no native speech).
- Dark/light mode toggle lives on the Dashboard top bar and Profile.
