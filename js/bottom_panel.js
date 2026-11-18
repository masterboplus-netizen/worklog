document.addEventListener('DOMContentLoaded', () => {
  const bottomPanel = document.getElementById('bottom-panel');
  if (!bottomPanel) return;

  // Изначально скрываем панель
  bottomPanel.style.display = 'none';

  // Функция для показа панели только на вкладке Активность
  window.updateBottomPanel = function(tabName) {
    if (tabName === 'diary' || tabName === 'activity') {
      bottomPanel.style.display = 'flex';
    } else {
      bottomPanel.style.display = 'none';
    }
  };

  // Обработчик для кнопки выбора режимов (наша новая кнопка со стрелочкой)
  const btnModes = document.getElementById('btn-modes');
  if (btnModes) {
    btnModes.addEventListener('click', () => {
      if (typeof window.openActivityModeSheet === 'function') {
        window.openActivityModeSheet();
      }
    });
  }

  // Обработчик для кнопки календаря
  const btnCalendar = document.getElementById('btn-calendar');
  const calendarModal = document.getElementById('calendar-modal');
  if (btnCalendar && calendarModal) {
    btnCalendar.addEventListener('click', () => {
      calendarModal.classList.remove('hidden');
      if (typeof renderCalendarModal === 'function') {
        renderCalendarModal();
      }
    });
  }

  // Обработчик для кнопки фильтра (пока заглушка, но пусть будет)
  const btnFilter = document.getElementById('btn-filter');
  if (btnFilter) {
    btnFilter.addEventListener('click', () => {
      alert('Фильтры в разработке (скоро будет фильтр по тегам)');
    });
  }
});
