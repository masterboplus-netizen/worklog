// Worklog — основная логика UI
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const PIN_KEY = 'worklog_pin';
const PIN_LEN = 6;

let DATA = null;
let PIN_BUF = '';

document.addEventListener('DOMContentLoaded', init);

async function init() {
  setupPinPad();
  const _btnLock = $('#btn-lock');
  if (_btnLock) _btnLock.addEventListener('click', lock);

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
  showScreen('pin');
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
  showScreen('pin');
}

// === PIN-пад ===
function setupPinPad() {
  $$('.pin-pad button').forEach(btn => {
    btn.addEventListener('click', () => onPinKey(btn.dataset.d));
  });
  document.addEventListener('keydown', (e) => {
    if ($('#pin-screen').classList.contains('hidden')) return;
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
    showScreen('pin');
  }
}

async function tryUnlock(pin) {
  try {
    const resp = await fetch('data.encrypted.json?_=' + Date.now());
    if (!resp.ok) throw new Error('fetch failed');
    const encrypted = await resp.json();
    DATA = await decryptData(pin, encrypted);
    return true;
  } catch (e) {
    console.warn('Unlock failed:', e);
    return false;
  }
}

// === Рендер дашборда ===
function renderDashboard() {
  if (!DATA) return;
  const c = $('#content');
  c.innerHTML = '';
  c.appendChild(renderMetrics());
  c.appendChild(renderProjects());
  c.appendChild(renderChart());
  c.appendChild(renderSessions());
  c.appendChild(renderFooter());
}

function fmtH(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? h + 'ч ' + m + 'м' : m + 'м';
}

function calcTotals() {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const weekAgo = new Date(now - 7 * 86400000).toISOString().slice(0, 10);
  const monthAgo = new Date(now - 30 * 86400000).toISOString().slice(0, 10);

  let total = 0, week = 0, month = 0, todayMin = 0, screens = 0, msgs = 0;
  for (const s of DATA.sessions || []) {
    total += s.duration_min || 0;
    if (s.date >= weekAgo) week += s.duration_min || 0;
    if (s.date >= monthAgo) month += s.duration_min || 0;
    if (s.date === today) todayMin += s.duration_min || 0;
    screens += s.screens || 0;
    msgs += s.events || 0;
  }
  return { total, week, month, todayMin, screens, msgs, count: (DATA.sessions || []).length };
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
  ];
  div.innerHTML = items.map(([l, v, acc]) =>
    '<div class="metric"><div class="metric-label">' + l + '</div>' +
    '<div class="metric-value' + (acc ? ' accent' : '') + '">' + v + '</div></div>'
  ).join('');
  return div;
}

function renderProjects() {
  const sec = document.createElement('div');
  sec.className = 'section';
  sec.innerHTML = '<div class="section-title">Проекты</div>';

  const byProj = {};
  for (const s of DATA.sessions || []) {
    byProj[s.project] = (byProj[s.project] || 0) + (s.duration_min || 0);
  }

  for (const p of DATA.projects || []) {
    const hrs = byProj[p.id] || 0;
    const totalPlan = (p.plan || []).reduce((acc, ph) =>
      acc + (ph.items || []).length, 0);
    const donePlan = (p.plan || []).reduce((acc, ph) =>
      acc + (ph.items || []).filter(it =>
        typeof it === 'object' ? it.done : false).length, 0);
    const pct = totalPlan ? Math.round(donePlan / totalPlan * 100) : 0;

    const card = document.createElement('div');
    card.className = 'project-card';
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
      '<div class="project-meta">Прогресс: ' + donePlan + '/' + totalPlan +
        ' (' + pct + '%) · ' + (p.status || '') + '</div>';
    sec.appendChild(card);
  }
  return sec;
}

function renderChart() {
  const sec = document.createElement('div');
  sec.className = 'section';
  sec.innerHTML = '<div class="section-title">Активность (30 дней)</div>';

  const days = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now - i * 86400000);
    days.push(d.toISOString().slice(0, 10));
  }

  const byDay = {};
  for (const s of DATA.sessions || []) {
    byDay[s.date] = (byDay[s.date] || 0) + (s.duration_min || 0);
  }

  const max = Math.max(60, ...days.map(d => byDay[d] || 0));

  const chart = document.createElement('div');
  chart.className = 'chart-days';
  for (const d of days) {
    const val = byDay[d] || 0;
    const h = val ? Math.max(4, Math.round(val / max * 100)) : 2;
    const col = document.createElement('div');
    col.className = 'chart-day';
    col.innerHTML =
      '<div class="chart-bar' + (val ? '' : ' empty') + '" ' +
      'style="height:' + h + '%" title="' + d + ': ' + fmtH(val) + '"></div>';
    chart.appendChild(col);
  }
  sec.appendChild(chart);
  return sec;
}

function renderSessions() {
  const sec = document.createElement('div');
  sec.className = 'section';
  sec.innerHTML = '<div class="section-title">Последние сессии</div>';

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
      '<td>' + s.date.slice(5) + '</td>' +
      '<td>' + (projName[s.project] || s.project || '—') + '</td>' +
      '<td class="dur">' + fmtH(s.duration_min || 0) + '</td>' +
      '<td class="note" title="' + (s.note || '') + '">' + (s.note || '') + '</td>';
    tbody.appendChild(tr);
  }
  tbl.appendChild(tbody);
  sec.appendChild(tbl);
  return sec;
}

function renderFooter() {
  const f = document.createElement('div');
  f.className = 'footer';
  const upd = DATA.updated ? new Date(DATA.updated).toLocaleString('ru-RU') : '—';
  f.textContent = 'Обновлено: ' + upd + ' · Worklog v1';
  return f;
}
