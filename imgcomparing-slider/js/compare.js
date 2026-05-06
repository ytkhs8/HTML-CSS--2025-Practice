import {
  prepareFacesForSliderAligned
} from './faceUtils.js';

/**
 * ============================================
 * UI Controls: Hamburger Menu & Language Dropdown
 * ============================================
 *
 * This section handles core UI interactions for:
 *
 * 1. Hamburger Menu (Side Navigation)
 *    - Toggles the side menu open/close state
 *    - Controls overlay visibility
 *    - Locks body scrolling when menu is open
 *    - Updates accessibility attributes (aria-expanded)
 *
 * 2. Language Dropdown (Popover-based)
 *    - Enables/disables interaction when side menu is open
 *    - Handles open/close behavior via pointer events
 *    - Closes on outside click or Escape key
 *    - Positions the dropdown relative to the trigger button
 *    - Integrates with i18n system for language switching
 *
 * 3. Accessibility & UX Considerations
 *    - Prevents background interaction when menu is active
 *    - Ensures keyboard navigation support
 *    - Keeps UI state consistent across interactions
 *
 * Elements referenced:
 * - hamburgerBtn (#hamburger-btn)
 * - sideMenu (#side-menu)
 * - menuOverlay (#menu-overlay)
 * - lang-dropdown related elements
 *
 * @module UIControls
 */

const hamburgerBtn = document.getElementById('hamburger-btn');
const sideMenu = document.getElementById('side-menu');
const menuOverlay = document.getElementById('menu-overlay');
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
   * =====================================================
   * Language Dropdown Popover Interaction Controls
   * =====================================================
   *
   * This section controls the language dropdown menu after the
   * basic Popover API setup and positioning helpers have been defined.
   *
   * Core responsibilities:
   *
   * 1. Open / Close Behavior
   *    - Opens the manual Popover API menu when the trigger button is activated.
   *    - Closes the popover and resets temporary inline positioning styles.
   *    - Updates `aria-expanded` so assistive technologies can follow the state.
   *
   * 2. External Close Access
   *    - Exposes `window.__closeLangMenu` so other UI flows can force-close
   *      the language menu (for example, when the side navigation opens).
   *
   * 3. Pointer-Based Toggle
   *    - Uses `pointerdown` instead of `click` to align with outside-close handling.
   *    - Prevents propagation from the trigger/menu to avoid immediate close conflicts.
   *
   * 4. Outside Click Detection
   *    - Detects interactions outside the dropdown and closes the menu.
   *    - Uses `composedPath()` when available for better compatibility with
   *      Shadow DOM and browser top-layer behavior.
   *
   * 5. Viewport Repositioning
   *    - Repositions the popover on scroll and resize while it is open.
   *    - Keeps the menu visually anchored under the trigger button.
   *
   * 6. Keyboard Support
   *    - Closes the language menu when Escape is pressed.
   *
   * 7. Language Selection
   *    - Ignores the currently selected disabled language item.
   *    - Applies the selected language through `window.appI18n.apply()`.
   *    - Closes the menu after a valid selection.
   *
   * 8. Initialization
   *    - Ensures the dropdown starts in a closed state.
   *    - Initializes the click behavior after DOMContentLoaded.
   *
   * Notes:
   * - The former scattered English/Japanese comments have been translated and
   *   consolidated into this JSDoc block.
   * - Executable behavior remains unchanged.
   *
   * @module LanguageDropdownPopoverControls
   */
  const open = () => {
    if (btn.disabled) return;
    try { menu.showPopover(); } catch {}
    btn.setAttribute('aria-expanded', 'true');
    requestAnimationFrame(() => {
      positionMenu();
    });
  };

  const close = () => {
    try { menu.hidePopover(); } catch {}
    btn.setAttribute('aria-expanded', 'false');
    menu.style.left = '';
    menu.style.top = '';
    menu.style.position = '';
    menu.style.margin = '';
    menu.style.zIndex = '';
  };

  window.__closeLangMenu = close;

  btn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggle();
  });

  const isEventInsideDropdown = (ev) => {
    try {
      const path = (typeof ev.composedPath === 'function') ? ev.composedPath() : null;
      if (path && path.indexOf(dropdown) >= 0) return true;
    } catch (_) {}
    return dropdown.contains(ev.target);
  };

  dropdown.addEventListener('click', (e) => e.stopPropagation());

  document.addEventListener('pointerdown', (e) => {
    if (!isOpen()) return;
    if (dropdown.contains(e.target)) return;
    close();
  });

  window.addEventListener('scroll', repositionIfOpen, true);
  window.addEventListener('resize', repositionIfOpen);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen()) close();
  });

  menu.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
  });

  menu.querySelectorAll('.lang-item[data-lang]').forEach((item) => {
  item.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (item.getAttribute('aria-disabled') === 'true' || item.disabled) {
      close();
      return;
    }

    const code = item.getAttribute('data-lang');
    if (code && window.appI18n && typeof window.appI18n.apply === 'function') {
      window.appI18n.apply(code);
    }
    close();
  });
  });

  close();

}

  document.addEventListener('DOMContentLoaded', () => {
    initLangDropdownClick();
  });

