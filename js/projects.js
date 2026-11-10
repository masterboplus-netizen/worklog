// МОДУЛЬ: ПРОЕКТЫ
// === ПРОЕКТЫ ===
function renderProjects() {
  const sec = document.createElement('div');
  sec.className = 'section';
  const byProj = {};
  for (const s of window.DATA.sessions || []) {
    byProj[s.project] = (byProj[s.project] || 0) + (s.duration_min || 0);
  }
  const base = window.DATA.baseline || {};
  if (base.minutes && base.project) {
    byProj[base.project] = (byProj[base.project] || 0) + base.minutes;
  } else if (base.minutes) {
    const firstId = (window.DATA.projects || [])[0]?.id;
    if (firstId) byProj[firstId] = (byProj[firstId] || 0) + base.minutes;
  }
  for (const p of window.DATA.projects || []) {
    const hrs = byProj[p.id] || 0;
    let totalItems = 0, doneItems = 0;
    for (const ph of (p.plan || []).filter(ph => !ph.is_archived)) {
      const items = ph.items || [];
      totalItems += items.length;
      doneItems += items.filter(it => typeof it === 'object' && it.done).length;
      // Учитываем задачи эпиков
      if (ph.epics) {
        for (const epic of ph.epics) {
          const epicItems = epic.items || [];
          totalItems += epicItems.length;
          doneItems += epicItems.filter(it => typeof it === 'object' && it.done).length;
        }
      }
    }
    const pct = totalItems ? Math.round(doneItems / totalItems * 100) : 0;
    const card = document.createElement('div');
    card.className = 'project-card';
    card.style.margin = '16px';
    card.innerHTML =
      '<div class="project-head">' +
        '<div class="project-name"><span class="project-dot" style="background:' + (p.color || '#4A9EFF') + '"></span>' + p.name + '</div>' +
        '<div class="project-hours">' + fmtH(hrs) + '</div>' +
      '</div>' +
      '<div class="progress-bar"><div class="progress-fill" style="width:' + pct + '%;background:' + (p.color || '#4A9EFF') + '"></div></div>' +
      '<div class="project-meta">Выполнено: ' + doneItems + ' из ' + totalItems + ' (' + pct + '%) · ' + (p.status || '') + '</div>';
    const phasesDiv = document.createElement('div');
    phasesDiv.className = 'phases hidden';
    for (const ph of (p.plan || []).filter(ph => !ph.is_archived)) {
      const items = ph.items || [];
      const total = items.length;
      const done = items.filter(it => typeof it === 'object' && it.done).length;
      const phPct = total ? Math.round(done / total * 100) : 0;
      const statusIcon = phPct === 100 ? '✅' : (phPct > 0 ? '🟡' : '📋');
      const phDiv = document.createElement('div');
      phDiv.className = 'phase';
      phDiv.innerHTML = '<div class="phase-head"><span class="phase-arrow"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 9l6 6 6-6"/></svg></span><span class="phase-icon">' + statusIcon + '</span><span class="phase-name">' + ph.phase + '</span><span class="phase-pct">' + phPct + '%</span></div><div class="phase-bar"><div class="phase-fill" style="width:' + phPct + '%;background:' + (p.color || '#4A9EFF') + '"></div></div>';
      const itemsList = document.createElement('div');
      itemsList.className = 'phase-items hidden';
      for (const it of items) {
        if (typeof it === 'object') {
          const line = document.createElement('div');
          line.className = 'phase-item' + (it.done ? ' done' : '');
          
          let html = (it.done ? '✅ ' : '⏳ ') + it.text;
          if (it.subtasks && it.subtasks.length > 0) {
              html += ' <span style="opacity:0.5;font-size:10px;margin-left:4px;">▼</span>';
          }
          line.innerHTML = html;
          
          itemsList.appendChild(line);

          // Если есть подзадачи — создаем контейнер и вешаем клик
          if (it.subtasks && it.subtasks.length > 0) {
              const subList = document.createElement('div');
              subList.className = 'subtask-list hidden';
              subList.style.cssText = 'padding-left: 20px; font-size: 12px; margin-top: 4px; border-left: 1px solid var(--border); margin-bottom: 4px;';
              
              for (const sub of it.subtasks) {
                  const subLine = document.createElement('div');
                  subLine.style.cssText = 'padding: 2px 0; color: var(--fg); ' + (sub.done ? 'opacity: 0.8;' : 'opacity: 1;');
                  // Убираем префикс "Хераборина: " из текста подзадачи
                  let subText = sub.text.replace(/^Хераборина[:\s]+/i, '');
                  subLine.innerHTML = (sub.done ? '✅ ' : '⏳ ') + subText;
                  subList.appendChild(subLine);
              }
              itemsList.appendChild(subList);

              line.style.cursor = 'pointer';
              line.addEventListener('click', (e) => {
                  e.stopPropagation(); // Чтобы не закрылась вся фаза
                  subList.classList.toggle('hidden');
                  const arrow = line.querySelector('span');
                  if (arrow) arrow.textContent = subList.classList.contains('hidden') ? '▼' : '▲';
              });
          }
        }
      }
      // === РЕНДЕР ЭПИКОВ (вложенных) ===
      if (ph.epics && ph.epics.length > 0) {
        const epicsContainer = document.createElement('div');
        epicsContainer.className = 'phase-epics';
        epicsContainer.style.cssText = 'padding-left: 16px; border-left: 2px solid var(--bg3); margin: 8px 0 8px 16px;';

        for (const epic of ph.epics) {
          const epicDiv = document.createElement('div');
          epicDiv.className = 'epic';
          epicDiv.style.cssText = 'margin-bottom: 8px;';

          const epicTotal = epic.items.length;
          const epicDone = epic.items.filter(it => it.done).length;
          const epicPct = epicTotal ? Math.round(epicDone / epicTotal * 100) : 0;
          const epicIcon = epicPct === 100 ? '✅' : (epicPct > 0 ? '🟡' : '📋');

          epicDiv.innerHTML = '<div style="font-size:13px; color:var(--fg); margin-bottom:4px;">' + epicIcon + ' ' + epic.name + ' <span style="opacity:0.5;font-size:11px;">' + epicPct + '%</span></div>';

          const epicItemsList = document.createElement('div');
          epicItemsList.style.cssText = 'padding-left: 16px;';

          for (const it of epic.items) {
            const line = document.createElement('div');
            line.className = 'phase-item' + (it.done ? ' done' : '');
            line.style.cssText = 'font-size:12px; padding:2px 0;';
            line.innerHTML = (it.done ? '✅ ' : '⏳ ') + it.text;
            epicItemsList.appendChild(line);
          }

          epicDiv.appendChild(epicItemsList);
          epicsContainer.appendChild(epicDiv);
        }

        phDiv.appendChild(epicsContainer);
      }

      phDiv.appendChild(itemsList);
      phDiv.addEventListener('click', () => { phDiv.classList.toggle('open'); itemsList.classList.toggle('hidden'); });
      phasesDiv.appendChild(phDiv);
    }
    card.appendChild(phasesDiv);
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
      openBtn.querySelector('span').textContent = phasesDiv.classList.contains('hidden') ? 'Открыть' : 'Свернуть';
    });
    anBtn.addEventListener('click', (ev) => { ev.stopPropagation(); openAnalyticsSheet(p.id); });
    card.insertBefore(actionsDiv, phasesDiv);
    sec.appendChild(card);
  }
  return sec;
}

