// МОДУЛЬ: ВИДЖЕТ-КАПСУЛА (отдельный элемент)
function setupWidget() {
    const wrapper = document.createElement('div');
    wrapper.id = 'floating-capsule-wrapper';
    wrapper.style.cssText = 'position: fixed; right: 0; top: 50%; transform: translateY(-50%); z-index: 9999; display: flex; align-items: center;';

    const capsule = document.createElement('div');
    capsule.id = 'floating-capsule';
    capsule.style.cssText = 'display: flex; flex-direction: column; gap: 8px; background: var(--bg2); padding: 12px; border: 1px solid var(--border); border-right: none; border-radius: 16px 0 0 16px; box-shadow: -4px 0 12px rgba(0,0,0,0.5); transition: transform 0.3s ease;';

    const items = [
        { id: 'dashboard', title: 'Дашборд', icon: '🏠' },
        { id: 'diary', title: 'Календарь', icon: '📅' },
        { id: 'projects', title: 'Проекты', icon: '📁' },
        { id: 'activity', title: 'График', icon: '📊' },
        { id: 'profile', title: 'Профиль', icon: '👤' }
    ];

    items.forEach(item => {
        const btn = document.createElement('div');
        btn.className = 'nav-item';
        btn.dataset.tab = item.id;
        btn.style.cssText = 'display: flex; align-items: center; gap: 8px; padding: 6px 8px; cursor: pointer; border-radius: 8px; color: var(--fg);';
        btn.innerHTML = `<span style="font-size:18px;">${item.icon}</span> <span style="font-size:12px;">${item.title}</span>`;
        btn.addEventListener('click', () => {
            if (typeof switchTab === 'function') switchTab(item.id);
            toggleCollapse();
        });
        capsule.appendChild(btn);
    });

    const toggleBtn = document.createElement('button');
    toggleBtn.id = 'toggle-capsule';
    toggleBtn.innerHTML = '<svg id="toggle-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>';
    toggleBtn.style.cssText = 'width: 32px; height: 80px; background: var(--bg2); border: 1px solid var(--border); border-right: none; border-radius: 8px 0 0 8px; color: var(--fg); cursor: pointer; display: flex; align-items: center; justify-content: center;';

    wrapper.appendChild(capsule);
    wrapper.appendChild(toggleBtn);
    document.body.appendChild(wrapper);

    let isCollapsed = false;
    function toggleCollapse() {
        isCollapsed = !isCollapsed;
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
