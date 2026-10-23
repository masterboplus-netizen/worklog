

let isChartOpen = false;
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
  const tabActivity = document.getElementById('tab-activity');
  if (!tabDash || !tabDiary) return;
  tabDash.addEventListener('click', () => switchTab('dashboard'));
  tabDiary.addEventListener('click', () => switchTab('diary'));
  if (tabProjects) tabProjects.addEventListener('click', () => switchTab('projects'));
  if (tabActivity) tabActivity.addEventListener('click', () => switchTab('activity'));
}

function switchTab(name) {
  const tabDash = document.getElementById('tab-dashboard');
  const tabDiary = document.getElementById('tab-diary');
  const tabProjects = document.getElementById('tab-projects');
  const tabActivity = document.getElementById('tab-activity');
  
  const cDash = document.getElementById('content');
  const cDiary = document.getElementById('content-diary');
  const cProjects = document.getElementById('content-projects');
  const cActivity = document.getElementById('content-activity');

  if (!tabDash || !tabDiary || !cDash || !cDiary) return;

  // 1. Скрываем ВСЕ вкладки и ВСЕ контейнеры
  [tabDash, tabDiary, tabProjects, tabActivity].forEach(t => t && t.classList.remove('tab-active'));
    // Удаляем контейнер графика из DOM при переходе на другие вкладки
  const actDivToRemove = document.getElementById('content-activity');
  if (actDivToRemove) actDivToRemove.remove();
  
  [cDash, cDiary, cProjects].forEach(c => { if (c) { c.classList.add('hidden'); } });

  // 2. Показываем нужную
  if (name === 'activity') {
    if (tabActivity) tabActivity.classList.add('tab-active');
    if (cActivity) {
      cActivity.classList.remove('hidden');
      cActivity.style.display = 'block'; // Принудительно показываем
      console.log('container found, calling renderActivityPage');
      renderActivityPage();
    } else {
      console.error('cActivity is null');
    }
  } else if (name === 'diary') {
    tabDiary.classList.add('tab-active');
    if (cDiary) {
      cDiary.classList.remove('hidden');
      cDiary.style.display = 'block';
    }
    renderDiary();
  } else if (name === 'projects') {
    if (tabProjects) tabProjects.classList.add('tab-active');
    if (cProjects) {
      cProjects.classList.remove('hidden');
      cProjects.style.display = 'block';
      cProjects.innerHTML = '';
      cProjects.appendChild(renderProjects());
    }
  } else {
    // По умолчанию — Дашборд
    tabDash.classList.add('tab-active');
    if (cDash) {
      cDash.classList.remove('hidden');
      cDash.style.display = 'block';
    }
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

    // Управление видимостью нижней навигации
    const tabs = document.querySelector('.tabs');
    if (tabs) {
        if (name === 'pin-screen') tabs.style.display = 'none';
        else tabs.style.display = 'flex';
    }
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


function renderRingSVG(percent, size, strokeWidth, color) {
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(100, percent));
  const dash = c * p / 100;
  return '<svg width="' + size + '" height="' + size + '" class="ring-svg">' +
    '<circle cx="' + size/2 + '" cy="' + size/2 + '" r="' + r + '" ' +
      'fill="none" stroke="var(--bg3)" stroke-width="' + strokeWidth + '"/>' +
    '<circle cx="' + size/2 + '" cy="' + size/2 + '" r="' + r + '" ' +
      'fill="none" stroke="' + color + '" stroke-width="' + strokeWidth + '" ' +
      'stroke-dasharray="' + dash + ' ' + c + '" stroke-linecap="round" ' +
      'transform="rotate(-90 ' + size/2 + ' ' + size/2 + ')"/>' +
    '</svg>';
}

let HERO_MODE = 'today';  // today | last
let MINI_MSG_PERIOD = 'day';   // day → week → month → all
let MINI_SCR_PERIOD = 'day';
let MINI_TIME_PERIOD = 'avg';  // avg → week → month → all
const MINI_PERIODS_MSG = ['day', 'week', 'month', 'all'];
const MINI_PERIODS_TIME = ['avg', 'week', 'month', 'all'];
const MINI_LABELS = {day: 'День', week: 'Неделя', month: 'Месяц', all: 'Всё', avg: 'Среднее/день'};

function _miniRange(period) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const td = _localDate(today);
  if (period === 'day') return { from: td, to: td };
  if (period === 'week') {
    const from = new Date(today - 6 * 86400000);
    return { from: _localDate(from), to: td };
  }
  if (period === 'month') {
    const from = new Date(today.getFullYear(), today.getMonth(), 1);
    return { from: _localDate(from), to: td };
  }
  return { from: '2000-01-01', to: td };  // all
}

function _sumRange(sessions, period, field) {
  const r = _miniRange(period);
  let sum = 0;
  for (const s of sessions) {
    if (s.date >= r.from && s.date <= r.to) sum += s[field] || 0;
  }
  return sum;
}

function _valSize(val) {
  if (val === null || val === undefined) return 22;
  const str = String(val);
  if (str.indexOf('<br>') >= 0) return 16;  // 2 строки — мелкий
  const len = str.length;
  if (len <= 2) return 22;
  if (len <= 4) return 20;
  return 16;
}

