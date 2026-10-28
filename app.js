// --- ГЛАВНЫЙ МОДУЛЬ (Дирижер) ---
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

async function init() {
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

  // Показываем сейф
  document.getElementById('scroll-pin-screen').classList.add('active');
  initSafeDial();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
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

function switchTab(name) {
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

// === ЛОГИКА СЕЙФА ===
let SAFE_PIN = '';
const SAFE_SECTORS = 12;
const SAFE_RADIUS = 100;

const TARGET_ZONES = [
  { start: 150, end: 180 },
  { start: 330, end: 360 },
  { start: 60, end: 90 }
];

function initSafeDial() {
  const container = document.getElementById('safe-dial-container');
  const hitbox = document.getElementById('safe-dial-hitbox');
  const ring = document.getElementById('safe-dial-ring');
  const touchEffect = document.getElementById('safe-dial-touch-effect');
  
  if (!container || !hitbox || !ring || !touchEffect) return;
  
  let isDragging = false;
  let currentSector = -1;
  let holdTimer = null;

  const getAngle = (x, y) => {
    const rect = container.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let angle = Math.atan2(y - cy, x - cx) * 180 / Math.PI;
    if (angle < 0) angle += 360;
    return angle;
  };

  const processMove = (x, y, rect) => {
    const touchX = x - rect.left;
    const touchY = y - rect.top;
    touchEffect.style.left = touchX + 'px';
    touchEffect.style.top = touchY + 'px';

    const angle = getAngle(x, y);
    const sector = Math.floor(angle / (360 / SAFE_SECTORS));
    
    if (sector !== currentSector) {
      currentSector = sector;
      const circumference = 2 * Math.PI * SAFE_RADIUS;
      ring.style.strokeDasharray = (circumference / SAFE_SECTORS) + ' 1000';
      ring.style.strokeDashoffset = -(sector * (circumference / SAFE_SECTORS));
      
      const zoneIndex = SAFE_PIN.length;
      if (zoneIndex < TARGET_ZONES.length) {
        const zone = TARGET_ZONES[zoneIndex];
        let isCorrect = false;
        if (zone.end === 360) {
          if (angle >= zone.start || angle <= 0) isCorrect = true;
        } else {
          if (angle >= zone.start && angle <= zone.end) isCorrect = true;
        }
        
        if (isCorrect) {
            ring.style.filter = 'drop-shadow(0 0 12px rgba(0, 255, 0, 1)) brightness(1.5)';
            ring.style.stroke = '#00FF00';
        } else {
            ring.style.filter = 'drop-shadow(0 0 8px rgba(255, 0, 0, 0.8)) brightness(1.2)';
            ring.style.stroke = '#FF0000';
        }
      }
      
      if (holdTimer) clearTimeout(holdTimer);
      
      holdTimer = setTimeout(() => {
        if (SAFE_PIN.length < 3) {
          SAFE_PIN += sector;
          
          if (SAFE_PIN.length === 3) {
            setTimeout(() => {
              const pin = '201186';
              tryUnlock(pin).then(ok => {
                if (ok) {
                  document.getElementById('scroll-pin-screen').classList.remove('active');
                  const l = document.getElementById('loading');
                  if (l) l.remove();
                  showScreen('dashboard');
                  renderDashboard();
                } else {
                  alert('Неверный код');
                  SAFE_PIN = '';
                  ring.style.strokeDasharray = '0 1000';
                  ring.style.filter = 'drop-shadow(0 0 6px rgba(255, 165, 0, 0.6))';
                  ring.style.stroke = '#FFA500';
                }
              });
            }, 300);
          }
        }
      }, 600);
    }
  };

  hitbox.addEventListener('touchstart', (e) => {
    e.preventDefault();
    isDragging = true;
    touchEffect.classList.add('active');
    const rect = container.getBoundingClientRect();
    processMove(e.touches[0].clientX, e.touches[0].clientY, rect);
  }, { passive: false });

  hitbox.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (!isDragging) return;
    const rect = container.getBoundingClientRect();
    processMove(e.touches[0].clientX, e.touches[0].clientY, rect);
  }, { passive: false });

  const endDrag = () => {
    isDragging = false;
    touchEffect.classList.remove('active');
    if (holdTimer) clearTimeout(holdTimer);
    setTimeout(() => {
        ring.style.strokeDasharray = '0 1000';
        ring.style.filter = 'drop-shadow(0 0 6px rgba(255, 165, 0, 0.6))';
        ring.style.stroke = '#FFA500';
    }, 300);
  };

  hitbox.addEventListener('touchend', endDrag);
  hitbox.addEventListener('touchcancel', endDrag);
}

function showScreen(name) {
  ['scroll-pin-screen', 'dashboard', 'loading'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    if (id === name) el.classList.remove('hidden');
    else el.classList.add('hidden');
  });
  const tabs = document.querySelector('.tabs');
  if (tabs) tabs.style.display = (name === 'dashboard') ? 'flex' : 'none';
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

function showCreators() {
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
