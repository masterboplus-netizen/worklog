document.addEventListener('DOMContentLoaded', () => {
  const bottomPanel = document.getElementById('bottom-panel');
  if (bottomPanel) {
    // Скрываем только при загрузке
    bottomPanel.style.display = 'none';
  }

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
