// Хераборина — основная логика UI
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const PIN_KEY = 'worklog_pin';
const PIN_LEN = 6;

let DATA = null;
let PIN_BUF = '';

window.__initCalls = 0;
let CHART_PERIOD = 7;
let CHART_OFFSET_MONTHS = 0;  // сдвиг месяца (0 = текущий, -1 = прошлый)   // 1 = день, 7 = неделя, 30 = месяц
let CHART_METRIC = 'duration';  // duration | events | screens
let CHART_SELECTED = null;  // выбранный день для тултипа
let DAILY_GOAL_MIN = (function(){
  try {
    const v = parseInt(localStorage.getItem('worklog_goal_min'), 10);
    if (v > 0 && v <= 1440) return v;
  } catch (e) {}
  // Fallback из DATA (расшифрованного worklog.json)
  if (typeof DATA !== 'undefined' && DATA && DATA.daily_goal_min) {
    return DATA.daily_goal_min;
  }
  return 720;
})();

function _bootstrap() {
  window.__initCalls++;
  if (window.__initCalls === 1) init();
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', _bootstrap);
} else {
  _bootstrap();
}
setTimeout(_bootstrap, 0);


async function init() {
  setupPinPad();
  const _btnLock = $('#btn-lock');
  if (_btnLock) _btnLock.addEventListener('click', lock);
  setupTabs();

  const saved = localStorage.getItem(PIN_KEY);
  if (saved) {
    showScreen('loading');
    const ok = await tryUnlock(saved);
    if (ok) {
      renderDashboard();
      showScreen('dashboard');
      return;
    }
    localStorage.removeItem(PIN_KEY);
  }
  showScreen('pin-screen');
}

function setupTabs() {
  const logo = document.querySelector('.logo');
  if (logo) {
    logo.style.cursor = 'pointer';
    logo.addEventListener('click', () => { switchTab('dashboard'); });
  }
  const tabDash = document.getElementById('tab-dashboard');
  const tabDiary = document.getElementById('tab-diary');
  const tabProjects = document.getElementById('tab-projects');
  if (!tabDash || !tabDiary) return;
  tabDash.addEventListener('click', () => switchTab('dashboard'));
  tabDiary.addEventListener('click', () => switchTab('diary'));
  if (tabProjects) tabProjects.addEventListener('click', () => switchTab('projects'));
}

function switchTab(name) {
  const tabDash = document.getElementById('tab-dashboard');
  const tabDiary = document.getElementById('tab-diary');
  const tabProjects = document.getElementById('tab-projects');
  const cDash = document.getElementById('content');
  const cDiary = document.getElementById('content-diary');
  const cProjects = document.getElementById('content-projects');
  if (!tabDash || !tabDiary || !cDash || !cDiary) return;

  // Скрыть все
  [tabDash, tabDiary, tabProjects].forEach(t => t && t.classList.remove('tab-active'));
  [cDash, cDiary, cProjects].forEach(c => c && c.classList.add('hidden'));

  if (name === 'diary') {
    tabDiary.classList.add('tab-active');
    cDiary.classList.remove('hidden');
    renderDiary();
  } else if (name === 'projects') {
    if (tabProjects) tabProjects.classList.add('tab-active');
    if (cProjects) {
      cProjects.classList.remove('hidden');
      cProjects.innerHTML = '';
      cProjects.appendChild(renderProjects());
    }
  } else {
    tabDash.classList.add('tab-active');
    cDash.classList.remove('hidden');
    cDash.classList.remove('hidden');
  }
}

function renderDiary() {
  const c = document.getElementById('content-diary');
  if (!c || !DATA) return;
  c.innerHTML = '';

  const list = (DATA.sessions || []).slice().sort((a, b) =>
    (b.date + (b.start || '')).localeCompare(a.date + (a.start || ''))
  );

  if (!list.length) {
    c.innerHTML = '<div class="empty"><div class="empty-icon">📭</div>Нет записей</div>';
    return;
  }

  const projName = {};
  for (const p of DATA.projects || []) projName[p.id] = p.name;

  // === Склейка через полночь ===
  const _sorted = list.slice().sort((a, b) => (a.date + (a.start || '')).localeCompare(b.date + (b.start || '')));
  const _merged = [];
  for (const ss of _sorted) {
    const last = _merged[_merged.length - 1];
    if (last && (last.end === '23:59' || last.end === '00:00') && ss.start === '00:00') {
      const lastDate = new Date(last.date + 'T00:00:00');
      const curDate = new Date(ss.date + 'T00:00:00');
      if (Math.round((curDate - lastDate) / 86400000) === 1) {
        last.end = ss.end;
        last.duration_min = (last.duration_min || 0) + (ss.duration_min || 0);
        last.events = (last.events || 0) + (ss.events || 0);
        last.screens = (last.screens || 0) + (ss.screens || 0);
        last.note = [(last.note || ''), (ss.note || '')].filter(Boolean).join(' / ');
        last._isMerged = true;
        continue;
      }
    }
    const _c = Object.assign({}, ss);
    if (!_c.note) _c.note = '';
    if (!_c.duration_min) _c.duration_min = 0;
    if (!_c.events) _c.events = 0;
    if (!_c.screens) _c.screens = 0;
    _merged.push(_c);
  }

  const byDate = {};
  for (const ss of _merged) {
    if (!byDate[ss.date]) byDate[ss.date] = [];
    byDate[ss.date].push(ss);
  }

  const dates = Object.keys(byDate).sort((a, b) => b.localeCompare(a));
  for (const d of dates) {
    const header = document.createElement('div');
    header.className = 'diary-date';
    header.textContent = formatDiaryDate(d);
    c.appendChild(header);

    const _sortedSess = byDate[d].slice().sort((a, b) => (b.start || '').localeCompare(a.start || ''));
    for (const s of _sortedSess) {
      const item = document.createElement('div');
      item.className = 'diary-item';
      const timeRange = (s.start || '?') + ' → ' + (s.end || '?');
      const dur = fmtH(s.duration_min || 0);
      const proj = projName[s.project] || s.project || '–';
      const note = s.note || '';
      const evs = s.events || 0;
      const scrs = s.screens || 0;
      const counters = (evs || scrs) ? ('📨 ' + evs + ' · 📸 ' + scrs) : '';
      item.innerHTML =
        '<div class="diary-time">' + timeRange + ' · <span class="diary-dur">' + dur + '</span></div>' +
        '<div class="diary-proj">' + proj + '</div>' +
        (counters ? '<div class="diary-counters">' + counters + '</div>' : '') +
        (note ? '<div class="diary-note">' + note + '</div>' : '');
      c.appendChild(item);
    }
  }
}

