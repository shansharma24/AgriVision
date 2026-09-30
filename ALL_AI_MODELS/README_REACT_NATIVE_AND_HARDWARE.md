# Smart Krishi — Consolidated AI Models Package
### SIH Problem Statement ID: 26180 (Qualcomm Inc. — Hardware / Edge AI Category)

This directory contains **all production on-device TFLite models and metadata assets** for the Smart Krishi ecosystem. Every model is fully optimized for **100% offline edge execution** on:
- **Mobile Smartphone Silicon**: Qualcomm Snapdragon, MediaTek Dimensity, Apple Bionic via **React Native (`react-native-fast-tflite`)**
- **Edge Microcontrollers / SBCs**: Raspberry Pi Zero 2 W, Raspberry Pi 4/5, Qualcomm QCS6490 / RB5 via **Python `tflite_runtime` / LiteRT**

---

## 1. Directory Structure

```
ALL_AI_MODELS/
├── production_edge_int8/             <-- RECOMMENDED FOR APPS & HARDWARE (<4.3 MB TOTAL)
│   ├── smart_krishi_deep_mobilenetv3_int8.tflite     (3.86 MB) [38 Diseases + BBoxes + Chlorosis]
│   ├── smart_krishi_yolov8_nano_pests_int8.tflite    (296 KB)  [Micro-Pests: Aphid, Whitefly, Mite, Thrips]
│   ├── smart_krishi_fertilizer_recommender_int8.tflite(54 KB)  [Commercial Retail Bags & Legume Credits]
│   ├── smart_krishi_crop_recommender_int8.tflite     (23 KB)   [22 ICAR Crops & 2024-25 Mandi MSP]
│   └── smart_krishi_boss_int8.tflite                 (35 KB)   [Ultra-fast 160x160 Health Gate]
│
├── reference_fp32/                   <-- Full precision 32-bit floating point reference models
│   ├── smart_krishi_deep_mobilenetv3_fp32.tflite     (13.2 MB)
│   └── smart_krishi_boss_fp32.tflite                 (66 KB)
│
├── individual_crop_models/           <-- Legacy per-crop TFLite models (Apple, Potato, Tomato, etc.)
│   ├── Apple.tflite, Potato.tflite, Tomato.tflite, Corn.tflite, etc.
│
├── labels_and_metadata/              <-- Dictionaries, vernacular texts, and MSP economics
│   ├── class_labels_38.json                          [38 PlantVillage ICAR class definitions]
│   ├── crop_diseases_full_dictionary.json            [Symptoms, remedies, knapsack dosages in 6 languages]
│   ├── crop_metadata.json                            [22 crops, botanical families, 2024-25 MSP]
│   ├── fertilizer_metadata.json                      [Commercial bag specs: 45kg Urea, 50kg DAP, 50kg MOP]
│   ├── pest_labels.txt                               [Micro-pest label classes]
│   └── labels.txt                                    [Raw text line mapping]
│
├── AgriVisionReactNativeEngine.ts   <-- Drop-in React Native C++ JSI integration module (with Logit Masking)
├── SIH_PRESENTATION_AI_DEFENSE.md    <-- Defense script & slides guide for SIH & Qualcomm judges
└── verify_all_models.py              <-- Automated Python verification test script
```

---

## 2. React Native Integration (via `react-native-fast-tflite`)

`react-native-fast-tflite` runs directly on native C++ JSI without the JavaScript bridge, achieving **sub-50ms execution** on Qualcomm Snapdragon smartphone NPUs/CPUs.

### Step 1: Install Dependencies
```bash
npm install react-native-fast-tflite
```

### Step 2: Configure Metro Bundler (`metro.config.js`)
Ensure Metro includes `.tflite` as an asset extension:
```javascript
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

const defaultConfig = getDefaultConfig(__dirname);
defaultConfig.resolver.assetExts.push('tflite', 'txt');

module.exports = mergeConfig(defaultConfig, {});
```

### Step 3: Bundle Models in Your App
Place the `.tflite` models in your React Native project:
- **Android**: `android/app/src/main/assets/`
- **iOS**: Drag `.tflite` files into Xcode Resources.

