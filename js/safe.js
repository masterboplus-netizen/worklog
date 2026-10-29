// === СЛЕПОЙ СЕЙФ (v23 - Проверка по кольцу) ===
const SAFE_TARGET_ANGLES = [150, 330, 420]; // Углы для кольца
const SAFE_PIN = '201186';
const HOLD_TIME_MS = 1500;

let SAFE_ROTATION = 0;
let SAFE_STEP = 0;
let SAFE_ACTIVE = false;
let SAFE_LOCKED = false;

let START_TOUCH_ANGLE = 0;
let START_RING_ROTATION = 0;
let TOTAL_TOUCH_DELTA = 0;
let HOLD_TIMER = null;
let LAST_VIB_STEP = -1;

function _safeAngle(cx, cy, x, y) {
  let a = Math.atan2(y - cy, x - cx) * 180 / Math.PI + 90;
  if (a < 0) a += 360;
  return a;
}

function _safeVibrate(ms) {
  try { if (navigator.vibrate) navigator.vibrate(ms); } catch(e) {}
}

function showSafe() {
  // Пытаемся разбудить API вибрации (пустой вызов)
  try { if (navigator.vibrate) navigator.vibrate(0); } catch(e) {}

  SAFE_ROTATION = 0;
  SAFE_STEP = 0;
  SAFE_ACTIVE = false;
  SAFE_LOCKED = false;
  LAST_VIB_STEP = -1;
  if (HOLD_TIMER) { clearTimeout(HOLD_TIMER); HOLD_TIMER = null; }
  
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
  
  // Вызываем привязку сразу, без задержки
  _safeBind();
}

function _safeHide() {
  const screen = document.getElementById('scroll-pin-screen');
  if (screen) screen.style.display = 'none';
  if (HOLD_TIMER) { clearTimeout(HOLD_TIMER); HOLD_TIMER = null; }
}

function _safeBind() {
  const box = document.getElementById('safe-dial-container');
  const rot = document.getElementById('safe-dial-rotator');
  const lens = document.getElementById('safe-dial-lens');
  
  if (!box || !rot) {
    // Если элементов нет, пробуем еще раз через 100 мс
    setTimeout(_safeBind, 100);
    return;
  }

  const getCenter = () => {
    const r = box.getBoundingClientRect();
    return { cx: r.left + r.width/2, cy: r.top + r.height/2 };
  };

  const resetHold = () => {
    if (HOLD_TIMER) { clearTimeout(HOLD_TIMER); HOLD_TIMER = null; }
  };

  // Функция проверки: находится ли кольцо на нужном угле?
  const checkTargetAngle = () => {
    if (SAFE_STEP >= SAFE_TARGET_ANGLES.length || SAFE_LOCKED) return;
    
    const target = SAFE_TARGET_ANGLES[SAFE_STEP];
    
    // Если кольцо довернулось до нужного угла (с погрешностью в 15 градусов)
    // Например, цель 150, значит зона от 135 до 165.
    if (SAFE_ROTATION >= target - 15 && SAFE_ROTATION <= target + 15) {
      // Мы в зоне! Если таймер еще не запущен — запускаем
      if (!HOLD_TIMER) {
        HOLD_TIMER = setTimeout(() => {
          _safeVibrate(60); // Вибрация успеха
          SAFE_STEP++;
          HOLD_TIMER = null;
          
          if (SAFE_STEP === SAFE_TARGET_ANGLES.length) {
            SAFE_LOCKED = true;
            _safeUnlock();
          }
        }, HOLD_TIME_MS);
      }
    } else {
      // Если выехали из зоны — сбрасываем таймер
      if (HOLD_TIMER) {
        clearTimeout(HOLD_TIMER);
        HOLD_TIMER = null;
      }
    }
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
    
    LAST_VIB_STEP = Math.floor(START_TOUCH_ANGLE / 15);
    
    // Принудительный вызов вибрации при первом касании
    _safeVibrate(15);

    if (lens) {
      lens.classList.add('active');
      const r = box.getBoundingClientRect();
      lens.style.left = (t.clientX - r.left) + 'px';
      lens.style.top  = (t.clientY - r.top)  + 'px';
    }
    
    resetHold();
    checkTargetAngle(); // Проверяем сразу при касании (если кольцо уже на месте)
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
    
    // Вращение кольца
    let deltaAngle = currentAngle - START_TOUCH_ANGLE;
    if (deltaAngle > 180) deltaAngle -= 360;
    if (deltaAngle < -180) deltaAngle += 360;
    
    TOTAL_TOUCH_DELTA += deltaAngle;
    START_TOUCH_ANGLE = currentAngle;

    SAFE_ROTATION = START_RING_ROTATION + TOTAL_TOUCH_DELTA;
    rot.style.transform = `rotate(${SAFE_ROTATION}deg)`;
    
    // Трещотка (по углу пальца)
    const vibStep = Math.floor(currentAngle / 15);
    if (vibStep !== LAST_VIB_STEP) {
      _safeVibrate(10);
      LAST_VIB_STEP = vibStep;
    }
    
    // Постоянная проверка: не пора ли засчитать угол?
    checkTargetAngle();
  }, { passive: false });

  const endTouch = (e) => {
    if (e) e.preventDefault();
    SAFE_ACTIVE = false;
    if (lens) lens.classList.remove('active');
    resetHold();
    START_RING_ROTATION = SAFE_ROTATION;
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
