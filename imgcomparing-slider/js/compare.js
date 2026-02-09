import {
  prepareFacesForSliderAligned
} from './faceUtils.js';

// --- ハンバーガーメニュー＆SPAページ切替 ---
// 要素参照
const hamburgerBtn = document.getElementById('hamburger-btn');
const sideMenu = document.getElementById('side-menu');
const menuOverlay = document.getElementById('menu-overlay');

// --- Language dropdown (disable while side menu is open) ---
function setLangDropdownEnabled(enabled) {
  const dropdown = document.getElementById('lang-dropdown');
  const btn = document.getElementById('lang-menu-btn');
  const menu = document.getElementById('lang-menu');

  if (dropdown) dropdown.classList.toggle('is-disabled', !enabled);

  if (btn) {
    // Use both semantic + visual disabling
    if (enabled) {
      btn.removeAttribute('aria-disabled');
      btn.disabled = false;
    } else {
      btn.setAttribute('aria-disabled', 'true');
      btn.disabled = true;
      // Also force the dropdown closed when disabling
      btn.setAttribute('aria-expanded', 'false');
    }
  }

  // Force close when disabling (popover-based)
  if (!enabled && typeof window.__closeLangMenu === 'function') {
    window.__closeLangMenu();
  } else if (!enabled && menu && typeof menu.hidePopover === 'function') {
    try { menu.hidePopover(); } catch (_) {}
  }
}

/**
 * Language dropdown click behavior (Popover API manual mode):
 * - click to toggle
 * - click outside to close
 * - ESC to close
 * - close after selecting a language
 */
