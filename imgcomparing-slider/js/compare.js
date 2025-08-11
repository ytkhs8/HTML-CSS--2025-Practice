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

// face-api モデルパス
const FACE_MODEL_PATH = 'https://cdn.jsdelivr.net/npm/face-api.js/models';

// face-api モデル初回ロードフラグ
let faceApiReady = false;

// ファイルinputと画像表示リセット
function resetSlider() {
  beforeInput.value = '';
  afterInput.value = '';
  imgBefore.src = '';
  imgAfter.src = '';
  overlayDiv.style.width = '50%';
  sliderHandle.style.left = '50%';
  sliderContainer.style.display = 'none';
  beforeLoaded = false;
  afterLoaded = false;
  faceError.style.display = 'none';
}
resetBtn.addEventListener('click', resetSlider);

// face-api.js 初期化
async function loadFaceApiModels() {
  if (faceApiReady) return;
  faceLoading.style.display = 'block';
  await faceapi.nets.tinyFaceDetector.loadFromUri(FACE_MODEL_PATH);
  faceApiReady = true;
  faceLoading.style.display = 'none';
}

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
        const det = await faceapi.detectSingleFace(canvas, new faceapi.TinyFaceDetectorOptions());
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

// ファイルアップロード共通

function handleImage(input, imgEl, flagName) {
  input.addEventListener('change', async e => {
    faceError.style.display = 'none';
    const file = e.target.files[0];
    if (file) {
      if (faceCheckbox.checked) {
        faceLoading.style.display = 'block';
        const faceDataUrl = await extractFace(file);
        faceLoading.style.display = 'none';
        if (faceDataUrl) {
          imgEl.src = faceDataUrl;
        } else {
          faceError.style.display = 'block';
          // 顔検出失敗時は通常比較
          const reader = new FileReader();
          reader.onload = (ev) => imgEl.src = ev.target.result;
          reader.readAsDataURL(file);
        }
      } else {
        // 通常比較
        const reader = new FileReader();
        reader.onload = (ev) => imgEl.src = ev.target.result;
        reader.readAsDataURL(file);
      }
        if (flagName === 'before') beforeLoaded = true;
        if (flagName === 'after') afterLoaded = true;
        if (beforeLoaded && afterLoaded) {
          sliderContainer.style.display = 'block';
        }
    }
  });
}
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