## 📝 Motivation

While learning front-end development through textbooks, I realized that simply copying the code examples did not help me internalize the concepts.  
To truly learn, I wanted to **build something on my own using HTML, CSS, and JavaScript** — while also leveraging AI code generation as a coding assistant.  

This way, I could **practice reading and understanding auto-generated code** in parallel with studying technical books, bridging theory and hands-on learning.  
As a result, I decided to develop this **Image Compare Slider**, a project that can be fully implemented with core front-end technologies.

---

## 🎯 Purpose

Although image comparison sliders already exist, most of them are designed for landscapes, objects, or full-body photos.  
Surprisingly, I found that there were very few sliders that could **focus specifically on faces**, automatically align them, and then allow fair Before/After comparison.  

Therefore, I decided to develop this application as both a **learning project** and a **practical tool** that highlights facial differences more accurately.  
Another reason was that the app can be deployed on a simple static web server — making it an excellent opportunity to practice **AWS hosting without heavy backend complexity**.  

---

## 🌍 Use Cases

This Image Compare Slider can be applied to a wide range of comparisons, such as landscapes, objects, portraits, facial changes, and various before/after results.

- **Landscapes:**  
  Compare the transformation of a city over time, differences in lifestyles between eras, or Contrasting cityscapes between an international metropolis and Tokyo’s Shibuya district.
- **Objects:**  
  Contrast an iPhone 3G with an iPhone 16 Pro, examine the differences between oxford and open-collar shirt, or showcase a chameleon’s color change.
- **People:**  
  Show before/after weight loss progress, a child’s growth over time, or the difference between everyday appearance and cosplay.
- **Faces:**  
  Compare facial appearance in winter season and summer season, makeup, differences between childhood and adulthood in the same person.  
- **Outcomes:**  
  Showcase a cleaned vs. messy bathroom, compare study achievements of artwork, or highlight stain removal on clothing.

---

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
- **Internationalization (i18n)**
  Built-in JP/EN dropdown with persistence across pages (localStorage)

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

## How to use

1.	Open the application in your browser.
2.	Use the image upload buttons to select the two images you want to compare.
	•	We serve a wide variety of images on the comparison samples page on the site.
	•	You can also try device-before.jpg and device-after.jpg for product evolution.
	•	Or test face-before.jpg and face-after.jpg to experience the face-only alignment mode.
3.	Once uploaded, the slider will appear automatically.
	•	In face-only mode, the app will detect and align facial landmarks so both images match in scale and position.
4.	Drag the slider left or right to reveal differences between the two images.

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

- [ x ] Improve mobile UI (larger touch areas, slider handle)
- [ ] Landmark detection fallback (auto switch to non-aligned mode on failure)
- [ ] Client+Server UI Improvements ([Milestone](https://github.com/ytkhs8/HTML-CSS--2025-Practice/imgcomparing-slider/Client+ServerUIImprovements/1))
- [ ] User Accounts & Data Persistence
- [ ] Cloud alignment option (e.g., Google Vision API) with explicit user consent
- [ ] Export aligned comparison results (side-by-side or half-face composite)
- [ x ] Accessibility support (keyboard slider control, ARIA labels)
- [ x ] Multi-language support (English & Japanese)
- [ ] Phase 2: Add user accounts and persistent data storage ([Issue #12](link-to-issue))

---

## 🙋 Author

- **Yūki Takahashi**  
- Location: Tokyo, Japan  
- Links: [Portfolio](#) | [LinkedIn](#) | [Twitter](#)

---

## 📌 Development Practices

This project follows the **Conventional Commits** specification for commit messages.  
By using `feat:`, `fix:`, `refactor:`, `docs:`, and other standardized prefixes, the commit history stays clear and meaningful.  
This practice is widely adopted in international tech companies and demonstrates consistent version control discipline.

---


## 📄 License

This project is licensed under the MIT License.