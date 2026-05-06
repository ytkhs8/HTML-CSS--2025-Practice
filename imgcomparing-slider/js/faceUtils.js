/**
 * =====================================================
 * Face Utility Module (Face API / Canvas Processing)
 * =====================================================
 *
 * @description
 * Provides shared face-detection and image-processing utilities used by the
 * image comparison slider.
 *
 * This module is responsible for loading face-api.js models, converting image
 * files into drawable images, detecting/cropping faces, aligning faces to a
 * comparable template, and generating image data URLs for the slider UI.
 *
 * The implementation is intentionally separated from compare.js so the UI layer
 * can stay focused on user interaction while this module handles face/canvas work.
 *
 * @module FaceUtils
 */

/**
 * @description
 * Base path used to load face-api.js model files.
 *
 * The default assumes models are served from the local `./models/` directory.
 * Other modules can update this value when model files are served from a
 * different path.
 */
export let FACE_MODEL_PATH = './models/';

/**
 * @description
 * Default TinyFaceDetector options.
 *
 * These settings are tuned for a practical balance between detection stability
 * and performance, especially on Safari and mobile browsers.
 *
 * `inputSize` controls the internal detection resolution. Higher values may
 * improve accuracy but increase processing cost.
 *
 * `scoreThreshold` defines the minimum confidence score required to accept a
 * detected face.
 */
export const TINY_OPTS = new faceapi.TinyFaceDetectorOptions({
  inputSize: 512,
  scoreThreshold: 0.35
});

/**
 * @description
 * Tracks whether required face-api.js models have already been loaded.
 *
 * This prevents repeated network requests and model initialization work when
 * multiple comparison flows are executed during the same page session.
 */
let faceApiReady = false;

/**
 * @description
 * Loads the required face-api.js models once and caches the loaded state.
 *
 * The function initializes TinyFaceDetector for lightweight face detection and
 * FaceLandmark68Net for extracting facial landmarks. After the first successful
 * load, later calls return immediately.
 *
 * @example
 * await loadFaceApiModels();
 */
export async function loadFaceApiModels(modelPath = FACE_MODEL_PATH) {
  if (faceApiReady) return;
  await faceapi.nets.tinyFaceDetector.loadFromUri(modelPath);
  await faceapi.nets.faceLandmark68Net.loadFromUri(modelPath);

  /**
   * Optional model:
   * Load SSD Mobilenet V1 when higher detection accuracy is needed,
   * but keep it disabled by default because it is heavier.
   */
  // await faceapi.nets.ssdMobilenetv1.loadFromUri(modelPath);

  faceApiReady = true;
}

/**
 * @description
 * Converts a user-selected image file into a fully loaded HTMLImageElement.
 *
 * The file is read as a Data URL with FileReader, assigned to a new Image
 * instance, and resolved only after the image has finished loading.
 *
 * @example
 * const img = await loadImageFromFile(file);
 */
export function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = ev => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = ev.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * @description
 * Crops a detected face bounding box from an image into a canvas.
 *
 * The crop area is clamped to the image bounds, scaled proportionally to match
 * the requested width, and drawn with high-quality canvas smoothing.
 *
 * @example
 * const faceCanvas = cropFaceToCanvas(img, detection.box, 420);
 */
export function cropFaceToCanvas(img, box, targetWidth = 420) {
  const sx = Math.max(0, box.x);
  const sy = Math.max(0, box.y);
  const sw = Math.min(img.width - sx, box.width);
  const sh = Math.min(img.height - sy, box.height);

  const scale = targetWidth / sw;
  const tw = Math.round(sw * scale);
  const th = Math.round(sh * scale);

  const faceCanvas = document.createElement('canvas');
  faceCanvas.width = tw;
  faceCanvas.height = th;
  const ctx = faceCanvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, tw, th);
  return faceCanvas;
}