function openGoalSheet() {
  // Удалить старый, если есть
  const old = document.getElementById('goal-sheet-overlay');
  if (old) old.remove();

  const curH = Math.floor(DAILY_GOAL_MIN / 60);
  const overlay = document.createElement('div');
  overlay.id = 'goal-sheet-overlay';
  overlay.className = 'goal-sheet-overlay';
  overlay.innerHTML =
    '<div class="goal-sheet" id="goal-sheet">' +
      '<button class="goal-sheet-close" aria-label="Закрыть">✕</button>' +
      '<h2 class="goal-sheet-title">Цель по времени</h2>' +
      '<div class="goal-picker" id="goal-picker">' +
        '<div class="goal-picker-spacer"></div>' +
        Array.from({length: 24}, (_, i) => i + 1).map(h =>
          '<div class="goal-picker-item' + (h === curH ? ' active' : '') + '" data-h="' + h + '">' + h + ' ч</div>'
        ).join('') +
        '<div class="goal-picker-spacer"></div>' +
      '</div>' +
      '<div class="goal-sheet-actions">' +
        '<button class="goal-cancel">Отмена</button>' +
        '<button class="goal-save">Сохранить</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(overlay);

  const picker = overlay.querySelector('#goal-picker');
  const close = () => overlay.remove();
  const save = () => {
    // Активный элемент — по центру
    const active = picker.querySelector('.goal-picker-item.active');
    const v = active ? parseInt(active.dataset.h, 10) : curH;
    if (v > 0 && v <= 24) {
      try {
        localStorage.setItem('worklog_goal_min', String(v * 60));
      } catch (e) {
        console.warn('localStorage failed:', e);
      }
      // Обновить DATA (для сохранения на сервере при следующем encrypt.py)
      if (typeof DATA !== 'undefined' && DATA) {
        DATA.daily_goal_min = v * 60;
      }
      DAILY_GOAL_MIN = v * 60;
      close();
      renderDashboard();
    }
  };

  // Скроллим к текущей
  setTimeout(() => {
    const cur = picker.querySelector('.goal-picker-item.active');
    if (cur) cur.scrollIntoView({ block: 'center' });
  }, 10);

  // При скролле — обновляем active (по центру)
  picker.addEventListener('scroll', () => {
    const rect = picker.getBoundingClientRect();
    const center = rect.top + rect.height / 2;
    let best = null, bestDist = Infinity;
    picker.querySelectorAll('.goal-picker-item').forEach(it => {
      const r = it.getBoundingClientRect();
      const d = Math.abs((r.top + r.height / 2) - center);
      if (d < bestDist) { bestDist = d; best = it; }
    });
    picker.querySelectorAll('.goal-picker-item').forEach(it => it.classList.remove('active'));
    if (best) best.classList.add('active');
  });

  overlay.querySelector('.goal-sheet-close').addEventListener('click', close);
  overlay.querySelector('.goal-cancel').addEventListener('click', close);
  overlay.querySelector('.goal-save').addEventListener('click', save);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
}

function renderHeroRings() {
  const t = calcTotals();
  // Заменяем цель на среднее время за день
  if (t.avgPerDay > 0) {
    DAILY_GOAL_MIN = t.avgPerDay;
  }
  const sessions = DATA.sessions || [];
  // avg за 7 дней
  const now = new Date();
  const days7 = [];
  for (let i = 6; i >= 0; i--) days7.push(new Date(now - i*86400000).toISOString().slice(0,10));
  let weekDur = 0, weekEv = 0, weekScr = 0;
  for (const ss of sessions) {
    if (days7.includes(ss.date)) {
      weekDur += ss.duration_min || 0;
      weekEv += ss.events || 0;
      weekScr += ss.screens || 0;
    }
  }
  const avgDur = weekDur / 7;
  const avgEv = weekEv / 7;
  const avgScr = weekScr / 7;

  // Логика: Сегодня / Последняя сессия
  let heroValue, heroSub, heroLabel;
  if (HERO_MODE === 'last') {
    const sorted = (DATA.sessions || []).slice().sort((a, b) => (b.date + (b.end || '')).localeCompare(a.date + (a.end || '')));
    const lastSess = sorted[0];
    heroValue = lastSess ? (lastSess.duration_min || 0) : 0;
    heroLabel = 'Последняя сессия';
    heroSub = lastSess ? (lastSess.date.slice(8, 10) + '.' + lastSess.date.slice(5, 7)) : '';
  } else {
    heroValue = t.todayMin;
    heroLabel = 'Сегодня';
    heroSub = 'Цель ' + fmtH(DAILY_GOAL_MIN) + ' · ' + Math.round(t.todayMin / DAILY_GOAL_MIN * 100) + '%';
  }
  const pctDur = Math.round(heroValue / DAILY_GOAL_MIN * 100);
  const ringColor = pctDur >= 100 ? 'var(--green)' : 'var(--accent)';
  const todayEv = sessions.filter(x => x.date === new Date().toISOString().slice(0,10)).reduce((a,x)=>a+(x.events||0),0);
  const todayScr = sessions.filter(x => x.date === new Date().toISOString().slice(0,10)).reduce((a,x)=>a+(x.screens||0),0);
  const pctEv = avgEv > 0 ? Math.round(todayEv / avgEv * 100) : 0;
  const pctScr = avgScr > 0 ? Math.round(todayScr / avgScr * 100) : 0;

  const _sessions = DATA.sessions || [];
  const msgVal = _sumRange(_sessions, MINI_MSG_PERIOD, 'events');
  const scrVal = _sumRange(_sessions, MINI_SCR_PERIOD, 'screens');
  // timeVal: часы сверху, минуты снизу (для «Всё время» 359ч 42м)
  function _fmtH2(min) {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return h + 'ч<br>' + m + 'м';
  }
  let timeVal;
  if (MINI_TIME_PERIOD === 'avg') timeVal = fmtH(t.avgPerDay);
  else if (MINI_TIME_PERIOD === 'all') timeVal = _fmtH2(t.total);
  else timeVal = _fmtH2(_sumRange(_sessions, MINI_TIME_PERIOD, 'duration_min'));

  const div = document.createElement('div');
  div.className = 'hero-rings';

  // Большое кольцо
  div.innerHTML =
    '<div class="hero-main">' +
      '<div class="ring-wrap" style="cursor:pointer" id="hero-ring">' + renderRingSVG(pctDur, 290, 14, ringColor) +
        '<div class="ring-center">' +
          '<div class="ring-icon">' + (HERO_MODE === 'today'
            ? '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--fg-dim)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>'
            : '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--fg-dim)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2"/><path d="M9 2h6"/></svg>') + '</div>' +
          '<div class="ring-label">' + heroLabel + '</div>' +
          '<div class="ring-value">' + fmtH(heroValue) + '</div>' +
          '<div class="ring-sub">' + heroSub + '</div>' +
        '</div>' +
      '</div>' +
    '</div>' +
    '<div class="hero-mini">' +
      '<div class="mini-block" data-mini="msg">' +
        '<div class="mini-label"><div class="mini-lbl-title">Сообщения</div><div class="mini-lbl-period">' + MINI_LABELS[MINI_MSG_PERIOD] + '</div></div>' +
        '<div class="mini-ring" style="cursor:pointer">' + renderRingSVG(100, 92, 7, 'var(--green)') +
          '<div class="mini-center"><div class="mini-val" style="font-size:' + _valSize(msgVal) + 'px">' + msgVal + '</div></div>' +
        '</div>' +
      '</div>' +
      '<div class="mini-block" data-mini="scr">' +
        '<div class="mini-label"><div class="mini-lbl-title">Скрины</div><div class="mini-lbl-period">' + MINI_LABELS[MINI_SCR_PERIOD] + '</div></div>' +
        '<div class="mini-ring" style="cursor:pointer">' + renderRingSVG(100, 92, 7, 'var(--yellow)') +
          '<div class="mini-center"><div class="mini-val" style="font-size:' + _valSize(scrVal) + 'px">' + scrVal + '</div></div>' +
        '</div>' +
      '</div>' +
      '<div class="mini-block" data-mini="time">' +
        '<div class="mini-label">' + (MINI_TIME_PERIOD === 'avg' ? '<div class="mini-lbl-title">Среднее/день</div>' : '<div class="mini-lbl-title">Время</div><div class="mini-lbl-period">' + MINI_LABELS[MINI_TIME_PERIOD] + '</div>') + '</div>' +
        '<div class="mini-ring" style="cursor:pointer">' + renderRingSVG(100, 92, 7, 'var(--accent)') +
          '<div class="mini-center"><div class="mini-val" style="font-size:' + _valSize(timeVal) + 'px">' + timeVal + '</div></div>' +
        '</div>' +
      '</div>' +
    '</div>';
  // Тап на главное кольцо — переключение Сегодня / Последняя сессия
  const heroRing = div.querySelector('#hero-ring');
  if (heroRing) {
    heroRing.addEventListener('click', (ev) => {
      // Проверяем ближайший родитель — вдруг клик по вложенному элементу
      const editEl = ev.target.closest && ev.target.closest('.edit-goal');
      if (false) {
        ev.stopPropagation();
        ev.preventDefault();
        openGoalSheet();
        return;
      }
      HERO_MODE = HERO_MODE === 'today' ? 'last' : 'today';
      renderDashboard();
    });
  }

  // Тап на малые кольца — циклическое переключение периода
  div.querySelectorAll('.mini-block').forEach(block => {
    const ring = block.querySelector('.mini-ring');
    if (!ring) return;
    ring.addEventListener('click', () => {
      const type = block.dataset.mini;
      if (type === 'msg') MINI_MSG_PERIOD = MINI_PERIODS_MSG[(MINI_PERIODS_MSG.indexOf(MINI_MSG_PERIOD) + 1) % MINI_PERIODS_MSG.length];
      else if (type === 'scr') MINI_SCR_PERIOD = MINI_PERIODS_MSG[(MINI_PERIODS_MSG.indexOf(MINI_SCR_PERIOD) + 1) % MINI_PERIODS_MSG.length];
      else if (type === 'time') MINI_TIME_PERIOD = MINI_PERIODS_TIME[(MINI_PERIODS_TIME.indexOf(MINI_TIME_PERIOD) + 1) % MINI_PERIODS_TIME.length];
      renderDashboard();
    });
  });

  return div;
}

