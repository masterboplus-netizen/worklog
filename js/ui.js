
// --- МОДУЛЬ: UI (Отрисовка) ---
let HERO_MODE = 'today';
let MINI_MSG_PERIOD = 'day';
let MINI_SCR_PERIOD = 'day';
let MINI_TIME_PERIOD = 'avg';
let MINI_TASKS_PERIOD = 'day';
const MINI_PERIODS_MSG = ['day', 'week', 'month', 'all'];
const MINI_PERIODS_TIME = ['avg', 'week', 'month', 'all'];
const MINI_LABELS = {day: 'День', week: 'Неделя', month: 'Месяц', all: 'Всё', avg: 'Среднее/день'};

// === ДНЕВНИК ===



let DIARY_MODE = 'sessions';
let CALENDAR_VIEW = 'month';
let CALENDAR_OFFSET = 0;
let CALENDAR_SELECTED_DAY = null;


function mergeMidnightSessions(sessions) {
  if (!sessions || !sessions.length) return [];
  
  // 1. Сортируем ВСЕ сессии по дате и времени начала
  const sorted = [...sessions].sort((a, b) => (a.date + ' ' + a.start).localeCompare(b.date + ' ' + b.start));
  
  const merged = [];
  let current = null;

  // Функция перевода даты и времени в миллисекунды
  const getMs = (dateStr, timeStr) => {
    return new Date(dateStr + 'T' + (timeStr || '00:00') + ':00').getTime();
  };

  const GAP_MS = 15 * 60 * 1000; // 15 минут в миллисекундах

  for (const s of sorted) {
    if (!current) {
      current = { ...s };
      continue;
    }

    let currEndMs = getMs(current.date, current.end);
    // Если текущая сессия ушла за полночь (конец меньше начала), добавляем сутки к концу
    if (currEndMs < getMs(current.date, current.start)) {
        currEndMs += 24 * 60 * 60 * 1000;
    }

    const sStartMs = getMs(s.date, s.start);

    // Если следующая начинается РАНЬШЕ или РОВНО через 15 минут после конца текущей — склеиваем
    if (sStartMs <= currEndMs + GAP_MS) {
      let sEndMs = getMs(s.date, s.end);
      if (sEndMs < sStartMs) sEndMs += 24 * 60 * 60 * 1000;

      if (sEndMs > currEndMs) {
        current.end = s.end;
        if (s.date > current.date) current.endDate = s.date; 
      }
      
      current.duration_min = (current.duration_min || 0) + (s.duration_min || 0);
      current.events = (current.events || 0) + (s.events || 0);
      current.screens = (current.screens || 0) + (s.screens || 0);
      current.tasks_done = (current.tasks_done || 0) + (s.tasks_done || 0);
      
      if (s.note && !current.note.includes(s.note)) {
          current.note = (current.note ? current.note + ' ' : '') + s.note;
      }
    } else {
      // Есть разрыв больше 15 минут — сохраняем текущую и начинаем новую
      merged.push(current);
      current = { ...s };
    }
  }
  
  if (current) merged.push(current);
  
  return merged.sort((a, b) => b.date.localeCompare(a.date));
}

