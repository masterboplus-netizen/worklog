// МОДУЛЬ: ДНЕВНИК И КАЛЕНДАРЬ
function mergeMidnightSessions(sessions) {
  if (!sessions || !sessions.length) return [];

  // 1. Подготовка (считаем миллисекунды, учитываем ночь)
  const prepared = sessions.map(s => {
    let startMs = new Date(s.date + 'T' + s.start + ':00').getTime();
    let endMs = new Date(s.date + 'T' + s.end + ':00').getTime();
    if (endMs < startMs) endMs += 24 * 60 * 60 * 1000; 
    return { ...s, startMs, endMs };
  }).sort((a, b) => a.startMs - b.startMs);

  const merged = [];
  let currentGroup = [];

  // 2. Склейка по 15 минутам
  for (let i = 0; i < prepared.length; i++) {
    const s = prepared[i];
    
    if (currentGroup.length === 0) {
      currentGroup.push(s);
      continue;
    }

    let maxEndMs = -Infinity;
    for (const gs of currentGroup) {
        if (gs.endMs > maxEndMs) maxEndMs = gs.endMs;
    }

    const gapMs = s.startMs - maxEndMs;

    if (gapMs < 15 * 60 * 1000) {
      currentGroup.push(s);
    } else {
      merged.push(processGroup(currentGroup));
      currentGroup = [s];
    }
  }

  if (currentGroup.length > 0) {
    merged.push(processGroup(currentGroup));
  }

  return merged.sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    // Сортируем по времени окончания (по убыванию)
    let endA = a.end; let endB = b.end;
    // Если конец "меньше" начала (ночная), считаем его позже
    if (endA < a.start) endA = '24' + endA;
    if (endB < b.start) endB = '24' + endB;
    return endB.localeCompare(endA);
  });

  // 3. Обработка группы
  function processGroup(group) {
    const firstSess = group[0]; 
    const date = firstSess.date; // Привязка к дате первой сессии
    
    let minStartStr = firstSess.start;
    let maxEndMs = -Infinity;
    let displayEndStr = firstSess.end;
    
    let totalEvents = 0, totalScreens = 0, totalTasks = 0;
    let notes = [];
    const projects = new Set();

    const intervals = group.map(s => ({ start: s.startMs, end: s.endMs }))
                            .sort((a, b) => a.start - b.start);

    let realDurationMs = 0;
    if (intervals.length > 0) {
        let curStart = intervals[0].start;
        let curEnd = intervals[0].end;
        for (let i = 1; i < intervals.length; i++) {
            if (intervals[i].start <= curEnd) {
                curEnd = Math.max(curEnd, intervals[i].end);
            } else {
                realDurationMs += (curEnd - curStart);
                curStart = intervals[i].start;
                curEnd = intervals[i].end;
            }
        }
        realDurationMs += (curEnd - curStart);
    }

    for (const s of group) {
      if (s.startMs < new Date(date + 'T' + minStartStr + ':00').getTime()) {
        minStartStr = s.start;
      }
      
      if (s.endMs > maxEndMs) {
          maxEndMs = s.endMs;
          displayEndStr = s.end;
      }

      totalEvents += s.events || 0;
      totalScreens += s.screens || 0;
      totalTasks += s.tasks_done || 0;
      if (s.note) notes.push(s.note);
      if (s.project) projects.add(s.project);
    }

    return {
      id: 'merged_' + firstSess.id,
      date: date,
      start: minStartStr,
      end: displayEndStr,
      duration_min: Math.round(realDurationMs / 60000),
      project: Array.from(projects)[0] || '–',
      note: notes.join(' '),
      events: totalEvents,
      screens: totalScreens,
      tasks_done: totalTasks
    };
  }
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

          let countersHTML = '';
          if (s.events || s.screens || s.tasks_done) {
              countersHTML = '<div class="diary-counters">';
              if (s.events)     countersHTML += `📨 ${s.events} `;
              if (s.screens)    countersHTML += `📸 ${s.screens} `;
              if (s.tasks_done) countersHTML += `✅ ${s.tasks_done}`;
              countersHTML += '</div>';
          }

          item.innerHTML = `
            <div class="diary-time">${s.start || '?'} → ${s.end || '?'} · <span class="diary-dur">${fmtH(s.duration_min || 0)}</span></div>
            ${countersHTML}
            <div class="diary-proj">${projName[s.project] || s.project || '–'}</div>
            <div class="diary-note">${s.note || ''}</div>
          `;
          listDiv.appendChild(item);
      });
  }

  c.appendChild(listDiv);

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

