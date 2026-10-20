    '<circle cx="' + size/2 + '" cy="' + size/2 + '" r="' + r + '" ' +
      'fill="none" stroke="var(--bg3)" stroke-width="' + strokeWidth + '"/>' +
    '<circle cx="' + size/2 + '" cy="' + size/2 + '" r="' + r + '" ' +
      'fill="none" stroke="' + color + '" stroke-width="' + strokeWidth + '" ' +
      'stroke-dasharray="' + dash + ' ' + c + '" stroke-linecap="round" ' +
      'transform="rotate(-90 ' + size/2 + ' ' + size/2 + ')"/>' +
    '</svg>';
}

let HERO_MODE = 'today';  // today | last
let MINI_MSG_PERIOD = 'day';   // day → week → month → all
let MINI_SCR_PERIOD = 'day';
let MINI_TIME_PERIOD = 'avg';  // avg → week → month → all
const MINI_PERIODS_MSG = ['day', 'week', 'month', 'all'];
const MINI_PERIODS_TIME = ['avg', 'week', 'month', 'all'];
const MINI_LABELS = {day: 'День', week: 'Неделя', month: 'Месяц', all: 'Всё', avg: 'Среднее/день'};

function _miniRange(period) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const td = _localDate(today);
  if (period === 'day') return { from: td, to: td };
  if (period === 'week') {
    const from = new Date(today - 6 * 86400000);
    return { from: _localDate(from), to: td };
  }
  if (period === 'month') {
    const from = new Date(today.getFullYear(), today.getMonth(), 1);
    return { from: _localDate(from), to: td };
  }
  return { from: '2000-01-01', to: td };  // all
}

function _sumRange(sessions, period, field) {
  const r = _miniRange(period);
  let sum = 0;
  for (const s of sessions) {
    if (s.date >= r.from && s.date <= r.to) sum += s[field] || 0;
  }
  return sum;
}

function _valSize(val) {
  if (val === null || val === undefined) return 22;
  const str = String(val);
  if (str.indexOf('<br>') >= 0) return 16;  // 2 строки — мелкий
  const len = str.length;
  if (len <= 2) return 22;
  if (len <= 4) return 20;
  return 16;
}

function openGoalSheet() {
  // Удалить старый, если есть
  const old = document.getElementById('goal-sheet-overlay');
  if (old) old.remove();

  const curH = Math.floor(DAILY_GOAL_MIN / 60);
  const overlay = document.createElement('div');
  overlay.id = 'goal-sheet-overlay';
  overlay.className = 'goal-sheet-overlay';
  overlay.innerHTML =
    '<div class="goal-sheet" id="goal-sheet">' +
      '<button class="goal-sheet-close" aria-label="Закрыть">✕</button>' +
      '<h2 class="goal-sheet-title">Цель по времени</h2>' +
      '<div class="goal-picker" id="goal-picker">' +
        '<div class="goal-picker-spacer"></div>' +
        Array.from({length: 24}, (_, i) => i + 1).map(h =>
          '<div class="goal-picker-item' + (h === curH ? ' active' : '') + '" data-h="' + h + '">' + h + ' ч</div>'
        ).join('') +
        '<div class="goal-picker-spacer"></div>' +
      '</div>' +
      '<div class="goal-sheet-actions">' +
        '<button class="goal-cancel">Отмена</button>' +
        '<button class="goal-save">Сохранить</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(overlay);

  const picker = overlay.querySelector('#goal-picker');
  const close = () => overlay.remove();
  const save = () => {
    // Активный элемент — по центру
    const active = picker.querySelector('.goal-picker-item.active');
    const v = active ? parseInt(active.dataset.h, 10) : curH;
    if (v > 0 && v <= 24) {
      try {
        localStorage.setItem('worklog_goal_min', String(v * 60));
      } catch (e) {
        console.warn('localStorage failed:', e);
      }
      // Обновить DATA (для сохранения на сервере при следующем encrypt.py)
      if (typeof DATA !== 'undefined' && DATA) {
        DATA.daily_goal_min = v * 60;
      }
      DAILY_GOAL_MIN = v * 60;
      close();
      renderDashboard();
    }
  };

  // Скроллим к текущей
  setTimeout(() => {
    const cur = picker.querySelector('.goal-picker-item.active');
    if (cur) cur.scrollIntoView({ block: 'center' });
  }, 10);

  // При скролле — обновляем active (по центру)
  picker.addEventListener('scroll', () => {
    const rect = picker.getBoundingClientRect();
    const center = rect.top + rect.height / 2;
    let best = null, bestDist = Infinity;
    picker.querySelectorAll('.goal-picker-item').forEach(it => {
      const r = it.getBoundingClientRect();
      const d = Math.abs((r.top + r.height / 2) - center);
      if (d < bestDist) { bestDist = d; best = it; }
    });
    picker.querySelectorAll('.goal-picker-item').forEach(it => it.classList.remove('active'));
    if (best) best.classList.add('active');
  });

  overlay.querySelector('.goal-sheet-close').addEventListener('click', close);
  overlay.querySelector('.goal-cancel').addEventListener('click', close);
  overlay.querySelector('.goal-save').addEventListener('click', save);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
}