/**
 * =====================================================
 * Side Navigation Menu Controls
 * =====================================================
 *
 * This section controls the hamburger-triggered side navigation menu.
 *
 * Core responsibilities:
 *
 * 1. Open / Close State
 *    - Opens the slide-in side menu and activates the dark overlay.
 *    - Closes the side menu and hides the overlay.
 *    - Toggles the hamburger button between its default and open (X) states.
 *
 * 2. Accessibility
 *    - Keeps `aria-expanded` synchronized with the current menu state.
 *    - Uses optional chaining for event listeners so missing DOM elements do not throw errors.
 *
 * 3. Scroll Lock
 *    - Adds `menu-open` to the document body while the menu is open.
 *    - Removes `menu-open` when the menu is closed to restore background scrolling.
 *
 * 4. Language Dropdown Coordination
 *    - Disables the language dropdown while the side menu is open.
 *    - Re-enables the language dropdown when the side menu is closed.
 *
 * 5. User Interaction
 *    - Clicking the hamburger button toggles the menu.
 *    - Clicking the dark overlay closes the menu.
 *
 * Notes:
 * - The former Japanese comments for hamburger open/close behavior,
 *   scroll locking, and overlay closing have been translated and consolidated here.
 *
 * @module SideNavigationControls
 */
function openMenu(){
  sideMenu.classList.add('open');
  menuOverlay.classList.add('active');
  hamburgerBtn.classList.add('is-open');
  hamburgerBtn.setAttribute('aria-expanded', 'true');
  document.body.classList.add('menu-open');
  setLangDropdownEnabled(false);
}
function closeMenu(){
  sideMenu.classList.remove('open');
  menuOverlay.classList.remove('active');
  hamburgerBtn.classList.remove('is-open');
  hamburgerBtn.setAttribute('aria-expanded', 'false');
  document.body.classList.remove('menu-open');
  setLangDropdownEnabled(true);
}
function toggleMenu(){
  if (sideMenu.classList.contains('open')) closeMenu();
  else openMenu();
}
hamburgerBtn?.addEventListener('click', toggleMenu);
menuOverlay?.addEventListener('click', closeMenu);

/**
 * ============================================
 * Side Menu Navigation (SPA Behavior)
 * ============================================
 *
 * This section handles navigation interactions inside the side menu
 * in a Single Page Application (SPA) style.
 *
 * Core behavior:
 * - Intercepts clicks on <a> elements inside the side menu.
 * - Prevents default browser navigation (no page reload).
 * - Reads the target page ID from `data-page` attribute.
 * - Switches visible content by:
 *   - Removing `.active` from the currently active section.
 *   - Adding `.active` to the target section.
 *
 * Additional UI updates:
 * - Toggles layout-related body classes:
 *   - `wide-page` for non-home pages
 *   - `contact-wide` specifically for the contact page
 * - Scrolls the viewport back to the top after navigation.
 *
 * State cleanup:
 * - Clears contact form attachment files when leaving the contact page.
 * - Re-applies i18n translations for the newly activated section.
 *
 * Accessibility & UX:
 * - Ensures smooth SPA transitions without full reloads.
 * - Keeps UI state consistent after navigation.
 * - Automatically closes the side menu after a selection.
 *
 * @listens HTMLElement#click
 * @param {MouseEvent} e - Click event triggered inside the side menu.
 * @returns {void}
 */
sideMenu?.addEventListener('click', (e) => {
  const link = e.target.closest('a');
  if (!link) return;

  e.preventDefault();
  const pageId = link.dataset.page;
  if (pageId) {
    document.querySelector('.page.active')?.classList.remove('active');
    const target = document.getElementById(pageId);
    target?.classList.add('active');

    document.body.classList.toggle('wide-page', pageId !== 'home');
    document.body.classList.toggle('contact-wide', pageId === 'contact');

    if (pageId !== 'contact' && typeof window.__clearContactUploadFiles === 'function') {
      window.__clearContactUploadFiles();
    }

    if (window.appI18n && typeof window.appI18n.refresh === 'function' && target) {
      window.appI18n.refresh(target);
    }

    window.scrollTo(0, 0);
  }
  closeMenu();
});


