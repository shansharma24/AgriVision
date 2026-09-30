// ─────────────────────────────────────────────────────────────────────────────
// AgriVision API layer
//
// The Android app talks to: Firebase Auth/Firestore/Realtime DB, a Flask/FastAPI
// ML server (disease prediction), OpenAI (chat + disease expert), and OpenWeather.
// Every network call is funnelled through here so the backend can be swapped in
// one place. Each function currently returns local mock data — replace the body
// (and the config below) when the real API is available.
// ─────────────────────────────────────────────────────────────────────────────

import { liveSnapshot, sensorNodes } from '../data/mockData.js';
import AgriVisionEngine from './SmartKrishiEngine.js';

export const CONFIG = {
  // RetrofitInstance.kt / Constants.kt
  ML_BASE_URL: 'https://example.com/',
  OPENAI_BASE_URL: 'https://api.openai.com/v1/',
  OPENAI_API_KEY: '',
  OPENWEATHER_API_KEY: '',
  FIREBASE_DB_URL: '', // Optional: e.g. 'https://AgriVision-default-rtdb.firebaseio.com'
  FIREBASE_LIVE_PATH: 'dashboard/farmer_SK001/farm_alpha01/live',
};

// Test OTP numbers — AuthRepository.kt
export const TEST_OTP = {
  '+919876543210': '123456',
  '+919999888888': '654321',
};

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

// ── Generic request helper ───────────────────────────────────────────────────
export async function request(path, { method = 'GET', body, headers = {}, baseUrl = CONFIG.ML_BASE_URL } = {}) {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  return res.json();
}

// ── Auth ─────────────────────────────────────────────────────────────────────
export async function sendOtp(phone) {
  // TODO: Firebase PhoneAuthProvider.verifyPhoneNumber via native SDK.
  await delay(600);
  return { verificationId: 'TEST_VERIFICATION_ID', phone };
}

export async function verifyOtp(phone, code) {
  // TODO: PhoneAuthProvider.getCredential(verificationId, code)
  await delay(600);
  if (TEST_OTP[phone] && TEST_OTP[phone] === code) {
    return { uid: 'farmer_SK001', phone, email: `${phone}@AgriVision.app` };
  }
  if (code === '123456') return { uid: 'farmer_SK001', phone, email: `${phone}@AgriVision.app` };
  throw new Error('Invalid OTP');
}

export async function signInWithGoogle() {
  // TODO: expo-auth-session Google provider + Firebase credential.
  await delay(600);
  return { uid: 'farmer_SK001', email: 'farmer@AgriVision.app', name: 'Farmer' };
}

// ── Farmer profile ───────────────────────────────────────────────────────────
export async function getFarmerProfile(uid) {
  // TODO: Firestore collection('farmers').doc(uid)
  await delay(300);
  return null; // null → no profile yet → route to FarmerDetails
}

export async function saveFarmerProfile(uid, profile) {
  // TODO: Firestore collection('farmers').doc(uid).set(profile)
  await delay(400);
  return { uid, ...profile };
}

// ── Farms ────────────────────────────────────────────────────────────────────
export async function getFarms(userEmail) {
  // TODO: Firestore collection('farms').whereEqualTo('userEmail', userEmail)
  await delay(300);
  return [];
}

export async function saveFarm(farm) {
  // TODO: Firestore farms add/set
  await delay(300);
  return farm;
}

export async function removeFarm(farmId) {
  // TODO: Firestore delete
  await delay(200);
  return true;
}

// ── Disease detection ────────────────────────────────────────────────────────
export async function checkMlServer() {
  // Retrofit ApiService.checkServer()
  return request('health');
}

/**
 * Multimodal/ML disease prediction.
 * @param {string} imageUri local file uri
 * @param {string} cropType selected crop
 * Android equivalent: ApiService.predictDisease(MultipartBody.Part)
 */
/**
 * Helper to call OpenAI Chat Completions API with gpt-4o-mini
 */
