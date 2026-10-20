    ['📨 Сообщений', String(t.msgs),    false],
    ['📸 Скринов',   String(t.screens), false],
  ];
  div.innerHTML = items.map(([l, v, acc]) =>
    '<div class="metric"><div class="metric-label">' + l + '</div>' +
    '<div class="metric-value' + (acc ? ' accent' : '') + '">' + v + '</div></div>'
  ).join('');
  return div;
}

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

  // По месяцам
  const byMonth = {};
  for (const s of sessions) {
    const m = s.date.slice(0, 7);  // YYYY-MM
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

  // Топ-3 дня
  const byDay = {};
  for (const s of sessions) byDay[s.date] = (byDay[s.date] || 0) + (s.duration_min || 0);
  const topDays = Object.entries(byDay).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const topDaysHTML = topDays.map(([d, v], i) =>
    '<div class="an-top-row"><span class="an-top-rank">' + (i + 1) + '.</span> ' +
    d.slice(8, 10) + '.' + d.slice(5, 7) + ' — <b>' + fmtH(v) + '</b></div>'
  ).join('') || '<div class="an-top-row">Пока нет данных</div>';

  // Тренд: эта неделя vs прошлая
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
      // Блок 1: средние
      '<div class="an-block an-stats">' +
        '<div class="an-stat"><div class="an-stat-label">Среднее/день</div><div class="an-stat-val">' + fmtH(avgDay) + '</div></div>' +
        '<div class="an-stat"><div class="an-stat-label">Всего</div><div class="an-stat-val">' + fmtH(realMin) + '</div></div>' +
        '<div class="an-stat"><div class="an-stat-label">Сессий</div><div class="an-stat-val">' + sessions.length + '</div></div>' +
      '</div>' +
      // Блок 2: счётчики
      '<div class="an-block an-stats">' +
        '<div class="an-stat"><div class="an-stat-label">Сообщений</div><div class="an-stat-val">' + realEv + '</div></div>' +
        '<div class="an-stat"><div class="an-stat-label">Скринов</div><div class="an-stat-val">' + realScr + '</div></div>' +
        '<div class="an-stat"><div class="an-stat-label">Дней</div><div class="an-stat-val">' + uniqueDays + '</div></div>' +
      '</div>' +
      // Блок 3: по месяцам
      '<div class="an-section-title">📅 По месяцам</div>' +
      '<div class="an-block">' + (monthBars || '<div class="an-top-row">Нет данных</div>') + '</div>' +
      // Блок 4: топ-3
      '<div class="an-section-title">🏆 Топ-3 дня</div>' +
      '<div class="an-block">' + topDaysHTML + '</div>' +
      // Блок 5: тренд
      '<div class="an-section-title">📈 Тренд (7 дней)</div>' +
      '<div class="an-block an-trend ' + trendClass + '">' + trendStr + '</div>' +
    '</div>';
  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  overlay.querySelector('.goal-sheet-close').addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
}

function renderProjects() {
  const sec = document.createElement('div');
  sec.className = 'section';
  sec.innerHTML = '<div class="section-title">Проекты</div>';

  const byProj = {};
  for (const s of DATA.sessions || []) {
    byProj[s.project] = (byProj[s.project] || 0) + (s.duration_min || 0);
  }

  // Прибавляем baseline (общая история до 15.10) к проекту bo81
  const base = DATA.baseline || {};
  if (base.minutes && base.project) {
    byProj[base.project] = (byProj[base.project] || 0) + base.minutes;
  } else if (base.minutes) {
    // По умолчанию — к первому проекту (bo81)
    const firstId = (DATA.projects || [])[0]?.id;
    if (firstId) byProj[firstId] = (byProj[firstId] || 0) + base.minutes;
  }

  for (const p of DATA.projects || []) {
    const hrs = byProj[p.id] || 0;

    // Прогресс по фазам
    let totalItems = 0, doneItems = 0;
    for (const ph of p.plan || []) {
      const items = ph.items || [];
      totalItems += items.length;
      doneItems += items.filter(it => typeof it === 'object' && it.done).length;
    }
    const pct = totalItems ? Math.round(doneItems / totalItems * 100) : 0;

    const card = document.createElement('div');
    card.className = 'project-card';
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

    // Фазы
    const phasesDiv = document.createElement('div');
    phasesDiv.className = 'phases';
    for (const ph of p.plan || []) {
      const items = ph.items || [];
      const total = items.length;
      const done = items.filter(it => typeof it === 'object' && it.done).length;
      const phPct = total ? Math.round(done / total * 100) : 0;
      const statusIcon = phPct === 100 ? '\u2705' : (phPct > 0 ? '\u{1F7E1}' : '\u{1F4CB}');

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

      // Список пунктов
      const itemsList = document.createElement('div');
      itemsList.className = 'phase-items hidden';
      for (const it of items) {
        if (typeof it === 'object') {
          const line = document.createElement('div');
          line.className = 'phase-item' + (it.done ? ' done' : '');
          line.textContent = (it.done ? '\u2705 ' : '\u23F3 ') + it.text;
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
    // Фазы — скрыты по умолчанию
    phasesDiv.classList.add('hidden');
    card.appendChild(phasesDiv);

    // Клик на шапку карточки (.project-head) — раскрыть/свернуть фазы
      // Тап на шапку убран (раскрытие — через кнопку «Открыть»)
      // Две кнопки: Открыть + Аналитика (готовый HTML)
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
        const isHidden = phasesDiv.classList.contains('hidden');
        openBtn.querySelector('path').setAttribute('d', isHidden ? 'M6 9l6 6 6-6' : 'M6 15l6-6 6 6');
        openBtn.querySelector('span').textContent = isHidden ? 'Открыть' : 'Свернуть';
      });

      anBtn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        openAnalyticsSheet(p.id);
      });

      card.insertBefore(actionsDiv, phasesDiv);
      sec.appendChild(card);
  }

  return sec;
}

function _localDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + dd;
}

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
      const targetY = now.getFullYear();
      const targetM = now.getMonth();
      CHART_OFFSET_MONTHS = (targetY * 12 + m) - (targetY * 12 + targetM);
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

