// --- ГЛАВНЫЙ МОДУЛЬ (Дирижер) ---
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

let DAILY_GOAL_MIN = (function(){
  try {
    const v = parseInt(localStorage.getItem('worklog_goal_min'), 10);
    if (v > 0 && v <= 1440) return v;
  } catch (e) {}
  return 720;
})();

function _bootstrap() {
  window.__initCalls = (window.__initCalls || 0) + 1;
  if (window.__initCalls === 1) init();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', _bootstrap);
} else {
  _bootstrap();
}

async function init() {
  setupPinPad();
  
  const btnLock = $('#btn-lock');
  if (btnLock) btnLock.addEventListener('click', lock);
  
  const btnHeart = $('#btn-heart');
  if (btnHeart) btnHeart.addEventListener('click', showCreators);

  const logoBtn = $('#logo-btn');
  if (logoBtn) {
    logoBtn.addEventListener('click', () => {
      if (!document.getElementById('content').classList.contains('hidden')) {
        renderDashboard();
      } else {
        switchTab('dashboard');
      }
    });
  }

  setupTabs();

  // Сразу показываем сейф
  const loadingEl = document.getElementById('loading');
  if (loadingEl) loadingEl.classList.add('hidden');
  document.getElementById('pin-screen').classList.add('hidden');
  document.getElementById('scroll-pin-screen').classList.add('active');
  initSafeDial();
}

function setupTabs() {
  const tabDash = document.getElementById('tab-dashboard');
  const tabDiary = document.getElementById('tab-diary');
  const tabProjects = document.getElementById('tab-projects');
  const tabActivity = document.getElementById('tab-activity');
  if (tabDash) tabDash.addEventListener('click', () => switchTab('dashboard'));
  if (tabDiary) tabDiary.addEventListener('click', () => switchTab('diary'));
  if (tabProjects) tabProjects.addEventListener('click', () => switchTab('projects'));
  if (tabActivity) tabActivity.addEventListener('click', () => switchTab('activity'));
  const tabProfile = document.getElementById('tab-profile');
  if (tabProfile) tabProfile.addEventListener('click', showJoke);
}



function showJoke() {
  let modal = document.getElementById('joke-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'joke-modal';
    modal.className = 'hidden';
    modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 1000; display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.3s;';
    modal.innerHTML = `
      <div style="background: var(--bg2); padding: 30px; border-radius: 16px; text-align: center; max-width: 85%; border: 1px solid var(--accent); transform: scale(0.8); transition: transform 0.3s;">
        <div style="font-size: 36px; font-weight: bold; color: var(--accent); margin-bottom: 20px; letter-spacing: 2px;">Б#@%!</div>
        <h2 style="color: var(--accent); margin-bottom: 15px; font-size: 22px;">Хватит заниматься Херобориной!</h2>
        <div style="font-size: 48px; margin-bottom: 20px; display: inline-block; animation: laughAnim 0.8s infinite;">🤣</div>
        <div style="font-size: 28px; font-weight: bold; margin-bottom: 15px; color: var(--fg);">ИДИ РАБОТАТЬ!</div>
        <div style="font-size: 48px; margin-bottom: 20px; display: inline-block; animation: shakeAnim 0.6s infinite;">😡</div>
        <button onclick="closeJoke()" class="pulse-btn" style="background: var(--accent); color: white; border: none; padding: 12px 24px; border-radius: 8px; font-size: 16px; font-weight: bold; cursor: pointer; width: 100%;">Хорошо!</button>
      </div>
    `;
    document.body.appendChild(modal);
  }
  modal.classList.remove('hidden');
  setTimeout(() => {
    modal.style.opacity = '1';
    modal.querySelector('div').style.transform = 'scale(1)';
  }, 10);
}

window.closeJoke = function closeJoke() {
  const modal = document.getElementById('joke-modal');
  if (modal) {
    modal.style.opacity = '0';
    modal.querySelector('div').style.transform = 'scale(0.8)';
    setTimeout(() => {
      modal.classList.add('hidden');
    }, 300);
  }
}

function switchTab(name) {
  console.log('switchTab called:', name);
  
  // Скрываем все
  ['content', 'content-diary', 'content-projects', 'content-activity'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.classList.add('hidden'); if (id === 'content-activity') el.innerHTML = ''; }
  });
  
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('tab-active'));

  try {
    if (name === 'diary') {
      const c = document.getElementById('content-diary');
      if (c) { c.classList.remove('hidden'); renderDiary(); }
      const t = document.getElementById('tab-diary'); if (t) t.classList.add('tab-active');
    } else if (name === 'projects') {
      const c = document.getElementById('content-projects');
      if (c) { c.classList.remove('hidden'); c.innerHTML = ''; c.appendChild(renderProjects()); }
      const t = document.getElementById('tab-projects'); if (t) t.classList.add('tab-active');
    } else if (name === 'activity') {
      const c = document.getElementById('content-activity');
      if (c) { c.classList.remove('hidden'); if (typeof renderActivityPageV2 === 'function') { renderActivityPageV2(); } else { renderActivityPage(); } }
      const t = document.getElementById('tab-activity'); if (t) t.classList.add('tab-active');
    } else {
      const c = document.getElementById('content');
      if (c) { c.classList.remove('hidden'); renderDashboard(); }
      const t = document.getElementById('tab-dashboard'); if (t) t.classList.add('tab-active');
    }
  } catch (e) {
    console.error('Ошибка при переключении вкладки:', e);
  }
}





