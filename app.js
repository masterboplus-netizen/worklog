let CHART_PERIOD = 7;
let CHART_OFFSET_MONTHS = 0;
let CHART_METRIC = 'duration';
let CHART_SELECTED = null;
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);
const PIN_KEY = 'worklog_pin';
const PIN_LEN = 6;
let DATA = null;
let PIN_BUF = '';

function init() {
  setupPinPad();
  const btnLock = $('#btn-lock');
  const btnHeart = $('#btn-heart');
  if (btnHeart) btnHeart.addEventListener('click', showJoke);
  if (btnLock) btnLock.addEventListener('click', lock);
  
  const tabDash = document.getElementById('tab-dashboard');
  const tabDiary = document.getElementById('tab-diary');
  const tabProj = document.getElementById('tab-projects');
  const tabAct = document.getElementById('tab-activity');
  if (tabDash) tabDash.addEventListener('click', () => switchTab('dashboard'));
  if (tabDiary) tabDiary.addEventListener('click', () => switchTab('diary'));
  if (tabProj) tabProj.addEventListener('click', () => switchTab('projects'));
  if (tabAct) tabAct.addEventListener('click', () => switchTab('activity'));

  const saved = localStorage.getItem(PIN_KEY);
  if (saved) {
    tryUnlock(saved).then(ok => {
      if (ok) { 
        // ЖЕСТКО УДАЛЯЕМ ЛОУДЕР ПРИ АВТОВХОДЕ
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
    // Показываем лоадер только при самом первом запуске
    const loadingEl = document.getElementById('loading');
    if (loadingEl) loadingEl.classList.remove('hidden');
    
    setTimeout(() => {
      if (loadingEl) loadingEl.classList.add('hidden');
      showScreen('pin-screen');
    }, 1000);
  }
}

function showScreen(name) {
  ['pin-screen', 'dashboard'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    if (id === name) el.classList.remove('hidden');
    else el.classList.add('hidden');
  });
  const tabs = document.querySelector('.tabs');
  if (tabs) tabs.style.display = (name === 'dashboard') ? 'flex' : 'none';
}

function setupPinPad() {
  $$('.pin-pad button').forEach(btn => {
    btn.addEventListener('click', () => onPinKey(btn.dataset.d));
  });
}

function onPinKey(key) {
  if (key === 'clear') PIN_BUF = '';
  else if (key === 'del') PIN_BUF = PIN_BUF.slice(0, -1);
  else { if (PIN_BUF.length >= PIN_LEN) return; PIN_BUF += key; }
  updatePinDisplay();
  if (PIN_BUF.length === PIN_LEN) submitPin(PIN_BUF);
}

function updatePinDisplay() {
  const disp = $('#pin-display');
  if (!disp) return;
  disp.innerHTML = '';
  for (let i = 0; i < PIN_LEN; i++) {
    const dot = document.createElement('div');
    dot.className = 'dot' + (i < PIN_BUF.length ? ' filled' : '');
    disp.appendChild(dot);
  }
  const err = $('#pin-error');
  if (err) err.textContent = '';
}

async function tryUnlock(pin) {
  try {
    const resp = await fetch('data.encrypted.json?_=' + Date.now());
    if (!resp.ok) throw new Error('fetch');
    const enc = await resp.json();
    DATA = await decryptData(pin, enc);
    return true;
  } catch(e) { return false; }
}

async function submitPin(pin) {
  const ok = await tryUnlock(pin);
  if (ok) {
    localStorage.setItem(PIN_KEY, pin);
    
    // ЖЕСТКО УДАЛЯЕМ ЛОУДЕР
    const l = document.getElementById('loading');
    if (l) l.remove();

    renderDashboard();
    showScreen('dashboard');
  } else {
    PIN_BUF = '';
    updatePinDisplay();
    const err = $('#pin-error');
    if (err) err.textContent = 'Неверный PIN';
  }
}

function lock() {
  localStorage.removeItem(PIN_KEY);
  DATA = null;
  PIN_BUF = '';
  updatePinDisplay();
  showScreen('pin-screen');
}

function switchTab(name) {
  ['content', 'content-diary', 'content-projects', 'content-activity'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  });
  const tabs = document.querySelectorAll('.tab');
  tabs.forEach(t => t.classList.remove('tab-active'));
  
  if (name === 'diary') {
    document.getElementById('content-diary').classList.remove('hidden');
    document.getElementById('tab-diary').classList.add('tab-active');
    renderDiary(); // <--- ВЫЗЫВАЕМ РЕНДЕР ДНЕВНИКА
  } else if (name === 'projects') {
    const cProj = document.getElementById('content-projects');
    cProj.classList.remove('hidden');
    cProj.innerHTML = '';
    cProj.appendChild(renderProjects()); // Вставляем карточки
    document.getElementById('tab-projects').classList.add('tab-active');
  } else if (name === 'activity') {
    document.getElementById('content-activity').classList.remove('hidden');
    document.getElementById('tab-activity').classList.add('tab-active');
    renderActivityPage(); // <--- ВЫЗЫВАЕМ РЕНДЕР ГРАФИКА
  } else {
    document.getElementById('content').classList.remove('hidden');
    document.getElementById('tab-dashboard').classList.add('tab-active');
  }
}


// === ДНЕВНИК ===
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



// === АНАЛИТИКА ПРОЕКТА ===
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

  const byMonth = {};
  for (const s of sessions) {
    const m = s.date.slice(0, 7);
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

  const byDay = {};
  for (const s of sessions) byDay[s.date] = (byDay[s.date] || 0) + (s.duration_min || 0);
  const topDays = Object.entries(byDay).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const topDaysHTML = topDays.map(([d, v], i) =>
    '<div class="an-top-row"><span class="an-top-rank">' + (i + 1) + '.</span> ' +
    d.slice(8, 10) + '.' + d.slice(5, 7) + ' — <b>' + fmtH(v) + '</b></div>'
  ).join('') || '<div class="an-top-row">Пока нет данных</div>';

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
      '<div class="an-block an-stats">' +
        '<div class="an-stat"><div class="an-stat-label">Среднее/день</div><div class="an-stat-val">' + fmtH(avgDay) + '</div></div>' +
        '<div class="an-stat"><div class="an-stat-label">Всего</div><div class="an-stat-val">' + fmtH(realMin) + '</div></div>' +
        '<div class="an-stat"><div class="an-stat-label">Сессий</div><div class="an-stat-val">' + sessions.length + '</div></div>' +
      '</div>' +
      '<div class="an-block an-stats">' +
        '<div class="an-stat"><div class="an-stat-label">Сообщений</div><div class="an-stat-val">' + realEv + '</div></div>' +
        '<div class="an-stat"><div class="an-stat-label">Скринов</div><div class="an-stat-val">' + realScr + '</div></div>' +
        '<div class="an-stat"><div class="an-stat-label">Дней</div><div class="an-stat-val">' + uniqueDays + '</div></div>' +
      '</div>' +
      '<div class="an-section-title">📅 По месяцам</div>' +
      '<div class="an-block">' + (monthBars || '<div class="an-top-row">Нет данных</div>') + '</div>' +
      '<div class="an-section-title">🏆 Топ-3 дня</div>' +
      '<div class="an-block">' + topDaysHTML + '</div>' +
      '<div class="an-section-title">📈 Тренд (7 дней)</div>' +
      '<div class="an-block an-trend ' + trendClass + '">' + trendStr + '</div>' +
    '</div>';
  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  overlay.querySelector('.goal-sheet-close').addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
}

// === ПАСХАЛКА (JOKE) ===
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

// === ПРОЕКТЫ (ОРИГИНАЛ) ===
function renderProjects() {
  const sec = document.createElement('div');
  sec.className = 'section';

  const byProj = {};
  for (const s of DATA.sessions || []) {
    byProj[s.project] = (byProj[s.project] || 0) + (s.duration_min || 0);
  }

  const base = DATA.baseline || {};
  if (base.minutes && base.project) {
    byProj[base.project] = (byProj[base.project] || 0) + base.minutes;
  } else if (base.minutes) {
    const firstId = (DATA.projects || [])[0]?.id;
    if (firstId) byProj[firstId] = (byProj[firstId] || 0) + base.minutes;
  }

  for (const p of DATA.projects || []) {
    const hrs = byProj[p.id] || 0;

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

    const phasesDiv = document.createElement('div');
    phasesDiv.className = 'phases';
    for (const ph of p.plan || []) {
      const items = ph.items || [];
      const total = items.length;
      const done = items.filter(it => typeof it === 'object' && it.done).length;
      const phPct = total ? Math.round(done / total * 100) : 0;
      const statusIcon = phPct === 100 ? '✅' : (phPct > 0 ? '🟡' : '📋');

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

      const itemsList = document.createElement('div');
      itemsList.className = 'phase-items hidden';
      for (const it of items) {
        if (typeof it === 'object') {
          const line = document.createElement('div');
          line.className = 'phase-item' + (it.done ? ' done' : '');
          line.textContent = (it.done ? '✅ ' : '⏳ ') + it.text;
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
    phasesDiv.classList.add('hidden');
    card.appendChild(phasesDiv);

    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'project-actions';
    actionsDiv.innerHTML =
      '<button class="project-btn project-open-btn"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg><span>Открыть</span></button>' +
      '<button class="project-btn project-analytics-btn" data-proj="' + p.id + '"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><rect x="7" y="10" width="3" height="7" fill="currentColor" stroke="none"/><rect x="12" y="6" width="3" height="11" fill="currentColor" stroke="none"/><rect x="17" y="13" width="3" height="4" fill="currentColor" stroke="none"/></svg><span>Аналитика</span></button>';

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
      // Заглушка для аналитики (пока не перенесли)
      openAnalyticsSheet(p.id);
    });

    card.insertBefore(actionsDiv, phasesDiv);
    sec.appendChild(card);
  }

  return sec;
}


// === ГРАФИК (ОРИГИНАЛ) ===
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
            const periodBtn = e.target.closest('.period-btn');
            if (periodBtn) {
                CHART_PERIOD = parseInt(periodBtn.dataset.period, 10);
                CHART_SELECTED = null;
                renderActivityPage();
                return;
            }
            const metricBtn = e.target.closest('.metric-btn');
            if (metricBtn) {
                CHART_METRIC = metricBtn.dataset.metric;
                CHART_SELECTED = null;
                renderActivityPage();
                return;
            }
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

function renderChart() {
  const sec = document.createElement('div');
  sec.className = 'section';

  const periods = [[1, 'День'], [7, 'Неделя'], [30, 'Месяц']];
  const filterHTML = periods.map(([n, label]) =>
    '<button class="period-btn' + (CHART_PERIOD === n ? ' active' : '') + '" data-period="' + n + '">' + label + '</button>'
  ).join('');
  
  sec.innerHTML = '<div class="period-filter-row">' + filterHTML + '</div>';

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

  const byDay = {};
  for (const ss of DATA.sessions || []) {
    let v = 0;
    if (CHART_METRIC === 'duration') v = ss.duration_min || 0;
    else if (CHART_METRIC === 'events') v = ss.events || 0;
    else if (CHART_METRIC === 'screens') v = ss.screens || 0;
    byDay[ss.date] = (byDay[ss.date] || 0) + v;
  }

  const maxVal = Math.max(1, ...days.map(d => byDay[d] || 0));
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

  chart.appendChild(barsWrap);
  sec.appendChild(chart);

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
    if (show) {
      const _d = new Date(d + 'T00:00:00');
      const _dow = ['Вс','Пн','Вт','Ср','Чт','Пт','Сб'][_d.getDay()];
      lbl.innerHTML = '<div class="lbl-date">' + dateStr + '</div>' + '<div class="lbl-dow">' + _dow + '</div>';
    }
    labels.appendChild(lbl);
  }
  labelsRow.appendChild(labels);
  sec.appendChild(labelsRow);

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

  return sec;
}

// === РЕНДЕР ДАШБОРДА (Кольца) ===

function renderRingSVG(percent, size, strokeWidth, color) {
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(100, percent));
  const dash = c * p / 100;
  return '<svg width="' + size + '" height="' + size + '" class="ring-svg">' +
    '<circle cx="' + size/2 + '" cy="' + size/2 + '" r="' + r + '" fill="none" stroke="var(--bg3)" stroke-width="' + strokeWidth + '"/>' +
    '<circle cx="' + size/2 + '" cy="' + size/2 + '" r="' + r + '" fill="none" stroke="' + color + '" stroke-width="' + strokeWidth + '" stroke-dasharray="' + dash + ' ' + c + '" stroke-linecap="round" transform="rotate(-90 ' + size/2 + ' ' + size/2 + ')"/>' +
    '</svg>';
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
  const uniqueDays = new Set((DATA.sessions || []).map(x => x.date)).size;
  return {
    total: total + baseMin, totalNoBase: total, week, month, todayMin, screens, msgs: msgs + baseMsgs,
    count: (DATA.sessions || []).length, daysCount: uniqueDays, avgPerDay: Math.round(total / Math.max(1, uniqueDays))
  };
}

