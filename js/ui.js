
// --- МОДУЛЬ: UI (Отрисовка) ---
let HERO_MODE = 'today';
let MINI_MSG_PERIOD = 'day';
let MINI_SCR_PERIOD = 'day';
let MINI_TIME_PERIOD = 'avg';
const MINI_PERIODS_MSG = ['day', 'week', 'month', 'all'];
const MINI_PERIODS_TIME = ['avg', 'week', 'month', 'all'];
const MINI_LABELS = {day: 'День', week: 'Неделя', month: 'Месяц', all: 'Всё', avg: 'Среднее/день'};

// === ДНЕВНИК ===



let CALENDAR_VIEW = 'month';
let CALENDAR_OFFSET = 0;
let CALENDAR_SELECTED_DAY = null;

function renderDiary() {
  const c = document.getElementById('content-diary');
  if (!c || !window.DATA) return;
  c.innerHTML = '';

  // 1. ШАПКА
  const topBar = document.createElement('div');
  topBar.style.cssText = 'margin-bottom: 16px;';
  
  // Фильтры
  const filters = document.createElement('div');
  filters.style.cssText = 'display:flex; gap:8px; margin-bottom:16px; overflow-x: auto; padding-bottom: 4px;';
  filters.innerHTML = `
    <button class="cal-btn ${CALENDAR_VIEW === 'week' ? 'active' : ''}" data-view="week" style="white-space:nowrap;">Неделя</button>
    <button class="cal-btn ${CALENDAR_VIEW === 'month' ? 'active' : ''}" data-view="month" style="white-space:nowrap;">Месяц</button>
    <button class="cal-btn ${CALENDAR_VIEW === 'year' ? 'active' : ''}" data-view="year" style="white-space:nowrap;">Год</button>
    <button class="cal-btn ${CALENDAR_VIEW === '30days' ? 'active' : ''}" data-view="30days" style="white-space:nowrap;">30 дней</button>
  `;
  topBar.appendChild(filters);

  // Навигация: [<-] Название [->]
  const navRow = document.createElement('div');
  navRow.style.cssText = 'display:flex; justify-content:space-between; align-items:center;';
  
  const prevBtn = document.createElement('button');
  prevBtn.id = 'cal-prev';
  prevBtn.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>';
  prevBtn.style.cssText = 'background:transparent; border:none; color:var(--fg); padding:8px; cursor:pointer;';
  
  const nextBtn = document.createElement('button');
  nextBtn.id = 'cal-next';
  nextBtn.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>';
  nextBtn.style.cssText = 'background:transparent; border:none; color:var(--fg); padding:8px; cursor:pointer;';

  const title = document.createElement('div');
  title.style.cssText = 'font-size:20px; font-weight:600; color:var(--fg); text-align:center;';
  
  const now = new Date();
  let currentDisplayDate = new Date(now.getFullYear(), now.getMonth() + (CALENDAR_VIEW === 'month' ? CALENDAR_OFFSET : 0), now.getDate() + (CALENDAR_VIEW === 'week' ? CALENDAR_OFFSET * 7 : (CALENDAR_VIEW === '30days' ? CALENDAR_OFFSET : 0)));
  
  const months = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
  
  if (CALENDAR_VIEW === 'year') {
    title.textContent = currentDisplayDate.getFullYear() + ' год';
  } else if (CALENDAR_VIEW === 'month') {
    title.textContent = months[currentDisplayDate.getMonth()] + ' ' + currentDisplayDate.getFullYear();
  } else if (CALENDAR_VIEW === '30days') {
    const end = new Date(currentDisplayDate);
    end.setDate(end.getDate() + 29);
    title.textContent = currentDisplayDate.getDate() + ' ' + months[currentDisplayDate.getMonth()].slice(0,3) + ' – ' + end.getDate() + ' ' + months[end.getMonth()].slice(0,3);
  } else {
    const startOfWeek = new Date(currentDisplayDate);
    startOfWeek.setDate(currentDisplayDate.getDate() - (currentDisplayDate.getDay() === 0 ? 6 : currentDisplayDate.getDay() - 1));
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    title.textContent = startOfWeek.getDate() + ' ' + months[startOfWeek.getMonth()].slice(0,3) + ' – ' + endOfWeek.getDate() + ' ' + months[endOfWeek.getMonth()].slice(0,3);
  }

  navRow.appendChild(prevBtn);
  navRow.appendChild(title);
  navRow.appendChild(nextBtn);
  topBar.appendChild(navRow);
  c.appendChild(topBar);

  // 2. СЕТКА
  const grid = document.createElement('div');
  grid.className = 'calendar-grid';
  if (CALENDAR_VIEW !== 'year') {
    const daysOfWeek = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    daysOfWeek.forEach(d => {
      const el = document.createElement('div');
      el.className = 'cal-dow';
      el.textContent = d;
      grid.appendChild(el);
    });
  } else {
    grid.style.cssText = 'display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px 8px; margin-bottom: 100px; padding: 0 4px;';
  }

  // Собираем даты
  let startDate, endDate;
  if (CALENDAR_VIEW === 'month') {
    startDate = new Date(currentDisplayDate.getFullYear(), currentDisplayDate.getMonth(), 1);
    endDate = new Date(currentDisplayDate.getFullYear(), currentDisplayDate.getMonth() + 1, 0);
  } else if (CALENDAR_VIEW === '30days') {
    startDate = new Date(currentDisplayDate);
    endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 29);
  } else if (CALENDAR_VIEW === 'week') {
    startDate = new Date(currentDisplayDate);
    startDate.setDate(currentDisplayDate.getDate() - (currentDisplayDate.getDay() === 0 ? 6 : currentDisplayDate.getDay() - 1));
    endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
  } else {
    startDate = new Date(currentDisplayDate.getFullYear(), 0, 1);
    endDate = new Date(currentDisplayDate.getFullYear(), 11, 31);
  }

  const dayStats = {};
  for (const s of window.DATA.sessions || []) {
    dayStats[s.date] = (dayStats[s.date] || 0) + (s.duration_min || 0);
  }
  const todayStr = _localDate(new Date());

  if (CALENDAR_VIEW === 'year') {
    for (let m = 0; m < 12; m++) {
      const mDiv = document.createElement('div');
      mDiv.innerHTML = '<div style="font-size:12px;color:var(--fg-dim);margin-bottom:4px;text-align:center;">' + months[m].slice(0,3) + '</div>';
      const miniGrid = document.createElement('div');
      miniGrid.style.cssText = 'display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px;';
      
      const mStart = new Date(currentDisplayDate.getFullYear(), m, 1);
      const mEnd = new Date(currentDisplayDate.getFullYear(), m + 1, 0);
      const firstDow = mStart.getDay() === 0 ? 6 : mStart.getDay() - 1;
      
      for (let i = 0; i < firstDow; i++) miniGrid.innerHTML += '<div></div>';
      for (let d = new Date(mStart); d <= mEnd; d.setDate(d.getDate() + 1)) {
        const ds = _localDate(d);
        const hasData = !!dayStats[ds];
        miniGrid.innerHTML += `<div style="aspect-ratio:1; display:flex; align-items:center; justify-content:center; font-size:9px; border-radius:50%; background:${hasData ? 'var(--accent)' : 'transparent'}; color:${hasData ? '#fff' : 'var(--fg-dim)'}">${d.getDate()}</div>`;
      }
      mDiv.style.cursor = 'pointer';
      miniGrid.style.pointerEvents = 'none';
      mDiv.addEventListener('click', () => {
        CALENDAR_VIEW = 'month';
        CALENDAR_OFFSET = m - new Date().getMonth();
        CALENDAR_SELECTED_DAY = null;
        renderDiary();
      });
      mDiv.appendChild(miniGrid);
      grid.appendChild(mDiv);
    }
    c.appendChild(grid);
  } else {
    const firstDow = startDate.getDay() === 0 ? 6 : startDate.getDay() - 1;
    for (let i = 0; i < firstDow; i++) grid.appendChild(document.createElement('div'));

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = _localDate(d);
      const dayCell = document.createElement('div');
      dayCell.className = 'cal-day';
      if (dateStr === todayStr) dayCell.classList.add('today');
      
      const num = document.createElement('div');
      num.className = 'cal-num';
      num.textContent = d.getDate();
      dayCell.appendChild(num);

      // ВЫДЕЛЕНИЕ (через класс в CSS, чтобы не было дублей стилей)
      if (dateStr === CALENDAR_SELECTED_DAY) {
        dayCell.classList.add('selected');
      }
      
      // Делаем цифру некликабельной, чтобы клик всегда попадал в dayCell
      num.style.pointerEvents = 'none';
      
      if (dayStats[dateStr]) {
        const dot = document.createElement('div');
        dot.className = 'cal-dot';
        dot.style.pointerEvents = 'none'; // Точка тоже не перехватывает клик
        dayCell.appendChild(dot);
      }
      
      // КЛИК
      dayCell.addEventListener('click', (e) => {
        e.stopPropagation();
        if (CALENDAR_SELECTED_DAY === dateStr) CALENDAR_SELECTED_DAY = null;
        else CALENDAR_SELECTED_DAY = dateStr;
        renderDiary();
      });
      
      grid.appendChild(dayCell);
    }
    c.appendChild(grid);
  }

  // 3. СПИСОК СЕССИЙ
  const listDiv = document.createElement('div');
  listDiv.style.marginTop = '24px';
  
  let filteredSessions = (window.DATA.sessions || []).filter(s => {
    const sd = new Date(s.date + 'T00:00:00');
    if (CALENDAR_VIEW === 'year') return sd.getFullYear() === startDate.getFullYear();
    return sd >= startDate && sd <= endDate;
  });
  
  if (CALENDAR_SELECTED_DAY) {
    filteredSessions = filteredSessions.filter(s => s.date === CALENDAR_SELECTED_DAY);
  }
  
  filteredSessions.sort((a, b) => (b.date + (b.start||'')).localeCompare(a.date + (a.start||'')));

  if (filteredSessions.length === 0) {
    listDiv.innerHTML = '<div class="empty" style="padding:20px 0;">Нет записей за этот период</div>';
  } else {
    const projName = {};
    for (const p of window.DATA.projects || []) projName[p.id] = p.name;
    
    for (const s of filteredSessions) {
      const item = document.createElement('div');
      item.className = 'diary-item';
      const timeRange = (s.start || '?') + ' → ' + (s.end || '?');
      const dur = fmtH(s.duration_min || 0);
      const proj = projName[s.project] || s.project || '–';
      const note = s.note ? s.note.replace(/\n/g, '<br>') : '';
      
      item.innerHTML =
        '<div class="diary-date" style="margin-top:0; border:none; padding:0; margin-bottom:4px;">' + formatDiaryDate(s.date) + '</div>' +
        '<div class="diary-time">' + timeRange + ' · <span class="diary-dur">' + dur + '</span></div>' +
        '<div class="diary-proj">' + proj + '</div>' +
        (note ? '<div class="diary-note">' + note + '</div>' : '');
      listDiv.appendChild(item);
    }
  }
  c.appendChild(listDiv);

  // 4. ОБРАБОТЧИКИ
  c.querySelectorAll('.cal-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      CALENDAR_VIEW = btn.dataset.view;
      CALENDAR_OFFSET = 0;
      CALENDAR_SELECTED_DAY = null;
      renderDiary();
    });
  });
  
  document.getElementById('cal-prev').addEventListener('click', () => { 
    if (CALENDAR_VIEW === 'year') CALENDAR_OFFSET--; 
    else if (CALENDAR_VIEW === '30days') CALENDAR_OFFSET -= 30;
    else CALENDAR_OFFSET--; 
    CALENDAR_SELECTED_DAY = null;
    renderDiary(); 
  });
  document.getElementById('cal-next').addEventListener('click', () => { 
    if (CALENDAR_VIEW === 'year') CALENDAR_OFFSET++; 
    else if (CALENDAR_VIEW === '30days') CALENDAR_OFFSET += 30;
    else CALENDAR_OFFSET++; 
    CALENDAR_SELECTED_DAY = null;
    renderDiary(); 
  });
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
  
  // Цель всегда равна среднему времени/день (если оно есть)
  let currentGoal = t.avgPerDay > 0 ? t.avgPerDay : DAILY_GOAL_MIN;

  let heroValue = t.todayMin, heroLabel = 'Сегодня', heroSub = 'Цель ' + fmtH(currentGoal) + ' · ' + Math.round(t.todayMin / currentGoal * 100) + '%';
  if (HERO_MODE === 'last') {
    const sorted = (window.DATA.sessions || []).slice().sort((a, b) => (b.date + (b.end || '')).localeCompare(a.date + (a.end || '')));
    const lastSess = sorted[0];
    heroValue = lastSess ? (lastSess.duration_min || 0) : 0;
    heroLabel = 'Последняя сессия';
    heroSub = lastSess ? (lastSess.date.slice(8, 10) + '.' + lastSess.date.slice(5, 7)) : '';
  }
  const pctDur = Math.round(heroValue / currentGoal * 100);

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