function fmtH(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? h + 'ч ' + m + 'м' : m + 'м';
}

function calcTotals() {
  const now = new Date();
  const today = _localDate(now);
  const weekAgo = _localDate(new Date(now - 7 * 86400000));
  const monthAgo = _localDate(new Date(now - 30 * 86400000));

  const base = DATA.baseline || {};
  const baseMin = base.minutes || 0;
  const baseMsgs = base.messages || 0;

  let total = 0, week = 0, month = 0, todayMin = 0, screens = 0, msgs = 0;
  for (const s of DATA.sessions || []) {
    total += s.duration_min || 0;
    if (s.date >= weekAgo) week += s.duration_min || 0;
    if (s.date >= monthAgo) month += s.duration_min || 0;
    if (s.date === today) todayMin += s.duration_min || 0;
    screens += s.screens || 0;
    msgs += s.events || 0;
  }
  // Базовая линия (архив) — только в «Всего» и в общих счётчиках
  const uniqueDays = new Set((DATA.sessions || []).map(x => x.date)).size;
  return {
    total: total + baseMin,
    totalNoBase: total,
    week,
    month,
    todayMin,
    screens,
    msgs: msgs + baseMsgs,
    count: (DATA.sessions || []).length,
    daysCount: uniqueDays,
    avgPerDay: Math.round(total / Math.max(1, uniqueDays))
  };
}

function renderMetrics() {
  const t = calcTotals();
  const div = document.createElement('div');
  div.className = 'metrics';
  const items = [
    ['Сегодня',  fmtH(t.todayMin), true],
    ['7 дней',   fmtH(t.week),     true],
    ['30 дней',  fmtH(t.month),    false],
    ['Всего',    fmtH(t.total),    false],
    ['📨 Сообщений', String(t.msgs),    false],
    ['📸 Скринов',   String(t.screens), false],
  ];
  div.innerHTML = items.map(([l, v, acc]) =>
    '<div class="metric"><div class="metric-label">' + l + '</div>' +
    '<div class="metric-value' + (acc ? ' accent' : '') + '">' + v + '</div></div>'
  ).join('');
  return div;
}