function initLangDropdownClick() {
  const dropdown = document.getElementById('lang-dropdown');
  const btn = document.getElementById('lang-menu-btn');
  const menu = document.getElementById('lang-menu');
  if (!dropdown || !btn || !menu) return;

  const isOpen = () => {
    try { return menu.matches(':popover-open'); } catch { return false; }
  };

  const toggle = () => (isOpen() ? close() : open());

  /**
   * Positions the language menu popover directly under the dropdown button.
   *
   * Why this is needed:
   * - Elements using the Popover API are promoted to the browser's top layer.
   * - Once promoted, CSS `position: absolute` can no longer anchor to `.lang-dropdown`.
   *
   * Strategy:
   * - Read the button's viewport coordinates via `getBoundingClientRect()`.
   * - Apply `position: fixed` + `left/top` to the menu so it always appears under the button.
   * - Clamp the horizontal position so the menu stays within the viewport.
   *
   * @returns {void}
   */
  const positionMenu = () => {
    try {
      const r = btn.getBoundingClientRect();
      // Ensure we can measure the popover's width.
      const mw = menu.getBoundingClientRect().width || 224;
      const gap = 8;

      // Right-align the menu with the button.
      let left = r.right - mw;
      const top = r.bottom + gap;

      // Keep within viewport (small screens)
      const padding = 8;
      left = Math.max(padding, Math.min(left, window.innerWidth - mw - padding));

      menu.style.position = 'fixed';
      menu.style.left = left + 'px';
      menu.style.top = top + 'px';
      menu.style.margin = '0';
      menu.style.zIndex = '4000';
    } catch (_) {}
  };

  /**
   * Repositions the popover only when it is currently open.
   *
   * This keeps the menu visually anchored under the button during scroll/resize,
   * especially when the header layout can move.
   *
   * @returns {void}
   */
  const repositionIfOpen = () => {
    if (!isOpen()) return;
    positionMenu();
  };

  /**
   * Opens the language menu popover.
   *
   * Notes:
   * - Opens first, then positions on the next animation frame so the popover width
   *   is measurable (layout is ready).
   * - Updates `aria-expanded` for accessibility.
   *
   * @returns {void}
   */
  const open = () => {
    if (btn.disabled) return;
    try { menu.showPopover(); } catch {}
    btn.setAttribute('aria-expanded', 'true');
    requestAnimationFrame(() => {
      positionMenu();
    });
  };

  /**
   * Closes the language menu popover and resets transient inline positioning.
   *
   * We clean up inline styles so the closed-state appearance remains driven by CSS
   * and we avoid stale coordinates across future opens.
   *
   * @returns {void}
   */
  const close = () => {
    try { menu.hidePopover(); } catch {}
    btn.setAttribute('aria-expanded', 'false');
    // Cleanup inline positioning so CSS can remain the source of truth when closed.
    menu.style.left = '';
    menu.style.top = '';
    menu.style.position = '';
    menu.style.margin = '';
    menu.style.zIndex = '';
  };

  /**
   * Exposes a close function for other UI flows (e.g., hamburger menu modal).
   *
   * Some parts of the app may need to force-close the language menu
   * (for example, when opening the side menu overlay).
   *
   * @type {() => void}
   */
  window.__closeLangMenu = close;

  /**
   * Toggles the language menu on pointer interaction.
   *
   * We use `pointerdown` to align with the global outside-close handler
   * (also `pointerdown`), preventing timing mismatches between click and pointer events.
   *
   * @listens HTMLButtonElement#pointerdown
   */
  btn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggle();
  });

  /**
   * Returns true if an event originated from inside the dropdown.
   *
   * Uses `composedPath()` when available to be robust with Shadow DOM / top-layer
   * behaviors, then falls back to `contains()`.
   *
   * @param {Event} ev
   * @returns {boolean}
   */
  const isEventInsideDropdown = (ev) => {
    try {
      const path = (typeof ev.composedPath === 'function') ? ev.composedPath() : null;
      if (path && path.indexOf(dropdown) >= 0) return true;
    } catch (_) {}
    return dropdown.contains(ev.target);
  };

  /**
   * Prevents click events inside the dropdown from bubbling to global handlers.
   * This avoids accidental immediate close when other parts of the page listen globally.
   *
   * @listens HTMLElement#click
   */
  dropdown.addEventListener('click', (e) => e.stopPropagation());

  /**
   * Closes the menu when the user interacts outside of the dropdown.
   *
   * Implemented with `pointerdown` (instead of `click`) to be reliable across
   * mouse/touch and to close promptly.
   *
   * @listens Document#pointerdown
   */
  document.addEventListener('pointerdown', (e) => {
    // Only react when menu is open
    if (!isOpen()) return;
    if (dropdown.contains(e.target)) return;
    close();
  });

  /**
   * Keeps the popover anchored under the button while the page scrolls/resizes.
   *
   * We listen in the capture phase for scroll so it also works when nested
   * scroll containers are involved.
   */
  window.addEventListener('scroll', repositionIfOpen, true);
  window.addEventListener('resize', repositionIfOpen);

  /**
   * Closes the menu when the user presses the Escape key.
   *
   * @listens Document#keydown
   */
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen()) close();
  });

  /**
   * Prevents pointer events inside the menu from triggering the outside-close handler.
   *
   * @listens HTMLElement#pointerdown
   */
  menu.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
  });

  /**
   * Closes the menu after the user selects a language.
   *
   * The actual language switching (`applyI18n`) is handled elsewhere; this handler
   * only ensures the menu closes after a selection.
   */
  menu.querySelectorAll('.lang-item[data-lang]').forEach((item) => {
    item.addEventListener('click', () => close());
  });

  /**
   * Ensures the dropdown starts in a closed state on initialization.
   */
  close();

}

  document.addEventListener('DOMContentLoaded', () => {
    initLangDropdownClick();
  });

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
  setLangDropdownEnabled(false);
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
  setLangDropdownEnabled(true);
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
    const target = document.getElementById(pageId);
    target?.classList.add('active');

    // Re-apply i18n to the newly activated page (includes placeholders).
    if (window.appI18n && typeof window.appI18n.refresh === 'function' && target) {
      window.appI18n.refresh(target);
    }

    window.scrollTo(0, 0);
  }
  closeMenu();
});

