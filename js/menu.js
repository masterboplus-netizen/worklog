// МОДУЛЬ: ВИДЖЕТ-КАПСУЛА (боковая панель)
function setupWidgetMenu() {
    // 1. Создаем контейнер (справа, по центру)
    const widget = document.createElement('div');
    widget.id = 'widget-menu';
    widget.style.cssText = 'position: fixed; right: 0; top: 50%; transform: translateY(-50%); z-index: 9999; display: flex; align-items: center;';

    // 2. Язычок (свернутое состояние)
    const toggleBtn = document.createElement('button');
    toggleBtn.id = 'widget-toggle';
    toggleBtn.innerHTML = '&lt;'; // Стрелка влево (свернуто)
    toggleBtn.style.cssText = 'width: 32px; height: 80px; background: var(--bg2); border: 1px solid var(--border); border-right: none; border-radius: 8px 0 0 8px; color: var(--fg); font-size: 16px; cursor: pointer; display: flex; align-items: center; justify-content: center;';

    // 3. Панель с меню (скрытая)
    const panel = document.createElement('div');
    panel.id = 'widget-panel';
    panel.style.cssText = 'display: none; flex-direction: column; gap: 8px; background: var(--bg2); padding: 12px; border: 1px solid var(--border); border-right: none; border-radius: 8px 0 0 8px; box-shadow: -4px 0 12px rgba(0,0,0,0.5);';

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
        btn.style.cssText = 'display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: transparent; border: none; color: var(--fg); font-size: 14px; border-radius: 8px; cursor: pointer; white-space: nowrap; text-align: left;';
        panel.appendChild(btn);
    });

    widget.appendChild(panel);
    widget.appendChild(toggleBtn);
    document.body.appendChild(widget);

    // 4. Логика
    let isOpen = false;

    toggleBtn.addEventListener('click', () => {
        isOpen = !isOpen;
        panel.style.display = isOpen ? 'flex' : 'none';
        toggleBtn.innerHTML = isOpen ? '&gt;' : '&lt;';
    });

    // Обработка кликов по пунктам
    panel.querySelectorAll('.widget-item').forEach(item => {
        item.addEventListener('click', () => {
            const tab = item.dataset.tab;
            if (tab && typeof switchTab === 'function') {
                switchTab(tab);
            }
            isOpen = false;
            panel.style.display = 'none';
            toggleBtn.innerHTML = '&lt;';
        });
    });
}

// Запускаем при загрузке
document.addEventListener('DOMContentLoaded', setupWidgetMenu);
