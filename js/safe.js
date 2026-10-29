// === СЛЕПОЙ СЕЙФ (ВИНИЛ) — v12 ПЛАВНОЕ ВРАЩЕНИЕ ===
const SAFE_TARGET_ANGLES = [150, 330, 420];
const SAFE_PIN = '201186';
let SAFE_ROTATION = 0;
let SAFE_STEP = 0;
let SAFE_ACTIVE = false;
let SAFE_LOCKED = false;
let SAFE_LAST_ANGLE = 0;

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
    // Убираем CSS-трансформации, оставляем только SVG-атрибут
    ring.style.transform = 'none';
    ring.style.transition = 'none'; 
    ring.setAttribute('transform', `rotate(0 110 110)`);
    ring.style.filter = 'drop-shadow(0 0 15px rgba(255,165,0,0.8))';
  }
}

function _safeBind() {
  const box = document.getElementById('safe-dial-container');
  const hitbox = document.querySelector('.safe-dial-hitbox');
  const ring = document.getElementById('safe-dial-ring');
  const lens = document.getElementById('safe-dial-touch-effect');
  
  if (!box || !ring) { console.warn('safe: нет элементов'); return; }

  const targets = [box, hitbox, document.getElementById('safe-dial-svg')].filter(Boolean);
  let lastVibStep = 0;

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
    
    if (lens) {
      lens.classList.add('active');
      // Прижимаем лупу к кольцу
      const r = box.getBoundingClientRect();
      const radius = 90;
      const angleRad = (SAFE_LAST_ANGLE - 90) * Math.PI / 180;
      const lx = (cx - r.left) + Math.cos(angleRad) * radius;
      const ly = (cy - r.top) + Math.sin(angleRad) * radius;
      lens.style.left = lx + 'px';
      lens.style.top  = ly + 'px';
    }
  };

  const handleMove = (e) => {
    if (!SAFE_ACTIVE || SAFE_LOCKED) return;
    e.preventDefault();
    const t = e.touches[0];
    const { cx, cy } = getCenter();
    const r = box.getBoundingClientRect();
    
    const currentAngle = _safeAngle(cx, cy, t.clientX, t.clientY);
    
    if (lens) {
      const radius = 90;
      const angleRad = (currentAngle - 90) * Math.PI / 180;
      const lx = (cx - r.left) + Math.cos(angleRad) * radius;
      const ly = (cy - r.top) + Math.sin(angleRad) * radius;
      lens.style.left = lx + 'px';
      lens.style.top  = ly + 'px';
    }

    let delta = currentAngle - SAFE_LAST_ANGLE;
    
    // Обработка перехода через 0/360
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    
    // Сброс, если крутим назад
    if (delta < -0.5) {
      if (SAFE_STEP > 0 || SAFE_ROTATION > 0) {
        SAFE_ROTATION = 0;
        SAFE_STEP = 0;
        lastVibStep = 0;
        _safeResetVisual();
        _safeVibrate([30, 30, 30]);
      }
    }
    
    SAFE_ROTATION += delta;
    SAFE_LAST_ANGLE = currentAngle;
    
    // Крутим ТОЛЬКО через SVG-атрибут (плавно, без CSS)
    if (ring) {
      ring.setAttribute('transform', `rotate(${SAFE_ROTATION} 110 110)`);
    }
    
    // Проверяем точки
    if (SAFE_STEP < SAFE_TARGET_ANGLES.length) {
      const target = SAFE_TARGET_ANGLES[SAFE_STEP];
      
      if (SAFE_ROTATION >= target) {
        _safeVibrate(50);
        SAFE_STEP++;
        lastVibStep = Math.floor(SAFE_ROTATION / 45);
        
        if (ring) {
          ring.style.filter = 'drop-shadow(0 0 25px rgba(255,255,255,0.9))';
          setTimeout(() => { ring.style.filter = 'drop-shadow(0 0 15px rgba(255,165,0,0.8))'; }, 150);
        }
        
        if (SAFE_STEP === SAFE_TARGET_ANGLES.length) {
          SAFE_LOCKED = true;
          _safeUnlock();
        }
      } else {
        // Трещотка
        const currentStep = Math.floor(SAFE_ROTATION / 45);
        if (currentStep > lastVibStep && SAFE_ROTATION > 0) {
          _safeVibrate(10);
          lastVibStep = currentStep;
        }
      }
    }
  };

  const handleEnd = (e) => {
    if (e) e.preventDefault();
    SAFE_ACTIVE = false;
    if (lens) lens.classList.remove('active');
  };

  targets.forEach(t => {
    t.ontouchstart = null; t.ontouchmove = null; t.ontouchend = null; t.ontouchcancel = null;
    t.addEventListener('touchstart', handleStart, { passive: false });
    t.addEventListener('touchmove', handleMove, { passive: false });
    t.addEventListener('touchend', handleEnd, { passive: false });
    t.addEventListener('touchcancel', handleEnd, { passive: false });
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
