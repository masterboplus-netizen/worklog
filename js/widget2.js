// МОДУЛЬ: ВИДЖЕТ-КАПСУЛА (v3, по макету MasterBoss)

const CAPSULE_ITEMS = [
    { id: 'dashboard', title: 'Дашборд', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12l9-9 9 9"/><path d="M5 10v10h14V10"/></svg>' },
    { id: 'diary', title: 'Календарь', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>' },
    { id: 'projects', title: 'Проекты', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7h18v13H3z"/><path d="M3 7l2-4h14l2 4"/><path d="M12 11v6"/></svg>' },
    { id: 'activity', title: 'График', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>' },
    { id: 'profile', title: 'Профиль', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>' }
];

function setupWidget() {
    // 1. Обертка (flex, справа, по центру)
    const wrapper = document.createElement('div');
    wrapper.id = 'floating-capsule-wrapper';
    wrapper.style.cssText = 'position: fixed; right: 0; top: 50%; transform: translateY(-50%); z-index: 9999; display: flex; align-items: center; transition: transform 0.3s ease;';

    // 2. Стрелка (язычок) — слева от капсулы
    const toggleBtn = document.createElement('button');
    toggleBtn.id = 'toggle-capsule';
    toggleBtn.innerHTML = '<svg id="toggle-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>';
    toggleBtn.style.cssText = 'width: 24px; height: 80px; background: var(--bg2); border: 1px solid var(--border); border-right: none; border-radius: 8px 0 0 8px; color: var(--fg); cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0;';

    // 3. Капсула (панель с иконками и подписями)
    const capsule = document.createElement('div');
    capsule.id = 'floating-capsule';
    capsule.style.cssText = 'display: flex; flex-direction: column; gap: 8px; background: var(--bg2); padding: 12px 8px; border: 1px solid var(--border); border-radius: 16px 0 0 16px; box-shadow: -4px 0 12px rgba(0,0,0,0.5); transition: transform 0.3s ease;';

    CAPSULE_ITEMS.forEach(item => {
        const btn = document.createElement('div');
        btn.className = 'nav-item';
        btn.dataset.tab = item.id;
        btn.style.cssText = 'display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; width: 50px; height: 50px; cursor: pointer; border-radius: 8px; color: var(--fg);';
        btn.innerHTML = `${item.icon}<span style="font-size:9px; text-align:center; line-height:1;">${item.title}</span>`;
        btn.title = item.title;
        btn.addEventListener('click', () => {
            if (typeof switchTab === 'function') switchTab(item.id);
            toggleCollapse(true);
        });
        capsule.appendChild(btn);
    });

    wrapper.appendChild(toggleBtn);
    wrapper.appendChild(capsule);
    document.body.appendChild(wrapper);

    let isCollapsed = false;
    function toggleCollapse(force = false) {
        isCollapsed = force ? true : !isCollapsed;
        if (isCollapsed) {
            capsule.style.transform = 'translateX(100%)';
            document.getElementById('toggle-icon').style.transform = 'rotate(180deg)';
        } else {
            capsule.style.transform = 'translateX(0)';
            document.getElementById('toggle-icon').style.transform = 'rotate(0deg)';
        }
    }

    toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleCollapse();
    });
}

document.addEventListener('DOMContentLoaded', setupWidget);
