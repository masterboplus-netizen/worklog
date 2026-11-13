
// МОДУЛЬ: СПИСОК СЕССИЙ


// === ЛЕНТА ДАТ ПОД КАЛЕНДАРЁМ ===
function renderDateStrip() {
  const strip = document.getElementById('date-strip');
  if (!strip || !window.DATA) return;

  const savedScroll = CALENDAR_STRIP_SCROLL_LEFT;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = _localDate(today);

  const dates = (window.DATA.sessions || [])
    .map(s => s.date)
    .filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d) && d <= todayStr)
    .sort();

  let firstDate;
  if (dates.length) {
    const p = dates[0].split('-').map(Number);
    firstDate = new Date(p[0], p[1] - 1, p[2]);
  } else {
    firstDate = new Date(today);
    firstDate.setDate(firstDate.getDate() - 6);
  }

  const activeDays = new Set(dates);
  strip.innerHTML = '';

  for (let d = new Date(firstDate); d <= today; d.setDate(d.getDate() + 1)) {
    const date = new Date(d);
    const ds = _localDate(date);
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'date-strip-item';
    if (ds === todayStr) item.classList.add('today');
    if (CALENDAR_SELECTED_DAYS.has(ds)) item.classList.add('selected');

    const weekday = date.toLocaleDateString('ru-RU', { weekday: 'short' }).replace('.', '');
    item.innerHTML =
      `<span class="date-strip-day">${weekday}</span>` +
      `<span class="date-strip-num">${date.getDate()}</span>` +
      (activeDays.has(ds) ? '<span class="date-strip-dot"></span>' : '');

    item.addEventListener('click', () => {
      if (CALENDAR_SELECTED_DAYS.has(ds)) CALENDAR_SELECTED_DAYS.delete(ds);
      else CALENDAR_SELECTED_DAYS.add(ds);
      renderDiary();
      if (document.getElementById('calendar-sheet')?.classList.contains('open')) {
        renderDiaryFull();
      }
    });
    strip.appendChild(item);
  }

  strip.onscroll = () => {
    CALENDAR_STRIP_SCROLL_LEFT = strip.scrollLeft;
  };

  if (savedScroll === null) {
    strip.scrollLeft = strip.scrollWidth;
  } else {
    strip.scrollLeft = savedScroll;
  }
  CALENDAR_STRIP_SCROLL_LEFT = strip.scrollLeft;
}