function openAnalyticsSheet(projectId) {
  const old = document.getElementById('analytics-sheet-overlay');
  if (old) old.remove();

  const proj = (DATA.projects || []).find(p => p.id === projectId) || {};
  const sessions = (DATA.sessions || []).filter(s => s.project === projectId);
  const realMin = sessions.reduce((a, s) => a + (s.duration_min || 0), 0);
  const realEv = sessions.reduce((a, s) => a + (s.events || 0), 0);
  const realScr = sessions.reduce((a, s) => a + (s.screens || 0), 0);
  const uniqueDays = new Set(sessions.map(s => s.date)).size;
  const avgDay = uniqueDays > 0 ? Math.round(realMin / uniqueDays) : 0;

  // По месяцам
  const byMonth = {};
  for (const s of sessions) {
    const m = s.date.slice(0, 7);  // YYYY-MM
    byMonth[m] = (byMonth[m] || 0) + (s.duration_min || 0);
  }
  const months = Object.keys(byMonth).sort();
  const maxMonth = Math.max(1, ...months.map(m => byMonth[m]));
  const monthBars = months.map(m => {
    const pct = Math.round(byMonth[m] / maxMonth * 100);
    const label = m.slice(5, 7) + '.' + m.slice(0, 4);
    return '<div class="an-month-row"><div class="an-month-label">' + label + '</div>' +
      '<div class="an-month-bar-wrap"><div class="an-month-bar" style="width:' + pct + '%"></div></div>' +
      '<div class="an-month-val">' + fmtH(byMonth[m]) + '</div></div>';
  }).join('');

  // Топ-3 дня
  const byDay = {};
  for (const s of sessions) byDay[s.date] = (byDay[s.date] || 0) + (s.duration_min || 0);
  const topDays = Object.entries(byDay).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const topDaysHTML = topDays.map(([d, v], i) =>
    '<div class="an-top-row"><span class="an-top-rank">' + (i + 1) + '.</span> ' +
    d.slice(8, 10) + '.' + d.slice(5, 7) + ' — <b>' + fmtH(v) + '</b></div>'
  ).join('') || '<div class="an-top-row">Пока нет данных</div>';

  // Тренд: эта неделя vs прошлая
  const now = new Date();
  function weekMin(offsetWeeks) {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6 - offsetWeeks * 7);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offsetWeeks * 7);
    let sum = 0;
    for (const s of sessions) {
      const sd = new Date(s.date + 'T00:00:00');
      if (sd >= start && sd <= end) sum += (s.duration_min || 0);
    }
    return sum;
  }
  const thisWeek = weekMin(0);
  const prevWeek = weekMin(1);
  let trendStr = '—';
  let trendClass = 'trend-neutral';
  if (prevWeek > 0) {
    const pct = Math.round((thisWeek - prevWeek) / prevWeek * 100);
    if (pct > 5) { trendStr = 'активнее обычного (+' + pct + '%)'; trendClass = 'trend-up'; }
    else if (pct < -5) { trendStr = 'медленнее обычного (' + pct + '%)'; trendClass = 'trend-down'; }
    else { trendStr = 'как обычно (±' + pct + '%)'; trendClass = 'trend-neutral'; }
  }

  const overlay = document.createElement('div');
  overlay.id = 'analytics-sheet-overlay';
  overlay.className = 'goal-sheet-overlay';
  overlay.innerHTML =
    '<div class="goal-sheet analytics-sheet" id="analytics-sheet">' +
      '<button class="goal-sheet-close" aria-label="Закрыть">✕</button>' +
      '<h2 class="goal-sheet-title">Аналитика: ' + (proj.name || projectId) + '</h2>' +
      // Блок 1: средние
      '<div class="an-block an-stats">' +
        '<div class="an-stat"><div class="an-stat-label">Среднее/день</div><div class="an-stat-val">' + fmtH(avgDay) + '</div></div>' +
        '<div class="an-stat"><div class="an-stat-label">Всего</div><div class="an-stat-val">' + fmtH(realMin) + '</div></div>' +
        '<div class="an-stat"><div class="an-stat-label">Сессий</div><div class="an-stat-val">' + sessions.length + '</div></div>' +
      '</div>' +
      // Блок 2: счётчики
      '<div class="an-block an-stats">' +
        '<div class="an-stat"><div class="an-stat-label">Сообщений</div><div class="an-stat-val">' + realEv + '</div></div>' +
        '<div class="an-stat"><div class="an-stat-label">Скринов</div><div class="an-stat-val">' + realScr + '</div></div>' +
        '<div class="an-stat"><div class="an-stat-label">Дней</div><div class="an-stat-val">' + uniqueDays + '</div></div>' +
      '</div>' +
      // Блок 3: по месяцам
      '<div class="an-section-title">📅 По месяцам</div>' +
      '<div class="an-block">' + (monthBars || '<div class="an-top-row">Нет данных</div>') + '</div>' +
      // Блок 4: топ-3
      '<div class="an-section-title">🏆 Топ-3 дня</div>' +
      '<div class="an-block">' + topDaysHTML + '</div>' +
      // Блок 5: тренд
      '<div class="an-section-title">📈 Тренд (7 дней)</div>' +
      '<div class="an-block an-trend ' + trendClass + '">' + trendStr + '</div>' +
    '</div>';
  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  overlay.querySelector('.goal-sheet-close').addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
}