/**
 * =====================================================
 *  Global UI Interaction: Escape Handling, Navigation,
 *  and Image Comparison Wizard State Management
 * =====================================================
 *
 * This section centralizes multiple UI behaviors including:
 *
 * 1. Global Escape Key Handling
 *    - Listens for the Escape key across the entire document.
 *    - Prioritizes closing UI layers in the following order:
 *      1) Side navigation menu (modal priority)
 *      2) Language dropdown menu
 *    - Supports both Popover API (`:popover-open`) and legacy visibility handling.
 *    - Falls back to manual DOM updates if no helper functions are available.
 *
 * 2. Header Navigation (SPA Behavior)
 *    - Clicking the application title resets the UI to the "home" page.
 *    - Clears active page states and restores default layout classes.
 *    - Resets contact form attachments if leaving the contact page.
 *    - Scrolls the viewport back to the top.
 *
 * 3. Image Comparison Wizard Core State
 *    - Initializes DOM references for all wizard-related elements:
 *      - Image inputs (before/after)
 *      - Preview images
 *      - Slider UI (overlay, handle, container)
 *      - Face detection UI (checkbox, loading indicator, error message)
 *      - Navigation buttons (Next, Start, Reset)
 *      - Guide text display
 *
 * 4. Wizard Step Management
 *    - Maintains a step-based workflow:
 *      1) Select BEFORE image
 *      2) BEFORE image selected
 *      3) Select AFTER image
 *      4) AFTER image selected
 *      5) Face-only mode selection
 *      6) Ready to start comparison
 *    - Controls UI transitions and button visibility based on the current step.
 *
 * 5. Rendering Control
 *    - Uses a flag (`allowRender`) to prevent automatic comparison rendering
 *      before the user explicitly starts the process.
 *
 * 6. UI Synchronization
 *    - Dynamically updates guide messages (with i18n support).
 *    - Enables/disables navigation buttons based on input readiness.
 *    - Keeps UI consistent across user interactions.
 *
 * Notes:
 * - All behaviors are designed to work in a Single Page Application (SPA) context.
 * - Accessibility is considered via keyboard handling and ARIA attributes.
 * - Japanese inline comments have been translated and consolidated into this block.
 *
 * @module GlobalUIAndWizardControl
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

const appTitle = document.querySelector('.app-title');
if (appTitle) {
  appTitle.addEventListener('click', () => {
    document.querySelectorAll('.page').forEach(pg => pg.classList.remove('active'));
    document.getElementById('home')?.classList.add('active');
    document.body.classList.remove('wide-page');
    document.body.classList.remove('contact-wide');
    if (typeof window.__clearContactUploadFiles === 'function') {
      window.__clearContactUploadFiles();
    }
    window.scrollTo(0, 0);
  });
}

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

const guideText = document.getElementById('guide-text');
const nextBtn1 = document.getElementById('next-btn-1');
const nextBtn2 = document.getElementById('next-btn-2');
const nextBtn3 = document.getElementById('next-btn-3');
const startBtn = document.getElementById('start-compare-btn');

let currentStep = 1;
let allowRender = false;
function updateWizardUI(){
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
 * ==============================================================
 *  Wizard UI, Image Handling, Face Preloading, and State Control
 * ==============================================================
 *
 * This section manages the core logic of the image comparison wizard,
 * including UI updates, file handling, face detection preloading,
 * and state transitions.
 *
 * 1. Guide Text & Internationalization
 *    - Dynamically updates the guide text displayed in the wizard.
 *    - Applies i18n translations using `window.appI18n` when available.
 *    - Falls back to default text for initial rendering.
 *
 * 2. Image Load State Tracking
 *    - Tracks whether BEFORE and AFTER images are loaded.
 *    - Used to control wizard progression and button states.
 *
 * 3. Face Detection Readiness
 *    - Indicates whether face detection models are initialized.
 *    - Prevents premature execution of face-only comparison.
 *
 * 4. Slider Reset Logic
 *    - Resets visual comparison elements (images, overlay, slider).
 *    - Clears preview images and hides comparison UI.
 *    - Does not reset wizard steps or selected files.
 *
 * 5. Wizard State Management
 *    - Maintains references to selected files (before/after).
 *    - Controls wizard step transitions and UI updates.
 *    - Provides full reset functionality via `resetAll()`.
 *
 * 6. Face Preloading System
 *    - Precomputes face-aligned images in the background.
 *    - Uses a token-based system to cancel outdated async tasks.
 *    - Stores results for instant rendering on "Start".
 *    - Gracefully falls back to normal comparison if detection fails.
 *
 * 7. File Input Handling
 *    - Processes image selection for BEFORE and AFTER inputs.
 *    - Generates preview images using FileReader.
 *    - Advances wizard steps without triggering rendering.
 *
 * 8. Face Mode Toggle
 *    - Enables or disables face-only comparison mode.
 *    - Clears cached results when toggled.
 *    - Triggers background preloading when conditions are met.
 *
 * 9. Wizard Navigation Controls
 *    - Handles "Next" and "Start" button interactions.
 *    - Validates required inputs before progressing.
 *    - Executes comparison logic only when explicitly started.
 *
 * 10. Comparison Execution
 *     - Applies precomputed face results if available.
 *     - Otherwise performs face detection at runtime.
 *     - Updates slider UI and scroll position after rendering.
 *
 * Notes:
 * - Rendering is intentionally deferred until the user presses "Start".
 * - All async operations are safely cancellable to prevent race conditions.
 * - UI state remains consistent across user interactions.
 *
 * @module WizardAndComparisonControl
 */