// === АНАЛИТИКА ПРОЕКТА ===
function openAnalyticsSheet(projectId) {
  const proj = (window.DATA.projects || []).find(p => p.id === projectId);
  if (!proj) return;

  const sessions = (window.DATA.sessions || []).filter(s => s.project === projectId);
  const totalMin = sessions.reduce((acc, s) => acc + (s.duration_min || 0), 0);
  const totalEvents = sessions.reduce((acc, s) => acc + (s.events || 0), 0);
  const totalScreens = sessions.reduce((acc, s) => acc + (s.screens || 0), 0);
  const uniqueDays = new Set(sessions.map(s => s.date)).size;
  const avgPerDay = uniqueDays > 0 ? Math.round(totalMin / uniqueDays) : 0;

  // Создаем оверлей
  const overlay = document.createElement('div');
  overlay.className = 'goal-sheet-overlay';
  
  // Создаем саму шторку
  const sheet = document.createElement('div');
  sheet.className = 'goal-sheet';
  sheet.innerHTML = `
    <button class="goal-sheet-close" onclick="this.closest('.goal-sheet-overlay').remove()">✕</button>
    <h3 class="goal-sheet-title">Аналитика: ${proj.name}</h3>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px;">
      <div style="background: var(--bg3); padding: 12px; border-radius: 8px; text-align: center;">
        <div style="font-size: 12px; color: var(--fg-dim); margin-bottom: 4px;">Всего времени</div>
        <div style="font-size: 20px; font-weight: 600; color: var(--accent);">${fmtH(totalMin)}</div>
      </div>
      <div style="background: var(--bg3); padding: 12px; border-radius: 8px; text-align: center;">
        <div style="font-size: 12px; color: var(--fg-dim); margin-bottom: 4px;">Среднее/день</div>
        <div style="font-size: 20px; font-weight: 600; color: var(--fg);">${fmtH(avgPerDay)}</div>
      </div>
      <div style="background: var(--bg3); padding: 12px; border-radius: 8px; text-align: center;">
        <div style="font-size: 12px; color: var(--fg-dim); margin-bottom: 4px;">Сообщения</div>
        <div style="font-size: 20px; font-weight: 600; color: var(--green);">${totalEvents}</div>
      </div>
      <div style="background: var(--bg3); padding: 12px; border-radius: 8px; text-align: center;">
        <div style="font-size: 12px; color: var(--fg-dim); margin-bottom: 4px;">Скрины</div>
        <div style="font-size: 20px; font-weight: 600; color: var(--yellow);">${totalScreens}</div>
      </div>
    </div>
    <div style="text-align: center; color: var(--fg-dim); font-size: 13px;">
      Сессий: ${sessions.length} · Дней: ${uniqueDays}
    </div>
  `;
  
  overlay.appendChild(sheet);
  document.body.appendChild(overlay);

  // Закрытие по клику на фон
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
}

