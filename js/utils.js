// МОДУЛЬ: УТИЛИТЫ
// --- МОДУЛЬ: UI (Отрисовка) ---
let HERO_MODE = 'today';
let MINI_MSG_PERIOD = 'day';
let MINI_SCR_PERIOD = 'day';
let MINI_TIME_PERIOD = 'avg';
let MINI_TASKS_PERIOD = 'day';
const MINI_PERIODS_MSG = ['day', 'week', 'month', 'all'];
const MINI_PERIODS_SCR = ['day', 'week', 'month', 'all'];
const MINI_PERIODS_TASKS = ['day', 'week', 'month', 'all'];
const MINI_PERIODS_TIME = ['avg', 'week', 'month', 'all'];
const MINI_LABELS = {day: 'День', week: 'Неделя', month: 'Месяц', all: 'Всё', avg: 'Среднее/день'};

// === ДНЕВНИК ===



window.ACTIVITY_MODE = 'sessions';
let CALENDAR_VIEW = 'month';
let CALENDAR_CURSOR = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
let CALENDAR_SELECTED_DAYS = new Set();
let CALENDAR_STRIP_SCROLL_LEFT = null;

// Переменные для графика (V1)
let CHART_OFFSET_MONTHS = 0;
let CHART_PERIOD = 30;
let CHART_METRIC = 'duration';
let CHART_SELECTED = null;












function renderRingSVG(percent, size, strokeWidth, color) {
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(100, percent));
  const dash = c * p / 100;
  const offset = c - dash;
  
  // Вращаем только сам круг, чтобы прогресс начинался ровно сверху (12 часов)
  return '<svg width="' + size + '" height="' + size + '" class="ring-svg" style="overflow: visible;">' +
    '<circle cx="' + size/2 + '" cy="' + size/2 + '" r="' + r + '" fill="none" stroke="var(--bg3)" stroke-width="' + strokeWidth + '"/>' +
    '<circle class="ring-progress" cx="' + size/2 + '" cy="' + size/2 + '" r="' + r + '" fill="none" stroke="' + color + '" stroke-width="' + strokeWidth + '" ' +
    'stroke-dasharray="' + c + '" stroke-dashoffset="' + c + '" data-target-offset="' + offset + '" ' +
    'stroke-linecap="round" transform="rotate(-90 ' + size/2 + ' ' + size/2 + ')"/>' +
    '</svg>';
}



function getProgressColor(percent) {
  if (percent < 25) return 'var(--red)';
  if (percent < 50) return 'var(--yellow)';
  if (percent < 85) return 'var(--accent)'; // Синий
  return 'var(--green)'; // Зеленый
}



// === АНИМАЦИЯ КОЛЕЦ ===




function _localDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + dd;
}

function fmtH(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? h + 'ч ' + m + 'м' : m + 'м';
}

function _sumRange(sessions, period, field) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const td = _localDate(today);
  let from = '2000-01-01';
  if (period === 'day') from = td;
  else if (period === 'week') from = _localDate(new Date(today - 6 * 86400000));
  else if (period === 'month') from = _localDate(new Date(today.getFullYear(), today.getMonth(), 1));
  
  let sum = 0;
  for (const s of sessions) {
    if (s.date >= from && s.date <= td) sum += s[field] || 0;
  }
  return sum;
}

function calcTotals() {
  const now = new Date();
  const today = _localDate(now);
  const weekAgo = _localDate(new Date(now - 7 * 86400000));
  const monthAgo = _localDate(new Date(now - 30 * 86400000));
  
  let total = 0, week = 0, month = 0, todayMin = 0, screens = 0, msgs = 0;
  const dailyTotals = {};
  
  for (const s of window.DATA.sessions || []) {
    total += s.duration_min || 0;
    if (s.date >= weekAgo) week += s.duration_min || 0;
    if (s.date >= monthAgo) month += s.duration_min || 0;
    if (s.date === today) todayMin += s.duration_min || 0;
    screens += s.screens || 0;
    msgs += s.events || 0;
    dailyTotals[s.date] = (dailyTotals[s.date] || 0) + (s.duration_min || 0);
  }
  
  const activeDays = Math.max(1, Object.keys(dailyTotals).length);
  const avgPerDay = Math.round(total / activeDays);

  return {
    total: total, totalNoBase: total, week, month, todayMin, screens, msgs,
    count: (window.DATA.sessions || []).length, daysCount: activeDays, avgPerDay: avgPerDay
  };
}





// === ГРАФИК ===





// === ШТОРКА ВЫБОРА МЕСЯЦА ===
