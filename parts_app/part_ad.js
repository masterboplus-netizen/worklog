  overlay.querySelector('.goal-sheet-close').addEventListener('click', close);
  overlay.querySelector('.goal-cancel').addEventListener('click', close);
  overlay.querySelector('.goal-save').addEventListener('click', save);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
}

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
      renderDashboard();
    }
    close();
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

function openMonthSheet() {
  const old = document.getElementById('month-sheet-overlay');
  if (old) old.remove();
  const now = new Date();
  const curM = now.getMonth();
  const curY = now.getFullYear();
  const months = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
  const years = [];
  for (let y = curY - 2; y <= curY + 2; y++) years.push(y);

  const overlay = document.createElement('div');
  overlay.id = 'month-sheet-overlay';
  overlay.className = 'goal-sheet-overlay';
  overlay.innerHTML =
    '<div class="goal-sheet" style="max-height: 80vh; overflow-y: auto;">' +
      '<button class="goal-sheet-close">✕</button>' +
      '<h2 class="goal-sheet-title">Выберите месяц</h2>' +
      '<div class="month-picker">' +
        months.map((m, i) => '<button class="month-pick-item' + (i === curM + CHART_OFFSET_MONTHS ? ' active' : '') + '" data-m="' + i + '">' + m + '</button>').join('') +
      '</div>' +
      '<h2 class="goal-sheet-title" style="margin-top:16px;">Год</h2>' +
      '<div class="month-picker">' +
        years.map(y => '<button class="month-pick-item' + (y === curY ? ' active' : '') + '" data-y="' + y + '">' + y + '</button>').join('') +
      '</div>' +
    '</div>';
  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  overlay.querySelector('.goal-sheet-close').addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

  overlay.querySelectorAll('.month-pick-item[data-m]').forEach(b => {
    b.addEventListener('click', () => {
      // delta = выбранный месяц - текущий
      const m = parseInt(b.dataset.m, 10);
      CHART_OFFSET_MONTHS = m - curM;
      close();
      renderDashboard();
    });
  });
  overlay.querySelectorAll('.month-pick-item[data-y]').forEach(b => {
    b.addEventListener('click', () => {
      // год — игнорируем (пока)
      close();
    });
  });
}