function renderHeroRings() {
  const t = calcTotals();
  const sessions = DATA.sessions || [];
  // avg за 7 дней
  const now = new Date();
  const days7 = [];
  for (let i = 6; i >= 0; i--) days7.push(new Date(now - i*86400000).toISOString().slice(0,10));
  let weekDur = 0, weekEv = 0, weekScr = 0;
  for (const ss of sessions) {
    if (days7.includes(ss.date)) {
      weekDur += ss.duration_min || 0;
      weekEv += ss.events || 0;
      weekScr += ss.screens || 0;
    }
  }
  const avgDur = weekDur / 7;
  const avgEv = weekEv / 7;
  const avgScr = weekScr / 7;

  // Логика: Сегодня / Последняя сессия
  let heroValue, heroSub, heroLabel;
  if (HERO_MODE === 'last') {
    const sorted = (DATA.sessions || []).slice().sort((a, b) => (b.date + (b.end || '')).localeCompare(a.date + (a.end || '')));
    const lastSess = sorted[0];
    heroValue = lastSess ? (lastSess.duration_min || 0) : 0;
    heroLabel = 'Последняя сессия';
    heroSub = lastSess ? (lastSess.date.slice(8, 10) + '.' + lastSess.date.slice(5, 7)) : '';
  } else {
    heroValue = t.todayMin;
    heroLabel = 'Сегодня';
    heroSub = 'Цель ' + Math.floor(DAILY_GOAL_MIN / 60) + 'ч · ' + Math.round(t.todayMin / DAILY_GOAL_MIN * 100) + '% <span class="edit-goal" style="cursor:pointer;margin-left:4px;">✏️</span>';
  }
  const pctDur = Math.round(heroValue / DAILY_GOAL_MIN * 100);
  const ringColor = pctDur >= 100 ? 'var(--green)' : 'var(--accent)';
  const todayEv = sessions.filter(x => x.date === new Date().toISOString().slice(0,10)).reduce((a,x)=>a+(x.events||0),0);
  const todayScr = sessions.filter(x => x.date === new Date().toISOString().slice(0,10)).reduce((a,x)=>a+(x.screens||0),0);
  const pctEv = avgEv > 0 ? Math.round(todayEv / avgEv * 100) : 0;
  const pctScr = avgScr > 0 ? Math.round(todayScr / avgScr * 100) : 0;

  const _sessions = DATA.sessions || [];
  const msgVal = _sumRange(_sessions, MINI_MSG_PERIOD, 'events');
  const scrVal = _sumRange(_sessions, MINI_SCR_PERIOD, 'screens');
  // timeVal: часы сверху, минуты снизу (для «Всё время» 359ч 42м)
  function _fmtH2(min) {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return h + 'ч<br>' + m + 'м';
  }
  let timeVal;
  if (MINI_TIME_PERIOD === 'avg') timeVal = fmtH(t.avgPerDay);
  else if (MINI_TIME_PERIOD === 'all') timeVal = _fmtH2(t.total);
  else timeVal = _fmtH2(_sumRange(_sessions, MINI_TIME_PERIOD, 'duration_min'));

  const div = document.createElement('div');
  div.className = 'hero-rings';

  // Большое кольцо
  div.innerHTML =
    '<div class="hero-main">' +
      '<div class="ring-wrap" style="cursor:pointer" id="hero-ring">' + renderRingSVG(pctDur, 290, 14, ringColor) +
        '<div class="ring-center">' +
          '<div class="ring-icon">' + (HERO_MODE === 'today'
            ? '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--fg-dim)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>'
            : '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--fg-dim)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2"/><path d="M9 2h6"/></svg>') + '</div>' +
          '<div class="ring-label">' + heroLabel + '</div>' +
          '<div class="ring-value">' + fmtH(heroValue) + '</div>' +
          '<div class="ring-sub">' + heroSub + '</div>' +
        '</div>' +
      '</div>' +
    '</div>' +
    '<div class="hero-mini">' +
      '<div class="mini-block" data-mini="msg">' +
        '<div class="mini-label"><div class="mini-lbl-title">Сообщения</div><div class="mini-lbl-period">' + MINI_LABELS[MINI_MSG_PERIOD] + '</div></div>' +
        '<div class="mini-ring" style="cursor:pointer">' + renderRingSVG(100, 92, 7, 'var(--green)') +
          '<div class="mini-center"><div class="mini-val" style="font-size:' + _valSize(msgVal) + 'px">' + msgVal + '</div></div>' +
        '</div>' +
      '</div>' +
      '<div class="mini-block" data-mini="scr">' +
        '<div class="mini-label"><div class="mini-lbl-title">Скрины</div><div class="mini-lbl-period">' + MINI_LABELS[MINI_SCR_PERIOD] + '</div></div>' +
        '<div class="mini-ring" style="cursor:pointer">' + renderRingSVG(100, 92, 7, 'var(--yellow)') +
          '<div class="mini-center"><div class="mini-val" style="font-size:' + _valSize(scrVal) + 'px">' + scrVal + '</div></div>' +
        '</div>' +
      '</div>' +
      '<div class="mini-block" data-mini="time">' +
        '<div class="mini-label">' + (MINI_TIME_PERIOD === 'avg' ? '<div class="mini-lbl-title">Среднее/день</div>' : '<div class="mini-lbl-title">Время</div><div class="mini-lbl-period">' + MINI_LABELS[MINI_TIME_PERIOD] + '</div>') + '</div>' +
        '<div class="mini-ring" style="cursor:pointer">' + renderRingSVG(100, 92, 7, 'var(--accent)') +
          '<div class="mini-center"><div class="mini-val" style="font-size:' + _valSize(timeVal) + 'px">' + timeVal + '</div></div>' +
        '</div>' +
      '</div>' +
    '</div>';
  // Тап на главное кольцо — переключение Сегодня / Последняя сессия
  const heroRing = div.querySelector('#hero-ring');
  if (heroRing) {
    heroRing.addEventListener('click', (ev) => {
      // Проверяем ближайший родитель — вдруг клик по вложенному элементу
      const editEl = ev.target.closest && ev.target.closest('.edit-goal');
      if (editEl) {
        ev.stopPropagation();
        ev.preventDefault();
        openGoalSheet();
        return;
      }
      HERO_MODE = HERO_MODE === 'today' ? 'last' : 'today';
      renderDashboard();
    });
  }

  // Тап на малые кольца — циклическое переключение периода
  div.querySelectorAll('.mini-block').forEach(block => {
    const ring = block.querySelector('.mini-ring');
    if (!ring) return;
    ring.addEventListener('click', () => {
      const type = block.dataset.mini;
      if (type === 'msg') MINI_MSG_PERIOD = MINI_PERIODS_MSG[(MINI_PERIODS_MSG.indexOf(MINI_MSG_PERIOD) + 1) % MINI_PERIODS_MSG.length];
      else if (type === 'scr') MINI_SCR_PERIOD = MINI_PERIODS_MSG[(MINI_PERIODS_MSG.indexOf(MINI_SCR_PERIOD) + 1) % MINI_PERIODS_MSG.length];
      else if (type === 'time') MINI_TIME_PERIOD = MINI_PERIODS_TIME[(MINI_PERIODS_TIME.indexOf(MINI_TIME_PERIOD) + 1) % MINI_PERIODS_TIME.length];
      renderDashboard();
    });
  });

  return div;
}