/**
 * Global Escape key handler.
 *
 * Priority order:
 * 1) If the side menu is open, close it.
 * 2) Otherwise, if the language dropdown is open, close it.
 *
 * Keeping this as a single handler avoids competing Escape listeners.
 *
 * @param {KeyboardEvent} e
 */
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;

  // 1) Close side menu first (modal priority)
  if (sideMenu.classList.contains('open')) {
    closeMenu();
    return;
  }

  // 2) Close language dropdown if open
  const menu = document.getElementById('lang-menu');
  if (!menu) return;

  const isPopoverOpen = !!menu.matches?.(':popover-open');
  const isLegacyOpen = !menu.hasAttribute('hidden');
  const isOpen = isPopoverOpen || isLegacyOpen;

  if (!isOpen) return;

  e.preventDefault();

  if (typeof window.__closeLangMenu === 'function') {
    window.__closeLangMenu();
    return;
  }

  // Fallback: close via Popover API if available
  if (typeof menu.hidePopover === 'function') {
    try { menu.hidePopover(); } catch (_) {}
  }

  // Legacy fallback
  menu.setAttribute('hidden', 'true');
  const btn = document.getElementById('lang-menu-btn');
  if (btn) btn.setAttribute('aria-expanded', 'false');
});

/**
 * Clicking the app title (header title) always returns the UI
 * to the 'home' page section. Clears any other active section.
 * Also scrolls the viewport back to the top.
 */
// --- SPAトップに戻る ---
const appTitle = document.querySelector('.app-title');
if (appTitle) {
  appTitle.addEventListener('click', () => {
    document.querySelectorAll('.page').forEach(pg => pg.classList.remove('active'));
    document.getElementById('home')?.classList.add('active');
    window.scrollTo(0, 0);
  });
}

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
  // Clamp to [0, 100] range
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

