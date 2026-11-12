// ТОЧНАЯ КОПИЯ ЛОГИКИ MASTERBOSS ДЛЯ ХЕРАБОРИНЫ

const CAPSULE_ITEMS = [
    { id: 'dashboard', title: 'Дашборд', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12l9-9 9 9"/><path d="M5 10v10h14V10"/></svg>', action: "switchTab('dashboard')" },
    { id: 'diary', title: 'Календарь', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>', action: "switchTab('diary')" },
    { id: 'projects', title: 'Проекты', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7h18v13H3z"/><path d="M3 7l2-4h14l2 4"/><path d="M12 11v6"/></svg>', action: "switchTab('projects')" },
    { id: 'activity', title: 'График', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>', action: "switchTab('activity')" }
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
        html += `<div class="nav-item" id="${item.id}" onclick="${item.action}" style="display: flex; flex-direction: column; align-items: center; justify-content: center; width: 50px; padding: 6px 4px; cursor: pointer; gap: 4px; color: var(--fg);">
          ${item.icon}
          <span style="font-size: 9px; text-align: center; line-height: 1;">${item.title}</span>
        </div>`;
      }
    }
  });
  container.innerHTML = html;
}

function initFloatingMenu() {
  const wrapper = document.getElementById('floating-capsule-wrapper');
  const capsule = document.getElementById('floating-capsule');
  const toggleBtn = document.getElementById('toggle-capsule');
  const toggleIcon = document.getElementById('toggle-icon');
  const container = document.getElementById('capsule-dynamic-items');

  if (!wrapper || !capsule || !toggleBtn || !container) return;

  renderCapsule();

  if (typeof Sortable !== 'undefined') {
    new Sortable(container, {
      animation: 200,
      delay: 1500,
      delayOnTouchOnly: true,
      ghostClass: 'sortable-ghost',
      dragClass: 'sortable-drag',
      onChoose: function(evt) {
        document.body.style.overflow = 'hidden';
        capsule.classList.add('capsule-shaking');
        if (navigator.vibrate) navigator.vibrate(50);
        evt.item.style.transform = 'scale(1.15)';
        evt.item.style.zIndex = '1000';
        evt.item.style.boxShadow = '0 8px 24px rgba(0,0,0,0.6)';
        evt.item.style.borderRadius = '12px';
        evt.item.style.background = 'var(--bg2)';
      },
      onUnchoose: function(evt) {
        if (!evt.item.classList.contains('sortable-drag')) {
          capsule.classList.remove('capsule-shaking');
        }
      },
      onEnd: function(evt) {
        document.body.style.overflow = '';
        capsule.classList.remove('capsule-shaking');
        setTimeout(() => {
          container.querySelectorAll('.nav-item').forEach(el => {
            el.style.transform = '';
            el.style.zIndex = '';
            el.style.boxShadow = '';
            el.style.borderRadius = '';
            el.style.background = '';
            el.style.opacity = '';
            el.classList.remove('sortable-ghost', 'sortable-drag', 'sortable-chosen', 'sortable-fallback');
          });
        }, 50);
        const newOrder = [];
        container.querySelectorAll('.nav-item').forEach(el => {
          newOrder.push({ id: el.id, enabled: true });
        });
        const savedConfig = JSON.parse(localStorage.getItem('widget_config')) || [];
        savedConfig.forEach(c => {
          if (!newOrder.find(n => n.id === c.id) && !c.enabled) {
            newOrder.push({ id: c.id, enabled: false });
          }
        });
        localStorage.setItem('widget_config', JSON.stringify(newOrder));
      }
    });
  }

  document.addEventListener('click', (e) => {
    if (capsule.classList.contains('capsule-shaking') && !e.target.closest('#floating-capsule')) {
      capsule.classList.remove('capsule-shaking');
    }
  });

  let isDragging = false;
  let startY = 0;
  let currentTop = wrapper.getBoundingClientRect().top;
  let isCollapsed = false;

  wrapper.addEventListener('touchstart', (e) => {
    if (capsule.classList.contains('capsule-shaking')) return;
    if (e.target.closest('.nav-item')) return;
    if (e.target.closest('#toggle-capsule')) return;
    isDragging = true;
    startY = e.touches[0].clientY;
    currentTop = wrapper.getBoundingClientRect().top;
    wrapper.style.transition = 'none';
  }, { passive: false });

  wrapper.addEventListener('touchmove', (e) => {
    if (!isDragging || capsule.classList.contains('capsule-shaking')) return;
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

  wrapper.addEventListener('mousedown', (e) => {
    if (capsule.classList.contains('capsule-shaking')) return;
    if (e.target.closest('.nav-item')) return;
    if (e.target.closest('#toggle-capsule')) return;
    isDragging = true;
    startY = e.clientY;
    currentTop = wrapper.getBoundingClientRect().top;
    wrapper.style.transition = 'none';
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDragging || capsule.classList.contains('capsule-shaking')) return;
    const deltaY = e.clientY - startY;
    const newTop = currentTop + deltaY;
    if (newTop > 70 && newTop < window.innerHeight - wrapper.offsetHeight - 90) {
      wrapper.style.bottom = 'auto';
      wrapper.style.top = newTop + 'px';
    }
  });

  window.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      wrapper.style.transition = 'transform 0.3s ease';
    }
  });

  function toggleCollapse() {
    isCollapsed = !isCollapsed;
    if (isCollapsed) {
      capsule.style.transform = 'translateX(100%)';
      toggleIcon.style.transform = 'rotate(180deg)';
      wrapper.style.pointerEvents = 'none';
      toggleBtn.style.pointerEvents = 'auto';
    } else {
      capsule.style.transform = 'translateX(0)';
      toggleIcon.style.transform = 'rotate(0deg)';
      wrapper.style.pointerEvents = 'auto';
    }
  }

  toggleBtn.addEventListener('click', (e) => { e.stopPropagation(); e.preventDefault(); toggleCollapse(); });
  toggleBtn.addEventListener('touchend', (e) => { e.preventDefault(); toggleCollapse(); });
}

document.addEventListener('DOMContentLoaded', initFloatingMenu);
