/**
 * =====================================================
 * 顔画像処理ユーティリティモジュール
 * （MediaPipe Face Landmarker / Canvas 処理）
 * =====================================================
 *
 * @description
 * 画像比較スライダーで再利用する、顔検出および画像処理用のユーティリティを提供します。
 *
 * MediaPipe Face Landmarker の初期化、アップロード画像を描画可能な画像への変換、
 * 顔ランドマークの検出、共通テンプレートへの顔位置合わせ、スライダー UI 用 Data URL の
 * 生成を行います。
 *
 * 顔検出と Canvas 処理をこのモジュールに分離することで、compare.js はユーザー操作と
 * UI 状態の管理に専念できます。
 *
 * @module FaceUtils
 */


import {
  FilesetResolver,
  FaceLandmarker
} from "@mediapipe/tasks-vision";

/** MediaPipe の WebAssembly 関連ファイルを配置したパスです。 */
const MEDIAPIPE_WASM_PATH = '/mediapipe/wasm';
/** Face Landmarker モデルファイルのパスです。 */
const FACE_LANDMARKER_MODEL_PATH =
  '/models/face_landmarker.task';

/** 初期化済みの Face Landmarker インスタンスを保持します。 */
let faceLandmarker = null;
/** Face Landmarker の初期化処理中に共有する Promise を保持します。 */
let faceLandmarkerPromise = null;

/**
 * MediaPipe Face Landmarker を初期化し、結果をキャッシュします。
 *
 * 同時に複数回呼び出された場合でも、進行中の初期化処理を共有します。
 *
 * @returns {Promise<FaceLandmarker>} 初期化済みの Face Landmarker インスタンス。
 * @throws {Error} MediaPipe の初期化またはモデルの読み込みに失敗した場合。
 */
export async function loadMediaPipeFaceLandmarker(){

  if(faceLandmarker){
    return faceLandmarker;
  }

  if (faceLandmarkerPromise) {
    return faceLandmarkerPromise;
  }

  faceLandmarkerPromise = (async () => {

    const vision = await FilesetResolver.forVisionTasks(
      MEDIAPIPE_WASM_PATH
    );

    const instance = await FaceLandmarker.createFromOptions(
      vision,
      {
        baseOptions: {
          modelAssetPath: FACE_LANDMARKER_MODEL_PATH,
          delegate: 'CPU'
        },
        runningMode: 'IMAGE',
        numFaces: 1,
        minFaceDetectionConfidence: 0.5,
        minFacePresenceConfidence: 0.5,
        outputFaceBlendshapes: false,
        outputFacialTransformationMatrixes: false
      }
    );

    faceLandmarker = instance;
    return faceLandmarker;
  })();

  try {
    return await faceLandmarkerPromise;
  } catch (error) {
    faceLandmarkerPromise = null;
    throw error;
  }
}

/**
 * @description
 * ユーザーが選択した画像ファイルを、読み込み済みのHTMLImageElementへ変換します。
 *
 * FileReaderでファイルをData URLとして読み込み、新しいImageオブジェクトへ設定します。
 * 画像の読み込みが完了してからPromiseを解決します。
 *
 * @param {File} file - 読み込む画像ファイル。
 * @returns {Promise<HTMLImageElement>} 読み込み済みの画像要素。
 * @throws {TypeError} 有効な画像ファイル以外が指定された場合。
 * @example
 * const img = await loadImageFromFile(file);
 */
