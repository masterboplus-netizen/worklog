document.addEventListener('DOMContentLoaded', () => {
  const bottomPanel = document.getElementById('bottom-panel');
  if (!bottomPanel) return;

  // По умолчанию скрываем бар
  bottomPanel.style.display = 'none';

  // Функция, которую будет вызывать app.js при смене вкладки
  window.updateBottomPanel = function(tabName) {
    if (tabName === 'diary') {
      bottomPanel.style.display = 'flex'; // Показываем только для календаря
    } else {
      bottomPanel.style.display = 'none';  // Скрываем для всех остальных
    }
  };
});