// === СПИСОК (для вкладки) ===
function renderDiary() {
  const c = document.getElementById('content-diary');
  if (!c || !window.DATA) return;
  c.innerHTML = '';

  renderDateStrip();
  // 4. НИЖНЯЯ СТРОКА (Список + Сессии/24ч)
  const bottomRow = document.createElement('div');
  bottomRow.style.cssText = 'display:flex; justify-content:space-between; align-items:center; margin-top: 24px;';

  const listBtn = document.createElement('button');
  listBtn.className = 'segmented-control';
  listBtn.style.cssText = 'padding: 6px 12px; font-size: 12px; background: transparent; border: 1px solid var(--border); border-radius: 8px; color: var(--fg); cursor: pointer;';
  listBtn.innerHTML = 'Список';
  listBtn.onclick = () => { alert('Экран списка сессий в разработке'); };

  const modeCapsule = document.createElement('div');
  modeCapsule.className = 'segmented-control';
  modeCapsule.style.cssText = 'margin: 0; transform: scale(0.8); transform-origin: right center;';
  modeCapsule.innerHTML = `
    <button class="${DIARY_MODE === 'sessions' ? 'active' : ''}" data-mode="sessions">Сессии</button>
    <button class="${DIARY_MODE === '24h' ? 'active' : ''}" data-mode="24h">24ч</button>
  `;

  bottomRow.appendChild(listBtn);
  bottomRow.appendChild(modeCapsule);
  c.appendChild(bottomRow);

  // 5. СПИСОК
  const listDiv = document.createElement('div');
  listDiv.style.marginTop = '16px';
  let baseSessions = DIARY_MODE === 'sessions' ? mergeMidnightSessions(window.DATA.sessions || []) : (window.DATA.sessions || []);
  let filtered = baseSessions;
  if (CALENDAR_SELECTED_DAYS.size > 0) {
    filtered = filtered.filter(s => CALENDAR_SELECTED_DAYS.has(s.date));
  }

  filtered.sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    return (b.start || '').localeCompare(a.start || '');
  });

  const projName = {};
  for (const p of window.DATA.projects || []) projName[p.id] = p.name;

  if (filtered.length === 0) {
      listDiv.innerHTML = '<div class="empty" style="padding:20px 0;">Нет записей за выбранные даты</div>';
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
          if (s.events || s.screens || s.tasks_done || s.errors_count) {
              countersHTML = '<div class="diary-counters">';
              if (s.events)     countersHTML += `📨 ${s.events} `;
              if (s.screens)    countersHTML += `📸 ${s.screens} `;
              if (s.tasks_done) countersHTML += `✅ ${s.tasks_done} `;
              if (s.errors_count) countersHTML += `🐛 ${s.errors_count}`;
              countersHTML += '</div>';
          }

          const tagsHTML = s.tags && s.tags.length ? `<div style="margin-top:6px; display:flex; gap:4px; flex-wrap:wrap;">${s.tags.map(t => `<span style="background:rgba(255,255,255,0.1); padding:2px 6px; border-radius:4px; font-size:10px; color:var(--fg);">${t}</span>`).join('')}</div>` : '';

          // Формируем список задач (плоский)
          const uniqueTasks = {};
          if (s.linked_tasks) {
              s.linked_tasks.forEach(t => {
                  if (!uniqueTasks[t.task]) uniqueTasks[t.task] = [];
                  uniqueTasks[t.task].push(t);
              });
          }

          let tasksHTML = '';
          if (Object.keys(uniqueTasks).length > 0) {
              tasksHTML = '<div class="diary-tasks-list" style="margin-top: 12px; display: flex; flex-direction: column; gap: 6px;">';
              Object.entries(uniqueTasks).forEach(([taskName, taskDetails]) => {
                  tasksHTML += `<div style="font-size: 13px; color: var(--fg); font-weight: 500; display: flex; align-items: center; gap: 6px;">• ${taskName}</div>`;
              });
              tasksHTML += '</div>';
          }

          // Скрытая детализация (иерархия: Задача -> Фаза -> Эпик -> Подзадачи)
          let detailsHTML = '';
          if (Object.keys(uniqueTasks).length > 0) {
              detailsHTML = '<div class="diary-details" style="max-height: 0; overflow: hidden; transition: max-height 0.3s ease-in-out;">';
              detailsHTML += '<div style="margin-top: 12px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 12px;">';
              Object.entries(uniqueTasks).forEach(([taskName, taskDetails]) => {
                  const parentInfo = taskDetails[0];
                  detailsHTML += `<div style="margin-bottom: 12px;">`;
                  detailsHTML += `<div style="font-size: 14px; color: var(--fg); font-weight: 600; margin-bottom: 6px;">${taskName}</div>`;

                  detailsHTML += `<div style="font-size: 12px; color: var(--fg-dim); margin-left: 8px; border-left: 1px solid var(--fg-dim); padding-left: 8px;">`;
                  detailsHTML += `<div><b>Проект:</b> ${parentInfo.project}</div>`;
                  detailsHTML += `<div><b>Модуль:</b> ${parentInfo.module || '–'}</div>`;
                  detailsHTML += `<div><b>Эпик:</b> ${parentInfo.epic}</div>`;
                  detailsHTML += `<div style="margin-top: 4px;"><b>Подзадачи:</b></div>`;

                  taskDetails.forEach(t => {
                      detailsHTML += `<div style="font-size: 12px; color: var(--fg-dim); padding-left: 8px; margin-bottom: 2px;">- ${t.subtask} (${t.status})</div>`;
                  });
                  detailsHTML += `</div></div>`;
              });
              detailsHTML += '</div></div>';
          }

          const noteText = s.note || '';

          item.style.cursor = 'pointer';
          item.style.background = 'rgba(255,255,255,0.03)';
          item.style.borderRadius = '12px';
          item.style.padding = '16px';
          item.style.marginBottom = '12px';
          item.style.border = '1px solid rgba(255,255,255,0.05)';

          item.innerHTML = `
            <div style="font-size:12px; color:var(--fg-dim); margin-bottom:4px;">${s.start || '?'} → ${s.end || '?'} · <span style="color:var(--accent); font-weight:600;">${fmtH(s.duration_min || 0)}</span></div>
            <div style="font-size:16px; color:var(--fg); font-weight:700; margin-bottom:8px;">${projName[s.project] || s.project || '–'}</div>
            ${countersHTML}
            ${tagsHTML}
            ${tasksHTML}
            ${detailsHTML.replace('margin-top: 12px;', 'margin-top: 12px;').replace('<div style="margin-top: 12px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 12px;">', `<div style="margin-top: 12px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 12px;">${noteText ? `<div style="font-size: 13px; color: var(--fg-dim); margin-bottom: 12px;">${noteText}</div>` : ''}`)}
          `;

          item.addEventListener('click', () => {
              const details = item.querySelector('.diary-details');
              if (details) {
                  if (details.style.maxHeight === '0px' || details.style.maxHeight === '') {
                      details.style.maxHeight = details.scrollHeight + 'px';
                  } else {
                      details.style.maxHeight = '0px';
                  }
              }
          });

          listDiv.appendChild(item);
      });
  }

  c.appendChild(listDiv);

  modeCapsule.querySelectorAll('button[data-mode]').forEach(b => {
      b.addEventListener('click', () => {
          DIARY_MODE = b.dataset.mode;
          renderDiary();
      });
  });
} // Закрываем renderDiary