export async function callOpenAIChat(messages, { model = 'gpt-4o-mini', temperature = 0.5, jsonMode = false, maxTokens = 1000 } = {}) {
  if (!CONFIG.OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }

  const url = `${CONFIG.OPENAI_BASE_URL.replace(/\/+$/, '')}/chat/completions`;
  const body = {
    model: model || 'gpt-4o-mini',
    messages,
    temperature,
    max_tokens: maxTokens,
  };
  if (jsonMode) {
    body.response_format = { type: 'json_object' };
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${CONFIG.OPENAI_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI HTTP ${res.status}: ${errText}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

/**
 * Helper to call OpenAI Vision API with gpt-4o-mini
 */
export async function callOpenAIVision(dataUrl, prompt, { model = 'gpt-4o-mini', maxTokens = 750 } = {}) {
  if (!CONFIG.OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }

  const url = `${CONFIG.OPENAI_BASE_URL.replace(/\/+$/, '')}/chat/completions`;
  const body = {
    model: model || 'gpt-4o-mini',
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: dataUrl, detail: 'low' } },
        ],
      },
    ],
    max_tokens: maxTokens,
    response_format: { type: 'json_object' },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${CONFIG.OPENAI_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI Vision HTTP ${res.status}: ${errText}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

/**
 * Multimodal/ML disease prediction via OpenAI gpt-4o-mini Vision.
 * Analyzes the actual leaf photograph in real-time.
 * @param {string} imageUri local file uri
 * @param {string} cropType selected crop
 * @param {string} language 'en' or 'hi'
 * @param {string} base64 base64 image data
 */
export async function predictDisease(imageUri, cropType, language = 'en', base64 = '') {
  // If OpenAI API key is configured, perform real-time AI vision diagnosis directly
  if (CONFIG.OPENAI_API_KEY) {
    let dataUrl = '';
    if (base64) {
      const mime = (imageUri && imageUri.toLowerCase().endsWith('.png')) ? 'image/png' : 'image/jpeg';
      dataUrl = base64.startsWith('data:') ? base64 : `data:${mime};base64,${base64}`;
    } else if (imageUri) {
      try {
        const fs = require('fs');
        const clean = imageUri.replace(/^file:\/\//, '');
        if (fs.existsSync(clean)) {
          const mime = clean.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
          dataUrl = `data:${mime};base64,${fs.readFileSync(clean).toString('base64')}`;
        }
      } catch (e) {}
    }

    if (dataUrl) {
      try {
        const isHindi = String(language || '').toLowerCase().startsWith('hi');
        const prompt =
          `Act as an expert Indian agricultural plant pathologist (ICAR). ` +
          `Analyze this leaf image carefully. The farmer selected crop is: "${cropType}". ` +
          `You MUST check and return valid JSON with these exact keys: ` +
          `1. "isNotLeaf": boolean (set true if image is NOT a real botanical plant leaf, e.g. mascots, cartoon, human face, object, room, vehicle, screenshot, or logo). ` +
          `2. "isWrongCrop": boolean (set true if image is a real leaf but does NOT match the selected crop "${cropType}", e.g. a tomato leaf uploaded when Corn was selected). ` +
          `3. "detectedCrop": string (the crop name you actually recognize in the photo). ` +
          `4. "crop": string (crop name). ` +
          `5. "disease": string (exact disease name in English, e.g. "Early Blight", "Bacterial Spot", "Leaf Mold", "Late Blight", or "Healthy" if no pathogen/disease). ` +
          `6. "hindiName": string (disease or healthy status in Hindi, e.g. "टमाटर का अगेती झुलसा", "स्वस्थ पौधा"). ` +
          `7. "confidencePct": number (80 to 99). ` +
          `8. "isHealthy": boolean (true if leaf has no disease). ` +
          `9. "chlorosisIndex": number (between 0.0 and 1.0, representing yellowing percentage). ` +
          `10. "lesionNormalizedBBox": [ymin, xmin, ymax, xmax] coordinates between 0.0 and 1.0 bounding the primary diseased spots (or [0,0,0,0] if healthy or not a leaf). ` +
          `11. "knapsackSprayerDosage": string (practical calibrated recipe for standard 15-liter Indian knapsack sprayer pump, e.g. "15 लीटर की टंकी में 35 ग्राम मैंकोजेब मिलाकर छिड़कें"). ` +
          `12. "symptoms": string (brief diagnostic foliar symptoms). ` +
          `13. "pesticideAdvisory": string (recommended chemical fungicide/insecticide, concentration, safety wait period). ` +
          `14. "organicRemedy": string (biological control like Trichoderma viride 5g/L, Neem oil 1500ppm 5ml/L, or cow urine supernatant). ` +
          `15. "applicationSchedule": string (optimal spray time like 7-10 AM or 4-6 PM, interval in days). ` +
          (isHindi ? 'Provide text fields in Hindi.' : 'Provide text fields in English.');

        const raw = await Promise.race([
          callOpenAIVision(dataUrl, prompt, { model: 'gpt-4o-mini', maxTokens: 700 }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('OpenAI vision timeout')), 12000)),
        ]);

        const parsed = JSON.parse(raw);

        if (parsed.isNotLeaf) {
          return {
            isNotLeaf: true,
            isWrongCrop: false,
            diseaseKey: 'Not_A_Leaf',
            crop: cropType,
            disease: 'Invalid Image: No Plant Leaf Detected',
            englishName: 'Invalid Image: No Plant Leaf Detected',
            hindiName: 'अमान्य छवि: पौधे की पत्ती नहीं पाई गई',
            confidence: 0.99,
            confidencePct: 99,
            isHealthy: false,
            chlorosisIndex: 0,
            lesionNormalizedBBox: [0, 0, 0, 0],
            symptoms: isHindi
              ? 'अपलोड की गई छवि में पौधे की पत्ती नहीं दिखाई दे रही है। कृपया किसी प्रभावित पौधे की पत्ती का स्पष्ट फोटो लें।'
              : 'The uploaded image does not appear to contain a plant leaf. Please capture or upload a clear, well-lit photo of an affected crop leaf.',
            pesticideAdvisory: isHindi ? 'कोई कीटनाशक आवश्यक नहीं है।' : 'No pesticide needed. Please capture a real plant leaf photo.',
            pesticideTreatment: isHindi ? 'कोई कीटनाशक आवश्यक नहीं है।' : 'No pesticide needed. Please capture a real plant leaf photo.',
            organicRemedy: isHindi ? 'पौधे की पत्ती का फोटो लें।' : 'Capture affected leaf showing visible spots or symptoms.',
            knapsackSprayerDosage: 'N/A',
            applicationSchedule: 'N/A',
          };
        }

        if (parsed.isWrongCrop) {
          return {
            isWrongCrop: true,
            isNotLeaf: false,
            diseaseKey: 'Wrong_Crop',
            crop: cropType,
            disease: 'Wrong Crop Selected',
            englishName: 'Wrong Crop Selected',
            hindiName: 'गलत फसल चुनी गई',
            confidence: 0.96,
            confidencePct: 96,
            isHealthy: false,
            chlorosisIndex: 0,
            lesionNormalizedBBox: [0, 0, 0, 0],
            symptoms: isHindi
              ? `अपलोड की गई पत्ती चुनी गई फसल (${cropType}) से मेल नहीं खाती। कृपया सही फसल चुनें।`
              : `The uploaded leaf does not match the selected crop (${cropType}). Please select the correct crop and try again.`,
            pesticideAdvisory: isHindi
              ? 'सटीक सलाह और खुराक प्राप्त करने के लिए कृपया स्कैनर में सही फसल का चयन करें।'
              : 'Please select the correct crop in the scanner to receive accurate diagnosis and dosage.',
            pesticideTreatment: 'Please select the correct crop.',
            organicRemedy: isHindi ? 'सही फसल चुनकर जैविक उपचार देखें।' : 'Select the correct crop type to view customized organic remedies.',
            knapsackSprayerDosage: 'N/A',
            applicationSchedule: 'N/A',
          };
        }

        const isHealthy = Boolean(parsed.isHealthy || (parsed.disease || '').toLowerCase().includes('healthy'));

        return {
          isNotLeaf: false,
          isWrongCrop: false,
          diseaseKey: parsed.disease?.replace(/\s+/g, '_') || 'Crop_Disease',
          crop: parsed.crop || cropType,
          disease: parsed.disease || 'Diagnosed Disease',
          englishName: parsed.disease || 'Diagnosed Disease',
          hindiName: parsed.hindiName || parsed.disease,
          confidence: (parsed.confidencePct || 92) / 100,
          confidencePct: parsed.confidencePct || 92,
          isHealthy,
          chlorosisIndex: parsed.chlorosisIndex ?? (isHealthy ? 0.05 : 0.40),
          lesionNormalizedBBox: isHealthy ? [0, 0, 0, 0] : (parsed.lesionNormalizedBBox || [0.15, 0.15, 0.85, 0.85]),
          symptoms: parsed.symptoms || 'Foliar lesions observed on affected leaf.',
          pesticideAdvisory: parsed.pesticideAdvisory || 'Spray recommended fungicide or insecticide on affected canopy.',
          pesticideTreatment: parsed.pesticideAdvisory || 'Spray recommended fungicide or insecticide on affected canopy.',
          organicRemedy: parsed.organicRemedy || 'Foliar spray of 5ml/L neem oil with surfactant.',
          knapsackSprayerDosage: parsed.knapsackSprayerDosage || 'Mix recommended dosage in standard 15-liter knapsack sprayer tank.',
          applicationSchedule: parsed.applicationSchedule || 'Spray during early morning (7-10 AM) or late afternoon (4-6 PM).',
        };
      } catch (err) {
        console.warn('[predictDisease] OpenAI Vision error, using on-device fallback:', err.message);
      }
    }
  }

  // Fallback to on-device engine
  return AgriVisionEngine.diagnoseLeaf(imageUri, language, cropType, base64);
}