// ==== Internationalization (default EN + JP dropdown with persistence) ====
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
      
      // privacy
      'privacy.title': 'Privacy Policy',
      'privacy.intro': 'This site collects information only to the extent necessary to provide its services.',

      'privacy.section.purpose': '1. Purpose of Use',
      'privacy.purpose.item1': 'Providing the image comparison feature',
      'privacy.purpose.item2': 'Improving the service and preventing misuse',

      'privacy.section.storage': '2. Storage and Deletion',
      'privacy.storage.item1': 'Images are used temporarily for comparison and deleted promptly after processing.',
      'privacy.storage.item2': 'No images are stored on the server.',

      'privacy.section.thirdparty': '3. Third-Party Disclosure',
      'privacy.thirdparty.item1': 'Information will not be provided to third parties except as required by law.',

      'privacy.section.external': '4. External Services',
      'privacy.external.item1': 'External services such as CDNs may be used.',
      'privacy.external.item2': 'Image processing is performed locally in the user’s browser using face-api.js.',

      'privacy.section.contact': '5. Contact',
      'privacy.contact.item1': 'For privacy-related inquiries, please contact us via the feedback form.',

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
      'contact.success': 'Thank you for your feedback!',
      'contact.placeholder.name': 'Your name',
      'contact.placeholder.message': 'Describe your request or bug here'
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

      // privacy
      'privacy.title': 'プライバシーポリシー',
      'privacy.intro': '当サイトは、サービス提供に必要な範囲で情報を取得します。',

      'privacy.section.purpose': '1. 利用目的',
      'privacy.purpose.item1': '画像比較機能の提供',
      'privacy.purpose.item2': 'サービス改善・不正利用の防止',

      'privacy.section.storage': '2. 保存・削除',
      'privacy.storage.item1': '画像は比較処理のために一時的に利用し、処理後は速やかに削除します。',
      'privacy.storage.item2': 'サーバには一切保存されません。',

      'privacy.section.thirdparty': '3. 第三者提供',
      'privacy.thirdparty.item1': '法令に基づく場合を除き、第三者に提供することはありません。',

      'privacy.section.external': '4. 外部サービス',
      'privacy.external.item1': 'CDN等の外部サービスを利用する場合があります。',
      'privacy.external.item2': '画像の処理は利用者のブラウザ内で face-api.js を用いてブラウザ内で行われます。',

      'privacy.section.contact': '5. お問い合わせ',
      'privacy.contact.item1': 'プライバシーポリシーに関するお問い合わせは「要望・バグ報告」よりご連絡ください。',

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
      'contact.success': 'ご意見ありがとうございます！',
      'contact.placeholder.name': '氏名',
      'contact.placeholder.message': '要望や不具合の内容を入力'
    }
  };


    /**
     * Currently active UI language code.
     *
     * The value is lazily initialized from localStorage (key: "lang")
     * and falls back to "en" if no value is stored or an error occurs
     * (for example, when localStorage is not available).
     *
     * This variable is later updated whenever the user toggles the language.
     *
     * @type {string}
     */
    // 現在の言語（永続化）
    let currentLang = (function(){
      try {
        return localStorage.getItem('lang') || 'en'; }
        catch(e){ return 'en'; }
      })();

    /**
     * Renders localized text into a DOM node in a safe way.
     *
     * - Escapes HTML special characters to prevent XSS.
     * - If the string contains newline characters, they are converted into <br> tags.
     * - Otherwise, the text is assigned via textContent.
     *
     * @param {HTMLElement} node - Target DOM node to receive the translated text.
     * @param {string} str - The text to render into the node.
     * @returns {void}
     */
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

    /**
     * Applies i18n translations to all elements with a `data-i18n` attribute.
     *
     * This function:
     * - Walks the DOM within an optional scope (or the whole document by default).
     * - Finds elements that declare a `data-i18n` key.
     * - Safely injects translated text without breaking child form controls
     *   (inputs, textareas, selects, buttons, etc.).
     *
     * If a descendant `.i18n-text` element exists, it is used as the injection target.
     * Otherwise, one may be created and inserted before form controls.
     *
     * @param {string} lang - Language code to apply (e.g., "en" or "ja").
     * @param {ParentNode|HTMLElement|Document} [scope=document] - Optional root node to limit translation updates.
     * @returns {void}
     */
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

        // 1) Element itself is an i18n slot
        if (el.classList && el.classList.contains('i18n-text')) {
          target = el;
        } else {
          // 2) Has a child .i18n-text slot
          const span = el.querySelector ? el.querySelector('.i18n-text') : null;
          if (span) {
            target = span;
          } else {
            // 3) Contains form controls -> create a leading .i18n-text slot
            const hasFormChild = el.querySelector ? el.querySelector('input, textarea, select, button') : null;
            if (hasFormChild) {
              const head = document.createElement('span');
              head.className = 'i18n-text';
              if (el.firstChild) el.insertBefore(head, el.firstChild);
              else el.appendChild(head);
              target = head;
            } else {
              // 4) Plain text container
              target = el;
            }
          }
        }
        renderText(target, txt);
        // (placeholder translation removed from here; now in second pass)
      }

      /**
       * Placeholder i18n (second pass).
       *
       * Placeholders live on <input>/<textarea> elements which often do NOT have `data-i18n`.
       * If we only translate nodes collected by `[data-i18n]`, placeholders will be skipped.
       *
       * This pass targets `[data-i18n-placeholder]` directly and updates the `placeholder` attribute.
       */
      const phNodes = [];

      if (scope && scope !== document) {
        if (scope.getAttribute && scope.hasAttribute('data-i18n-placeholder')) {
          phNodes.push(scope);
        }
        if (scope.querySelectorAll) {
          const scopedPh = scope.querySelectorAll('[data-i18n-placeholder]');
          for (let i = 0; i < scopedPh.length; i++) phNodes.push(scopedPh[i]);
        }
      } else {
        const allPh = document.querySelectorAll('[data-i18n-placeholder]');
        for (let i = 0; i < allPh.length; i++) phNodes.push(allPh[i]);
      }

      for (let i = 0; i < phNodes.length; i++) {
        const el = phNodes[i];
        const phKey = el.getAttribute('data-i18n-placeholder');
        const phTxt = dict[phKey];
        if (typeof phTxt === 'string') el.setAttribute('placeholder', phTxt);
      }

      // Update <html lang="...">
      document.documentElement.setAttribute('lang', lang);

      // Persist language
      try { localStorage.setItem('lang', lang); } catch(e){}
      currentLang = lang;
    }

  /**
   * Initializes i18n and the language dropdown UI on page load.
   * - Applies translations for the persisted language.
   * - Syncs the dropdown disabled state.
   * - Forces the dropdown into a closed state.
   *
   * @returns {void}
   */
  function initI18nUI() {
    applyI18n(currentLang);
    updateLangMenuUI();

    // Force-close dropdown on load (works for both Popover API and legacy hidden)
    if (typeof window.__closeLangMenu === 'function') {
      window.__closeLangMenu();
    } else {
      const menu = document.getElementById('lang-menu');
      if (menu && typeof menu.hidePopover === 'function') {
        try { menu.hidePopover(); } catch (_) {}
      }
      const btn = document.getElementById('lang-menu-btn');
      if (btn) btn.setAttribute('aria-expanded', 'false');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initI18nUI);
  } else {
    initI18nUI();
  }


  // ==== Language dropdown UI sync (current item disabled) ====

  /**
   * Retrieves key DOM elements used by the language dropdown.
   *
   * @returns {{ btn: HTMLButtonElement|null, menu: HTMLElement|null }}
   * An object containing:
   * - btn: The language dropdown trigger button (#lang-menu-btn)
   * - menu: The language dropdown container (#lang-menu)
   */
  function getLangEls() {
    return {
      btn: document.getElementById('lang-menu-btn'),
      menu: document.getElementById('lang-menu')
    };
  }

  /**
   * Synchronizes the visual and accessibility state of the language dropdown menu.
   *
   * Responsibilities:
   * - Marks the currently active language as disabled.
   * - Applies `aria-disabled="true"` for screen readers.
   * - Uses native `disabled` for <button> elements when applicable.
   * - Prevents keyboard focus on the active language item.
   * - Adds visual disabled styles (Tailwind or custom CSS classes).
   * - Disables pointer interaction for <a> elements when active.
   *
   * This function should be called:
   * - After language changes.
   * - After applying i18n updates.
   *
   * @returns {void}
   */
  function updateLangMenuUI() {
    const { menu } = getLangEls();
    if (!menu) return;

    const items = menu.querySelectorAll('[data-lang]');
    items.forEach((item) => {
      const code = item.getAttribute('data-lang');
      const isCurrent = code === currentLang;

      // Accessibility state
      item.setAttribute('aria-disabled', isCurrent ? 'true' : 'false');

      // If it's a button, use the native disabled attribute.
      if (item.tagName === 'BUTTON') {
        item.disabled = isCurrent;
      }

      // Prevent focus on the current language item
      if (isCurrent) item.setAttribute('tabindex', '-1');
      else item.removeAttribute('tabindex');

      // Visual disabled style (works with Tailwind or plain CSS)
      item.classList.toggle('is-current-lang', isCurrent);
      item.classList.toggle('opacity-50', isCurrent);
      item.classList.toggle('cursor-not-allowed', isCurrent);

      // For <a> elements, disable pointer interaction when current
      if (item.tagName === 'A') {
        item.classList.toggle('pointer-events-none', isCurrent);
      }
    });
  }

  /**
   * Global i18n helper exposed on `window.appI18n`.
   *
   * Provides a small API for:
   * - Applying translations to the entire document or a specific scope.
   * - Refreshing translations using the current language.
   * - Getting the current language code.
   * - Fetching a translated string for a given key.
   * - Reusing the low-level `renderText` utility.
   *
   * @namespace appI18n
   */
  window.appI18n = {
    /**
     * Applies translations for the specified language (or current) to the given DOM scope.
     * Also updates the language dropdown UI.
     * @param {string} [lang] - Language code to apply.
     * @param {ParentNode|HTMLElement|Document} [scope] - Optional root node to limit translation updates.
     * @returns {void}
     */
    apply: function(lang, scope){
      applyI18n(typeof lang === 'string' ? lang : currentLang, scope);
      updateLangMenuUI();
    },
    /**
     * Refreshes translations using the current language for the given scope.
     * Also updates the language dropdown UI.
     * @param {ParentNode|HTMLElement|Document} [scope] - Optional root node to limit translation updates.
     * @returns {void}
     */
    refresh: function(scope){
      applyI18n(currentLang, scope);
      updateLangMenuUI();
    },
    /**
     * Gets the currently active language code.
     * @returns {string}
     */
    getCurrentLang: function(){
      return currentLang;
    },
    /**
     * Gets the translated string for the given key, or null if not found.
     * @param {string} key - The i18n dictionary key.
     * @returns {string|null}
     */
    getText: function(key){
      const dict = DICT[currentLang] || {};
      const txt = dict[key];
      return (typeof txt === 'string') ? txt : null;
    },
    /**
     * Renders translated text into a DOM node.
     * @param {HTMLElement} node
     * @param {string} str
     * @returns {void}
     */
    renderText: renderText
  };
  /**
   * Debug helper for face-related operations.
   *
   * Appends a timestamped JSON log line into the #face-debug element
   * (if it exists), keeping the log size bounded.
   *
   * @param {string} label - Short label describing the log event.
   * @param {*} payload - Arbitrary data to be stringified and logged.
   * @returns {void}
   */
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

