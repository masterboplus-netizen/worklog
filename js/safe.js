// === СЛЕПОЙ СЕЙФ (PIN-кольцо) — v1 ===
// Зоны: сектор 5 -> 11 -> 2. Порядок важен.
// Угол: 0 = 12 часов, по часовой. Math.atan2 + 90°, без rotate на SVG.

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
  const screen = document.getElementById('scroll-pin-screen');
  if (!screen) { console.warn('safe: нет #scroll-pin-screen'); return; }
  
  // Показываем сейф
  screen.classList.add('active');
  
  // Скрываем дашборд и меню
  const dash = document.getElementById('dashboard');
  if (dash) dash.classList.add('hidden');
  const tabs = document.querySelector('.tabs');
  if (tabs) tabs.style.display = 'none';
  
  _safeBind();
}

function _safeHide() {
  const screen = document.getElementById('scroll-pin-screen');
  if (screen) {
    screen.style.display = 'none';
    screen.classList.remove('active');
  }
}

function _safeBind() {
  // Убираем проверку, чтобы при каждом вызове showSafe() 
  // обработчики навешивались заново поверх старых (они перезапишутся)
  const box = document.getElementById('safe-dial-container');
  const lens = document.getElementById('safe-dial-touch-effect');
  const ring = document.getElementById('safe-dial-ring');
  if (!box || !lens || !ring) { console.warn('safe: нет элементов'); return; }

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
    _safeVibrate([50, 50, 50]); // Двойная пульсация для ошибки
    setTimeout(resetRing, 350);
  };

  const commitSector = (sector) => {
    const idx = SAFE_INPUTS.length;
    if (SAFE_TARGETS[idx] === sector) {
      SAFE_INPUTS.push(sector);
      _safeVibrate(30); // Вибрация-щелчок при фиксации
      // «щелчок»
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
        
        // Возвращаем дашборд через inline-стили
        const dash = document.getElementById('dashboard');
        if (dash) {
          dash.classList.remove('hidden');
          dash.style.display = 'flex'; // или block, смотря как в CSS
        }
        const tabs = document.querySelector('.tabs');
        if (tabs) tabs.style.display = 'flex';

        const l = document.getElementById('loading');
        if (l) l.remove();
        renderDashboard();
      } else {
        SAFE_INPUTS = [];
        SAFE_LOCKED = false;
        flashError();
      }
    } catch(e) {
      SAFE_INPUTS = [];
      SAFE_LOCKED = false;
      flashError();
    }
  };

  box.ontouchstart = (e) => {
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
  }, { passive: false });

  box.ontouchmove = (e) => {
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
      
      // Даем вибрацию ТОЛЬКО при входе в ПРАВИЛЬНЫЙ сектор
      if (SAFE_TARGETS[SAFE_INPUTS.length] === sector) {
        _safeVibrate(30); // Чуть сильнее, чтобы почувствовать
      }
      
      timer = setTimeout(() => {
        if (lastSector === sector) commitSector(sector);
      }, SAFE_HOLD_MS);
    }
  }, { passive: false });

  const endTouch = (e) => {
    if (e) e.preventDefault();
    SAFE_ACTIVE = false;
    if (timer) { clearTimeout(timer); timer = null; }
    lens.classList.remove('active');
  };
  box.ontouchend = endTouch;
  box.ontouchcancel = endTouch;
}
