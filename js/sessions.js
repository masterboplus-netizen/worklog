// МОДУЛЬ: СПИСОК СЕССИЙ

// МОДУЛЬ: ДНЕВНИК И КАЛЕНДАРЬ
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
    <button class="${CALENDAR_VIEW === 'month' ? 'active' : ''}" data-view="month">Месяц</button>
    <button class="${CALENDAR_VIEW === 'year' ? 'active' : ''}" data-view="year">Год</button>
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

  // 3. ЛЕНТА ДАТ (вместо сетки)
  const strip = document.createElement('div');
  strip.className = 'date-strip';
  const nowDate = new Date();
  const todayStrLocal = _localDate(nowDate);

  for (let i = 0; i < 7; i++) {
    const d = new Date(nowDate);
    d.setDate(nowDate.getDate() + i);
    const ds = _localDate(d);
    const isToday = ds === todayStrLocal;

    const item = document.createElement('div');
    item.className = 'date-strip-item' + (isToday ? ' today' : '') + (ds === CALENDAR_SELECTED_DAY ? ' selected' : '');
    item.innerHTML = `
      <div class="date-strip-day">${['Вс','Пн','Вт','Ср','Чт','Пт','Сб'][d.getDay()]}</div>
      <div class="date-strip-num">${d.getDate()}</div>
    `;
    item.addEventListener('click', () => {
      CALENDAR_SELECTED_DAY = ds;
      renderDiary();
    });
    strip.appendChild(item);
  }
  c.appendChild(strip);

  


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
} // Закрываем renderDiary


// === ЛЕНТА ДАТ (для вкладки Календарь) ===
function renderDateStrip() {
  const c = document.getElementById('content-diary');
  if (!c || !window.DATA) return;
  c.innerHTML = '';

  // 1. Заголовок
  const header = document.createElement('div');
  header.style.cssText = 'font-size: 20px; font-weight: 600; color: var(--fg); margin-bottom: 16px; padding: 0 4px;';
  header.textContent = 'Календарь';
  c.appendChild(header);

  // 2. Лента дат (7 дней, начиная с сегодня)
  const strip = document.createElement('div');
  strip.className = 'date-strip';

  const now = new Date();
  const todayStr = _localDate(now);

  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    const ds = _localDate(d);
    const isToday = ds === todayStr;

    const item = document.createElement('div');
    item.className = 'date-strip-item' + (isToday ? ' today' : '');
    item.innerHTML = `
      <div class="date-strip-day">${['Вс','Пн','Вт','Ср','Чт','Пт','Сб'][d.getDay()]}</div>
      <div class="date-strip-num">${d.getDate()}</div>
    `;
    item.addEventListener('click', () => {
      CALENDAR_SELECTED_DAY = ds;
      // Здесь можно обновлять список сессий под лентой
      // Пока просто вызываем renderDiary для обновления (опционально)
      // renderDiary(); // Пока не вызываем, чтобы не ломать
    });
    strip.appendChild(item);
  }
  c.appendChild(strip);

  // 3. Кнопка "Показать календарь" (открывает шторку)
  const openBtn = document.createElement('button');
  openBtn.textContent = 'Показать полный календарь';
  openBtn.style.cssText = 'width: 100%; padding: 12px; margin-top: 16px; background: var(--bg3); border: 1px solid var(--border); border-radius: 12px; color: var(--fg); font-size: 14px; cursor: pointer;';
  openBtn.addEventListener('click', () => {
    const sheet = document.getElementById('calendar-sheet');
    const sheetContent = document.getElementById('sheet-content');
    if (sheet && sheetContent) {
      // Рендерим полный календарь в шторку
      sheetContent.innerHTML = '';
      const tempDiv = document.createElement('div');
      tempDiv.id = 'content-diary';
      sheetContent.appendChild(tempDiv);
      // Временно подменяем ID, чтобы renderDiary отрисовал в шторке
      const originalContent = document.getElementById('content-diary');
      originalContent.id = 'content-diary-original';
      tempDiv.id = 'content-diary';
      renderDiary();
      originalContent.id = 'content-diary';
      tempDiv.id = 'content-diary-sheet';
      sheet.classList.add('open');
    }
  });
  c.appendChild(openBtn);

  // 4. Список сессий (упрощенный, только сегодня)
  const listHeader = document.createElement('div');
  listHeader.style.cssText = 'font-size: 14px; font-weight: 600; color: var(--fg-dim); margin: 24px 0 12px; text-transform: uppercase; letter-spacing: 0.5px;';
  listHeader.textContent = 'Сессии сегодня';
  c.appendChild(listHeader);

  const todaySessions = (window.DATA.sessions || []).filter(s => s.date === todayStr);
  if (todaySessions.length === 0) {
    c.innerHTML += '<div style="color: var(--fg-dim); font-size: 14px;">Нет сессий за сегодня</div>';
  } else {
    const projName = {};
    for (const p of window.DATA.projects || []) projName[p.id] = p.name;

    todaySessions.forEach(s => {
      const item = document.createElement('div');
      item.className = 'diary-item';
      item.style.cursor = 'pointer';
      item.style.background = 'rgba(255,255,255,0.03)';
      item.style.borderRadius = '12px';
      item.style.padding = '16px';
      item.style.marginBottom = '12px';
      item.style.border = '1px solid rgba(255,255,255,0.05)';

      item.innerHTML = `
        <div style="font-size:12px; color:var(--fg-dim); margin-bottom:4px;">${s.start || '?'} → ${s.end || '?'} · <span style="color:var(--accent); font-weight:600;">${fmtH(s.duration_min || 0)}</span></div>
        <div style="font-size:16px; color:var(--fg); font-weight:700; margin-bottom:8px;">${projName[s.project] || s.project || '–'}</div>
      `;
      c.appendChild(item);
    });
  }
}

