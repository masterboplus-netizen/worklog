
// --- МОДУЛЬ: Авторизация и PIN ---
const PIN_KEY = 'worklog_pin';
const PIN_LEN = 6;
let PIN_BUF = '';
window.DATA = null;

function setupPinPad() {
  $$('.pin-pad button').forEach(btn => {
    btn.addEventListener('click', () => onPinKey(btn.dataset.d));
  });
  document.addEventListener('keydown', (e) => {
    const _ps = $('#pin-screen');
    if (!_ps || _ps.classList.contains('hidden')) return;
    if (e.key >= '0' && e.key <= '9') onPinKey(e.key);
    else if (e.key === 'Backspace') onPinKey('del');
    else if (e.key === 'Escape') onPinKey('clear');
  });
}

async function onPinKey(key) {
  if (key === 'clear') PIN_BUF = '';
  else if (key === 'del') PIN_BUF = PIN_BUF.slice(0, -1);
  else { if (PIN_BUF.length >= PIN_LEN) return; PIN_BUF += key; }
  updatePinDisplay();
  if (PIN_BUF.length === PIN_LEN) await submitPin(PIN_BUF);
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
  DATA = null;
  PIN_BUF = '';
  if (typeof updatePinDisplay === 'function') updatePinDisplay();
  if (typeof showSafe === 'function') {
    showSafe();
  } else {
    showScreen('pin-screen'); // фолбэк
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
