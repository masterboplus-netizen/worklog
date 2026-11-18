// МОДУЛЬ: СПИСОК АКТИВНОСТИ

// Глобальная переменная для режима отображения (по умолчанию - как записывались)
if (typeof window.ACTIVITY_MODE === 'undefined') {
  window.ACTIVITY_MODE = 'raw'; // 'raw', 'sessions', 'total_06', 'sessions_24', 'total_24'
}

function renderActivityCard(s, projName) {
  const item = document.createElement('div');
  item.className = 'activity-row';

  // Для сырых сессий выводим время
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

// --- НОВАЯ ЛОГИКА: Получаем данные из готовой таблицы ---
async function renderActivity() {
  const c = document.getElementById('content-activity');
  if (!c || !window.DATA) return;
  c.innerHTML = '';

  async function renderActivity() {
  const c = document.getElementById('content-activity');
  if (!c || !window.DATA) return;
  c.innerHTML = '';

  // 1. Отрисовка кнопок-переключателей
  const controls = document.createElement('div');
  controls.style.cssText = 'display:flex; gap:8px; overflow-x:auto; padding: 8px 0; margin-bottom: 16px;';
  
  const modes = [
    { id: 'raw', label: 'Как записывались' },
    { id: 'sessions', label: 'Сессии' },
    { id: 'total_06', label: 'Сессии итого' },
    { id: 'sessions_24', label: 'Сессии 24ч' },
    { id: 'total_24', label: '24ч итого' }
  ];

  modes.forEach(m => {
    const btn = document.createElement('button');
    btn.className = `cal-btn ${window.ACTIVITY_MODE === m.id ? 'active' : ''}`;
    btn.textContent = m.label;
    btn.style.cssText = 'padding: 6px 12px; border-radius: 16px; font-size: 12px; white-space: nowrap;';
    btn.onclick = () => {
      window.ACTIVITY_MODE = m.id;
      renderActivity();
    };
    controls.appendChild(btn);
  });
  c.appendChild(controls);

  const listDiv = document.createElement('div');
  listDiv.style.marginTop = '16px';

  let filtered = [];
  const projName = {};
  for (const p of window.DATA.projects || []) projName[p.id] = p.name;

  // Если выбран сырой режим — берем из сессий, иначе из новой таблицы
  if (window.ACTIVITY_MODE === 'raw') {
    filtered = window.DATA.sessions || [];
  } else {
    // Загружаем данные из новой таблицы worklog_session_days
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

    // Преобразуем sessions_data в плоский список
    data.forEach(day => {
      if (window.ACTIVITY_MODE === 'total_06' || window.ACTIVITY_MODE === 'total_24') {
        // Выводим итоговую карточку за день
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
        // Выводим список склеенных сессий
        if (day.sessions_data) {
          day.sessions_data.forEach(s => {
            filtered.push({
              date: day.date,
              start: s.start.substring(0, 5), // Убираем секунды
              end: s.end.substring(0, 5),     // Убираем секунды
              duration_min: s.dur,
              projects: s.projects || [], // <--- ПЕРЕДАЕМ МАССИВ ПРОЕКТОВ
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
        
        // Формируем строку с проектами
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