function fmtH(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? h + 'ч ' + m + 'м' : m + 'м';
}

function calcTotals() {
  const now = new Date();
  const today = _localDate(now);
  const weekAgo = _localDate(new Date(now - 7 * 86400000));
  const monthAgo = _localDate(new Date(now - 30 * 86400000));

  const base = DATA.baseline || {};
  const baseMin = base.minutes || 0;
  const baseMsgs = base.messages || 0;

  let total = 0, week = 0, month = 0, todayMin = 0, screens = 0, msgs = 0;
  for (const s of DATA.sessions || []) {
    total += s.duration_min || 0;
    if (s.date >= weekAgo) week += s.duration_min || 0;
    if (s.date >= monthAgo) month += s.duration_min || 0;
    if (s.date === today) todayMin += s.duration_min || 0;
    screens += s.screens || 0;
    msgs += s.events || 0;
  }
  // Базовая линия (архив) — только в «Всего» и в общих счётчиках
  const uniqueDays = new Set((DATA.sessions || []).map(x => x.date)).size;
  return {
    total: total + baseMin,
    totalNoBase: total,
    week,
    month,
    todayMin,
    screens,
    msgs: msgs + baseMsgs,
    count: (DATA.sessions || []).length,
    daysCount: uniqueDays,
    avgPerDay: Math.round(total / Math.max(1, uniqueDays))
  };
}

function renderMetrics() {
  const t = calcTotals();
  const div = document.createElement('div');
  div.className = 'metrics';
  const items = [
    ['Сегодня',  fmtH(t.todayMin), true],
    ['7 дней',   fmtH(t.week),     true],
    ['30 дней',  fmtH(t.month),    false],
    ['Всего',    fmtH(t.total),    false],
