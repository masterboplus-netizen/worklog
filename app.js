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
      if (ok) { renderDashboard(); showScreen('dashboard'); }
      else { localStorage.removeItem(PIN_KEY); showScreen('pin-screen'); }
    });
  } else {
    showScreen('pin-screen');
  }
}

function showScreen(name) {
  ['pin-screen', 'dashboard', 'loading'].forEach(id => {
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
  } else if (name === 'projects') {
    document.getElementById('content-projects').classList.remove('hidden');
    document.getElementById('tab-projects').classList.add('tab-active');
  } else if (name === 'activity') {
    document.getElementById('content-activity').classList.remove('hidden');
    document.getElementById('tab-activity').classList.add('tab-active');
  } else {
    document.getElementById('content').classList.remove('hidden');
    document.getElementById('tab-dashboard').classList.add('tab-active');
  }
}

// Заглушки для рендера (чтобы не падало)
function renderDashboard() {
  if (!DATA) return;
  const c = document.getElementById('content');
  if (c) c.innerHTML = '<div style="padding:20px; text-align:center;">Данные расшифрованы!<br>ID: ' + (DATA.sessions ? DATA.sessions.length : 0) + '</div>';
}

// Запуск
window.addEventListener('DOMContentLoaded', init);
