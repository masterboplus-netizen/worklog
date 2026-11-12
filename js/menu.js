// МОДУЛЬ: БУРГЕР-МЕНЮ
function setupBurgerMenu() {
    const burgerBtn = document.getElementById('burger-btn');
    const menu = document.getElementById('burger-menu');
    const closeBtn = document.getElementById('burger-close');
    
    if (!burgerBtn || !menu) return;

    // Открытие меню
    burgerBtn.addEventListener('click', () => {
        menu.style.display = 'flex';
    });

    // Закрытие по кнопке "Закрыть"
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            menu.style.display = 'none';
        });
    }

    // Закрытие по клику на пустое место (фон)
    menu.addEventListener('click', (e) => {
        if (e.target === menu) {
            menu.style.display = 'none';
        }
    });

    // Переключение вкладок
    menu.querySelectorAll('.burger-item').forEach(item => {
        item.addEventListener('click', (e) => {
            const tab = item.dataset.tab;
            if (tab && typeof switchTab === 'function') {
                switchTab(tab);
            }
            menu.style.display = 'none';
        });
    });
}

// Вызываем при загрузке
document.addEventListener('DOMContentLoaded', setupBurgerMenu);
