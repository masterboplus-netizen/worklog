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
  if (btnHeart) btnHeart.addEventListener('click', showJoke);

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

  const saved = localStorage.getItem(PIN_KEY);
  if (saved) {
    tryUnlock(saved).then(ok => {
      if (ok) { 
        const l = document.getElementById('loading');
        if (l) l.remove();
        renderDashboard(); 
        showScreen('dashboard'); 
      }
      else { 
        localStorage.removeItem(PIN_KEY); 
        showScreen('pin-screen'); 
      }
    });
  } else {
    const loadingEl = document.getElementById('loading');
    if (loadingEl) loadingEl.classList.remove('hidden');
    setTimeout(() => {
      if (loadingEl) loadingEl.classList.add('hidden');
      showScreen('pin-screen');
    }, 1000);
  }
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
}



function showJoke() {
  const modal = document.getElementById('joke-modal');
  if (modal) {
    modal.classList.remove('hidden');
    setTimeout(() => {
      modal.style.opacity = '1';
      modal.querySelector('div').style.transform = 'scale(1)';
    }, 10);
  }
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
      if (c) { c.classList.remove('hidden'); renderActivityPage(); }
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


