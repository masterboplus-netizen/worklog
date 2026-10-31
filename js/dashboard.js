// МОДУЛЬ: ДАШБОРД

function getProgressColor(percent) {
  if (percent < 25) return 'var(--red)';
  if (percent < 50) return 'var(--yellow)';
  if (percent < 85) return 'var(--accent)';
  return 'var(--green)';
}

function startRingAnimation() {
  setTimeout(() => {
    document.querySelectorAll('.ring-progress').forEach(ring => {
      const targetOffset = ring.getAttribute('data-target-offset');
      if (targetOffset !== null) {
        ring.style.transition = 'stroke-dashoffset 1.5s cubic-bezier(0.4, 0, 0.2, 1)';
        ring.style.strokeDashoffset = targetOffset;
        
        // Добавляем дыхание для маленьких колец (и большого) после анимации
        setTimeout(() => {
          ring.classList.add('ring-breathing');
        }, 1500);
      }
    });
  }, 100);
}

function renderHeroRings() {
  const c = document.getElementById('content');
  if (!c || !window.DATA) return;

  // 1. Данные из calcTotals и склеенные сессии
  const t = calcTotals();
  const sessions = mergeMidnightSessions(window.DATA.sessions || []);
  const _sessions = window.DATA.sessions || [];

  // 2. Считаем время за сегодня ТАК ЖЕ, КАК В КАЛЕНДАРЕ
  let todayMin = 0;
  const todayStr = _localDate(new Date());
  for (const s of window.DATA.sessions || []) {
    if (s.date === todayStr) {
      todayMin += (s.duration_min || 0);
    }
  }

  // 3. Переменные для большого кольца
  const heroValue = todayMin;
  const heroLabel = 'Сегодня';
  const heroSub = 'Среднее ' + fmtH(t.avgPerDay);
  
  const pctDur = Math.min(100, Math.round(heroValue / (t.avgPerDay > 0 ? t.avgPerDay : 480) * 100));
  const ringColor = getProgressColor(pctDur);

  // 4. Малые кольца
  const msgVal = _sumRange(_sessions, MINI_MSG_PERIOD, 'events');
  const scrVal = _sumRange(_sessions, MINI_SCR_PERIOD, 'screens');
  const tasksVal = _sumRange(_sessions, MINI_TASKS_PERIOD, 'tasks_done');
  
  const maxMsg = Math.max(1, ...sessions.map(s => s.events || 0));
  const pctMsg = Math.min(100, Math.round(msgVal / maxMsg * 100));
  
  const maxScr = Math.max(1, ...sessions.map(s => s.screens || 0));
  const pctScr = Math.min(100, Math.round(scrVal / maxScr * 100));
  
  const maxTasks = Math.max(1, ...sessions.map(s => s.tasks_done || 0));
  const pctTasks = Math.min(100, Math.round(tasksVal / maxTasks * 100));

  // 5. Отрисовка (оригинальная верстка)
  const div = document.createElement('div');
  div.className = 'hero-rings';
  div.innerHTML = '<div class="hero-main"><div class="ring-wrap" style="cursor:pointer" id="hero-ring">' + renderRingSVG(pctDur, 290, 14, ringColor) +
    '<div class="ring-center"><div class="ring-icon"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--fg-dim)" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg></div>' +
    '<div class="ring-label">' + heroLabel + '</div><div class="ring-value">' + fmtH(heroValue) + '</div><div class="ring-sub">' + heroSub + '</div></div></div></div>' +
    '<div class="hero-mini"><div class="mini-block" data-mini="msg"><div class="mini-label"><div class="mini-lbl-title">Сообщения</div><div class="mini-lbl-period">' + MINI_LABELS[MINI_MSG_PERIOD] + '</div></div><div class="mini-ring" style="cursor:pointer">' + renderRingSVG(pctMsg, 92, 7, getProgressColor(pctMsg)) + '<div class="mini-center"><div class="mini-val" style="font-size:22px">' + msgVal + '</div></div></div></div>' +
    '<div class="mini-block" data-mini="scr"><div class="mini-label"><div class="mini-lbl-title">Скрины</div><div class="mini-lbl-period">' + MINI_LABELS[MINI_SCR_PERIOD] + '</div></div><div class="mini-ring" style="cursor:pointer">' + renderRingSVG(pctScr, 92, 7, getProgressColor(pctScr)) + '<div class="mini-center"><div class="mini-val" style="font-size:22px">' + scrVal + '</div></div></div></div>' +
    '<div class="mini-block" data-mini="tasks"><div class="mini-label"><div class="mini-lbl-title">Задачи</div><div class="mini-lbl-period">' + MINI_LABELS[MINI_TASKS_PERIOD] + '</div></div><div class="mini-ring" style="cursor:pointer">' + renderRingSVG(pctTasks, 92, 7, getProgressColor(pctTasks)) + '<div class="mini-center"><div class="mini-val" style="font-size:22px">' + tasksVal + '</div></div></div></div></div>';

  c.innerHTML = '';
  c.appendChild(div);
  startRingAnimation();

  // ОБРАБОТЧИКИ КЛИКОВ
  const heroRing = document.getElementById('hero-ring');
  if (heroRing) {
    heroRing.addEventListener('click', () => {
      const periods = ['today', 'week', 'month', 'all'];
      const labels = { today: 'Сегодня', week: 'Неделя', month: 'Месяц', all: 'Всё время' };
      let curIdx = periods.indexOf(HERO_MODE || 'today');
      curIdx = (curIdx + 1) % periods.length;
      HERO_MODE = periods[curIdx];
      renderDashboard(); // Перерисовываем
    });
  }

  // Обработчики для маленьких колец (сообщения, скрины, задачи)
  const minis = div.querySelectorAll('.mini-ring');
  if (minis.length >= 3) {
    minis[0].addEventListener('click', () => {
      const idx = (MINI_PERIODS_MSG.indexOf(MINI_MSG_PERIOD) + 1) % MINI_PERIODS_MSG.length;
      MINI_MSG_PERIOD = MINI_PERIODS_MSG[idx];
      renderDashboard();
    });
    minis[1].addEventListener('click', () => {
      const idx = (MINI_PERIODS_MSG.indexOf(MINI_SCR_PERIOD) + 1) % MINI_PERIODS_MSG.length;
      MINI_SCR_PERIOD = MINI_PERIODS_MSG[idx];
      renderDashboard();
    });
    minis[2].addEventListener('click', () => {
      const idx = (MINI_PERIODS_MSG.indexOf(MINI_TASKS_PERIOD) + 1) % MINI_PERIODS_MSG.length;
      MINI_TASKS_PERIOD = MINI_PERIODS_MSG[idx];
      renderDashboard();
    });
  }
}

