// Seed data mirroring the Firebase shapes used by the Android app.
// Replace with live API/Firebase responses when wiring the backend.

export const seedUser = {
  uid: 'farmer_SK001',
  email: '',
  name: 'unknown',
  phone: '',
  address: '',
  state: '',
  district: '',
  pincode: '',
  farmingExperience: 0,
  totalLand: 299,
  language: 'English',
  profileImageUrl: '',
  isVerified: false,
};

export const seedFarms = [
  {
    id: 'farm_greenyard',
    name: 'Greenyard Farms',
    location: 'tokyo',
    lat: 35.6762,
    lon: 139.6503,
    acres: 299,
    cropType: 'Wheat',
    soilType: 'Loamy',
    roverId: 'SK-ROVER-01',
    ownerId: 'farmer_SK001',
    userEmail: '',
    status: 'HEALTHY',
    imageUrl: null,
    waterSource: 'Borewell',
    irrigationType: 'Auto Mode',
    description: 'Greenyard Wheat plot with smart irrigation.',
    createdAt: 1735689600000,
    updatedAt: 1735689600000,
    isActive: true,
    harvestDate: '2026-11-20',
    plantingDate: '2026-07-15',
    lastIrrigated: '2026-09-09',
    soilHealth: 'Good',
    cropHealth: 'Healthy',
    fertilizersUsed: ['Urea', 'DAP'],
    pesticidesUsed: ['Neem Oil'],
    weatherAlerts: true,
    notes: '',
  },
  {
    id: 'farm_beta02',
    name: 'Beta Farm',
    location: 'Pune, Maharashtra',
    lat: 18.5204,
    lon: 73.8567,
    acres: 8,
    cropType: 'Wheat',
    soilType: 'Black',
    roverId: 'SK-ROVER-02',
    ownerId: 'farmer_SK001',
    userEmail: '',
    status: 'NEEDS_ATTENTION',
    imageUrl: null,
    waterSource: 'Canal',
    irrigationType: 'Sprinkler',
    description: 'Wheat field near the canal.',
    createdAt: 1735776000000,
    updatedAt: 1735776000000,
    isActive: true,
    harvestDate: '2026-12-05',
    plantingDate: '2026-08-01',
    lastIrrigated: '2026-09-07',
    soilHealth: 'Fair',
    cropHealth: 'Monitor',
    fertilizersUsed: ['NPK 19:19:19'],
    pesticidesUsed: [],
    weatherAlerts: true,
    notes: 'Watch for aphids.',
  },
];

// Firebase live path: dashboard/farmer_SK001/farm_alpha01/live
export const liveSnapshot = {
  irrigation: { pump: 0, rain: 0, tank: 0, tds: 0 },
  nodes: {
    zone_1: { moisture: 68, temperature: 0, humidity: 0, n: 846, p: 845, k: 1014, ph: 3.0, ec: 922.0 },
    zone_2: { moisture: 45, temperature: 24, humidity: 55, n: 35, p: 28, k: 32, ph: 6.5, ec: 1.4 },
  },
};

export const sensorNodes = [
  { id: 'zone_1', moisture: 68, humidity: 0, temperature: 0, n: 846, p: 845, k: 1014, ph: 3.0, ec: 922.0 },
  { id: 'zone_2', moisture: 45, humidity: 55, temperature: 24, n: 35, p: 28, k: 32, ph: 6.5, ec: 1.4 },
];

// Language options — onboarding/LanguageSelectionScreen.kt
export const languages = [
  { code: 'en', name: 'English', native: 'English', flag: '🇬🇧' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी', flag: '🇮🇳' },
  { code: 'mr', name: 'Marathi', native: 'मराठी', flag: '🇮🇳' },
  { code: 'ta', name: 'Tamil', native: 'தமிழ்', flag: '🇮🇳' },
  { code: 'te', name: 'Telugu', native: 'తెలుగు', flag: '🇮🇳' },
  { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ', flag: '🇮🇳' },
  { code: 'bn', name: 'Bengali', native: 'বাংলা', flag: '🇮🇳' },
  { code: 'gu', name: 'Gujarati', native: 'ગુજરાતી', flag: '🇮🇳' },
  { code: 'pa', name: 'Punjabi', native: 'ਪੰਜਾਬੀ', flag: '🇮🇳' },
];
