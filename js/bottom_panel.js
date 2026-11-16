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
      modal.classList.remove('hidden');
      if (typeof renderCalendarModal === 'function') renderCalendarModal();
    });
  }
});
