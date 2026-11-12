// МОДУЛЬ: ВИДЖЕТ-КАПСУЛА (МЕНЮ)
function setupWidgetMenu() {
    // 1. Создаем контейнер виджета
    const widget = document.createElement('div');
    widget.id = 'widget-menu';
    widget.style.cssText = 'position: fixed; bottom: 20px; right: 20px; z-index: 9999; display: flex; flex-direction: column; align-items: flex-end; gap: 10px;';

    // 2. Создаем выпадающее меню (скрытое)
    const menuItems = document.createElement('div');
    menuItems.id = 'widget-menu-items';
    menuItems.style.cssText = 'display: none; flex-direction: column; gap: 8px; background: var(--bg2); padding: 8px; border-radius: 16px; border: 1px solid var(--border); box-shadow: 0 4px 12px rgba(0,0,0,0.5);';

    const tabs = [
        { id: 'dashboard', label: '🏠 Дашборд' },
        { id: 'diary', label: '📅 Календарь' },
        { id: 'projects', label: '📁 Проекты' },
        { id: 'activity', label: '📊 График' },
        { id: 'profile', label: '👤 Профиль' }
    ];

    tabs.forEach(tab => {
        const btn = document.createElement('button');
        btn.className = 'widget-item';
        btn.dataset.tab = tab.id;
        btn.textContent = tab.label;
        btn.style.cssText = 'display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: transparent; border: none; color: var(--fg); font-size: 14px; border-radius: 8px; cursor: pointer; white-space: nowrap;';
        menuItems.appendChild(btn);
    });

    // 3. Создаем кнопку-капсулу
    const capsuleBtn = document.createElement('button');
    capsuleBtn.id = 'widget-btn';
    capsuleBtn.innerHTML = '☰';
    capsuleBtn.style.cssText = 'width: 56px; height: 56px; border-radius: 50%; background: var(--accent); border: none; color: #fff; font-size: 24px; cursor: pointer; box-shadow: 0 4px 12px rgba(74, 158, 255, 0.4); display: flex; align-items: center; justify-content: center; transition: transform 0.3s ease;';

    widget.appendChild(menuItems);
    widget.appendChild(capsuleBtn);
    document.body.appendChild(widget);

    // 4. Логика
    let isOpen = false;

    capsuleBtn.addEventListener('click', () => {
        isOpen = !isOpen;
        menuItems.style.display = isOpen ? 'flex' : 'none';
        capsuleBtn.style.transform = isOpen ? 'rotate(90deg)' : 'rotate(0deg)';
    });

    // Обработка кликов по пунктам
    menuItems.querySelectorAll('.widget-item').forEach(item => {
        item.addEventListener('click', () => {
            const tab = item.dataset.tab;
            if (tab && typeof switchTab === 'function') {
                switchTab(tab);
            }
            isOpen = false;
            menuItems.style.display = 'none';
            capsuleBtn.style.transform = 'rotate(0deg)';
        });
    });
}

// Запускаем при загрузке
document.addEventListener('DOMContentLoaded', setupWidgetMenu);
