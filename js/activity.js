// МОДУЛЬ: СПИСОК АКТИВНОСТИ

function renderActivityCard(s, projName) {
  const item = document.createElement('div');
  item.className = 'activity-row';
  
  item.innerHTML = `
    <div class="activity-row-time">${s.start || '?'} → ${s.end || '?'}</div>
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

function mergeMidnightActivities(sessions) {
  const result = [];
  const midnightMap = {};
  for (const s of sessions) {
    if (!s.start || !s.end) { result.push(s); continue; }
    const startH = parseInt(s.start.split(':')[0]);
    const endH = parseInt(s.end.split(':')[0]);
    if (startH > endH) {
      const key = s.date + '_' + (s.project || '');
      if (!midnightMap[key]) midnightMap[key] = [];
      midnightMap[key].push(s);
    } else {
      result.push(s);
    }
  }
  for (const key in midnightMap) {
    const group = midnightMap[key];
    if (group.length > 1) {
      const merged = { ...group[0] };
      merged.duration_min = group.reduce((sum, s) => sum + (s.duration_min || 0), 0);
      result.push(merged);
    } else {
      result.push(group[0]);
    }
  }
  return result;
}

function renderActivity() {
  const c = document.getElementById('content-activity');
  if (!c || !window.DATA) return;
  c.innerHTML = '';

  const listDiv = document.createElement('div');
  listDiv.style.marginTop = '16px';
  let baseSessions = window.ACTIVITY_MODE === 'sessions' ? mergeMidnightActivities(window.DATA.sessions || []) : (window.DATA.sessions || []);
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
        dateHeader.className = 'activity-date';
        dateHeader.textContent = formatActivityDate(s.date);
        listDiv.appendChild(dateHeader);
        lastDate = s.date;
      }
      listDiv.appendChild(renderActivityCard(s, projName));
    });
  }

  c.appendChild(listDiv);
}
