import {
  FACE_MODEL_PATH,
  TINY_OPTS,
  loadFaceApiModels,
  prepareFacesForSlider,
  composeHalfFace
} from './faceUtils.js';

// --- ハンバーガーメニュー＆SPAページ切替 ---
// 要素参照
const hamburgerBtn = document.getElementById('hamburger-btn');
const sideMenu = document.getElementById('side-menu');
const menuOverlay = document.getElementById('menu-overlay');
const pages = document.querySelectorAll('.page');

// --- ハンバーガーメニュー開閉（アクセシブル & スクロールロック） ---
function openMenu(){
  sideMenu.classList.add('open');
  menuOverlay.classList.add('show');
  hamburgerBtn.classList.add('is-open');
  hamburgerBtn.setAttribute('aria-expanded', 'true');
  document.body.classList.add('menu-open'); // 背景スクロール禁止
}
function closeMenu(){
  sideMenu.classList.remove('open');
  menuOverlay.classList.remove('show');
  hamburgerBtn.classList.remove('is-open');
  hamburgerBtn.setAttribute('aria-expanded', 'false');
  document.body.classList.remove('menu-open'); // 背景スクロール解除
}
function toggleMenu(){
  if (sideMenu.classList.contains('open')) closeMenu();
  else openMenu();
}

// クリックで開閉
hamburgerBtn?.addEventListener('click', toggleMenu);

// オーバーレイをクリックで閉じる
menuOverlay?.addEventListener('click', closeMenu);

// サイドメニューのリンクでページ切替して閉じる（SPA）
sideMenu?.addEventListener('click', (e) => {
  const link = e.target.closest('a');
  if (!link) return;

  e.preventDefault();
  const pageId = link.dataset.page;
  if (pageId) {
    document.querySelector('.page.active')?.classList.remove('active');
    document.getElementById(pageId)?.classList.add('active');
    window.scrollTo(0, 0);
  }
  closeMenu();
});

// ESCキーで閉じる
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && sideMenu.classList.contains('open')) {
    closeMenu();
  }
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

