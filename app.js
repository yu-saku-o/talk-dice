// ── トークダイス (CSS 3D dice) ─────────────────────────────────
// Theme data lives in themes.js (CATEGORIES / THEMES).

(function () {
  'use strict';

  const ROLL_MS = 1600;
  const QUICK_MS = 900;
  const RECENT_MAX = 12; // avoid repeating the last N themes (N = half the pool, max 12)
  const FACE_POS = ['front', 'right', 'back', 'left', 'top', 'bottom'];
  // Cube rotation [x, y] (deg) that brings each face to the front
  const FACE_ROT = {
    front: [0, 0], right: [0, -90], back: [0, -180],
    left: [0, 90], top: [-90, 0], bottom: [90, 0],
  };
  const LEVEL_LABEL = { 1: '👋 はじめまして', 2: '😊 打ち解けてきた' };

  const $ = (id) => document.getElementById(id);
  const cube = $('cube');
  const diceWrap = $('dice-wrap');
  const rollBtn = $('roll-btn');
  const passBtn = $('pass-btn');
  const shakeBtn = $('shake-btn');
  const result = $('result');
  const howto = $('howto');
  const burst = $('burst');
  const toast = $('toast');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  const store = {
    get(key, fallback) {
      try { const v = sessionStorage.getItem('talkdice:' + key); return v ? JSON.parse(v) : fallback; }
      catch (e) { return fallback; }
    },
    set(key, value) {
      try { sessionStorage.setItem('talkdice:' + key, JSON.stringify(value)); } catch (e) { /* ignore */ }
    },
  };

  const state = {
    level: store.get('level', 1) === 2 ? 2 : 1,
    cat: store.get('cat', 'all'),
    recent: store.get('recent', []),
    rolling: false,
    rot: { x: 0, y: 0 },
  };
  if (state.cat !== 'all' && !CATEGORIES.some((c) => c.id === state.cat)) state.cat = 'all';

  // ── Build dice faces & category chips ─────────────────────────
  const facePosOf = {};
  CATEGORIES.forEach((c, i) => {
    const pos = FACE_POS[i];
    facePosOf[c.id] = pos;
    const face = document.createElement('div');
    face.className = 'face c-' + c.id;
    face.dataset.pos = pos;
    face.innerHTML = '<span class="face-emoji"></span><span class="face-label"></span>';
    face.firstChild.textContent = c.emoji;
    face.lastChild.textContent = c.short;
    cube.appendChild(face);
  });

  const chips = $('cat-chips');
  [{ id: 'all', short: 'おまかせ', label: 'おまかせ', emoji: '🎲' }].concat(CATEGORIES).forEach((c) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    b.dataset.cat = c.id;
    b.innerHTML = '<span class="chip-emoji" aria-hidden="true"></span><span class="chip-label"></span>';
    b.firstChild.textContent = c.emoji;
    b.lastChild.textContent = c.short;
    b.setAttribute('aria-label', c.label);
    chips.appendChild(b);
  });

  function syncControls() {
    document.querySelectorAll('.seg-btn').forEach((b) => {
      b.setAttribute('aria-pressed', String(Number(b.dataset.level) === state.level));
    });
    document.querySelectorAll('.chip').forEach((b) => {
      b.setAttribute('aria-pressed', String(b.dataset.cat === state.cat));
    });
  }
  syncControls();

  $('level-seg').addEventListener('click', (e) => {
    const b = e.target.closest('.seg-btn');
    if (!b || state.rolling) return;
    state.level = Number(b.dataset.level);
    store.set('level', state.level);
    syncControls();
  });
  chips.addEventListener('click', (e) => {
    const b = e.target.closest('.chip');
    if (!b || state.rolling) return;
    state.cat = b.dataset.cat;
    store.set('cat', state.cat);
    syncControls();
  });

  // ── Theme picking (avoid recent history) ──────────────────────
  function pickTheme() {
    let pool = THEMES.filter((t) => t.level === state.level && (state.cat === 'all' || t.cat === state.cat));
    if (!pool.length) pool = THEMES.filter((t) => state.cat === 'all' || t.cat === state.cat);
    if (!pool.length) pool = THEMES;
    const avoidN = Math.min(RECENT_MAX, Math.ceil(pool.length / 2), pool.length - 1);
    const avoid = new Set(state.recent.slice(-avoidN));
    const candidates = avoidN > 0 ? pool.filter((t) => !avoid.has(t.id)) : pool;
    const list = candidates.length ? candidates : pool;
    const theme = list[Math.floor(Math.random() * list.length)];
    state.recent = state.recent.filter((id) => id !== theme.id).concat(theme.id).slice(-30);
    store.set('recent', state.recent);
    return theme;
  }

  // ── Dice rotation ─────────────────────────────────────────────
  function turnTo(pos, instant, ms) {
    const [fx, fy] = FACE_ROT[pos];
    let x, y;
    if (instant) {
      x = fx; y = fy;
    } else {
      const spinX = 2 + Math.floor(Math.random() * 2);
      const spinY = 2 + Math.floor(Math.random() * 2);
      x = Math.ceil(state.rot.x / 360) * 360 + 360 * spinX + fx;
      y = Math.ceil(state.rot.y / 360) * 360 + 360 * spinY + fy;
    }
    state.rot = { x, y };
    cube.style.transition = instant ? 'none' : 'transform ' + ms + 'ms cubic-bezier(0.18, 0.75, 0.22, 1)';
    cube.style.transform = 'rotateX(' + x + 'deg) rotateY(' + y + 'deg)';
  }

  function sparkle() {
    if (reduceMotion.matches) return;
    burst.innerHTML = '';
    const colors = ['#FF7F72', '#21c290', '#C9A84C', '#ffb3aa'];
    for (let i = 0; i < 14; i++) {
      const dot = document.createElement('i');
      const a = (Math.PI * 2 * i) / 14;
      const r = 80 + Math.random() * 40;
      dot.style.setProperty('--x', Math.cos(a) * r + 'px');
      dot.style.setProperty('--y', Math.sin(a) * r + 'px');
      dot.style.background = colors[i % colors.length];
      burst.appendChild(dot);
    }
  }

  // ── Roll ──────────────────────────────────────────────────────
  function roll(opts) {
    if (state.rolling) return;
    const quick = !!(opts && opts.quick);
    const instant = reduceMotion.matches;
    const theme = pickTheme();
    state.rolling = true;
    rollBtn.disabled = true;
    passBtn.disabled = true;

    diceWrap.classList.remove('is-landed', 'is-rolling', 'is-quick');
    void diceWrap.offsetWidth; // restart animations
    if (!instant) {
      diceWrap.classList.add('is-rolling');
      if (quick) diceWrap.classList.add('is-quick');
    }
    turnTo(facePosOf[theme.cat], instant, quick ? QUICK_MS : ROLL_MS);

    const done = () => {
      state.rolling = false;
      rollBtn.disabled = false;
      passBtn.disabled = false;
      diceWrap.classList.remove('is-rolling', 'is-quick');
      diceWrap.classList.add('is-landed');
      sparkle();
      const activated = !navigator.userActivation || navigator.userActivation.hasBeenActive;
      if (navigator.vibrate && !instant && activated) { try { navigator.vibrate(30); } catch (e) { /* ignore */ } }
      showTheme(theme, instant);
    };
    if (instant) done();
    else setTimeout(done, quick ? QUICK_MS : ROLL_MS);
  }

  function showTheme(t, instant) {
    const cat = CATEGORIES.find((c) => c.id === t.cat);
    const catChip = $('r-cat');
    catChip.className = 'cat-chip c-' + t.cat;
    catChip.textContent = cat.emoji + ' ' + cat.label;
    $('r-level').textContent = LEVEL_LABEL[t.level];
    $('r-emoji').textContent = t.emoji || cat.emoji;
    $('r-title').textContent = t.title;
    $('r-q').textContent = '「' + t.q + '」';
    $('r-dig').textContent = t.dig;
    $('r-sheet').hidden = !t.sheet;

    howto.hidden = true;
    result.hidden = false;
    result.classList.remove('pop');
    void result.offsetWidth;
    if (!instant) result.classList.add('pop');

    const rect = result.getBoundingClientRect();
    if (rect.top > window.innerHeight * 0.55 || rect.bottom > window.innerHeight) {
      result.scrollIntoView({ behavior: instant ? 'auto' : 'smooth', block: 'start' });
    }
  }

  let toastTimer;
  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 1800);
  }

  rollBtn.addEventListener('click', () => roll());
  diceWrap.addEventListener('click', () => roll());
  diceWrap.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); roll(); }
  });
  passBtn.addEventListener('click', () => {
    if (state.rolling) return;
    showToast('パスOK！次のテーマにしよう 🙆');
    roll({ quick: true });
  });

  // ── Shake to roll (optional; iOS needs permission) ────────────
  let shakeOn = false;
  let lastShake = 0;
  let lastAcc = null;
  function onMotion(e) {
    const a = e.accelerationIncludingGravity;
    if (!a || a.x == null) return;
    if (lastAcc) {
      const delta = Math.abs(a.x - lastAcc.x) + Math.abs(a.y - lastAcc.y) + Math.abs(a.z - lastAcc.z);
      const now = Date.now();
      if (delta > 28 && now - lastShake > 1800 && !state.rolling) {
        lastShake = now;
        roll();
      }
    }
    lastAcc = { x: a.x, y: a.y, z: a.z };
  }
  function setShake(on) {
    shakeOn = on;
    shakeBtn.setAttribute('aria-pressed', String(on));
    $('shake-label').textContent = on ? 'シェイクON：スマホを振ってもふれます' : 'スマホを振ってもOKにする';
    if (on) window.addEventListener('devicemotion', onMotion);
    else { window.removeEventListener('devicemotion', onMotion); lastAcc = null; }
  }
  const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  if (typeof window.DeviceMotionEvent !== 'undefined' && isTouch) {
    shakeBtn.hidden = false;
    shakeBtn.setAttribute('aria-pressed', 'false');
    shakeBtn.addEventListener('click', () => {
      if (shakeOn) { setShake(false); return; }
      const req = window.DeviceMotionEvent.requestPermission;
      if (typeof req === 'function') {
        req.call(window.DeviceMotionEvent)
          .then((res) => {
            if (res === 'granted') setShake(true);
            else showToast('許可されなかったので、ボタンでふってね');
          })
          .catch(() => showToast('この端末ではボタンでふってね'));
      } else {
        setShake(true);
      }
    });
  }
})();
