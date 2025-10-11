import {
  prepareFacesForSliderAligned
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
  menuOverlay.classList.add('active');
  hamburgerBtn.classList.add('is-open');
  hamburgerBtn.setAttribute('aria-expanded', 'true');
  document.body.classList.add('menu-open'); // 背景スクロール禁止
}
function closeMenu(){
  sideMenu.classList.remove('open');
  menuOverlay.classList.remove('active');
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

// ★ ウィザード要素
const guideText = document.getElementById('guide-text');
const nextBtn1 = document.getElementById('next-btn-1'); // Before → After へ
const nextBtn2 = document.getElementById('next-btn-2'); // After → 顔モード選択へ
const nextBtn3 = document.getElementById('next-btn-3'); // 顔モード選択 → 比較開始待ちへ
const startBtn = document.getElementById('start-compare-btn'); // 比較開始

// ステップ管理
// 1: Before選択待ち
// 2: Before選択済（Nextで3へ）
// 3: After選択待ち
// 4: After選択済（Nextで5へ）
// 5: 顔モード選択中（Nextで6へ）
// 6: 比較開始待ち（Startで表示）
let currentStep = 1;

// 比較開始まで自動表示しないためのフラグ
let allowRender = false;

// ステップに応じたUI更新
function updateWizardUI(){
  // 初期化
  if (nextBtn1) nextBtn1.style.display = 'none';
  if (nextBtn2) nextBtn2.style.display = 'none';
  if (nextBtn3) nextBtn3.style.display = 'none';
  if (startBtn) startBtn.disabled = true;

  switch(currentStep){
    case 1:
      setGuide('wizard.step.selectBefore', 'ビフォー画像を選択してください');
      break;
    case 2:
      setGuide('wizard.step.beforeChoosing', '現在ビフォー画像を選択しています');
      if (nextBtn1) {
        nextBtn1.style.display = 'inline-flex';
        nextBtn1.disabled = !beforeFileRef;
      }
      break;
    case 3:
      setGuide('wizard.step.selectAfter', 'アフター画像を選択してください');
      break;
    case 4:
      setGuide('wizard.step.afterChosen', 'アフター画像を選択しました。「次へ」で顔モード選択へ');
      if (nextBtn2) {
        nextBtn2.style.display = 'inline-flex';
        nextBtn2.disabled = !afterFileRef;
      }
      break;
    case 5:
      setGuide('wizard.step.faceToggle', '顔だけ比較モードのON/OFFを選択してください');
      if (nextBtn3) nextBtn3.style.display = 'inline-flex';
      break;
    case 6:
      setGuide('wizard.step.ready', '準備完了。「比較を開始」を押してください');
      if (startBtn) startBtn.disabled = !(beforeFileRef && afterFileRef);
      break;
  }
}

function setGuide(key, fallback){
  if (guideText){
    guideText.setAttribute('data-i18n', key);
    guideText.textContent = fallback; // i18n 適用前でも見えるように

    if (window.appI18n) {
      const translated = window.appI18n.getText(key);
      if (translated) {
        window.appI18n.renderText(guideText, translated);
      }
    }
  }
}

let beforeLoaded = false, afterLoaded = false;

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

  const halfImg = document.getElementById('half-face-img');
  const halfWrap = document.getElementById('half-face-result');
  if (halfImg) halfImg.src = '';
  if (halfWrap) halfWrap.style.display = 'none';
  
  beforeLoaded = false;
  afterLoaded = false;
  faceError.style.display = 'none';
}

// ★ Resetの拡張：状態も初期化
let beforeFileRef = null;
let afterFileRef = null;

function resetAll() {
  allowRender = false;
  beforeFileRef = null; afterFileRef = null;
  beforeLoaded = false; afterLoaded = false;
  currentStep = 1;
  resetSlider();
  updateWizardUI();
}

// リスナーを resetAll に差し替え
if (resetBtn){
  // 念のため既存の匿名ハンドラがあっても上書き動作に
  resetBtn.replaceWith(resetBtn.cloneNode(true));
}
const _resetBtn = document.getElementById('reset-btn');
if (_resetBtn){
  _resetBtn.addEventListener('click', resetAll);
}

// ファイルアップロード共通（上で宣言済みの beforeFileRef/afterFileRef を使用）

// ファイル選択：即比較せず、プレビューのみ＆ステップ遷移
function handleImageWizard(input, imgEl, which) {
  input.addEventListener('change', async (e) => {
    faceError.style.display = 'none';
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => { imgEl.src = ev.target.result; };

    if (which === 'before') {
      beforeFileRef = file;
      beforeLoaded = true;
      reader.readAsDataURL(file);
      currentStep = 2; // Before 選択済
    } else {
      afterFileRef = file;
      afterLoaded = true;
      reader.readAsDataURL(file);
      currentStep = 4; // After 選択済
    }
    updateWizardUI();
  });
}

// 顔モードのON/OFF切替（ウィザード用：Step5で選択 → Nextで比較開始）
faceCheckbox.addEventListener('change', async () => {
  faceError.style.display = 'none';
  // 顔モードは Step5 で選択 → Next で Step6 へ進む想定。ここでは描画しない。
  if (currentStep < 5) {
    currentStep = 5;
  }
  updateWizardUI();
});