/**
 * @description
 * Detects a single face from an image file and returns a cropped face canvas.
 *
 * Processing flow:
 * 1. Load face-api.js models if necessary.
 * 2. Convert the selected file into an image.
 * 3. Draw the image to a temporary canvas for detection.
 * 4. Detect one face using TinyFaceDetector.
 * 5. Crop and scale the detected face region.
 *
 * Returns `null` when no face is detected.
 *
 * @example
 * const faceCanvas = await getFaceCanvasFromFile(file);
 */
export async function getFaceCanvasFromFile(file, targetWidth = 420) {
  await loadFaceApiModels();
  const img = await loadImageFromFile(file);

  const tmp = document.createElement('canvas');
  tmp.width = img.width;
  tmp.height = img.height;
  tmp.getContext('2d').drawImage(img, 0, 0);

  const det = await faceapi.detectSingleFace(tmp, TINY_OPTS);
  if (!det) return null;

  return cropFaceToCanvas(img, det.box, targetWidth);
}

/**
 * @description
 * Extracts face canvases from two image files and normalizes them to the same size.
 *
 * Each image is processed independently. The resulting canvases are resized to
 * the smallest shared width and height so they can be compared or combined safely.
 *
 * Returns `null` when either image does not contain a detectable face.
 *
 * @example
 * const faces = await getAlignedFacesFromFiles(beforeFile, afterFile);
 */
export async function getAlignedFacesFromFiles(beforeFile, afterFile, targetWidth = 420) {
  const bFace = await getFaceCanvasFromFile(beforeFile, targetWidth);
  const aFace = await getFaceCanvasFromFile(afterFile, targetWidth);
  if (!bFace || !aFace) return null;

  const w = Math.min(bFace.width, aFace.width);
  const h = Math.min(bFace.height, aFace.height);

  const bAligned = document.createElement('canvas');
  bAligned.width = w;
  bAligned.height = h;
  bAligned.getContext('2d').drawImage(bFace, 0, 0, w, h);

  const aAligned = document.createElement('canvas');
  aAligned.width = w;
  aAligned.height = h;
  aAligned.getContext('2d').drawImage(aFace, 0, 0, w, h);

  return { bAligned, aAligned, w, h };
}

/**
 * @description
 * Prepares two cropped-and-aligned face images for slider rendering.
 *
 * This wrapper converts aligned canvases into PNG Data URLs that can be assigned
 * directly to image elements in the comparison slider.
 *
 * Returns `null` when face detection fails.
 *
 * @example
 * const images = await prepareFacesForSlider(beforeFile, afterFile);
 * imgBefore.src = images.before;
 * imgAfter.src = images.after;
 */
export async function prepareFacesForSlider(beforeFile, afterFile, targetWidth = 420) {
  const faces = await getAlignedFacesFromFiles(beforeFile, afterFile, targetWidth);
  if (!faces) return null;
  const { bAligned, aAligned, w, h } = faces;
  return {
    before: bAligned.toDataURL('image/png'),
    after: aAligned.toDataURL('image/png'),
    w, h
  };
}

/**
 * @description
 * Creates a half-face composite image from two photos.
 *
 * The output image uses the left half of the aligned "before" face and the right
 * half of the aligned "after" face. A subtle vertical blend is applied at the
 * center seam to make the boundary less harsh.
 *
 * Returns `null` when face detection fails.
 *
 * @example
 * const compositeUrl = await composeHalfFace(beforeFile, afterFile);
 */
export async function composeHalfFace(beforeFile, afterFile, targetWidth = 420) {
  const faces = await getAlignedFacesFromFiles(beforeFile, afterFile, targetWidth);
  if (!faces) return null;
  const { bAligned, aAligned, w, h } = faces;

  const half = Math.floor(w / 2);
  const out = document.createElement('canvas');
  out.width = w;
  out.height = h;
  const ctx = out.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  ctx.drawImage(bAligned, 0, 0, half, h, 0, 0, half, h);
  ctx.drawImage(aAligned, w - half, 0, half, h, w - half, 0, half, h);

  const grad = ctx.createLinearGradient(half - 6, 0, half + 6, 0);
  grad.addColorStop(0, 'rgba(255, 255, 255, 0)');
  grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.35)');
  grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(half - 6, 0, 12, h);

  return out.toDataURL('image/png');
}

