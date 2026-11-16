document.addEventListener('DOMContentLoaded', () => {
  const bottomPanel = document.getElementById('bottom-panel');
  if (!bottomPanel) return;

  // По умолчанию скрываем бар
  bottomPanel.style.display = 'none';

  // Функция, которую будет вызывать app.js при смене вкладки
  window.updateBottomPanel = function(tabName) {
  alert('updateBottomPanel вызван с tabName: ' + tabName);
    if (tabName === 'diary') {
      bottomPanel.style.display = 'flex'; // Показываем только для календаря
    } else {
      bottomPanel.style.display = 'none';  // Скрываем для всех остальных
    }
  };

  // Кнопки внутри бара
  const btnFilter = document.getElementById('btn-filter');
  const btnCalendar = document.getElementById('btn-calendar');
  const modal = document.getElementById('calendar-modal');
  
  if (btnFilter) btnFilter.addEventListener('click', () => alert('Фильтры в разработке'));
  if (btnCalendar && modal) {
    btnCalendar.addEventListener('click', () => {
    alert('Кнопка Календарь нажата');
      modal.classList.remove('hidden');
      if (typeof renderCalendarModal === 'function') renderCalendarModal();
    });
  }
});

// Логика переключателя Сессии / 24ч
document.addEventListener('DOMContentLoaded', () => {
  const btnSessions = document.getElementById('mode-sessions');
  const btn24h = document.getElementById('mode-24h');
  
  if (btnSessions && btn24h) {
    btnSessions.addEventListener('click', () => {
      btnSessions.classList.add('active');
      btn24h.classList.remove('active');
      if (typeof DIARY_MODE !== 'undefined') DIARY_MODE = 'sessions';
      if (typeof renderDiary === 'function') renderDiary();
    });
    
    btn24h.addEventListener('click', () => {
      btn24h.classList.add('active');
      btnSessions.classList.remove('active');
      if (typeof DIARY_MODE !== 'undefined') DIARY_MODE = '24h';
      if (typeof renderDiary === 'function') renderDiary();
    });
  }
});
