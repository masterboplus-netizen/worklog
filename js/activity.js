// МОДУЛЬ: СПИСОК СЕССИЙ




// === РЕНДЕР ОДНОЙ КАРТОЧКИ СЕССИИ ===
function renderSessionCard(s, projName) {
  const item = document.createElement('div');
  item.className = 'diary-item';

  let countersHTML = '<div class="diary-counters" style="display:flex;gap:12px;align-items:center;">';
  countersHTML += `<span title="Сообщения">📨 ${s.events || 0}</span>`;
  countersHTML += `<span title="Скрины">📸 ${s.screens || 0}</span>`;
  countersHTML += `<span title="Задачи">✅ ${s.tasks_done || 0}</span>`;
  countersHTML += `<span title="Ошибки">🐛 ${s.errors_count || 0}</span>`;
  countersHTML += `<span title="Инциденты">🚨 ${s.incidents_count || 0}</span>`;
  countersHTML += '</div>';

  const tagsHTML = s.tags && s.tags.length ? `<div style="margin-top:6px; display:flex; gap:4px; flex-wrap:wrap;">${s.tags.map(t => `<span style="background:rgba(255,255,255,0.1); padding:2px 6px; border-radius:4px; font-size:10px; color:var(--fg);">${t}</span>`).join('')}</div>` : '';

  const uniqueTasks = {};
  if (s.linked_tasks) {
    s.linked_tasks.forEach(t => {
      if (!uniqueTasks[t.task]) uniqueTasks[t.task] = [];
      uniqueTasks[t.task].push(t);
    });
  }

  let tasksHTML = '';
  if (Object.keys(uniqueTasks).length > 0) {
    tasksHTML = '<div class="diary-tasks-list" style="margin-top: 12px; display: flex; flex-direction: column; gap: 6px;">';
    Object.entries(uniqueTasks).forEach(([taskName]) => {
      tasksHTML += `<div style="font-size: 13px; color: var(--fg); font-weight: 500; display: flex; align-items: center; gap: 6px;">• ${taskName}</div>`;
    });
    tasksHTML += '</div>';
  }

  let detailsHTML = '';
  if (Object.keys(uniqueTasks).length > 0) {
    detailsHTML = '<div class="diary-details" style="max-height: 0; overflow: hidden; transition: max-height 0.3s ease-in-out;">';
    detailsHTML += '<div style="margin-top: 12px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 12px;">';
    Object.entries(uniqueTasks).forEach(([taskName, taskDetails]) => {
      const parentInfo = taskDetails[0];
      detailsHTML += `<div style="margin-bottom: 12px;">`;
      detailsHTML += `<div style="font-size: 14px; color: var(--fg); font-weight: 600; margin-bottom: 6px;">${taskName}</div>`;
      detailsHTML += `<div style="font-size: 12px; color: var(--fg-dim); margin-left: 8px; border-left: 1px solid var(--fg-dim); padding-left: 8px;">`;
      detailsHTML += `<div><b>Проект:</b> ${parentInfo.project}</div>`;
      detailsHTML += `<div><b>Модуль:</b> ${parentInfo.module || '–'}</div>`;
      detailsHTML += `<div><b>Эпик:</b> ${parentInfo.epic}</div>`;
      detailsHTML += `<div style="margin-top: 4px;"><b>Подзадачи:</b></div>`;
      taskDetails.forEach(t => {
        detailsHTML += `<div style="font-size: 12px; color: var(--fg-dim); padding-left: 8px; margin-bottom: 2px;">- ${t.subtask} (${t.status})</div>`;
      });
      detailsHTML += `</div></div>`;
    });
    detailsHTML += '</div></div>';
  }

  const noteText = s.note || '';

  item.style.cursor = 'pointer';
  item.style.background = 'rgba(255,255,255,0.03)';
  item.style.borderRadius = '12px';
  item.style.padding = '16px';
  item.style.marginBottom = '12px';
  item.style.border = '1px solid rgba(255,255,255,0.05)';

  item.innerHTML = `
    <div style="font-size:12px; color:var(--fg-dim); margin-bottom:4px;">${s.start || '?'} → ${s.end || '?'} · <span style="color:var(--accent); font-weight:600;">${fmtH(s.duration_min || 0)}</span></div>
    <div style="font-size:16px; color:var(--fg); font-weight:700; margin-bottom:8px;">${projName[s.project] || s.project || '–'}</div>
    ${countersHTML}
    ${tagsHTML}
    ${tasksHTML}
    ${detailsHTML.replace('margin-top: 12px;', 'margin-top: 12px;').replace('<div style="margin-top: 12px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 12px;">', `<div style="margin-top: 12px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 12px;">${noteText ? `<div style="font-size: 13px; color: var(--fg-dim); margin-bottom: 12px;">${noteText}</div>` : ''}`)}
  `;

  item.addEventListener('click', () => {
    const details = item.querySelector('.diary-details');
    if (details) {
      if (details.style.maxHeight === '0px' || details.style.maxHeight === '') {
        details.style.maxHeight = details.scrollHeight + 'px';
      } else {
        details.style.maxHeight = '0px';
      }
    }
  });

  return item;
}

function formatDiaryDate(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  const months = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
  const days = ['вс','пн','вт','ср','чт','пт','сб'];
  return d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear() + ', ' + days[d.getDay()];
}

function mergeMidnightSessions(sessions) {
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

// === СПИСОК (для вкладки) ===
function renderActivityLog() {
  const c = document.getElementById('content-activity-log');
  if (!c || !window.DATA) return;
  c.innerHTML = '';


  const listDiv = document.createElement('div');
  listDiv.style.marginTop = '16px';
  let baseSessions = window.DIARY_MODE === 'sessions' ? mergeMidnightSessions(window.DATA.sessions || []) : (window.DATA.sessions || []);
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
        dateHeader.className = 'diary-date';
        dateHeader.textContent = formatDiaryDate(s.date);
        listDiv.appendChild(dateHeader);
        lastDate = s.date;
      }
      listDiv.appendChild(renderSessionCard(s, projName));
    });
  }

  c.appendChild(listDiv);
}

// Обратная совместимость
window.renderDiary = renderActivityLog;
window.renderActivityLog = renderActivityLog;