# Image Compare Slider (Face Alignment Edition)

A web application that allows users to compare **Before / After** images using a smooth slider.  
It leverages **face-api.js** to detect facial landmarks and aligns faces (rotation, scale, position) to ensure accurate and fair visual comparison.

---

## ✨ Features

- **Face-only mode (with slider)**  
  Detects facial landmarks (eyes) and automatically aligns both images to the same template before sliding.
- **Half-face composite (optional)**  
  Combines the left half of the Before image with the right half of the After image into one picture.
- **Interactive slider**  
  Drag to smoothly reveal differences between two images.
- **Local-first & privacy-friendly**  
  All processing happens directly in the browser. **No server uploads or data storage**.

---

## 🔧 Tech Stack

- HTML / CSS / JavaScript
- [face-api.js](https://github.com/justadudewhohacks/face-api.js) (TinyFaceDetector + FaceLandmark68)
- Canvas 2D API
- (Development) VS Code Live Server

---

## 🗂 Project Structure
imgcomparing-slider/
├─ index.html
├─ css/
│  └─ style.css
├─ js/
│  ├─ compare.js          # UI & interactions
│  └─ faceUtils.js        # Face detection & alignment utilities
└─ models/                # face-api.js model files (local setup)
├─ tiny_face_detector_model-weights_manifest.json
├─ tiny_face_detector_model-shard1
├─ face_landmark_68_model-weights_manifest.json
└─ face_landmark_68_model-shard1

> In `faceUtils.js`, the model path is set as `FACE_MODEL_PATH = './models/'`.  
> This ensures stability by loading model files locally instead of from a CDN.

---

## 🚀 Getting Started (Local Development)

1. Clone this repository.
2. Download the required model files from [face-api.js-models](https://github.com/justadudewhohacks/face-api.js-models) and place them under `./models/`.
   - `tiny_face_detector_model-weights_manifest.json`
   - `tiny_face_detector_model-shard1`
   - `face_landmark_68_model-weights_manifest.json`
   - `face_landmark_68_model-shard1`
3. Run with Live Server (VS Code) or any static file server.
4. Open `http://localhost:5500/imgcomparing-slider/` (Live Server default may vary).

---

## 🧠 How It Works

1. **Face Detection**  
   TinyFaceDetector identifies a face, and FaceLandmark68 returns key facial landmarks (eyes, nose, mouth).
2. **Alignment**  
   Using eye centers, the app normalizes rotation, scale, and position.  
   Both images are drawn into the same canvas template (fixed width/height, fixed eye position).
3. **Slider Comparison**  
   The aligned Before and After images are displayed inside a draggable slider for intuitive comparison.

---

## 🔒 Privacy & Data Handling

- All processing is performed **locally in the browser**.  
- No image is uploaded to a server or stored externally.  
- This makes the app safe for sensitive images (e.g., personal portraits, medical use cases).

---

## 🛣 Roadmap

- [ ] Improve mobile UI (larger touch areas, slider handle)
- [ ] Landmark detection fallback (auto switch to non-aligned mode on failure)
- [ ] Cloud alignment option (e.g., Google Vision API) with explicit user consent
- [ ] Export aligned comparison results (side-by-side or half-face composite)
- [ ] Accessibility support (keyboard slider control, ARIA labels)
- [ ] Multi-language support (English & Japanese)

---

## 🙋 Author

- **Yūki Takahashi**  
- Location: Tokyo, Japan  
- Links: [Portfolio](#) | [LinkedIn](#) | [Twitter](#)

---

## 📄 License

This project is licensed under the MIT License.