export function loadImageFromFile(file) {
  if (!(file instanceof File) || !file.type.startsWith('image/')) {
    return Promise.reject(
      new TypeError('A valid image file is required.')
    );
  }
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
 * MediaPipe の正規化済みランドマークを、face-api.js 風のランドマークオブジェクトへ変換します。
 *
 * このアダプターにより、compare.js を変更せずに既存の位置合わせ処理を再利用できます。
 *
 * @param {Array<{x: number, y: number}>} landmarks - MediaPipe が返す顔のランドマーク群。
 * @param {number} width - 元画像の幅です。
 * @param {number} height - 元画像の高さです。
 * @returns {{getLeftEye: () => Array<{x: number, y: number}>, getRightEye: () => Array<{x: number, y: number}>}} 左右の目の座標を取得できるオブジェクト。
 * @throws {Error} 顔の位置合わせに必要な数のランドマークがない場合。
 */
function convertMediaPipeLandmarks(landmarks, width, height) {
  if (!Array.isArray(landmarks) || landmarks.length < 388) {
    throw new Error('MediaPipe returned insufficient face landmarks.');
  }

  const points = landmarks.map(point => ({
    x: point.x * width,
    y: point.y * height
  }));


  return {

    getLeftEye(){

      return [
        points[33],
        points[160],
        points[158],
        points[133],
        points[153],
        points[144]
      ];
    },

    getRightEye(){

      return [
        points[362],
        points[385],
        points[387],
        points[263],
        points[373],
        points[380]
      ];
    }
  };
}

/**
 * @description
 * 顔のランドマーク群の中心座標を計算します。
 *
 * 左目または右目の領域にある全ランドマーク座標の平均を取り、目の中心を求めます。
 *
 * @param {Array<{x: number, y: number}>} pts - 目を構成するランドマーク座標の配列。
 * @returns {{x: number, y: number}} 目の中心座標。
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
 * @param {CanvasImageSource} img - 位置合わせの対象となる画像。
 * @param {{getLeftEye: () => Array<{x: number, y: number}>, getRightEye: () => Array<{x: number, y: number}>}} landmarks - 左右の目のランドマークを取得するオブジェクト。
 * @param {number} [outW=420] - 出力する Canvas の幅。
 * @param {number} [outH=520] - 出力する Canvas の高さ。
 * @param {number} [eyeY=0.38] - 出力 Canvas の高さに対する目の中心位置の比率。
 * @param {number} [eyeDist=0.42 * outW] - 出力 Canvas 上における両目の目標距離。
 * @returns {HTMLCanvasElement} 位置合わせ済みの顔画像を描画した Canvas。
 *
 * @example
 * const alignedCanvas = alignFaceToTemplate(
 *   img,
 *   convertedLandmarks
 * );
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
 * 画像ファイルから顔を検出し、基準テンプレートへ位置合わせした Canvas を生成します。
 *
 * 顔を検出できない場合は `null` を返します。
 *
 * @param {File} file - 顔を検出する画像ファイル。
 * @param {number} [targetW=420] - 出力 Canvas の幅。
 * @param {number} [targetH=520] - 出力 Canvas の高さ。
 * @returns {Promise<HTMLCanvasElement|null>} 位置合わせ済みの Canvas、または顔を検出できない場合は `null`。
 * @throws {Error} MediaPipe の初期化、画像の読み込み、またはランドマークの変換に失敗した場合。
 */
export async function getAlignedFaceCanvasFromFile(
  file,
  targetW = 420,
  targetH = 520
){

  const landmarker = await loadMediaPipeFaceLandmarker();
  const img = await loadImageFromFile(file);

  const result = landmarker.detect(img);


  if (!result.faceLandmarks?.length) {
    return null;
  }


  const landmarks = convertMediaPipeLandmarks(
    result.faceLandmarks[0],
    img.naturalWidth || img.width,
    img.naturalHeight || img.height
  );


  return alignFaceToTemplate(
    img,
    landmarks,
    targetW,
    targetH
  );
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
 * @param {File} beforeFile - 比較前の顔画像ファイル。
 * @param {File} afterFile - 比較後の顔画像ファイル。
 * @param {number} [outW=420] - 出力画像の幅。
 * @param {number} [outH=520] - 出力画像の高さ。
 * @returns {Promise<{before: string, after: string, w: number, h: number}|null>} PNG 形式の Data URL と出力サイズを含むオブジェクト、または処理できない場合は `null`。
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
