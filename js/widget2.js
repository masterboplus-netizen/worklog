// Только логика капсулы (HTML уже в index.html)
document.addEventListener('DOMContentLoaded', function() {
    const wrapper = document.getElementById('floating-capsule-wrapper');
    const capsule = document.getElementById('floating-capsule');
    const toggleBtn = document.getElementById('toggle-capsule');
    const toggleIcon = document.getElementById('toggle-icon');

    if (!wrapper || !capsule || !toggleBtn) return;

    // Скрываем капсулу, если открыт сейф
    const safe = document.getElementById('scroll-pin-screen');
    if (safe && !safe.classList.contains('hidden')) {
        wrapper.style.display = 'none';
    } else {
        wrapper.style.display = 'flex';
    }

    let isCollapsed = false;
    toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        isCollapsed = !isCollapsed;
        if (isCollapsed) {
            capsule.style.transform = 'translateX(100%)';
            toggleIcon.style.transform = 'rotate(0deg)';
        } else {
            capsule.style.transform = 'translateX(0)';
            toggleIcon.style.transform = 'rotate(180deg)';
        }
    });
});