function setGuide(key, fallback){
  if (guideText){
    guideText.setAttribute('data-i18n', key);
    guideText.textContent = fallback;
    if (window.appI18n) {
      const translated = window.appI18n.getText(key);
      if (translated) {
        window.appI18n.renderText(guideText, translated);
      }
    }
  }
}
let beforeLoaded = false, afterLoaded = false;
let faceApiReady = false;
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
let beforeFileRef = null;
let afterFileRef = null;
let precomputedFaces = null;
let preloadingId = 0;
function clearPreload() {
  precomputedFaces = null;
  preloadingId++;
  if (faceLoading) faceLoading.style.display = 'none';
}
function canPreloadFaces() {
  return !!(beforeFileRef && afterFileRef && faceCheckbox && faceCheckbox.checked);
}
async function preloadFacesIfPossible() {
  if (!canPreloadFaces()) return;
  const token = ++preloadingId;
  try {
    faceLoading.style.display = 'block';
    const faces = await prepareFacesForSliderAligned(beforeFileRef, afterFileRef, 420, 520);
    if (token !== preloadingId) return;
    if (faces) {
      precomputedFaces = faces;
    } else {
      precomputedFaces = null;
    }
  } catch (err) {
    precomputedFaces = null;
  } finally {
    if (token === preloadingId) {
      faceLoading.style.display = 'none';
    }
  }
}
function resetAll() {
  clearPreload();
  allowRender = false;
  beforeFileRef = null; afterFileRef = null;
  beforeLoaded = false; afterLoaded = false;
  currentStep = 1;
  resetSlider();
  updateWizardUI();
}
if (resetBtn){
  resetBtn.replaceWith(resetBtn.cloneNode(true));
}
const _resetBtn = document.getElementById('reset-btn');
if (_resetBtn){
  _resetBtn.addEventListener('click', resetAll);
}
function handleImageWizard(input, imgEl, which) {
  input.addEventListener('change', async (e) => {
    faceError.style.display = 'none';
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    clearPreload();
    const reader = new FileReader();
    reader.onload = (ev) => { imgEl.src = ev.target.result; };
    if (which === 'before') {
      beforeFileRef = file;
      beforeLoaded = true;
      reader.readAsDataURL(file);
      currentStep = 2;
    } else {
      afterFileRef = file;
      afterLoaded = true;
      reader.readAsDataURL(file);
      currentStep = 4;
    }
    updateWizardUI();
    if (canPreloadFaces()) {
      preloadFacesIfPossible();
    }
  });
}
faceCheckbox.addEventListener('change', async () => {
  faceError.style.display = 'none';
  clearPreload();
  if (currentStep < 5) {
    currentStep = 5;
  }
  updateWizardUI();
  if (canPreloadFaces()) {
    preloadFacesIfPossible();
  }
});
handleImageWizard(beforeInput, imgBefore, 'before');
handleImageWizard(afterInput, imgAfter, 'after');
if (nextBtn1){
  nextBtn1.addEventListener('click', () => {
    if (!beforeFileRef) return;
    currentStep = 3;
    updateWizardUI();
  });
}
if (nextBtn2){
  nextBtn2.addEventListener('click', () => {
    if (!afterFileRef) return;
    currentStep = 5;
    updateWizardUI();
  });
}
if (nextBtn3){
  nextBtn3.addEventListener('click', () => {
    currentStep = 6;
    updateWizardUI();
  });
}
if (startBtn){
  startBtn.addEventListener('click', async () => {
    if (!(beforeFileRef && afterFileRef)) return;
    allowRender = true;
    try {
      if (faceCheckbox.checked) {
        if (precomputedFaces) {
          imgBefore.src = precomputedFaces.before;
          imgAfter.src = precomputedFaces.after;
        } else {
          faceLoading.style.display = 'block';
          const faces = await prepareFacesForSliderAligned(beforeFileRef, afterFileRef, 420, 520);
          faceLoading.style.display = 'none';
          if (faces) {
            imgBefore.src = faces.before;
            imgAfter.src = faces.after;
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
updateWizardUI();
const compareSlider = document.querySelector('.compare-slider');
let sliderPercent = 50;
let sliderDragging = false;
let sliderRect = null;
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
 * ==============================================================
 *  Slider Interaction & Contact Form Upload System (Unified Doc)
 * ==============================================================
 *
 * This section combines two major UI systems:
 *
 * 1. Image Comparison Slider Interaction
 * --------------------------------------------------------------
 * Handles all user interactions with the comparison slider,
 * including pointer-based dragging and keyboard accessibility.
 *
 * Core behavior:
 * - Pointer-based drag (mouse, touch, pen):
 *   - Starts dragging only on primary mouse button (left click).
 *   - Captures pointer to ensure smooth dragging.
 *   - Updates slider position based on pointer X coordinate.
 *
 * - Dragging lifecycle:
 *   - `pointerdown`: Start dragging and initialize bounds.
 *   - `pointermove`: Continuously update slider percentage.
 *   - `pointerup / pointercancel`: End dragging and restore cursor.
 *
 * - Position handling:
 *   - Converts pointer position into a percentage (0–100).
 *   - Clamps values to prevent overflow.
 *   - Uses requestAnimationFrame for smooth rendering.
 *
 * - Keyboard accessibility:
 *   - Slider is focusable (`tabindex="0"`).
 *   - ArrowLeft / ArrowRight move slider by ±5%.
 *   - ARIA attributes (`aria-valuemin`, `aria-valuemax`, `aria-valuenow`)
 *     ensure screen reader compatibility.
 *
 * - UX considerations:
 *   - Cursor changes to `ew-resize` during drag.
 *   - Initial slider position is centered (50%).
 *
 * 2. Contact Form Attachment Upload UI
 * --------------------------------------------------------------
 * Implements a dynamic file upload interface with enhanced UX.
 *
 * Features:
 * - Multiple file selection via input and drag & drop.
 * - Visual file list rendering under the upload area.
 * - Individual file removal with UI updates.
 * - Deduplication based on file identity (name/size/timestamp).
 *
 * File handling:
 * - Uses DataTransfer API to sync in-memory file list with
 *   `<input type="file">`.
 * - Allows re-selection of the same file by resetting input value.
 *
 * Drag & Drop:
 * - Highlights drop zone during drag interaction.
 * - Supports dropping multiple files at once.
 *
 * UI Rendering:
 * - Displays file name with icon.
 * - Adds accessible remove buttons for each file.
 * - Hides list when no files are selected.
 *
 * State management:
 * - Maintains internal `selectedFiles` array.
 * - Provides `__clearContactUploadFiles` for external reset flows.
 *
 * 3. Contact Form Submission (Mock Behavior)
 * --------------------------------------------------------------
 * Handles form submission in a front-end-only (mock) manner:
 *
 * - Prevents default submission (no page reload).
 * - Displays a temporary success message.
 * - Resets form fields and uploaded files.
 * - Automatically hides the success message after a delay.
 *
 * Notes:
 * - No data is sent to a backend server.
 * - Designed for UX demonstration and prototyping.
 *
 * Accessibility & UX:
 * - Ensures keyboard and pointer compatibility.
 * - Maintains consistent UI state across interactions.
 * - Japanese inline comments have been translated and unified here.
 *
 * @module SliderAndContactUI
 */
sliderHandle.addEventListener('pointerdown', (e) => {
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  sliderDragging = true;
  sliderRect = compareSlider.getBoundingClientRect();
  document.body.style.cursor = 'ew-resize';
  if (sliderHandle.setPointerCapture) {
    sliderHandle.setPointerCapture(e.pointerId);
  }
  sliderPercent = clientXToPercent(e.clientX);
  scheduleSliderUpdate();
  e.preventDefault();
});
window.addEventListener('pointermove', (e) => {
  if (!sliderDragging) return;
  sliderPercent = clientXToPercent(e.clientX);
  if (sliderPercent < 0) sliderPercent = 0;
  if (sliderPercent > 100) sliderPercent = 100;
  scheduleSliderUpdate();
});
window.addEventListener('pointerup', endSliderDrag);
window.addEventListener('pointercancel', endSliderDrag);
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
scheduleSliderUpdate();

/**
 * Creates (or returns) the attachment list container under the upload UI.
 *
 * Priority:
 * 1) Use an existing element with id `contact-upload-list`.
 * 2) Create and insert a `<div class="upload-file-list" id="contact-upload-list">` under
 *    the nearest `.form-upload` container, or directly after the input as a fallback.
 *
 * @param {HTMLInputElement} fileInput - The file input used for attachments.
 * @returns {HTMLElement|null} The list container element.
 */
function ensureContactUploadListEl(fileInput) {
  if (!fileInput) return null;

  /** @type {HTMLElement|null} */
  let listEl = document.getElementById('contact-upload-list');
  if (listEl) return listEl;

  listEl = document.createElement('div');
  listEl.className = 'upload-file-list';
  listEl.id = 'contact-upload-list';
  listEl.setAttribute('aria-live', 'polite');

  const container = fileInput.closest('.form-upload');
  if (container) {
    container.appendChild(listEl);
    return listEl;
  }

  const parent = fileInput.parentElement;
  if (parent) {
    parent.insertBefore(listEl, fileInput.nextSibling);
    return listEl;
  }

  return null;
}

/**
 * =====================================================
 * Contact Attachment Upload State & File List UI
 * =====================================================
 *
 * This section manages the selected attachment files for the
 * contact/feedback form and keeps the visual file list synchronized
 * with the underlying `<input type="file">` element.
 *
 * Core responsibilities:
 *
 * 1. File Identity & Deduplication
 *    - Builds stable identity keys from file name, size, and last modified time.
 *    - Prevents duplicate files from being added when users select or drop
 *      the same file multiple times.
 *
 * 2. FileList Synchronization
 *    - Uses the DataTransfer API to rebuild the read-only FileList.
 *    - Keeps the native file input aligned with the in-memory selectedFiles array.
 *    - Resets the input value so selecting the same file again can still
 *      trigger a change event.
 *
 * 3. File List Rendering
 *    - Renders selected files as compact list rows.
 *    - Displays a file icon, file name, and remove button for each file.
 *    - Hides the list when no files are selected.
 *
 * 4. Individual File Removal
 *    - Allows users to remove uploaded files one by one.
 *    - Updates both the UI list and the underlying input FileList after removal.
 *
 * 5. Multiple File Selection & Drag-and-Drop
 *    - Enables multiple attachments even if the HTML markup omits `multiple`.
 *    - Supports adding files through both the file picker and drag-and-drop.
 *    - Highlights the upload area while files are dragged over it.
 *
 * 6. External Reset Support
 *    - Exposes `window.__clearContactUploadFiles()` so other flows
 *      (form submit, page navigation, reset actions) can clear all attachments.
 *
 * Notes:
 * - FileList is read-only in the browser, so DataTransfer is used for updates.
 * - This UI is front-end only and does not upload files to a server yet.
 * - Japanese inline comments have been translated and consolidated here.
 *
 * @module ContactAttachmentUploadUI
 */
function fileKey(f) {
  return [f.name, f.size, f.lastModified].join('::');
}

function syncContactUploadInputFiles(fileInput, files) {
  if (!fileInput) return;

  const dt = new DataTransfer();
  files.forEach((f) => dt.items.add(f));
  fileInput.files = dt.files;

  fileInput.value = '';
}

function renderContactUploadFileList(listEl, files, onRemove) {
  if (!listEl) return;

  listEl.innerHTML = '';

  if (!files.length) {
    listEl.style.display = 'none';
    return;
  }

  listEl.style.display = 'block';

  files.forEach((f, idx) => {
    const row = document.createElement('div');
    row.className = 'upload-file-item';

    const left = document.createElement('div');
    left.className = 'upload-file-left';

    const icon = document.createElement('i');
    icon.className = 'bi bi-file-earmark upload-file-icon';
    icon.setAttribute('aria-hidden', 'true');

    const name = document.createElement('span');
    name.className = 'upload-file-name';
    name.textContent = f.name;

    left.appendChild(icon);
    left.appendChild(name);

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'upload-file-remove';
    removeBtn.setAttribute('aria-label', `Remove ${f.name}`);
    removeBtn.innerHTML = '<i class="bi bi-trash" aria-hidden="true"></i>';
    removeBtn.addEventListener('click', () => onRemove(idx));

    row.appendChild(left);
    row.appendChild(removeBtn);
    listEl.appendChild(row);
  });
}

function initContactUploadFilesUI() {
  const inputById = /** @type {HTMLInputElement|null} */ (document.getElementById('contact-upload'));

  const form = document.getElementById('contact-form');
  const inputInForm = form ? /** @type {HTMLInputElement|null} */ (form.querySelector('input[type="file"]')) : null;

  const fileInput = inputById || inputInForm;
  if (!fileInput) return;

  fileInput.multiple = true;

  const listEl = ensureContactUploadListEl(fileInput);

  let selectedFiles = [];

  const update = () => {
    renderContactUploadFileList(listEl, selectedFiles, (idx) => {
      selectedFiles.splice(idx, 1);
      syncContactUploadInputFiles(fileInput, selectedFiles);
      update();
    });
  };

  const addFiles = (incoming) => {
    const arr = Array.from(incoming || []);
    if (!arr.length) return;

    const existing = new Set(selectedFiles.map(fileKey));
    arr.forEach((f) => {
      if (!f || typeof f.name !== 'string') return;
      const k = fileKey(f);
      if (existing.has(k)) return;
      existing.add(k);
      selectedFiles.push(f);
    });

    syncContactUploadInputFiles(fileInput, selectedFiles);
    update();
  };

  update();

  fileInput.addEventListener('change', () => {
    if (!fileInput.files) return;
    addFiles(fileInput.files);
  });

  const dropZone = fileInput.closest('.form-upload') || fileInput;

  const setDragOver = (on) => {
    if (!dropZone || !dropZone.classList) return;
    dropZone.classList.toggle('is-dragover', !!on);
  };

  dropZone.addEventListener('dragenter', (e) => {
    e.preventDefault();
    setDragOver(true);
  });

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    setDragOver(true);
  });

  dropZone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    if (e.target === dropZone) setDragOver(false);
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    setDragOver(false);
    const dt = e.dataTransfer;
    if (!dt || !dt.files || !dt.files.length) return;
    addFiles(dt.files);
  });

  window.__clearContactUploadFiles = () => {
    selectedFiles = [];
    syncContactUploadInputFiles(fileInput, selectedFiles);
    update();
  };
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initContactUploadFilesUI);
} else {
  initContactUploadFilesUI();
}

/**
 * =====================================================
 * Contact Form Submission (Front-End Mock Behavior)
 * =====================================================
 *
 * This section provides a temporary front-end-only submit flow
 * for the contact / feedback form.
 *
 * Current behavior:
 * - Prevents the browser's default form submission.
 * - Displays a temporary success message.
 * - Resets all form fields after submission.
 * - Clears selected attachment files via `window.__clearContactUploadFiles()`.
 * - Automatically hides the success message after 3 seconds.
 *
 * Notes:
 * - This is a mock implementation and does not send data to a back-end server yet.
 * - It is intended to preserve a natural user experience until a Node.js API
 *   or another server-side endpoint is implemented.
 * - The former Japanese comment "フォーム送信ダミー" has been translated and
 *   consolidated into this JSDoc block.
 *
 * @module ContactFormMockSubmit
 */
const contactForm = document.getElementById('contact-form');
if (contactForm){
  contactForm.addEventListener('submit', function(e){
    e.preventDefault();
    document.getElementById('contact-success').style.display = 'block';
    contactForm.reset();
    // Clear selected attachment files after mock submission.
    if (typeof window.__clearContactUploadFiles === 'function') {
      window.__clearContactUploadFiles();
    }
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
      'about.desc': 'Yuuki, a Tokyo-based junior engineer, created this project as part of his learning journey. He is exploring various web technologies including Java, AWS, and JavaScript, and shares his work as a portfolio.',
      'about.howto': 'Use Cases',
      'about.howto.desc': 'This image comparison slider is useful for comparing landscapes, objects, people, faces, and outcomes.',

      // contact
      'contact.title': 'Requests & Bug Reports',
      'contact.email': 'E-mail address',
      'contact.subject': 'Subject',
      'contact.description': 'Description',
      'contact.upload': 'Attached file (optional)',
      'contact.submit': 'Send',
      'contact.success': 'Thank you for your feedback!',
      'contact.placeholder.email': 'Please input your e-mail address',
      'contact.placeholder.subject': 'Please input the subject of your request or bug report',
      'contact.placeholder.description': 'Describe your request or bug here',
      'upload.file': 'Select a file or drag and drop it here'
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
      'about.desc': '東京都在住の駆け出しエンジニアYuukiが、学習の一環で制作しています。JavaやAWS、JavaScriptなど幅広くWeb技術を学び、ポートフォリオとして公開中です。',
      'about.howto': '用途概要',
      'about.howto.desc': 'この画像比較スライダーは主に風景画・対象物・人物像・人物の顔・成果物の比較を行いたい際に役立ちます。',
      // contact
      'contact.title': '要望・バグ報告',
      'contact.email': 'メールアドレス',
      'contact.subject': '件名',
      'contact.description': '説明',
      'contact.upload': '添付ファイル（任意）',
      'contact.submit': '送信',
      'contact.success': 'ご意見ありがとうございます！',
      'contact.placeholder.email': 'メールアドレスを入力してください',
      'contact.placeholder.subject': '要望やバグ報告の件名を入力してください',
      'contact.placeholder.description': '要望や不具合を詳しく説明してください',
      'upload.file': 'ファイルを選択するか、ここにドラッグ＆ドロップしてください'
    }
  };


    /**
     * =====================================================
     * Internationalization Core (Dictionary Rendering & Persistence)
     * =====================================================
     *
     * This section provides the core i18n behavior for the application.
     *
     * Core responsibilities:
     *
     * 1. Language State & Persistence
     *    - Initializes the active language from localStorage (`lang`).
     *    - Falls back to English (`en`) when no saved language exists.
     *    - Safely handles environments where localStorage may be unavailable.
     *    - Persists the selected language after applying translations.
     *
     * 2. Safe Text Rendering
     *    - Renders translated strings into DOM nodes.
     *    - Uses `textContent` by default for safety.
     *    - Converts newline characters into `<br>` only after escaping HTML-sensitive characters.
     *    - Prevents accidental HTML injection in translated text.
     *
     * 3. Text Translation Pass
     *    - Finds elements with `data-i18n` within the whole document or an optional scope.
     *    - Supports direct `.i18n-text` targets.
     *    - Uses nested `.i18n-text` slots when available.
     *    - Creates a leading `.i18n-text` slot when an element contains form controls.
     *    - Falls back to replacing plain text containers directly.
     *
     * 4. Placeholder Translation Pass
     *    - Runs a second pass for `[data-i18n-placeholder]` elements.
     *    - Updates placeholder attributes on inputs and textareas.
     *    - Ensures placeholders are translated even when the field itself does not use `data-i18n`.
     *
     * 5. Document & UI Synchronization
     *    - Updates the `<html lang="...">` attribute.
     *    - Refreshes the language dropdown UI state.
     *    - Forces the language dropdown to start closed after initialization.
     *
     * Notes:
     * - This section is designed to work with SPA-style page switching.
     * - `applyI18n(lang, scope)` can translate either the full document or a specific page section.
     * - Japanese inline comments have been translated and consolidated into this block.
     *
     * @module InternationalizationCore
     */
    let currentLang = (function(){
      try {
        return localStorage.getItem('lang') || 'en'; }
        catch(e){ return 'en'; }
      })();

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

        if (el.classList && el.classList.contains('i18n-text')) {
          target = el;
        } else {
          const span = el.querySelector ? el.querySelector('.i18n-text') : null;
          if (span) {
            target = span;
          } else {
            const hasFormChild = el.querySelector ? el.querySelector('input, textarea, select, button') : null;
            if (hasFormChild) {
              const head = document.createElement('span');
              head.className = 'i18n-text';
              if (el.firstChild) el.insertBefore(head, el.firstChild);
              else el.appendChild(head);
              target = head;
            } else {
              target = el;
            }
          }
        }
        renderText(target, txt);
      }

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

      document.documentElement.setAttribute('lang', lang);
      try { localStorage.setItem('lang', lang); } catch(e){}
      currentLang = lang;
    }

  function initI18nUI() {
    applyI18n(currentLang);
    updateLangMenuUI();
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


  /**
   * =====================================================
   * Language Dropdown UI Synchronization
   * =====================================================
   *
   * This section keeps the language dropdown menu visually and
   * semantically synchronized with the currently active language.
   *
   * Core responsibilities:
   *
   * 1. DOM Element Access
   *    - Retrieves the language menu trigger button (`#lang-menu-btn`).
   *    - Retrieves the language menu container (`#lang-menu`).
   *    - Provides a small helper so later UI sync logic can access both elements safely.
   *
   * 2. Current Language State
   *    - Compares each `[data-lang]` menu item with `currentLang`.
   *    - Treats the currently selected language as inactive for user interaction.
   *
   * 3. Accessibility State
   *    - Applies `aria-disabled="true"` to the active language item.
   *    - Uses the native `disabled` attribute for `<button>` menu items.
   *    - Removes keyboard focus from the current language item via `tabindex="-1"`.
   *
   * 4. Visual Disabled State
   *    - Adds `.is-current-lang` for custom styling.
   *    - Adds utility classes such as `.opacity-50` and `.cursor-not-allowed`.
   *    - Disables pointer interaction for `<a>` menu items using `.pointer-events-none`.
   *
   * Usage:
   * - Called after language changes.
   * - Called after applying or refreshing i18n content.
   *
   * @module LanguageDropdownSync
   */
  function getLangEls() {
    return {
      btn: document.getElementById('lang-menu-btn'),
      menu: document.getElementById('lang-menu')
    };
  }

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
 * =====================================================
 * Materials Accordion UI (Expand / Collapse Sections)
 * =====================================================
 *
 * This module initializes and manages the accordion behavior
 * used in the "materials" section.
 *
 * Core features:
 *
 * 1. Section Toggle Behavior
 *    - Each accordion header (.acc-toggle) controls the visibility
 *      of its associated content panel (.acc-content).
 *    - Clicking the header toggles between open and closed states.
 *
 * 2. Animated Height Transitions
 *    - Uses the element's scrollHeight to smoothly animate
 *      from collapsed (height: 0) to expanded (height: auto).
 *    - Ensures a natural expand/collapse UX without layout jumps.
 *
 * 3. Single-Open Mode
 *    - When opening a new section, all other sections are closed.
 *    - Maintains a clean and readable UI.
 *
 * 4. Accessibility (A11y)
 *    - Uses aria-expanded to reflect the current state.
 *    - Supports keyboard interaction:
 *      - Enter → toggle
 *      - Space → toggle
 *
 * 5. Initial State Handling
 *    - Sections marked with aria-expanded="true" start open.
 *    - Others start collapsed with height: 0.
 *
 * Notes:
 * - This module runs immediately on load (IIFE pattern).
 * - Designed to work within SPA-style navigation.
 *
 * @module MaterialsAccordion
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

  toggles.forEach(btn => {
    const content = btn.nextElementSibling;
    if (!content || !content.classList.contains('acc-content')) return;

    if (btn.getAttribute('aria-expanded') === 'true') {
      content.classList.add('open');
      content.style.height = 'auto';
    } else {
      content.style.height = '0px';
    }

    btn.addEventListener('click', () => {
      const isOpen = btn.getAttribute('aria-expanded') === 'true';
      if (!isOpen) closeAllExcept(btn);
      setOpen(btn, !isOpen);
    });

    btn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        btn.click();
      }
    });
  });
})();