// Закрытие шторки по клику на фон (если нужно)
document.addEventListener('click', (e) => {
  const sheet = document.getElementById('calendar-sheet');
  if (sheet && sheet.classList.contains('open') && !e.target.closest('#calendar-sheet')) {
    sheet.classList.remove('open');
  }
});

// === ПОЛНЫЙ КАЛЕНДАРЬ (для шторки) ===
function renderDiaryFull() {
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
    <button class="${CALENDAR_VIEW === 'month' ? 'active' : ''}" data-view="month">Месяц</button>
    <button class="${CALENDAR_VIEW === 'year' ? 'active' : ''}" data-view="year">Год</button>
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
  

  viewCapsule.querySelectorAll('button[data-view]').forEach(b => {
      b.addEventListener('click', () => {
          CALENDAR_VIEW = b.dataset.view;
          CALENDAR_OFFSET = 0;
          CALENDAR_SELECTED_DAY = null;
          renderDiaryFull();
      });
  });
  prevBtn.addEventListener('click', () => {
    if (CALENDAR_VIEW === '30days') CALENDAR_OFFSET -= 30; else CALENDAR_OFFSET--;
    CALENDAR_SELECTED_DAY = null; renderDiaryFull();
  });
  nextBtn.addEventListener('click', () => {
    if (CALENDAR_VIEW === '30days') CALENDAR_OFFSET += 30; else CALENDAR_OFFSET++;
    CALENDAR_SELECTED_DAY = null; renderDiaryFull();
  });
}

// === УПРАВЛЕНИЕ ШТОРКОЙ ===
document.addEventListener('DOMContentLoaded', () => {
  const sheet = document.getElementById('calendar-sheet');
  const toggle = document.getElementById('sheet-toggle');
  if (sheet && toggle) {
    toggle.addEventListener('click', () => {
      sheet.classList.toggle('open');
      if (sheet.classList.contains('open')) {
        const sheetContent = document.getElementById('sheet-content');
        if (sheetContent && !sheetContent.hasChildNodes()) {
          const tempDiv = document.createElement('div');
          tempDiv.id = 'content-diary';
          sheetContent.appendChild(tempDiv);
          if (typeof renderDiaryFull === 'function') renderDiaryFull();
        }
      }
    });
  }
});
