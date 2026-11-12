// ВИДЖЕТ-КАПСУЛА (ПРОВЕРЕННЫЙ ВАРИАНТ)
const CAPSULE_ITEMS = [
    { id: 'dashboard', title: 'Дашборд', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12l9-9 9 9"/><path d="M5 10v10h14V10"/></svg>' },
    { id: 'diary', title: 'Календарь', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>' },
    { id: 'projects', title: 'Проекты', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7h18v13H3z"/><path d="M3 7l2-4h14l2 4"/><path d="M12 11v6"/></svg>' },
    { id: 'activity', title: 'График', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>' }
];

function setupWidget() {
    console.log('WIDGET: setupWidget started');
    const oldWrapper = document.getElementById('floating-capsule-wrapper');
    if (oldWrapper) oldWrapper.remove();

    const wrapper = document.createElement('div');
    wrapper.id = 'floating-capsule-wrapper';
    wrapper.style.cssText = 'position: fixed; right: 0; top: 50%; transform: translateY(-50%); z-index: 9999; display: flex; align-items: center;';

    const capsule = document.createElement('div');
    capsule.id = 'floating-capsule';
    capsule.style.cssText = 'position: relative; display: flex; flex-direction: column; align-items: center; gap: 8px; background: var(--bg2); padding: 12px 4px; border: 1px solid var(--border); border-right: none; border-radius: 16px 0 0 16px; box-shadow: -4px 0 12px rgba(0,0,0,0.5); transition: transform 0.3s ease;';

    const toggleBtn = document.createElement('button');
    toggleBtn.id = 'toggle-capsule';
    toggleBtn.innerHTML = '<svg id="toggle-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="transition: transform 0.3s;"><path d="M15 18l-6-6 6-6"/></svg>';
    toggleBtn.style.cssText = 'position: absolute; left: -30px; top: 50%; transform: translateY(-50%); width: 30px; height: 80px; background: var(--bg2); border: 1px solid var(--border); border-right: none; border-radius: 16px 0 0 16px; color: var(--fg); cursor: pointer; display: flex; align-items: center; justify-content: center; z-index: 10;';
    capsule.appendChild(toggleBtn);

    const itemsContainer = document.createElement('div');
    itemsContainer.id = 'capsule-dynamic-items';
    itemsContainer.style.cssText = 'display: flex; flex-direction: column; gap: 4px;';
    capsule.appendChild(itemsContainer);

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
        itemsContainer.appendChild(btn);
    });

    wrapper.appendChild(capsule);
    document.body.appendChild(wrapper);
    console.log('WIDGET: capsule created');

    let isCollapsed = false;
    function toggleCollapse(force = false) {
        isCollapsed = force ? true : !isCollapsed;
        console.log('WIDGET: toggleCollapse, isCollapsed =', isCollapsed);
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

// Запускаем сразу, не ждем DOMContentLoaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupWidget);
} else {
    setupWidget();
}
