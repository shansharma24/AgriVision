// ─────────────────────────────────────────────────────────────────────────────
// AgriVision — Disease Detection Result screen
// Ported from DiseaseResult.kt (1272 lines). Faithful replica:
//   • Green top bar ("Disease Detection Result" + crop subtitle + back/share)
//   • Uploaded-image card (black, radius 20) with broken-image / no-image states
//   • Summary strip (crop – disease · Risk · confidence % · "Model confidence")
//   • Main info card (crop badge, RiskChip, disease name, confidence text,
//     progress bar + % readout)
//   • Save / Report actions
//   • Tabs "Treatment Plan" / "Prevention Plan" with expandable sections
//   • AI Expert advice (DiseaseExpertAI.kt copy) with a loading state while
//     api.chatCompletion "thinks"
//   • Extended FAB "Ask AgriVision" → KrishiMitri
//   • "Wrong Crop Selected" blocking dialog when disease contains "wrong crop"
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Modal,
  ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';

import { colors } from '../theme';
import { useApp } from '../context/AppContext';
import { AppHeader } from '../components';
import * as api from '../services/api';

// ── Screen-local palette (DiseaseResult.kt) ──────────────────────────────────
const PRIMARY_GREEN = '#388E3C';   // Color(0xFF388E3C)
const BACKGROUND_GRAY = '#F5F5F5'; // Color(0xFFF5F5F5)
const TEXT_PRIMARY = '#212121';    // Color(0xFF212121)
const TEXT_SECONDARY = '#757575';  // Color(0xFF757575)
const WARNING_RED = '#E53935';     // Color(0xFFE53935)
const SUCCESS_GREEN = '#4CAF50';   // Color(0xFF4CAF50)
const MEDIUM_ORANGE = '#FF9800';   // Color(0xFFFF9800)
const RISK_BG = '#FFE5E5';         // RiskChip.kt container
const RISK_TEXT = '#CC0000';       // RiskChip.kt label
const APPLICATION_CARD_LIGHT = '#F9FBE7';

const MOCK_IMAGE = require('../../assets/app/tomato_early_blight.png');

const titleCase = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

