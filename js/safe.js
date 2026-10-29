// === СЛЕПОЙ СЕЙФ (ВИНИЛ / ВРАЩЕНИЕ) — v6 ===
// Логика: крутим кольцо. Точки: 150°, 330°, 60° (следующий оборот).
// Порядок важен. Назад крутить нельзя (сбрасывает).

const SAFE_TARGET_ANGLES = [150, 330, 420]; // 420 = 60 + 360 (следующий оборот)
const SAFE_PIN = '201186';
let SAFE_ROTATION = 0;       // Текущий угол поворота кольца
let SAFE_STEP = 0;           // Какую точку ищем (0, 1, 2)
let SAFE_ACTIVE = false;
let SAFE_LOCKED = false;
let SAFE_LAST_ANGLE = 0;     // Угол пальца на прошлом кадре
let SAFE_LAST_ROTATION = 0;  // Поворот кольца на прошлом кадре

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
  SAFE_LAST_ANGLE = 0;
  SAFE_LAST_ROTATION = 0;
  
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

  _safeResetVisual();
  _safeBind();
}

function _safeHide() {
  const screen = document.getElementById('scroll-pin-screen');
  if (screen) screen.style.display = 'none';
}

function _safeResetVisual() {
  const ring = document.getElementById('safe-dial-ring');
  if (ring) {
    ring.style.transform = `rotate(0deg)`;
    ring.setAttribute('stroke', '#FFA500');
    ring.style.filter = 'drop-shadow(0 0 10px rgba(255,165,0,0.8))';
  }
}

function _safeBind() {
  const box = document.getElementById('safe-dial-container');
  const hitbox = document.querySelector('.safe-dial-hitbox');
  const ring = document.getElementById('safe-dial-ring');
  if (!box || !ring) return;

  const targets = [box, hitbox, document.getElementById('safe-dial-svg')].filter(Boolean);
  let timer = null;

  const getCenter = () => {
    const r = box.getBoundingClientRect();
    return { cx: r.left + r.width/2, cy: r.top + r.height/2 };
  };

  const handleStart = (e) => {
    if (SAFE_LOCKED) return;
    e.preventDefault();
    SAFE_ACTIVE = true;
    const t = e.touches[0];
    const { cx, cy } = getCenter();
    SAFE_LAST_ANGLE = _safeAngle(cx, cy, t.clientX, t.clientY);
    SAFE_LAST_ROTATION = SAFE_ROTATION;
  };

  const handleMove = (e) => {
    if (!SAFE_ACTIVE || SAFE_LOCKED) return;
    e.preventDefault();
    const t = e.touches[0];
    const { cx, cy } = getCenter();
    
    const currentAngle = _safeAngle(cx, cy, t.clientX, t.clientY);
    let delta = currentAngle - SAFE_LAST_ANGLE;
    
    // Обработка перехода через 360/0
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    
    // Если крутим назад — сбрасываем прогресс
    if (delta < -0.5) {
      if (SAFE_STEP > 0 || SAFE_ROTATION > 0) {
        SAFE_ROTATION = 0;
        SAFE_STEP = 0;
        _safeResetVisual();
        _safeVibrate([30, 30, 30]); // Ошибка
      }
    }
    
    SAFE_ROTATION += delta;
    SAFE_LAST_ANGLE = currentAngle;
    
    // Визуально крутим кольцо
    ring.style.transform = `rotate(${SAFE_ROTATION}deg)`;
    
    // Проверяем, не прошли ли мы нужную точку
    if (SAFE_STEP < SAFE_TARGET_ANGLES.length) {
      const target = SAFE_TARGET_ANGLES[SAFE_STEP];
      
      if (SAFE_ROTATION >= target) {
        // Прошли точку!
        _safeVibrate(30);
        SAFE_STEP++;
        
        // Визуальный «щелчок» (сжатие)
        ring.style.transform = `rotate(${SAFE_ROTATION}deg) scale(0.97)`;
        setTimeout(() => { ring.style.transform = `rotate(${SAFE_ROTATION}deg) scale(1)`; }, 90);
        
        if (SAFE_STEP === SAFE_TARGET_ANGLES.length) {
          SAFE_LOCKED = true;
          _safeUnlock();
        }
      }
    }
    
    // Легкая вибрация при вращении (опционально)
    // _safeVibrate(5); 
  };

  const handleEnd = (e) => {
    if (e) e.preventDefault();
    SAFE_ACTIVE = false;
    if (timer) { clearTimeout(timer); timer = null; }
  };

  targets.forEach(t => {
    t.ontouchstart = handleStart;
    t.ontouchmove = handleMove;
    t.ontouchend = handleEnd;
    t.ontouchcancel = handleEnd;
  });
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
      _safeResetVisual();
      _safeVibrate([50, 50, 50]);
    }
  } catch(e) {
    SAFE_STEP = 0; SAFE_ROTATION = 0; SAFE_LOCKED = false;
    _safeResetVisual();
    _safeVibrate([50, 50, 50]);
  }
};
