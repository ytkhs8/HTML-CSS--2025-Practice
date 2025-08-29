import {
  FACE_MODEL_PATH,
  TINY_OPTS,
  loadFaceApiModels,
  prepareFacesForSlider,
  composeHalfFace
} from './faceUtils.js';

// --- ハンバーガーメニュー＆SPAページ切替 ---
const hamburger = document.getElementById('hamburger-btn');
const sideMenu = document.getElementById('side-menu');
const overlay = document.getElementById('menu-overlay');
const pages = document.querySelectorAll('.page');

hamburger.addEventListener('click', () => {
  sideMenu.classList.toggle('open');
  overlay.classList.toggle('active');
});

overlay.addEventListener('click', () => {
  sideMenu.classList.remove('open');
  overlay.classList.remove('active');
});

sideMenu.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    const pageId = link.dataset.page;
    document.querySelector('.page.active').classList.remove('active');
    document.getElementById(pageId).classList.add('active');
    sideMenu.classList.remove('open');
    overlay.classList.remove('active');
    window.scrollTo(0, 0);
  });
});

// --- SPAトップに戻る ---
document.querySelector('.app-title').addEventListener('click', () => {
  document.querySelectorAll('.page').forEach(pg => pg.classList.remove('active'));
  document.getElementById('home').classList.add('active');
  window.scrollTo(0, 0);
});

// --- 画像比較スライダー機能（バニラJS）---
const beforeInput = document.getElementById('before-img');
const afterInput = document.getElementById('after-img');
const imgBefore = document.getElementById('img-before');
const imgAfter = document.getElementById('img-after');
const overlayDiv = document.querySelector('.img-overlay');
const sliderHandle = document.getElementById('slider-handle');
const sliderContainer = document.getElementById('slider-container');
const resetBtn = document.getElementById('reset-btn');
const faceCheckbox = document.getElementById('face-only');
const faceLoading = document.getElementById('face-loading');
const faceError = document.getElementById('face-error');


let beforeLoaded = false, afterLoaded = false;

// face-api モデル初回ロードフラグ
let faceApiReady = false;

// ファイルinputと画像表示リセット
function resetSlider() {
  beforeInput.value = '';
  afterInput.value = '';
  imgBefore.src = '';
  imgAfter.src = '';
  beforeFileRef = null;
  afterFileRef = null;

  overlayDiv.style.width = '50%';
  sliderHandle.style.left = '50%';
  sliderContainer.style.display = 'none';

  document.getElementById('half-face-img').src = '';
  document.getElementById('half-face-result').style.display = 'none';

  beforeLoaded = false;
  afterLoaded = false;
  faceError.style.display = 'none';
}
resetBtn.addEventListener('click', resetSlider);