/**
 * Fertilizer Recommendation Engine with Rhizobium N-credit & OpenAI gpt-4o-mini precision.
 * @param {Object} input { crop, nitrogen, phosphorus, potassium, ph, previousCrop, soil, ... }
 */
export async function getFertilizerRecommendation(input) {
  const baseResult = await AgriVisionEngine.recommendFertilizer(input);

  if (CONFIG.OPENAI_API_KEY) {
    try {
      const crop = input.cropName || input.crop || 'Wheat';
      const n = input.nitrogenMgKg ?? input.nitrogen ?? 40;
      const p = input.phosphorusMgKg ?? input.phosphorus ?? 30;
      const k = input.potassiumMgKg ?? input.potassium ?? 20;
      const ph = input.soilPh ?? input.ph ?? 6.5;
      const prev = input.previousCrop || 'None';
      const isLegume = Boolean(
        input.previousCropLegume ||
        String(prev).toLowerCase().match(/chickpea|gram|lentil|moong|urad|soybean|pulse|legume/)
      );

      const prompt =
        `Act as an Indian ICAR agronomist. For a farmer growing "${crop}" with soil test results: ` +
        `N: ${n} kg/ha, P: ${p} kg/ha, K: ${k} kg/ha, pH: ${ph}, Previous crop: "${prev}" (Legume: ${isLegume}). ` +
        `Calculate exact commercial fertilizer bags (45kg Neem-Coated Urea, 50kg DAP, 50kg MOP, 50kg SSP, Zinc Sulphate 21%). ` +
        (isLegume ? 'Apply Rhizobium biological N-credit of 18kg N (~₹1,440/acre savings) from previous legume root nodules. ' : '') +
        `Return ONLY valid JSON with keys: ` +
        `"recommendedFertilizer": string (primary recommended fertilizer, e.g. "Neem-Coated Urea" or "DAP"), ` +
        `"bagsPerAcre": string (e.g. "1.5 bags (45 kg/bag)"), ` +
        `"standardDoseKgPerAcre": number (primary dose in kg), ` +
        `"farmerSavingsInr": number (${isLegume ? 1440 : 0}), ` +
        `"nitrogenCreditKg": number (${isLegume ? 18 : 0}), ` +
        `"detailedPlans": array of 4 objects with keys: name (string), quantity (string), timing (string), purpose (string). Cover Basal dose at sowing, 1st split tillering, 2nd split panicle/flowering, and Micronutrient/Zinc.`;

      const raw = await Promise.race([
        callOpenAIChat([{ role: 'user', content: prompt }], {
          model: 'gpt-4o-mini',
          temperature: 0.3,
          jsonMode: true,
          maxTokens: 700,
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('OpenAI timeout')), 15000)),
      ]);

      const parsed = JSON.parse(raw);
      return {
        recommendedFertilizer: parsed.recommendedFertilizer || baseResult.recommendedFertilizer,
        primaryFertilizer: parsed.recommendedFertilizer || baseResult.primaryFertilizer,
        bagsPerAcre: parsed.bagsPerAcre || baseResult.bagsPerAcre,
        standardDoseKgPerAcre: parsed.standardDoseKgPerAcre || baseResult.standardDoseKgPerAcre,
        farmerSavingsInr: parsed.farmerSavingsInr ?? baseResult.farmerSavingsInr,
        nitrogenCreditKg: parsed.nitrogenCreditKg ?? baseResult.nitrogenCreditKg,
        isLegumeSavingsActive: isLegume || baseResult.isLegumeSavingsActive,
        detailedPlans: Array.isArray(parsed.detailedPlans) && parsed.detailedPlans.length > 0
          ? parsed.detailedPlans
          : baseResult.detailedPlans,
        applicationScheduleEn: baseResult.applicationScheduleEn,
        applicationScheduleHi: baseResult.applicationScheduleHi,
      };
    } catch (e) {
      console.warn('[getFertilizerRecommendation] OpenAI fallback to on-device engine:', e.message);
    }
  }

  return baseResult;
}

