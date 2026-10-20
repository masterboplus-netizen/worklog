    }

    if (show) {
      if (isShort) {
        lbl.innerHTML = '<div class="lbl-date">' + dateStr + '</div>' +
                        '<div class="lbl-dow">' + dowStr + '</div>';
      } else {
        const _d = new Date(d + 'T00:00:00');
        const _dow = ['Вс','Пн','Вт','Ср','Чт','Пт','Сб'][_d.getDay()];
        lbl.innerHTML = '<div class="lbl-date">' + dateStr + '</div>' +
                        '<div class="lbl-dow">' + _dow + '</div>';
      }
    }
    labels.appendChild(lbl);
  }
  labelsRow.appendChild(labels);
  sec.appendChild(labelsRow);

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
  sec.appendChild(metricBar);

  const mText = sec.querySelector('#month-text');
  const yText = sec.querySelector('#year-text');
  if (mText) mText.addEventListener('click', () => { openMonthPicker(); });
  if (yText) yText.addEventListener('click', () => { openYearPicker(); });

  sec.querySelectorAll('.period-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      CHART_PERIOD = parseInt(btn.dataset.period, 10);
      CHART_SELECTED = null;
      renderDashboard();
    });
  });
  sec.querySelectorAll('.metric-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      CHART_METRIC = btn.dataset.metric;
      CHART_SELECTED = null;
      renderDashboard();
    });
  });
  sec.querySelectorAll('.chart-bar').forEach(bar => {
    bar.addEventListener('click', () => {
      const d = bar.dataset.date;
      CHART_SELECTED = (CHART_SELECTED === d) ? null : d;
      renderDashboard();
    });
  });

  return sec;
}

function renderSessions() {
  const sec = document.createElement('div');
  sec.className = 'section';
  sec.innerHTML = '<div class="section-title">Последние сессии</div>';

  const list = (DATA.sessions || []).slice().sort((a, b) =>
    (b.date + (b.start || '')).localeCompare(a.date + (a.start || ''))
  ).slice(0, 30);

  if (!list.length) {
    sec.innerHTML += '<div class="empty"><div class="empty-icon">📭</div>Нет сессий</div>';
    return sec;
  }

  const projName = {};
  for (const p of DATA.projects || []) projName[p.id] = p.name;

  const tbl = document.createElement('table');
  tbl.className = 'sessions-table';
  tbl.innerHTML =
    '<thead><tr><th>Дата</th><th>Проект</th><th>Длит.</th><th>Заметка</th></tr></thead>';
  const tbody = document.createElement('tbody');
  for (const s of list) {
    const tr = document.createElement('tr');
    tr.innerHTML =
      '<td>' + s.date.slice(8, 10) + '.' + s.date.slice(5, 7) + '</td>' +
      '<td>' + (projName[s.project] || s.project || '—') + '</td>' +
      '<td class="dur">' + fmtH(s.duration_min || 0) + '</td>' +
      '<td class="note" title="' + (s.note || '') + '">' + (s.note || '') + '</td>';
    tbody.appendChild(tr);
  }
  tbl.appendChild(tbody);
  sec.appendChild(tbl);
  return sec;
}

function renderFooter() {
  const f = document.createElement('div');
  f.className = 'footer';
  const upd = DATA.updated ? new Date(DATA.updated).toLocaleString('ru-RU') : '—';
  const scripts = document.querySelectorAll('script[src*="app.js"]');
  let ver = '1';
  for (const sc of scripts) {
    const mm = sc.src.match(/v=([0-9]+)/);
    if (mm) { ver = mm[1]; break; }
  }
  const verStr = ver.length > 1 ? ver.slice(0, -1) + '.' + ver.slice(-1) : ver;
  f.innerHTML =
    '<div class="footer-line">Хераборина v' + verStr + '</div>' +
    '<div class="footer-line footer-authors">Product of Andrey Sorokin · Design & idea Karina Merkulova</div>';
  // _upd сохранён для будущего (если надо показать время обновления)
  void upd;
  return f;
}