function renderProjects() {
  const sec = document.createElement('div');
  sec.className = 'section';
  

  const byProj = {};
  for (const s of DATA.sessions || []) {
    byProj[s.project] = (byProj[s.project] || 0) + (s.duration_min || 0);
  }

  // Прибавляем baseline (общая история до 15.10) к проекту bo81
  const base = DATA.baseline || {};
  if (base.minutes && base.project) {
    byProj[base.project] = (byProj[base.project] || 0) + base.minutes;
  } else if (base.minutes) {
    // По умолчанию — к первому проекту (bo81)
    const firstId = (DATA.projects || [])[0]?.id;
    if (firstId) byProj[firstId] = (byProj[firstId] || 0) + base.minutes;
  }

  for (const p of DATA.projects || []) {
    const hrs = byProj[p.id] || 0;

    // Прогресс по фазам
    let totalItems = 0, doneItems = 0;
    for (const ph of p.plan || []) {
      const items = ph.items || [];
      totalItems += items.length;
      doneItems += items.filter(it => typeof it === 'object' && it.done).length;
    }
    const pct = totalItems ? Math.round(doneItems / totalItems * 100) : 0;

    const card = document.createElement('div');
    card.className = 'project-card';
    card.style.marginBottom = '16px';
    card.style.marginTop = '16px';
    card.style.marginLeft = '16px';
    card.style.marginRight = '16px';
    card.innerHTML =
      '<div class="project-head">' +
        '<div class="project-name">' +
          '<span class="project-dot" style="background:' + (p.color || '#4A9EFF') + '"></span>' +
          p.name +
        '</div>' +
        '<div class="project-hours">' + fmtH(hrs) + '</div>' +
      '</div>' +
      '<div class="progress-bar"><div class="progress-fill" style="width:' + pct +
        '%;background:' + (p.color || '#4A9EFF') + '"></div></div>' +
      '<div class="project-meta">Выполнено: ' + doneItems + ' из ' + totalItems +
        ' (' + pct + '%) · ' + (p.status || '') + '</div>';

    // Фазы
    const phasesDiv = document.createElement('div');
    phasesDiv.className = 'phases';
    for (const ph of p.plan || []) {
      const items = ph.items || [];
      const total = items.length;
      const done = items.filter(it => typeof it === 'object' && it.done).length;
      const phPct = total ? Math.round(done / total * 100) : 0;
      const statusIcon = phPct === 100 ? '\u2705' : (phPct > 0 ? '\u{1F7E1}' : '\u{1F4CB}');

      const phDiv = document.createElement('div');
      phDiv.className = 'phase';
      phDiv.innerHTML =
        '<div class="phase-head"><span class="phase-arrow"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg></span>' +
          '<span class="phase-icon">' + statusIcon + '</span>' +
          '<span class="phase-name">' + ph.phase + '</span>' +
          '<span class="phase-pct">' + phPct + '%</span>' +
        '</div>' +
        '<div class="phase-bar"><div class="phase-fill" style="width:' + phPct +
          '%;background:' + (p.color || '#4A9EFF') + '"></div></div>';

      // Список пунктов
      const itemsList = document.createElement('div');
      itemsList.className = 'phase-items hidden';
      for (const it of items) {
        if (typeof it === 'object') {
          const line = document.createElement('div');
          line.className = 'phase-item' + (it.done ? ' done' : '');
          line.textContent = (it.done ? '\u2705 ' : '\u23F3 ') + it.text;
          itemsList.appendChild(line);
        }
      }
      phDiv.appendChild(itemsList);

      phDiv.addEventListener('click', () => {
        phDiv.classList.toggle('open');
        itemsList.classList.toggle('hidden');
      });

      phasesDiv.appendChild(phDiv);
    }
    // Фазы — скрыты по умолчанию
    phasesDiv.classList.add('hidden');
    card.appendChild(phasesDiv);

    // Клик на шапку карточки (.project-head) — раскрыть/свернуть фазы
      // Тап на шапку убран (раскрытие — через кнопку «Открыть»)
      // Две кнопки: Открыть + Аналитика (готовый HTML)
      const actionsDiv = document.createElement('div');
      actionsDiv.className = 'project-actions';
      actionsDiv.innerHTML =
        '<button class="project-btn project-open-btn">' +
          '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>' +
          '<span>Открыть</span>' +
        '</button>' +
        '<button class="project-btn project-analytics-btn" data-proj="' + p.id + '">' +
          '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><rect x="7" y="10" width="3" height="7" fill="currentColor" stroke="none"/><rect x="12" y="6" width="3" height="11" fill="currentColor" stroke="none"/><rect x="17" y="13" width="3" height="4" fill="currentColor" stroke="none"/></svg>' +
          '<span>Аналитика</span>' +
        '</button>';

      const openBtn = actionsDiv.querySelector('.project-open-btn');
      const anBtn = actionsDiv.querySelector('.project-analytics-btn');

      openBtn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        phasesDiv.classList.toggle('hidden');
        const isHidden = phasesDiv.classList.contains('hidden');
        openBtn.querySelector('path').setAttribute('d', isHidden ? 'M6 9l6 6 6-6' : 'M6 15l6-6 6 6');
        openBtn.querySelector('span').textContent = isHidden ? 'Открыть' : 'Свернуть';
      });

      anBtn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        openAnalyticsSheet(p.id);
      });

      card.insertBefore(actionsDiv, phasesDiv);
      sec.appendChild(card);
  }

  return sec;
}

function _localDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + dd;
}

function openMonthPicker() {
  const old = document.getElementById('month-sheet-overlay');
  if (old) old.remove();
  const d = new Date();
  d.setMonth(d.getMonth() + CHART_OFFSET_MONTHS);
  const curM = d.getMonth();
  const months = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];

  const overlay = document.createElement('div');
  overlay.id = 'month-sheet-overlay';
  overlay.className = 'goal-sheet-overlay';
  overlay.innerHTML =
    '<div class="goal-sheet">' +
      '<button class="goal-sheet-close">✕</button>' +
      '<h2 class="goal-sheet-title">Месяц</h2>' +
      '<div class="goal-picker" id="month-picker">' +
        '<div class="goal-picker-spacer"></div>' +
        months.map((m, i) => '<div class="goal-picker-item' + (i === curM ? ' active' : '') + '" data-m="' + i + '">' + m + '</div>').join('') +
        '<div class="goal-picker-spacer"></div>' +
      '</div>' +
      '<div class="goal-sheet-actions"><button class="goal-cancel">Отмена</button><button class="goal-save">Сохранить</button></div>' +
    '</div>';
  document.body.appendChild(overlay);

  const picker = overlay.querySelector('#month-picker');
  const close = () => overlay.remove();
  const save = () => {
    const active = picker.querySelector('.goal-picker-item.active');
    if (active) {
      const m = parseInt(active.dataset.m, 10);
      const now = new Date();
      const targetY = now.getFullYear();
      const targetM = now.getMonth();
      CHART_OFFSET_MONTHS = (targetY * 12 + m) - (targetY * 12 + targetM);
      renderDashboard();
    }
    close();
  };

  setTimeout(() => {
    const cur = picker.querySelector('.goal-picker-item.active');
    if (cur) cur.scrollIntoView({ block: 'center' });
  }, 10);

  picker.addEventListener('scroll', () => {
    const rect = picker.getBoundingClientRect();
    const center = rect.top + rect.height / 2;
    let best = null, bestDist = Infinity;
    picker.querySelectorAll('.goal-picker-item').forEach(it => {
      const r = it.getBoundingClientRect();
      const dd = Math.abs((r.top + r.height / 2) - center);
      if (dd < bestDist) { bestDist = dd; best = it; }
    });
    picker.querySelectorAll('.goal-picker-item').forEach(it => it.classList.remove('active'));
    if (best) best.classList.add('active');
  });

  overlay.querySelector('.goal-sheet-close').addEventListener('click', close);
  overlay.querySelector('.goal-cancel').addEventListener('click', close);
  overlay.querySelector('.goal-save').addEventListener('click', save);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
}

