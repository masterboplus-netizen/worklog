// === СЛЕПОЙ СЕЙФ (PIN-кольцо) — v5 ФИНАЛ ===
const SAFE_TARGETS = [5, 11, 2];
const SAFE_HOLD_MS = 600;
const SAFE_PIN = '201186';
let SAFE_INPUTS = [];
let SAFE_ACTIVE = false;
let SAFE_LOCKED = false;

function _safeAngle(cx, cy, x, y) {
  let a = Math.atan2(y - cy, x - cx) * 180 / Math.PI + 90;
  if (a < 0) a += 360;
  if (a >= 360) a -= 360;
  return a;
}

function _safeVibrate(ms) {
  try { if (navigator.vibrate) navigator.vibrate(ms); } catch(e) {}
}

function showSafe() {
  SAFE_INPUTS = [];
  SAFE_LOCKED = false;
  SAFE_ACTIVE = false;
  const screen = document.getElementById('scroll-pin-screen');
  if (!screen) return;

  screen.style.display = 'flex';
  screen.style.position = 'fixed';
  screen.style.top = '0'; screen.style.left = '0';
  screen.style.width = '100vw'; screen.style.height = '100vh';
  screen.style.zIndex = '9999';
  screen.style.alignItems = 'center';
  screen.style.justifyContent = 'center';
  screen.style.backgroundColor = 'var(--bg)';
  
  const dash = document.getElementById('dashboard');
  if (dash) dash.style.display = 'none';
  const tabs = document.querySelector('.tabs');
  if (tabs) tabs.style.display = 'none';

  _safeBind();
}

function _safeHide() {
  const screen = document.getElementById('scroll-pin-screen');
  if (screen) screen.style.display = 'none';
}

function _safeBind() {
  const box = document.getElementById('safe-dial-container');
  const hitbox = document.querySelector('.safe-dial-hitbox');
  const lens = document.getElementById('safe-dial-touch-effect');
  const ring = document.getElementById('safe-dial-ring');
  if (!box || !lens || !ring) return;

  const targets = [box, hitbox, document.getElementById('safe-dial-svg')].filter(Boolean);
  let timer = null;
  let lastSector = -1;

  const getCenter = () => {
    const r = box.getBoundingClientRect();
    return { cx: r.left + r.width/2, cy: r.top + r.height/2 };
  };

  const resetRing = () => {
    ring.setAttribute('stroke', '#FFA500');
    ring.style.filter = 'drop-shadow(0 0 10px rgba(255,165,0,0.8))';
  };

  const flashError = () => {
    ring.setAttribute('stroke', '#ff3b30');
    ring.style.filter = 'drop-shadow(0 0 16px rgba(255,59,48,0.9))';
    _safeVibrate([50, 50, 50]);
    setTimeout(resetRing, 350);
  };

  const commitSector = (sector) => {
    const idx = SAFE_INPUTS.length;
    if (SAFE_TARGETS[idx] === sector) {
      SAFE_INPUTS.push(sector);
      _safeVibrate(30);
      ring.style.transform = 'scale(0.97)';
      setTimeout(() => { ring.style.transform = 'scale(1)'; }, 90);
      if (SAFE_INPUTS.length === SAFE_TARGETS.length) {
        SAFE_LOCKED = true;
        _safeUnlock();
      }
    } else {
      SAFE_INPUTS = [];
      flashError();
    }
  };

  const _safeUnlock = async () => {
    try {
      const ok = await tryUnlock(SAFE_PIN);
      if (ok) {
        _safeHide();
        const dash = document.getElementById('dashboard');
        if (dash) { dash.classList.remove('hidden'); dash.style.display = 'flex'; }
        const tabs = document.querySelector('.tabs');
        if (tabs) tabs.style.display = 'flex';
        const l = document.getElementById('loading');
        if (l) l.remove();
        renderDashboard();
      } else {
        SAFE_INPUTS = []; SAFE_LOCKED = false; flashError();
      }
    } catch(e) {
      SAFE_INPUTS = []; SAFE_LOCKED = false; flashError();
    }
  };

  const handleStart = (e) => {
    if (SAFE_LOCKED) return;
    e.preventDefault();
    SAFE_INPUTS = [];
    SAFE_ACTIVE = true;
    lastSector = -1;
    if (timer) { clearTimeout(timer); timer = null; }
    resetRing();
    const t = e.touches[0];
    lens.classList.add('active');
    lens.style.left = (t.clientX - box.getBoundingClientRect().left) + 'px';
    lens.style.top  = (t.clientY - box.getBoundingClientRect().top)  + 'px';
  };

  const handleMove = (e) => {
    if (!SAFE_ACTIVE || SAFE_LOCKED) return;
    e.preventDefault();
    const t = e.touches[0];
    const { cx, cy } = getCenter();
    const r = box.getBoundingClientRect();

    lens.style.left = (t.clientX - r.left) + 'px';
    lens.style.top  = (t.clientY - r.top)  + 'px';

    const angle = _safeAngle(cx, cy, t.clientX, t.clientY);
    const sector = Math.floor(angle / 30) % 12;

    if (sector !== lastSector) {
      lastSector = sector;
      if (timer) { clearTimeout(timer); timer = null; }
      if (SAFE_TARGETS[SAFE_INPUTS.length] === sector) _safeVibrate(30);
      timer = setTimeout(() => {
        if (lastSector === sector) commitSector(sector);
      }, SAFE_HOLD_MS);
    }
  };

  const handleEnd = (e) => {
    if (e) e.preventDefault();
    SAFE_ACTIVE = false;
    if (timer) { clearTimeout(timer); timer = null; }
    lens.classList.remove('active');
  };

  targets.forEach(t => {
    t.ontouchstart = handleStart;
    t.ontouchmove = handleMove;
    t.ontouchend = handleEnd;
    t.ontouchcancel = handleEnd;
  });
}