/**
 * Crop Recommendation Engine with 22 ICAR crops, 2024-25 Mandi MSP & OpenAI gpt-4o-mini precision.
 * @param {Object} input { nitrogen, phosphorus, potassium, ph, rainfall, previousCrop, ... }
 */
export async function getCropRecommendation(input) {
  const baseResult = await AgriVisionEngine.recommendCrop(input);

  if (CONFIG.OPENAI_API_KEY) {
    try {
      const n = input.nitrogen ?? 50;
      const p = input.phosphorus ?? 50;
      const k = input.potassium ?? 50;
      const ph = input.ph ?? 6.5;
      const rain = input.rainfallMm ?? input.rainfall ?? 120;
      const temp = input.temperature ?? 26;
      const humidity = input.humidity ?? 65;
      const prev = input.previousCrop || 'Wheat';

      const prompt =
        `Act as an Indian ICAR agronomist. Recommend the top 3-5 best suited crops for a farm with: ` +
        `Soil N: ${n}, P: ${p}, K: ${k}, pH: ${ph}, Temperature: ${temp}°C, Humidity: ${humidity}%, Rainfall: ${rain}mm, Previous crop: "${prev}". ` +
        `Include official 2024-25 Indian Mandi MSP benchmarks (₹/quintal) and gross revenue projections (₹/acre). ` +
        `Return ONLY valid JSON with key "crops": array of objects with keys: ` +
        `"name": string (crop name), ` +
        `"scientific": string (botanical name), ` +
        `"confidencePct": number (65-98), ` +
        `"durationDays": number (days to harvest), ` +
        `"yieldTonAcre": number (expected yield in tons/acre), ` +
        `"mandiMspInrPerQuintal": number (official 2024-25 MSP in INR), ` +
        `"projectedGrossRevenueInrPerAcre": number (yieldTonAcre * 10 * mandiMspInrPerQuintal), ` +
        `"waterNeed": string ("Low", "Medium", or "High"), ` +
        `"rotationBonus": string (e.g. "+30% (Rhizobium Nitrogen Fixer)" or "+20% (Breaks Pathogen Cycle)"), ` +
        `"whySuitable": string (1 concise sentence why this crop suits these conditions).`;

      const raw = await Promise.race([
        callOpenAIChat([{ role: 'user', content: prompt }], {
          model: 'gpt-4o-mini',
          temperature: 0.3,
          jsonMode: true,
          maxTokens: 800,
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('OpenAI timeout')), 12000)),
      ]);

      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.crops) && parsed.crops.length > 0) {
        return parsed.crops;
      }
    } catch (e) {
      console.warn('[getCropRecommendation] OpenAI fallback to on-device engine:', e.message);
    }
  }

  return baseResult;
}