function openYearPicker() {
  const old = document.getElementById('month-sheet-overlay');
  if (old) old.remove();
  const now = new Date();
  now.setMonth(now.getMonth() + CHART_OFFSET_MONTHS);
  const curY = now.getFullYear();
  const years = [];
  for (let y = curY - 5; y <= curY + 5; y++) years.push(y);

  const overlay = document.createElement('div');
  overlay.id = 'month-sheet-overlay';
  overlay.className = 'goal-sheet-overlay';
  overlay.innerHTML =
    '<div class="goal-sheet">' +
      '<button class="goal-sheet-close">✕</button>' +
      '<h2 class="goal-sheet-title">Год</h2>' +
      '<div class="goal-picker" id="year-picker">' +
        '<div class="goal-picker-spacer"></div>' +
        years.map(y => '<div class="goal-picker-item' + (y === curY ? ' active' : '') + '" data-y="' + y + '">' + y + '</div>').join('') +
        '<div class="goal-picker-spacer"></div>' +
      '</div>' +
      '<div class="goal-sheet-actions"><button class="goal-cancel">Отмена</button><button class="goal-save">Сохранить</button></div>' +
    '</div>';
  document.body.appendChild(overlay);

  const picker = overlay.querySelector('#year-picker');
  const close = () => overlay.remove();
  const save = () => {
    const active = picker.querySelector('.goal-picker-item.active');
    if (active) {
      const y = parseInt(active.dataset.y, 10);
      const realNow = new Date();
      const curM = realNow.getMonth();
      const targetMonths = y * 12 + curM;
      const baseMonths = realNow.getFullYear() * 12 + curM;
      CHART_OFFSET_MONTHS = targetMonths - baseMonths;
      renderDashboard();
    }
    close();
  };

  setTimeout(() => {
    const cur = picker.querySelector('.goal-picker-item.active');
    if (cur) cur.scrollIntoView({ block: 'center' });
  }, 10);

  picker.addEventListener('scroll', () => {
    const rect = picker.getBoundingClientRect();
    const center = rect.top + rect.height / 2;
    let best = null, bestDist = Infinity;
    picker.querySelectorAll('.goal-picker-item').forEach(it => {
      const r = it.getBoundingClientRect();
      const dd = Math.abs((r.top + r.height / 2) - center);
      if (dd < bestDist) { bestDist = dd; best = it; }
    });
    picker.querySelectorAll('.goal-picker-item').forEach(it => it.classList.remove('active'));
    if (best) best.classList.add('active');
  });

  overlay.querySelector('.goal-sheet-close').addEventListener('click', close);
  overlay.querySelector('.goal-cancel').addEventListener('click', close);
  overlay.querySelector('.goal-save').addEventListener('click', save);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
}

function openMonthSheet() {
  const old = document.getElementById('month-sheet-overlay');
  if (old) old.remove();
  const now = new Date();
  const curM = now.getMonth();
  const curY = now.getFullYear();
  const months = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
  const years = [];
  for (let y = curY - 2; y <= curY + 2; y++) years.push(y);

  const overlay = document.createElement('div');
  overlay.id = 'month-sheet-overlay';
  overlay.className = 'goal-sheet-overlay';
  overlay.innerHTML =
    '<div class="goal-sheet" style="max-height: 80vh; overflow-y: auto;">' +
      '<button class="goal-sheet-close">✕</button>' +
      '<h2 class="goal-sheet-title">Выберите месяц</h2>' +
      '<div class="month-picker">' +
        months.map((m, i) => '<button class="month-pick-item' + (i === curM + CHART_OFFSET_MONTHS ? ' active' : '') + '" data-m="' + i + '">' + m + '</button>').join('') +
      '</div>' +
      '<h2 class="goal-sheet-title" style="margin-top:16px;">Год</h2>' +
      '<div class="month-picker">' +
        years.map(y => '<button class="month-pick-item' + (y === curY ? ' active' : '') + '" data-y="' + y + '">' + y + '</button>').join('') +
      '</div>' +
    '</div>';
  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  overlay.querySelector('.goal-sheet-close').addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

  overlay.querySelectorAll('.month-pick-item[data-m]').forEach(b => {
    b.addEventListener('click', () => {
      // delta = выбранный месяц - текущий
      const m = parseInt(b.dataset.m, 10);
      CHART_OFFSET_MONTHS = m - curM;
      close();
      renderDashboard();
    });
  });
  overlay.querySelectorAll('.month-pick-item[data-y]').forEach(b => {
    b.addEventListener('click', () => {
      // год — игнорируем (пока)
      close();
    });
  });
}

