if (typeof window.ACTIVITY_MODE === 'undefined') {
  window.ACTIVITY_MODE = 'raw';
}
if (typeof window.ACTIVITY_TAG_FILTER === 'undefined') {
  window.ACTIVITY_TAG_FILTER = [];
}

window.openActivityModeSheet = function() {
  const old = document.getElementById('activity-mode-popover');
  if (old) { old.remove(); return; }

  const modes = [
    { id: 'raw', label: 'Сырые сессии' },
    { id: 'sessions', label: 'Сессии' },
    { id: 'total_06', label: 'Итого (с 06:00)' },
    { id: 'sessions_24', label: 'Смены (24ч)' },
    { id: 'total_24', label: 'Итого (с 00:00)' }
  ];

  const btn = document.getElementById('btn-modes');
  if (!btn) return;

  const popover = document.createElement('div');
  popover.id = 'activity-mode-popover';
  popover.style.cssText = `
    position: fixed; background: var(--bg2); border: 1px solid var(--border);
    border-radius: 12px; padding: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.5);
    z-index: 1000; display: flex; flex-direction: column; gap: 4px; min-width: 200px;
    animation: fadeIn 0.2s ease;
  `;

  const rect = btn.getBoundingClientRect();
  popover.style.bottom = (window.innerHeight - rect.top + 8) + 'px';
  popover.style.right = (window.innerWidth - rect.right) + 'px';

  if (!document.getElementById('popover-style')) {
    const style = document.createElement('style');
    style.id = 'popover-style';
    style.textContent = '@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }';
    document.head.appendChild(style);
  }

  modes.forEach(m => {
    const isActive = window.ACTIVITY_MODE === m.id;
    const btnMode = document.createElement('button');
    btnMode.className = 'mode-select-btn';
    btnMode.dataset.mode = m.id;
    btnMode.textContent = m.label;
    btnMode.style.cssText = `
      background: ${isActive ? 'var(--accent)' : 'transparent'};
      color: ${isActive ? '#fff' : 'var(--fg)'};
      border: none; padding: 10px 12px; border-radius: 8px;
      text-align: left; font-size: 14px; cursor: pointer; transition: 0.2s;
    `;

    btnMode.addEventListener('click', () => {
      window.ACTIVITY_MODE = m.id;
      const modeNames = { 'raw': 'Сырые сессии', 'sessions': 'Сессии', 'total_06': 'Итого 06', 'sessions_24': 'Смены 24ч', 'total_24': 'Итого 24ч' };
      const label = document.getElementById('btn-modes-label');
      if (label) label.textContent = modeNames[m.id] || 'Режим';
      
      popover.remove();
      if (typeof renderActivity === 'function') renderActivity();
    });
    popover.appendChild(btnMode);
  });

  document.body.appendChild(popover);

  const closePopover = (e) => {
    if (!popover.contains(e.target) && e.target !== btn && !btn.contains(e.target)) {
      popover.remove();
      document.removeEventListener('click', closePopover);
    }
  };
  setTimeout(() => document.addEventListener('click', closePopover), 10);
};