/**
 * Initializes the materials accordion component.
 *
 * Sets up:
 * - Initial open/closed heights for each accordion content panel.
 * - Click handlers to toggle individual sections.
 * - Keyboard support (Enter/Space) for accessible toggling.
 *
 * This function is wrapped in an IIFE and runs once on load.
 *
 * @returns {void}
 */
(function initMaterialsAccordion(){
  const root = document.querySelector('#materials');
  if (!root) return;

  const toggles = root.querySelectorAll('.acc-toggle');

  /**
   * Opens or closes a single accordion section.
   *
   * Uses the panel's scrollHeight to animate the height from 0 to auto
   * (for opening) and back to 0 (for closing), while keeping
   * aria-expanded in sync with the visual state.
   *
   * @param {HTMLButtonElement} btn - The accordion toggle button.
   * @param {boolean} open - Whether the section should be opened (true) or closed (false).
   * @returns {void}
   */
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

  /**
   * Closes all accordion sections except the one associated with `btn`.
   *
   * Ensures only a single section remains open when a new header is toggled.
   *
   * @param {HTMLButtonElement} btn - The button whose section should remain open.
   * @returns {void}
   */
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

/**
 * Initializes the lightbox for sample materials.
 *
 * Enables:
 * - Clicking on thumbnail images to open them in an overlay.
 * - Navigating between images with the keyboard (ArrowLeft/ArrowRight).
 * - Closing the overlay via background click, close button, or Escape key.
 * - Opening the current image in a new tab and downloading it.
 *
 * This function is wrapped in an IIFE and runs once on load.
 *
 * @returns {void}
 */
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
  let lastActiveThumb = null; // currently highlighted thumbnail for touch/pointer
  let isPointerDown = false; // flag for pointer down state

  /**
   * Configures the download link for the currently displayed image.
   *
   * Derives a reasonable filename from the image URL (stripping any query
   * parameters) and sets both the `href` and `download` attributes on the
   * dedicated download link element.
   *
   * @param {string} src - The image URL to be used for downloading.
   * @returns {void}
   */
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

  /**
   * Opens the lightbox at the specified index within the current image list.
   *
   * Clamps the index to a valid range, updates the main lightbox image
   * (src and alt), configures the download link, and shows the overlay.
   *
   * @param {number} idx - Index of the image to display from `currentList`.
   * @returns {void}
   */
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

  /**
   * Closes the lightbox overlay and clears its current state.
   *
   * Hides the overlay, removes the image src, restores body scrolling,
   * and resets the current image list and index.
   *
   * @returns {void}
   */
  const close = () => {
    overlay.classList.remove('open');
    overlay.setAttribute('hidden', 'true');
    imgEl.removeAttribute('src');
    document.body.style.overflow = '';
    currentList = [];
    currentIndex = -1;
  };

  /**
  * Opens the lightbox using a clicked thumbnail image as the starting point.
  *
  * Collects all sibling thumbnails within the same `.materials-grid`,
  * stores them as the current image list, and opens the lightbox at the
  * index of the clicked thumbnail.
  *
  * @param {HTMLImageElement} thumb - The thumbnail image that was clicked.
  * @returns {void}
  */
  const openFromThumb = (thumb) => {
    // gather siblings within same materials-grid
    const grid = thumb.closest('.materials-grid');
    if (!grid) return;
    currentList = Array.from(grid.querySelectorAll('.material-set img'));
    const idx = currentList.indexOf(thumb);
    openAt(idx >= 0 ? idx : 0);
  };

  /**
  * Highlights the thumbnail currently touched by the user (pointerdown).
  *
  * Intended to provide immediate visual feedback, especially on touch devices.
  * When the pointer goes down on a thumbnail, this function marks it with the
  * `.is-active-thumb` class and removes the highlight from any previously active
  * thumbnail.
  *
  * @listens PointerEvent#pointerdown
  * @param {PointerEvent} e - The pointer event triggered when touching a thumbnail.
  * @returns {void}
  */
  materialsRoot.addEventListener('pointerdown', (e) => {
    const t = e.target;
    if (!t || t.tagName !== 'IMG') return;
    if (!t.closest('.material-set')) return;

    isPointerDown = true;

    // Remove the class from the previously active thumbnail, if any
    if (lastActiveThumb && lastActiveThumb !== t) {
      lastActiveThumb.classList.remove('is-active-thumb');
    }

    // Mark the current thumbnail as active
    t.classList.add('is-active-thumb');
    lastActiveThumb = t;
  });

/**
* Continuously updates the highlighted thumbnail while the pointer moves.
*
* When the pointer moves across multiple thumbnails (for example, when the user
* slides their finger across the screen), this handler adds `.is-active-thumb`
* to the thumbnail currently under the pointer and removes it from the previous
* one. This enables a “tracking highlight” gesture that feels more natural on
* touch screens.
*
* Ignores movement when no active pointerdown has occurred.
*
* @listens PointerEvent#pointermove
* @param {PointerEvent} e - The pointer event triggered during pointer movement.
* @returns {void}
*/
  materialsRoot.addEventListener('pointermove', (e) => {
    if (!isPointerDown) return; // Only proceed if pointer is down

    // get the element currently under the pointer
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el || el.tagName !== 'IMG') return;
    if (!el.closest('.material-set')) return;

    if (lastActiveThumb && lastActiveThumb !== el) {
      lastActiveThumb.classList.remove('is-active-thumb');
    }
    el.classList.add('is-active-thumb');
    lastActiveThumb = el;
  });

// When the pointer is released or cancelled, remove the active highlight
/**
* Clears the active highlight state for thumbnails and
* stops pointer tracking. Used on pointerup / pointercancel.
*
* This version does not rely on the event target being an <img>,
* so it also works when the pointer is released outside the thumbnail.
*/
  const clearActiveThumb = () => {
    isPointerDown = false;
    if (lastActiveThumb) {
      lastActiveThumb.classList.remove('is-active-thumb');
      lastActiveThumb = null;
    }
  };

  materialsRoot.addEventListener('pointerup', clearActiveThumb);
  materialsRoot.addEventListener('pointercancel', clearActiveThumb);

/**
* Delegated click handler for all thumbnails inside the materials section.
*
* Detects clicks on <img> elements that belong to a `.material-set`
* and opens the lightbox starting from that thumbnail. Prevents any
* default link navigation so that the lightbox takes over the UX.
*
* @param {MouseEvent} e - The click event originating from the materials root.
* @returns {void}
*/
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
