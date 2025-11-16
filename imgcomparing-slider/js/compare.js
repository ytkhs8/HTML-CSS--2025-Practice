import {
  prepareFacesForSliderAligned
} from './faceUtils.js';

// --- ハンバーガーメニュー＆SPAページ切替 ---
// 要素参照
const hamburgerBtn = document.getElementById('hamburger-btn');
const sideMenu = document.getElementById('side-menu');
const menuOverlay = document.getElementById('menu-overlay');

/**
 * Opens the side navigation menu.
 *
 * - Adds classes to show the slide-in side menu and dark overlay.
 * - Updates the hamburger button to the 'open' (X) state.
 * - Sets `aria-expanded="true"` for accessibility/screen readers.
 * - Locks body scrolling while the menu is open.
 *
 * @returns {void}
 */
// --- ハンバーガーメニュー開閉（アクセシブル & スクロールロック） ---
function openMenu(){
  sideMenu.classList.add('open');
  menuOverlay.classList.add('active');
  hamburgerBtn.classList.add('is-open');
  hamburgerBtn.setAttribute('aria-expanded', 'true');
  document.body.classList.add('menu-open'); // 背景スクロール禁止
}
/**
 * Closes the side navigation menu.
 *
 * Reverts all changes made by `openMenu()`:
 * - Hides the menu and overlay.
 * - Restores the hamburger button visual state.
 * - Sets `aria-expanded="false"`.
 * - Re-enables page scrolling.
 *
 * @returns {void}
 */
function closeMenu(){
  sideMenu.classList.remove('open');
  menuOverlay.classList.remove('active');
  hamburgerBtn.classList.remove('is-open');
  hamburgerBtn.setAttribute('aria-expanded', 'false');
  document.body.classList.remove('menu-open'); // 背景スクロール解除
}
/**
 * Toggles the side navigation menu between open and closed states.
 * If the menu is currently open, it will be closed. Otherwise, it opens.
 *
 * @returns {void}
 */
function toggleMenu(){
  if (sideMenu.classList.contains('open')) closeMenu();
  else openMenu();
}

/**
 * Handle click on the hamburger button.
 * Toggles the side navigation menu open/closed.
 *
 * This uses optional chaining so that if the hamburger button
 * does not exist on the current page, no error is thrown.
 */
// クリックで開閉
hamburgerBtn?.addEventListener('click', toggleMenu);

/**
 * Handle click on the dark overlay behind the side menu.
 * Clicking outside the menu will close it.
 */
// オーバーレイをクリックで閉じる
menuOverlay?.addEventListener('click', closeMenu);

/**
 * Handle navigation clicks inside the side menu (SPA behavior).
 *
 * - Prevents default <a> navigation (no full page reload).
 * - Reads data-page from the clicked link.
 * - Hides the currently active <section class="page"> and shows the target one.
 * - Scrolls to top.
 * - Closes the side menu afterward.
 *
 * @param {MouseEvent} e
 */
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

/**
 * Global keydown handler.
 * If Escape is pressed while the side menu is open,
 * the menu will be closed. Matches common modal UX patterns.
 *
 * @param {KeyboardEvent} e
 */
// ESCキーで閉じる
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && sideMenu.classList.contains('open')) {
    closeMenu();
  }
});

/**
 * Clicking the app title (header title) always returns the UI
 * to the 'home' page section. Clears any other active section.
 * Also scrolls the viewport back to the top.
 */
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

/**
 * ===============================
 *  Image Comparison Wizard Logic
 * ===============================
 * 
 * This section controls the step-by-step workflow for users:
 * 1. Select BEFORE image
 * 2. Select AFTER image
 * 3. Choose whether to enable "face-only" mode
 * 4. Start comparison
 * 
 * It dynamically updates guide texts, buttons, and step transitions.
 */

/**
 * Current wizard step number.
 * 
 * 1: Waiting for Before image selection
 * 2: Before selected
 * 3: Waiting for After image selection
 * 4: After selected
 * 5: Face-only mode selection
 * 6: Ready to start comparison
 * 
 * @type {number}
 */
// ステップ管理
// 1: Before選択待ち
// 2: Before選択済（Nextで3へ）
// 3: After選択待ち
// 4: After選択済（Nextで5へ）
// 5: 顔モード選択中（Nextで6へ）
// 6: 比較開始待ち（Startで表示）
let currentStep = 1;

