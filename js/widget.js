// ВИДЖЕТ-КАПСУЛА (ФИНАЛ, строго по MasterBoss)

const CAPSULE_ITEMS = [
    { id: 'dashboard', title: 'Дашборд', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12l9-9 9 9"/><path d="M5 10v10h14V10"/></svg>' },
    { id: 'diary', title: 'Календарь', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>' },
    { id: 'projects', title: 'Проекты', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7h18v13H3z"/><path d="M3 7l2-4h14l2 4"/><path d="M12 11v6"/></svg>' },
    { id: 'activity', title: 'График', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>' }
];

function renderCapsule() {
  const container = document.getElementById('capsule-dynamic-items');
  if (!container) return;

  let config = localStorage.getItem('widget_config');
  if (!config) {
    config = [
      { id: 'dashboard', enabled: true },
      { id: 'diary', enabled: true },
      { id: 'projects', enabled: true },
      { id: 'activity', enabled: true }
    ];
    localStorage.setItem('widget_config', JSON.stringify(config));
  } else {
    config = JSON.parse(config);
  }

  let html = '';
  config.forEach(cfg => {
    if (cfg.enabled) {
      const item = CAPSULE_ITEMS.find(i => i.id === cfg.id);
      if (item) {
        html += `<div class="nav-item" id="${item.id}" onclick="switchTab('${item.id}')" style="display: flex; align-items: center; justify-content: center; width: 50px; height: 50px; flex-direction: column; cursor: pointer; gap: 2px; color: var(--fg);">
          ${item.icon}
          <span style="font-size:9px; text-align:center; line-height:1;">${item.title}</span>
        </div>`;
      }
    }
  });
  container.innerHTML = html;
}

function initFloatingMenu() {
  // Проверяем, есть ли уже контейнер, если нет — создаем
  let wrapper = document.getElementById('floating-capsule-wrapper');
  if (!wrapper) {
    wrapper = document.createElement('div');
    wrapper.id = 'floating-capsule-wrapper';
    wrapper.style.cssText = 'position: fixed; right: 0; top: 50%; transform: translateY(-50%); z-index: 9999; display: flex; align-items: center;';

    wrapper.innerHTML = `
      <div id="floating-capsule" style="display: flex; flex-direction: column; gap: 8px; background: var(--bg2); padding: 12px 4px; border: 1px solid var(--border); border-right: none; border-radius: 16px 0 0 16px; box-shadow: -4px 0 12px rgba(0,0,0,0.5); transition: transform 0.3s ease;">
        <div id="capsule-dynamic-items" style="display: flex; flex-direction: column; gap: 8px;"></div>
      </div>
      <button id="toggle-capsule" style="width: 20px; height: 60px; background: var(--bg2); border: 1px solid var(--border); border-left: none; border-radius: 0 8px 8px 0; color: var(--fg); cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
        <svg id="toggle-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="transition: transform 0.3s;"><path d="M15 18l-6-6 6-6"/></svg>
      </button>
    `;
    document.body.appendChild(wrapper);
  }

  const capsule = document.getElementById('floating-capsule');
  const toggleBtn = document.getElementById('toggle-capsule');
  const toggleIcon = document.getElementById('toggle-icon');
  const container = document.getElementById('capsule-dynamic-items');

  renderCapsule();

  // Свайп/перетаскивание капсулы
  let isDragging = false;
  let startY = 0;
  let currentTop = wrapper.getBoundingClientRect().top;
  let isCollapsed = false;

  wrapper.addEventListener('touchstart', (e) => {
    if (e.target.closest('.nav-item') || e.target.closest('#toggle-capsule')) return;
    isDragging = true;
    startY = e.touches[0].clientY;
    currentTop = wrapper.getBoundingClientRect().top;
    wrapper.style.transition = 'none';
  }, { passive: false });

  wrapper.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    e.preventDefault();
    const deltaY = e.touches[0].clientY - startY;
    const newTop = currentTop + deltaY;
    if (newTop > 70 && newTop < window.innerHeight - wrapper.offsetHeight - 90) {
      wrapper.style.bottom = 'auto';
      wrapper.style.top = newTop + 'px';
    }
  }, { passive: false });

  wrapper.addEventListener('touchend', () => {
    if (isDragging) {
      isDragging = false;
      wrapper.style.transition = 'transform 0.3s ease';
    }
  });

  function toggleCollapse() {
    isCollapsed = !isCollapsed;
    if (isCollapsed) {
      // Прячем капсулу, оставляем только язычок
      capsule.style.transform = 'translateX(100%)';
      capsule.style.position = 'absolute';
      capsule.style.right = '20px'; // Сдвигаем влево, чтобы освободить место стрелке
      toggleIcon.style.transform = 'rotate(180deg)'; // Крутим вправо (назад)
    } else {
      capsule.style.transform = 'translateX(0)';
      capsule.style.position = 'relative';
      capsule.style.right = '0';
      toggleIcon.style.transform = 'rotate(0deg)'; // Крутим влево (открыто)
    }
  }

  toggleBtn.addEventListener('click', (e) => { e.stopPropagation(); e.preventDefault(); toggleCollapse(); });
}

document.addEventListener('DOMContentLoaded', initFloatingMenu);