function renderChart() {
  const sec = document.createElement('div');
  sec.className = 'section';

  const periods = [[1, 'День'], [7, 'Неделя'], [30, 'Месяц']];
  const filterHTML = periods.map(([n, label]) =>
    '<button class="period-btn' + (CHART_PERIOD === n ? ' active' : '') + '" data-period="' + n + '">' + label + '</button>'
  ).join('');
  const _mBtn = '<span class="month-year-wrap">' +
    '<span class="month-text" id="month-text">' + (function(){const d=new Date();d.setMonth(d.getMonth()+CHART_OFFSET_MONTHS);const m=['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];return m[d.getMonth()];})() + '</span>' +
    ' <span class="year-text" id="year-text">' + (function(){const d=new Date();d.setMonth(d.getMonth()+CHART_OFFSET_MONTHS);return d.getFullYear();})() + '</span>' +
    '</span>';
  sec.innerHTML = '<div class="section-title">Активность' + _mBtn + '</div>' +
    '<div class="period-filter-row">' + filterHTML + '</div>';

  const days = [];
  const now = new Date();
  now.setMonth(now.getMonth() + CHART_OFFSET_MONTHS);

  if (CHART_PERIOD === 30) {
    // МЕСЯЦ: календарный месяц (с 1-го числа по последний день)
    const year = now.getFullYear();
    const month = now.getMonth();  // 0-11
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);  // последний день месяца
    const totalDaysInMonth = lastDay.getDate();
    for (let i = 0; i < totalDaysInMonth; i++) {
      const d = new Date(year, month, i + 1);
      days.push(_localDate(d));
    }
  } else {
    // ДЕНЬ / НЕДЕЛЯ: последние N дней (как раньше)
    const totalDays = CHART_PERIOD === 1 ? 1 : CHART_PERIOD;
    for (let i = totalDays - 1; i >= 0; i--) {
      const d = new Date(now - i * 86400000);
      days.push(_localDate(d));
    }
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
      // Вычисляем среднее время за день
        let totalMin = 0;
        let daysWithSessions = 0;
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        if (window.DATA && window.DATA.sessions) {
            const recent = window.DATA.sessions.filter(s => new Date(s.date) >= thirtyDaysAgo);
            totalMin = recent.reduce((sum, s) => sum + s.duration_min, 0);
            daysWithSessions = new Set(recent.map(s => s.date)).size;
        }
        const avgMin = daysWithSessions > 0 ? Math.round(totalMin / daysWithSessions) : 720;
        candidates = [avgMin]; // В списке теперь только среднее время
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
    const label = CHART_METRIC === 'duration' ? (Math.floor(val / 60) + 'ч') : String(val);
    yAxisHTML += '<div class="chart-grid-line"><span class="chart-grid-label">' + label + '</span></div>';
  }

  const chart = document.createElement('div');
  chart.className = 'chart-bars';
  chart.style.position = 'relative';
  chart.style.paddingTop = '32px';
  chart.innerHTML = '<div class="chart-y-axis">' + yAxisHTML + '</div>';

  const barsWrap = document.createElement('div');
  barsWrap.className = 'chart-bars-wrap';

  for (const d of days) {
    const val = byDay[d] || 0;
    const h = val ? Math.max(2, Math.round(val / top * 100)) : 0;
    const col = document.createElement('div');
    col.className = 'chart-col';
    const isSel = CHART_SELECTED === d;
    const _label = val ? (CHART_METRIC === 'duration' ? (Math.floor(val/60) + 'ч ' + (val%60) + 'м') : String(val)) : '';
    col.innerHTML =
      '<div class="chart-bar' + (val ? '' : ' empty') + (isSel ? ' selected' : '') + '"' +
      ' data-date="' + d + '"' +
      ' style="height:' + h + '%">' +
      (_label ? '<span class="bar-label">' + _label + '</span>' : '') +
      '</div>';
    barsWrap.appendChild(col);
  }
  if (!barsWrap._delegated) {
    barsWrap._delegated = true;
    barsWrap.addEventListener('click', (ev) => {
      const bar = ev.target.closest && ev.target.closest('.chart-bar');
      if (!bar) return;
      const all = barsWrap.querySelectorAll('.chart-bar-label-abs');
      all.forEach(el => el.remove());
      const d = bar.dataset.date;
      const val = byDay[d] || 0;
      if (!val) return;
      const lbl = CHART_METRIC === 'duration'
        ? (Math.floor(val/60) + 'ч ' + (val%60) + 'м')
        : String(val);
      const col = bar.parentElement;
      const absLbl = document.createElement('div');
      absLbl.className = 'chart-bar-label-abs';
      absLbl.textContent = lbl;
      absLbl.style.left = (col.offsetLeft + col.offsetWidth / 2) + 'px';
      absLbl.style.top = '4px';
      chart.appendChild(absLbl);
    });
  }

  barsWrap.addEventListener('click', (ev) => {
    const bar = ev.target.closest && ev.target.closest('.chart-bar');
    if (!bar) return;
    const wasSelected = bar.classList.contains('selected');
    barsWrap.querySelectorAll('.chart-bar.selected').forEach(b => b.classList.remove('selected'));
    if (!wasSelected) bar.classList.add('selected');
  });

  chart.appendChild(barsWrap);
  sec.appendChild(chart);

  // --- Подписи дат (в отдельной строке, синхронизированы с barsWrap) ---
  const labelsRow = document.createElement('div');
  labelsRow.className = 'chart-labels-row';
  labelsRow.innerHTML = '<div class="chart-spacer"></div>';

  const labels = document.createElement('div');
  labels.className = 'chart-labels';

  // Логика подписей:
  // - День/Неделя (≤ 14 дней): дата + день недели
  // - Месяц (> 14 дней): каждая 5-я дата
  const isShort = days.length <= 14;
  const dowNames = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

  for (let i = 0; i < days.length; i++) {
    const d = days[i];
    const lbl = document.createElement('div');
    lbl.className = 'chart-label';

    const dayNum = parseInt(d.slice(8, 10), 10);
    const monthNum = d.slice(5, 7);

    let show = false;
    let dateStr = '';
    let dowStr = '';

    if (isShort) {
      show = true;
      dateStr = String(dayNum);
      const dt = new Date(d + 'T00:00:00');
      dowStr = dowNames[dt.getDay()];
    } else {
      // Месяц: каждая 5-я дата (1, 5, 10, 15, ...)
      show = (dayNum === 1 || dayNum % 5 === 0);
      dateStr = String(dayNum);