function renderChart() {
  const sec = document.createElement('div');
  sec.className = 'section';

  // 1. Кнопки периодов
  const periods = [[1, 'День'], [7, 'Неделя'], [30, 'Месяц']];
  const filterHTML = periods.map(([n, label]) =>
    '<button class="period-btn' + (CHART_PERIOD === n ? ' active' : '') + '" data-period="' + n + '">' + label + '</button>'
  ).join('');
  const _mBtn = '<span class="month-year-wrap">' +
    '<span class="month-text" id="month-text">' + (function(){const d=new Date();d.setMonth(d.getMonth()+CHART_OFFSET_MONTHS);const m=['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];return m[d.getMonth()];})() + '</span>' +
    ' <span class="year-text" id="year-text">' + (function(){const d=new Date();d.setMonth(d.getMonth()+CHART_OFFSET_MONTHS);return d.getFullYear();})() + '</span>' +
    '</span>';
  
  sec.innerHTML = '<div class="period-filter-row">' + filterHTML + '</div>';

  // 2. Дни
  const days = [];
  const now = new Date();
  now.setMonth(now.getMonth() + CHART_OFFSET_MONTHS);

  if (CHART_PERIOD === 30) {
    const year = now.getFullYear();
    const month = now.getMonth();
    const lastDay = new Date(year, month + 1, 0);
    for (let i = 0; i < lastDay.getDate(); i++) days.push(_localDate(new Date(year, month, i + 1)));
  } else {
    const totalDays = CHART_PERIOD === 1 ? 1 : CHART_PERIOD;
    for (let i = totalDays - 1; i >= 0; i--) days.push(_localDate(new Date(now - i * 86400000)));
  }

  // 3. Данные
  const byDay = {};
  for (const ss of DATA.sessions || []) {
    let v = 0;
    if (CHART_METRIC === 'duration') v = ss.duration_min || 0;
    else if (CHART_METRIC === 'events') v = ss.events || 0;
    else if (CHART_METRIC === 'screens') v = ss.screens || 0;
    byDay[ss.date] = (byDay[ss.date] || 0) + v;
  }

  const maxVal = Math.max(1, ...days.map(d => byDay[d] || 0));
  
  // Ось Y (упрощенная, без вызова внешних функций)
  let top = 60;
  if (maxVal > 60) top = Math.ceil(maxVal / 60) * 60;
  const step = top / 4;
  
  let yAxisHTML = '';
  for (let i = 4; i >= 0; i--) {
    const val = step * i;
    const label = CHART_METRIC === 'duration' ? (Math.floor(val / 60) + 'ч') : String(val);
    yAxisHTML += '<div class="chart-grid-line"><span class="chart-grid-label">' + label + '</span></div>';
  }

  const chart = document.createElement('div');
  chart.className = 'chart-bars';
  chart.innerHTML = '<div class="chart-y-axis">' + yAxisHTML + '</div>';

  const barsWrap = document.createElement('div');
  barsWrap.className = 'chart-bars-wrap';

  // 4. Столбики
  for (const d of days) {
    const val = byDay[d] || 0;
    const h = val ? Math.max(2, Math.round(val / top * 100)) : 0;
    const col = document.createElement('div');
    col.className = 'chart-col';
    const isSel = CHART_SELECTED === d;
    const lblText = val ? (CHART_METRIC === 'duration' ? (Math.floor(val/60) + 'ч ' + (val%60) + 'м') : String(val)) : '';
    
    col.innerHTML =
      '<div class="chart-bar' + (val ? '' : ' empty') + (isSel ? ' selected' : '') + '"' +
      ' data-date="' + d + '"' +
      ' style="height:' + h + '%">' +
        (lblText ? '<div class="bar-label">' + lblText + '</div>' : '') +
      '</div>';
    barsWrap.appendChild(col);
  }

  // 5. ОДИН обработчик для столбиков


  chart.appendChild(barsWrap);
  sec.appendChild(chart);

  // 6. Подписи
  const labelsRow = document.createElement('div');
  labelsRow.className = 'chart-labels-row';
  labelsRow.innerHTML = '<div class="chart-spacer"></div>';
  const labels = document.createElement('div');
  labels.className = 'chart-labels';

  const isShort = days.length <= 14;
  const dowNames = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

  for (const d of days) {
    const lbl = document.createElement('div');
    lbl.className = 'chart-label';
    const dayNum = parseInt(d.slice(8, 10), 10);
    let show = false, dateStr = '', dowStr = '';
    if (isShort) {
      show = true;
      dateStr = String(dayNum);
      dowStr = dowNames[new Date(d + 'T00:00:00').getDay()];
    } else {
      show = (dayNum === 1 || dayNum % 5 === 0);
      dateStr = String(dayNum);
    }
    if (show) lbl.innerHTML = '<div class="lbl-date">' + dateStr + '</div>' + (isShort ? '<div class="lbl-dow">' + dowStr + '</div>' : '');
    labels.appendChild(lbl);
  }
  labelsRow.appendChild(labels);
  sec.appendChild(labelsRow);

  // 7. Кнопки метрик
  const totalForPeriod = days.reduce((acc, d) => acc + (byDay[d] || 0), 0);
  const totalStr = CHART_METRIC === 'duration' ? fmtH(totalForPeriod) : String(totalForPeriod);
  const metrics = [
    ['duration', '⏱ Время', '⏱ ' + (CHART_METRIC === 'duration' ? totalStr : 'Время')],
    ['events', '📨 Сообщения', '📨 ' + (CHART_METRIC === 'events' ? totalStr : 'Сообщения')],
    ['screens', '📸 Скрины', '📸 ' + (CHART_METRIC === 'screens' ? totalStr : 'Скрины')]
  ];
  const metricHTML = metrics.map(([key, label, labelActive]) =>
    '<button class="metric-btn' + (CHART_METRIC === key ? ' active' : '') + '" data-metric="' + key + '">' + (CHART_METRIC === key ? labelActive : label) + '</button>'
  ).join('');
  const metricBar = document.createElement('div');
  metricBar.className = 'metric-switch';
  metricBar.innerHTML = metricHTML;
  sec.appendChild(metricBar);

  // 8. Обработчики кнопок (ПЕРИОДЫ и МЕТРИКИ)



  return sec;
}

function renderSessions() {
  const sec = document.createElement('div');
  sec.className = 'section';
  sec.innerHTML = '';

  const list = (DATA.sessions || []).slice().sort((a, b) =>
    (b.date + (b.start || '')).localeCompare(a.date + (a.start || ''))
  ).slice(0, 30);

  if (!list.length) {
    sec.innerHTML += '<div class="empty"><div class="empty-icon">📭</div>Нет сессий</div>';
    return sec;
  }

  const projName = {};
  for (const p of DATA.projects || []) projName[p.id] = p.name;

  const tbl = document.createElement('table');
  tbl.className = 'sessions-table';
  tbl.innerHTML =
    '<thead><tr><th>Дата</th><th>Проект</th><th>Длит.</th><th>Заметка</th></tr></thead>';
  const tbody = document.createElement('tbody');
  for (const s of list) {
    const tr = document.createElement('tr');
    tr.innerHTML =
      '<td>' + s.date.slice(8, 10) + '.' + s.date.slice(5, 7) + '</td>' +
      '<td>' + (projName[s.project] || s.project || '—') + '</td>' +
      '<td class="dur">' + fmtH(s.duration_min || 0) + '</td>' +
      '<td class="note" title="' + (s.note || '') + '">' + (s.note || '') + '</td>';
    tbody.appendChild(tr);
  }
  tbl.appendChild(tbody);
  sec.appendChild(tbl);
  // Обработчики для кнопок периодов (День/Неделя/Месяц)
  sec.querySelectorAll('.period-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      CHART_PERIOD = parseInt(btn.dataset.period, 10);
      CHART_SELECTED = null;
      renderActivityPage();
    });
  });

  // Обработчики для кнопок метрик (Время/Сообщения/Скрины)
  sec.querySelectorAll('.metric-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      CHART_METRIC = btn.dataset.metric;
      CHART_SELECTED = null;
      renderActivityPage();
    });
  });

  return sec;
}

