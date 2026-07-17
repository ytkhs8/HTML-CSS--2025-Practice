/**
 * =====================================================
 * 顔処理ユーティリティモジュール（Face API／Canvas処理）
 * =====================================================
 *
 * @description
 * 画像比較スライダーで使用する、顔検出と画像処理の共通機能を提供します。
 *
 * face-api.jsのモデル読み込み、画像ファイルの描画可能な画像への変換、顔の検出・
 * 切り抜き、比較用テンプレートへの位置合わせ、スライダーUIで使用する画像の
 * Data URL生成を担当します。
 *
 * UI層のcompare.jsがユーザー操作に集中できるよう、顔処理とCanvas処理を
 * このモジュールに分離しています。
 *
 * @module FaceUtils
 */

/**
 * @description
 * face-api.jsのモデルファイルを読み込む基準パスです。
 *
 * 初期値ではローカルの`./models/`ディレクトリから配信されることを想定しています。
 * 別の場所からモデルを配信する場合は、他のモジュールからこの値を変更できます。
 */
export let FACE_MODEL_PATH = './models/';

/**
 * @description
 * TinyFaceDetectorの初期設定です。
 *
 * 特にSafariやモバイルブラウザで、検出の安定性と処理性能のバランスが取れるよう
 * 調整しています。
 *
 * `inputSize`は内部の検出解像度を制御します。値を大きくすると精度が上がる場合が
 * ありますが、処理負荷も増加します。
 *
 * `scoreThreshold`は、検出した顔を採用するために必要な信頼度の最小値です。
 */
export const TINY_OPTS = new faceapi.TinyFaceDetectorOptions({
  inputSize: 512,
  scoreThreshold: 0.35
});

/**
 * @description
 * 必要なface-api.jsのモデルが読み込み済みかを記録します。
 *
 * 同じページの利用中に複数回比較しても、通信とモデルの初期化を繰り返さずに済みます。
 */
let faceApiReady = false;

/**
 * @description
 * 必要なface-api.jsのモデルを一度だけ読み込み、読み込み済みの状態を保持します。
 *
 * 軽量な顔検出を行うTinyFaceDetectorと、顔のランドマークを取得する
 * FaceLandmark68Netを初期化します。最初の読み込み成功後は、以降の呼び出しを
 * すぐに終了します。
 *
 * @example
 * await loadFaceApiModels();
 */
export async function loadFaceApiModels(modelPath = FACE_MODEL_PATH) {
  if (faceApiReady) return;
  await faceapi.nets.tinyFaceDetector.loadFromUri(modelPath);
  await faceapi.nets.faceLandmark68Net.loadFromUri(modelPath);

  /**
   * 任意のモデル：
   * より高い検出精度が必要な場合はSSD Mobilenet V1を読み込みます。
   * 処理が重いため、初期状態では無効にしています。
   */
  // await faceapi.nets.ssdMobilenetv1.loadFromUri(modelPath);

  faceApiReady = true;
}

/**
 * @description
 * ユーザーが選択した画像ファイルを、読み込み済みのHTMLImageElementへ変換します。
 *
 * FileReaderでファイルをData URLとして読み込み、新しいImageオブジェクトへ設定します。
 * 画像の読み込みが完了してからPromiseを解決します。
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
 * 顔のランドマーク群の中心座標を計算します。
 *
 * 左目または右目の領域にある全ランドマーク座標の平均を取り、目の中心を求めます。
 */
function eyeCenter(pts) {
  const x = pts.reduce((s, p) => s + p.x, 0) / pts.length;
  const y = pts.reduce((s, p) => s + p.y, 0) / pts.length;
  return {x, y};
}

/**
 * @description
 * 目のランドマークを使い、顔画像を基準テンプレートへ位置合わせします。
 *
 * 両目を結ぶ線が水平になり、両目の中点がテンプレートの目標位置へ移動し、目と目の
 * 距離が指定した出力距離と一致するように、回転・拡大縮小・移動を正規化します。
 *
 * これにより、異なる2つの顔をスライダーや合成表示で比較しやすくします。
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
 * 画像ファイルから顔のランドマークを検出し、テンプレートへ位置合わせしたCanvasを返します。
 *
 * 処理の流れ：
 * 1. 必要に応じてface-api.jsのモデルを読み込みます。
 * 2. 選択されたファイルを画像へ変換します。
 * 3. 1つの顔と68点のランドマークを検出します。
 * 4. 顔を基準テンプレートへ位置合わせします。
 *
 * 顔を検出できなかった場合は`null`を返します。
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
 * スライダー描画用に、ランドマークで位置を揃えた2つの顔画像を準備します。
 *
 * 単純な切り抜き方式とは異なり、目のランドマークを使って回転・大きさ・位置を
 * 正規化してからPNG形式のData URLを生成します。2つの出力画像は同じ基準Canvasの
 * 大きさになります。
 *
 * 検出または位置合わせに失敗した場合は`null`を返します。
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
