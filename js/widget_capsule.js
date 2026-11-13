export const CAPSULE_ITEMS = [
  { id: 'dashboard', title: 'Дашборд', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12l9-9 9 9"/><path d="M5 10v10h14V10"/></svg>', action: "window.switchTab('dashboard')" },
  { id: 'diary', title: 'Календарь', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>', action: "window.switchTab('diary')" },
  { id: 'projects', title: 'Проекты', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7h18v13H3z"/><path d="M3 7l2-4h14l2 4"/><path d="M12 11v6"/></svg>', action: "window.switchTab('projects')" },
  { id: 'activity', title: 'График', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>', action: "window.switchTab('activity')" }
];

export function initFloatingMenu() {
  const wrapper = document.createElement('div');
  wrapper.id = 'floating-capsule-wrapper';
  wrapper.style.cssText = 'position: fixed; right: 0; top: 50%; transform: translateY(-50%); z-index: 9999; display: flex; align-items: center; transition: top 0.4s ease, transform 0.3s ease;';

  const capsule = document.createElement('div');
  capsule.id = 'floating-capsule';
  capsule.style.cssText = 'position: relative; display: flex; flex-direction: column; gap: 8px; background: var(--bg2); padding: 12px 8px; border: 1px solid var(--border); border-right: none; border-radius: 16px 0 0 16px; box-shadow: -4px 0 12px rgba(0,0,0,0.5); transition: transform 0.3s ease;';

  const toggleBtn = document.createElement('button');
  toggleBtn.id = 'toggle-capsule';
  toggleBtn.innerHTML = '<svg id="toggle-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="transition: transform 0.3s ease;"><path d="M15 18l-6-6 6-6"/></svg>';
  toggleBtn.style.cssText = 'position: absolute; left: -24px; top: 50%; transform: translateY(-50%); width: 24px; height: 80px; background: var(--bg2); border: 1px solid var(--border); border-right: none; border-radius: 8px 0 0 8px; color: var(--fg); cursor: pointer; display: flex; align-items: center; justify-content: center;';

  CAPSULE_ITEMS.forEach(item => {
    const btn = document.createElement('div');
    btn.className = 'nav-item';
    btn.dataset.tab = item.id;
    btn.style.cssText = 'display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; width: 50px; height: 50px; cursor: pointer; border-radius: 8px; color: var(--fg);';
    btn.innerHTML = `${item.icon}<span style="font-size:9px; text-align:center; line-height:1;">${item.title}</span>`;
    btn.title = item.title;
    btn.addEventListener('click', (e) => {
      if (isDragging) return;
      if (typeof window.switchTab === 'function') window.switchTab(item.id);
      setTimeout(checkSheetAndMove, 100);
    });
    capsule.appendChild(btn);
  });

  capsule.appendChild(toggleBtn);
  wrapper.appendChild(capsule);
  document.body.appendChild(wrapper);

  let isCollapsed = false;
  let isDragging = false;
  let startY = 0;
  let startTop = 0;

  function checkSheetAndMove() {
    const pinScreen = document.getElementById('scroll-pin-screen');
    if (pinScreen && pinScreen.style.display !== 'none' && !pinScreen.classList.contains('hidden')) {
      wrapper.style.display = 'none';
      return;
    } else {
    }
    }

    const sheet = document.getElementById('calendar-sheet');
    if (sheet && sheet.classList.contains('open')) {
      const sheetHeight = sheet.offsetHeight || (window.innerHeight * 0.8);
      const capsuleHeight = wrapper.offsetHeight || 300;
      const newTop = window.innerHeight - sheetHeight - capsuleHeight - 20;
        if (newTop > 60) {
        wrapper.style.top = newTop + 'px';
        wrapper.style.transform = 'none';
        return;
      }
    }

      wrapper.style.top = '50%';
      wrapper.style.transform = 'translateY(-50%)';
    }
  }
  function toggleCollapse(force = false) {
    isCollapsed = force ? true : !isCollapsed;
    if (isCollapsed) {
      capsule.style.transform = 'translateX(100%)';
      document.getElementById('toggle-icon').style.transform = 'rotate(0deg)';
    } else {
      capsule.style.transform = 'translateX(0)';
      document.getElementById('toggle-icon').style.transform = 'rotate(180deg)';
    }
  }

  toggleBtn.addEventListener('click', (e) => { 
    if (isDragging) return;
    e.stopPropagation(); 
    toggleCollapse(); 
  });

  wrapper.addEventListener('touchstart', (e) => {
    if (e.target.closest('.nav-item') || e.target.closest('#toggle-capsule')) return;
    isDragging = true;
    startY = e.touches[0].clientY;
    startTop = wrapper.getBoundingClientRect().top;
    wrapper.style.transition = 'none';
  }, { passive: false });

  wrapper.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    e.preventDefault();
    const deltaY = e.touches[0].clientY - startY;
    let newTop = startTop + deltaY;
    const minTop = 100;
    const maxTop = window.innerHeight - wrapper.offsetHeight - 60;
    if (newTop < minTop) newTop = minTop;
    if (newTop > maxTop) newTop = maxTop;
    wrapper.style.top = newTop + 'px';
    wrapper.style.transform = 'none';
  }, { passive: false });

  wrapper.addEventListener('touchend', () => {
    isDragging = false;
    wrapper.style.transition = 'top 0.4s ease, transform 0.3s ease';
    wrapper.style.transform = 'translateY(0)'; 
    wrapper.style.top = wrapper.getBoundingClientRect().top + 'px';
  });

  wrapper.addEventListener('mousedown', (e) => {
    if (e.target.closest('.nav-item') || e.target.closest('#toggle-capsule')) return;
    isDragging = true;
    startY = e.clientY;
    startTop = wrapper.getBoundingClientRect().top;
    wrapper.style.transition = 'none';
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const deltaY = e.clientY - startY;
    let newTop = startTop + deltaY;
    const minTop = 100;
    const maxTop = window.innerHeight - wrapper.offsetHeight - 60;
    if (newTop < minTop) newTop = minTop;
    if (newTop > maxTop) newTop = maxTop;
    wrapper.style.top = newTop + 'px';
    wrapper.style.transform = 'none';
  });

  window.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      wrapper.style.transition = 'top 0.4s ease, transform 0.3s ease';
      wrapper.style.transform = 'translateY(0)';
      wrapper.style.top = wrapper.getBoundingClientRect().top + 'px';
    }
  });

  setTimeout(checkSheetAndMove, 500);
  document.addEventListener('click', (e) => {
    if (e.target.closest('#sheet-toggle')) {
      setTimeout(checkSheetAndMove, 100);
    }
  });
}
