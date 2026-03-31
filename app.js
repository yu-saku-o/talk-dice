// ── Three.js D20 Talk Dice ──────────────────────────────────────

let scene, camera, renderer, dice, animationId;
let isRolling = false;
let lastThemeIndex = -1;

const canvas = document.getElementById('dice-canvas');
const themeCard = document.getElementById('theme-card');
const themeEmoji = document.getElementById('theme-emoji');
const themeText = document.getElementById('theme-text');
const sheetBadge = document.getElementById('sheet-badge');
const rollBtn = document.getElementById('roll-btn');
const tapHint = document.getElementById('tap-hint');

// ── カラフル「???」テクスチャ生成 ────────────────────────────
function createQuestionTexture() {
  const tileSize = 200;
  const cols = 4;
  const rows = 5;
  const w = tileSize * cols;
  const h = tileSize * rows;

  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');

  // 面ごとに異なるカラーパレット（20色 = D20の面数）
  const colors = [
    '#E84040', '#FF6B35', '#FF9F43', '#FFD43B',
    '#2ECC71', '#1ABC9C', '#3498DB', '#5B4EFF',
    '#9B59B6', '#E91E8C', '#FF4081', '#FF6D00',
    '#00BCD4', '#43A047', '#F4511E', '#AB47BC',
    '#EC407A', '#26C6DA', '#66BB6A', '#FFA726',
  ];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const idx = row * cols + col;
      const x = col * tileSize;
      const y = row * tileSize;

      // 背景色
      ctx.fillStyle = colors[idx % colors.length];
      ctx.fillRect(x, y, tileSize, tileSize);

      // 内側の白い角丸ボーダー
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.roundRect(x + 8, y + 8, tileSize - 16, tileSize - 16, 20);
      ctx.stroke();

      // 「???」テキスト
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 60px "Hiragino Sans", "Arial Black", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('???', x + tileSize / 2, y + tileSize / 2 + 3);
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2.2, 1.8);
  return tex;
}

// ── Scene setup ────────────────────────────────────────────────
function initThree() {
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;

  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
  camera.position.set(0, 0, 4.5);

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setSize(w, h);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);

  // D20 ジオメトリ
  const geo = new THREE.IcosahedronGeometry(1.4, 0);

  // 「?」テクスチャを貼ったメインフェイス
  const faceMat = new THREE.MeshPhongMaterial({
    map: createQuestionTexture(),
    flatShading: true,
    shininess: 30,
  });
  const faceMesh = new THREE.Mesh(geo, faceMat);

  // 白いエッジライン（各面の輪郭を強調して物理的なサイコロ感を演出）
  const edgeGeo = new THREE.EdgesGeometry(geo);
  const edgeMat = new THREE.LineBasicMaterial({
    color: 0xFFFFFF,
    opacity: 0.55,
    transparent: true,
  });
  const edgeLines = new THREE.LineSegments(edgeGeo, edgeMat);

  dice = new THREE.Group();
  dice.add(faceMesh);
  dice.add(edgeLines);
  scene.add(dice);

  // 明るく温かみのあるライティング
  const ambient = new THREE.AmbientLight(0xffffff, 0.75);
  scene.add(ambient);

  const keyLight = new THREE.PointLight(0xFFE0C0, 2.0, 20); // 暖色キーライト
  keyLight.position.set(3, 4, 5);
  scene.add(keyLight);

  const rimLight = new THREE.PointLight(0xFFAA44, 0.7, 20); // オレンジリムライト
  rimLight.position.set(-4, -2, 3);
  scene.add(rimLight);

  idleAnimate();
}

// ── Idle slow rotation ─────────────────────────────────────────
function idleAnimate() {
  animationId = requestAnimationFrame(idleAnimate);
  dice.rotation.x += 0.004;
  dice.rotation.y += 0.006;
  renderer.render(scene, camera);
}

// ── Roll animation ─────────────────────────────────────────────
function rollDice() {
  if (isRolling) return;
  isRolling = true;
  rollBtn.disabled = true;
  tapHint.classList.add('hidden');
  themeCard.classList.remove('show', 'animate');
  themeCard.classList.add('empty');
  themeText.textContent = 'サイコロを振っています…';
  themeEmoji.textContent = '';
  sheetBadge.style.display = 'none';

  cancelAnimationFrame(animationId);

  const startTime = performance.now();
  const duration = 2000;

  const targetX = dice.rotation.x + (Math.PI * 5 + Math.random() * Math.PI * 4);
  const targetY = dice.rotation.y + (Math.PI * 5 + Math.random() * Math.PI * 4);
  const startX = dice.rotation.x;
  const startY = dice.rotation.y;

  function rollFrame(now) {
    const elapsed = now - startTime;
    const t = Math.min(elapsed / duration, 1);
    // Ease out cubic
    const ease = 1 - Math.pow(1 - t, 3);

    dice.rotation.x = startX + (targetX - startX) * ease;
    dice.rotation.y = startY + (targetY - startY) * ease;
    renderer.render(scene, camera);

    if (t < 1) {
      animationId = requestAnimationFrame(rollFrame);
    } else {
      isRolling = false;
      rollBtn.disabled = false;
      showTheme();
      idleAnimate();
    }
  }

  animationId = requestAnimationFrame(rollFrame);
}

// ── Show random theme ──────────────────────────────────────────
function showTheme() {
  let idx;
  do {
    idx = Math.floor(Math.random() * THEMES.length);
  } while (idx === lastThemeIndex && THEMES.length > 1);
  lastThemeIndex = idx;

  const theme = THEMES[idx];

  themeCard.classList.remove('empty', 'animate');
  void themeCard.offsetWidth; // reflow to restart animation
  themeCard.classList.add('show', 'animate');

  themeEmoji.textContent = theme.emoji;
  themeText.textContent = theme.text;
  sheetBadge.style.display = theme.useSheet ? 'inline-flex' : 'none';

  tapHint.classList.remove('hidden');
  tapHint.textContent = 'もう一度タップして振り直せるよ！';
}

// ── Resize handler ─────────────────────────────────────────────
window.addEventListener('resize', () => {
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
});

// ── Event listeners ────────────────────────────────────────────
rollBtn.addEventListener('click', rollDice);
canvas.addEventListener('click', rollDice);
canvas.addEventListener('touchend', (e) => { e.preventDefault(); rollDice(); }, { passive: false });

// ── Init ───────────────────────────────────────────────────────
window.addEventListener('load', () => {
  initThree();
});