// ==== Internationalization (default EN + JP toggle with persistence) ====
(function(){
  const DICT = {
    en: {
      // header & menu
      'header.title': 'Image Compare Slider',
      'menu.gallery': 'Gallery',
      'menu.info': 'Guide & Notes',
      'menu.about': 'About the Developer',
      'menu.contact': 'Requests & Bug Reports',

      // home
      'home.title': 'Image Compare Slider',
      'upload.before': 'Choose Before Image',
      'upload.after': 'Choose After Image',
      'face.only': 'Face-only comparison (detect, align, and compare faces)',
      'btn.reset': 'Reset',
      'caption.halfface': 'Left: Before / Right: After',
      'msg.loading': 'Loading face detection models…',
      'msg.noFace': 'No face detected. Falling back to normal comparison.',

      // gallery
      'gallery.title': 'Gallery',
      'gallery.desc': 'Showcasing previous comparison examples.',

      // info
      'info.title': 'Guide & Notes',
      'info.format': 'Supported formats: JPEG, PNG, WebP',
      'info.size': 'Recommended size: Longest edge within 2000px',
      'info.storage': 'Uploaded images are not stored on the server',
      'info.usage': 'We do not misuse or redistribute your images',
      'info.contact': 'For issues or requests, use "Requests & Bug Reports"',

      // about
      'about.title': 'About the Developer',
      'about.desc': 'Yuuki, a Tokyo-based junior engineer, built this as part of learning.\nExploring web tech including Java and React, and publishing as a portfolio.',

      // contact
      'contact.title': 'Requests & Bug Reports',
      'contact.name': 'Name (optional)',
      'contact.message': 'Message',
      'contact.submit': 'Send',
      'contact.success': 'Thank you for your feedback!'
    },
    ja: {
      // header & menu
      'header.title': '画像比較スライダー',
      'menu.gallery': 'ギャラリー',
      'menu.info': '利用案内・注意事項',
      'menu.about': '開発者紹介',
      'menu.contact': '要望・バグ報告',

      // home
      'home.title': '画像比較スライダー',
      'upload.before': 'ビフォー画像を選択',
      'upload.after': 'アフター画像を選択',
      'face.only': '顔だけ比較（顔を検出・整列して比較）',
      'btn.reset': 'リセット',
      'caption.halfface': '左：Before / 右：After',
      'msg.loading': '顔検出モデル読み込み中…',
      'msg.noFace': '顔が見つかりませんでした。通常比較になります。',

      // gallery
      'gallery.title': 'ギャラリー',
      'gallery.desc': '過去の比較例を掲載します。',

      // info
      'info.title': '利用案内・注意事項',
      'info.format': '対応画像フォーマット：JPEG, PNG, WebP',
      'info.size': '推奨サイズ：長辺2000px以内',
      'info.storage': 'アップロードされた画像はサーバに保存されません',
      'info.usage': '画像の悪用・転載は一切行いません',
      'info.contact': '不具合・ご要望は「要望・バグ報告」よりご連絡ください',

      // about
      'about.title': '開発者について',
      'about.desc': '東京都在住の駆け出しエンジニアYuukiが、学習の一環で制作しています。\nJavaやReactなど幅広くWeb技術を学び、ポートフォリオとして公開中です。',

      // contact
      'contact.title': '要望・バグ報告',
      'contact.name': 'お名前（任意）',
      'contact.message': '内容',
      'contact.submit': '送信',
      'contact.success': 'ご意見ありがとうございます！'
    }
  };


    // 現在の言語（永続化）
    let currentLang = (function(){
      try {
        return localStorage.getItem('lang') || 'en'; }
        catch(e){ return 'en'; }
      })();

    // テキスト反映（XSS安全・改行OK）
    function renderText(node, str) {
      if (!node || typeof str !== 'string') return;
      if (str.indexOf('\n') >= 0) {
        const safe = str.split('\n').map(function (s) {
          return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        }).join('<br>');
        node.innerHTML = safe;
        } else {
          node.textContent = str;
        }
    }

    // 子要素（input/textarea等）を壊さない i18n 適用
    function applyI18n(lang) {
      const dict = DICT[lang] || {};
      const nodes = document.querySelectorAll('[data-i18n]');
      for (let i = 0; i < nodes.length; i++) {
        const el = nodes[i];
        const key = el.getAttribute('data-i18n');
        const txt = dict[key];
        if (typeof txt !== 'string') continue;

        let target = null;

        // 1) 自身が i18n スロット
        if (el.classList && el.classList.contains('i18n-text')) {
          target = el;
        } else {
          // 2) 子に .i18n-text がある
          const span = el.querySelector ? el.querySelector('.i18n-text') : null;
          if (span) {
            target = span;
          } else {
            // 3) フォーム部品を含む → 先頭に .i18n-text を作る
            const hasFormChild = el.querySelector ? el.querySelector('input, textarea, select, button') : null;
            if (hasFormChild) {
              const head = document.createElement('span');
              head.className = 'i18n-text';
              if (el.firstChild) el.insertBefore(head, el.firstChild);
              else el.appendChild(head);
              target = head;
            } else {
              // 4) 純テキスト要素
              target = el;
            }
          }
        }
        renderText(target, txt);
      }

      // html lang属性
      document.documentElement.setAttribute('lang', lang);

    // トグルのラベルを反転
      const toggle = document.getElementById('lang-toggle');
      if (toggle){
        const next = (lang === 'en') ? 'JP' : 'EN';
        toggle.textContent = next;
        toggle.setAttribute('aria-label', lang === 'en' ? '日本語に切り替える' : 'Switch to English');
    }

    // 永続化
    try { localStorage.setItem('lang', lang); } catch(e){}
    currentLang = lang;
  }

  // 初期適用
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function(){ applyI18n(currentLang); });
  } else {
    applyI18n(currentLang);
  }

  // トグルボタン
  const toggleBtn = document.getElementById('lang-toggle');
  if (toggleBtn){
    toggleBtn.addEventListener('click', function(){
      const next = (currentLang === 'en') ? 'ja' : 'en';
      applyI18n(next);
    });
  }
})();