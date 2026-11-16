document.addEventListener('DOMContentLoaded', () => {
  const bottomPanel = document.getElementById('bottom-panel');
  if (!bottomPanel) return;

  bottomPanel.style.display = 'none';

  window.updateBottomPanel = function(tabName) {
    if (tabName === 'diary') {
      bottomPanel.style.display = 'flex';
    } else {
      bottomPanel.style.display = 'none';
    }
  };
});