function renderDiary() {
  const c = document.getElementById('content-diary');
  if (!c || !window.DATA) return;
  c.innerHTML = '';

  const now = new Date();
  let curDate = new Date(now.getFullYear(), now.getMonth() + (CALENDAR_VIEW === 'month' ? CALENDAR_OFFSET : 0), now.getDate() + (CALENDAR_VIEW === 'week' ? CALENDAR_OFFSET * 7 : (CALENDAR_VIEW === '30days' ? CALENDAR_OFFSET : 0)));
  if (CALENDAR_VIEW === 'year') curDate.setFullYear(curDate.getFullYear() + CALENDAR_OFFSET);
  
  const months = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
  const monthsShort = ['янв','фев','мар','апр','мая','июн','июл','авг','сен','окт','ноя','дек'];

  let start, end;
  if (CALENDAR_VIEW === 'year') {
    start = new Date(curDate.getFullYear(), 0, 1);
    end = new Date(curDate.getFullYear(), 11, 31);
  } else if (CALENDAR_VIEW === 'month') {
    start = new Date(curDate.getFullYear(), curDate.getMonth(), 1);
    end = new Date(curDate.getFullYear(), curDate.getMonth() + 1, 0);
  } else if (CALENDAR_VIEW === 'week') {
    start = new Date(curDate); start.setDate(curDate.getDate() - (curDate.getDay() === 0 ? 6 : curDate.getDay() - 1));
    end = new Date(start); end.setDate(start.getDate() + 6);
  } else if (CALENDAR_VIEW === '30days') {
    start = new Date(curDate); end = new Date(curDate); end.setDate(start.getDate() + 29);
  }

  // 1. КАПСУЛА ВИДОВ
  const viewCapsule = document.createElement('div');
  viewCapsule.className = 'segmented-control';
  viewCapsule.innerHTML = `
    <button class="${CALENDAR_VIEW === 'week' ? 'active' : ''}" data-view="week">Неделя</button>
    <button class="${CALENDAR_VIEW === 'month' ? 'active' : ''}" data-view="month">Месяц</button>
    <button class="${CALENDAR_VIEW === 'year' ? 'active' : ''}" data-view="year">Год</button>
    <button class="${CALENDAR_VIEW === '30days' ? 'active' : ''}" data-view="30days">30 дней</button>
  `;
  c.appendChild(viewCapsule);

  // 2. НАВИГАЦИЯ
  const navRow = document.createElement('div');
  navRow.style.cssText = 'display:flex; justify-content:center; align-items:center; gap:16px; margin: 16px 0; font-size:20px; font-weight:600; color:var(--fg);';

  const prevBtn = document.createElement('button');
  prevBtn.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>';
  prevBtn.style.cssText = 'background:transparent; border:none; color:var(--fg); cursor:pointer;';

  const nextBtn = document.createElement('button');
  nextBtn.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>';
  nextBtn.style.cssText = 'background:transparent; border:none; color:var(--fg); cursor:pointer;';

  const title = document.createElement('div');
  if (CALENDAR_VIEW === 'year') title.textContent = curDate.getFullYear() + ' год';
  else if (CALENDAR_VIEW === 'month') title.textContent = months[curDate.getMonth()] + ' ' + curDate.getFullYear();
  else if (CALENDAR_VIEW === '30days') {
      const endD = new Date(start); endD.setDate(start.getDate() + 29);
      title.textContent = start.getDate() + ' ' + monthsShort[start.getMonth()] + ' – ' + endD.getDate() + ' ' + monthsShort[endD.getMonth()];
  } else {
      title.textContent = 'Неделя';
  }

  navRow.appendChild(prevBtn);
  navRow.appendChild(title);
  navRow.appendChild(nextBtn);
  c.appendChild(navRow);

  // 3. СЕТКА
  const grid = document.createElement('div');
  grid.className = 'calendar-grid';

  const dayStats = {};
  for (const s of window.DATA.sessions || []) dayStats[s.date] = (dayStats[s.date] || 0) + (s.duration_min || 0);
  const todayStr = _localDate(new Date());

  if (CALENDAR_VIEW === 'year') {
    grid.style.cssText = 'display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px 8px; margin-bottom: 24px; padding: 0 4px;';
    for (let m = 0; m < 12; m++) {
      const mDiv = document.createElement('div');
      mDiv.innerHTML = '<div style="font-size:12px;color:var(--fg-dim);margin-bottom:4px;text-align:center;">' + months[m].slice(0,3) + '</div>';
      const miniGrid = document.createElement('div');
      miniGrid.style.cssText = 'display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px;';

      const mStart = new Date(curDate.getFullYear(), m, 1);
      const mEnd = new Date(curDate.getFullYear(), m + 1, 0);
      const firstDow = mStart.getDay() === 0 ? 6 : mStart.getDay() - 1;

      for (let i = 0; i < firstDow; i++) miniGrid.innerHTML += '<div></div>';
      for (let d = new Date(mStart); d <= mEnd; d.setDate(d.getDate() + 1)) {
        const ds = _localDate(d);
        const hasData = !!dayStats[ds];
        const isToday = ds === todayStr;
        
        let bg = 'transparent';
        let col = 'var(--fg-dim)';
        if (isToday) { bg = 'rgba(255, 255, 255, 0.2)'; col = '#fff'; }
        
        // Уменьшаем размер ячейки и шрифт
        let cellHtml = `<div style="aspect-ratio:1; display:flex; align-items:center; justify-content:center; font-size:7px; border-radius:50%; background:${bg}; color:${col}; position:relative;">${d.getDate()}`;
        if (hasData) {
             cellHtml += `<div style="position:absolute; bottom:0px; width:2px; height:2px; border-radius:50%; background:var(--accent);"></div>`;
        }
        cellHtml += `</div>`;
        miniGrid.innerHTML += cellHtml;
      }
      mDiv.style.cursor = 'pointer';
      miniGrid.style.pointerEvents = 'none';
      mDiv.addEventListener('click', () => {
        CALENDAR_VIEW = 'month';
        CALENDAR_OFFSET = m - new Date().getMonth() + (curDate.getFullYear() - new Date().getFullYear()) * 12;
        CALENDAR_SELECTED_DAY = null;
        renderDiary();
      });
      mDiv.appendChild(miniGrid);
      grid.appendChild(mDiv);
    }
  } else {
    ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].forEach(d => {
      const el = document.createElement('div'); el.className = 'cal-dow'; el.textContent = d; grid.appendChild(el);
    });
    const firstDow = start.getDay() === 0 ? 6 : start.getDay() - 1;
    for (let i = 0; i < firstDow; i++) grid.appendChild(document.createElement('div'));

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const ds = _localDate(d);
      const cell = document.createElement('div');
      cell.className = 'cal-day';
      if (ds === todayStr) cell.classList.add('today');
      if (ds === CALENDAR_SELECTED_DAY) cell.classList.add('selected');
      cell.innerHTML = `<div class="cal-num">${d.getDate()}</div>`;
      if (dayStats[ds]) cell.innerHTML += '<div class="cal-dot"></div>';
      cell.addEventListener('click', () => { CALENDAR_SELECTED_DAY = CALENDAR_SELECTED_DAY === ds ? null : ds; renderDiary(); });
      grid.appendChild(cell);
    }
  }
  c.appendChild(grid);

  // 4. КАПСУЛА РЕЖИМА
  const modeCapsule = document.createElement('div');
  modeCapsule.className = 'segmented-control';
  modeCapsule.style.marginTop = '24px';
  modeCapsule.innerHTML = `
    <button class="${DIARY_MODE === 'sessions' ? 'active' : ''}" data-mode="sessions">Сессии</button>
    <button class="${DIARY_MODE === '24h' ? 'active' : ''}" data-mode="24h">24ч</button>
  `;
  c.appendChild(modeCapsule);

  // 5. СПИСОК
  const listDiv = document.createElement('div');
  listDiv.style.marginTop = '16px';
  let baseSessions = DIARY_MODE === 'sessions' ? mergeMidnightSessions(window.DATA.sessions || []) : (window.DATA.sessions || []);
  let filtered = baseSessions.filter(s => {
      const sd = new Date(s.date + 'T00:00:00');
      if (CALENDAR_VIEW === 'year') return sd.getFullYear() === curDate.getFullYear();
      return sd >= start && sd <= end;
  });
  
  if (CALENDAR_SELECTED_DAY) filtered = filtered.filter(s => s.date === CALENDAR_SELECTED_DAY);
  
  // Сортируем строго по дате, а если даты совпадают — по времени начала
  filtered.sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    return (b.start || '').localeCompare(a.start || '');
  });

  const projName = {};
  for (const p of window.DATA.projects || []) projName[p.id] = p.name;

  if (filtered.length === 0) {
      listDiv.innerHTML = '<div class="empty" style="padding:20px 0;">Нет записей за этот период</div>';
  } else {
      let lastDate = '';
      filtered.forEach(s => {
          if (s.date !== lastDate) {
              const dateHeader = document.createElement('div');
              dateHeader.className = 'diary-date';
              dateHeader.textContent = formatDiaryDate(s.date);
              listDiv.appendChild(dateHeader);
              lastDate = s.date;
          }
          const item = document.createElement('div');
          item.className = 'diary-item';
          item.innerHTML = `
            <div class="diary-time">${s.start || '?'} → ${s.end || '?'} · <span class="diary-dur">${fmtH(s.duration_min || 0)}</span></div>
            <div class="diary-proj">${projName[s.project] || s.project || '–'}</div>
            <div class="diary-note">${s.note || ''}</div>
          `;
          listDiv.appendChild(item);
      });
  }
  c.appendChild(listDiv);

  // 6. ОБРАБОТЧИКИ
  viewCapsule.querySelectorAll('button[data-view]').forEach(b => {
      b.addEventListener('click', () => { 
          CALENDAR_VIEW = b.dataset.view; 
          CALENDAR_OFFSET = 0; 
          CALENDAR_SELECTED_DAY = null; 
          renderDiary(); 
      });
  });
  modeCapsule.querySelectorAll('button[data-mode]').forEach(b => {
      b.addEventListener('click', () => { 
          DIARY_MODE = b.dataset.mode; 
          renderDiary(); 
      });
  });
  prevBtn.addEventListener('click', () => { 
    if (CALENDAR_VIEW === '30days') CALENDAR_OFFSET -= 30; else CALENDAR_OFFSET--; 
    CALENDAR_SELECTED_DAY = null; renderDiary(); 
  });
  nextBtn.addEventListener('click', () => { 
    if (CALENDAR_VIEW === '30days') CALENDAR_OFFSET += 30; else CALENDAR_OFFSET++; 
    CALENDAR_SELECTED_DAY = null; renderDiary(); 
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
  const offset = c - dash;
  
  // Вращаем только сам круг, чтобы прогресс начинался ровно сверху (12 часов)
  return '<svg width="' + size + '" height="' + size + '" class="ring-svg" style="overflow: visible;">' +
    '<circle cx="' + size/2 + '" cy="' + size/2 + '" r="' + r + '" fill="none" stroke="var(--bg3)" stroke-width="' + strokeWidth + '"/>' +
    '<circle class="ring-progress" cx="' + size/2 + '" cy="' + size/2 + '" r="' + r + '" fill="none" stroke="' + color + '" stroke-width="' + strokeWidth + '" ' +
    'stroke-dasharray="' + c + '" stroke-dashoffset="' + c + '" data-target-offset="' + offset + '" ' +
    'stroke-linecap="round" transform="rotate(-90 ' + size/2 + ' ' + size/2 + ')"/>' +
    '</svg>';
}



function getProgressColor(percent) {
  if (percent < 25) return 'var(--red)';
  if (percent < 50) return 'var(--yellow)';
  if (percent < 85) return 'var(--accent)'; // Синий
  return 'var(--green)'; // Зеленый
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

  let heroValue = t.todayMin, heroLabel = 'Сегодня', heroSub = 'Среднее ' + fmtH(currentGoal) + ' · ' + Math.round(t.todayMin / currentGoal * 100) + '%';
  if (HERO_MODE === 'last') {
    const sorted = (window.DATA.sessions || []).slice().sort((a, b) => (b.date + (b.end || '')).localeCompare(a.date + (a.end || '')));
    const lastSess = sorted[0];
    heroValue = lastSess ? (lastSess.duration_min || 0) : 0;
    heroLabel = 'Последняя сессия';
    heroSub = lastSess ? (lastSess.date.slice(8, 10) + '.' + lastSess.date.slice(5, 7)) : '';
  }
  const pctDur = Math.round(heroValue / currentGoal * 100);
  const ringColor = getProgressColor(pctDur);

  // --- Считаем проценты для малых колец (через среднее) ---
  const uniqueDays = new Set(sessions.map(s => s.date)).size || 1;

  // 1. Сообщения (относительно рекорда)
  // Группируем сообщения по дням, чтобы найти максимальный день
  const msgByDay = {};
  for (const s of sessions) {
    msgByDay[s.date] = (msgByDay[s.date] || 0) + (s.events || 0);
  }
  let maxMsg = 1;
  for (const k in msgByDay) {
    if (msgByDay[k] > maxMsg) maxMsg = msgByDay[k];
  }
  let msgRaw = MINI_MSG_PERIOD === 'day' ? _sumRange(sessions, 'day', 'events') : msgVal;
  let pctMsg = Math.min(100, Math.round(msgRaw / maxMsg * 100));

  // 2. Скрины (относительно рекорда)
  const maxScr = Math.max(1, ...sessions.map(s => s.screens || 0));
  let scrRaw = MINI_SCR_PERIOD === 'day' ? _sumRange(sessions, 'day', 'screens') : scrVal;
  let pctScr = Math.min(100, Math.round(scrRaw / maxScr * 100));

  // 3. Задачи (относительно рекорда)
  const maxTasks = Math.max(1, ...sessions.map(s => s.tasks_done || 0));
  const tasksVal = _sumRange(_sessions, MINI_TASKS_PERIOD, 'tasks_done');
  let pctTasks = Math.min(100, Math.round(tasksVal / maxTasks * 100));

  const div = document.createElement('div');
  div.className = 'hero-rings';
  div.innerHTML = '<div class="hero-main"><div class="ring-wrap" style="cursor:pointer" id="hero-ring">' + renderRingSVG(pctDur, 290, 14, ringColor) +
        '<div class="ring-center"><div class="ring-icon">' + (HERO_MODE === 'today' ? '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--fg-dim)" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>' : '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--fg-dim)" stroke-width="2"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2"/><path d="M9 2h6"/></svg>') + '</div>' +
          '<div class="ring-label">' + heroLabel + '</div><div class="ring-value">' + fmtH(heroValue) + '</div><div class="ring-sub">' + heroSub + '</div></div></div></div>' +
    '<div class="hero-mini"><div class="mini-block" data-mini="msg"><div class="mini-label"><div class="mini-lbl-title">Сообщения</div><div class="mini-lbl-period">' + MINI_LABELS[MINI_MSG_PERIOD] + '</div></div><div class="mini-ring" style="cursor:pointer">' + renderRingSVG(pctMsg, 92, 7, getProgressColor(pctMsg)) + '<div class="mini-center"><div class="mini-val" style="font-size:22px">' + msgVal + '</div></div></div></div>' +
      '<div class="mini-block" data-mini="scr"><div class="mini-label"><div class="mini-lbl-title">Скрины</div><div class="mini-lbl-period">' + MINI_LABELS[MINI_SCR_PERIOD] + '</div></div><div class="mini-ring" style="cursor:pointer">' + renderRingSVG(pctScr, 92, 7, getProgressColor(pctScr)) + '<div class="mini-center"><div class="mini-val" style="font-size:22px">' + scrVal + '</div></div></div></div>' +
      '<div class="mini-block" data-mini="tasks"><div class="mini-label"><div class="mini-lbl-title">Задачи</div><div class="mini-lbl-period">' + MINI_LABELS[MINI_TASKS_PERIOD] + '</div></div><div class="mini-ring" style="cursor:pointer">' + renderRingSVG(pctTasks, 92, 7, getProgressColor(pctTasks)) + '<div class="mini-center"><div class="mini-val" style="font-size:22px">' + tasksVal + '</div></div></div></div></div>';

  div.querySelector('#hero-ring').addEventListener('click', () => { HERO_MODE = HERO_MODE === 'today' ? 'last' : 'today'; renderDashboard(); });
  div.querySelectorAll('.mini-block').forEach((block, index) => {
    block.querySelector('.mini-ring').addEventListener('click', () => {
      if (index === 0) MINI_MSG_PERIOD = MINI_PERIODS_MSG[(MINI_PERIODS_MSG.indexOf(MINI_MSG_PERIOD) + 1) % MINI_PERIODS_MSG.length];
      else if (index === 1) MINI_SCR_PERIOD = MINI_PERIODS_MSG[(MINI_PERIODS_MSG.indexOf(MINI_SCR_PERIOD) + 1) % MINI_PERIODS_MSG.length];
      else if (index === 2) MINI_TASKS_PERIOD = MINI_PERIODS_MSG[(MINI_PERIODS_MSG.indexOf(MINI_TASKS_PERIOD) + 1) % MINI_PERIODS_MSG.length];
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

    // 1. ВЕРХНИЕ ФИЛЬТРЫ (только 7 дней и Месяц)
    const filters = document.createElement('div');
    filters.style.cssText = 'display:flex; gap:8px; margin-bottom:16px; padding: 0 16px;';
    
    const periods = [[7, '7 дней'], [30, 'Месяц']];
    filters.innerHTML = periods.map(([n, label]) =>
      '<button class="cal-btn' + (CHART_PERIOD === n ? ' active' : '') + '" data-period="' + n + '" style="flex:1; text-align:center;">' + label + '</button>'
    ).join('');
    
    c.appendChild(filters);

    // 2. НАВИГАЦИЯ ПО ДАТЕ (как в календаре: [<-] Октябрь 2026 [->])
    const navRow = document.createElement('div');
    navRow.style.cssText = 'display:flex; justify-content:space-between; align-items:center; padding: 0 16px; margin-bottom: 16px;';

    const prevBtn = document.createElement('button');
    prevBtn.id = 'chart-prev';
    prevBtn.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>';
    prevBtn.style.cssText = 'background:transparent; border:none; color:var(--fg); padding:8px; cursor:pointer;';

    const nextBtn = document.createElement('button');
    nextBtn.id = 'chart-next';
    nextBtn.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>';
    nextBtn.style.cssText = 'background:transparent; border:none; color:var(--fg); padding:8px; cursor:pointer;';

    const title = document.createElement('div');
    title.style.cssText = 'font-size:20px; font-weight:600; color:var(--fg); text-align:center; cursor:pointer;';
    
    const d = new Date();
    d.setMonth(d.getMonth() + CHART_OFFSET_MONTHS);
    const months = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
    title.textContent = months[d.getMonth()] + ' ' + d.getFullYear();

    // Клик по заголовку открывает выбор месяца (как в календаре)
    title.addEventListener('click', () => openMonthPicker());

    navRow.appendChild(prevBtn);
    navRow.appendChild(title);
    navRow.appendChild(nextBtn);
    c.appendChild(navRow);

    // 3. САМ ГРАФИК
    const chartDiv = document.createElement('div');
    chartDiv.style.padding = '0 16px 16px 16px';
    chartDiv.appendChild(renderChart(true));
    c.appendChild(chartDiv);

    // 4. ОБРАБОТЧИКИ
    prevBtn.addEventListener('click', () => {
      // Если выбран режим "Месяц" (30 дней) - листаем на месяц назад
      if (CHART_PERIOD === 30) CHART_OFFSET_MONTHS--;
      else CHART_OFFSET_MONTHS--; // Для 7 дней тоже сдвигаем на месяц (так как в графике смотрятся 7 дней от текущего)
      CHART_SELECTED = null;
      renderActivityPage();
    });

    nextBtn.addEventListener('click', () => {
      if (CHART_PERIOD === 30) CHART_OFFSET_MONTHS++;
      else CHART_OFFSET_MONTHS++;
      CHART_SELECTED = null;
      renderActivityPage();
    });

    // Делегирование событий (для кнопок периодов и метрик)
    if (!c._delegated) {
        c._delegated = true;
        c.addEventListener('click', (e) => {
            const periodBtn = e.target.closest('.cal-btn[data-period]');
            if (periodBtn) {
                CHART_PERIOD = parseInt(periodBtn.dataset.period, 10);
                CHART_SELECTED = null;
                renderActivityPage();
                return;
            }
            const metricBtn = e.target.closest('.cal-btn[data-metric]');
            if (metricBtn) {
                CHART_METRIC = metricBtn.dataset.metric;
                CHART_SELECTED = null;
                renderActivityPage();
                return;
            }
            const bar = e.target.closest('.chart-bar');
            if (bar) {
                const wasSelected = bar.classList.contains('selected');
                CHART_SELECTED = wasSelected ? null : bar.dataset.date;
                renderActivityPage();
            }
        });
    }
}

function renderChart(hideFilters = false) {
  const container = document.createElement('div');
  container.className = 'chart-container';

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
    else if (CHART_METRIC === 'tasks') v = ss.tasks_done || 0;
    byDay[ss.date] = (byDay[ss.date] || 0) + v;
  }

  // 4. Строим график
  const maxVal = Math.max(1, ...days.map(d => byDay[d] || 0));
  let top = 60;
  if (maxVal > 60) top = Math.ceil(maxVal / 60) * 60;
  const step = top / 4;

  const chartBars = document.createElement('div');
  chartBars.className = 'chart-bars';

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
        ((isSel && lblText) ? '<div class="bar-label">' + lblText + '</div>' : '') +
      '</div>';
    barsWrap.appendChild(col);
  }
  chartBars.appendChild(barsWrap);
  container.appendChild(chartBars);

  // 5. Подписи дат
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
    if (isShort || dayNum === 1 || dayNum % 5 === 0) {
      const dow = dowNames[new Date(d + 'T00:00:00').getDay()];
      lbl.innerHTML = '<div class="lbl-date">' + dayNum + '</div><div class="lbl-dow">' + dow + '</div>';
    }
    labelsWrap.appendChild(lbl);
  }
  labelsRow.appendChild(labelsWrap);
  container.appendChild(labelsRow);

  // 6. Нижние кнопки (кнопки-таблетки)
  const metrics = [
    ['duration', 'Время'],
    ['events', 'Сообщения'],
    ['screens', 'Скрины'],
    ['tasks', 'Задачи']
  ];
    const metricHTML = metrics.map(([key, label]) =>
    '<button class="cal-btn' + (CHART_METRIC === key ? ' active' : '') + '" data-metric="' + key + '" style="flex: 1 1 0; min-width: 0; padding: 6px 2px !important; font-size: 12px !important; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">' + label + '</button>'
  ).join('');

  const metricBar = document.createElement('div');
  metricBar.style.cssText = 'display:flex; gap:8px; margin: 16px 0 0 0; overflow-x: auto; padding-bottom: 4px;';
  metricBar.innerHTML = metricHTML;
  container.appendChild(metricBar);

  return container;
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



// === АНАЛИТИКА ПРОЕКТА ===
function openAnalyticsSheet(projectId) {
  const proj = (window.DATA.projects || []).find(p => p.id === projectId);
  if (!proj) return;

  const sessions = (window.DATA.sessions || []).filter(s => s.project === projectId);
  const totalMin = sessions.reduce((acc, s) => acc + (s.duration_min || 0), 0);
  const totalEvents = sessions.reduce((acc, s) => acc + (s.events || 0), 0);
  const totalScreens = sessions.reduce((acc, s) => acc + (s.screens || 0), 0);
  const uniqueDays = new Set(sessions.map(s => s.date)).size;
  const avgPerDay = uniqueDays ? Math.round(totalMin / uniqueDays) : 0;

  // Создаем оверлей
  const overlay = document.createElement('div');
  overlay.className = 'goal-sheet-overlay';
  
  // Создаем саму шторку
  const sheet = document.createElement('div');
  sheet.className = 'goal-sheet';
  sheet.innerHTML = `
    <button class="goal-sheet-close" onclick="this.closest('.goal-sheet-overlay').remove()">✕</button>
    <h3 class="goal-sheet-title">Аналитика: ${proj.name}</h3>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px;">
      <div style="background: var(--bg3); padding: 12px; border-radius: 8px; text-align: center;">
        <div style="font-size: 12px; color: var(--fg-dim); margin-bottom: 4px;">Всего времени</div>
        <div style="font-size: 20px; font-weight: 600; color: var(--accent);">${fmtH(totalMin)}</div>
      </div>
      <div style="background: var(--bg3); padding: 12px; border-radius: 8px; text-align: center;">
        <div style="font-size: 12px; color: var(--fg-dim); margin-bottom: 4px;">Среднее/день</div>
        <div style="font-size: 20px; font-weight: 600; color: var(--fg);">${fmtH(avgPerDay)}</div>
      </div>
      <div style="background: var(--bg3); padding: 12px; border-radius: 8px; text-align: center;">
        <div style="font-size: 12px; color: var(--fg-dim); margin-bottom: 4px;">Сообщения</div>
        <div style="font-size: 20px; font-weight: 600; color: var(--green);">${totalEvents}</div>
      </div>
      <div style="background: var(--bg3); padding: 12px; border-radius: 8px; text-align: center;">
        <div style="font-size: 12px; color: var(--fg-dim); margin-bottom: 4px;">Скрины</div>
        <div style="font-size: 20px; font-weight: 600; color: var(--yellow);">${totalScreens}</div>
      </div>
    </div>
    <div style="text-align: center; color: var(--fg-dim); font-size: 13px;">
      Сессий: ${sessions.length} · Дней: ${uniqueDays}
    </div>
  `;
  
  overlay.appendChild(sheet);
  document.body.appendChild(overlay);

  // Закрытие по клику на фон
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
}


// === НОВАЯ ЛЕНТА ГРАФИКА (V2) ===
let CHART_STATE_V2 = { metric: 'duration', selectedDay: null, currentMonth: null, currentYear: null };

function renderActivityPageV2() {
    const c = document.getElementById('content-activity');
    if (!c || !window.DATA) return;
    c.innerHTML = '';

    // 1. НАВИГАЦИЯ
    const navRow = document.createElement('div');
    navRow.style.cssText = 'display:flex; justify-content:center; align-items:center; gap:16px; margin-bottom: 16px; font-size:20px; font-weight:600; color:var(--fg);';
    
    const monthSpan = document.createElement('span');
    monthSpan.id = 'chart-month-label';
    monthSpan.style.cssText = 'cursor:pointer;';
    const yearSpan = document.createElement('span');
    yearSpan.id = 'chart-year-label';
    yearSpan.style.cssText = 'cursor:pointer;';

    if (!CHART_STATE_V2.currentMonth) {
        const now = new Date();
        CHART_STATE_V2.currentMonth = now.getMonth();
        CHART_STATE_V2.currentYear = now.getFullYear();
    }

    const months = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
    monthSpan.textContent = months[CHART_STATE_V2.currentMonth];
    yearSpan.textContent = CHART_STATE_V2.currentYear;

    monthSpan.addEventListener('click', () => openMonthPicker());
    yearSpan.addEventListener('click', () => openYearPicker());

    navRow.appendChild(monthSpan);
    navRow.appendChild(yearSpan);
    c.appendChild(navRow);

    // 2. ГРАФИК (Ось Y + Лента)
    const chartWrapper = document.createElement('div');
    chartWrapper.style.cssText = 'display: flex; flex-direction: row; width: 100%; height: 260px; position: relative; box-sizing: border-box;';

    // Ось Y
    const yAxis = document.createElement('div');
    yAxis.id = 'tl-y-axis';
    yAxis.style.cssText = 'width: 40px; display: flex; flex-direction: column; justify-content: space-between; font-size: 10px; color: var(--fg-dim); text-align: right; padding-right: 8px; box-sizing: border-box; height: 100%; padding-bottom: 30px; padding-top: 0;';
    
    // Лента
    const scrollContainer = document.createElement('div');
    scrollContainer.className = 'tl-container';
    scrollContainer.id = 'tl-scroll';
    scrollContainer.style.flex = '1';
    scrollContainer.style.padding = '0';
    scrollContainer.style.margin = '0';
    scrollContainer.style.height = '100%';

    chartWrapper.appendChild(yAxis);
    chartWrapper.appendChild(scrollContainer);
    c.appendChild(chartWrapper);

    // 3. ЛЕГЕНДА (Фиксированная строка)
    const legendBar = document.createElement('div');
    legendBar.id = 'tl-legend-bar';
    legendBar.style.cssText = 'height: 24px; text-align: center; font-size: 14px; font-weight: 600; color: var(--accent); margin-top: 8px; margin-bottom: 8px;';
    c.appendChild(legendBar);

    // 4. НИЖНИЕ КНОПКИ
    const metrics = [['duration', 'Время'], ['events', 'Сообщения'], ['screens', 'Скрины'], ['tasks', 'Задачи']];
    const metricHTML = metrics.map(([key, label]) =>
        '<button class="cal-btn' + (CHART_STATE_V2.metric === key ? ' active' : '') + '" data-metric="' + key + '" style="flex:1; text-align:center; padding: 4px 2px; font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">' + label + '</button>'
    ).join('');

    const metricBar = document.createElement('div');
    metricBar.style.cssText = 'display:flex; gap:4px; margin: 0 8px 16px 8px; justify-content: space-between; box-sizing: border-box;';
    metricBar.innerHTML = metricHTML;
    c.appendChild(metricBar);

    // 5. ГЕНЕРАЦИЯ ЛЕНТЫ
    let firstSessionDate = new Date();
    if (window.DATA.sessions && window.DATA.sessions.length > 0) {
        const sorted = window.DATA.sessions.slice().sort((a, b) => a.date.localeCompare(b.date));
        firstSessionDate = new Date(sorted[0].date + 'T00:00:00');
    }
    const today = new Date();
    today.setHours(0,0,0,0);

    let iterDate = new Date(firstSessionDate);
    const allDates = [];

    while (iterDate <= today) {
        const dateStr = _localDate(iterDate);
        allDates.push(dateStr);

        const col = document.createElement('div');
        col.className = 'tl-col';
        col.dataset.date = dateStr;
        col.style.position = 'relative';
        col.style.outline = 'none'; // Убираем рамку фокуса при тапе

        const topSpace = document.createElement('div');
        topSpace.style.cssText = 'flex: 1; width: 100%; display: flex; flex-direction: column; justify-content: flex-end; align-items: center; position: relative;';

        const barDiv = document.createElement('div');
        barDiv.className = 'tl-bar';
        topSpace.appendChild(barDiv);

        const labelDiv = document.createElement('div');
        labelDiv.className = 'tl-label';
        const dayNum = iterDate.getDate();
        const dowNames = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
        labelDiv.innerHTML = `<div>${dayNum}</div><div style="font-size:9px;opacity:0.6;">${dowNames[iterDate.getDay()]}</div>`;

        col.appendChild(topSpace);
        col.appendChild(labelDiv);
        scrollContainer.appendChild(col);

        iterDate.setDate(iterDate.getDate() + 1);
    }

    // 6. ЛОГИКА ОБНОВЛЕНИЯ
    const updateChart = () => {
        const scrollLeft = scrollContainer.scrollLeft;
        const containerWidth = scrollContainer.clientWidth;
        const colWidth = 40;

        const startIndex = Math.floor(scrollLeft / colWidth);
        const endIndex = Math.min(allDates.length - 1, Math.ceil((scrollLeft + containerWidth) / colWidth));

        if (allDates[startIndex]) {
            const d = new Date(allDates[startIndex] + 'T00:00:00');
            monthSpan.textContent = months[d.getMonth()];
            yearSpan.textContent = d.getFullYear();
            CHART_STATE_V2.currentMonth = d.getMonth();
            CHART_STATE_V2.currentYear = d.getFullYear();
        }

        let maxVal = 0;
        for (let i = startIndex; i <= endIndex && i < allDates.length; i++) {
            const dateStr = allDates[i];
            let v = 0;
            for (const sess of window.DATA.sessions || []) {
                if (sess.date === dateStr) {
                    if (CHART_STATE_V2.metric === 'duration') v += sess.duration_min || 0;
                    else if (CHART_STATE_V2.metric === 'events') v += sess.events || 0;
                    else if (CHART_STATE_V2.metric === 'screens') v += sess.screens || 0;
                    else if (CHART_STATE_V2.metric === 'tasks') v += sess.tasks_done || 0;
                }
            }
            if (v > maxVal) maxVal = v;
        }
        if (maxVal === 0) maxVal = CHART_STATE_V2.metric === 'duration' ? 720 : 10;

        // Отрисовка Оси Y
        let yHTML = '';
        const step = maxVal / 4;
        for (let i = 4; i >= 0; i--) {
            const val = Math.round(step * i);
            const lbl = CHART_STATE_V2.metric === 'duration' ? (Math.floor(val / 60) + 'ч') : String(val);
            yHTML += '<div>' + lbl + '</div>';
        }
        yAxis.innerHTML = yHTML;

        // Отрисовка столбиков и легенды
        const cols = scrollContainer.querySelectorAll('.tl-col');
        cols.forEach(col => {
            const dateStr = col.dataset.date;
            let v = 0;
            for (const sess of window.DATA.sessions || []) {
                if (sess.date === dateStr) {
                    if (CHART_STATE_V2.metric === 'duration') v += sess.duration_min || 0;
                    else if (CHART_STATE_V2.metric === 'events') v += sess.events || 0;
                    else if (CHART_STATE_V2.metric === 'screens') v += sess.screens || 0;
                    else if (CHART_STATE_V2.metric === 'tasks') v += sess.tasks_done || 0;
                }
            }
            const h = v ? Math.max(2, Math.round(v / maxVal * 100)) : 0;
            col.querySelector('.tl-bar').style.height = h + '%';
            
            if (dateStr === CHART_STATE_V2.selectedDay) {
                col.querySelector('.tl-bar').classList.add('selected');
                
                // Записываем текст в фиксированную строку
                const text = CHART_STATE_V2.metric === 'duration' ? fmtH(v) : String(v);
                const d = new Date(dateStr + 'T00:00:00');
                const monthsShort = ['янв','фев','мар','апр','мая','июн','июл','авг','сен','окт','ноя','дек'];
                const dowNamesShort = ['вс','пн','вт','ср','чт','пт','сб'];
                const dateStrFormat = d.getDate() + ' ' + monthsShort[d.getMonth()] + ', ' + dowNamesShort[d.getDay()];
                
                legendBar.textContent = dateStrFormat + ' — ' + text;
            } else {
                col.querySelector('.tl-bar').classList.remove('selected');
            }
        });
    };

    // Слушаем скролл
    scrollContainer.addEventListener('scroll', () => {
        clearTimeout(scrollContainer._scrollTimeout);
        scrollContainer._scrollTimeout = setTimeout(() => {
            if (CHART_STATE_V2.selectedDay) {
                CHART_STATE_V2.selectedDay = null;
                legendBar.textContent = '';
            }
            updateChart();
        }, 100);
    });

    // Клик
    scrollContainer.addEventListener('click', (e) => {
        const col = e.target.closest('.tl-col');
        if (!col) return;
        
        const dateStr = col.dataset.date;

        if (CHART_STATE_V2.selectedDay === dateStr) {
            CHART_STATE_V2.selectedDay = null;
            legendBar.textContent = '';
            updateChart();
            return;
        }

        CHART_STATE_V2.selectedDay = dateStr;
        updateChart();
    });

    // Смена метрики
    c.querySelectorAll('.cal-btn[data-metric]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            CHART_STATE_V2.metric = btn.dataset.metric;
            CHART_STATE_V2.selectedDay = null;
            legendBar.textContent = '';
            
            const currentScroll = scrollContainer.scrollLeft;
            renderActivityPageV2();
            setTimeout(() => {
                const newScroll = document.getElementById('tl-scroll');
                if (newScroll) {
                    newScroll.scrollLeft = currentScroll;
                    updateChart();
                }
            }, 50);
        });
    });

    // Анимация входа
    setTimeout(() => {
        scrollContainer.scrollTo({ left: scrollContainer.scrollWidth, behavior: 'smooth' });
        setTimeout(() => { updateChart(); }, 600);
    }, 100);

    // Скрываем тултип при клике в любое пустое место
    const hideTooltip = (e) => {
        if (!e.target.closest('.tl-col')) {
            CHART_STATE_V2.selectedDay = null;
            legendBar.textContent = '';
            updateChart();
        }
    };
    c.removeEventListener('click', hideTooltip);
    c.addEventListener('click', hideTooltip);
}
// === ОБНОВЛЕННЫЙ DASHBOARD С АНИМАЦИЕЙ ===
function renderDashboard() {
  if (!window.DATA) return;
  const c = document.getElementById('content');
  if (!c) return;
  c.innerHTML = '';
  c.appendChild(renderHeroRings());

  // Принудительный сброс колец в 0 перед запуском анимации
  const circles = document.querySelectorAll('.ring-progress');
  circles.forEach(circle => {
    circle.style.transition = 'none'; // Отключаем плавность на мгновение
    circle.style.strokeDashoffset = circle.getAttribute('stroke-dasharray'); // Ставим в 0
  });

  // Запускаем анимацию через requestAnimationFrame
  requestAnimationFrame(() => {
    setTimeout(() => {
      circles.forEach(circle => {
        const targetOffset = circle.getAttribute('data-target-offset');
        if (targetOffset !== null) {
          circle.style.transition = 'stroke-dashoffset 1.5s cubic-bezier(0.2, 0.8, 0.2, 1)'; // Включаем плавность
          circle.style.strokeDashoffset = targetOffset; // Едем к цели
        }
      });
    }, 50); // Небольшая задержка
  });
}
