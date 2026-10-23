const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);
const PIN_KEY = 'worklog_pin';
const PIN_LEN = 6;
let DATA = null;
let PIN_BUF = '';

function init() {
  setupPinPad();
  const btnLock = $('#btn-lock');
  if (btnLock) btnLock.addEventListener('click', lock);
  
  const tabDash = document.getElementById('tab-dashboard');
  const tabDiary = document.getElementById('tab-diary');
  const tabProj = document.getElementById('tab-projects');
  const tabAct = document.getElementById('tab-activity');
  if (tabDash) tabDash.addEventListener('click', () => switchTab('dashboard'));
  if (tabDiary) tabDiary.addEventListener('click', () => switchTab('diary'));
  if (tabProj) tabProj.addEventListener('click', () => switchTab('projects'));
  if (tabAct) tabAct.addEventListener('click', () => switchTab('activity'));

  const saved = localStorage.getItem(PIN_KEY);
  if (saved) {
    tryUnlock(saved).then(ok => {
      if (ok) { 
        // ЖЕСТКО УДАЛЯЕМ ЛОУДЕР ПРИ АВТОВХОДЕ
        const l = document.getElementById('loading');
        if (l) l.remove();
        
        renderDashboard(); 
        showScreen('dashboard'); 
      }
      else { 
        localStorage.removeItem(PIN_KEY); 
        showScreen('pin-screen'); 
      }
    });
  } else {
    // Показываем лоадер только при самом первом запуске
    const loadingEl = document.getElementById('loading');
    if (loadingEl) loadingEl.classList.remove('hidden');
    
    setTimeout(() => {
      if (loadingEl) loadingEl.classList.add('hidden');
      showScreen('pin-screen');
    }, 1000);
  }
}

function showScreen(name) {
  ['pin-screen', 'dashboard'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    if (id === name) el.classList.remove('hidden');
    else el.classList.add('hidden');
  });
  const tabs = document.querySelector('.tabs');
  if (tabs) tabs.style.display = (name === 'dashboard') ? 'flex' : 'none';
}

function setupPinPad() {
  $$('.pin-pad button').forEach(btn => {
    btn.addEventListener('click', () => onPinKey(btn.dataset.d));
  });
}

function onPinKey(key) {
  if (key === 'clear') PIN_BUF = '';
  else if (key === 'del') PIN_BUF = PIN_BUF.slice(0, -1);
  else { if (PIN_BUF.length >= PIN_LEN) return; PIN_BUF += key; }
  updatePinDisplay();
  if (PIN_BUF.length === PIN_LEN) submitPin(PIN_BUF);
}

function updatePinDisplay() {
  const disp = $('#pin-display');
  if (!disp) return;
  disp.innerHTML = '';
  for (let i = 0; i < PIN_LEN; i++) {
    const dot = document.createElement('div');
    dot.className = 'dot' + (i < PIN_BUF.length ? ' filled' : '');
    disp.appendChild(dot);
  }
  const err = $('#pin-error');
  if (err) err.textContent = '';
}

async function tryUnlock(pin) {
  try {
    const resp = await fetch('data.encrypted.json?_=' + Date.now());
    if (!resp.ok) throw new Error('fetch');
    const enc = await resp.json();
    DATA = await decryptData(pin, enc);
    return true;
  } catch(e) { return false; }
}

async function submitPin(pin) {
  const ok = await tryUnlock(pin);
  if (ok) {
    localStorage.setItem(PIN_KEY, pin);
    
    // ЖЕСТКО УДАЛЯЕМ ЛОУДЕР
    const l = document.getElementById('loading');
    if (l) l.remove();

    renderDashboard();
    showScreen('dashboard');
  } else {
    PIN_BUF = '';
    updatePinDisplay();
    const err = $('#pin-error');
    if (err) err.textContent = 'Неверный PIN';
  }
}

function lock() {
  localStorage.removeItem(PIN_KEY);
  DATA = null;
  PIN_BUF = '';
  updatePinDisplay();
  showScreen('pin-screen');
}

