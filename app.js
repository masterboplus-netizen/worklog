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
        const tabs = document.querySelector('.tabs');
        if (tabs) tabs.style.display = 'flex'; // Страховка
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


