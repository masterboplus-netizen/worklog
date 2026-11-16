// === МОДАЛЬНОЕ ОКНО КАЛЕНДАРЯ (с навигацией) ===
function renderCalendarModal() {
  const modal = document.getElementById('calendar-modal');
  if (!modal) return;
  modal.innerHTML = '';

  const header = document.createElement('div');
  header.className = 'modal-header';
  header.innerHTML = '<div class="modal-title">Выберите дату</div><button class="modal-close" onclick="document.getElementById(\'calendar-modal\').classList.add(\'hidden\')">✕</button>';
  modal.appendChild(header);

  const viewCapsule = document.createElement('div');
  viewCapsule.className = 'segmented-control';
  viewCapsule.innerHTML = '<button class="' + (CALENDAR_VIEW === 'month' ? 'active' : '') + '" data-view="month">Месяц</button><button class="' + (CALENDAR_VIEW === 'year' ? 'active' : '') + '" data-view="year">Год</button>';
  modal.appendChild(viewCapsule);

  const navRow = document.createElement('div');
  navRow.style.cssText = 'display:flex;justify-content:center;align-items:center;gap:16px;margin:16px 0;font-size:18px;font-weight:600;color:var(--fg);';

  const prevBtn = document.createElement('button');
  prevBtn.textContent = '‹';
  prevBtn.style.cssText = 'background:transparent;border:0;color:var(--fg);font-size:28px;cursor:pointer;';

  const nextBtn = document.createElement('button');
  nextBtn.textContent = '›';
  nextBtn.style.cssText = 'background:transparent;border:0;color:var(--fg);font-size:28px;cursor:pointer;';

  const title = document.createElement('div');
  const months = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
  const year = CALENDAR_CURSOR.getFullYear();
  const month = CALENDAR_CURSOR.getMonth();
  title.textContent = CALENDAR_VIEW === 'year' ? year + ' год' : months[month] + ' ' + year;

  navRow.append(prevBtn, title, nextBtn);
  modal.appendChild(navRow);

  const grid = document.createElement('div');
  grid.className = 'calendar-grid';
  modal.appendChild(grid);

  const today = new Date();
  const todayStr = _localDate(today);
  const dayStats = {};
  for (const s of window.DATA?.sessions || []) {
    dayStats[s.date] = (dayStats[s.date] || 0) + (s.duration_min || 0);
  }

  if (CALENDAR_VIEW === 'year') {
    grid.className = 'year-month-grid';
    for (let m = 0; m < 12; m++) {
      const btn = document.createElement('button');
      btn.className = 'year-month-btn' + (m === month ? ' active' : '');
      const prefix = year + '-' + String(m + 1).padStart(2, '0') + '-';
      const hasEntries = Object.keys(dayStats).some(ds => ds.startsWith(prefix));
      btn.innerHTML = '<span>' + months[m] + '</span>' + (hasEntries ? '<i class="year-month-dot"></i>' : '');
      btn.addEventListener('click', () => {
        CALENDAR_CURSOR = new Date(year, m, 1);
        CALENDAR_VIEW = 'month';
        renderCalendarModal();
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

    for (let i = 0; i < offset; i++) grid.appendChild(document.createElement('div'));

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const ds = _localDate(d);
      const cell = document.createElement('div');
      cell.className = 'cal-day';
      if (ds === todayStr) cell.classList.add('today');
      if (CALENDAR_SELECTED_DAYS.has(ds)) cell.classList.add('selected');
      cell.innerHTML = '<div class="cal-num">' + d.getDate() + '</div>';
      if (dayStats[ds]) cell.innerHTML += '<div class="cal-dot"></div>';
      cell.addEventListener('click', () => {
        if (CALENDAR_SELECTED_DAYS.has(ds)) CALENDAR_SELECTED_DAYS.delete(ds);
        else CALENDAR_SELECTED_DAYS.add(ds);
        renderDiary();
        renderCalendarModal();
      });
      grid.appendChild(cell);
    }
  }

  viewCapsule.querySelectorAll('button[data-view]').forEach(btn => {
    btn.addEventListener('click', () => {
      CALENDAR_VIEW = btn.dataset.view;
      renderCalendarModal();
    });
  });

  prevBtn.addEventListener('click', () => {
    if (CALENDAR_VIEW === 'year') CALENDAR_CURSOR.setFullYear(CALENDAR_CURSOR.getFullYear() - 1);
    else CALENDAR_CURSOR.setMonth(CALENDAR_CURSOR.getMonth() - 1);
    renderCalendarModal();
  });

  nextBtn.addEventListener('click', () => {
    if (CALENDAR_VIEW === 'year') CALENDAR_CURSOR.setFullYear(CALENDAR_CURSOR.getFullYear() + 1);
    else CALENDAR_CURSOR.setMonth(CALENDAR_CURSOR.getMonth() + 1);
    renderCalendarModal();
  });

  modal.classList.remove('hidden');
}