// === ЛОГИКА СЛЕПОГО СЕЙФА ===
let SAFE_PIN = '';
let SAFE_TARGET = '201186'; // Пароль (20-11-86)
const SAFE_SECTORS = 12; // 12 секторов (как часы)
const SAFE_RADIUS = 130;
const SAFE_CENTER = { x: 140, y: 140 };

function initSafeDial() {
  const container = document.getElementById('safe-dial-container');
  const ring = document.getElementById('safe-dial-ring');
  
  if (!container) return;
  
  let isDragging = false;
  let currentSector = -1;
  let holdTimer = null;
  let lastX = 0, lastY = 0;

  const getAngle = (x, y) => {
    const rect = container.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    // atan2 возвращает от -PI до PI, переводим в 0-360
    let angle = Math.atan2(y - cy, x - cx) * 180 / Math.PI;
    if (angle < 0) angle += 360;
    return angle;
  };

  const processMove = (x, y) => {
    const angle = getAngle(x, y);
    const sector = Math.floor(angle / (360 / SAFE_SECTORS));
    
    // Если сектор изменился
    if (sector !== currentSector) {
      currentSector = sector;
      
      // Анимация вспышки
      ring.style.strokeDasharray = (SAFE_SECTORS > 0 ? (2 * Math.PI * SAFE_RADIUS) / SAFE_SECTORS : 0) + ' 1000';
      ring.style.strokeDashoffset = -(sector * (2 * Math.PI * SAFE_RADIUS) / SAFE_SECTORS);
      
      // Сброс таймера фиксации
      if (holdTimer) clearTimeout(holdTimer);
      
      // Таймер: если палец задержался на 600мс, фиксируем
      holdTimer = setTimeout(() => {
        if (SAFE_PIN.length < 3) {
          SAFE_PIN += sector;
          if (navigator.vibrate) navigator.vibrate(50); // Вибрация
          
          
          // Если ввели 3 числа, сбрасываем кольцо
          if (SAFE_PIN.length === 3) {
            ring.style.strokeDasharray = '0 1000';
          }
        }
      }, 600);
    }
  };

  container.addEventListener('touchstart', (e) => {
    e.preventDefault();
    isDragging = true;
    const touch = e.touches[0];
    processMove(touch.clientX, touch.clientY);
  }, { passive: false });

  container.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (!isDragging) return;
    const touch = e.touches[0];
    processMove(touch.clientX, touch.clientY);
  }, { passive: false });

  const endDrag = () => {
    isDragging = false;
    if (holdTimer) clearTimeout(holdTimer);
  };

  container.addEventListener('touchend', endDrag);
  container.addEventListener('touchcancel', endDrag);

  // Сброс при старте
  SAFE_PIN = '';
  indicator.textContent = '0';
  ring.style.strokeDasharray = '0 1000';
}

window.checkScrollPin = async function() {
  const err = document.getElementById('scroll-pin-error');
  if (err) err.textContent = '';
  
  if (SAFE_PIN.length < 3) {
    if (err) err.textContent = 'Введи 3 числа';
    return;
  }
  
  // Проверяем, совпадает ли SAFE_PIN с зашифрованным ключом
  // Внимание: для этого нужно, чтобы SAFE_PIN собирал числа правильно.
  // Пока что выведем alert для проверки.
  alert('Ты ввел сектора: ' + SAFE_PIN.split('').join(' - '));
  
  // Заглушка для проверки (потом поменяем на tryUnlock)
  // const ok = await tryUnlock('201186');
  // ...
}

function showCreators() {
  // Удаляем старую модалку, если она есть, чтобы всегда создавать свежую
  const old = document.getElementById('creators-modal');
  if (old) old.remove();

  const modal = document.createElement('div');
  modal.id = 'creators-modal';
  modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 1000; display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.3s;';
  modal.innerHTML = `
    <div style="background: var(--bg2); padding: 24px; border-radius: 16px; text-align: center; max-width: 85%; border: 1px solid var(--border);">
      <h2 style="color: var(--accent); margin-bottom: 24px; font-size: 20px; font-weight: 500;">Создатели проекта</h2>

      <div style="margin-bottom: 16px;">
        <div style="color: var(--fg); font-size: 16px; font-weight: 400; margin-bottom: 4px;">Product owner</div>
        <div style="color: var(--fg-dim); font-size: 14px;">Andrey Sorokin</div>
      </div>

      <div style="margin-bottom: 24px;">
        <div style="color: var(--fg); font-size: 16px; font-weight: 400; margin-bottom: 4px;">Design & idea</div>
        <div style="color: var(--fg-dim); font-size: 14px;">Karina Merkulova</div>
      </div>

      <div style="color: var(--fg-dim); font-size: 12px; margin-bottom: 24px;">Хераборина v7.8.0</div>
      <button onclick="document.getElementById('creators-modal').remove()" class="pulse-btn" style="background: var(--accent); color: white; border: none; padding: 12px 24px; border-radius: 8px; font-size: 16px; cursor: pointer; width: 100%;">Спасибо</button>
    </div>
  `;
  document.body.appendChild(modal);
  setTimeout(() => { modal.style.opacity = '1'; }, 10);
}