function renderFooter() {
  const f = document.createElement('div');
  f.className = 'footer';
  const upd = DATA.updated ? new Date(DATA.updated).toLocaleString('ru-RU') : '—';
  const scripts = document.querySelectorAll('script[src*="app.js"]');
  let ver = '1';
  for (const sc of scripts) {
    const mm = sc.src.match(/v=([0-9]+)/);
    if (mm) { ver = mm[1]; break; }
  }
  const verStr = ver.length > 1 ? ver.slice(0, -1) + '.' + ver.slice(-1) : ver;
  f.innerHTML =
    '<div class="footer-line">Хераборина v' + verStr + '</div>' +
    '<div class="footer-line footer-authors">Product of Andrey Sorokin · Design & idea Karina Merkulova</div>';
  // _upd сохранён для будущего (если надо показать время обновления)
  void upd;
  return f;
}

function showJoke() {
    const modal = document.getElementById('joke-modal');
    if (modal) {
        modal.classList.remove('hidden');
        // Небольшая задержка для срабатывания transition
        setTimeout(() => {
            modal.style.opacity = '1';
            modal.querySelector('div').style.transform = 'scale(1)';
        }, 10);
    }
}

function closeJoke() {
    const modal = document.getElementById('joke-modal');
    if (modal) {
        modal.style.opacity = '0';
        modal.querySelector('div').style.transform = 'scale(0.8)';
        setTimeout(() => {
            modal.classList.add('hidden');
        }, 300);
    }
}

// Вешаем событие при загрузке
document.addEventListener('DOMContentLoaded', () => {
    const logo = document.getElementById('logo-btn');
    if (logo) {
        logo.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            showJoke();
        });
    }
});

function toggleAccordion(contentId, arrowId) {
    const content = document.getElementById(contentId);
    const arrow = document.getElementById(arrowId);
    if (!content || !arrow) return;

    const isHidden = content.style.display === 'none' || !content.style.display;
    content.style.display = isHidden ? 'block' : 'none';
    arrow.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
      
      // Плавная прокрутка к графику при открытии
      if (isHidden) {
        setTimeout(() => {
          const yOffset = -60; 
          const y = chartAcc.getBoundingClientRect().top + window.pageYOffset + yOffset;
          const sessHeader = document.getElementById('sess-header'); if (sessHeader) sessHeader.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }, 50);
      }
}



function renderActivityPage() {
    const c = document.getElementById('content-activity');
    if (!c) return;
    c.innerHTML = '';
    
    const header = document.createElement('h2');
    header.textContent = 'Активность';
    header.style.padding = '16px';
    header.style.color = 'var(--fg)';
    header.style.margin = '0';
    header.style.fontSize = '22px';
    c.appendChild(header);

    const chartDiv = document.createElement('div');
    chartDiv.style.padding = '0 16px 16px 16px';
    chartDiv.appendChild(renderChart());
    c.appendChild(chartDiv);

    if (!c._delegated) {
        c._delegated = true;
        c.addEventListener('click', (e) => {
            // Кнопки периода
            const periodBtn = e.target.closest('.period-btn');
            if (periodBtn) {
                CHART_PERIOD = parseInt(periodBtn.dataset.period, 10);
                CHART_SELECTED = null;
                renderActivityPage();
                return;
            }

            // Кнопки метрик
            const metricBtn = e.target.closest('.metric-btn');
            if (metricBtn) {
                CHART_METRIC = metricBtn.dataset.metric;
                CHART_SELECTED = null;
                renderActivityPage();
                return;
            }

            // Столбик (ищем .chart-bar)
            const bar = e.target.closest('.chart-bar');
            if (bar) {
                const wasSelected = bar.classList.contains('selected');
                c.querySelectorAll('.chart-bar.selected').forEach(b => b.classList.remove('selected'));
                if (!wasSelected) bar.classList.add('selected');
                CHART_SELECTED = wasSelected ? null : bar.dataset.date;
                return;
            }
        });
    }
}


function renderDashboard() {
    if (!DATA) return;

    if (!window._dashAnimated) {
        document.body.classList.add('first-load');
        window._dashAnimated = true;
    } else {
        document.body.classList.remove('first-load');
    }

    const cDash = $('#content-diary');
    if (cDash) cDash.classList.add('hidden');
    const cTab = $('#content');
    if (cTab) cTab.classList.remove('hidden');

    const c = $('#content');
    c.innerHTML = '';

    // 1. Круги
    c.appendChild(renderHeroRings());

        // Активность и сессии вынесены на отдельную страницу
c.appendChild(renderFooter());
}