handleImageWizard(beforeInput, imgBefore, 'before');
handleImageWizard(afterInput, imgAfter, 'after');
// --- ウィザードの Next/Start 制御 ---
if (nextBtn1){
  nextBtn1.addEventListener('click', () => {
    if (!beforeFileRef) return;
    currentStep = 3; // After選択へ
    updateWizardUI();
  });
}
if (nextBtn2){
  nextBtn2.addEventListener('click', () => {
    if (!afterFileRef) return;
    currentStep = 5; // 顔モード選択へ
    updateWizardUI();
  });
}
if (nextBtn3){
  nextBtn3.addEventListener('click', () => {
    currentStep = 6; // 比較開始待ち
    updateWizardUI();
  });
}
if (startBtn){
  startBtn.addEventListener('click', async () => {
    if (!(beforeFileRef && afterFileRef)) return;
    allowRender = true;

    try {
      if (faceCheckbox.checked) {
        faceLoading.style.display = 'block';
        const faces = await prepareFacesForSliderAligned(beforeFileRef, afterFileRef, 420, 520);
        faceLoading.style.display = 'none';
        if (faces) {
          imgBefore.src = faces.before;
          imgAfter.src = faces.after;
        } else {
          faceError.style.display = 'block';
        }
      }
    } catch (e) {
      faceLoading.style.display = 'none';
      console.error(e);
      faceError.style.display = 'block';
    }

    // 表示（通常 or 顔モード後）
    sliderContainer.style.display = 'block';
    const halfWrap = document.getElementById('half-face-result');
    if (halfWrap) halfWrap.style.display = 'none';

    overlayDiv.style.width = '50%';
    sliderHandle.style.left = '50%';
    setTimeout(() => {
      const y = sliderContainer.getBoundingClientRect().top + window.scrollY - 90;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }, 0);
  });
}

// 初期描画
updateWizardUI();

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
  overlayDiv.style.width = (100 - percent) + '%';
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
  overlayDiv.style.width = (100 - percent) + '%';
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

      // wizard
      'wizard.step.selectBefore': 'Select your BEFORE image to get started.',
      'wizard.step.beforeChoosing': 'Your BEFORE image is selected. Proceed when ready.',
      'wizard.step.selectAfter': 'Select your AFTER image next.',
      'wizard.step.afterChosen': 'AFTER image ready. Continue to the face-only option.',
      'wizard.step.faceToggle': 'Choose whether to enable face-only comparison.',
      'wizard.step.ready': 'All set! Press “Start Comparison” to view the result.',
      'wizard.next': 'Next',
      'wizard.start': 'Start Comparison',
      'wizard.hint.reset': 'Use reset if you want to run the comparison again.',

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

      // wizard
      'wizard.step.selectBefore': 'ビフォー画像を選択してください。',
      'wizard.step.beforeChoosing': 'ビフォー画像を選択しました。準備ができたら進んでください。',
      'wizard.step.selectAfter': '次にアフター画像を選択してください。',
      'wizard.step.afterChosen': 'アフター画像の選択が完了しました。顔モードの選択へ進みましょう。',
      'wizard.step.faceToggle': '顔だけ比較モードを使うか選択してください。',
      'wizard.step.ready': '準備完了です。「比較を開始」を押してください。',
      'wizard.next': '次へ',
      'wizard.start': '比較を開始',
      'wizard.hint.reset': 'もう一度比較する場合はリセットボタンを押してください。',

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
    function applyI18n(lang, scope) {
      const dict = DICT[lang] || {};
      const nodes = [];

      if (scope && scope !== document) {
        if (scope.getAttribute && scope.hasAttribute('data-i18n')) {
          nodes.push(scope);
        }
        if (scope.querySelectorAll) {
          const scoped = scope.querySelectorAll('[data-i18n]');
          for (let i = 0; i < scoped.length; i++) {
            nodes.push(scoped[i]);
          }
        }
      } else {
        const all = document.querySelectorAll('[data-i18n]');
        for (let i = 0; i < all.length; i++) {
          nodes.push(all[i]);
        }
      }

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

  // Expose lightweight helper so other scripts can reuse translations
  window.appI18n = {
    apply: function(lang, scope){
      applyI18n(typeof lang === 'string' ? lang : currentLang, scope);
    },
    refresh: function(scope){
      applyI18n(currentLang, scope);
    },
    getCurrentLang: function(){
      return currentLang;
    },
    getText: function(key){
      const dict = DICT[currentLang] || {};
      const txt = dict[key];
      return (typeof txt === 'string') ? txt : null;
    },
    renderText: renderText
  };
  window.faceDebugLog = function(label, payload){
  const box = document.getElementById('face-debug');
  if (!box) return;
  const time = new Date().toLocaleTimeString();
  const line = document.createElement('div');
  line.textContent = `[${time}] ${label}: ${JSON.stringify(payload)}`;
  box.prepend(line);
  while (box.childElementCount > 30) box.removeChild(box.lastChild);
};

})();
