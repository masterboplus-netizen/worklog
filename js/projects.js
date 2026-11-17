// МОДУЛЬ: ПРОЕКТЫ
// === ПРОЕКТЫ ===

// Функция для рекурсивного подсчёта времени (собственное + подзадачи)
function calcNodeTime(node) {
  let total = node.duration_min || 0;
  if (node.subtasks) {
    node.subtasks.forEach(st => total += (st.duration_min || 0));
  }
  if (node.items) {
    node.items.forEach(it => total += calcNodeTime(it));
  }
  return total;
}

// Функция для расчёта времени фазы (сумма задач + эпиков)
function calcPhaseTime(ph) {
  let total = 0;
  if (ph.items) {
    ph.items.forEach(it => total += calcNodeTime(it));
  }
  if (ph.epics) {
    ph.epics.forEach(ep => {
      if (ep.items) {
        ep.items.forEach(it => total += calcNodeTime(it));
      }
    });
  }
  return total;
}

function renderProjects() {
  const sec = document.createElement('div');
  sec.className = 'section';
  
  for (const p of window.DATA.projects || []) {
    const totalProjTime = (p.plan || []).reduce((sum, ph) => sum + calcPhaseTime(ph), 0);

    let totalItems = 0, doneItems = 0;
    for (const ph of (p.plan || []).filter(ph => !ph.is_archived)) {
      const items = ph.items || [];
      totalItems += items.length;
      doneItems += items.filter(it => typeof it === 'object' && it.done).length;
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
        '<div class="project-hours">' + fmtH(totalProjTime) + '</div>' +
      '</div>' +
      '<div class="progress-bar"><div class="progress-fill" style="width:' + pct + '%;background:' + (p.color || '#4A9EFF') + '"></div></div>' +
      '<div class="project-meta">Выполнено: ' + doneItems + ' из ' + totalItems + ' (' + pct + '%) · ' + (p.status || '') + '</div>';
      
    const phasesDiv = document.createElement('div');
    phasesDiv.className = 'phases hidden';
    
    for (const ph of (p.plan || []).filter(ph => !ph.is_archived)) {
      const items = ph.items || [];
      let total = items.length;
      let done = items.filter(it => typeof it === 'object' && it.done).length;
      
      if (ph.epics && ph.epics.length > 0) {
        total = 0;
        done = 0;
        for (const epic of ph.epics) {
          total += epic.items.length;
          done += epic.items.filter(it => it.done).length;
        }
      }
      const phPct = total ? Math.round(done / total * 100) : 0;
      const phTime = calcPhaseTime(ph); // Считаем время фазы
      
      const statusIcon = phPct === 100 ? '✅' : (phPct > 0 ? '🟡' : '📋');
      const phDiv = document.createElement('div');
      phDiv.className = 'phase';
      
      phDiv.innerHTML = '<div class="phase-head"><span class="phase-arrow"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 9l6 6 6-6"/></svg></span><span class="phase-icon">' + statusIcon + '</span><span class="phase-name">' + ph.phase + '</span><span class="phase-pct" style="margin-right: 8px;">' + phPct + '%</span><span style="font-size: 11px; color: var(--accent);">' + fmtH(phTime) + '</span></div><div class="phase-bar"><div class="phase-fill" style="width:' + phPct + '%;background:' + (p.color || '#4A9EFF') + '"></div></div>';
      
      const itemsList = document.createElement('div');
      itemsList.className = 'phase-items hidden';
      for (const it of items) {
        if (typeof it === 'object') {
          const line = document.createElement('div');
          line.className = 'phase-item' + (it.done ? ' done' : '');
          
          // Считаем время для задачи
          const taskTime = calcNodeTime(it);
          const timeStr = taskTime > 0 ? ' <span style="font-size:10px; color:var(--accent); margin-left:4px;">(' + fmtH(taskTime) + ')</span>' : '';
          
          let html = (it.done ? '✅ ' : '⏳ ') + it.text + timeStr;
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
                  let subText = sub.text.replace(/^Хераборина[:\s]+/i, '');
                  
                  // Время подзадачи
                  const subTimeStr = (sub.duration_min || 0) > 0 ? ' <span style="font-size:10px; color:var(--accent); margin-left:4px;">(' + fmtH(sub.duration_min) + ')</span>' : '';
                  
                  subLine.innerHTML = (sub.done ? '✅ ' : '⏳ ') + subText + subTimeStr;
                  subList.appendChild(subLine);
              }
              itemsList.appendChild(subList);

              line.style.cursor = 'pointer';
              line.addEventListener('click', (e) => {
                  e.stopPropagation();
                  subList.classList.toggle('hidden');
                  const arrow = line.querySelector('span:last-child');
                  if (arrow && arrow.textContent === '▼') arrow.textContent = '▲';
                  else if (arrow && arrow.textContent === '▲') arrow.textContent = '▼';
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
          
          // Время эпика
          let epicTime = 0;
          epic.items.forEach(it => epicTime += calcNodeTime(it));

          const epicHead = document.createElement('div');
          epicHead.style.cssText = 'font-size:13px; color:var(--fg); margin-bottom:4px; cursor:pointer; user-select:none;';
          epicHead.innerHTML = '<span style="display:inline-block;transition:transform 0.2s;" class="epic-arrow">▶</span> ' + epicIcon + ' ' + epic.name + ' <span style="opacity:0.5;font-size:11px;">' + epicPct + '%</span>' + (epicTime > 0 ? ' <span style="font-size:11px; color:var(--accent);">(' + fmtH(epicTime) + ')</span>' : '');

          const epicItemsList = document.createElement('div');
          epicItemsList.style.cssText = 'padding-left: 24px; display:none;';

          for (const it of epic.items) {
            const line = document.createElement('div');
            line.className = 'phase-item' + (it.done ? ' done' : '');
            line.style.cssText = 'font-size:12px; padding:2px 0;';
            
            const taskTime = calcNodeTime(it);
            const timeStr = taskTime > 0 ? ' <span style="font-size:10px; color:var(--accent); margin-left:4px;">(' + fmtH(taskTime) + ')</span>' : '';
            
            line.innerHTML = (it.done ? '✅ ' : '⏳ ') + it.text + timeStr;
            epicItemsList.appendChild(line);

            // Подзадачи эпика
            if (it.subtasks && it.subtasks.length > 0) {
              const subList = document.createElement('div');
              subList.style.cssText = 'padding-left: 16px; font-size: 11px; margin-top: 2px; border-left: 1px solid var(--border); margin-bottom: 2px;';
              for (const sub of it.subtasks) {
                const subLine = document.createElement('div');
                subLine.style.cssText = 'padding: 1px 0; color: var(--fg); ' + (sub.done ? 'opacity: 0.8;' : 'opacity: 1;');
                let subText = sub.text.replace(/^Хераборина[:\s]+/i, '');
                
                const subTimeStr = (sub.duration_min || 0) > 0 ? ' <span style="font-size:10px; color:var(--accent); margin-left:4px;">(' + fmtH(sub.duration_min) + ')</span>' : '';
                
                subLine.innerHTML = (sub.done ? '✅ ' : '⏳ ') + subText + subTimeStr;
                subList.appendChild(subLine);
              }
              epicItemsList.appendChild(subList);
            }
          }

          epicHead.addEventListener('click', (e) => {
            e.stopPropagation();
            const isHidden = epicItemsList.style.display === 'none';
            epicItemsList.style.display = isHidden ? 'block' : 'none';
            const arrow = epicHead.querySelector('.epic-arrow');
            if (arrow) arrow.style.transform = isHidden ? 'rotate(90deg)' : 'rotate(0deg)';
          });

          epicDiv.appendChild(epicHead);
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
  // ... (код без изменений, я его сохранил)
}