// МОДУЛЬ: КАЛЕНДАРЬ (ШТОРКА)

function mergeMidnightSessions(sessions) {
  if (!sessions || !sessions.length) return [];

  // 1. Подготовка (считаем миллисекунды, учитываем ночь)
  const prepared = sessions.map(s => {
    let startMs = new Date(s.date + 'T' + s.start + ':00').getTime();
    let endMs = new Date(s.date + 'T' + s.end + ':00').getTime();
    if (endMs < startMs) endMs += 24 * 60 * 60 * 1000; 
    return { ...s, startMs, endMs };
  }).sort((a, b) => a.startMs - b.startMs);

  const merged = [];
  let currentGroup = [];

  // 2. Склейка по 15 минутам
  for (let i = 0; i < prepared.length; i++) {
    const s = prepared[i];
    
    if (currentGroup.length === 0) {
      currentGroup.push(s);
      continue;
    }

    let maxEndMs = -Infinity;
    for (const gs of currentGroup) {
        if (gs.endMs > maxEndMs) maxEndMs = gs.endMs;
    }

    const gapMs = s.startMs - maxEndMs;

    if (gapMs < 15 * 60 * 1000) {
      currentGroup.push(s);
    } else {
      merged.push(processGroup(currentGroup));
      currentGroup = [s];
    }
  }

  if (currentGroup.length > 0) {
    merged.push(processGroup(currentGroup));
  }

  return merged.sort((a, b) => {
    const dateA = a.date || '';
    const dateB = b.date || '';
    if (dateA !== dateB) return dateB.localeCompare(dateA);

    // Сортируем по времени окончания (по убыванию)
    let endA = a.end || '';
    let endB = b.end || '';
    const startA = a.start || '';
    const startB = b.start || '';

    // Если конец "меньше" начала (ночная сессия), добавляем 24 часа для корректной сортировки
    if (endA && startA && endA < startA) {
        const [h, m] = endA.split(':');
        endA = (parseInt(h) + 24).toString().padStart(2, '0') + ':' + m;
    }
    if (endB && startB && endB < startB) {
        const [h, m] = endB.split(':');
        endB = (parseInt(h) + 24).toString().padStart(2, '0') + ':' + m;
    }
    
    return endB.localeCompare(endA);
  });

  // 3. Обработка группы
  function processGroup(group) {
    const firstSess = group[0]; 
    const date = firstSess.date; // Привязка к дате первой сессии
    
    let minStartStr = firstSess.start;
    let maxEndMs = -Infinity;
    let displayEndStr = firstSess.end;
    
    let totalEvents = 0, totalScreens = 0, totalTasks = 0;
    let notes = [];
    const projects = new Set();
    const allLinkedTasks = [];

    const intervals = group.map(s => ({ start: s.startMs, end: s.endMs }))
                            .sort((a, b) => a.start - b.start);

    let realDurationMs = 0;
    if (intervals.length > 0) {
        let curStart = intervals[0].start;
        let curEnd = intervals[0].end;
        for (let i = 1; i < intervals.length; i++) {
            if (intervals[i].start <= curEnd) {
                curEnd = Math.max(curEnd, intervals[i].end);
            } else {
                realDurationMs += (curEnd - curStart);
                curStart = intervals[i].start;
                curEnd = intervals[i].end;
            }
        }
        realDurationMs += (curEnd - curStart);
    }

    for (const s of group) {
      if (s.startMs < new Date(date + 'T' + minStartStr + ':00').getTime()) {
        minStartStr = s.start;
      }
      
      if (s.endMs > maxEndMs) {
          maxEndMs = s.endMs;
          displayEndStr = s.end;
      }

      totalEvents += s.events || 0;
      totalScreens += s.screens || 0;
      totalTasks += s.tasks_done || 0;
      if (s.note) notes.push(s.note);
      if (s.project) projects.add(s.project);
      if (s.linked_tasks) {
          s.linked_tasks.forEach(lt => {
              const key = lt.project + '|' + lt.phase + '|' + lt.task + '|' + lt.subtask;
              if (!allLinkedTasks.some(x => x.key === key)) {
                  allLinkedTasks.push({ key, ...lt });
              }
          });
      }
    }

    return {
      id: 'merged_' + firstSess.id,
      date: date,
      start: minStartStr,
      end: displayEndStr,
      duration_min: Math.round(realDurationMs / 60000),
      project: Array.from(projects)[0] || '–',
      note: notes.join(' '),
      events: totalEvents,
      screens: totalScreens,
      tasks_done: totalTasks,
      linked_tasks: allLinkedTasks.map(t => ({ project: t.project, phase: t.phase, task: t.task, subtask: t.subtask, status: t.status }))
    };
  }
}



function formatDiaryDate(iso) {
  const months = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
  const days = ['вс','пн','вт','ср','чт','пт','сб'];
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d.getTime())) return iso;
  return d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear() + ', ' + days[d.getDay()];
}