function switchTab(name) {
  ['content', 'content-diary', 'content-projects', 'content-activity'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  });
  const tabs = document.querySelectorAll('.tab');
  tabs.forEach(t => t.classList.remove('tab-active'));
  
  if (name === 'diary') {
    document.getElementById('content-diary').classList.remove('hidden');
    document.getElementById('tab-diary').classList.add('tab-active');
    renderDiary(); // <--- ВЫЗЫВАЕМ РЕНДЕР ДНЕВНИКА
  } else if (name === 'projects') {
    const cProj = document.getElementById('content-projects');
    cProj.classList.remove('hidden');
    cProj.innerHTML = '';
    cProj.appendChild(renderProjects()); // Вставляем карточки
    document.getElementById('tab-projects').classList.add('tab-active');
  } else if (name === 'activity') {
    document.getElementById('content-activity').classList.remove('hidden');
    document.getElementById('tab-activity').classList.add('tab-active');
  } else {
    document.getElementById('content').classList.remove('hidden');
    document.getElementById('tab-dashboard').classList.add('tab-active');
  }
}


// === ДНЕВНИК ===
function renderDiary() {
  const c = document.getElementById('content-diary');
  if (!c || !DATA) return;
  c.innerHTML = '';

  const list = (DATA.sessions || []).slice().sort((a, b) =>
    (b.date + (b.start || '')).localeCompare(a.date + (a.start || ''))
  );

  if (!list.length) {
    c.innerHTML = '<div class="empty"><div class="empty-icon">📭</div>Нет записей</div>';
    return;
  }

  const projName = {};
  for (const p of DATA.projects || []) projName[p.id] = p.name;

  // === Склейка через полночь ===
  const _sorted = list.slice().sort((a, b) => (a.date + (a.start || '')).localeCompare(b.date + (b.start || '')));
  const _merged = [];
  for (const ss of _sorted) {
    const last = _merged[_merged.length - 1];
    if (last && (last.end === '23:59' || last.end === '00:00') && ss.start === '00:00') {
      const lastDate = new Date(last.date + 'T00:00:00');
      const curDate = new Date(ss.date + 'T00:00:00');
      if (Math.round((curDate - lastDate) / 86400000) === 1) {
        last.end = ss.end;
        last.duration_min = (last.duration_min || 0) + (ss.duration_min || 0);
        last.events = (last.events || 0) + (ss.events || 0);
        last.screens = (last.screens || 0) + (ss.screens || 0);
        last.note = [(last.note || ''), (ss.note || '')].filter(Boolean).join(' / ');
        last._isMerged = true;
        continue;
      }
    }
    const _c = Object.assign({}, ss);
    if (!_c.note) _c.note = '';
    if (!_c.duration_min) _c.duration_min = 0;
    if (!_c.events) _c.events = 0;
    if (!_c.screens) _c.screens = 0;
    _merged.push(_c);
  }

  const byDate = {};
  for (const ss of _merged) {
    if (!byDate[ss.date]) byDate[ss.date] = [];
    byDate[ss.date].push(ss);
  }

  const dates = Object.keys(byDate).sort((a, b) => b.localeCompare(a));
  for (const d of dates) {
    const header = document.createElement('div');
    header.className = 'diary-date';
    header.textContent = formatDiaryDate(d);
    c.appendChild(header);

    const _sortedSess = byDate[d].slice().sort((a, b) => (b.start || '').localeCompare(a.start || ''));
    for (const s of _sortedSess) {
      const item = document.createElement('div');
      item.className = 'diary-item';
      const timeRange = (s.start || '?') + ' → ' + (s.end || '?');
      const dur = fmtH(s.duration_min || 0);
      const proj = projName[s.project] || s.project || '–';
      const note = s.note || '';
      const evs = s.events || 0;
      const scrs = s.screens || 0;
      const counters = (evs || scrs) ? ('📨 ' + evs + ' · 📸 ' + scrs) : '';
      item.innerHTML =
        '<div class="diary-time">' + timeRange + ' · <span class="diary-dur">' + dur + '</span></div>' +
        '<div class="diary-proj">' + proj + '</div>' +
        (counters ? '<div class="diary-counters">' + counters + '</div>' : '') +
        (note ? '<div class="diary-note">' + note + '</div>' : '');
      c.appendChild(item);
    }
  }
}