/**
 * =====================================================
 * Materials Lightbox (Image Viewer & Navigation)
 * =====================================================
 *
 * This module provides an interactive lightbox system for
 * viewing images inside the materials section.
 *
 * Core features:
 *
 * 1. Thumbnail Interaction
 *    - Clicking an image inside `.material-set` opens the lightbox.
 *    - Collects sibling images within the same grid for navigation.
 *
 * 2. Image Navigation
 *    - ArrowLeft / ArrowRight keys navigate between images.
 *    - Navigation wraps around (circular list behavior).
 *
 * 3. Overlay Control
 *    - Opens as a modal overlay.
 *    - Closes via:
 *      - Background click
 *      - Close button
 *      - Escape key
 *
 * 4. Download & External Open
 *    - Provides a download link for the current image.
 *    - Allows opening the image in a new browser tab.
 *
 * 5. Pointer Interaction Enhancements
 *    - Highlights thumbnails during pointerdown and pointermove.
 *    - Supports touch-friendly "drag-over highlight" behavior.
 *
 * 6. Accessibility & UX
 *    - Focus moves to the close button when opened.
 *    - Prevents background scrolling while active.
 *    - Maintains consistent state across interactions.
 *
 * 7. State Management
 *    - Tracks current image list and active index.
 *    - Resets state when the lightbox is closed.
 *
 * Notes:
 * - Implemented as an IIFE (runs once on load).
 * - Works seamlessly with SPA navigation structure.
 *
 * @module MaterialsLightbox
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

    if (lastActiveThumb && lastActiveThumb !== t) {
      lastActiveThumb.classList.remove('is-active-thumb');
    }
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
    if (!isPointerDown) return;
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
