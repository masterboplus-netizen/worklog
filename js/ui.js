
// --- МОДУЛЬ: UI (Отрисовка) ---
let HERO_MODE = 'today';
let MINI_MSG_PERIOD = 'day';
let MINI_SCR_PERIOD = 'day';
let MINI_TIME_PERIOD = 'avg';
const MINI_PERIODS_MSG = ['day', 'week', 'month', 'all'];
const MINI_PERIODS_TIME = ['avg', 'week', 'month', 'all'];
const MINI_LABELS = {day: 'День', week: 'Неделя', month: 'Месяц', all: 'Всё', avg: 'Среднее/день'};

// === ДНЕВНИК ===



function renderDiary() {
  const c = document.getElementById('content-diary');
  if (!c || !window.DATA) return;
  c.innerHTML = '';

  const list = (window.DATA.sessions || []).slice().sort((a, b) =>
    (b.date + (b.start || '')).localeCompare(a.date + (a.start || ''))
  );

  if (!list.length) {
    c.innerHTML = '<div class="empty"><div class="empty-icon">📭</div>Нет записей</div>';
    return;
  }

  const projName = {};
  for (const p of window.DATA.projects || []) projName[p.id] = p.name;

  // Группируем по дате (без склейки)
  const byDate = {};
  for (const s of list) {
    if (!byDate[s.date]) byDate[s.date] = [];
    byDate[s.date].push(s);
  }

  const dates = Object.keys(byDate).sort((a, b) => b.localeCompare(a));
  for (const d of dates) {
    const header = document.createElement('div');
    header.className = 'diary-date';
    header.textContent = formatDiaryDate(d);
    c.appendChild(header);

    const sortedSess = byDate[d].slice().sort((a, b) => (b.start || '').localeCompare(a.start || ''));
    for (const s of sortedSess) {
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

function renderHeroRings() {
  const t = calcTotals();
  const sessions = window.DATA.sessions || [];
  const _sessions = window.DATA.sessions || [];
  const msgVal = _sumRange(_sessions, MINI_MSG_PERIOD, 'events');
  const scrVal = _sumRange(_sessions, MINI_SCR_PERIOD, 'screens');
  function _fmtH2(min) { return Math.floor(min / 60) + 'ч<br>' + (min % 60) + 'м'; }
  let timeVal = MINI_TIME_PERIOD === 'avg' ? fmtH(t.avgPerDay) : (MINI_TIME_PERIOD === 'all' ? _fmtH2(t.total) : _fmtH2(_sumRange(_sessions, MINI_TIME_PERIOD, 'duration_min')));
  
  let heroValue = t.todayMin, heroLabel = 'Сегодня', heroSub = 'Цель ' + fmtH(DAILY_GOAL_MIN) + ' · ' + Math.round(t.todayMin / DAILY_GOAL_MIN * 100) + '%';
  if (HERO_MODE === 'last') {
    const sorted = (window.DATA.sessions || []).slice().sort((a, b) => (b.date + (b.end || '')).localeCompare(a.date + (a.end || '')));
    const lastSess = sorted[0];
    heroValue = lastSess ? (lastSess.duration_min || 0) : 0;
    heroLabel = 'Последняя сессия';
    heroSub = lastSess ? (lastSess.date.slice(8, 10) + '.' + lastSess.date.slice(5, 7)) : '';
  }
  const pctDur = Math.round(heroValue / DAILY_GOAL_MIN * 100);
  const ringColor = pctDur >= 100 ? 'var(--green)' : 'var(--accent)';
  const div = document.createElement('div');
  div.className = 'hero-rings';
  div.innerHTML = '<div class="hero-main"><div class="ring-wrap" style="cursor:pointer" id="hero-ring">' + renderRingSVG(pctDur, 290, 14, ringColor) +
        '<div class="ring-center"><div class="ring-icon">' + (HERO_MODE === 'today' ? '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--fg-dim)" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>' : '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--fg-dim)" stroke-width="2"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2"/><path d="M9 2h6"/></svg>') + '</div>' +
          '<div class="ring-label">' + heroLabel + '</div><div class="ring-value">' + fmtH(heroValue) + '</div><div class="ring-sub">' + heroSub + '</div></div></div></div>' +
    '<div class="hero-mini"><div class="mini-block" data-mini="msg"><div class="mini-label"><div class="mini-lbl-title">Сообщения</div><div class="mini-lbl-period">' + MINI_LABELS[MINI_MSG_PERIOD] + '</div></div><div class="mini-ring" style="cursor:pointer">' + renderRingSVG(100, 92, 7, 'var(--green)') + '<div class="mini-center"><div class="mini-val" style="font-size:22px">' + msgVal + '</div></div></div></div>' +
      '<div class="mini-block" data-mini="scr"><div class="mini-label"><div class="mini-lbl-title">Скрины</div><div class="mini-lbl-period">' + MINI_LABELS[MINI_SCR_PERIOD] + '</div></div><div class="mini-ring" style="cursor:pointer">' + renderRingSVG(100, 92, 7, 'var(--yellow)') + '<div class="mini-center"><div class="mini-val" style="font-size:22px">' + scrVal + '</div></div></div></div>' +
      '<div class="mini-block" data-mini="time"><div class="mini-label">' + (MINI_TIME_PERIOD === 'avg' ? '<div class="mini-lbl-title">Среднее/день</div>' : '<div class="mini-lbl-title">Время</div><div class="mini-lbl-period">' + MINI_LABELS[MINI_TIME_PERIOD] + '</div>') + '</div><div class="mini-ring" style="cursor:pointer">' + renderRingSVG(100, 92, 7, 'var(--accent)') + '<div class="mini-center"><div class="mini-val" style="font-size:' + (timeVal.includes('<br>') ? '16' : '22') + 'px">' + timeVal + '</div></div></div></div></div>';
  
  div.querySelector('#hero-ring').addEventListener('click', () => { HERO_MODE = HERO_MODE === 'today' ? 'last' : 'today'; renderDashboard(); });
  div.querySelectorAll('.mini-block').forEach((block, index) => {
    block.querySelector('.mini-ring').addEventListener('click', () => {
      if (index === 0) MINI_MSG_PERIOD = MINI_PERIODS_MSG[(MINI_PERIODS_MSG.indexOf(MINI_MSG_PERIOD) + 1) % MINI_PERIODS_MSG.length];
      else if (index === 1) MINI_SCR_PERIOD = MINI_PERIODS_MSG[(MINI_PERIODS_MSG.indexOf(MINI_SCR_PERIOD) + 1) % MINI_PERIODS_MSG.length];
      else if (index === 2) MINI_TIME_PERIOD = MINI_PERIODS_TIME[(MINI_PERIODS_TIME.indexOf(MINI_TIME_PERIOD) + 1) % MINI_PERIODS_TIME.length];
      renderDashboard();
    });
  });
  return div;
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

function calcTotals() {
  const now = new Date();
  const today = _localDate(now);
  const weekAgo = _localDate(new Date(now - 7 * 86400000));
  const monthAgo = _localDate(new Date(now - 30 * 86400000));
  const base = window.DATA.baseline || {};
  const baseMin = base.minutes || 0;
  const baseMsgs = base.messages || 0;
  let total = 0, week = 0, month = 0, todayMin = 0, screens = 0, msgs = 0;
  for (const s of window.DATA.sessions || []) {
    total += s.duration_min || 0;
    if (s.date >= weekAgo) week += s.duration_min || 0;
    if (s.date >= monthAgo) month += s.duration_min || 0;
    if (s.date === today) todayMin += s.duration_min || 0;
    screens += s.screens || 0;
    msgs += s.events || 0;
  }
  const uniqueDays = new Set((window.DATA.sessions || []).map(x => x.date)).size;
  return {
    total: total + baseMin, totalNoBase: total, week, month, todayMin, screens, msgs: msgs + baseMsgs,
    count: (window.DATA.sessions || []).length, daysCount: uniqueDays, avgPerDay: Math.round(total / Math.max(1, uniqueDays))
  };
}


// === ПРОЕКТЫ ===
function renderProjects() {
  const sec = document.createElement('div');
  sec.className = 'section';
  const byProj = {};
  for (const s of window.DATA.sessions || []) {
    byProj[s.project] = (byProj[s.project] || 0) + (s.duration_min || 0);
  }
  const base = window.DATA.baseline || {};
  if (base.minutes && base.project) {
    byProj[base.project] = (byProj[base.project] || 0) + base.minutes;
  } else if (base.minutes) {
    const firstId = (window.DATA.projects || [])[0]?.id;
    if (firstId) byProj[firstId] = (byProj[firstId] || 0) + base.minutes;
  }
  for (const p of window.DATA.projects || []) {
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
    card.style.margin = '16px';
    card.innerHTML =
      '<div class="project-head">' +
        '<div class="project-name"><span class="project-dot" style="background:' + (p.color || '#4A9EFF') + '"></span>' + p.name + '</div>' +
        '<div class="project-hours">' + fmtH(hrs) + '</div>' +
      '</div>' +
      '<div class="progress-bar"><div class="progress-fill" style="width:' + pct + '%;background:' + (p.color || '#4A9EFF') + '"></div></div>' +
      '<div class="project-meta">Выполнено: ' + doneItems + ' из ' + totalItems + ' (' + pct + '%) · ' + (p.status || '') + '</div>';
    const phasesDiv = document.createElement('div');
    phasesDiv.className = 'phases hidden';
    for (const ph of p.plan || []) {
      const items = ph.items || [];
      const total = items.length;
      const done = items.filter(it => typeof it === 'object' && it.done).length;
      const phPct = total ? Math.round(done / total * 100) : 0;
      const statusIcon = phPct === 100 ? '✅' : (phPct > 0 ? '🟡' : '📋');
      const phDiv = document.createElement('div');
      phDiv.className = 'phase';
      phDiv.innerHTML = '<div class="phase-head"><span class="phase-arrow"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 9l6 6 6-6"/></svg></span><span class="phase-icon">' + statusIcon + '</span><span class="phase-name">' + ph.phase + '</span><span class="phase-pct">' + phPct + '%</span></div><div class="phase-bar"><div class="phase-fill" style="width:' + phPct + '%;background:' + (p.color || '#4A9EFF') + '"></div></div>';
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
      phDiv.addEventListener('click', () => { phDiv.classList.toggle('open'); itemsList.classList.toggle('hidden'); });
      phasesDiv.appendChild(phDiv);
    }
    card.appendChild(phasesDiv);
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
      openBtn.querySelector('span').textContent = phasesDiv.classList.contains('hidden') ? 'Открыть' : 'Свернуть';
    });
    anBtn.addEventListener('click', (ev) => { ev.stopPropagation(); openAnalyticsSheet(p.id); });
    card.insertBefore(actionsDiv, phasesDiv);
    sec.appendChild(card);
  }
  return sec;
}


// === ГРАФИК ===
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

    // Кнопки месяца и года
    const d = new Date();
    d.setMonth(d.getMonth() + CHART_OFFSET_MONTHS);
    const months = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
    
    const filterDiv = document.createElement('div');
    filterDiv.className = 'month-year-filter';
    filterDiv.innerHTML = 
      '<button class="month-btn" id="btn-month">' + months[d.getMonth()] + '</button>' +
      '<button class="year-btn" id="btn-year">' + d.getFullYear() + '</button>';
    c.appendChild(filterDiv);

    setTimeout(() => {
      const btnMonth = document.getElementById('btn-month');
      const btnYear = document.getElementById('btn-year');
      if (btnMonth) btnMonth.addEventListener('click', () => openMonthPicker());
      if (btnYear) btnYear.addEventListener('click', () => openYearPicker());
    }, 0);

    const chartDiv = document.createElement('div');
    chartDiv.style.padding = '0 16px 16px 16px';
    chartDiv.appendChild(renderChart());
    c.appendChild(chartDiv);
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

    // Делегирование событий (тапы на кнопки и столбики)
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
                // Перерисовываем, чтобы обновить тултип
                renderActivityPage();
                return;
            }
        });
    }
}

