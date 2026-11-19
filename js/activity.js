// МОДУЛЬ: СПИСОК АКТИВНОСТИ

if (typeof window.ACTIVITY_MODE === 'undefined') {
  window.ACTIVITY_MODE = 'raw';
}

// Шторка выбора режима
window.openActivityModeSheet = function() {
  const old = document.getElementById('activity-mode-popover');
  if (old) { old.remove(); return; } // Если открыт - закрываем

  const modes = [
    { id: 'raw', label: 'Сырые сессии' },
    { id: 'sessions', label: 'Склейка (Смены)' },
    { id: 'total_06', label: 'Итого (с 06:00)' },
    { id: 'sessions_24', label: 'Смены (24ч)' },
    { id: 'total_24', label: 'Итого (с 00:00)' }
  ];

  const btn = document.getElementById('btn-modes');
  if (!btn) return;

  // Создаем контейнер для меню
  const popover = document.createElement('div');
  popover.id = 'activity-mode-popover';
  
  // Стили для поповера (абсолютное позиционирование над кнопкой)
  popover.style.cssText = `
    position: fixed;
    background: var(--bg2);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.5);
    z-index: 1000;
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 200px;
    animation: fadeIn 0.2s ease;
  `;

  // Вычисляем позицию (над кнопкой)
  const rect = btn.getBoundingClientRect();
  popover.style.bottom = (window.innerHeight - rect.top + 8) + 'px'; // Отступ сверху от кнопки
  popover.style.right = (window.innerWidth - rect.right) + 'px'; // Прижимаем к правому краю кнопки

  // Добавляем CSS для анимации, если нет
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
      border: none;
      padding: 10px 12px;
      border-radius: 8px;
      text-align: left;
      font-size: 14px;
      cursor: pointer;
      transition: 0.2s;
    `;

    btnMode.addEventListener('click', () => {
      window.ACTIVITY_MODE = m.id;
      
      const modeNames = {
        'raw': 'Сырые сессии',
        'sessions': 'Склейка',
        'total_06': 'Итого 06',
        'sessions_24': 'Смены 24ч',
        'total_24': 'Итого 24ч'
      };
      const label = document.getElementById('btn-modes-label');
      if (label) label.textContent = modeNames[m.id] || 'Режим';
      
      popover.remove();
      if (typeof renderActivity === 'function') renderActivity();
    });

    popover.appendChild(btnMode);
  });

  document.body.appendChild(popover);

  // Закрытие при клике вне поповера
  const closePopover = (e) => {
    if (!popover.contains(e.target) && e.target !== btn && !btn.contains(e.target)) {
      popover.remove();
      document.removeEventListener('click', closePopover);
    }
  };
  setTimeout(() => document.addEventListener('click', closePopover), 10);
};

function renderActivityCard(s, projName) {
  const item = document.createElement('div');
  item.className = 'activity-row';
  item.innerHTML = `
    <div class="activity-row-time">${(s.start || '?').substring(0, 5)} → ${(s.end || '?').substring(0, 5)}</div>
    <div class="activity-row-dur">${fmtH(s.duration_min || 0)}</div>
    <div class="activity-row-proj">${projName[s.project] || s.project || '–'}</div>
  `;
  item.addEventListener('click', () => openActivityModal(s, projName));
  return item;
}

function openActivityModal(s, projName) {
  const overlay = document.createElement('div');
  overlay.className = 'activity-modal-overlay';

  let countersHTML = '<div class="activity-modal-counters">';
  countersHTML += `<span>📨 ${s.events || 0}</span>`;
  countersHTML += `<span>📸 ${s.screens || 0}</span>`;
  countersHTML += `<span>✅ ${s.tasks_done || 0}</span>`;
  countersHTML += `<span>🐛 ${s.errors_count || 0}</span>`;
  countersHTML += `<span>🚨 ${s.incidents_count || 0}</span>`;
  countersHTML += '</div>';

  const tagsHTML = s.tags && s.tags.length ? `<div class="activity-modal-tags">${s.tags.map(t => `<span>${t}</span>`).join('')}</div>` : '';

  let tasksHTML = '';
  if (s.linked_tasks && s.linked_tasks.length > 0) {
    const uniqueTasks = {};
    s.linked_tasks.forEach(t => {
      if (!uniqueTasks[t.task]) uniqueTasks[t.task] = { duration: t.task_duration || 0, subtasks: [] };
      uniqueTasks[t.task].subtasks.push(t);
    });

    tasksHTML = '<div class="activity-modal-tasks">';
    Object.entries(uniqueTasks).forEach(([taskName, taskData]) => {
      tasksHTML += `<div class="modal-task-group">`;
      tasksHTML += `<div class="modal-task-head">${taskName} <span>(${fmtH(taskData.duration)})</span></div>`;
      tasksHTML += `<div class="modal-subtasks">`;
      taskData.subtasks.forEach(st => {
        const stDur = st.subtask_duration ? ` (${fmtH(st.subtask_duration)})` : '';
        tasksHTML += `<div class="modal-subtask">- ${st.subtask}${stDur}</div>`;
      });
      tasksHTML += `</div></div>`;
    });
    tasksHTML += '</div>';
  }

  const noteText = s.note ? `<div class="activity-modal-note">${s.note}</div>` : '';

  overlay.innerHTML = `
    <div class="activity-modal">
      <button class="modal-close" onclick="this.closest('.activity-modal-overlay').remove()">✕</button>
      <div class="modal-header">
        <div class="modal-time">${s.start} → ${s.end} · <span style="color:var(--accent)">${fmtH(s.duration_min || 0)}</span></div>
        <div class="modal-proj">${projName[s.project] || s.project}</div>
      </div>
      ${countersHTML}
      ${tagsHTML}
      ${noteText}
      ${tasksHTML}
    </div>
  `;

  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);
}

function formatActivityDate(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  const months = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
  const days = ['вс','пн','вт','ср','чт','пт','сб'];
  return d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear() + ', ' + days[d.getDay()];
}

async function renderActivity() {
  const modeNames = {
    'raw': 'Сырые',
    'sessions': 'Сессии',
    'total_06': 'Итого',
    'sessions_24': '24ч',
    'total_24': '24ч Итог'
  };
  const label = document.getElementById('btn-modes-label');
  if (label) label.textContent = modeNames[window.ACTIVITY_MODE] || 'Сырые сессии';

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
    
    const { data, error } = await window.supabaseClient
      .from('worklog_session_days')
      .select('*')
      .eq('boundary', boundary)
      .order('date', { ascending: false });

    if (error) {
      console.error('Ошибка загрузки дней:', error);
      listDiv.innerHTML = '<div class="empty">Ошибка загрузки данных</div>';
      c.appendChild(listDiv);
      return;
    }

    data.forEach(day => {
      if (window.ACTIVITY_MODE === 'total_06' || window.ACTIVITY_MODE === 'total_24') {
        filtered.push({
          date: day.date,
          start: '00:00',
          end: '23:59',
          duration_min: day.total_min,
          project: 'ИТОГО',
          is_total: true,
          count: day.session_count
        });
      } else {
        if (day.sessions_data) {
          day.sessions_data.forEach(s => {
            filtered.push({
              date: day.date,
              start: s.start.substring(0, 5),
              end: s.end.substring(0, 5),
              duration_min: s.dur,
              projects: s.projects || [],
              is_merged: true
            });
          });
        }
      }
    });
  }

  if (CALENDAR_SELECTED_DAYS.size > 0) {
    filtered = filtered.filter(s => CALENDAR_SELECTED_DAYS.has(s.date));
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
          <div class="activity-row-time">🏆 ИТОГО за день</div>
          <div class="activity-row-dur" style="color:var(--accent); font-weight:bold;">${fmtH(s.duration_min)}</div>
          <div class="activity-row-proj">${s.count} сессий</div>
        `;
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
        listDiv.appendChild(item);
      } else {
        listDiv.appendChild(renderActivityCard(s, projName));
      }
    });
  }

  c.appendChild(listDiv);
}
