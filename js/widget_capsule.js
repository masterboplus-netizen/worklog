export const CAPSULE_ITEMS = [
  { id: 'dashboard', title: 'Дашборд', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12l9-9 9 9"/><path d="M5 10v10h14V10"/></svg>', action: "window.switchTab('dashboard')" },
  { id: 'diary', title: 'Календарь', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>', action: "window.switchTab('diary')" },
  { id: 'projects', title: 'Проекты', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7h18v13H3z"/><path d="M3 7l2-4h14l2 4"/><path d="M12 11v6"/></svg>', action: "window.switchTab('projects')" },
  { id: 'activity', title: 'График', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>', action: "window.switchTab('activity')" }
];

export function initFloatingMenu() {
  const wrapper = document.createElement('div');
  wrapper.id = 'floating-capsule-wrapper';
  wrapper.style.cssText = 'position: fixed; right: 0; top: 50%; margin-top: -150px; z-index: 9999; display: flex; align-items: center; transition: top 0.4s ease, transform 0.3s ease;';
  const capsule = document.createElement('div');
  capsule.id = 'floating-capsule';
  capsule.style.cssText = 'position: relative; display: flex; flex-direction: column; gap: 8px; background: var(--bg2); padding: 12px 8px; border: 1px solid var(--border); border-right: none; border-radius: 16px 0 0 16px; box-shadow: -4px 0 12px rgba(0,0,0,0.5); transition: transform 0.3s ease;';
  const toggleBtn = document.createElement('button');
  toggleBtn.id = 'toggle-capsule';
  toggleBtn.innerHTML = '<svg id="toggle-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>';
  // Вот здесь мы сразу поворачиваем кнопку на 180 градусов
  toggleBtn.style.cssText = 'position: absolute; left: -24px; top: 50%; transform: translateY(-50%); transition: none; width: 24px; height: 80px; background: var(--bg2); border: 1px solid var(--border); border-right: none; border-radius: 8px 0 0 8px; color: var(--fg); cursor: pointer; display: flex; align-items: center; justify-content: center; z-index: 10000;';

  CAPSULE_ITEMS.forEach(item => {
  const btn = document.createElement('div');
  btn.className = 'nav-item';
  btn.dataset.tab = item.id;
  // Подсветка активной кнопки
  btn.style.cssText = 'display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; width: 50px; height: 50px; cursor: pointer; border-radius: 8px; color: var(--fg); transition: background 0.2s;';
  btn.innerHTML = `${item.icon}<span style="font-size:9px; text-align:center; line-height:1;">${item.title}</span>`;
  
  // Если это текущая вкладка — подсвечиваем
  if (item.id === 'dashboard') {
      btn.style.background = 'var(--bg3)';
      btn.style.color = 'var(--accent)';
  }

  btn.addEventListener('click', () => {
    if (isDragging) return;
    
    // Убираем подсветку у всех
    capsule.querySelectorAll('.nav-item').forEach(el => {
        el.style.background = 'transparent';
        el.style.color = 'var(--fg)';
    });
    
    // Подсвечиваем нажатую
    btn.style.background = 'var(--bg3)';
    btn.style.color = 'var(--accent)';

    if (typeof window.switchTab === 'function') window.switchTab(item.id);
  });
  capsule.appendChild(btn);
});

  capsule.appendChild(toggleBtn);
  wrapper.appendChild(capsule);
  document.body.appendChild(wrapper);

  let isCollapsed = false, isDragging = false, startY = 0, startTop = 0;

  function toggleCollapse(force = false) {
  isCollapsed = force ? true : !isCollapsed;
  capsule.style.transform = isCollapsed ? 'translateX(100%)' : 'translateX(0)';
  
  // Вот здесь крутим иконку
  const icon = document.getElementById('toggle-icon');
  if (icon) {
      icon.style.transform = isCollapsed ? 'rotate(180deg)' : 'rotate(0deg)';
  }
}

  toggleBtn.addEventListener('click', (e) => { 
    if (isDragging) return;
    e.stopPropagation(); 
    toggleCollapse(); 
  });

  wrapper.addEventListener('touchstart', (e) => {
    if (e.target.closest('.nav-item') || e.target.closest('#toggle-capsule')) return;
    isDragging = true; startY = e.touches[0].clientY; startTop = wrapper.getBoundingClientRect().top;
    wrapper.style.transition = 'none';
  }, { passive: false });

  wrapper.addEventListener('touchmove', (e) => {
    if (!isDragging) return; e.preventDefault();
    let newTop = startTop + (e.touches[0].clientY - startY);
    newTop = Math.max(100, Math.min(newTop, window.innerHeight - wrapper.offsetHeight - 60));
    wrapper.style.top = newTop + 'px'; wrapper.style.transform = 'none';
  }, { passive: false });

  wrapper.addEventListener('touchend', () => {
    isDragging = false;
    wrapper.style.transition = 'top 0.4s ease, transform 0.3s ease';
    wrapper.style.transform = 'translateY(0)'; wrapper.style.top = wrapper.getBoundingClientRect().top + 'px';
  });

  // Проверка на сейф
  const checkSafe = () => {
    const safe = document.getElementById('scroll-pin-screen');
    if (safe && safe.style.display === 'none') {
      wrapper.style.display = 'flex';
    } else {
      wrapper.style.display = 'none';
    }
  };

  const safeScreen = document.getElementById('scroll-pin-screen');
  if (safeScreen) {
    const observer = new MutationObserver(checkSafe);
    observer.observe(safeScreen, { attributes: true, attributeFilter: ['style'] });
  }

  setTimeout(checkSafe, 500);
  setInterval(checkSafe, 500);
}