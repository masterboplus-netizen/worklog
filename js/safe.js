// === СЛЕПОЙ СЕЙФ (v15 - Чистый винил) ===
const SAFE_TARGET_ANGLES = [150, 330, 420];
const SAFE_PIN = '201186';
let SAFE_ROTATION = 0;
let SAFE_STEP = 0;
let SAFE_ACTIVE = false;
let SAFE_LOCKED = false;
let START_TOUCH_ANGLE = 0;
let START_RING_ROTATION = 0;

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

  // Чтобы поймать палец везде, вешаем на весь экран
  const target = document.getElementById('scroll-pin-screen');

  const getCenter = () => {
    const r = box.getBoundingClientRect();
    return { cx: r.left + r.width/2, cy: r.top + r.height/2 };
  };

  target.ontouchstart = null;
  target.ontouchmove = null;
  target.ontouchend = null;

  target.addEventListener('touchstart', (e) => {
    if (SAFE_LOCKED) return;
    e.preventDefault();
    SAFE_ACTIVE = true;
    const t = e.touches[0];
    const { cx, cy } = getCenter();
    
    START_TOUCH_ANGLE = _safeAngle(cx, cy, t.clientX, t.clientY);
    START_RING_ROTATION = SAFE_ROTATION;
    
    if (lens) {
      lens.classList.add('active');
      const r = box.getBoundingClientRect();
      // Ставим лупy прямо под палец
      lens.style.left = (t.clientX - r.left) + 'px';
      lens.style.top  = (t.clientY - r.top)  + 'px';
    }
  }, { passive: false });

  target.addEventListener('touchmove', (e) => {
    if (!SAFE_ACTIVE || SAFE_LOCKED) return;
    e.preventDefault();
    const t = e.touches[0];
    const { cx, cy } = getCenter();
    const r = box.getBoundingClientRect();
    
    // Двигаем лупу за пальцем
    if (lens) {
      lens.style.left = (t.clientX - r.left) + 'px';
      lens.style.top  = (t.clientY - r.top)  + 'px';
    }

    const currentAngle = _safeAngle(cx, cy, t.clientX, t.clientY);
    let deltaAngle = currentAngle - START_TOUCH_ANGLE;
    
    if (deltaAngle > 180) deltaAngle -= 360;
    if (deltaAngle < -180) deltaAngle += 360;
    
    if (deltaAngle < -1) {
      if (SAFE_STEP > 0 || START_RING_ROTATION > 0) {
        SAFE_ROTATION = 0;
        SAFE_STEP = 0;
        START_RING_ROTATION = 0;
        START_TOUCH_ANGLE = currentAngle;
        rot.style.transform = `rotate(0deg)`;
        _safeVibrate([30, 30, 30]);
      }
    } else {
      SAFE_ROTATION = START_RING_ROTATION + deltaAngle;
      
      // Крутим обычный DIV, это работает идеально
      rot.style.transform = `rotate(${SAFE_ROTATION}deg)`;
      
      // Проверка точек
      if (SAFE_STEP < SAFE_TARGET_ANGLES.length) {
        const targetAngle = SAFE_TARGET_ANGLES[SAFE_STEP];
        if (SAFE_ROTATION >= targetAngle) {
          _safeVibrate(50);
          SAFE_STEP++;
          if (SAFE_STEP === SAFE_TARGET_ANGLES.length) {
            SAFE_LOCKED = true;
            _safeUnlock();
          }
        }
      }
    }
  }, { passive: false });

  const endTouch = (e) => {
    if (e) e.preventDefault();
    SAFE_ACTIVE = false;
    if (lens) lens.classList.remove('active');
    START_RING_ROTATION = SAFE_ROTATION;
  };

  target.addEventListener('touchend', endTouch, { passive: false });
  target.addEventListener('touchcancel', endTouch, { passive: false });
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
      document.getElementById('safe-dial-rotator').style.transform = 'rotate(0deg)';
      _safeVibrate([50, 50, 50]);
    }
  } catch(e) {
    SAFE_STEP = 0; SAFE_ROTATION = 0; SAFE_LOCKED = false;
    document.getElementById('safe-dial-rotator').style.transform = 'rotate(0deg)';
    _safeVibrate([50, 50, 50]);
  }
};