function formatDiaryDate(iso) {
  const months = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
  const days = ['вс','пн','вт','ср','чт','пт','сб'];
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d.getTime())) return iso;
  return d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear() + ', ' + days[d.getDay()];
}

function showScreen(name) {
  ['pin-screen', 'dashboard', 'loading'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    if (id === name) el.classList.remove('hidden');
    else el.classList.add('hidden');
  });
}

function lock() {
  localStorage.removeItem(PIN_KEY);
  DATA = null;
  PIN_BUF = '';
  updatePinDisplay();
  showScreen('pin-screen');
}

// === PIN-пад ===
function setupPinPad() {
  $$('.pin-pad button').forEach(btn => {
    btn.addEventListener('click', () => onPinKey(btn.dataset.d));
  });
  document.addEventListener('keydown', (e) => {
    const _ps = $('#pin-screen');
    if (!_ps || _ps.classList.contains('hidden')) return;
    if (e.key >= '0' && e.key <= '9') onPinKey(e.key);
    else if (e.key === 'Backspace') onPinKey('del');
    else if (e.key === 'Escape') onPinKey('clear');
  });
}

async function onPinKey(key) {
  if (key === 'clear') {
    PIN_BUF = '';
  } else if (key === 'del') {
    PIN_BUF = PIN_BUF.slice(0, -1);
  } else {
    if (PIN_BUF.length >= PIN_LEN) return;
    PIN_BUF += key;
  }
  updatePinDisplay();

  if (PIN_BUF.length === PIN_LEN) {
    await submitPin(PIN_BUF);
  }
}

function updatePinDisplay() {
  const disp = $('#pin-display');
  disp.innerHTML = '';
  for (let i = 0; i < PIN_LEN; i++) {
    const dot = document.createElement('div');
    dot.className = 'dot' + (i < PIN_BUF.length ? ' filled' : '');
    disp.appendChild(dot);
  }
  $('#pin-error').textContent = '';
}

async function submitPin(pin) {
  showScreen('loading');
  const ok = await tryUnlock(pin);
  if (ok) {
    localStorage.setItem(PIN_KEY, pin);
    renderDashboard();
    showScreen('dashboard');
  } else {
    PIN_BUF = '';
    updatePinDisplay();
    $('#pin-error').textContent = 'Неверный PIN';
    showScreen('pin-screen');
  }
}

async function tryUnlock(pin) {
  try {
    const resp = await fetch('data.encrypted.json?_=' + Date.now());
    if (!resp.ok) throw new Error('fetch failed');
    const encrypted = await resp.json();
    DATA = await decryptData(pin, encrypted);
    // Обновить DAILY_GOAL_MIN из DATA (если есть)
    if (DATA && DATA.daily_goal_min) {
      DAILY_GOAL_MIN = DATA.daily_goal_min;
    }
    return true;
  } catch (e) {
    return false;
  }
}

// === Рендер дашборда ===
function renderDashboard() {
  if (!DATA) return;
  const cDash = $('#content-diary');
  if (cDash) cDash.classList.add('hidden');
  const cTab = $('#content');
  if (cTab) cTab.classList.remove('hidden');
  const c = $('#content');
  c.innerHTML = '';
  c.appendChild(renderHeroRings());
  c.appendChild(renderChart());
  c.appendChild(renderSessions());
  c.appendChild(renderFooter());
}

function renderRingSVG(percent, size, strokeWidth, color) {
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(100, percent));
  const dash = c * p / 100;
  return '<svg width="' + size + '" height="' + size + '" class="ring-svg">' +
