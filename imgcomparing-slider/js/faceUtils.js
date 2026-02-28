// js/faceUtils.js  — 共通処理ユーティリティ（ES Modules）

/**
 * Base path for loading Face API models.
 * This path can be overridden externally (e.g., from compare.js)
 * if models are stored in a different directory.
 *
 * @type {string}
 */
// モデルパス（必要なら compare.js から上書き可）
export let FACE_MODEL_PATH = './models/';

/**
 * TinyFaceDetector configuration optimized for stability and performance,
 * especially on Safari and mobile browsers.
 *
 * inputSize:
 *   Controls internal resolution used for detection.
 *   Higher values increase accuracy but reduce performance.
 *
 * scoreThreshold:
 *   Minimum confidence score required to consider a face detection valid.
 *
 * @type {faceapi.TinyFaceDetectorOptions}
 */
// Safari 安定化向けオプション（必要に応じて調整可）
export const TINY_OPTS = new faceapi.TinyFaceDetectorOptions({
  inputSize: 512,
  scoreThreshold: 0.35
});

let faceApiReady = false;

/**
 * Loads the required Face API models if not already loaded.
 *
 * This function initializes:
 * - TinyFaceDetector (lightweight and fast face detection)
 * - FaceLandmark68Net (facial landmark detection)
 *
 * Models are loaded only once and cached using the faceApiReady flag.
 *
 * @param {string} [modelPath=FACE_MODEL_PATH]
 * Path to the directory containing Face API model files.
 *
 * @returns {Promise<void>}
 * Resolves when all required models are successfully loaded.
 */
// モデル読込
export async function loadFaceApiModels(modelPath = FACE_MODEL_PATH) {
  if (faceApiReady) return;
  // 検出器（軽い方）＋ ランドマーク
  await faceapi.nets.tinyFaceDetector.loadFromUri(modelPath);
  await faceapi.nets.faceLandmark68Net.loadFromUri(modelPath);

  // より精度を上げたい場合は SSD Mobilenet V1 も（重くなるため任意）
  // await faceapi.nets.ssdMobilenetv1.loadFromUri(modelPath);

  faceApiReady = true;
}

/**
 * Loads an image file and converts it into an HTMLImageElement.
 *
 * This function reads the file using FileReader and creates an Image object,
 * allowing it to be used in canvas operations or face detection.
 *
 * @param {File} file
 * The image file selected by the user.
 *
 * @returns {Promise<HTMLImageElement>}
 * Resolves with a fully loaded HTMLImageElement.
 */
// 画像FileをImageに読み込むPromise
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
 * Crops a detected face region from an image and returns it as a canvas.
 *
 * The cropped region is scaled proportionally so its width matches targetWidth.
 * High-quality image smoothing is applied to preserve visual quality.
 *
 * @param {HTMLImageElement} img
 * The source image containing the face.
 *
 * @param {faceapi.Box} box
 * The bounding box representing the detected face region.
 *
 * @param {number} [targetWidth=420]
 * Desired output width of the cropped face canvas.
 *
 * @returns {HTMLCanvasElement}
 * A canvas element containing the cropped and scaled face image.
 */
// 画像と検出結果から顔矩形を切り抜いたCanvasを返す
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
 * Detects a face in an image file and returns a cropped face canvas.
 *
 * This function performs the following steps:
 * 1. Loads Face API models if necessary.
 * 2. Converts the file into an HTMLImageElement.
 * 3. Detects a single face using TinyFaceDetector.
 * 4. Crops and scales the detected face region.
 *
 * @param {File} file
 * The image file containing a face.
 *
 * @param {number} [targetWidth=420]
 * Desired width of the resulting face canvas.
 *
 * @returns {Promise<HTMLCanvasElement|null>}
 * Resolves with the cropped face canvas, or null if no face is detected.
 */
