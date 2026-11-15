const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

async function init() {
  // СЕЙФ ОТКЛЮЧЕН
  // if (typeof showSafe === "function") { showSafe(); }
  
  const btnHeart = $('#btn-heart');
  if (btnHeart) btnHeart.addEventListener('click', showCreators);
  const btnProfile = document.querySelector("#btn-profile");
  if (btnProfile) btnProfile.addEventListener("click", showJoke);

  document.addEventListener('click', (e) => {
    if (e.target.closest('#btn-lock')) {
      if (typeof lock === 'function') lock();
      else if (typeof showSafe === 'function') showSafe();
    }
  });

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
  const loadingEl = document.getElementById('loading');
  if (loadingEl) loadingEl.classList.add('hidden');

  if (typeof loadDataFromSupabase === 'function') {
    loadDataFromSupabase().then(ok => {
      if (ok) {
        // СЕЙФ ОТКЛЮЧЕН
        // if (typeof showSafe === 'function') { showSafe(); } else { ... }
        showScreen('dashboard');
        if (typeof renderDashboard === 'function') renderDashboard();
      } else {
        alert('Ошибка загрузки из Supabase');
      }
    });
  } else {
    alert('Критическая ошибка: модуль Supabase не загружен.');
    showScreen('dashboard');
  }
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

window.switchTab = function(name) {
  if (typeof window.setTab === 'function') window.setTab(name);

  // Управление нижним баром
  const bottomPanel = document.getElementById("bottom-panel");
  if (bottomPanel) {
    if (name === "diary") { bottomPanel.style.display = "flex"; } else { bottomPanel.style.display = "none"; }
  }

  const _t = document.getElementById('global-chart-tooltip');
  if (_t) _t.remove();

  ['content', 'content-diary', 'content-projects', 'content-activity'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.scrollTop = 0;
  });
  window.scrollTo(0, 0);

  document.querySelectorAll('.floating-tooltip, #global-chart-tooltip, #tl-legend-bar').forEach(el => {
    el.style.display = 'none';
    el.classList.add('hidden');
  });

  ['content', 'content-diary', 'content-projects', 'content-activity'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.classList.add('hidden'); el.innerHTML = ''; }
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
      if (c) { c.classList.remove('hidden'); if (typeof renderActivityPageV2 === 'function') { renderActivityPageV2(); } }
      const t = document.getElementById('tab-activity'); if (t) t.classList.add('tab-active');
    } else {
      if (typeof HERO_MODE !== 'undefined') HERO_MODE = 'today';
      const c = document.getElementById('content');
      if (c) { c.classList.remove('hidden'); renderDashboard(); }
      const t = document.getElementById('tab-dashboard'); if (t) t.classList.add('tab-active');
    }
  } catch (e) {
    console.error('Ошибка при переключении вкладки:', e);
  }
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

if (typeof renderDashboard === 'function') window.renderDashboard = renderDashboard;
