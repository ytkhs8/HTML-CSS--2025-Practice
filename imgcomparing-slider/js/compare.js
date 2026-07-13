import {
  prepareFacesForSliderAligned
} from './faceUtils.js';

/**
 * ============================================
 * UI操作：ハンバーガーメニューと言語ドロップダウン
 * ============================================
 *
 * 次の主要なUI操作を扱います。
 *
 * 1. ハンバーガーメニュー（サイドナビゲーション）
 *    - サイドメニューの開閉、オーバーレイの表示、背景スクロールの固定を行います。
 *    - アクセシビリティ属性（aria-expanded）を更新します。
 * 2. 言語ドロップダウン（Popover API）
 *    - サイドメニュー表示中の操作可否、ポインター操作による開閉を管理します。
 *    - 外側のクリックやEscapeキーで閉じ、ボタンを基準に表示位置を決めます。
 *    - i18nと連携して表示言語を切り替えます。
 * 3. アクセシビリティと操作性
 *    - メニュー表示中の背景操作を防ぎ、キーボード操作を可能にします。
 *    - 操作中のUI状態に不整合が起きないようにします。
 *
 * 参照する要素：hamburgerBtn、sideMenu、menuOverlay、言語メニュー関連要素。
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
    // 意味上の無効化と見た目の無効化を両方行います
    if (enabled) {
      btn.removeAttribute('aria-disabled');
      btn.disabled = false;
    } else {
      btn.setAttribute('aria-disabled', 'true');
      btn.disabled = true;
      // 無効化するときはドロップダウンも強制的に閉じます
      btn.setAttribute('aria-expanded', 'false');
    }
  }

  // 無効化するときはPopover方式のメニューを強制的に閉じます
  if (!enabled && typeof window.__closeLangMenu === 'function') {
    window.__closeLangMenu();
  } else if (!enabled && menu && typeof menu.hidePopover === 'function') {
    try { menu.hidePopover(); } catch (_) {}
  }
}

/**
 * 言語ドロップダウンのクリック操作（Popover APIの手動モード）：
 * - クリックで開閉します。
 * - メニュー外のクリックまたはEscapeキーで閉じます。
 * - 言語を選択した後に閉じます。
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
   * 言語メニューのPopoverを、ドロップダウンボタンの直下へ配置します。
   *
   * Popover APIの要素はブラウザの最上位レイヤーへ移動するため、CSSの
   * `position: absolute`では`.lang-dropdown`を基準に配置できません。
   * `getBoundingClientRect()`でボタンの表示領域内座標を取得し、メニューへ
   * `position: fixed`と`left/top`を設定します。また、小さい画面でも
   * メニューが表示領域からはみ出さないよう横位置を補正します。
   *
   * @returns {void}
   */
  const positionMenu = () => {
    try {
      const r = btn.getBoundingClientRect();
      // Popoverの幅を計測できる状態にします。
      const mw = menu.getBoundingClientRect().width || 224;
      const gap = 8;

      // メニューの右端をボタンに合わせます。
      let left = r.right - mw;
      const top = r.bottom + gap;

      // 小さい画面でも表示領域内に収めます
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
   * Popoverが開いている場合に限り、表示位置を再計算します。
   * スクロールや画面サイズ変更でヘッダーが動いても、メニューをボタンの直下に保ちます。
   *
   * @returns {void}
   */
  const repositionIfOpen = () => {
    if (!isOpen()) return;
    positionMenu();
  };

/**
   * =====================================================
   * 言語ドロップダウンPopoverの操作制御
   * =====================================================
   *
   * Popover APIの初期設定と配置処理を行った後の、言語メニュー操作を管理します。
   *
   * 1. 開閉：手動Popoverを開閉し、仮のインライン配置を解除してaria-expandedを更新します。
   * 2. 外部からの終了：window.__closeLangMenuを公開し、サイドメニューなどから閉じられるようにします。
   * 3. ポインター操作：pointerdownで開閉し、イベント伝播による即時終了を防ぎます。
   * 4. 外側のクリック：composedPath()も利用してメニュー外の操作を検出します。
   * 5. 再配置：メニュー表示中のスクロールと画面サイズ変更に追従します。
   * 6. キーボード：Escapeキーで閉じます。
   * 7. 言語選択：選択中の無効項目を除き、window.appI18n.apply()で言語を適用して閉じます。
   * 8. 初期化：初期状態を閉じた状態にし、DOMContentLoaded後に操作を初期化します。
   *
   * 実行される処理内容には変更を加えていません。
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
 * サイドナビゲーションメニューの制御
 * =====================================================
 *
 * ハンバーガーボタンから開くサイドメニューを管理します。
 *
 * 1. 開閉状態：スライドメニューと暗いオーバーレイを表示・非表示にし、ボタンを通常表示とX表示で切り替えます。
 * 2. アクセシビリティ：aria-expandedを現在の状態と同期し、要素がない場合もエラーにならないようにします。
 * 3. スクロール固定：表示中はbodyへmenu-openを追加し、閉じたときに削除します。
 * 4. 言語メニューとの連携：サイドメニュー表示中は言語ドロップダウンを無効にします。
 * 5. ユーザー操作：ハンバーガーボタンで開閉し、暗い背景のクリックで閉じます。
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
 * サイドメニュー内の画面移動（SPA方式）
 * ============================================
 *
 * サイドメニュー内のリンクをページ再読み込みなしで処理します。
 * リンクのdata-pageから移動先IDを取得し、現在のセクションから.activeを外して
 * 移動先へ.activeを追加します。
 *
 * ホーム以外ではwide-page、問い合わせ画面ではcontact-wideをbodyへ設定し、
 * 移動後は画面上部へスクロールします。問い合わせ画面から離れると添付ファイルを消去し、
 * 新しく表示したセクションへi18n翻訳を再適用して、サイドメニューを閉じます。
 *
 * @listens HTMLElement#click
 * @param {MouseEvent} e - サイドメニュー内で発生したクリックイベント。
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
 * 全体UI操作、画面移動、画像比較ウィザードの状態管理
 * =====================================================
 *
 * 1. Escapeキー：サイドメニュー、言語メニューの順で閉じます。Popover APIと旧方式の両方に対応します。
 * 2. ヘッダー移動：アプリ名のクリックでホームへ戻し、レイアウトや添付ファイルを初期状態へ戻します。
 * 3. ウィザード要素：画像入力、プレビュー、スライダー、顔検出表示、各ボタン、案内文への参照を用意します。
 * 4. 手順管理：ビフォー選択から比較開始準備までの6段階を管理し、ボタン表示を切り替えます。
 * 5. 描画制御：allowRenderにより、ユーザーが開始する前の自動描画を防ぎます。
 * 6. UI同期：i18n対応の案内文と、入力状態に応じたボタンの有効・無効を更新します。
 *
 * SPA内での利用、キーボード操作、ARIA属性を考慮しています。
 *
 * @module GlobalUIAndWizardControl
 */

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;

  // 1) モーダルとして優先し、最初にサイドメニューを閉じます
  if (sideMenu.classList.contains('open')) {
    closeMenu();
    return;
  }

  // 2) 言語ドロップダウンが開いていれば閉じます
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

  // 代替処理：利用できる場合はPopover APIで閉じます
  if (typeof menu.hidePopover === 'function') {
    try { menu.hidePopover(); } catch (_) {}
  }

  // 旧方式向けの代替処理
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
 * ウィザードUI、画像処理、顔画像の事前処理、状態制御
 * ==============================================================
 *
 * 画像比較ウィザードのUI更新、ファイル処理、顔検出の事前実行、状態遷移を管理します。
 *
 * 1. 案内文と多言語対応：案内文を動的に更新し、利用可能ならwindow.appI18nの翻訳を適用します。
 * 2. 画像読み込み状態：ビフォー／アフター画像の準備状態を記録し、手順とボタンを制御します。
 * 3. 顔検出準備：モデルの初期化状態を管理し、準備前の顔比較実行を防ぎます。
 * 4. スライダー初期化：画像、オーバーレイ、スライダー、プレビュー表示を初期状態へ戻します。
 * 5. ウィザード状態：選択ファイルと手順を管理し、resetAll()で全体を初期化します。
 * 6. 顔画像の事前処理：位置合わせを裏側で実行し、古い非同期処理をトークンで無効化します。
 *    成功結果は開始時の即時表示に使い、失敗時は通常比較へ切り替えます。
 * 7. ファイル入力：FileReaderでプレビューを生成し、描画せずに次の手順へ進めます。
 * 8. 顔モード：顔のみ比較の切り替え、キャッシュ消去、条件成立時の事前処理を行います。
 * 9. 移動ボタン：必須入力を確認し、「次へ」と「比較を開始」の操作を処理します。
 * 10. 比較実行：事前処理結果または実行時の顔検出を使い、スライダーとスクロール位置を更新します。
 *
 * 描画は「比較を開始」が押されるまで行いません。非同期処理の競合を防ぎ、UI状態を保ちます。
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
 * スライダーの見た目（ハンドル位置とオーバーレイ幅）を更新します。
 * 滑らかに描画するため、DOMへの書き込みはrequestAnimationFrame内でまとめて行います。
 *
 * @returns {void}
 */
function updateSliderDom() {
  sliderRafPending = false;
  overlayDiv.style.width = (100 - sliderPercent) + '%';
  sliderHandle.style.left = sliderPercent + '%';
}

/**
 * 次のアニメーションフレームでスライダーのDOM更新を予約します。
 * ポインターイベントごとの不要なレイアウト計算と再描画を防ぎます。
 *
 * @returns {void}
 */
function scheduleSliderUpdate() {
  if (sliderRafPending) return;
  sliderRafPending = true;
  requestAnimationFrame(updateSliderDom);
}

/**
 * clientX座標を、スライダー左端を基準とした0〜100%の位置へ変換します。
 *
 * @param {number} clientX - ポインターのクライアントX座標。
 * @returns {number} 0〜100の範囲に収めた位置の割合。
 */
function clientXToPercent(clientX) {
  if (!sliderRect) return sliderPercent;
  const rawX = clientX - sliderRect.left;
  const clamped = Math.max(0, Math.min(rawX, sliderRect.width));
  return (clamped / sliderRect.width) * 100;
}

/**
 * ドラッグ終了時に共通して行う後処理です。
 * ドラッグ中のフラグを解除し、カーソルを元へ戻します。
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
 * スライダー操作と問い合わせフォームのファイル添付
 * ==============================================================
 *
 * 1. 画像比較スライダー
 * - マウス、タッチ、ペンのpointerdown／pointermove／pointerupを使ってドラッグを処理します。
 * - 左ボタンからのみ開始し、ポインターを捕捉してX座標を0〜100%へ変換します。
 * - requestAnimationFrameで滑らかに描画し、ドラッグ中はカーソルをew-resizeへ変更します。
 * - tabindex、role、aria-value属性を設定し、左右矢印キーで5%ずつ動かせるようにします。
 *
 * 2. 問い合わせフォームの添付UI
 * - ファイル選択とドラッグ＆ドロップによる複数ファイル追加に対応します。
 * - ファイル名の一覧、個別削除ボタン、重複排除、ドロップ領域の強調表示を提供します。
 * - DataTransfer APIで内部配列とinput.filesを同期し、同じファイルの再選択も可能にします。
 * - selectedFilesで状態を管理し、外部初期化用の__clearContactUploadFilesを公開します。
 *
 * 3. 問い合わせフォームの仮送信
 * - ページ移動を伴う既定の送信を止め、成功表示、フォームと添付の初期化を行います。
 * - 一定時間後に成功表示を隠します。バックエンドへデータは送信しません。
 *
 * キーボードとポインターの両方に対応し、各操作後のUI状態を同期します。
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
 * アップロードUIの下に、添付ファイル一覧の入れ物を作成して返します。
 *
 * 優先順位：
 * 1. 既存の#contact-upload-listを使用します。
 * 2. なければ.upload-file-list要素を作成し、最も近い.form-upload内、
 *    または代替としてinputの直後へ追加します。
 *
 * @returns {HTMLElement|null} 一覧の要素。作成できなければnull。
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
 * 問い合わせ添付ファイルの状態と一覧UI
 * =====================================================
 *
 * 選択された添付ファイルを内部配列で管理し、画面の一覧とinput.filesを同期します。
 * ファイル名・サイズ・最終更新日時を組み合わせて重複を防ぎ、各項目の削除ボタンから
 * 個別に取り除けます。ファイル選択とドラッグ＆ドロップの両方に対応し、
 * ドラッグ中はドロップ領域を強調します。
 *
 * 外部から添付を初期化できるよう、window.__clearContactUploadFilesを公開します。
 *
 * @module ContactAttachmentUpload
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
 * 問い合わせフォームの送信（フロントエンドのみの仮動作）
 * =====================================================
 *
 * 現在はバックエンドへ送信せず、送信時にページ再読み込みを止めて成功メッセージを表示し、
 * フォーム項目と添付ファイルを初期化します。成功メッセージは一定時間後に非表示にします。
 * 将来Node.js APIなどの送信先を実装するまで、自然な操作感を確認するための処理です。
 *
 * @module ContactFormMockSubmit
 */
const contactForm = document.getElementById('contact-form');
if (contactForm){
  contactForm.addEventListener('submit', function(e){
    e.preventDefault();
    document.getElementById('contact-success').style.display = 'block';
    contactForm.reset();
    // 仮送信後に選択済みの添付ファイルを消去します。
    if (typeof window.__clearContactUploadFiles === 'function') {
      window.__clearContactUploadFiles();
    }
    setTimeout(() => {
      document.getElementById('contact-success').style.display = 'none';
    }, 3000);
  });
}

// ==== 多言語対応（初期言語は英語／選択を保存する日英ドロップダウン） ====
(function(){
  const DICT = {
    en: {
      // ヘッダーとメニュー
      'header.title': 'Image Compare Slider',
      'menu.materials': 'Comparison Samples',
      'menu.info': 'Guide & Notes',
      'menu.about': 'About the Developer',
      'menu.contact': 'Requests & Bug Reports',

      // ホーム
      'home.title': 'Image Compare Slider',
      'upload.before': 'Choose Before Image',
      'upload.after': 'Choose After Image',
      'face.only': 'Face-only comparison (detect, align, and compare faces)',
      'btn.reset': 'Reset',
      'caption.halfface': 'Left: Before / Right: After',
      'msg.loading': 'Loading face detection models…',
      'msg.noFace': 'No face detected. Falling back to normal comparison.',

      // ウィザード
      'wizard.step.selectBefore': 'Select your BEFORE image to get started.',
      'wizard.step.beforeChoosing': 'Your BEFORE image is selected. Proceed when ready.',
      'wizard.step.selectAfter': 'Select your AFTER image next.',
      'wizard.step.afterChosen': 'AFTER image ready. Continue to the face-only option.',
      'wizard.step.faceToggle': 'Choose whether to enable face-only comparison.',
      'wizard.step.ready': 'All set! Press “Start Comparison” to view the result.',
      'wizard.next': 'Next',
      'wizard.start': 'Start Comparison',
      'wizard.hint.reset': 'Use reset if you want to run the comparison again.',

      // 素材
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

      // 情報
      'info.title': 'Guide & Notes',
      'info.format': 'Supported formats: JPEG, PNG, WebP',
      'info.size': 'Recommended size: Longest edge within 2000px',
      'info.storage': 'Uploaded images are not stored on the server',
      'info.usage': 'We do not misuse or redistribute your images',
      'info.contact': 'For issues or requests, use "Requests & Bug Reports"',
      
      // プライバシー
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

      // 概要
      'about.title': 'About the Developer',
      'about.desc': 'Yuuki, a Tokyo-based junior engineer, created this project as part of his learning journey. He is exploring various web technologies including Java, AWS, and JavaScript, and shares his work as a portfolio.',
      'about.howto': 'Use Cases',
      'about.howto.desc': 'This image comparison slider is useful for comparing landscapes, objects, people, faces, and outcomes.',

      // 問い合わせ
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
      // ヘッダーとメニュー
      'header.title': '画像比較スライダー',
      'menu.materials': '比較用使用素材',
      'menu.info': '利用案内・注意事項',
      'menu.about': '開発者・当サイト紹介',
      'menu.contact': '要望・バグ報告',

      // ホーム
      'home.title': '画像比較スライダー',
      'upload.before': 'ビフォー画像を選択',
      'upload.after': 'アフター画像を選択',
      'face.only': '顔だけ比較（顔を検出・整列して比較）',
      'btn.reset': 'リセット',
      'caption.halfface': '左：Before / 右：After',
      'msg.loading': '顔検出モデル読み込み中…',
      'msg.noFace': '顔が見つかりませんでした。通常比較になります。',

      // ウィザード
      'wizard.step.selectBefore': 'ビフォー画像を選択してください。',
      'wizard.step.beforeChoosing': 'ビフォー画像を選択しました。準備ができたら進んでください。',
      'wizard.step.selectAfter': '次にアフター画像を選択してください。',
      'wizard.step.afterChosen': 'アフター画像の選択が完了しました。顔モードの選択へ進みましょう。',
      'wizard.step.faceToggle': '顔だけ比較モードを使うか選択してください。',
      'wizard.step.ready': '準備完了です。「比較を開始」を押してください。',
      'wizard.next': '次へ',
      'wizard.start': '比較を開始',
      'wizard.hint.reset': 'もう一度比較する場合はリセットボタンを押してください。',

      // 素材
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

      // 情報
      'info.title': '利用案内・注意事項',
      'info.format': '対応画像フォーマット：JPEG, PNG, WebP',
      'info.size': '推奨サイズ：長辺2000px以内',
      'info.storage': 'アップロードされた画像はサーバに保存されません',
      'info.usage': '画像の悪用・転載は一切行いません',
      'info.contact': '不具合・ご要望は「要望・バグ報告」よりご連絡ください',

      // プライバシー
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

      // 概要
      'about.title': '開発者について',
      'about.desc': '東京都在住の駆け出しエンジニアYuukiが、学習の一環で制作しています。JavaやAWS、JavaScriptなど幅広くWeb技術を学び、ポートフォリオとして公開中です。',
      'about.howto': '用途概要',
      'about.howto.desc': 'この画像比較スライダーは主に風景画・対象物・人物像・人物の顔・成果物の比較を行いたい際に役立ちます。',
      // 問い合わせ
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
     * 多言語対応の中核処理（辞書描画と設定の保存）
     * =====================================================
     *
     * 1. 言語状態：localStorageのlangから開始し、未保存なら英語を使用して、変更後に保存します。
     * 2. 安全な文字描画：通常はtextContentを使い、HTML用文字を無害化してから改行だけを<br>へ変換します。
     * 3. 本文翻訳：data-i18n要素を対象範囲から探し、.i18n-textやフォーム部品を考慮して描画します。
     * 4. プレースホルダー：data-i18n-placeholderを別に走査し、inputやtextareaへ翻訳を設定します。
     * 5. 文書とUIの同期：htmlのlang属性と言語メニューの状態を更新し、初期化後はメニューを閉じます。
     *
     * SPAの全体文書だけでなく、指定した画面部分だけを翻訳することもできます。
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
   * 言語ドロップダウンUIの同期
   * =====================================================
   *
   * 現在の言語と、言語メニューの見た目および意味上の状態を同期します。
   * ボタンとメニューを安全に取得し、各data-lang項目をcurrentLangと比較します。
   *
   * 選択中の言語にはaria-disabled、buttonのdisabled、tabindex=-1を設定し、
   * is-current-langなどのクラスで無効状態を表示します。リンクの場合は
   * pointer-events-noneで操作を止めます。言語の変更・再翻訳後に呼び出します。
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

      // アクセシビリティ上の状態
      item.setAttribute('aria-disabled', isCurrent ? 'true' : 'false');

      // button要素では標準のdisabled属性を使用します。
      if (item.tagName === 'BUTTON') {
        item.disabled = isCurrent;
      }

      // 選択中の言語項目へフォーカスが移らないようにします
      if (isCurrent) item.setAttribute('tabindex', '-1');
      else item.removeAttribute('tabindex');

      // 無効状態の見た目（Tailwindと通常のCSSの両方に対応）
      item.classList.toggle('is-current-lang', isCurrent);
      item.classList.toggle('opacity-50', isCurrent);
      item.classList.toggle('cursor-not-allowed', isCurrent);

      // a要素では、選択中の項目に対するポインター操作を無効にします
      if (item.tagName === 'A') {
        item.classList.toggle('pointer-events-none', isCurrent);
      }
    });
  }

/**
   * window.appI18nとして公開する全体用の多言語ヘルパーです。
   * 文書全体または指定範囲への翻訳適用、現在の言語での再翻訳、言語コードの取得、
   * キーに対応する翻訳文の取得、低水準のrenderText処理を提供します。
   *
   * @namespace appI18n
   */
  window.appI18n = {
/**
     * 指定した言語（省略時は現在の言語）の翻訳を対象範囲へ適用し、言語メニューも更新します。
     * @param {string} [lang] - 適用する言語コード。
     * @param {ParentNode|HTMLElement|Document} [scope] - 翻訳範囲を限定する任意のルート要素。
     * @returns {void}
     */
    apply: function(lang, scope){
      applyI18n(typeof lang === 'string' ? lang : currentLang, scope);
      updateLangMenuUI();
    },
/**
     * 指定範囲を現在の言語で再翻訳し、言語メニューも更新します。
     * @param {ParentNode|HTMLElement|Document} [scope] - 翻訳範囲を限定する任意のルート要素。
     * @returns {void}
     */
    refresh: function(scope){
      applyI18n(currentLang, scope);
      updateLangMenuUI();
    },
/**
     * 現在選択されている言語コードを取得します。
     * @returns {string}
     */
    getCurrentLang: function(){
      return currentLang;
    },
/**
     * キーに対応する翻訳文を取得します。見つからない場合はnullを返します。
     * @param {string} key - i18n辞書のキー。
     * @returns {string|null}
     */
    getText: function(key){
      const dict = DICT[currentLang] || {};
      const txt = dict[key];
      return (typeof txt === 'string') ? txt : null;
    },
/**
     * 翻訳済みの文字列をDOM要素へ描画します。
     * @param {HTMLElement} node - 描画先の要素。
     * @param {string} str - 描画する文字列。
     * @returns {void}
     */
    renderText: renderText
  };
/**
   * 顔処理用のデバッグ補助機能です。
   * #face-debug要素がある場合、時刻付きのJSONログを先頭へ追加し、件数に上限を設けます。
   *
   * @param {string} label - ログの内容を示す短い名前。
   * @param {*} payload - JSON文字列へ変換して記録する任意のデータ。
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
 * 素材画面のアコーディオンUI（展開／折りたたみ）
 * =====================================================
 *
 * 素材画面で使用するアコーディオンを初期化して管理します。
 * 各.acc-toggleが対応する.acc-contentを開閉し、scrollHeightを使って
 * 高さ0からautoまで滑らかにアニメーションします。
 *
 * 新しい項目を開くと他の項目を閉じる単一展開方式です。aria-expandedで状態を示し、
 * EnterキーとSpaceキーでも操作できます。aria-expanded=trueの項目は最初から開きます。
 * IIFEとして読み込み時に一度実行され、SPA形式の画面移動にも対応します。
 *
 * @module MaterialsAccordion
 */
(function initMaterialsAccordion(){
  const root = document.querySelector('#materials');
  if (!root) return;

  const toggles = root.querySelectorAll('.acc-toggle');

/**
   * 1つのアコーディオン項目を開閉します。
   * scrollHeightを使って高さを0とautoの間で動かし、表示状態とaria-expandedを同期します。
   *
   * @param {HTMLButtonElement} btn - アコーディオンの開閉ボタン。
   * @param {boolean} open - trueなら開き、falseなら閉じます。
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
   * `btn`に対応する項目を除き、すべてのアコーディオン項目を閉じます。
   * 新しい見出しを操作したとき、開いている項目が1つだけになるようにします。
   *
   * @param {HTMLButtonElement} btn - 開いたままにする項目のボタン。
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
 * 素材画像のライトボックス（画像表示と移動）
 * =====================================================
 *
 * 素材画面の画像を拡大表示するライトボックスを提供します。
 * サムネイルのクリックで同じグリッド内の画像一覧を取得して開き、左右矢印キーで
 * 循環移動できます。背景、閉じるボタン、Escapeキーで閉じます。
 *
 * 表示中の画像はダウンロードまたは別タブで開けます。pointerdown／pointermove中は
 * サムネイルを強調し、タッチ操作でも指の移動に追従します。表示時は閉じるボタンへ
 * フォーカスを移し、背景スクロールを止めます。閉じたときは画像一覧と位置を初期化します。
 * IIFEとして読み込み時に一度実行され、SPA形式の画面構成で動作します。
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
   * 現在表示している画像のダウンロードリンクを設定します。
   * URLからクエリ文字列を除いた適切なファイル名を取得し、専用リンクのhrefとdownloadへ設定します。
   *
   * @param {string} src - ダウンロード対象の画像URL。
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
   * 現在の画像一覧にある指定位置の画像をライトボックスで開きます。
   * 位置を有効範囲に収め、画像のsrcとalt、ダウンロードリンクを更新してオーバーレイを表示します。
   *
   * @param {number} idx - currentList内で表示する画像の位置。
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
   * ライトボックスを閉じ、現在の状態を初期化します。
   * オーバーレイを隠して画像のsrcを削除し、背景スクロールを戻して画像一覧と位置を消去します。
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
  * クリックされたサムネイルを起点にライトボックスを開きます。
  * 同じ.materials-grid内のサムネイルをすべて取得して現在の一覧へ保存し、
  * クリックされた画像の位置から表示します。
  *
  * @param {HTMLImageElement} thumb - クリックされたサムネイル画像。
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
  * pointerdownされたサムネイルを強調表示します。
  * 特にタッチ端末で即座に反応が分かるよう、対象へ.is-active-thumbを追加し、
  * 以前の対象から強調表示を削除します。
  *
  * @listens PointerEvent#pointerdown
  * @param {PointerEvent} e - サムネイルに触れたときのポインターイベント。
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
  * ポインターの移動中、強調表示するサムネイルを継続的に更新します。
  * 指などが複数の画像上を移動すると、現在の画像へ.is-active-thumbを追加し、
  * 以前の画像から削除します。pointerdownされていないときの移動は無視します。
  *
  * @listens PointerEvent#pointermove
  * @param {PointerEvent} e - ポインター移動中に発生したイベント。
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

  // ポインター操作が終了または中止されたら強調表示を解除します
/**
  * サムネイルの強調状態を解除し、ポインター追跡を終了します。
  * pointerup／pointercancelで使用します。イベント対象がimgでなくてもよいため、
  * サムネイル外で指やボタンを離した場合にも動作します。
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
  * 素材画面内の全サムネイルを対象とするイベント委譲のクリック処理です。
  * .material-set内のimgがクリックされたことを検出し、その画像からライトボックスを開きます。
  * 既定のリンク移動は停止し、ライトボックスでの表示を優先します。
  *
  * @param {MouseEvent} e - 素材画面のルートから届いたクリックイベント。
  * @returns {void}
  */
  materialsRoot.addEventListener('click', (e) => {
    const t = e.target;
    if (t && t.tagName === 'IMG' && t.closest('.material-set')) {
      e.preventDefault();
      openFromThumb(t);
    }
  });

  // 閉じる操作
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  closeBtn.addEventListener('click', close);

  // 新しいタブで開きます
  openBtn.addEventListener('click', () => { if (imgEl.src) window.open(imgEl.src, '_blank', 'noopener'); });

  // ライトボックス内のキーボード操作
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
