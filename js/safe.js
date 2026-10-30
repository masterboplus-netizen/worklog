// === СЛЕПОЙ СЕЙФ (v31 - Старт по тапу + таймер) ===
const SAFE_TARGET_ANGLES = [150, 330];
const SAFE_PIN = '201186';
const HOLD_TIME_MS = 1000;
const START_TIME_S = 10;

let SAFE_ROTATION = 0;
let SAFE_STEP = 0;
let SAFE_ACTIVE = false;
let SAFE_LOCKED = false;
let SAFE_STARTED = false;

let START_TOUCH_ANGLE = 0;
let START_RING_ROTATION = 0;
let TOTAL_TOUCH_DELTA = 0;
let HOLD_TIMER = null;
let LAST_VIB_STEP = -1;

let COUNTDOWN_TIMER = null;
let TIME_LEFT = START_TIME_S;

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
  SAFE_STARTED = false;
  LAST_VIB_STEP = -1;

  if (HOLD_TIMER) clearTimeout(HOLD_TIMER);
  if (COUNTDOWN_TIMER) clearInterval(COUNTDOWN_TIMER);

  const screen = document.getElementById('scroll-pin-screen');
  if (!screen) return;

  screen.style.display = 'block';
  screen.style.position = 'fixed';
  screen.style.top = '0'; screen.style.left = '0';
  screen.style.width = '100vw'; screen.style.height = '100vh';
  screen.style.zIndex = '9999';
  screen.style.alignItems = 'initial';
  screen.style.justifyContent = 'initial';
  screen.style.backgroundColor = 'var(--bg)';

  const dash = document.getElementById('dashboard');
  if (dash) dash.style.display = 'none';
  const tabs = document.querySelector('.tabs');
  if (tabs) tabs.style.display = 'none';

  const rot = document.getElementById('safe-dial-rotator');
  if (rot) rot.style.transform = 'rotate(0deg)';

  const timerDisplay = document.getElementById('safe-timer');
  if (timerDisplay) {
    timerDisplay.textContent = 'Коснись, чтобы начать';
    timerDisplay.style.color = 'var(--fg-dim)';
    timerDisplay.style.fontSize = '18px';
  }

  _safeBind();
}

function _safeHide() {
  const screen = document.getElementById('scroll-pin-screen');
  if (screen) screen.style.display = 'none';
  if (HOLD_TIMER) clearTimeout(HOLD_TIMER);
  if (COUNTDOWN_TIMER) clearInterval(COUNTDOWN_TIMER);
}

function _safeBind() {
  const box = document.getElementById('safe-dial-container');
  const rot = document.getElementById('safe-dial-rotator');
  const lens = document.getElementById('safe-dial-lens');
  const timerDisplay = document.getElementById('safe-timer');

  if (!box || !rot) return;

  const getCenter = () => {
    const r = box.getBoundingClientRect();
    return { cx: r.left + r.width/2, cy: r.top + r.height/2 };
  };

  const resetHold = () => {
    if (HOLD_TIMER) { clearTimeout(HOLD_TIMER); HOLD_TIMER = null; }
  };

  const checkTargetAngle = () => {
    if (SAFE_STEP >= SAFE_TARGET_ANGLES.length || SAFE_LOCKED) return;
    const target = SAFE_TARGET_ANGLES[SAFE_STEP];

    if (SAFE_ROTATION >= target - 20 && SAFE_ROTATION <= target + 20) {
      if (!HOLD_TIMER) {
        _safeVibrate(20); // Легкий толчок при входе в зону
        HOLD_TIMER = setTimeout(() => {
          _safeVibrate(60);
          SAFE_STEP++;
          HOLD_TIMER = null;

          if (SAFE_STEP === SAFE_TARGET_ANGLES.length) {
            SAFE_LOCKED = true;
            _safeUnlock();
          }
        }, HOLD_TIME_MS);
      }
    } else {
      if (HOLD_TIMER) { clearTimeout(HOLD_TIMER); HOLD_TIMER = null; }
    }
  };

  const startGame = () => {
    if (SAFE_STARTED || SAFE_LOCKED) return;

    _safeVibrate(50); 

    SAFE_STARTED = true;
    TIME_LEFT = START_TIME_S;
    if (timerDisplay) {
      timerDisplay.textContent = TIME_LEFT + 'с';
      timerDisplay.style.color = '#FFA500';
      timerDisplay.style.fontSize = '24px';
    }

    COUNTDOWN_TIMER = setInterval(() => {
      TIME_LEFT--;
      if (timerDisplay) timerDisplay.textContent = TIME_LEFT + 'с';

      if (TIME_LEFT <= 0) {
        clearInterval(COUNTDOWN_TIMER);
        _safeError();
      }
    }, 1000);
  };

  box.ontouchstart = null;
  box.ontouchmove = null;
  box.ontouchend = null;

  box.addEventListener('touchstart', (e) => {
    if (SAFE_LOCKED) return;
    e.preventDefault();
    e.stopPropagation(); // Останавливаем всплытие, чтобы тап не улетал в другие слои

    if (!SAFE_STARTED) {
      startGame();
      return;
    }

    SAFE_ACTIVE = true;
    TOTAL_TOUCH_DELTA = 0;

    const t = e.touches[0];
    const { cx, cy } = getCenter();

    START_TOUCH_ANGLE = _safeAngle(cx, cy, t.clientX, t.clientY);
    START_RING_ROTATION = SAFE_ROTATION;
    LAST_VIB_STEP = Math.floor(START_TOUCH_ANGLE / 15);

    if (lens) {
      lens.classList.add('active');
      const r = box.getBoundingClientRect();
      lens.style.left = (t.clientX - r.left) + 'px';
      lens.style.top  = (t.clientY - r.top)  + 'px';
    }

    resetHold();
    checkTargetAngle();
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

    const vibStep = Math.floor(currentAngle / 15);
    if (vibStep !== LAST_VIB_STEP) {
      _safeVibrate(10);
      LAST_VIB_STEP = vibStep;
    }

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

const _safeError = () => {
  _safeVibrate([100, 50, 100, 50, 100]);
  const rot = document.getElementById('safe-dial-rotator');
  const timer = document.getElementById('safe-timer');

  if (rot) rot.style.filter = 'drop-shadow(0 0 25px red)';
  if (timer) { timer.textContent = 'ОШИБКА'; timer.style.color = 'red'; }

  setTimeout(() => {
    showSafe();
  }, 1500);
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
      showSafe();
    }
  } catch(e) {
    showSafe();
  }
};