/**
 * @description
 * Calculates the center point of a facial landmark group.
 *
 * This helper is used to estimate the center of the left or right eye by
 * averaging all landmark points in that eye region.
 */
function eyeCenter(pts) {
  const x = pts.reduce((s, p) => s + p.x, 0) / pts.length;
  const y = pts.reduce((s, p) => s + p.y, 0) / pts.length;
  return {x, y};
}

/**
 * @description
 * Aligns a face image to a canonical template using eye landmarks.
 *
 * The function normalizes rotation, scale, and translation so that the eye line
 * becomes horizontal, the eye midpoint moves to the target template position,
 * and the eye-to-eye distance matches the desired output distance.
 *
 * This makes two different faces easier to compare in a slider or composite view.
 *
 * @example
 * const alignedCanvas = alignFaceToTemplate(img, detection.landmarks);
 */
export function alignFaceToTemplate(img, landmarks, outW = 420, outH = 520, eyeY = 0.38, eyeDist = 0.42 * outW) {
  const leftEyePts = landmarks.getLeftEye();
  const rightEyePts = landmarks.getRightEye();
  const left = eyeCenter(leftEyePts);
  const right = eyeCenter(rightEyePts);
  const mid = { x:(left.x + right.x) / 2, y:(left.y + right.y) / 2};

  const dx = right.x - left.x;
  const dy = right.y - left.y;
  const dist = Math.hypot(dx, dy);
  const angle = Math.atan2(dy, dx);

  const scale = eyeDist / Math.max(1, dist);

  const out = document.createElement('canvas');
  out.width = outW;
  out.height = outH;
  const ctx = out.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const targetMidX = outW / 2;
  const targetMidY = outH * eyeY;

  ctx.translate(targetMidX, targetMidY);
  ctx.rotate(-angle);
  ctx.scale(scale, scale);
  ctx.translate(-mid.x, -mid.y);

  ctx.drawImage(img, 0, 0);

  return out;
}

/**
 * @description
 * Detects facial landmarks from an image file and returns a template-aligned canvas.
 *
 * Processing flow:
 * 1. Load face-api.js models if necessary.
 * 2. Convert the selected file into an image.
 * 3. Detect one face and its 68-point landmarks.
 * 4. Align the face to the canonical template.
 *
 * Returns `null` when no face is detected.
 *
 * @example
 * const alignedCanvas = await getAlignedFaceCanvasFromFile(file);
 */
export async function  getAlignedFaceCanvasFromFile(file, targetW=420, targetH=520) {
  await loadFaceApiModels();
  const img = await loadImageFromFile(file);

  const det = await faceapi
    .detectSingleFace(img, TINY_OPTS)
    .withFaceLandmarks();
  if (!det) return null;

  return alignFaceToTemplate(img, det.landmarks, targetW, targetH);
}

/**
 * @description
 * Prepares two landmark-aligned face images for slider rendering.
 *
 * Unlike the simpler crop-based path, this function uses eye landmarks to
 * normalize rotation, scale, and position before generating PNG Data URLs.
 * Both output images share the same canonical canvas size.
 *
 * Returns `null` when detection or alignment fails.
 *
 * @example
 * const faces = await prepareFacesForSliderAligned(beforeFile, afterFile);
 * imgBefore.src = faces.before;
 * imgAfter.src = faces.after;
 */
export async function prepareFacesForSliderAligned(beforeFile, afterFile, outW=420, outH=520) {
  const bAligned = await getAlignedFaceCanvasFromFile(beforeFile, outW, outH);
  const aAligned = await getAlignedFaceCanvasFromFile(afterFile, outW, outH);
  if (!bAligned || !aAligned) return null;

  return {
    before: bAligned.toDataURL('image/png'),
    after: aAligned.toDataURL('image/png'),
    w: outW, h: outH
  };
}