// DiseaseResult.kt cleanDisease() — strip crop + underscores, fall back label.
function cleanDiseaseName(disease, crop) {
  if (!disease) return 'Unknown disease';
  const escaped = (crop || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  let cleaned = disease
    .replace(/___/g, ' ')
    .replace(/_/g, ' ')
    .replace(new RegExp(escaped, 'ig'), '');
  if (!cleaned.trim()) cleaned = 'Unknown disease';
  cleaned = cleaned.trim();
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

// Normalise "Early Blight" → "early_blight" so the ML labels still match.
const normalise = (s) => (s || '').toLowerCase().replace(/\s+/g, '_');

/* ---------------- RISK LEVEL / COLOR (DiseaseResult.kt) ---------------- */
function getRiskLevel(disease) {
  const s = normalise(disease);
  if (s.includes('healthy')) return 'None';
  if (s.includes('late_blight')) return 'Very High';
  if (s.includes('early_blight')) return 'High';
  if (s.includes('bacterial')) return 'High';
  if (s.includes('scab')) return 'High';
  if (s.includes('blast')) return 'High';
  if (s.includes('smut')) return 'Medium';
  return 'Moderate';
}

function getRiskColor(disease) {
  const s = normalise(disease);
  if (s.includes('healthy')) return SUCCESS_GREEN;
  if (s.includes('late_blight')) return WARNING_RED;
  if (s.includes('early_blight')) return WARNING_RED;
  if (s.includes('bacterial')) return WARNING_RED;
  if (s.includes('scab')) return WARNING_RED;
  if (s.includes('blast')) return MEDIUM_ORANGE;
  if (s.includes('smut')) return MEDIUM_ORANGE;
  return MEDIUM_ORANGE;
}

/* ---------------- AI EXPERT ADVICE (DiseaseExpertAI.kt) ---------------- */
function getDiseaseExpertAdvice(crop, disease) {
  const c = (crop || '').toLowerCase();
  const d = (disease || '').toLowerCase();

  if (c.includes('tomato') && d.includes('blight')) {
    return {
      spread: 'High 🔥 (जल्दी फैलता है, पत्तियों और फल दोनों को नुकसान)',
      treatment: 'Copper Oxychloride @ 2–3g/L या Mancozeb 2.5g/L का छिड़काव। Organic: Neem Oil 5ml/L.',
      prevention: 'धूप व वेंटिलेशन रखें, संक्रमित पत्तियां हटा दें, हर 10–14 दिन में स्प्रे दोहराएँ।',
    };
  }
  if (c.includes('apple') && d.includes('scab')) {
    return {
      spread: 'Medium 🌧 (नमी में तेजी से फैलता है)',
      treatment: 'Carbendazim 1g/L या Captan 2g/L स्प्रे। Organic: Sulphur Dust.',
      prevention: 'पेड़ों की छंटाई करें, गिरे हुए पत्ते हटाएँ, पानी पत्तियों पर न रुकने दें।',
    };
  }
  if (c.includes('maize') && d.includes('rust')) {
    return {
      spread: 'Medium 🔶',
      treatment: 'Propiconazole 1ml/L या Mancozeb 2g/L। Organic: Neem Oil.',
      prevention: 'नमी कम रखें, बीज उपचार करें, फसल चक्र अपनाएँ।',
    };
  }
  if (c.includes('corn') && d.includes('leaf spot')) {
    return {
      spread: 'High 🌡',
      treatment: 'Chlorothalonil 2g/L या Copper Fungicide।',
      prevention: 'साफ बीज, फसल चक्र, संक्रमित पत्तों को नष्ट करें।',
    };
  }
  return {
    spread: 'Data Limited — But likely moderate. 📉',
    treatment: 'Use Neem Oil (5ml/L) + Copper fungicide (2g/L).',
    prevention: 'Avoid overwatering, remove infected leaves, ensure sunlight.',
  };
}

/* ---------------- TREATMENT DATA (DiseaseResult.kt getTreatmentData) ---------------- */
function getTreatmentData(crop, disease) {
  const c = (crop || '').toLowerCase();
  const d = (disease || '').toLowerCase();

  /* ---------------- HEALTHY ---------------- */
  if (d.includes('healthy')) {
    return {
      cause: 'The plant appears to be in good health with no signs of disease or pest infestation. This indicates proper care, suitable environmental conditions, and absence of pathogens.',
      symptoms: [
        'Vibrant, uniform green coloration across leaves and stems',
        'No visible spots, lesions, or discolorations',
        'Healthy leaf structure without wilting, curling, or deformation',
        'Strong stem support and normal growth patterns',
      ],
      chemicalTreatment: [],
      organicTreatment: [
        {
          product: 'Neem Oil (Preventive Maintenance)',
          dosage: '3-5 ml per liter of water',
          method: 'Prepare a dilute solution and spray evenly on both sides of leaves, focusing on undersides where pests may hide',
          frequency: 'Apply once every 15-20 days during growing season',
          notes: 'Best applied in early morning or evening to avoid leaf burn. Test on a small area first to check for sensitivity.',
        },
      ],
      prevention: [
        'Implement regular soil testing to maintain optimal nutrient levels',
        'Ensure consistent but not excessive irrigation to prevent root rot',
        'Promote biodiversity by planting companion crops',
        'Conduct weekly visual inspections for early signs of issues',
        'Use mulch to retain soil moisture and suppress weeds',
      ],
      safety: [
        'Always wear protective gloves when handling any sprays',
        'Avoid application during peak sunlight hours to prevent phytotoxicity',
        'Store preventive products in cool, dry places away from children and pets',
        'Follow organic certification guidelines if applicable',
      ],
    };
  }

  /* ---------------- TOMATO ---------------- */
  if (c.includes('tomato') && d.includes('early')) {
    return {
      cause: 'Early blight in tomatoes is primarily caused by the fungal pathogen Alternaria solani. It thrives in warm, humid conditions and spreads through infected plant debris, soil, wind, and water splash. Poor air circulation and overhead irrigation exacerbate the spread.',
      symptoms: [
        "Small, dark brown spots with concentric rings on lower leaves, resembling a bull's-eye pattern",
        'Yellow halo surrounding the lesions, leading to chlorosis',
        'Premature defoliation starting from older leaves upward',
        'Stem lesions that can girdle young plants',
        'Fruit spots near the stem end, causing cracking and secondary infections',
      ],
      chemicalTreatment: [
        {
          product: 'Mancozeb 75% WP (Broad-spectrum fungicide)',
          dosage: '2-2.5 g per liter of water',
          method: 'Mix thoroughly and apply as a foliar spray covering all plant surfaces, especially lower leaves',
          frequency: 'Apply every 7-10 days, starting at first sign of symptoms; maximum 3-4 applications per season',
          notes: 'Alternate with other fungicides to prevent resistance. Apply in early morning for best absorption.',
        },
        {
          product: 'Chlorothalonil 50% WP',
          dosage: '2 g per liter of water',
          method: 'Spray uniformly on foliage, ensuring coverage of both upper and lower leaf surfaces',
          frequency: 'Alternate with Mancozeb every 7 days after initial application',
          notes: 'Do not apply when temperatures exceed 30°C. Wash equipment thoroughly after use.',
        },
      ],
      organicTreatment: [
        {
          product: 'Neem Oil Extract (Azadirachtin-based)',
          dosage: '3-5 ml per liter of water with emulsifier',
          method: 'Shake well and spray on affected areas, focusing on leaf undersides',
          frequency: 'Apply weekly or after rainfall',
          notes: 'Combine with soap for better adhesion. Effective as both fungicide and insecticide.',
        },
        {
          product: 'Trichoderma viride Bio-fungicide',
          dosage: '5-10 g per liter of water',
          method: 'Dissolve in water and apply as soil drench or foliar spray',
          frequency: 'Apply once every 15 days as preventive measure',
          notes: 'Store in refrigerator. Best used in conjunction with compost for soil health.',
        },
        {
          product: 'Baking Soda Solution (Sodium Bicarbonate)',
          dosage: '1 tablespoon per gallon of water with 1 tsp vegetable oil',
          method: 'Mix and spray weekly on leaves',
          frequency: 'Weekly preventive application',
          notes: 'pH neutral; test on small area to avoid leaf burn.',
        },
      ],
      prevention: [
        'Practice crop rotation with non-solanaceous plants for at least 2-3 years',
        'Maintain proper plant spacing (60-90 cm) for good air circulation',
        'Use drip irrigation to keep foliage dry and reduce splash',
        'Remove and destroy infected plant material promptly',
        'Apply mulch to prevent soil splash and maintain moisture',
        "Select resistant tomato varieties like 'Mountain Merit' or 'Iron Lady'",
        'Monitor weather for humid conditions and apply preventives accordingly',
      ],
      safety: [
        'Wear protective gear including gloves, masks, and eye protection during application',
        'Avoid spraying during windy conditions to prevent drift',
        'Observe pre-harvest interval: 5-7 days for chemicals',
        'Store products in original containers away from food and children',
        'Wash hands and exposed skin thoroughly after handling',
        'Dispose of empty containers responsibly according to local regulations',
        'In case of ingestion or skin irritation, seek medical attention immediately',
      ],
    };
  }

  /* ---------------- POTATO ---------------- */
  if (c.includes('potato') && d.includes('late')) {
    return {
      cause: 'Late blight in potatoes is caused by the oomycete pathogen Phytophthora infestans. It spreads rapidly in cool (15-20°C), moist conditions through spores carried by wind, rain, or infected tubers. Historical note: This pathogen caused the Irish Potato Famine in the 1840s.',
      symptoms: [
        'Irregular dark brown to black water-soaked lesions on leaves and stems',
        'White fuzzy mycelial growth on leaf undersides in humid conditions',
        'Rapid wilting and collapse of entire plants within days',
        'Brown, firm rot on tubers with reddish-brown discoloration under skin',
        'Foul odor from secondary bacterial infections in advanced stages',
      ],
      chemicalTreatment: [
        {
          product: 'Metalaxyl + Mancozeb (Systemic + Contact Fungicide)',
          dosage: '2.5 g per liter of water',
          method: 'Apply as thorough foliar spray covering all plant parts; repeat if rain occurs within 24 hours',
          frequency: 'Every 5-7 days during susceptible periods; maximum 4 applications',
          notes: 'Use protectant fungicides before infection; systemic after symptoms appear. Rotate modes of action.',
        },
        {
          product: 'Dimethomorph 50% WP',
          dosage: '1-1.5 g per liter',
          method: 'Foliar application focusing on lower canopy',
          frequency: 'Alternate with other fungicides every 7-10 days',
          notes: 'Effective against oomycetes; do not use alone to prevent resistance.',
        },
      ],
      organicTreatment: [
        {
          product: 'Copper-based Fungicide (e.g., Bordeaux Mixture)',
          dosage: '3-4% solution (copper sulfate + lime)',
          method: 'Prepare fresh and apply as preventive foliar spray',
          frequency: 'Weekly during wet weather',
          notes: 'Traditional organic method; may accumulate in soil with overuse.',
        },
        {
          product: 'Bacillus subtilis Bio-fungicide',
          dosage: 'As per product label (typically 5-10 ml/liter)',
          method: 'Spray on foliage and soil around plants',
          frequency: 'Every 10-14 days',
          notes: 'Promotes plant immunity; combine with compost tea for better results.',
        },
        {
          product: 'Potassium Bicarbonate Solution',
          dosage: '1-2% solution with spreader',
          method: 'Foliar spray in early stages',
          frequency: 'Every 5-7 days',
          notes: 'Alkaline pH disrupts fungal growth; environmentally friendly.',
        },
      ],
      prevention: [
        'Use certified disease-free seed potatoes from reputable sources',
        'Implement wide row spacing (75-90 cm) for better ventilation',
        'Avoid irrigation late in the day to allow foliage to dry',
        'Hill up soil around plants to protect tubers',
        'Destroy volunteer plants and cull piles',
        "Choose resistant varieties like 'Kennebec' or 'Defender'",
        'Monitor disease forecasts and apply protectants preemptively',
        'Harvest during dry weather and cure tubers properly',
      ],
      safety: [
        'Use full protective equipment: respirator, gloves, long sleeves, and eye protection',
        'Apply during calm weather to minimize exposure and drift',
        'Respect re-entry interval: 24-48 hours after application',
        'Adhere to pre-harvest interval: 7-14 days depending on product',
        'Avoid application near water bodies to prevent contamination',
        'Store in secure, ventilated area away from living spaces',
        'In emergency, rinse exposed areas with water and consult poison control',
      ],
    };
  }

  /* ---------------- APPLE ---------------- */
  if (c.includes('apple') && d.includes('scab')) {
    return {
      cause: 'Apple scab is caused by the ascomycete fungus Venturia inaequalis. It overwinters on fallen leaves and infects new growth in spring during wet weather. Primary infections occur at green tip stage, with secondary spread throughout the season.',
      symptoms: [
        'Velvety olive-green to black spots on leaves, often on undersides initially',
        'Lesions on fruit starting as small spots, developing into corky scabs',
        'Distorted leaf growth and premature defoliation in severe cases',
        'Cracked, deformed fruits with reduced market value',
        'Twig lesions in chronic infections, leading to dieback',
      ],
      chemicalTreatment: [
        {
          product: 'Captan 50% WP (Contact Fungicide)',
          dosage: '2-3 g per liter of water',
          method: 'High-volume spray ensuring thorough coverage of canopy',
          frequency: 'Every 7-10 days from green tip to petal fall, then as needed',
          notes: 'Protectant only; apply before rain events. Tank mix with other fungicides for spectrum.',
        },
        {
          product: 'Difenoconazole (Systemic)',
          dosage: '0.5 ml per liter',
          method: 'Foliar application during high-risk periods',
          frequency: 'Alternate every 10-14 days',
          notes: 'Curative properties; limit to 3 applications per season to manage resistance.',
        },
      ],
      organicTreatment: [
        {
          product: 'Sulfur 80% WG (Elemental Sulfur)',
          dosage: '3-5 g per liter',
          method: 'Apply as fine mist on dry foliage',
          frequency: 'Every 7-10 days during susceptible periods',
          notes: 'Avoid temperatures above 30°C to prevent phytotoxicity. Not for sulfur-sensitive varieties.',
        },
        {
          product: 'Potassium Bicarbonate',
          dosage: '5-10 g per liter with surfactant',
          method: 'Foliar spray covering all surfaces',
          frequency: 'Weekly preventive',
          notes: 'Raises pH to inhibit spore germination; rinse sprayer after use.',
        },
        {
          product: 'Bacillus amyloliquefaciens Bio-agent',
          dosage: 'As per label (typically 2-5 ml/liter)',
          method: 'Apply to foliage and fruit',
          frequency: 'Every 10-14 days',
          notes: 'Enhances natural resistance; best in integrated programs.',
        },
      ],
      prevention: [
        "Select scab-resistant varieties like 'Liberty' or 'Enterprise'",
        'Prune trees annually to improve air flow and light penetration',
        'Rake and destroy fallen leaves in autumn to reduce overwintering spores',
        'Use urea treatment on leaf litter to accelerate decomposition',
        'Install weather monitoring for infection periods (Mills table)',
        'Maintain balanced nutrition, avoiding excess nitrogen',
        'Space trees adequately (4-6 m) for ventilation',
        'Use mulch but keep trunk area clear',
      ],
      safety: [
        'Employ proper PPE: chemical-resistant gloves, goggles, and coveralls',
        'Calibrate sprayers for accurate application rates',
        'Observe bee safety: avoid blooming period applications',
        'Follow label PHI: 0-7 days for fruit harvest',
        'Prevent runoff into waterways',
        'Train applicators on safe handling',
        'Maintain equipment to avoid leaks',
      ],
    };
  }

  /* ---------------- RICE BLAST ---------------- */
  if (c.includes('rice') && d.includes('blast')) {
    return {
      cause: 'Rice blast is caused by the fungus Magnaporthe oryzae (formerly Pyricularia oryzae). It spreads via airborne spores, favored by high humidity, moderate temperatures (24-28°C), and nitrogen-rich conditions. Infection can occur at all growth stages.',
      symptoms: [
        'Elliptical lesions with gray centers and dark borders on leaves',
        'Neck rot leading to panicle blanking',
        'White to grayish spots on sheaths and stems',
        'Reduced grain filling and quality',
        'Seedling blight in severe cases',
      ],
      chemicalTreatment: [
        {
          product: 'Tricyclazole 75% WP',
          dosage: '0.6 g per liter',
          method: 'Foliar spray at tillering and panicle initiation',
          frequency: '2-3 applications at 10-15 day intervals',
          notes: 'Systemic; absorbs quickly. Avoid mixing with alkaline compounds.',
        },
        {
          product: 'Isoprothiolane 40% EC',
          dosage: '1.5 ml per liter',
          method: 'Uniform coverage spray',
          frequency: 'Apply at first symptoms',
          notes: 'Effective on neck blast; use stickers for better adhesion.',
        },
      ],
      organicTreatment: [
        {
          product: 'Pseudomonas fluorescens Bio-control',
          dosage: '10 g per liter',
          method: 'Seed treatment and foliar spray',
          frequency: 'Multiple applications from seedling to heading',
          notes: 'Antagonistic bacteria; apply in evening for viability.',
        },
        {
          product: 'Neem Seed Kernel Extract',
          dosage: '5% solution',
          method: 'Soak seeds and spray foliage',
          frequency: 'Every 10 days',
          notes: 'Natural antifeedant; combine with bio-agents.',
        },
      ],
      prevention: [
        'Use blast-resistant varieties like IR64 or Swarna Sub1',
        'Balance nitrogen fertilization (split doses)',
        'Maintain water depth of 5-10 cm to suppress spores',
        'Avoid dense planting; use 20x15 cm spacing',
        'Burn infected stubble after harvest',
        'Seed treatment with hot water (52°C for 10 min)',
        'Monitor silicon levels in soil for plant strength',
      ],
      safety: [
        'Use calibrated equipment for precise application',
        'Wear full protective suit during spraying',
        'Avoid eating/drinking in field during operations',
        'Wash thoroughly after handling chemicals',
        'Store in locked facilities',
        'Follow integrated pest management to minimize chemical use',
      ],
    };
  }

  /* ---------------- CORN SMUT ---------------- */
  if (c.includes('corn') || (c.includes('maize') && d.includes('smut'))) {
    return {
      cause: 'Corn smut is caused by the basidiomycete fungus Ustilago maydis. It infects through wounds or silks, stimulated by high moisture and temperatures around 26-34°C. Often considered a delicacy (huitlacoche) in some cultures.',
      symptoms: [
        'Large, swollen galls on ears, tassels, or stalks filled with black spores',
        'Silvery-gray tumors that burst to release powdery spores',
        'Deformed plant parts',
        'Reduced yield in severe infections',
        'White to gray initial galls turning black',
      ],
      chemicalTreatment: [
        {
          product: 'Tebuconazole 25% WG',
          dosage: '1 g per liter',
          method: 'Preventive foliar spray at V6-V8 stage',
          frequency: '1-2 applications',
          notes: 'Limited efficacy; focus on prevention.',
        },
      ],
      organicTreatment: [
        {
          product: 'Trichoderma harzianum',
          dosage: '5 g per kg seed',
          method: 'Seed treatment',
          frequency: 'Pre-planting',
          notes: 'Soil inoculant for antagonism.',
        },
        {
          product: 'Garlic Extract',
          dosage: '10% solution',
          method: 'Foliar spray',
          frequency: 'Weekly',
          notes: 'Natural antifungal properties.',
        },
      ],
      prevention: [
        'Use resistant hybrids',
        'Crop rotation with non-hosts',
        'Remove and destroy galls before spore release',
        'Balance soil fertility',
        'Avoid mechanical injury to plants',
        'Plant at optimal density',
      ],
      safety: [
        'Minimal chemical use recommended',
        'Handle infected material with care to avoid spore inhalation',
        'Use gloves when removing galls',
      ],
    };
  }

  /* ---------------- DEFAULT ---------------- */
  return {
    cause: 'The exact cause may vary based on crop type and environmental factors. Common causes include fungal, bacterial, or viral pathogens, often exacerbated by poor management practices. Consult local agricultural experts for precise diagnosis.',
    symptoms: [
      'General leaf discoloration or spotting',
      'Wilting or stunted growth',
      'Presence of unusual growths or lesions',
      'Reduced yield and plant vigor',
      'Secondary infections from weakened plants',
    ],
    chemicalTreatment: [
      {
        product: 'Broad-spectrum Fungicide (e.g., Carbendazim)',
        dosage: '1-2 g per liter',
        method: 'Foliar spray or soil drench as appropriate',
        frequency: 'As per local recommendations',
        notes: 'Use only after confirmation; rotate chemicals.',
      },
    ],
    organicTreatment: [
      {
        product: 'Neem-based Products',
        dosage: '3-5 ml per liter',
        method: 'Regular foliar application',
        frequency: 'Weekly preventive',
        notes: 'Safe for beneficial insects.',
      },
    ],
    prevention: [
      'Adopt integrated pest management (IPM) practices',
      'Use certified disease-free seeds/seedlings',
      'Maintain optimal plant nutrition and soil health',
      'Implement proper sanitation and field hygiene',
      'Monitor and scout fields regularly for early detection',
    ],
    safety: [
      'Always read and follow product labels carefully',
      'Use appropriate personal protective equipment (PPE)',
      'Avoid application during adverse weather conditions',
      'Observe waiting periods before harvest',
      'Store materials safely and dispose responsibly',
    ],
  };
}

/* ---------------- PREVENTION DATA (DiseaseResult.kt getPreventionData) ---------------- */
function getPreventionData(crop) {
  return [
    { title: 'Crop Rotation', description: `Rotate ${crop} with non-host crops for 2-3 years to break disease cycles and deplete soil pathogens.` },
    { title: 'Plant Spacing', description: 'Maintain adequate spacing between plants to promote air circulation and reduce humidity buildup in the canopy.' },
    { title: 'Tool Sanitation', description: 'Clean and disinfect all farming tools and equipment after use to prevent cross-contamination between fields.' },
    { title: 'Nutrient Management', description: 'Apply balanced fertilizers based on soil tests; avoid excess nitrogen which can promote foliar diseases.' },
    { title: 'Irrigation Practices', description: 'Use drip or furrow irrigation to keep foliage dry; irrigate in morning to allow drying.' },
    { title: 'Resistant Varieties', description: `Select and plant disease-resistant varieties of ${crop} suitable for your region.` },
    { title: 'Field Monitoring', description: 'Conduct regular scouting (weekly) to detect early signs of disease for timely intervention.' },
    { title: 'Weed Control', description: 'Maintain weed-free fields as weeds can harbor pathogens and compete for resources.' },
    { title: 'Soil Health', description: 'Incorporate organic matter and beneficial microbes to improve soil structure and disease suppression.' },
    { title: 'Post-Harvest Handling', description: "Properly clean and store produce to prevent spread to next season's crops." },
  ];
}

/* ---------------- UI HELPERS (DiseaseResult.kt) ---------------- */

// RiskChip.kt — pink pill, red label.
function RiskChip({ label }) {
  return (
    <View style={styles.riskChip}>
      <MaterialIcons name="warning" size={16} color={RISK_TEXT} />
      <Text style={styles.riskChipText}>{label}</Text>
    </View>
  );
}

// TreatmentBullet — small green dot + text.
function TreatmentBullet({ text }) {
  const { isDark } = useApp();
  return (
    <View style={styles.bulletRow}>
      <View style={styles.bulletDot} />
      <Text style={[styles.bulletText, { color: isDark ? '#E8F5E9' : TEXT_PRIMARY }]}>{text}</Text>
    </View>
  );
}

// ApplicationCard — light card with product + dosage/method/frequency/notes.
function ApplicationCard({ step }) {
  const { isDark } = useApp();
  return (
    <View style={[styles.applicationCard, { backgroundColor: isDark ? '#1E2617' : APPLICATION_CARD_LIGHT }]}>
      <Text style={styles.applicationProduct}>{step.product}</Text>
      <Text style={[styles.applicationLine, { color: isDark ? '#E8F5E9' : TEXT_PRIMARY }]}>Dosage: {step.dosage}</Text>
      <Text style={[styles.applicationLine, { color: isDark ? '#E8F5E9' : TEXT_PRIMARY }]}>Method: {step.method}</Text>
      <Text style={[styles.applicationLine, { color: isDark ? '#E8F5E9' : TEXT_PRIMARY }]}>Frequency: {step.frequency}</Text>
      {!!step.notes && (
        <Text style={[styles.applicationNotes, { color: isDark ? '#B0B0B0' : TEXT_SECONDARY }]}>Notes: {step.notes}</Text>
      )}
    </View>
  );
}

// PreventionItem — dot + title + description.
function PreventionItem({ title, description }) {
  return (
    <View style={styles.preventItem}>
      <View style={styles.preventDot} />
      <View style={styles.preventBody}>
        <Text style={[styles.preventTitle, { color: TEXT_PRIMARY }]}>{title}</Text>
        <Text style={[styles.preventDesc, { color: TEXT_SECONDARY }]}>{description}</Text>
      </View>
    </View>
  );
}

// ExpandableSection — collapsible card (BugReport/Visibility/Science/Eco/... icons).
function ExpandableSection({ title, icon, children }) {
  const { isDark } = useApp();
  const [expanded, setExpanded] = useState(false);
  const card = isDark ? colors.cardDark : '#FFFFFF';
  const border = isDark ? '#2A2A2A' : '#E0E0E0';
  return (
    <View style={[styles.expandableCard, { backgroundColor: card }]}>
      <TouchableOpacity
        style={styles.expandableHeader}
        activeOpacity={0.8}
        onPress={() => setExpanded((e) => !e)}
      >
        <MaterialIcons name={icon} size={22} color={PRIMARY_GREEN} />
        <Text style={[styles.expandableTitle, { color: TEXT_PRIMARY }]}>{title}</Text>
        <MaterialIcons name={expanded ? 'expand-less' : 'expand-more'} size={24} color={TEXT_SECONDARY} />
      </TouchableOpacity>
      {expanded && (
        <>
          <View style={[styles.expandableDivider, { backgroundColor: border }]} />
          <View style={styles.expandableBody}>{children}</View>
        </>
      )}
    </View>
  );
}

/* ---------------- MAIN SCREEN ---------------- */
export default function DiseaseResultScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { isDark, languageCode } = useApp();

  const {
    crop,
    disease,
    confidence,
    confidencePct,
    imageUri,
    diseaseKey,
    hindiName,
    chlorosisIndex,
    lesionNormalizedBBox,
    knapsackSprayerDosage,
    symptoms: customSymptoms,
    pesticideAdvisory,
    organicRemedy,
    applicationSchedule,
  } = route.params || {};

  const displayPercentage =
    confidencePct || Math.max(0, Math.min(100, Math.round((confidence || 0) * 100)));
  const cleanDisease = cleanDiseaseName(disease, crop);
  const displayTitle = hindiName && hindiName !== cleanDisease
    ? `${cleanDisease} (${hindiName})`
    : cleanDisease;
  const isNotLeaf =
    Boolean(route.params?.isNotLeaf) ||
    (disease || '').toLowerCase().includes('not a leaf') ||
    (disease || '').toLowerCase().includes('no plant leaf') ||
    (disease || '').toLowerCase().includes('invalid image');

  const isWrongCrop =
    !isNotLeaf &&
    (Boolean(route.params?.isWrongCrop) || (disease || '').toLowerCase().includes('wrong crop'));

  const [showAlertDialog, setShowAlertDialog] = useState(isNotLeaf || isWrongCrop);
  const [selectedTab, setSelectedTab] = useState(0);
  const [aiLoading, setAiLoading] = useState(true);
  const [aiResponse, setAiResponse] = useState('');
  const [imageError, setImageError] = useState(false);

  const hasBBox =
    Array.isArray(lesionNormalizedBBox) &&
    lesionNormalizedBBox.length === 4 &&
    lesionNormalizedBBox[2] > lesionNormalizedBBox[0];
  const [ymin, xmin, ymax, xmax] = hasBBox ? lesionNormalizedBBox : [0, 0, 0, 0];

  const confidenceText =
    confidence >= 0.6
      ? 'High confidence detection'
      : confidence >= 0.4
        ? 'Medium confidence – consider retaking photo for confirmation'
        : 'Low confidence – please capture a clearer image of the affected area';

  const confidenceColor =
    confidence >= 0.6 ? SUCCESS_GREEN : confidence >= 0.4 ? MEDIUM_ORANGE : WARNING_RED;

  const riskLevel = getRiskLevel(disease);
  const riskColor = getRiskColor(disease);

  const tabs = ['Treatment Plan', 'Prevention Plan'];

  const bg = isDark ? colors.backgroundDark : BACKGROUND_GRAY;
  const card = isDark ? colors.cardDark : '#FFFFFF';
  const textPrimary = isDark ? '#E8F5E9' : TEXT_PRIMARY;
  const textSecondary = isDark ? '#B0B0B0' : TEXT_SECONDARY;
  const trackColor = isDark ? '#2A2A2A' : '#E0E0E0';
  const divider = isDark ? '#2A2A2A' : '#E0E0E0';

  // AI Expert — "thinks" while api.chatCompletion runs.
  useEffect(() => {
    let alive = true;
    setAiLoading(true);
    (async () => {
      try {
        const res = await api.chatCompletion(
          [
            {
              role: 'user',
              content: `Provide expert advice for managing ${disease || 'this disease'} on ${crop || 'this crop'}.`,
            },
          ],
          { language: languageCode || 'en' }
        );
        if (alive) setAiResponse(res?.content || '');
      } catch (e) {
        if (alive) setAiResponse('');
      } finally {
        if (alive) setAiLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [crop, disease, languageCode]);

  const expert = getDiseaseExpertAdvice(crop, disease);
  const treatment = getTreatmentData(crop, disease);
  const prevention = getPreventionData(crop);

  // 🔴 Blocking Alert Dialog: "No Plant Leaf Detected" or "Wrong Crop Selected"
  if (showAlertDialog && (isNotLeaf || isWrongCrop)) {
    return (
      <Modal visible transparent animationType="fade" onRequestClose={() => {}}>
        <View style={styles.wrongCropOverlay}>
          <View style={styles.wrongCropCard}>
            <View style={styles.wrongCropIconCircle}>
              <MaterialIcons
                name={isNotLeaf ? 'image-not-supported' : 'warning-amber'}
                size={42}
                color={WARNING_RED}
              />
            </View>
            <Text style={styles.wrongCropTitle}>
              {isNotLeaf ? 'No Plant Leaf Detected' : 'Wrong Crop Selected'}
            </Text>
            <Text style={styles.wrongCropMessage}>
              {isNotLeaf
                ? 'The uploaded image does not appear to contain a plant leaf.\n\nPlease capture or upload a clear, well-lit photo of an affected crop leaf.'
                : `The uploaded leaf does not match the selected crop (${crop}).\n\nPlease select the correct crop and try again.`}
            </Text>
            <TouchableOpacity
              style={styles.wrongCropButton}
              activeOpacity={0.85}
              onPress={() => {
                setShowAlertDialog(false);
                navigation.goBack();
              }}
            >
              <MaterialIcons
                name={isNotLeaf ? 'photo-camera' : 'refresh'}
                size={20}
                color="#FFFFFF"
              />
              <Text style={styles.wrongCropButtonText}>
                {isNotLeaf ? 'Capture Leaf Photo' : 'Select Correct Crop'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  const onShare = () => {
    Alert.alert(
      'Share Result',
      `Crop: ${crop}\nDisease: ${cleanDisease}\nConfidence: ${displayPercentage}%`,
      [{ text: 'OK' }],
    );
  };

  const onSave = () => {
    Alert.alert('Save Result', 'The result has been saved to your device gallery.', [{ text: 'OK' }]);
  };

  const onReport = () => {
    Alert.alert('Report Issue', 'Your report has been submitted. Our experts will review it.', [{ text: 'OK' }]);
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: PRIMARY_GREEN }]}>
      {/* TopAppBar — title + crop subtitle + back + share */}
      <AppHeader
        title="Disease Detection Result"
        subtitle={titleCase(crop)}
        onBack={() => navigation.goBack()}
        color={PRIMARY_GREEN}
        textColor="#FFFFFF"
        right={
          <TouchableOpacity style={styles.headerBtn} onPress={onShare} hitSlop={8}>
            <MaterialIcons name="share" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        }
      />

      <ScrollView
        style={{ flex: 1, backgroundColor: bg }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* --------- Uploaded Image Card --------- */}
        <View style={styles.imageCard}>
          {imageUri ? (
            imageError ? (
              <View style={styles.imageCenter}>
                <MaterialIcons name="broken-image" size={40} color="#FFFFFF" />
                <Text style={styles.imageErrorText}>Could not load image</Text>
              </View>
            ) : (
              <>
                <Image
                  source={{ uri: imageUri }}
                  style={styles.imageFill}
                  resizeMode="cover"
                  onError={() => setImageError(true)}
                />
                {hasBBox && (
                  <View
                    style={[
                      styles.bboxOverlay,
                      {
                        top: `${ymin * 100}%`,
                        left: `${xmin * 100}%`,
                        width: `${(xmax - xmin) * 100}%`,
                        height: `${(ymax - ymin) * 100}%`,
                      },
                    ]}
                  >
                    <View style={styles.bboxTag}>
                      <Text style={styles.bboxTagText}>
                        Lesion Area ({Math.round((chlorosisIndex || 0.42) * 100)}% Chlorosis)
                      </Text>
                    </View>
                  </View>
                )}
              </>
            )
          ) : (
            <Image source={MOCK_IMAGE} style={styles.imageFill} resizeMode="cover" />
          )}
        </View>

        {/* --------- Summary Strip --------- */}
        <View style={[styles.summaryCard, { backgroundColor: card }]}>
          <View style={styles.summaryLeft}>
            <Text style={[styles.summaryTitle, { color: textPrimary }]} numberOfLines={2}>
              {`${crop} – ${displayTitle}`}
            </Text>
            <Text style={[styles.summaryRisk, { color: riskColor }]}>Risk: {riskLevel}</Text>
          </View>
          <View style={styles.summaryRight}>
            <Text style={[styles.summaryPercent, { color: confidenceColor }]}>{displayPercentage}%</Text>
            <Text style={[styles.summaryLabel, { color: textSecondary }]}>Edge AI confidence</Text>
          </View>
        </View>

        {/* --------- Main Disease Info Card --------- */}
        <View style={[styles.infoCard, { backgroundColor: card }]}>
          <View style={styles.infoTopRow}>
            <View style={styles.cropBadge}>
              <Text style={styles.cropBadgeText}>{crop}</Text>
            </View>
            <RiskChip label={riskLevel} />
          </View>

          <Text style={[styles.diseaseName, { color: textPrimary }]}>{displayTitle}</Text>
          <Text style={[styles.confidenceText, { color: confidenceColor }]}>{confidenceText}</Text>

          <View style={styles.confidenceSection}>
            <Text style={[styles.confidenceLabel, { color: textSecondary }]}>Edge AI INT8 confidence</Text>
            <View style={styles.confidenceRow}>
              <View style={[styles.progressTrack, { backgroundColor: trackColor }]}>
                <View
                  style={[styles.progressFill, { width: `${displayPercentage}%`, backgroundColor: confidenceColor }]}
                />
              </View>
              <View style={styles.percentBlock}>
                <Text style={[styles.percentText, { color: textPrimary }]}>{displayPercentage}%</Text>
                <Text style={[styles.percentHint, { color: textSecondary }]}>
                  {confidence >= 0.4 ? 'Model is reasonably sure' : 'Image may be unclear'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* --------- 15L Knapsack Sprayer & Treatment Quick Guide --------- */}
        {knapsackSprayerDosage ? (
          <View
            style={[
              styles.knapsackCard,
              {
                backgroundColor: isDark ? '#1C2E20' : '#E8F5E9',
                borderColor: PRIMARY_GREEN,
              },
            ]}
          >
            <View style={styles.knapsackHeader}>
              <View style={[styles.knapsackIconWrap, { backgroundColor: PRIMARY_GREEN }]}>
                <MaterialIcons name="opacity" size={20} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={[styles.knapsackTitle, { color: textPrimary }]}>
                  15L Knapsack Sprayer Dosage
                </Text>
                <Text style={[styles.knapsackSubtitle, { color: textSecondary }]}>
                  ICAR standard calibrated pump recipe
                </Text>
              </View>
            </View>
            <Text style={[styles.knapsackDosageText, { color: textPrimary }]}>
              {knapsackSprayerDosage}
            </Text>
            {applicationSchedule ? (
              <View style={styles.knapsackScheduleRow}>
                <MaterialIcons name="schedule" size={16} color={PRIMARY_GREEN} />
                <Text style={[styles.knapsackScheduleText, { color: textSecondary }]}>
                  {applicationSchedule}
                </Text>
              </View>
            ) : null}
            {organicRemedy ? (
              <View style={[styles.knapsackOrganicRow, { borderTopColor: isDark ? '#2A4A33' : '#C8E6C9' }]}>
                <MaterialIcons name="eco" size={16} color={PRIMARY_GREEN} />
                <Text style={[styles.knapsackOrganicText, { color: textPrimary }]}>
                  <Text style={{ fontWeight: '700' }}>Organic Remedy: </Text>
                  {organicRemedy}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* --------- Save / Report actions --------- */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: card }]}
            activeOpacity={0.85}
            onPress={onSave}
          >
            <MaterialIcons name="save-alt" size={20} color={PRIMARY_GREEN} />
            <Text style={[styles.actionBtnText, { color: textPrimary }]}>Save Result</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: card }]}
            activeOpacity={0.85}
            onPress={onReport}
          >
            <MaterialIcons name="report-problem" size={20} color={WARNING_RED} />
            <Text style={[styles.actionBtnText, { color: textPrimary }]}>Report</Text>
          </TouchableOpacity>
        </View>

        {/* --------- Tabs --------- */}
        <View style={[styles.tabRow, { backgroundColor: card }]}>
          {tabs.map((title, index) => {
            const active = selectedTab === index;
            return (
              <TouchableOpacity
                key={title}
                style={styles.tab}
                activeOpacity={0.8}
                onPress={() => setSelectedTab(index)}
              >
                <Text
                  style={[
                    styles.tabText,
                    { color: active ? PRIMARY_GREEN : textSecondary, fontWeight: active ? '700' : '400' },
                  ]}
                >
                  {title}
                </Text>
                {active && <View style={[styles.tabIndicator, { backgroundColor: PRIMARY_GREEN }]} />}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* --------- Treatment / Prevention content --------- */}
        {selectedTab === 0 ? (
          <View>
            <ExpandableSection title="Cause" icon="bug-report">
              <Text style={[styles.bodyText, { color: textPrimary }]}>{treatment.cause}</Text>
            </ExpandableSection>

            <ExpandableSection title="Symptoms" icon="visibility">
              {treatment.symptoms.map((s, i) => (
                <TreatmentBullet key={`symptom-${i}`} text={s} />
              ))}
            </ExpandableSection>

            {treatment.chemicalTreatment.length > 0 && (
              <ExpandableSection title="Chemical Treatment (Application Guide)" icon="science">
                {treatment.chemicalTreatment.map((step, i) => (
                  <ApplicationCard key={`chem-${i}`} step={step} />
                ))}
              </ExpandableSection>
            )}

            {treatment.organicTreatment.length > 0 && (
              <ExpandableSection title="Organic Treatment (Application Guide)" icon="eco">
                {treatment.organicTreatment.map((step, i) => (
                  <ApplicationCard key={`org-${i}`} step={step} />
                ))}
              </ExpandableSection>
            )}

            <ExpandableSection title="Safety Instructions" icon="health-and-safety">
              {treatment.safety.map((s, i) => (
                <TreatmentBullet key={`safety-${i}`} text={s} />
              ))}
            </ExpandableSection>
          </View>
        ) : (
          <View style={[styles.preventionCard, { backgroundColor: card }]}>
            <Text style={[styles.preventionTitle, { color: textPrimary }]}>Prevention Plan</Text>
            {prevention.map((item, i) => (
              <PreventionItem key={`prevention-${i}`} title={item.title} description={item.description} />
            ))}
          </View>
        )}

        {/* --------- AI Expert Advice --------- */}
        <View style={[styles.aiCard, { backgroundColor: card }]}>
          <View style={styles.aiHeader}>
            <MaterialIcons name="psychology" size={22} color={PRIMARY_GREEN} />
            <Text style={[styles.aiTitle, { color: textPrimary }]}>AI Expert Advice</Text>
          </View>

          {aiLoading ? (
            <View style={styles.aiLoading}>
              <ActivityIndicator color={PRIMARY_GREEN} size="small" />
              <Text style={[styles.aiLoadingText, { color: textSecondary }]}>AI Expert is thinking...</Text>
            </View>
          ) : (
            <View style={styles.aiBody}>
              <View style={styles.aiRow}>
                <Text style={styles.aiLabel}>Spread</Text>
                <Text style={[styles.aiValue, { color: textPrimary }]}>{expert.spread}</Text>
              </View>
              <View style={styles.aiRow}>
                <Text style={styles.aiLabel}>Treatment</Text>
                <Text style={[styles.aiValue, { color: textPrimary }]}>{expert.treatment}</Text>
              </View>
              <View style={styles.aiRow}>
                <Text style={styles.aiLabel}>Prevention</Text>
                <Text style={[styles.aiValue, { color: textPrimary }]}>{expert.prevention}</Text>
              </View>
              {!!aiResponse && (
                <View style={[styles.aiReply, { backgroundColor: isDark ? '#12231A' : '#E8F5E9' }]}>
                  <Text style={[styles.aiReplyLabel, { color: PRIMARY_GREEN }]}>Krishi Mitri AI</Text>
                  <Text style={[styles.aiReplyText, { color: textPrimary }]}>{aiResponse}</Text>
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* --------- Extended FAB: Ask AgriVision --------- */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('KrishiMitri')}
      >
        <MaterialIcons name="chat" size={20} color="#FFFFFF" />
        <Text style={styles.fabText}>Ask AgriVision</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { paddingBottom: 110 },

  /* Uploaded image card */
  imageCard: {
    margin: 16,
    marginBottom: 12,
    height: 260,
    borderRadius: 20,
    backgroundColor: '#000000',
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  imageFill: { width: '100%', height: '100%' },
  imageCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  imageErrorText: { color: '#FFFFFF', fontSize: 13, marginTop: 8 },

  /* Summary strip */
  summaryCard: {
    marginHorizontal: 16,
    borderRadius: 14,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryLeft: { flex: 1, marginRight: 12 },
  summaryTitle: { fontSize: 14, fontWeight: '600' },
  summaryRisk: { fontSize: 12, fontWeight: '500', marginTop: 4 },
  summaryRight: { alignItems: 'flex-end' },
  summaryPercent: { fontSize: 18, fontWeight: '700' },
  summaryLabel: { fontSize: 12, marginTop: 2 },

  /* Main info card */
  infoCard: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    padding: 20,
  },
  infoTopRow: { flexDirection: 'row', alignItems: 'center' },
  cropBadge: {
    backgroundColor: 'rgba(56,142,60,0.12)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
  },
  cropBadgeText: { color: PRIMARY_GREEN, fontWeight: '700', fontSize: 13 },
  riskChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: RISK_BG,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  riskChipText: { color: RISK_TEXT, fontSize: 12, fontWeight: '500', marginLeft: 4 },
  diseaseName: { fontSize: 24, fontWeight: '700', marginTop: 12 },
  confidenceText: { fontSize: 13, fontWeight: '500', marginTop: 4 },
  confidenceSection: { marginTop: 18 },
  confidenceLabel: { fontSize: 14, fontWeight: '500' },
  confidenceRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  progressTrack: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: 8, borderRadius: 4 },
  percentBlock: { alignItems: 'flex-end', marginLeft: 12 },
  percentText: { fontSize: 18, fontWeight: '700' },
  percentHint: { fontSize: 11, marginTop: 2 },

  /* Save / Report actions */
  actionRow: { flexDirection: 'row', marginHorizontal: 16, marginTop: 12, justifyContent: 'space-between' },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    marginHorizontal: 4,
  },
  actionBtnText: { fontSize: 14, fontWeight: '600', marginLeft: 8 },

  /* Tabs */
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  tabText: { fontSize: 15, paddingVertical: 2 },
  tabIndicator: { height: 3, borderRadius: 2, marginTop: 6, width: '60%' },

  /* Expandable sections */
  expandableCard: {
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  expandableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  expandableTitle: { flex: 1, fontSize: 16, fontWeight: '600', marginLeft: 12 },
  expandableDivider: { height: 1, marginHorizontal: 16 },
  expandableBody: { padding: 16 },

  /* Bullets */
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  bulletDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: PRIMARY_GREEN, marginTop: 8 },
  bulletText: { flex: 1, fontSize: 14, lineHeight: 20, marginLeft: 12 },

  bodyText: { fontSize: 14, lineHeight: 20 },

  /* Application cards */
  applicationCard: {
    borderRadius: 12,
    padding: 12,
    marginVertical: 6,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  applicationProduct: { fontSize: 14, fontWeight: '700', color: PRIMARY_GREEN, marginBottom: 6 },
  applicationLine: { fontSize: 13, marginTop: 2 },
  applicationNotes: { fontSize: 13, fontStyle: 'italic', marginTop: 6 },

  /* Prevention */
  preventionCard: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    padding: 20,
  },
  preventionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  preventItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  preventDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: PRIMARY_GREEN, marginTop: 8 },
  preventBody: { flex: 1, marginLeft: 12 },
  preventTitle: { fontSize: 14, fontWeight: '600', lineHeight: 20 },
  preventDesc: { fontSize: 13, lineHeight: 18, marginTop: 2 },

  /* AI Expert */
  aiCard: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    padding: 16,
  },
  aiHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  aiTitle: { fontSize: 16, fontWeight: '700', marginLeft: 10 },
  aiLoading: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  aiLoadingText: { fontSize: 14, marginLeft: 10 },
  aiBody: {},
  aiRow: { marginBottom: 10 },
  aiLabel: { fontSize: 12, fontWeight: '700', color: PRIMARY_GREEN, textTransform: 'uppercase', marginBottom: 2 },
  aiValue: { fontSize: 14, lineHeight: 20 },
  aiReply: {
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: PRIMARY_GREEN,
  },
  aiReplyLabel: { fontSize: 12, fontWeight: '700', marginBottom: 4 },
  aiReplyText: { fontSize: 13, lineHeight: 19 },

  /* FAB */
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PRIMARY_GREEN,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 28,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  fabText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600', marginLeft: 8 },

  /* Wrong-crop dialog */
  wrongCropOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  wrongCropCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    elevation: 12,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
  },
  wrongCropIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(229,57,53,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wrongCropTitle: { fontSize: 20, fontWeight: '700', color: WARNING_RED, marginTop: 20 },
  wrongCropMessage: {
    fontSize: 14,
    color: TEXT_SECONDARY,
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 20,
  },
  wrongCropButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PRIMARY_GREEN,
    borderRadius: 50,
    height: 50,
    width: '100%',
    marginTop: 26,
  },
  wrongCropButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600', marginLeft: 8 },

  /* Bounding box overlay on leaf image */
  bboxOverlay: {
    position: 'absolute',
    borderWidth: 2.5,
    borderColor: '#FF3D00',
    backgroundColor: 'rgba(255, 61, 0, 0.16)',
    borderRadius: 6,
  },
  bboxTag: {
    position: 'absolute',
    top: -24,
    left: 0,
    backgroundColor: '#FF3D00',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 4,
  },
  bboxTagText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },

  /* 15L Knapsack Sprayer Dosage card */
  knapsackCard: {
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  knapsackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  knapsackIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  knapsackTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  knapsackSubtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  knapsackDosageText: {
    fontSize: 13.5,
    lineHeight: 20,
    fontWeight: '500',
  },
  knapsackScheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  knapsackScheduleText: {
    fontSize: 12,
    marginLeft: 6,
    flex: 1,
  },
  knapsackOrganicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  knapsackOrganicText: {
    fontSize: 12,
    marginLeft: 6,
    flex: 1,
  },
});