/**
 * Flag to control whether comparison rendering is allowed.
 * Becomes true only after user presses "Start Comparison".
 * 
 * @type {boolean}
 */
// 比較開始まで自動表示しないためのフラグ
let allowRender = false;

/**
 * Update UI components according to the current wizard step.
 * - Shows/hides navigation buttons (`Next`, `Start`)
 * - Updates localized guide messages
 * - Enables/disables buttons based on loaded images
 * 
 * @returns {void}
 */
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

/**
 * Set the localized guide text inside the wizard area.
 * Automatically applies translation via `window.appI18n` if available.
 * 
 * @param {string} key - i18n dictionary key (e.g., "wizard.step.selectBefore")
 * @param {string} fallback - Text shown before translation (default visible text)
 * @returns {void}
 */
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

/**
 * Indicates whether the BEFORE and AFTER images are fully loaded.
 * Used to control step transitions and button states.
 * 
 * @type {boolean}
 */
let beforeLoaded = false, afterLoaded = false;


/**
 * Flag indicating whether the face-api.js models are loaded.
 * Prevents premature face-only comparisons before initialization.
 * 
 * @type {boolean}
 */
// face-api モデル初回ロードフラグ
let faceApiReady = false;

/**
 * Reset only the visual parts of the comparison slider.
 * Clears image sources, resets overlay position, hides containers,
 * and restores initial display state.
 * 
 * This does NOT reset the overall wizard step or file references.
 *
 * @returns {void}
 */
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

// ==== Preload (face-only) cache & helpers ==================================

/**
 * Face-only precomputed result cache.
 * If available, Startボタン押下時に即時描画に使う。
 * @type {{before: string, after: string} | null}
 */
let precomputedFaces = null;

/**
 * Incrementing token to cancel stale preloads when files or options change.
 * @type {number}
 */
let preloadingId = 0;

/**
 * Clear any in-flight preload and cached result.
 * Also hides face-loading indicator for safety.
 * @returns {void}
 */
function clearPreload() {
  precomputedFaces = null;
  preloadingId++; // invalidate all in-flight tasks
  if (faceLoading) faceLoading.style.display = 'none';
}

/**
 * Whether we can run face-only preloading now.
 * @returns {boolean}
 */
function canPreloadFaces() {
  return !!(beforeFileRef && afterFileRef && faceCheckbox && faceCheckbox.checked);
}

/**
 * Preload face-aligned images in background.
 * If a newer change happens (files/checkbox), this run is abandoned by token.
 * @returns {Promise<void>}
 */
async function preloadFacesIfPossible() {
  if (!canPreloadFaces()) return;

  const token = ++preloadingId;
  try {
    faceLoading.style.display = 'block';
    const faces = await prepareFacesForSliderAligned(beforeFileRef, afterFileRef, 420, 520);
    // Abandon if a newer change occurred
    if (token !== preloadingId) return;

    if (faces) {
      precomputedFaces = faces; // cache for Start
    } else {
      precomputedFaces = null;
      // ここではエラー表示は出さず、Start時に通常比較へフォールバック
    }
  } catch (err) {
    // サイレント失敗（Start時に通常処理へフォールバック）
    precomputedFaces = null;
    // console.error(err);
  } finally {
    if (token === preloadingId) {
      faceLoading.style.display = 'none';
    }
  }
}

/**
 * Complete reset of all wizard state, image references, and UI.
 * 
 * This is called when the user clicks the "Reset" button.
 * It ensures the application returns to its initial (step 1) state,
 * ready for a new comparison workflow.
 *
 * @returns {void}
 */
