// МОДУЛЬ: УТИЛИТЫ
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



// === АНИМАЦИЯ КОЛЕЦ ===
/* Функция перенесена в dashboard.js */
function _old_animateRings() {
  setTimeout(() => {
    document.querySelectorAll('.ring-progress').forEach(ring => {
      const targetOffset = ring.getAttribute('data-target-offset');
      if (targetOffset !== null) {
        ring.style.transition = 'stroke-dashoffset 1s ease-out';
        ring.style.strokeDashoffset = targetOffset;
      }
    });
  }, 50); // Небольшая задержка, чтобы DOM успел отрисоваться
}


  animateRings();



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