function formatDiaryDate(iso) {
  const months = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
  const days = ['вс','пн','вт','ср','чт','пт','сб'];
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d.getTime())) return iso;
  return d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear() + ', ' + days[d.getDay()];
}


// === ПРОЕКТЫ (ОРИГИНАЛ) ===
function renderProjects() {
  const sec = document.createElement('div');
  sec.className = 'section';

  const byProj = {};
  for (const s of DATA.sessions || []) {
    byProj[s.project] = (byProj[s.project] || 0) + (s.duration_min || 0);
  }

  const base = DATA.baseline || {};
  if (base.minutes && base.project) {
    byProj[base.project] = (byProj[base.project] || 0) + base.minutes;
  } else if (base.minutes) {
    const firstId = (DATA.projects || [])[0]?.id;
    if (firstId) byProj[firstId] = (byProj[firstId] || 0) + base.minutes;
  }

  for (const p of DATA.projects || []) {
    const hrs = byProj[p.id] || 0;

    let totalItems = 0, doneItems = 0;
    for (const ph of p.plan || []) {
      const items = ph.items || [];
      totalItems += items.length;
      doneItems += items.filter(it => typeof it === 'object' && it.done).length;
    }
    const pct = totalItems ? Math.round(doneItems / totalItems * 100) : 0;

    const card = document.createElement('div');
    card.className = 'project-card';
    card.style.marginBottom = '16px';
    card.style.marginTop = '16px';
    card.style.marginLeft = '16px';
    card.style.marginRight = '16px';
    card.innerHTML =
      '<div class="project-head">' +
        '<div class="project-name">' +
          '<span class="project-dot" style="background:' + (p.color || '#4A9EFF') + '"></span>' +
          p.name +
        '</div>' +
        '<div class="project-hours">' + fmtH(hrs) + '</div>' +
      '</div>' +
      '<div class="progress-bar"><div class="progress-fill" style="width:' + pct +
        '%;background:' + (p.color || '#4A9EFF') + '"></div></div>' +
      '<div class="project-meta">Выполнено: ' + doneItems + ' из ' + totalItems +
        ' (' + pct + '%) · ' + (p.status || '') + '</div>';

    const phasesDiv = document.createElement('div');
    phasesDiv.className = 'phases';
    for (const ph of p.plan || []) {
      const items = ph.items || [];
      const total = items.length;
      const done = items.filter(it => typeof it === 'object' && it.done).length;
      const phPct = total ? Math.round(done / total * 100) : 0;
      const statusIcon = phPct === 100 ? '✅' : (phPct > 0 ? '🟡' : '📋');

      const phDiv = document.createElement('div');
      phDiv.className = 'phase';
      phDiv.innerHTML =
        '<div class="phase-head"><span class="phase-arrow"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg></span>' +
          '<span class="phase-icon">' + statusIcon + '</span>' +
          '<span class="phase-name">' + ph.phase + '</span>' +
          '<span class="phase-pct">' + phPct + '%</span>' +
        '</div>' +
        '<div class="phase-bar"><div class="phase-fill" style="width:' + phPct +
          '%;background:' + (p.color || '#4A9EFF') + '"></div></div>';

      const itemsList = document.createElement('div');
      itemsList.className = 'phase-items hidden';
      for (const it of items) {
        if (typeof it === 'object') {
          const line = document.createElement('div');
          line.className = 'phase-item' + (it.done ? ' done' : '');
          line.textContent = (it.done ? '✅ ' : '⏳ ') + it.text;
          itemsList.appendChild(line);
        }
      }
      phDiv.appendChild(itemsList);

      phDiv.addEventListener('click', () => {
        phDiv.classList.toggle('open');
        itemsList.classList.toggle('hidden');
      });

      phasesDiv.appendChild(phDiv);
    }
    phasesDiv.classList.add('hidden');
    card.appendChild(phasesDiv);

    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'project-actions';
    actionsDiv.innerHTML =
      '<button class="project-btn project-open-btn"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg><span>Открыть</span></button>' +
      '<button class="project-btn project-analytics-btn" data-proj="' + p.id + '"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><rect x="7" y="10" width="3" height="7" fill="currentColor" stroke="none"/><rect x="12" y="6" width="3" height="11" fill="currentColor" stroke="none"/><rect x="17" y="13" width="3" height="4" fill="currentColor" stroke="none"/></svg><span>Аналитика</span></button>';

    const openBtn = actionsDiv.querySelector('.project-open-btn');
    const anBtn = actionsDiv.querySelector('.project-analytics-btn');

    openBtn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      phasesDiv.classList.toggle('hidden');
      const isHidden = phasesDiv.classList.contains('hidden');
      openBtn.querySelector('path').setAttribute('d', isHidden ? 'M6 9l6 6 6-6' : 'M6 15l6-6 6 6');
      openBtn.querySelector('span').textContent = isHidden ? 'Открыть' : 'Свернуть';
    });

    anBtn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      // Заглушка для аналитики (пока не перенесли)
      alert('Аналитика проекта: ' + p.name);
    });

    card.insertBefore(actionsDiv, phasesDiv);
    sec.appendChild(card);
  }

  return sec;
}