function resetAll() {
  clearPreload(); // プリロード＆キャッシュの完全クリア

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
/**
 * Handle a file input change for the wizard flow:
 * - Stores the selected file (before/after)
 * - Generates a preview into the provided <img> element
 * - Advances the wizard step and refreshes the guide/buttons
 *
 * Note: This function does NOT start the comparison rendering.
 *       Rendering is triggered only when the user presses "Start".
 *
 * @param {HTMLInputElement} input - <input type="file"> element to bind on.
 * @param {HTMLImageElement} imgEl - Target <img> element to show a preview.
 * @param {'before'|'after'} which - Which slot this input corresponds to.
 * @returns {void}
 *
 * @example
 * handleImageWizard(beforeInput, imgBefore, 'before');
 * handleImageWizard(afterInput,  imgAfter,  'after');
 */
// ファイル選択：即比較せず、プレビューのみ＆ステップ遷移
function handleImageWizard(input, imgEl, which) {
  input.addEventListener('change', async (e) => {
    faceError.style.display = 'none';
    /** @type {File|null} */
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    clearPreload();

    // if (!file.type.startsWith('image/')) { faceError.textContent = 'Invalid file type'; faceError.style.display = 'block'; return; }
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

    // 両方の画像が揃っていて、顔モードがONなら裏で先行計算
    if (canPreloadFaces()) {
      // Afterを選んだ直後が最も自然だが、Before選択後にAfterが既にあっても動く
      preloadFacesIfPossible();
    }
  });
}

/**
 * Face-only mode toggle handler for the wizard.
 * - Clears any previous face-detection error message.
 * - Ensures the wizard is at step 5 (face-mode selection).
 * - DOES NOT start rendering here; rendering happens after "Start".
 *
 * @listens HTMLInputElement#change
 * @returns {void}
 */
// 顔モードのON/OFF切替（ウィザード用：Step5で選択 → Nextで比較開始）
faceCheckbox.addEventListener('change', async () => {
  faceError.style.display = 'none';

  // モード切替時は過去の結果を破棄
  clearPreload();

  // Move to the face-mode selection step if not yet reached.
  // 顔モードは Step5 で選択 → Next で Step6 へ進む想定。ここでは描画しない。
  if (currentStep < 5) {
    currentStep = 5;
  }
  updateWizardUI();

  // ON かつ 両画像ありなら、ここで裏プリロード開始
  if (canPreloadFaces()) {
    preloadFacesIfPossible();
  }
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
        // 1) 事前計算があれば即適用
        if (precomputedFaces) {
          imgBefore.src = precomputedFaces.before;
          imgAfter.src = precomputedFaces.after;
        } else {
          // 2) なければ従来通りここで推論を実行（フォールバック）
          faceLoading.style.display = 'block';
          const faces = await prepareFacesForSliderAligned(beforeFileRef, afterFileRef, 420, 520);
          faceLoading.style.display = 'none';
          if (faces) {
            imgBefore.src = faces.before;
            imgAfter.src = faces.after;
            // 今後のStart（再実行）に備えてキャッシュしておく
            precomputedFaces = faces;
          } else {
            faceError.style.display = 'block';
          }
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

// スライダーの動作（Pointer Events + rAF + キーボード対応）
const compareSlider = document.querySelector('.compare-slider');

// 現在のスライダー位置（0〜100％）
let sliderPercent = 50;
// ドラッグ中かどうか
let sliderDragging = false;
// スライダー領域の位置と幅（ドラッグ開始時に取得）
let sliderRect = null;
// requestAnimationFrame用フラグ（1フレームに描画1回に抑える）
let sliderRafPending = false;

/**
 * Updates the visual state of the slider (handle position and overlay width).
 * All DOM writes are batched inside requestAnimationFrame for smoother rendering.
 *
 * @returns {void}
 */
function updateSliderDom() {
  sliderRafPending = false;
  overlayDiv.style.width = (100 - sliderPercent) + '%';
  sliderHandle.style.left = sliderPercent + '%';
}

/**
 * Schedules a DOM update for the slider on the next animation frame.
 * This prevents redundant layout/paint work for every pointer event.
 *
 * @returns {void}
 */
function scheduleSliderUpdate() {
  if (sliderRafPending) return;
  sliderRafPending = true;
  requestAnimationFrame(updateSliderDom);
}

/**
 * Converts a clientX coordinate into a 0–100 percentage
 * relative to the left edge of the slider track.
 *
 * @param {number} clientX - The pointer’s client X coordinate.
 * @returns {number} Percentage position in the range [0, 100].
 */
function clientXToPercent(clientX) {
  if (!sliderRect) return sliderPercent;
  const rawX = clientX - sliderRect.left;
  const clamped = Math.max(0, Math.min(rawX, sliderRect.width));
  return (clamped / sliderRect.width) * 100;
}

/**
 * Common cleanup logic when dragging ends.
 * Resets the dragging flag and restores the default cursor.
 *
 * @returns {void}
 */
function endSliderDrag() {
  if (!sliderDragging) return;
  sliderDragging = false;
  document.body.style.cursor = '';
}

/**
 * Pointer down handler on the slider handle (mouse/touch/pen).
 * Starts dragging and captures the pointer so subsequent moves
 * are reliably delivered to the handle.
 *
 * @param {PointerEvent} e
 * @returns {void}
 */
sliderHandle.addEventListener('pointerdown', (e) => {
  // マウスの場合は左クリックのみ受け付ける
  if (e.pointerType === 'mouse' && e.button !== 0) return;

  sliderDragging = true;
  sliderRect = compareSlider.getBoundingClientRect();
  document.body.style.cursor = 'ew-resize';

  // ドラッグ中はハンドルがすべてのpointermoveを受け取る
  if (sliderHandle.setPointerCapture) {
    sliderHandle.setPointerCapture(e.pointerId);
  }

  // クリックした場所にハンドルを即時移動
  sliderPercent = clientXToPercent(e.clientX);
  scheduleSliderUpdate();

  e.preventDefault();
});

/**
 * Pointer move handler while dragging.
 * Updates the slider percentage based on the current pointer position.
 *
 * @param {PointerEvent} e
 * @returns {void}
 */
window.addEventListener('pointermove', (e) => {
  if (!sliderDragging) return;
  sliderPercent = clientXToPercent(e.clientX);
  // 0〜100％にクランプ
  if (sliderPercent < 0) sliderPercent = 0;
  if (sliderPercent > 100) sliderPercent = 100;
  scheduleSliderUpdate();
});

/**
 * Finishes dragging on pointerup / pointercancel events.
 *
 * @returns {void}
 */
window.addEventListener('pointerup', endSliderDrag);
window.addEventListener('pointercancel', endSliderDrag);

/**
 * Keyboard interaction for the slider handle.
 * ArrowLeft / ArrowRight move the handle by ±5%.
 *
 * @param {KeyboardEvent} e
 * @returns {void}
 */
sliderHandle.setAttribute('tabindex', '0');
sliderHandle.setAttribute('role', 'slider');
sliderHandle.setAttribute('aria-valuemin', '0');
sliderHandle.setAttribute('aria-valuemax', '100');
sliderHandle.setAttribute('aria-valuenow', String(Math.round(sliderPercent)));

sliderHandle.addEventListener('keydown', (e) => {
  let delta = 0;
  if (e.key === 'ArrowLeft') delta = -5;
  else if (e.key === 'ArrowRight') delta = 5;
  else return;

  sliderPercent += delta;
  if (sliderPercent < 0) sliderPercent = 0;
  if (sliderPercent > 100) sliderPercent = 100;

  sliderHandle.setAttribute('aria-valuenow', String(Math.round(sliderPercent)));
  scheduleSliderUpdate();
  e.preventDefault();
});

// 初期位置（50％）を描画
scheduleSliderUpdate();

/**
 * Initializes the dummy submit behavior for the contact form.
 *
 * When the user submits the form:
 * - Prevents the default browser submission (no page reload).
 * - Shows a temporary “success” message.
 * - Resets all form fields to their initial (empty) state.
 * - Hides the success message again after 3 seconds.
 *
 * This is intended as a front-end only mock and does not
 * send any data to a back-end server.
 *
 * @returns {void}
 */
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
      'menu.materials': 'Comparison Samples',
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

      // materials
      'materials.title': 'Ready-to-use Comparison Samples',
      'materials.lead': 'We prepared before/after samples across different themes so you can try the comparison slider right away.',
      'materials.category.landscape': 'Landscapes',
      'materials.landscape.city.title': 'Shibuya: Then and Now',
      'materials.landscape.city.before': 'Present-day Shibuya Station area',
      'materials.landscape.city.after': 'Shibuya Station area in the past',
      'materials.landscape.lifestyle.title': 'Daily Life: Modern vs Past',
      'materials.landscape.lifestyle.before': 'Contemporary lifestyle',
      'materials.landscape.lifestyle.after': 'Lifestyle in earlier days',
      'materials.landscape.resolution.title': 'Silicon Valley vs Tokyo cityscape',
      'materials.landscape.town.before': 'Silicon Valley, USA',
      'materials.landscape.town.after': 'Tokyo, Japan',
      'materials.category.objects': 'Objects',
      'materials.objects.iphone.title': 'iPhone 3G vs iPhone 16 Pro design',
      'materials.objects.iphone.before': 'iPhone 3G exterior',
      'materials.objects.iphone.after': 'iPhone 16 Pro exterior',
      'materials.objects.shirt.title': 'Oxford shirt vs open-collar shirt',
      'materials.objects.shirt.oxford': 'Oxford shirt',
      'materials.objects.shirt.opencollar': 'Open-collar shirt',
      'materials.objects.chameleon.title': 'Chameleon colour transitions',
      'materials.objects.chameleon.before': 'Green chameleon',
      'materials.objects.chameleon.after': 'Vividly coloured chameleon',
      'materials.category.people': 'People',
      'materials.people.diet.title': 'Fitness journey before & after',
      'materials.people.diet.before': 'Before weight loss',
      'materials.people.diet.after': 'After weight loss',
      'materials.people.growth.title': 'Childhood vs adulthood',
      'materials.people.growth.before': 'At age seven',
      'materials.people.growth.after': 'At age twenty',
      'materials.people.cosplay.title': 'Everyday self vs Halloween cosplay',
      'materials.people.cosplay.before': 'Everyday outfit',
      'materials.people.cosplay.after': 'Halloween cosplay look',
      'materials.category.faces': 'Faces',
      'materials.face.season.title': 'Winter and Summer faces contrast',
      'materials.face.season.winter': 'Dried winter face',
      'materials.face.season.summer': ' Sun-tunned summer face',
      'materials.face.makeup.title': 'Makeup transformation',
      'materials.face.makeup.before': 'Bare face',
      'materials.face.makeup.after': 'With makeup',
      'materials.face.age.title': 'Same person: childhood vs adulthood',
      'materials.face.age.before': 'Face at age three',
      'materials.face.age.after': 'Face at age twenty-two',
      'materials.category.results': 'Outcomes',
      'materials.result.cleaning.title': 'Remodeling before & after',
      'materials.result.cleaning.before': 'Before remodeling',
      'materials.result.cleaning.after': 'After remodeling',
      'materials.result.learning.title': 'Learning outcome comparison',
      'materials.result.learning.before': 'Work before studying',
      'materials.result.learning.after': 'Work after studying',
      'materials.result.clothing.title': 'Removing stains from clothing',
      'materials.result.clothing.before': 'Garment with stains',
      'materials.result.clothing.after': 'Garment after washing',

      // info
      'info.title': 'Guide & Notes',
      'info.format': 'Supported formats: JPEG, PNG, WebP',
      'info.size': 'Recommended size: Longest edge within 2000px',
      'info.storage': 'Uploaded images are not stored on the server',
      'info.usage': 'We do not misuse or redistribute your images',
      'info.contact': 'For issues or requests, use "Requests & Bug Reports"',

      // about
      'about.title': 'About the Developer',
      'about.desc': 'Yuuki, a Tokyo-based junior engineer, created this project as part of his learning journey. He is exploring various web technologies including Java, Spring Boot, and JavaScript, and shares his work as a portfolio.',
      'about.howto': 'Use Cases',
      'about.howto.desc': 'This image comparison slider is useful for comparing landscapes, objects, people, faces, and outcomes.',

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
      'menu.materials': '比較用使用素材',
      'menu.info': '利用案内・注意事項',
      'menu.about': '開発者・当サイト紹介',
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

      // materials
      'materials.title': '比較用使用素材',
      'materials.lead': '当サイトの画像比較スライダーをお試しいただくため、用途別のビフォー／アフター素材をご用意しました。ぜひご活用ください。',
      'materials.category.landscape': '風景画',
      'materials.landscape.city.title': '現在と昔の渋谷の変貌',
      'materials.landscape.city.before': '現在の渋谷駅周辺',
      'materials.landscape.city.after': '昔の渋谷駅周辺',
      'materials.landscape.lifestyle.title': '現在と昔の人々の暮らしの違い',
      'materials.landscape.lifestyle.before': '現代の暮らし',
      'materials.landscape.lifestyle.after': '昔の暮らし',
      'materials.landscape.resolution.title': 'アメリカのシリコンバレーと東京の街並みの対比',
      'materials.landscape.town.before': 'アメリカのシリコンバレー',
      'materials.landscape.town.after': '日本の東京',
      'materials.category.objects': '対象物',
      'materials.objects.iphone.title': 'iPhone3GとiPhone16 Proの外観の対比',
      'materials.objects.iphone.before': 'iPhone3Gの外観',
      'materials.objects.iphone.after': 'iPhone16 Proの外観',
      'materials.objects.shirt.title': 'オックスフォードシャツとオープンカラーシャツの対比',
      'materials.objects.shirt.oxford': 'オックスフォードシャツ',
      'materials.objects.shirt.opencollar': 'オープンカラーシャツ',
      'materials.objects.chameleon.title': 'カメレオンの体の色の変化',
      'materials.objects.chameleon.before': '緑色のカメレオン',
      'materials.objects.chameleon.after': '鮮やかな色のカメレオン',
      'materials.category.people': '人物像',
      'materials.people.diet.title': 'ダイエット前とダイエット後の姿の対比',
      'materials.people.diet.before': 'ダイエット前の姿',
      'materials.people.diet.after': 'ダイエット後の姿',
      'materials.people.growth.title': '子どもの成長前後の比較',
      'materials.people.growth.before': '７歳の頃',
      'materials.people.growth.after': '２０歳の頃',
      'materials.people.cosplay.title': '普段の自分とハロウィンのコスプレをした自分の対比',
      'materials.people.cosplay.before': '普段着の自分',
      'materials.people.cosplay.after': 'ハロウィンのコスプレ',
      'materials.category.faces': '人物の顔',
      'materials.face.season.title': '冬季と夏季の顔の対比',
      'materials.face.season.winter': '冬季の乾燥した顔',
      'materials.face.season.summer': '夏季の日焼けした顔',
      'materials.face.makeup.title': 'メイク前後の自分の顔の比較',
      'materials.face.makeup.before': 'すっぴん',
      'materials.face.makeup.after': 'メイク時',
      'materials.face.age.title': '幼少期と成人の同一人物の顔の対比',
      'materials.face.age.before': '３歳の顔',
      'materials.face.age.after': '２２歳の頃',
      'materials.category.results': '成果物',
      'materials.result.cleaning.title': '改装をした箇所のビフォーアフター',
      'materials.result.cleaning.before': '改装前の状態',
      'materials.result.cleaning.after': '改装後の状態',
      'materials.result.learning.title': '学習前後の成果物の対比',
      'materials.result.learning.before': '学習前の作品',
      'materials.result.learning.after': '学習後の作品',
      'materials.result.clothing.title': '洋服の汚れ落としのビフォーアフター',
      'materials.result.clothing.before': '汚れの付いた洋服',
      'materials.result.clothing.after': '汚れを落とした洋服',

      // info
      'info.title': '利用案内・注意事項',
      'info.format': '対応画像フォーマット：JPEG, PNG, WebP',
      'info.size': '推奨サイズ：長辺2000px以内',
      'info.storage': 'アップロードされた画像はサーバに保存されません',
      'info.usage': '画像の悪用・転載は一切行いません',
      'info.contact': '不具合・ご要望は「要望・バグ報告」よりご連絡ください',

      // about
      'about.title': '開発者について',
      'about.desc': '東京都在住の駆け出しエンジニアYuukiが、学習の一環で制作しています。JavaやSpringBoot、JavaScriptなど幅広くWeb技術を学び、ポートフォリオとして公開中です。',
      'about.howto': '用途概要',
      'about.howto.desc': 'この画像比較スライダーは主に風景画・対象物・人物像・人物の顔・成果物の比較を行いたい際に役立ちます。',
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

    // 言語を切り替えるたびに現在の言語に合わせて更新する
      const toggle = document.getElementById('lang-toggle');
      if (toggle){
        const next = (lang === 'en') ? '🇯🇵' : '🇬🇧';
        toggle.textContent = next;
        toggle.setAttribute(
          'aria-label',
          lang === 'en' ? '日本語に切り替える' : 'Switch to English'
        );
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

  // クリックされた時に現在の言語が英語なら日本語へ、日本語なら英語へ切り替えて　allplyi18n()を呼ぶ処理登録
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

// ===== Materials Accordion (accessible + animated) =====
(function initMaterialsAccordion(){
  const root = document.querySelector('#materials');
  if (!root) return;

  const toggles = root.querySelectorAll('.acc-toggle');

  const setOpen = (btn, open) => {
    const content = btn.nextElementSibling;
    if (!content || !content.classList.contains('acc-content')) return;

    if (open) {
      btn.setAttribute('aria-expanded', 'true');
      // 高さを測ってから開く
      content.classList.remove('open');
      content.style.height = content.scrollHeight + 'px';
      const onEnd = () => {
        content.classList.add('open');
        content.style.height = 'auto';
        content.removeEventListener('transitionend', onEnd);
      };
      content.addEventListener('transitionend', onEnd);
    } else {
      btn.setAttribute('aria-expanded', 'false');
      // 一度現在の高さを固定してから0へ
      content.classList.remove('open');
      const h = content.scrollHeight;
      content.style.height = h + 'px';
      requestAnimationFrame(() => { content.style.height = '0px'; });
    }
  };

  const closeAllExcept = (btn) => {
    toggles.forEach(other => {
      if (other === btn) return;
      if (other.getAttribute('aria-expanded') === 'true') setOpen(other, false);
    });
  };

  // 初期化（開いているセクションはauto、閉じているセクションは0）
  toggles.forEach(btn => {
    const content = btn.nextElementSibling;
    if (!content || !content.classList.contains('acc-content')) return;

    if (btn.getAttribute('aria-expanded') === 'true') {
      content.classList.add('open');
      content.style.height = 'auto';
    } else {
      content.style.height = '0px';
    }

    // クリックで開閉
    btn.addEventListener('click', () => {
      const isOpen = btn.getAttribute('aria-expanded') === 'true';
      if (!isOpen) closeAllExcept(btn);
      setOpen(btn, !isOpen);
    });

    // キーボード操作 Enter / Space でもトグル
    btn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        btn.click();
      }
    });
  });
})();

// ===== i18n連携：data-i18n を使う見出しは既存の適用処理に乗る想定 =====
// もし i18n 再適用関数があるなら、その中で .acc-toggle > span[data-i18n] も更新されます。
// 追加のコードは不要。

// ===== Lightbox (A: contain thumbnails + C: enlarge & save) =====
(function initLightbox(){
  const materialsRoot = document.getElementById('materials');
  if (!materialsRoot) return;

  const overlay = document.getElementById('lightbox');
  const imgEl   = document.getElementById('lightbox-img');
  const dlLink  = document.getElementById('lightbox-download');
  const openBtn = document.getElementById('lightbox-open');
  const closeBtn= document.getElementById('lightbox-close');

  if (!overlay || !imgEl || !dlLink || !openBtn || !closeBtn) return;

  let currentList = [];   // NodeList of IMG in current grid
  let currentIndex = -1;  // index within currentList

  const setDownloadLink = (src) => {
    try {
      const url = new URL(src, location.href);
      const file = (url.pathname.split('/').pop() || 'image').split('?')[0] || 'image';
      dlLink.href = url.href;
      dlLink.setAttribute('download', file);
    } catch {
      dlLink.href = src;
      dlLink.setAttribute('download', 'image');
    }
  };

  const openAt = (idx) => {
    if (!currentList.length) return;
    currentIndex = Math.max(0, Math.min(idx, currentList.length - 1));
    const node = currentList[currentIndex];
    if (!node) return;
    const src = node.getAttribute('src');
    const alt = node.getAttribute('alt') || '';
    imgEl.src = src;
    imgEl.alt = alt;
    setDownloadLink(src);
    overlay.classList.add('open');
    overlay.removeAttribute('hidden');
    document.body.style.overflow = 'hidden';
    closeBtn.focus();
  };

  const close = () => {
    overlay.classList.remove('open');
    overlay.setAttribute('hidden', 'true');
    imgEl.removeAttribute('src');
    document.body.style.overflow = '';
    currentList = [];
    currentIndex = -1;
  };

  const openFromThumb = (thumb) => {
    // gather siblings within same materials-grid
    const grid = thumb.closest('.materials-grid');
    if (!grid) return;
    currentList = Array.from(grid.querySelectorAll('.material-set img'));
    const idx = currentList.indexOf(thumb);
    openAt(idx >= 0 ? idx : 0);
  };

  // Delegated click on thumbnails inside materials
  materialsRoot.addEventListener('click', (e) => {
    const t = e.target;
    if (t && t.tagName === 'IMG' && t.closest('.material-set')) {
      e.preventDefault();
      openFromThumb(t);
    }
  });

  // Close behaviors
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  closeBtn.addEventListener('click', close);

  // Open in new tab
  openBtn.addEventListener('click', () => { if (imgEl.src) window.open(imgEl.src, '_blank', 'noopener'); });

  // Keyboard controls inside lightbox
  window.addEventListener('keydown', (e) => {
    if (!overlay.classList.contains('open')) return;
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      if (currentList.length) openAt((currentIndex - 1 + currentList.length) % currentList.length);
    }
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      if (currentList.length) openAt((currentIndex + 1) % currentList.length);
    }
  });
})();