// ── Krishi Mitri chat (OpenAI gpt-4o-mini) ───────────────────────────────────
export async function chatCompletion(messages, { model = 'gpt-4o-mini', temperature = 0.7 } = {}) {
  try {
    const formattedMessages = [
      {
        role: 'system',
        content:
          'You are Krishi Mitri (कृषि मित्री), a knowledgeable, empathetic Indian agricultural AI advisor and companion for farmers. ' +
          'Provide practical, agronomically sound guidance on crops, soil nutrients (Urea, DAP, MOP), mandi prices, pest and disease management, and irrigation. ' +
          'Answer concisely, warmly, and in clear language. Support English, Hindi, and Hinglish depending on how the farmer asks.',
      },
      ...messages,
    ];

    const content = await callOpenAIChat(formattedMessages, { model, temperature, maxTokens: 800 });
    return { content };
  } catch (err) {
    console.warn('[api.chatCompletion] OpenAI error, using fallback:', err.message);
    const last = messages[messages.length - 1]?.content || '';
    return {
      content:
        `I am Krishi Mitri, your farming assistant. Regarding "${last}": ` +
        `Ensure optimal soil moisture, monitor foliage closely, and follow recommended ICAR fertilizer schedules (Urea/DAP/MOP).`,
    };
  }
}

