// Хераборина — основная логика UI
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const PIN_KEY = 'worklog_pin';
const PIN_LEN = 6;

let DATA = null;
let PIN_BUF = '';

window.__initCalls = 0;
let CHART_PERIOD = 7;   // 1 = день, 7 = неделя, 30 = месяц
let CHART_METRIC = 'duration';  // duration | events | screens
let CHART_SELECTED = null;  // выбранный день для тултипа
const DAILY_GOAL_MIN = 720;  // 12ч (временный хардкод)

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
  const tabDash = document.getElementById('tab-dashboard');
  const tabDiary = document.getElementById('tab-diary');
  const tabTime = document.getElementById('tab-time');
  if (!tabDash || !tabDiary) return;
  tabDash.addEventListener('click', () => switchTab('dashboard'));
  tabDiary.addEventListener('click', () => switchTab('diary'));
  if (tabTime) tabTime.addEventListener('click', () => switchTab('time'));
}

function switchTab(name) {
  const tabDash = document.getElementById('tab-dashboard');
  const tabDiary = document.getElementById('tab-diary');
  const tabTime = document.getElementById('tab-time');
  const cDash = document.getElementById('content');
  const cDiary = document.getElementById('content-diary');
  const cTime = document.getElementById('content-time');
  if (!tabDash || !tabDiary || !cDash || !cDiary) return;

  // Скрыть все
  [tabDash, tabDiary, tabTime].forEach(t => t && t.classList.remove('tab-active'));
  [cDash, cDiary, cTime].forEach(c => c && c.classList.add('hidden'));

  if (name === 'diary') {
    tabDiary.classList.add('tab-active');
    cDiary.classList.remove('hidden');
    renderDiary();
  } else if (name === 'time') {
    if (tabTime) tabTime.classList.add('tab-active');
    if (cTime) {
      cTime.classList.remove('hidden');
      const tt = calcTotals();
      cTime.innerHTML = '<div class="section"><div class="section-title">⏱ Время</div>' +
        '<div class="metrics">' +
          '<div class="metric"><div class="metric-label">Сегодня</div><div class="metric-value">' + fmtH(tt.todayMin) + '</div></div>' +
          '<div class="metric"><div class="metric-label">7 дней</div><div class="metric-value">' + fmtH(tt.week) + '</div></div>' +
          '<div class="metric"><div class="metric-label">30 дней</div><div class="metric-value">' + fmtH(tt.month) + '</div></div>' +
          '<div class="metric"><div class="metric-label">Всего</div><div class="metric-value">' + fmtH(tt.total) + '</div></div>' +
          '<div class="metric"><div class="metric-label">Среднее (сессия)</div><div class="metric-value">' + fmtH(Math.round(tt.totalNoBase / Math.max(1, tt.count))) + '</div></div>' +
        '</div></div>';
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

  // Группировка по датам
  const byDate = {};
  for (const s of list) {
    if (!byDate[s.date]) byDate[s.date] = [];
    byDate[s.date].push(s);
  }

  const dates = Object.keys(byDate).sort().reverse();
  for (const d of dates) {
    const header = document.createElement('div');
    header.className = 'diary-date';
    header.textContent = formatDiaryDate(d);
    c.appendChild(header);

    for (const s of byDate[d]) {
      const item = document.createElement('div');
      item.className = 'diary-item';
      const timeRange = (s.start || '?') + ' → ' + (s.end || '?');
      const dur = fmtH(s.duration_min || 0);
      const proj = projName[s.project] || s.project || '—';
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
  c.appendChild(renderProjects());
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
    '<circle cx="' + size/2 + '" cy="' + size/2 + '" r="' + r + '" ' +
      'fill="none" stroke="var(--bg3)" stroke-width="' + strokeWidth + '"/>' +
    '<circle cx="' + size/2 + '" cy="' + size/2 + '" r="' + r + '" ' +
      'fill="none" stroke="' + color + '" stroke-width="' + strokeWidth + '" ' +
      'stroke-dasharray="' + dash + ' ' + c + '" stroke-linecap="round" ' +
      'transform="rotate(-90 ' + size/2 + ' ' + size/2 + ')"/>' +
    '</svg>';
}

function renderHeroRings() {
  const t = calcTotals();
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

  const pctDur = Math.round(t.todayMin / DAILY_GOAL_MIN * 100);
  const ringColor = pctDur >= 100 ? 'var(--green)' : 'var(--accent)';
  const todayEv = sessions.filter(x => x.date === new Date().toISOString().slice(0,10)).reduce((a,x)=>a+(x.events||0),0);
  const todayScr = sessions.filter(x => x.date === new Date().toISOString().slice(0,10)).reduce((a,x)=>a+(x.screens||0),0);
  const pctEv = avgEv > 0 ? Math.round(todayEv / avgEv * 100) : 0;
  const pctScr = avgScr > 0 ? Math.round(todayScr / avgScr * 100) : 0;

  const div = document.createElement('div');
  div.className = 'hero-rings';

  // Большое кольцо
  div.innerHTML =
    '<div class="hero-main">' +
      '<div class="ring-wrap">' + renderRingSVG(pctDur, 270, 13, ringColor) +
        '<div class="ring-center">' +
          '<div class="ring-value">' + fmtH(t.todayMin) + '</div>' +
          '<div class="ring-sub">Цель 12ч · ' + pctDur + '%</div>' +
        '</div>' +
      '</div>' +
    '</div>' +
    '<div class="hero-mini">' +
      '<div class="mini-block">' +
        '<div class="mini-ring">' + renderRingSVG(100, 80, 6, 'var(--green)') +
          '<div class="mini-center"><div class="mini-ico">📨</div><div class="mini-val">' + todayEv + '</div></div>' +
        '</div>' +
        '<div class="mini-label">Сообщения</div>' +
      '</div>' +
      '<div class="mini-block">' +
        '<div class="mini-ring">' + renderRingSVG(100, 80, 6, 'var(--yellow)') +
          '<div class="mini-center"><div class="mini-ico">📸</div><div class="mini-val">' + todayScr + '</div></div>' +
        '</div>' +
        '<div class="mini-label">Скрины</div>' +
      '</div>' +
      '<div class="mini-block">' +
        '<div class="mini-ring">' + renderRingSVG(100, 80, 6, 'var(--accent)') +
          '<div class="mini-center"><div class="mini-ico">⏱</div><div class="mini-val">' + fmtH(t.total) + '</div></div>' +
        '</div>' +
        '<div class="mini-label">Общее время</div>' +
      '</div>' +
    '</div>';
  return div;
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
  return {
    total: total + baseMin,
    totalNoBase: total,
    week,
    month,
    todayMin,
    screens,
    msgs: msgs + baseMsgs,
    count: (DATA.sessions || []).length
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

function renderProjects() {
  const sec = document.createElement('div');
  sec.className = 'section';
  sec.innerHTML = '<div class="section-title">Проекты</div>';

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
        '<div class="phase-head">' +
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
        itemsList.classList.toggle('hidden');
      });

      phasesDiv.appendChild(phDiv);
    }
    // Фазы — скрыты по умолчанию
    phasesDiv.classList.add('hidden');
    card.appendChild(phasesDiv);

    // Клик на шапку карточки (.project-head) — раскрыть/свернуть фазы
    const head = card.querySelector('.project-head');
    if (head) {
      head.style.cursor = 'pointer';
      head.addEventListener('click', (e) => {
        e.stopPropagation();
        phasesDiv.classList.toggle('hidden');
      });
    }

    sec.appendChild(card);
  }

  return sec;
}

function renderChart() {
  const sec = document.createElement('div');
  sec.className = 'section';

  const periods = [[1, 'День'], [7, 'Неделя'], [30, 'Месяц']];
  const filterHTML = periods.map(([n, label]) =>
    '<button class="period-btn' + (CHART_PERIOD === n ? ' active' : '') + '" data-period="' + n + '">' + label + '</button>'
  ).join('');
  sec.innerHTML = '<div class="section-title">Активность <span class="period-filter">' + filterHTML + '</span></div>';

  const days = [];
  const now = new Date();
  const totalDays = CHART_PERIOD === 1 ? 1 : CHART_PERIOD;
  for (let i = totalDays - 1; i >= 0; i--) {
    const d = new Date(now - i * 86400000);
    days.push(d.toISOString().slice(0, 10));
  }

  const byDay = {};
  for (const ss of DATA.sessions || []) {
    let v = 0;
    if (CHART_METRIC === 'duration') v = ss.duration_min || 0;
    else if (CHART_METRIC === 'events') v = ss.events || 0;
    else if (CHART_METRIC === 'screens') v = ss.screens || 0;
    byDay[ss.date] = (byDay[ss.date] || 0) + v;
  }

  const maxVal = Math.max(1, ...days.map(d => byDay[d] || 0));

  function niceAxis(v, metric) {
    // Красивые потолки (не «×4 от шага», а напрямую)
    let candidates;
    if (metric === 'duration') {
      candidates = [30, 60, 120, 180, 240, 360, 480, 600, 720, 960, 1200, 1440, 1800, 2400, 3600, 4800, 7200];
    } else {
      candidates = [10, 25, 50, 100, 200, 300, 500, 750, 1000, 1500, 2000, 3000, 5000];
    }
    let top = candidates[candidates.length - 1];
    for (const c of candidates) {
      if (v <= c) { top = c; break; }
    }
    // Шаг = top / 4, но округлённый до «красивого» (если возможно)
    const step = top / 4;
    const labels = [0, step, step * 2, step * 3, top];
    return { top, step, labels };
  }
  const axis = niceAxis(maxVal, CHART_METRIC);
  const top = axis.top;

  let yAxisHTML = '';
  for (let i = axis.labels.length - 1; i >= 0; i--) {
    const val = axis.labels[i];
    const label = CHART_METRIC === 'duration' ? fmtH(val) : String(val);
    yAxisHTML += '<div class="chart-grid-line"><span class="chart-grid-label">' + label + '</span></div>';
  }

  const chart = document.createElement('div');
  chart.className = 'chart-bars';
  chart.innerHTML = '<div class="chart-y-axis">' + yAxisHTML + '</div>';

  const barsWrap = document.createElement('div');
  barsWrap.className = 'chart-bars-wrap';

  for (const d of days) {
    const val = byDay[d] || 0;
    const h = val ? Math.max(2, Math.round(val / top * 100)) : 0;
    const col = document.createElement('div');
    col.className = 'chart-col';
    const isSel = CHART_SELECTED === d;
    col.innerHTML =
      '<div class="chart-bar' + (val ? '' : ' empty') + (isSel ? ' selected' : '') + '"' +
      ' data-date="' + d + '"' +
      ' style="height:' + h + '%"></div>';
    barsWrap.appendChild(col);
  }
  chart.appendChild(barsWrap);
  sec.appendChild(chart);

  // --- Подписи дат (в отдельной строке, синхронизированы с barsWrap) ---
  const labelsRow = document.createElement('div');
  labelsRow.className = 'chart-labels-row';
  labelsRow.innerHTML = '<div class="chart-spacer"></div>';

  const labels = document.createElement('div');
  labels.className = 'chart-labels';
  const step = days.length > 14 ? Math.ceil(days.length / 6) : 1;
  for (let i = 0; i < days.length; i++) {
    const d = days[i];
    const lbl = document.createElement('div');
    lbl.className = 'chart-label';
    if (i % step === 0 || i === days.length - 1) {
      lbl.textContent = d.slice(8, 10) + '.' + d.slice(5, 7);
    }
    labels.appendChild(lbl);
  }
  labelsRow.appendChild(labels);
  sec.appendChild(labelsRow);

  if (CHART_SELECTED) {
    const val = byDay[CHART_SELECTED] || 0;
    const valStr = CHART_METRIC === 'duration' ? fmtH(val) : String(val);
    const metricLabel = CHART_METRIC === 'duration' ? 'времени' : (CHART_METRIC === 'events' ? 'сообщений' : 'скринов');
    const tooltip = document.createElement('div');
    tooltip.className = 'chart-tooltip';
    tooltip.textContent = CHART_SELECTED.slice(8, 10) + '.' + CHART_SELECTED.slice(5, 7) + ' · ' + valStr + ' ' + metricLabel;
    sec.appendChild(tooltip);
  }

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

  sec.querySelectorAll('.period-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      CHART_PERIOD = parseInt(btn.dataset.period, 10);
      CHART_SELECTED = null;
      renderDashboard();
    });
  });
  sec.querySelectorAll('.metric-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      CHART_METRIC = btn.dataset.metric;
      CHART_SELECTED = null;
      renderDashboard();
    });
  });
  sec.querySelectorAll('.chart-bar').forEach(bar => {
    bar.addEventListener('click', () => {
      const d = bar.dataset.date;
      CHART_SELECTED = (CHART_SELECTED === d) ? null : d;
      renderDashboard();
    });
  });

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
  f.textContent = 'Обновлено: ' + upd + ' · Хераборина v1';
  return f;
}