### Step 4: Execute On-Device Inference
```typescript
import { loadTensorflowModel } from 'react-native-fast-tflite';

// 1. Load the Deep Disease & Morphology Model (3.86 MB)
const visionModel = await loadTensorflowModel(
  require('./assets/smart_krishi_deep_mobilenetv3_int8.tflite'),
  'default' // or 'nnapi' on Android for Qualcomm Hexagon NPU acceleration
);

// 2. Input Tensor: Float32Array of size 1 * 224 * 224 * 3 (Normalized 0.0 to 1.0)
const inputTensor = new Float32Array(1 * 224 * 224 * 3);
// ... populate from camera frame ...

// 3. Run zero-copy native inference (< 50ms)
const outputTensors = await visionModel.run([inputTensor]);

// Output 0: 38 Disease Probabilities [1, 38]
// Output 1: Normalized Lesion Bounding Box [1, 4] -> [ymin, xmin, ymax, xmax]
// Output 2: Foliar Chlorosis Index [1, 1] -> 0.0 to 1.0
const diseaseProbabilities = outputTensors[0];
const lesionBox = outputTensors[1];
const chlorosis = outputTensors[2][0];
```

---

## 3. Hardware Integration (Raspberry Pi Zero 2 W / Edge Linux / Qualcomm QCS6490)

On edge hardware, use standard LiteRT / TFLite runtime in Python:

```python
import numpy as np
import tflite_runtime.interpreter as tflite

# Load model
interpreter = tflite.Interpreter(model_path="smart_krishi_deep_mobilenetv3_int8.tflite")
interpreter.allocate_tensors()

input_details = interpreter.get_input_details()
output_details = interpreter.get_output_details()

# Prepare camera frame: (1, 224, 224, 3) float32 in [0, 1]
image_input = np.expand_dims(normalized_camera_frame, axis=0).astype(np.float32)

interpreter.set_tensor(input_details[0]['index'], image_input)
interpreter.invoke()

disease_probs = interpreter.get_tensor(output_details[0]['index'])[0]
lesion_coords = interpreter.get_tensor(output_details[1]['index'])[0]
chlorosis_val = interpreter.get_tensor(output_details[2]['index'])[0][0]

predicted_class_id = int(np.argmax(disease_probs))
confidence = float(disease_probs[predicted_class_id])
```

---

## 4. Model Specifications & Tensor Details

| Model File | Size | Input Shape & Type | Output Shapes & Description | Recommended Hardware |
|---|---|---|---|---|
| `smart_krishi_deep_mobilenetv3_int8.tflite` | **3.86 MB** | `[1, 224, 224, 3]` Float32 (0..1) | `[1, 38]` Disease probabilities<br>`[1, 4]` Lesion box `[ymin, xmin, ymax, xmax]`<br>`[1, 1]` Foliar Chlorosis Index | React Native / Snapdragon NPU / Pi Zero 2 W |
| `smart_krishi_yolov8_nano_pests_int8.tflite` | **296 KB** | `[1, 224, 224, 3]` Float32 (0..1) | `[1, 980, 4]` Anchor-free candidate boxes<br>`[1, 980, 4]` 4 Pest classes (Aphid, Whitefly, Mite, Thrips) | React Native / Snapdragon NPU / Pi Zero 2 W |
| `smart_krishi_fertilizer_recommender_int8.tflite` | **54.2 KB** | `[1, 18]` Float32 (Normalized NPK, pH, EC, soil type, crop, legume history) | `[1, 7]` 7 Fertilizer classes (Urea, DAP, MOP, SSP, 10-26-26, ZnSO4, Compost) | React Native / Any MCU |
| `smart_krishi_crop_recommender_int8.tflite` | **23.4 KB** | `[1, 7]` Float32 (N, P, K, Temp, Humidity, pH, Rain) | `[1, 22]` 22 ICAR Field Crops (Rice, Wheat, Jute, Cotton, etc.) | React Native / Any MCU |
| `smart_krishi_boss_int8.tflite` | **35.3 KB** | `[1, 160, 160, 3]` INT8 quantized | `[1, 10]` Top 10 broad agricultural classes | Ultra-low power MCUs / Wearables |

---

## 5. Verification
Run the verification suite anytime:
```bash
python verify_all_models.py
```
Outputs tensor shapes and confirms zero missing dependencies.