// === РЕНДЕР ДАШБОРДА (Кольца) ===

function renderRingSVG(percent, size, strokeWidth, color) {
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(100, percent));
  const dash = c * p / 100;
  return '<svg width="' + size + '" height="' + size + '" class="ring-svg">' +
    '<circle cx="' + size/2 + '" cy="' + size/2 + '" r="' + r + '" fill="none" stroke="var(--bg3)" stroke-width="' + strokeWidth + '"/>' +
    '<circle cx="' + size/2 + '" cy="' + size/2 + '" r="' + r + '" fill="none" stroke="' + color + '" stroke-width="' + strokeWidth + '" stroke-dasharray="' + dash + ' ' + c + '" stroke-linecap="round" transform="rotate(-90 ' + size/2 + ' ' + size/2 + ')"/>' +
    '</svg>';
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
  const uniqueDays = new Set((DATA.sessions || []).map(x => x.date)).size;
  return {
    total: total + baseMin, totalNoBase: total, week, month, todayMin, screens, msgs: msgs + baseMsgs,
    count: (DATA.sessions || []).length, daysCount: uniqueDays, avgPerDay: Math.round(total / Math.max(1, uniqueDays))
  };
}

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

let HERO_MODE = 'today';
let MINI_MSG_PERIOD = 'day';
let MINI_SCR_PERIOD = 'day';
let MINI_TIME_PERIOD = 'avg';
const MINI_PERIODS_MSG = ['day', 'week', 'month', 'all'];
const MINI_PERIODS_TIME = ['avg', 'week', 'month', 'all'];
const MINI_LABELS = {day: 'День', week: 'Неделя', month: 'Месяц', all: 'Всё', avg: 'Среднее/день'};

