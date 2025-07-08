window.addEventListener('DOMContentLoaded', () => {
  const imgWrapper = document.getElementById('imgWrapper');
  const imgOverlay = document.getElementById('imgOverlay');
  const sliderHandle = document.getElementById('sliderHandle');
  const beforeImage = document.getElementById('beforeImage');
  const afterImage = document.getElementById('afterImage');

  let isDragging = false;

  // モデル読み込み（models フォルダから）
  Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri('./models')
  ]).then(() => {
    console.log('FaceAPIモデル読み込み完了');
    // 2. afterImageが読み込まれてから顔検出を行う
    if (afterImage.complete) {
      detectFace(); // 画像がすでに読み込まれている場合
    } else {
      afterImage.addEventListener('load', detectFace);
    }
  })
  .catch((err) => {
    console.error('❌ モデル読み込みエラー:', err);
  });

async function detectFace() {
  console.log('🔍 detectFace 実行開始');

  const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 320 }); // 軽量オプション
  const detection = await faceapi.detectSingleFace(afterImage, options);

  if (detection) {
    const box = detection.box;
    const centerX = box.x + box.width / 2;
    const imgWidth = afterImage.width;
    const offsetPercent = (centerX / imgWidth) * 100;
    updateSlider(offsetPercent);
  } else {
    console.log('⚠️ 顔検出できませんでした。50%スタート');
    updateSlider(50);
  }
    // ドラッグを有効化
    enableDragging();
}

// スライダー位置を更新する関数
function updateSlider(percent) {
  console.log("スライダー位置更新:", percent);
  imgOverlay.style.width = `${percent}%`;
  sliderHandle.style.left = `${percent}%`;
}

function enableDragging() {
  console.log('🛠 enableDragging 実行');

  sliderHandle.addEventListener('mousedown', startDrag);
  sliderHandle.addEventListener('touchstart', startDrag);

  document.addEventListener('mousemove', onDrag);
  document.addEventListener('touchmove', onDrag);

  document.addEventListener('mouseup', stopDrag);
  document.addEventListener('touchend', stopDrag);
}

function startDrag(e) {
  isDragging = true;
  console.log("ドラッグ開始！");
  e.preventDefault();
}

function stopDrag() {
  isDragging = false;
  console.log('🔴 ドラッグ終了');
}

function onDrag(e) {
  if (!isDragging) return;

  console.log("マウス移動中");

  let clientX;
  if (e.touches) {
    clientX = e.touches[0].clientX;
  } else {
    clientX = e.clientX;
  }

  const rect = imgWrapper.getBoundingClientRect();
  let position = clientX - rect.left;

  if (position < 0) position = 0;
  if (position > rect.width) position = rect.width;

  const percent = (position / rect.width) * 100;
  updateSlider(percent);
}
});