// === ПОЛНЫЙ КАЛЕНДАРЬ (для шторки) ===
function renderDiaryFull() {
  const c = document.getElementById('sheet-content');
  if (!c || !window.DATA) return;
  c.innerHTML = '';

  const months = ['Январь','Февраль','Март','Апрель','Май','Июнь',
    'Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];

  const year = CALENDAR_CURSOR.getFullYear();
  const month = CALENDAR_CURSOR.getMonth();
  const todayStr = _localDate(new Date());

  const viewCapsule = document.createElement('div');
  viewCapsule.className = 'segmented-control';
  viewCapsule.innerHTML = `
    <button class="${CALENDAR_VIEW === 'month' ? 'active' : ''}" data-view="month">Месяц</button>
    <button class="${CALENDAR_VIEW === 'year' ? 'active' : ''}" data-view="year">Год</button>
  `;
  c.appendChild(viewCapsule);

  const navRow = document.createElement('div');
  navRow.style.cssText =
    'display:flex;justify-content:center;align-items:center;gap:16px;margin:16px 0;font-size:20px;font-weight:600;color:var(--fg);';

  const prevBtn = document.createElement('button');
  prevBtn.textContent = '‹';
  prevBtn.style.cssText = 'background:transparent;border:0;color:var(--fg);font-size:28px;cursor:pointer;';

  const nextBtn = document.createElement('button');
  nextBtn.textContent = '›';
  nextBtn.style.cssText = 'background:transparent;border:0;color:var(--fg);font-size:28px;cursor:pointer;';

  const title = document.createElement('div');
  title.textContent = CALENDAR_VIEW === 'year'
    ? year + ' год'
    : months[month] + ' ' + year;

  navRow.append(prevBtn, title, nextBtn);
  c.appendChild(navRow);

  const dayStats = {};
  for (const s of window.DATA.sessions || []) {
    dayStats[s.date] = (dayStats[s.date] || 0) + (s.duration_min || 0);
  }

  const grid = document.createElement('div');
  grid.className = 'calendar-grid';

  if (CALENDAR_VIEW === 'year') {
    grid.className = 'year-month-grid';

    for (let m = 0; m < 12; m++) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'year-month-btn' + (m === month ? ' active' : '');

      const prefix = `${year}-${String(m + 1).padStart(2, '0')}-`;
      const hasEntries = Object.keys(dayStats).some(ds => ds.startsWith(prefix));

      btn.innerHTML = `<span>${months[m]}</span>${hasEntries ? '<i class="year-month-dot"></i>' : ''}`;

      btn.addEventListener('click', () => {
        CALENDAR_CURSOR = new Date(year, m, 1);
        CALENDAR_VIEW = 'month';
        renderDiaryFull();
      });

      grid.appendChild(btn);
    }
  } else {
    ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].forEach(day => {
      const el = document.createElement('div');
      el.className = 'cal-dow';
      el.textContent = day;
      grid.appendChild(el);
    });

    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0);
    const offset = start.getDay() === 0 ? 6 : start.getDay() - 1;

    for (let i = 0; i < offset; i++) {
      grid.appendChild(document.createElement('div'));
    }

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const ds = _localDate(d);
      const cell = document.createElement('div');
      cell.className = 'cal-day';

      if (ds === todayStr) cell.classList.add('today');
      if (CALENDAR_SELECTED_DAYS.has(ds)) cell.classList.add('selected');

      cell.innerHTML = `<div class="cal-num">${d.getDate()}</div>`;
      if (dayStats[ds]) cell.innerHTML += '<div class="cal-dot"></div>';

      cell.addEventListener('click', () => {
        if (CALENDAR_SELECTED_DAYS.has(ds)) CALENDAR_SELECTED_DAYS.delete(ds);
        else CALENDAR_SELECTED_DAYS.add(ds);
        renderDiary();
        renderDiaryFull();
      });
      grid.appendChild(cell);
    }
  }

  c.appendChild(grid);

  viewCapsule.querySelectorAll('button[data-view]').forEach(button => {
    button.addEventListener('click', () => {
      CALENDAR_VIEW = button.dataset.view;
      renderDiaryFull();
    });
  });

  prevBtn.addEventListener('click', () => {
    if (CALENDAR_VIEW === 'year') CALENDAR_CURSOR.setFullYear(CALENDAR_CURSOR.getFullYear() - 1);
    else CALENDAR_CURSOR.setMonth(CALENDAR_CURSOR.getMonth() - 1);
    renderDiaryFull();
  });

  nextBtn.addEventListener('click', () => {
    if (CALENDAR_VIEW === 'year') CALENDAR_CURSOR.setFullYear(CALENDAR_CURSOR.getFullYear() + 1);
    else CALENDAR_CURSOR.setMonth(CALENDAR_CURSOR.getMonth() + 1);
    renderDiaryFull();
  });
}

// === УПРАВЛЕНИЕ ШТОРКОЙ ===
document.addEventListener('DOMContentLoaded', () => {
  const sheet = document.getElementById('calendar-sheet');
  const toggle = document.getElementById('sheet-toggle');
  if (!sheet || !toggle) return;

  toggle.addEventListener('click', () => {
    const isOpen = sheet.classList.toggle('open');
    if (isOpen) renderDiaryFull();
  });
});
