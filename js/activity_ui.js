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
        <div class="modal-time">${(s.start||'').substring(0,5)} → ${(s.end||'').substring(0,5)} · <span style="color:var(--accent)">${fmtH(s.duration_min || 0)}</span></div>
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
