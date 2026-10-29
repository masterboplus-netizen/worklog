// === СЛЕПОЙ СЕЙФ (v18 - Трещотка + Задержка 1.5с) ===
const SAFE_TARGET_SECTORS = [5, 11, 2];
const SAFE_PIN = '201186';
const HOLD_TIME_MS = 1500; // 1.5 секунды на удержание

let SAFE_ROTATION = 0;
let SAFE_STEP = 0;
let SAFE_ACTIVE = false;
let SAFE_LOCKED = false;

let START_TOUCH_ANGLE = 0;
let START_RING_ROTATION = 0;
let TOTAL_TOUCH_DELTA = 0;
let HOLD_TIMER = null;
let CURRENT_SECTOR = -1;
let LAST_VIB_STEP = 0;

function _safeAngle(cx, cy, x, y) {
  let a = Math.atan2(y - cy, x - cx) * 180 / Math.PI + 90;
  if (a < 0) a += 360;
  return a;
}

function _safeVibrate(ms) {
  try { if (navigator.vibrate) navigator.vibrate(ms); } catch(e) {}
}

function showSafe() {
  SAFE_ROTATION = 0;
  SAFE_STEP = 0;
  SAFE_ACTIVE = false;
  SAFE_LOCKED = false;
  CURRENT_SECTOR = -1;
  LAST_VIB_STEP = 0;
  
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

  const rot = document.getElementById('safe-dial-rotator');
  if (rot) rot.style.transform = 'rotate(0deg)';
  
  _safeBind();
}

function _safeHide() {
  const screen = document.getElementById('scroll-pin-screen');
  if (screen) screen.style.display = 'none';
}

function _safeBind() {
  const box = document.getElementById('safe-dial-container');
  const rot = document.getElementById('safe-dial-rotator');
  const lens = document.getElementById('safe-dial-lens');
  
  if (!box || !rot) return;

  const getCenter = () => {
    const r = box.getBoundingClientRect();
    return { cx: r.left + r.width/2, cy: r.top + r.height/2 };
  };

  const resetHold = () => {
    if (HOLD_TIMER) { clearTimeout(HOLD_TIMER); HOLD_TIMER = null; }
  };

  box.ontouchstart = null;
  box.ontouchmove = null;
  box.ontouchend = null;

  box.addEventListener('touchstart', (e) => {
    if (SAFE_LOCKED) return;
    e.preventDefault();
    SAFE_ACTIVE = true;
    TOTAL_TOUCH_DELTA = 0;
    
    const t = e.touches[0];
    const { cx, cy } = getCenter();
    
    START_TOUCH_ANGLE = _safeAngle(cx, cy, t.clientX, t.clientY);
    START_RING_ROTATION = SAFE_ROTATION;
    
    // Определяем текущий шаг трещотки при старте
    let currentAngleMod = SAFE_ROTATION % 360;
    if (currentAngleMod < 0) currentAngleMod += 360;
    LAST_VIB_STEP = Math.floor(currentAngleMod / 15);
    
    if (lens) {
      lens.classList.add('active');
      const r = box.getBoundingClientRect();
      lens.style.left = (t.clientX - r.left) + 'px';
      lens.style.top  = (t.clientY - r.top)  + 'px';
    }
    
    resetHold();
  }, { passive: false });

  box.addEventListener('touchmove', (e) => {
    if (!SAFE_ACTIVE || SAFE_LOCKED) return;
    e.preventDefault();
    const t = e.touches[0];
    const { cx, cy } = getCenter();
    const r = box.getBoundingClientRect();
    
    if (lens) {
      lens.style.left = (t.clientX - r.left) + 'px';
      lens.style.top  = (t.clientY - r.top)  + 'px';
    }

    const currentAngle = _safeAngle(cx, cy, t.clientX, t.clientY);
    let deltaAngle = currentAngle - START_TOUCH_ANGLE;
    
    if (deltaAngle > 180) deltaAngle -= 360;
    if (deltaAngle < -180) deltaAngle += 360;
    
    TOTAL_TOUCH_DELTA += deltaAngle;
    START_TOUCH_ANGLE = currentAngle;

    SAFE_ROTATION = START_RING_ROTATION + TOTAL_TOUCH_DELTA;
    rot.style.transform = `rotate(${SAFE_ROTATION}deg)`;
    
    // --- ЛОГИКА ТРЕЩОТКИ (каждые 15 градусов) ---
    let currentAngleMod = SAFE_ROTATION % 360;
    if (currentAngleMod < 0) currentAngleMod += 360;
    const vibStep = Math.floor(currentAngleMod / 15);
    
    if (vibStep !== LAST_VIB_STEP) {
      _safeVibrate(10); // Легкая вибрация
      LAST_VIB_STEP = vibStep;
    }
    
    // --- ЛОГИКА СЕКТОРОВ (12 секторов по 30 град) ---
    const sector = Math.floor(currentAngleMod / 30);
    
    if (sector !== CURRENT_SECTOR) {
      CURRENT_SECTOR = sector;
      resetHold();
      
      if (SAFE_TARGET_SECTORS[SAFE_STEP] === sector) {
        // Вход в правильный сектор. Ждем 1.5 секунды.
        HOLD_TIMER = setTimeout(() => {
          _safeVibrate(60); // Сильная вибрация при успехе
          SAFE_STEP++;
          
          if (SAFE_STEP === SAFE_TARGET_SECTORS.length) {
            SAFE_LOCKED = true;
            _safeUnlock();
          }
        }, HOLD_TIME_MS);
      }
    }
  }, { passive: false });

  const endTouch = (e) => {
    if (e) e.preventDefault();
    SAFE_ACTIVE = false;
    if (lens) lens.classList.remove('active');
    resetHold();
    START_RING_ROTATION = SAFE_ROTATION;
    CURRENT_SECTOR = -1;
  };

  box.addEventListener('touchend', endTouch, { passive: false });
  box.addEventListener('touchcancel', endTouch, { passive: false });
}

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
      SAFE_STEP = 0; SAFE_ROTATION = 0; SAFE_LOCKED = false;
      const rot = document.getElementById('safe-dial-rotator');
      if (rot) rot.style.transform = 'rotate(0deg)';
      _safeVibrate([50, 50, 50]);
    }
  } catch(e) {
    SAFE_STEP = 0; SAFE_ROTATION = 0; SAFE_LOCKED = false;
    const rot = document.getElementById('safe-dial-rotator');
    if (rot) rot.style.transform = 'rotate(0deg)';
    _safeVibrate([50, 50, 50]);
  }
};