function renderChart() {
  const container = document.createElement('div');
  container.className = 'chart-container';

  // 1. Фильтры периодов
  const periods = [[1, 'День'], [7, 'Неделя'], [30, 'Месяц']];
  const filterHTML = periods.map(([n, label]) =>
    '<button class="period-btn' + (CHART_PERIOD === n ? ' active' : '') + '" data-period="' + n + '">' + label + '</button>'
  ).join('');
  const filterRow = document.createElement('div');
  filterRow.className = 'period-filter-row';
  filterRow.innerHTML = filterHTML;
  container.appendChild(filterRow);

  // 2. Формируем список дней
  const days = [];
  const now = new Date();
  now.setMonth(now.getMonth() + CHART_OFFSET_MONTHS);

  if (CHART_PERIOD === 30) {
    const year = now.getFullYear();
    const month = now.getMonth();
    const lastDay = new Date(year, month + 1, 0);
    for (let i = 0; i < lastDay.getDate(); i++) {
      days.push(_localDate(new Date(year, month, i + 1)));
    }
  } else {
    const totalDays = CHART_PERIOD === 1 ? 1 : CHART_PERIOD;
    for (let i = totalDays - 1; i >= 0; i--) {
      days.push(_localDate(new Date(now - i * 86400000)));
    }
  }

  // 3. Считаем значения
  const byDay = {};
  for (const ss of window.DATA.sessions || []) {
    let v = 0;
    if (CHART_METRIC === 'duration') v = ss.duration_min || 0;
    else if (CHART_METRIC === 'events') v = ss.events || 0;
    else if (CHART_METRIC === 'screens') v = ss.screens || 0;
    byDay[ss.date] = (byDay[ss.date] || 0) + v;
  }

  // 4. Строим график (Ось Y + Столбики)
  const maxVal = Math.max(1, ...days.map(d => byDay[d] || 0));
  let top = 60;
  if (maxVal > 60) top = Math.ceil(maxVal / 60) * 60;
  const step = top / 4;

  const chartBars = document.createElement('div');
  chartBars.className = 'chart-bars';

  // Ось Y
  const yAxis = document.createElement('div');
  yAxis.className = 'chart-y-axis';
  let yAxisHTML = '';
  for (let i = 4; i >= 0; i--) {
    const val = step * i;
    const label = CHART_METRIC === 'duration' ? (Math.floor(val / 60) + 'ч') : String(val);
    yAxisHTML += '<div class="chart-grid-line"><span>' + label + '</span></div>';
  }
  yAxis.innerHTML = yAxisHTML;
  chartBars.appendChild(yAxis);

  // Столбики
  const barsWrap = document.createElement('div');
  barsWrap.className = 'chart-bars-wrap';
  
  for (const d of days) {
    const val = byDay[d] || 0;
    const h = val ? Math.max(2, Math.round(val / top * 100)) : 0;
    const isSel = CHART_SELECTED === d;
    const lblText = val ? (CHART_METRIC === 'duration' ? (Math.floor(val/60) + 'ч ' + (val%60) + 'м') : String(val)) : '';

    const col = document.createElement('div');
    col.className = 'chart-col';
    col.innerHTML = 
      '<div class="chart-bar' + (val ? '' : ' empty') + (isSel ? ' selected' : '') + '" ' +
      'data-date="' + d + '" style="height:' + h + '%">' +
        (lblText ? '<div class="bar-label">' + lblText + '</div>' : '') +
      '</div>';
    barsWrap.appendChild(col);
  }
  chartBars.appendChild(barsWrap);
  container.appendChild(chartBars);

  // 5. Подписи дат (Синхронизированы со столбиками)
  const labelsRow = document.createElement('div');
  labelsRow.className = 'chart-labels-row';

  const spacer = document.createElement('div');
  spacer.className = 'chart-spacer';
  labelsRow.appendChild(spacer);

  const labelsWrap = document.createElement('div');
  labelsWrap.className = 'chart-labels';

  const isShort = days.length <= 14;
  const dowNames = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

  for (const d of days) {
    const lbl = document.createElement('div');
    lbl.className = 'chart-label';
    const dayNum = parseInt(d.slice(8, 10), 10);
    
    // Показываем все даты для коротких периодов, для месяца — только 1, 5, 10, 15...
    if (isShort || dayNum === 1 || dayNum % 5 === 0) {
      const dow = dowNames[new Date(d + 'T00:00:00').getDay()];
      lbl.innerHTML = '<div class="lbl-date">' + dayNum + '</div><div class="lbl-dow">' + dow + '</div>';
    }
    labelsWrap.appendChild(lbl);
  }
  
  labelsRow.appendChild(labelsWrap);
  container.appendChild(labelsRow);

  // 6. Кнопки метрик
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
  container.appendChild(metricBar);

  return container;
}


function renderDashboard() {
  if (!window.DATA) return;
  const c = document.getElementById('content');
  if (!c) return;
  c.innerHTML = '';
  c.appendChild(renderHeroRings());
}


// === ШТОРКА ВЫБОРА МЕСЯЦА ===
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
      CHART_OFFSET_MONTHS = m - now.getMonth();
      close();
      renderActivityPage();
    }
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

// === ШТОРКА ВЫБОРА ГОДА ===
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
      close();
      renderActivityPage();
    }
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