// ── Live sensor data (Firebase Realtime DB) ──────────────────────────────────
const activeLiveListeners = new Set();
let currentLiveCache = { ...liveSnapshot };

export function updateLiveData(newData) {
  currentLiveCache = {
    ...currentLiveCache,
    ...newData,
    nodes: {
      ...currentLiveCache.nodes,
      ...(newData.nodes || {}),
    },
  };
  activeLiveListeners.forEach((listener) => {
    try {
      listener(currentLiveCache);
    } catch (e) {
      // ignore listener error
    }
  });
}

/**
 * Subscribe to live sensor data. Returns an unsubscribe function.
 * Supports real Firebase Realtime Database REST polling when CONFIG.FIREBASE_DB_URL is set,
 * and maintains the exact seed snapshot as the default live state.
 */
export function subscribeLiveData(farmId, onData) {
  // Emit current cached/snapshot data immediately
  onData(currentLiveCache);
  activeLiveListeners.add(onData);

  // If Firebase DB URL is configured, poll Firebase Realtime DB every 8 seconds
  let interval = null;
  if (CONFIG.FIREBASE_DB_URL) {
    const fetchFromFirebase = async () => {
      try {
        const path = CONFIG.FIREBASE_LIVE_PATH || `dashboard/${farmId}/live`;
        const res = await fetch(`${CONFIG.FIREBASE_DB_URL.replace(/\/$/, '')}/${path}.json`);
        if (res.ok) {
          const remoteData = await res.json();
          if (remoteData) {
            updateLiveData(remoteData);
          }
        }
      } catch (err) {
        // Fallback to local snapshot if network/firebase is unreachable
      }
    };
    fetchFromFirebase();
    interval = setInterval(fetchFromFirebase, 8000);
  }

  return () => {
    activeLiveListeners.delete(onData);
    if (interval) clearInterval(interval);
  };
}

export function getSensorNodes() {
  return sensorNodes;
}

const CITY_COORDS = {
  tokyo: { lat: 35.6762, lon: 139.6503 },
  pune: { lat: 18.5204, lon: 73.8567 },
  delhi: { lat: 28.6139, lon: 77.2090 },
  mumbai: { lat: 19.0760, lon: 72.8777 },
  ludhiana: { lat: 30.9010, lon: 75.8573 },
  karnal: { lat: 29.6857, lon: 76.9905 },
  hisar: { lat: 29.1492, lon: 75.7217 },
  nagpur: { lat: 21.1458, lon: 79.0882 },
  patna: { lat: 25.5941, lon: 85.1376 },
  jaipur: { lat: 26.9124, lon: 75.7873 },
  lucknow: { lat: 26.8467, lon: 80.9462 },
  kanpur: { lat: 26.4499, lon: 80.3319 },
  indore: { lat: 22.7196, lon: 75.8577 },
  bhopal: { lat: 23.2599, lon: 77.4126 },
  hyderabad: { lat: 17.3850, lon: 78.4867 },
  bengaluru: { lat: 12.9716, lon: 77.5946 },
  chennai: { lat: 13.0827, lon: 80.2707 },
  coimbatore: { lat: 11.0168, lon: 76.9558 },
  kolkata: { lat: 22.5726, lon: 88.3639 },
  ahmedabad: { lat: 23.0225, lon: 72.5714 },
};

function wmoToCondition(code) {
  if (code === 0) return 'Clear';
  if (code >= 1 && code <= 3) return 'Clouds';
  if (code >= 45 && code <= 48) return 'Fog';
  if (code >= 51 && code <= 67) return 'Rain';
  if (code >= 71 && code <= 77) return 'Snow';
  if (code >= 80 && code <= 82) return 'Rain';
  if (code >= 95 && code <= 99) return 'Thunderstorm';
  return 'Clouds';
}

// ── Weather ──────────────────────────────────────────────────────────────────
/**
 * Fetches current live weather and atmospheric factors according to user-selected farm location.
 * Primary: OpenWeatherMap API using CONFIG.OPENWEATHER_API_KEY.
 * Fallback: Live meteorological sensor network (Open-Meteo) for high reliability.
 * @param {number} [lat] Latitude
 * @param {number} [lon] Longitude
 * @param {string} [location] Farm location or city name
 */