function _localDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + dd;
}

function fmtH(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? h + 'ч ' + m + 'м' : m + 'м';
}

function _sumRange(sessions, period, field) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const td = _localDate(today);
  let from = '2000-01-01';
  if (period === 'day') from = td;
  else if (period === 'week') from = _localDate(new Date(today - 6 * 86400000));
  else if (period === 'month') from = _localDate(new Date(today.getFullYear(), today.getMonth(), 1));
  
  let sum = 0;
  for (const s of sessions) {
    if (s.date >= from && s.date <= td) sum += s[field] || 0;
  }
  return sum;
}

let HERO_MODE = 'today';
let MINI_MSG_PERIOD = 'day';
let MINI_SCR_PERIOD = 'day';
let MINI_TIME_PERIOD = 'avg';
const MINI_PERIODS_MSG = ['day', 'week', 'month', 'all'];
const MINI_PERIODS_TIME = ['avg', 'week', 'month', 'all'];
const MINI_LABELS = {day: 'День', week: 'Неделя', month: 'Месяц', all: 'Всё', avg: 'Среднее/день'};

function renderDashboard() {
  if (!DATA) return;
  const c = document.getElementById('content');
  if (!c) return;
  c.innerHTML = '';
  
  const t = calcTotals();
  const sessions = DATA.sessions || [];
  const msgVal = _sumRange(sessions, MINI_MSG_PERIOD, 'events');
  const scrVal = _sumRange(sessions, MINI_SCR_PERIOD, 'screens');
  const timeVal = MINI_TIME_PERIOD === 'avg' ? fmtH(t.avgPerDay) : (MINI_TIME_PERIOD === 'all' ? Math.floor(t.total/60)+'ч<br>'+(t.total%60)+'м' : Math.floor(_sumRange(sessions, MINI_TIME_PERIOD, 'duration_min')/60)+'ч<br>'+(_sumRange(sessions, MINI_TIME_PERIOD, 'duration_min')%60)+'м');

  let heroValue = t.todayMin, heroLabel = 'Сегодня', heroSub = 'Цель 12ч · ' + Math.round(t.todayMin / 720 * 100) + '%';
  if (HERO_MODE === 'last') {
    const sorted = sessions.slice().sort((a, b) => (b.date + (b.end || '')).localeCompare(a.date + (a.end || '')));
    const lastSess = sorted[0];
    heroValue = lastSess ? (lastSess.duration_min || 0) : 0;
    heroLabel = 'Последняя сессия';
    heroSub = lastSess ? (lastSess.date.slice(8, 10) + '.' + lastSess.date.slice(5, 7)) : '';
  }
  
  const pctDur = Math.round(heroValue / 720 * 100); // Пока цель хардкод 720 (12ч)
  const ringColor = pctDur >= 100 ? 'var(--green)' : 'var(--accent)';

  const div = document.createElement('div');
  div.className = 'hero-rings';
  div.innerHTML = 
    '<div class="hero-main"><div class="ring-wrap" style="cursor:pointer" id="hero-ring">' + renderRingSVG(pctDur, 290, 14, ringColor) +
      '<div class="ring-center"><div class="ring-icon">' + (HERO_MODE === 'today' ? '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--fg-dim)" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>' : '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--fg-dim)" stroke-width="2"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2"/><path d="M9 2h6"/></svg>') + '</div>' +
      '<div class="ring-label">' + heroLabel + '</div><div class="ring-value">' + fmtH(heroValue) + '</div><div class="ring-sub">' + heroSub + '</div></div></div></div>' +
    '<div class="hero-mini"><div class="mini-block"><div class="mini-label"><div class="mini-lbl-title">Сообщения</div><div class="mini-lbl-period">' + MINI_LABELS[MINI_MSG_PERIOD] + '</div></div><div class="mini-ring" style="cursor:pointer">' + renderRingSVG(100, 92, 7, 'var(--green)') + '<div class="mini-center"><div class="mini-val" style="font-size:22px">' + msgVal + '</div></div></div></div>' +
      '<div class="mini-block"><div class="mini-label"><div class="mini-lbl-title">Скрины</div><div class="mini-lbl-period">' + MINI_LABELS[MINI_SCR_PERIOD] + '</div></div><div class="mini-ring" style="cursor:pointer">' + renderRingSVG(100, 92, 7, 'var(--yellow)') + '<div class="mini-center"><div class="mini-val" style="font-size:22px">' + scrVal + '</div></div></div></div>' +
      '<div class="mini-block"><div class="mini-label">' + (MINI_TIME_PERIOD === 'avg' ? '<div class="mini-lbl-title">Среднее/день</div>' : '<div class="mini-lbl-title">Время</div><div class="mini-lbl-period">' + MINI_LABELS[MINI_TIME_PERIOD] + '</div>') + '</div><div class="mini-ring" style="cursor:pointer">' + renderRingSVG(100, 92, 7, 'var(--accent)') + '<div class="mini-center"><div class="mini-val" style="font-size:' + (String(timeVal).includes('<br>') ? '16' : '22') + 'px">' + timeVal + '</div></div></div></div></div>';
  
  c.appendChild(div);

  // Оживляем кольца
  const heroRing = div.querySelector('#hero-ring');
  if (heroRing) {
    heroRing.addEventListener('click', () => {
      HERO_MODE = HERO_MODE === 'today' ? 'last' : 'today';
      renderDashboard();
    });
  }

  div.querySelectorAll('.mini-block').forEach((block, index) => {
    const ring = block.querySelector('.mini-ring');
    if (ring) {
      ring.addEventListener('click', () => {
        if (index === 0) MINI_MSG_PERIOD = MINI_PERIODS_MSG[(MINI_PERIODS_MSG.indexOf(MINI_MSG_PERIOD) + 1) % MINI_PERIODS_MSG.length];
        else if (index === 1) MINI_SCR_PERIOD = MINI_PERIODS_MSG[(MINI_PERIODS_MSG.indexOf(MINI_SCR_PERIOD) + 1) % MINI_PERIODS_MSG.length];
        else if (index === 2) MINI_TIME_PERIOD = MINI_PERIODS_TIME[(MINI_PERIODS_TIME.indexOf(MINI_TIME_PERIOD) + 1) % MINI_PERIODS_TIME.length];
        renderDashboard();
      });
    }
  });
}
// Запуск
window.addEventListener('DOMContentLoaded', init);