window.openTagFilterSheet = function() {
  const old = document.getElementById('tag-filter-overlay');
  if (old) { old.remove(); return; }

  const tags = window.DATA && window.DATA.tags ? window.DATA.tags : [];
  if (!tags.length) { alert('Тегов пока нет'); return; }

  const overlay = document.createElement('div');
  overlay.id = 'tag-filter-overlay';
  overlay.className = 'tag-sheet-overlay';

  let listHTML = '<div class="tag-sheet-list">';
  tags.forEach(t => {
    const isActive = window.ACTIVITY_TAG_FILTER.includes(t.name);
    listHTML += `
      <label class="tag-sheet-item">
        <input type="checkbox" value="${t.name}" ${isActive ? 'checked' : ''}>
        <span style="width:12px;height:12px;border-radius:50%;background:${t.color||'#7c8cff'};display:inline-block;margin-right:8px;"></span>
        ${t.name}
      </label>
    `;
  });
  listHTML += '</div>';

  overlay.innerHTML = `
    <div class="tag-sheet">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
        <div style="font-size:18px;font-weight:600;color:var(--fg);">Фильтр по тегам</div>
        <button id="tag-filter-close" style="background:transparent;border:0;color:var(--fg-dim);font-size:20px;">✕</button>
      </div>
      ${listHTML}
      <div class="tag-sheet-footer">
        <button id="tag-filter-reset" style="flex:1;padding:12px;border-radius:8px;border:1px solid var(--border);background:transparent;color:var(--fg);cursor:pointer;">Сбросить</button>
        <button id="tag-filter-apply" style="flex:1;padding:12px;border-radius:8px;border:0;background:var(--accent);color:#fff;cursor:pointer;font-weight:600;">Применить</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  document.getElementById('tag-filter-close').onclick = close;
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

  document.getElementById('tag-filter-reset').onclick = () => {
    window.ACTIVITY_TAG_FILTER = [];
    close();
    if (typeof renderActivity === 'function') renderActivity();
  };

  document.getElementById('tag-filter-apply').onclick = () => {
    const checked = Array.from(overlay.querySelectorAll('input:checked')).map(cb => cb.value);
    window.ACTIVITY_TAG_FILTER = checked;
    close();
    if (typeof renderActivity === 'function') renderActivity();
  };
};

async function renderActivity() {
  const modeNames = { 'raw': 'Сырые сессии', 'sessions': 'Сессии', 'total_06': 'Итого 06', 'sessions_24': 'Смены 24ч', 'total_24': 'Итого 24ч' };
  const label = document.getElementById('btn-modes-label');
  if (label) label.textContent = modeNames[window.ACTIVITY_MODE] || 'Режим';

  const c = document.getElementById('content-activity');
  if (!c || !window.DATA) return;
  c.innerHTML = '';

  const listDiv = document.createElement('div');
  listDiv.style.marginTop = '16px';

  let filtered = [];
  const projName = {};
  for (const p of window.DATA.projects || []) projName[p.id] = p.name;

  if (window.ACTIVITY_MODE === 'raw') {
    filtered = window.DATA.sessions || [];
  } else {
    const boundary = (window.ACTIVITY_MODE === 'total_06' || window.ACTIVITY_MODE === 'sessions') ? '06:00' : '00:00';
    const { data, error } = await window.supabaseClient.from('worklog_session_days').select('*').eq('boundary', boundary).order('date', { ascending: false });

    if (error) {
      console.error('Ошибка загрузки дней:', error);
      listDiv.innerHTML = '<div class="empty">Ошибка загрузки данных</div>';
      c.appendChild(listDiv);
      return;
    }

    data.forEach(day => {
      if (window.ACTIVITY_MODE === 'total_06' || window.ACTIVITY_MODE === 'total_24') {
        filtered.push({ date: day.date, start: '00:00', end: '23:59', duration_min: day.total_min, project: 'ИТОГО', is_total: true, count: day.session_count });
      } else {
        if (day.sessions_data) {
          day.sessions_data.forEach(s => {
            filtered.push({ date: day.date, start: s.start.substring(0, 5), end: s.end.substring(0, 5), duration_min: s.dur, projects: s.projects || [], is_merged: true });
          });
        }
      }
    });
  }

  if (CALENDAR_SELECTED_DAYS.size > 0) {
    filtered = filtered.filter(s => CALENDAR_SELECTED_DAYS.has(s.date));
  }

  if (window.ACTIVITY_MODE === 'raw' && window.ACTIVITY_TAG_FILTER && window.ACTIVITY_TAG_FILTER.length > 0) {
    filtered = filtered.filter(s => s.tags && s.tags.some(t => window.ACTIVITY_TAG_FILTER.includes(t)));
  }

  filtered.sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    return (b.start || '').localeCompare(a.start || '');
  });

  if (filtered.length === 0) {
    listDiv.innerHTML = '<div class="empty" style="padding:20px 0;">Нет записей за выбранные даты</div>';
  } else {
    let lastDate = '';
    filtered.forEach(s => {
      if (s.date !== lastDate) {
        const dateHeader = document.createElement('div');
        dateHeader.className = 'activity-date';
        dateHeader.textContent = formatActivityDate(s.date);
        listDiv.appendChild(dateHeader);
        lastDate = s.date;
      }
      
      if (s.is_total) {
        const item = document.createElement('div');
        item.className = 'activity-row';
        item.innerHTML = `
          <div class="activity-row-time">За день</div>
          <div class="activity-row-dur" style="color:var(--accent); font-weight:bold;">${fmtH(s.duration_min)}</div>
          <div class="activity-row-proj" style="text-align:right; opacity:0.7;">${s.count} сессий</div>
        `;
        
        item.addEventListener('click', async () => {
          // Запрашиваем сырые сессии за этот день прямо из базы
          let rawSessions = (window.DATA.sessions || []).filter(rs => rs.date === s.date);
          
          if (rawSessions.length === 0) {
            // Если в памяти нет — грузим из Supabase
            const { data, error } = await window.supabaseClient
              .from('worklog_sessions')
              .select('*')
              .eq('date', s.date);
            
            if (error || !data || data.length === 0) {
              alert('Нет детальных данных за этот день в базе');
              return;
            }
            
            rawSessions = data.map(rs => ({
              start: rs.start_time,
              end: rs.end_time,
              duration_min: rs.duration_min,
              project: rs.project_id
            }));
          }

          const overlay = document.createElement('div');
          overlay.className = 'activity-modal-overlay';

          let listHTML = '<div style="display:flex; flex-direction:column; gap:8px; margin-top:16px;">';
          rawSessions.sort((a, b) => (a.start || '').localeCompare(b.start || '')).forEach(rs => {
            const proj = projName[rs.project] || rs.project || '–';
            listHTML += `
              <div style="background:var(--bg3); padding:12px; border-radius:8px; display:flex; justify-content:space-between; align-items:center;">
                <div>
                  <div style="font-size:14px; font-weight:500;">${(rs.start || '?').substring(0, 5)} → ${(rs.end || '?').substring(0, 5)}</div>
                  <div style="font-size:12px; color:var(--fg-dim); margin-top:4px;">${proj}</div>
                </div>
                <div style="color:var(--accent); font-weight:bold;">${fmtH(rs.duration_min || 0)}</div>
              </div>
            `;
          });
          listHTML += '</div>';

          overlay.innerHTML = `
            <div class="activity-modal">
              <button class="modal-close" onclick="this.closest('.activity-modal-overlay').remove()">✕</button>
              <div class="modal-header">
                <div class="modal-time">Итого за ${formatActivityDate(s.date)}</div>
                <div class="modal-proj" style="color:var(--accent); font-size:20px; margin-top:8px;">${fmtH(s.duration_min)}</div>
              </div>
              <div style="font-size:13px; color:var(--fg-dim);">Всего сессий: ${s.count}</div>
              ${listHTML}
            </div>
          `;
          overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
          document.body.appendChild(overlay);
        });

        listDiv.appendChild(item);
      } else if (s.is_merged) {
        const item = document.createElement('div');
        item.className = 'activity-row';
        let projNames = '—';
        if (s.projects && s.projects.length > 0) {
          projNames = s.projects.map(pid => projName[pid] || pid).join(', ');
        }
        item.innerHTML = `
          <div class="activity-row-time">${s.start} → ${s.end}</div>
          <div class="activity-row-dur">${fmtH(s.duration_min)}</div>
          <div class="activity-row-proj">${projNames}</div>
        `;
        
        // Добавляем обработчик клика
        item.addEventListener('click', async () => {
          let rawSessions = (window.DATA.sessions || []).filter(rs => rs.date === s.date);
          if (rawSessions.length === 0) {
            const { data, error } = await window.supabaseClient
              .from('worklog_sessions')
              .select('*')
              .eq('date', s.date);
            if (error || !data) { alert('Нет данных'); return; }
            rawSessions = data.map(rs => ({
              start: rs.start_time, end: rs.end_time, duration_min: rs.duration_min, project: rs.project_id
            }));
          }

          const overlay = document.createElement('div');
          overlay.className = 'activity-modal-overlay';
          let listHTML = '<div style="display:flex; flex-direction:column; gap:8px; margin-top:16px;">';
          rawSessions.sort((a, b) => (a.start || '').localeCompare(b.start || '')).forEach(rs => {
            const proj = projName[rs.project] || rs.project || '–';
            listHTML += `
              <div style="background:var(--bg3); padding:12px; border-radius:8px; display:flex; justify-content:space-between; align-items:center;">
                <div>
                  <div style="font-size:14px; font-weight:500;">${(rs.start || '?').substring(0, 5)} → ${(rs.end || '?').substring(0, 5)}</div>
                  <div style="font-size:12px; color:var(--fg-dim); margin-top:4px;">${proj}</div>
                </div>
                <div style="color:var(--accent); font-weight:bold;">${fmtH(rs.duration_min || 0)}</div>
              </div>
            `;
          });
          listHTML += '</div>';

          overlay.innerHTML = `
            <div class="activity-modal">
              <button class="modal-close" onclick="this.closest('.activity-modal-overlay').remove()">✕</button>
              <div class="modal-header">
                <div class="modal-time">Сессии за ${formatActivityDate(s.date)}</div>
                <div class="modal-proj" style="color:var(--accent); font-size:20px; margin-top:8px;">${fmtH(s.duration_min)}</div>
              </div>
              ${listHTML}
            </div>
          `;
          overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
          document.body.appendChild(overlay);
        });
        
        listDiv.appendChild(item);
      } else {
        listDiv.appendChild(renderActivityCard(s, projName));
      }
    });
  }
  c.appendChild(listDiv);
}
