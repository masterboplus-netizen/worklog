// МОДУЛЬ: ТУЛБАР ВКЛАДКИ "СЕССИИ" (фильтр / календарь / Сессии-24ч)

function renderSessionsToolbar() {
  const c = document.getElementById('content-diary');
  if (!c) return;

  const old = document.getElementById('sessions-toolbar');
  if (old) old.remove();

  const toolbar = document.createElement('div');
  toolbar.id = 'sessions-toolbar';
  toolbar.innerHTML = `
    <button id="btn-filter" class="capsule" title="Фильтр">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
      </svg>
    </button>
    <button id="btn-calendar" class="capsule" title="Календарь">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2"></rect>
        <path d="M16 2v4M8 2v4M3 10h18"></path>
      </svg>
    </button>
    <div class="segmented-control">
      <button id="mode-sessions" class="${window.DIARY_MODE !== '24h' ? 'active' : ''}">Сессии</button>
      <button id="mode-24h" class="${window.DIARY_MODE === '24h' ? 'active' : ''}">24ч</button>
    </div>
  `;

  c.insertBefore(toolbar, c.firstChild);

  const btnFilter = toolbar.querySelector('#btn-filter');
  const btnCalendar = toolbar.querySelector('#btn-calendar');
  const modal = document.getElementById('calendar-modal');
  const btnSessions = toolbar.querySelector('#mode-sessions');
  const btn24h = toolbar.querySelector('#mode-24h');

  if (btnFilter) {
    btnFilter.addEventListener('click', () => alert('Фильтры в разработке'));
  }
  if (btnCalendar && modal) {
    btnCalendar.addEventListener('click', () => {
      alert('Кнопка Календарь нажата (из sessions_toolbar.js)');
      modal.classList.remove('hidden');
      if (typeof renderCalendarModal === 'function') renderCalendarModal();
    });
  }
  if (btnSessions && btn24h) {
    btnSessions.addEventListener('click', () => {
      btnSessions.classList.add('active');
      btn24h.classList.remove('active');
      window.DIARY_MODE = 'sessions';
      if (typeof renderDiary === 'function') renderDiary();
    });
    btn24h.addEventListener('click', () => {
      btn24h.classList.add('active');
      btnSessions.classList.remove('active');
      window.DIARY_MODE = '24h';
      if (typeof renderDiary === 'function') renderDiary();
    });
  }
}