// 顔検出で顔だけ切り出してDataURL化
async function extractFace(file) {
  await loadFaceApiModels();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async function (ev) {
      const img = new Image();
      img.onload = async function () {
        // 画像をcanvasに描画
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        // 顔検出
        const det = await faceapi.detectSingleFace(canvas, TINY_OPTS);
        if (!det) {
          resolve(null);
          return;
        }
        // 顔矩形でトリミング
        const {x, y, width, height} = det.box;
        const faceCanvas = document.createElement('canvas');
        faceCanvas.width = width;
        faceCanvas.height = height;
        const faceCtx = faceCanvas.getContext('2d');
        faceCtx.drawImage(img, x, y, width, height, 0, 0, width, height);
        resolve(faceCanvas.toDataURL());
      };
      img.onerror = () => resolve(null);
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// 画像FileをImageに読み込むPromise
function loadImageFromFile(file) {
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

// 画像と検出結果から顔矩形を切り抜いたCanvasを返す
function cropFaceToCanvas(img, box, targetWidth = 400) {
  const sx = Math.max(0, box.x);
  const sy = Math.max(0, box.y);
  const sw = Math.min(img.width - sx, box.width);
  const sh = Math.min(img.height - sy, box.height);

  // 出力は等幅で整える（高さは比率維持）
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

// ファイルから顔切り抜きCanvasを生成（TinyFaceDetectorを使用）
async function getFaceCanvasFromFile(file, targetWidth = 400) {
  await loadFaceApiModels();
  const img = await loadImageFromFile(file);

  // 元画像を一旦キャンバス化（検出のため）
  const tmp = document.createElement('canvas');
  tmp.width = img.width;
  tmp.height = img.height;
  tmp.getContext('2d').drawImage(img, 0, 0);

  const det = await faceapi.detectSingleFace(tmp, TINY_OPTS);
  if (!det) {
    console.warn('[face detection] no face detected');
  }
  if (!det) return null;
  return cropFaceToCanvas(img, det.box, targetWidth);
  
}


// ファイルアップロード共通
let beforeFileRef = null;
let afterFileRef = null;

function handleImage(input, imgEl, flagName) {
  input.addEventListener('change', async e => {
    faceError.style.display = 'none';
    const file = e.target.files[0];
    if (!file) return;

    // 参照を保持
    if (flagName === 'before') beforeFileRef = file;
    if (flagName === 'after') afterFileRef = file;

    // 顔モードOFF → 通常プレビュー
    if (!faceCheckbox.checked) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        imgEl.src = ev.target.result;
        if (flagName === 'before') beforeLoaded = true;
        if (flagName === 'after') afterLoaded = true;
        if (beforeLoaded && afterLoaded) {
          // スライダー表示、半顔結果は非表示
          sliderContainer.style.display = 'block';
          document.getElementById('half-face-result').style.display = 'none';
        }
      };
      reader.readAsDataURL(file);
      return;
    }

    // 顔モード ON：両方そろってから顔トリミング2枚をスライダーへ
    if (beforeFileRef && afterFileRef) {
      try {
        faceLoading.style.display = 'block';
        const faces = await prepareFacesForSlider(beforeFileRef, afterFileRef, 420);
        faceLoading.style.display = 'none';

        if (faces) {
          imgBefore.src = faces.before;
          imgAfter.src = faces.after;

          overlayDiv.style.width = '50%';
          sliderHandle.style.left = '50%';

          sliderContainer.style.display = 'block';
          document.getElementById('half-face-result').style.display = 'none';

          // 表示位置へスクロール
          setTimeout(() => {
            const y = sliderContainer.getBoundingClientRect().top + window.scrollY - 90;
            window.scrollTo({ top: y, behavior: 'smooth' });
          }, 0);
        } else {
          faceError.style.display = 'block';
          // 失敗時は通常スライダーへフォールバック
        }
      } catch (err) {
        faceLoading.style.display = 'none';
        console.error(err);
        faceError.style.display = 'block';
      }
    } else {
      // 片方のみ選択時の暫定プレビュー
      const reader = new FileReader();
      reader.onload = ev => { imgEl.src = ev.target.result; };
      reader.readAsDataURL(file);
    }
  });
}

// 顔モードのON/OFF切替（既に2枚あれば即時反映）
faceCheckbox.addEventListener('change', async () => {
  faceError.style.display = 'none';
  if (faceCheckbox.checked && beforeFileRef && afterFileRef) {
    faceLoading.style.display = 'block';
    const faces = await prepareFacesForSliderAligned(beforeFileRef, afterFileRef, 420, 520);
    faceLoading.style.display = 'none';
    if (faces) {
      imgBefore.src = faces.before;
      imgAfter.src = faces.after;
      overlayDiv.style.width = '50%';
      sliderHandle.style.left = '50%';
      sliderContainer.style.display = 'block';
      document.getElementById('half-face-result').style.display = 'none';
      setTimeout(() => {
        const y = sliderContainer.getBoundingClientRect().top + window.scrollY - 90;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }, 0);
      return;
    }
    faceError.style.display = 'block';
  }

  // OFF：通常スライダー表示へ
  if (!faceCheckbox.checked && beforeLoaded && afterLoaded) {
    document.getElementById('half-face-result').style.display = 'none';
    sliderContainer.style.display = 'block';
  }
});


handleImage(beforeInput, imgBefore, 'before');
handleImage(afterInput, imgAfter, 'after');

// スライダーの動作
const compareSlider = document.querySelector('.compare-slider');
let isDragging = false;

sliderHandle.addEventListener('mousedown', (e) => {
  isDragging = true;
  document.body.style.cursor = 'ew-resize';
});
window.addEventListener('mouseup', () => {
  isDragging = false;
  document.body.style.cursor = '';
});
window.addEventListener('mousemove', (e) => {
  if (!isDragging) return;
  const rect = compareSlider.getBoundingClientRect();
  let offsetX = e.clientX - rect.left;
  offsetX = Math.max(0, Math.min(offsetX, rect.width));
  const percent = offsetX / rect.width * 100;
  overlayDiv.style.width = percent + '%';
  sliderHandle.style.left = percent + '%';
});

// タッチ操作にも対応
sliderHandle.addEventListener('touchstart', () => {
  isDragging = true;
});
window.addEventListener('touchend', () => {
  isDragging = false;
});
window.addEventListener('touchmove', (e) => {
  if (!isDragging) return;
  const touch = e.touches[0];
  const rect = compareSlider.getBoundingClientRect();
  let offsetX = touch.clientX - rect.left;
  offsetX = Math.max(0, Math.min(offsetX, rect.width));
  const percent = offsetX / rect.width * 100;
  overlayDiv.style.width = percent + '%';
  sliderHandle.style.left = percent + '%';
});

// --- フォーム送信ダミー
const contactForm = document.getElementById('contact-form');
if (contactForm){
  contactForm.addEventListener('submit', function(e){
    e.preventDefault();
    document.getElementById('contact-success').style.display = 'block';
    contactForm.reset();
    setTimeout(() => {
      document.getElementById('contact-success').style.display = 'none';
    }, 3000);
  });
}