function renderDashboard() {
  if (!DATA) return;
  const c = document.getElementById('content');
  if (!c) return;
  c.innerHTML = '';
  
  const t = calcTotals();
  const sessions = DATA.sessions || [];
  const msgVal = _sumRange(sessions, MINI_MSG_PERIOD, 'events');
  const scrVal = _sumRange(sessions, MINI_SCR_PERIOD, 'screens');
  const timeVal = MINI_TIME_PERIOD === 'avg' ? fmtH(t.avgPerDay) : (MINI_TIME_PERIOD === 'all' ? Math.floor(t.total/60)+'ч<br>'+(t.total%60)+'м' : Math.floor(_sumRange(sessions, MINI_TIME_PERIOD, 'duration_min')/60)+'ч<br>'+(_sumRange(sessions, MINI_TIME_PERIOD, 'duration_min')%60)+'м');

  let heroValue = t.todayMin, heroLabel = 'Сегодня', heroSub = 'Цель 12ч · ' + Math.round(t.todayMin / 720 * 100) + '%';
  if (HERO_MODE === 'last') {
    const sorted = sessions.slice().sort((a, b) => (b.date + (b.end || '')).localeCompare(a.date + (a.end || '')));
    const lastSess = sorted[0];
    heroValue = lastSess ? (lastSess.duration_min || 0) : 0;
    heroLabel = 'Последняя сессия';
    heroSub = lastSess ? (lastSess.date.slice(8, 10) + '.' + lastSess.date.slice(5, 7)) : '';
  }
  
  const pctDur = Math.round(heroValue / 720 * 100); // Пока цель хардкод 720 (12ч)
  const ringColor = pctDur >= 100 ? 'var(--green)' : 'var(--accent)';

  const div = document.createElement('div');
  div.className = 'hero-rings';
  div.innerHTML = 
    '<div class="hero-main"><div class="ring-wrap" style="cursor:pointer" id="hero-ring">' + renderRingSVG(pctDur, 290, 14, ringColor) +
      '<div class="ring-center"><div class="ring-icon">' + (HERO_MODE === 'today' ? '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--fg-dim)" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>' : '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--fg-dim)" stroke-width="2"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2"/><path d="M9 2h6"/></svg>') + '</div>' +
      '<div class="ring-label">' + heroLabel + '</div><div class="ring-value">' + fmtH(heroValue) + '</div><div class="ring-sub">' + heroSub + '</div></div></div></div>' +
    '<div class="hero-mini"><div class="mini-block"><div class="mini-label"><div class="mini-lbl-title">Сообщения</div><div class="mini-lbl-period">' + MINI_LABELS[MINI_MSG_PERIOD] + '</div></div><div class="mini-ring" style="cursor:pointer">' + renderRingSVG(100, 92, 7, 'var(--green)') + '<div class="mini-center"><div class="mini-val" style="font-size:22px">' + msgVal + '</div></div></div></div>' +
      '<div class="mini-block"><div class="mini-label"><div class="mini-lbl-title">Скрины</div><div class="mini-lbl-period">' + MINI_LABELS[MINI_SCR_PERIOD] + '</div></div><div class="mini-ring" style="cursor:pointer">' + renderRingSVG(100, 92, 7, 'var(--yellow)') + '<div class="mini-center"><div class="mini-val" style="font-size:22px">' + scrVal + '</div></div></div></div>' +
      '<div class="mini-block"><div class="mini-label">' + (MINI_TIME_PERIOD === 'avg' ? '<div class="mini-lbl-title">Среднее/день</div>' : '<div class="mini-lbl-title">Время</div><div class="mini-lbl-period">' + MINI_LABELS[MINI_TIME_PERIOD] + '</div>') + '</div><div class="mini-ring" style="cursor:pointer">' + renderRingSVG(100, 92, 7, 'var(--accent)') + '<div class="mini-center"><div class="mini-val" style="font-size:' + (String(timeVal).includes('<br>') ? '16' : '22') + 'px">' + timeVal + '</div></div></div></div></div>';
  
  c.appendChild(div);

  // Оживляем кольца
  const heroRing = div.querySelector('#hero-ring');
  if (heroRing) {
    heroRing.addEventListener('click', () => {
      HERO_MODE = HERO_MODE === 'today' ? 'last' : 'today';
      renderDashboard();
    });
  }

  div.querySelectorAll('.mini-block').forEach((block, index) => {
    const ring = block.querySelector('.mini-ring');
    if (ring) {
      ring.addEventListener('click', () => {
        if (index === 0) MINI_MSG_PERIOD = MINI_PERIODS_MSG[(MINI_PERIODS_MSG.indexOf(MINI_MSG_PERIOD) + 1) % MINI_PERIODS_MSG.length];
        else if (index === 1) MINI_SCR_PERIOD = MINI_PERIODS_MSG[(MINI_PERIODS_MSG.indexOf(MINI_SCR_PERIOD) + 1) % MINI_PERIODS_MSG.length];
        else if (index === 2) MINI_TIME_PERIOD = MINI_PERIODS_TIME[(MINI_PERIODS_TIME.indexOf(MINI_TIME_PERIOD) + 1) % MINI_PERIODS_TIME.length];
        renderDashboard();
      });
    }
  });
}
// Запуск
window.addEventListener('DOMContentLoaded', init);