function renderDashboard() {
  const c = document.getElementById('content');
  if (!c || !window.DATA) return;
  
  // ВАЖНО: Берем склеенные сессии!
  const merged = mergeMidnightSessions(window.DATA.sessions || []);
  const todayStr = _localDate(new Date());
  
  // Ищем сегодняшнюю сессию (или вчерашнюю, если она перешла за полночь)
  let todaySessions = merged.filter(s => s.date === todayStr);
  
  // Если сегодня пусто, проверим вчера (вдруг сессия ночная)
  if (todaySessions.length === 0) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yStr = _localDate(yesterday);
      todaySessions = merged.filter(s => s.date === yStr);
  }

  // Считаем суммы
  let todayMin = 0, todayEvents = 0, todayScreens = 0, todayTasks = 0;
  for (const s of todaySessions) {
      todayMin += s.duration_min || 0;
      todayEvents += s.events || 0;
      todayScreens += s.screens || 0;
      todayTasks += s.tasks_done || 0;
  }

  // Считаем среднее в день (только по уникальным дням)
  let totalMin = 0;
  let uniqueDays = new Set();
  for (const s of merged) {
      totalMin += s.duration_min || 0;
      uniqueDays.add(s.date);
  }
  const avgPerDay = uniqueDays.size > 0 ? Math.round(totalMin / uniqueDays.size) : 0;

  // Очищаем контент
  c.innerHTML = '';

  // Отрисовка (оставляем твои родные функции)
  renderHeroRings(todayMin, avgPerDay, todayEvents, todayScreens, todayTasks);
  
  // Отрисовка остального (графики, проекты и т.д., если они есть в функции)
  // ...
  
  // Восстанавливаем скролл (если нужно)
}