// ファイルから顔切り抜きCanvasを生成（TinyFaceDetectorを使用）
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
 * Extracts and aligns face canvases from two image files.
 *
 * Each image is processed independently, and the resulting face canvases
 * are resized to match the smallest common dimensions.
 *
 * This ensures both faces can be compared directly (e.g., in a slider or composite).
 *
 * @param {File} beforeFile
 * The "before" image file.
 *
 * @param {File} afterFile
 * The "after" image file.
 *
 * @param {number} [targetWidth=420]
 * Desired width of each face canvas before alignment.
 *
 * @returns {Promise<{
 *   bAligned: HTMLCanvasElement,
 *   aAligned: HTMLCanvasElement,
 *   w: number,
 *   h: number
 * } | null>}
 * Resolves with aligned face canvases and dimensions, or null if detection fails.
 */
// 2枚の File から「検出済み・同サイズの顔 Canvas」を返す（共通基盤）
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
 * Prepares two aligned face images for the comparison slider.
 *
 * This is a thin wrapper around {@link getAlignedFacesFromFiles} that converts
 * the aligned face canvases into PNG Data URLs.
 *
 * @param {File} beforeFile
 * The "before" image file.
 *
 * @param {File} afterFile
 * The "after" image file.
 *
 * @param {number} [targetWidth=420]
 * Desired width of each extracted face canvas prior to alignment.
 *
 * @returns {Promise<{
 *   before: string,
 *   after: string,
 *   w: number,
 *   h: number
 * } | null>}
 * Resolves with PNG Data URLs and the common dimensions, or `null` if face detection fails.
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
 * Composes a single "half-face" image from two input photos.
 *
 * The output is a PNG Data URL where the left half is taken from the aligned
 * "before" face and the right half from the aligned "after" face.
 * A subtle vertical blend is added at the center boundary to reduce harsh seams.
 *
 * @param {File} beforeFile
 * The "before" image file.
 *
 * @param {File} afterFile
 * The "after" image file.
 *
 * @param {number} [targetWidth=420]
 * Desired width of each extracted face canvas prior to alignment.
 *
 * @returns {Promise<string | null>}
 * Resolves with a PNG Data URL, or `null` if face detection fails.
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

  // 左半分: Before
  ctx.drawImage(bAligned, 0, 0, half, h, 0, 0, half, h);
  // 右半分: After
  ctx.drawImage(aAligned, w - half, 0, half, h, w - half, 0, half, h);

  // 中央の境界ぼかし
  const grad = ctx.createLinearGradient(half - 6, 0, half + 6, 0);
  grad.addColorStop(0, 'rgba(255, 255, 255, 0)');
  grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.35)');
  grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(half - 6, 0, 12, h);

  return out.toDataURL('image/png');
}

/**
 * Calculates the centroid (average position) of a set of points.
 *
 * Used to estimate the center of an eye region from landmark points.
 *
 * @param {Array<{x: number, y: number}>} pts
 * List of points that contain `x` and `y` coordinates.
 *
 * @returns {{x: number, y: number}}
 * The centroid of the provided points.
 */
function eyeCenter(pts) {
  const x = pts.reduce((s, p) => s + p.x, 0) / pts.length;
  const y = pts.reduce((s, p) => s + p.y, 0) / pts.length;
  return {x, y};
}

/**
 * Aligns a face to a canonical template using eye landmarks.
 *
 * The alignment normalizes rotation, scale, and translation so that the midpoint
 * between the eyes is placed at a target position, and the eye-to-eye distance
 * matches a desired pixel distance in the output canvas.
 *
 * Internally, this applies an affine transform in the following order:
 * translate to target eye midpoint → rotate to level the eyes → scale to match eye distance
 * → translate so the detected eye midpoint lands on the origin.
 *
 * @param {HTMLImageElement} img
 * Source image element used for drawing.
 *
 * @param {faceapi.FaceLandmarks68} landmarks
 * Face landmarks (must provide left/right eye points).
 *
 * @param {number} [outW=420]
 * Output canvas width in pixels.
 *
 * @param {number} [outH=520]
 * Output canvas height in pixels.
 *
 * @param {number} [eyeY=0.38]
 * Normalized vertical position (0–1) of the eye line in the output canvas.
 *
 * @param {number} [eyeDist=0.42 * outW]
 * Target distance (in pixels) between the left and right eye centers in the output.
 *
 * @returns {HTMLCanvasElement}
 * A canvas containing the aligned face image.
 */