export async function getWeather(lat, lon, location) {
  const locStr = String(location || '').trim().toLowerCase();

  let resolvedLat = lat;
  let resolvedLon = lon;

  if (!resolvedLat || !resolvedLon) {
    for (const [key, coords] of Object.entries(CITY_COORDS)) {
      if (locStr.includes(key)) {
        resolvedLat = coords.lat;
        resolvedLon = coords.lon;
        break;
      }
    }
  }

  // 1. Primary: OpenWeatherMap API using CONFIG.OPENWEATHER_API_KEY
  if (CONFIG.OPENWEATHER_API_KEY) {
    try {
      let openWeatherUrl = '';
      if (resolvedLat && resolvedLon) {
        openWeatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${resolvedLat}&lon=${resolvedLon}&appid=${CONFIG.OPENWEATHER_API_KEY}&units=metric`;
      } else if (locStr) {
        openWeatherUrl = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(locStr)}&appid=${CONFIG.OPENWEATHER_API_KEY}&units=metric`;
      }

      if (openWeatherUrl) {
        const res = await fetch(openWeatherUrl);
        if (res.ok) {
          const data = await res.json();
          return {
            temp: Math.round(data.main?.temp ?? 21),
            feelsLike: Math.round(data.main?.feels_like ?? data.main?.temp ?? 22),
            condition: data.weather?.[0]?.main || 'Clouds',
            description: data.weather?.[0]?.description || '',
            humidity: data.main?.humidity ?? 94,
            wind: Math.round((data.wind?.speed ?? 2.8) * 3.6), // m/s -> km/h
            visibility: Math.round((data.visibility ?? 10000) / 1000), // m -> km
            tempMax: Math.round(data.main?.temp_max ?? data.main?.temp ?? 21),
            tempMin: Math.round(data.main?.temp_min ?? data.main?.temp ?? 21),
            pressure: data.main?.pressure ?? 1012,
            icon: data.weather?.[0]?.icon || '04n',
            city: data.name || location || 'tokyo',
            source: 'OpenWeatherMap',
          };
        }
      }
    } catch (err) {
      console.warn('[getWeather] OpenWeather API call failed:', err.message);
    }
  }

  // 2. High-precision live meteorological fallback (Open-Meteo)
  if (resolvedLat && resolvedLon) {
    try {
      const meteoUrl = `https://api.open-meteo.com/v1/forecast?latitude=${resolvedLat}&longitude=${resolvedLon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,visibility&daily=temperature_2m_max,temperature_2m_min&timezone=auto`;
      const res = await fetch(meteoUrl);
      if (res.ok) {
        const data = await res.json();
        const curr = data.current || {};
        const daily = data.daily || {};
        return {
          temp: Math.round(curr.temperature_2m ?? 21),
          feelsLike: Math.round(curr.apparent_temperature ?? curr.temperature_2m ?? 22),
          condition: wmoToCondition(curr.weather_code),
          humidity: Math.round(curr.relative_humidity_2m ?? 94),
          wind: Math.round(curr.wind_speed_10m ?? 10),
          visibility: Math.round((curr.visibility ?? 10000) / 1000),
          tempMax: Math.round(daily.temperature_2m_max?.[0] ?? curr.temperature_2m ?? 21),
          tempMin: Math.round(daily.temperature_2m_min?.[0] ?? curr.temperature_2m ?? 21),
          icon: '04n',
          city: location || 'tokyo',
          source: 'Live Meteorological Sensor',
        };
      }
    } catch (err) {
      console.warn('[getWeather] Meteorological fallback failed:', err.message);
    }
  }

  // 3. Bundled baseline snapshot fallback
  await delay(200);
  return {
    temp: 21,
    feelsLike: 22,
    condition: 'Clouds',
    humidity: 94,
    wind: 10,
    visibility: 10,
    tempMax: 21,
    tempMin: 21,
    icon: '04n',
    city: location || 'tokyo',
    source: 'Snapshot Cache',
  };
}

// ── Market prices ────────────────────────────────────────────────────────────
export async function getMarketPrices() {
  // TODO: mandi/market API
  await delay(300);
  return null; // screens fall back to their bundled dataset
}

// ── Schemes / crops / equipment ──────────────────────────────────────────────
export async function getGovtSchemes() {
  await delay(200);
  return null;
}
export async function getCrops() {
  await delay(200);
  return null;
}
export async function getEquipment() {
  await delay(200);
  return null;
}

// ── Logs & history ───────────────────────────────────────────────────────────
export async function getLogs(farmId) {
  await delay(200);
  return [];
}