export function alignFaceToTemplate(img, landmarks, outW = 420, outH = 520, eyeY = 0.38, eyeDist = 0.42 * outW) {
  const leftEyePts = landmarks.getLeftEye();
  const rightEyePts = landmarks.getRightEye();
  const left = eyeCenter(leftEyePts);
  const right = eyeCenter(rightEyePts);
  const mid = { x:(left.x + right.x) / 2, y:(left.y + right.y) / 2};

  // 現在の目間距離と角度
  const dx = right.x - left.x;
  const dy = right.y - left.y;
  const dist = Math.hypot(dx, dy);
  const angle = Math.atan2(dy, dx); // 右目に向かう角度

  // スケール：目間距離をテンプレート値に合わせる
  const scale = eyeDist / Math.max(1, dist);

  // 出力キャンバス
  const out = document.createElement('canvas');
  out.width = outW;
  out.height = outH;
  const ctx = out.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // 目の“テンプレート位置”（左右の目中心が outW/2±eyeDist/2, y=eyeY*outH 付近に来るように）
  const targetMidX = outW / 2;
  const targetMidY = outH * eyeY;

  // 変換：出力座標系で 1) 中心へ移動 → 2) 回転補正 → 3) スケール → 4) 画像を “目の中点” に合わせて描画
  ctx.translate(targetMidX, targetMidY);
  ctx.rotate(-angle);
  ctx.scale(scale, scale);
  ctx.translate(-mid.x, -mid.y);

  ctx.drawImage(img, 0, 0);

  return out;
}

/**
 * Extracts face landmarks from an image file and returns an aligned face canvas.
 *
 * This function:
 * 1) ensures Face API models are loaded,
 * 2) loads the image file,
 * 3) detects a face with {@link TINY_OPTS} and extracts 68-point landmarks,
 * 4) aligns the face to a template via {@link alignFaceToTemplate}.
 *
 * @param {File} file
 * Image file containing a face.
 *
 * @param {number} [targetW=420]
 * Output canvas width.
 *
 * @param {number} [targetH=520]
 * Output canvas height.
 *
 * @returns {Promise<HTMLCanvasElement | null>}
 * Resolves with an aligned canvas, or `null` if no face is detected.
 */
export async function  getAlignedFaceCanvasFromFile(file, targetW=420, targetH=520) {
  await loadFaceApiModels();
  const img = await loadImageFromFile(file);

  // ランドマーク抽出（TinyFaceDetector + Landmark）
  const det = await faceapi
    .detectSingleFace(img, TINY_OPTS)
    .withFaceLandmarks();
  if (!det) return null;

  return alignFaceToTemplate(img, det.landmarks, targetW, targetH);
}

/**
 * Prepares two template-aligned face images for the comparison slider.
 *
 * Unlike {@link prepareFacesForSlider}, this variant performs landmark-based
 * alignment (rotation/scale/translation) so that both faces match the same
 * canonical framing and output size.
 *
 * @param {File} beforeFile
 * The "before" image file.
 *
 * @param {File} afterFile
 * The "after" image file.
 *
 * @param {number} [outW=420]
 * Output width for both aligned canvases.
 *
 * @param {number} [outH=520]
 * Output height for both aligned canvases.
 *
 * @returns {Promise<{
 *   before: string,
 *   after: string,
 *   w: number,
 *   h: number
 * } | null>}
 * Resolves with PNG Data URLs and output dimensions, or `null` if detection/alignment fails.
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