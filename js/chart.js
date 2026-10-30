// === МОДУЛЬ: ГРАФИК (ЧИСТАЯ ВЕРСИЯ V7) ===
let CHART_STATE = { metric: 'duration', selectedDay: null, currentMonth: null, currentYear: null };

function renderActivityPageV2() {
    const c = document.getElementById('content-activity');
    if (!c || !window.DATA) return;
    c.innerHTML = '';

    // 1. НАВИГАЦИЯ
    const navRow = document.createElement('div');
    navRow.style.cssText = 'display:flex; justify-content:center; align-items:center; gap:16px; margin-bottom: 16px; font-size:20px; font-weight:600; color:var(--fg);';

    const monthSpan = document.createElement('span');
    monthSpan.id = 'chart-month-label';
    monthSpan.style.cssText = 'cursor:pointer;';
    const yearSpan = document.createElement('span');
    yearSpan.id = 'chart-year-label';
    yearSpan.style.cssText = 'cursor:pointer;';

    if (!CHART_STATE.currentMonth) {
        const now = new Date();
        CHART_STATE.currentMonth = now.getMonth();
        CHART_STATE.currentYear = now.getFullYear();
    }

    const months = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
    monthSpan.textContent = months[CHART_STATE.currentMonth];
    yearSpan.textContent = CHART_STATE.currentYear;

    if (typeof openMonthPicker === 'function') monthSpan.addEventListener('click', () => openMonthPicker());
    if (typeof openYearPicker === 'function') yearSpan.addEventListener('click', () => openYearPicker());

    navRow.appendChild(monthSpan);
    navRow.appendChild(yearSpan);
    c.appendChild(navRow);

    // 2. ГРАФИК
    const chartWrapper = document.createElement('div');
    chartWrapper.style.cssText = 'display: flex; flex-direction: row; width: 100%; height: 220px; position: relative; box-sizing: border-box;';

    const yAxis = document.createElement('div');
    yAxis.id = 'tl-y-axis';
    yAxis.style.cssText = 'width: 32px; display: flex; flex-direction: column; justify-content: space-between; font-size: 10px; color: var(--fg-dim); text-align: right; padding-right: 8px; box-sizing: border-box; height: 100%; padding-bottom: 30px;';

    const scrollContainer = document.createElement('div');
    scrollContainer.className = 'tl-container';
    scrollContainer.id = 'tl-scroll';
    scrollContainer.style.flex = '1';
    scrollContainer.style.position = 'relative';

    let tooltip = document.getElementById('global-chart-tooltip');
    if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.id = 'global-chart-tooltip';
        tooltip.style.display = 'none';
        document.body.appendChild(tooltip);
    }

    chartWrapper.appendChild(yAxis);
    chartWrapper.appendChild(scrollContainer);
    c.appendChild(chartWrapper);

    // 3. КНОПКИ (СТИЛИ БЕРУТСЯ ИЗ INDEX.HTML)
    const metrics = [['duration', 'Время'], ['events', 'Сообщения'], ['screens', 'Скрины'], ['tasks', 'Задачи']];
    
    const metricBar = document.createElement('div');
    metricBar.className = 'segmented-control';
    
    metricBar.innerHTML = metrics.map(([key, label]) => {
        const isActive = CHART_STATE.metric === key;
        return `<button class="${isActive ? 'active' : ''}" data-metric="${key}">${label}</button>`;
    }).join('');
    
    c.appendChild(metricBar);

    // 4. ГЕНЕРАЦИЯ ЛЕНТЫ
    let firstSessionDate = new Date();
    if (window.DATA.sessions && window.DATA.sessions.length > 0) {
        const sorted = window.DATA.sessions.slice().sort((a, b) => a.date.localeCompare(b.date));
        firstSessionDate = new Date(sorted[0].date + 'T00:00:00');
    }
    const today = new Date();
    today.setHours(0,0,0,0);

    let iterDate = new Date(firstSessionDate);
    const allDates = [];

    while (iterDate <= today) {
        const dateStr = (typeof _localDate === 'function') ? _localDate(iterDate) : iterDate.toISOString().slice(0,10);
        allDates.push(dateStr);

        const col = document.createElement('div');
        col.className = 'tl-col';
        col.dataset.date = dateStr;
        
        const topSpace = document.createElement('div');
        topSpace.style.cssText = 'flex: 1; width: 100%; display: flex; flex-direction: column; justify-content: flex-end; align-items: center; position: relative;';

        const barDiv = document.createElement('div');
        barDiv.className = 'tl-bar';
        topSpace.appendChild(barDiv);

        const labelDiv = document.createElement('div');
        labelDiv.className = 'tl-label';
        const dowNames = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
        labelDiv.innerHTML = `<div>${iterDate.getDate()}</div><div style="font-size:9px;opacity:0.6;">${dowNames[iterDate.getDay()]}</div>`;

        col.appendChild(topSpace);
        col.appendChild(labelDiv);
        scrollContainer.appendChild(col);

        iterDate.setDate(iterDate.getDate() + 1);
    }

    // 5. ОБНОВЛЕНИЕ (ОСЬ Y - 3 ДЕЛЕНИЯ)
    const updateChart = () => {
        const scrollLeft = scrollContainer.scrollLeft;
        const containerWidth = scrollContainer.clientWidth;
        const colWidth = containerWidth / 7;

        const startIndex = Math.floor(scrollLeft / colWidth);
        const endIndex = Math.min(allDates.length - 1, Math.ceil((scrollLeft + containerWidth) / colWidth));

        if (allDates[startIndex]) {
            const d = new Date(allDates[startIndex] + 'T00:00:00');
            monthSpan.textContent = months[d.getMonth()];
            yearSpan.textContent = d.getFullYear();
            CHART_STATE.currentMonth = d.getMonth();
            CHART_STATE.currentYear = d.getFullYear();
        }

        let maxVal = 0;
        for (let i = startIndex; i <= endIndex && i < allDates.length; i++) {
            let v = 0;
            for (const sess of window.DATA.sessions || []) {
                if (sess.date === allDates[i]) {
                    if (CHART_STATE.metric === 'duration') v += sess.duration_min || 0;
                    else if (CHART_STATE.metric === 'events') v += sess.events || 0;
                    else if (CHART_STATE.metric === 'screens') v += sess.screens || 0;
                    else if (CHART_STATE.metric === 'tasks') v += sess.tasks_done || 0;
                }
            }
            if (v > maxVal) maxVal = v;
        }
        if (maxVal === 0) maxVal = CHART_STATE.metric === 'duration' ? 720 : 10;

        let yHTML = '';
        const midVal = Math.round(maxVal / 2);
        const topVal = Math.round(maxVal);
        const formatLbl = (val) => CHART_STATE.metric === 'duration' ? (Math.floor(val / 60) + 'ч') : String(val);
        
        yHTML += `<div>${formatLbl(topVal)}</div>`;
        yHTML += `<div>${formatLbl(midVal)}</div>`;
        yHTML += `<div>0</div>`;
        yAxis.innerHTML = yHTML;

        scrollContainer.querySelectorAll('.tl-col').forEach(col => {
            let v = 0;
            for (const sess of window.DATA.sessions || []) {
                if (sess.date === col.dataset.date) {
                    if (CHART_STATE.metric === 'duration') v += sess.duration_min || 0;
                    else if (CHART_STATE.metric === 'events') v += sess.events || 0;
                    else if (CHART_STATE.metric === 'screens') v += sess.screens || 0;
                    else if (CHART_STATE.metric === 'tasks') v += sess.tasks_done || 0;
                }
            }
            const h = v ? Math.max(2, Math.round(v / maxVal * 100)) : 0;
            col.querySelector('.tl-bar').style.height = h + '%';
            col.querySelector('.tl-bar').classList.remove('selected');

            if (col.dataset.date === CHART_STATE.selectedDay) {
                col.querySelector('.tl-bar').classList.add('selected');
            }
        });
    };

    scrollContainer.addEventListener('scroll', () => {
        clearTimeout(scrollContainer._scrollTimeout);
        scrollContainer._scrollTimeout = setTimeout(updateChart, 100);
    });

    // 6. КЛИК И ТУЛТИП
    scrollContainer.addEventListener('click', (e) => {
        const col = e.target.closest('.tl-col');
        if (!col) return;
        const dateStr = col.dataset.date;

        if (CHART_STATE.selectedDay === dateStr) {
            CHART_STATE.selectedDay = null;
            tooltip.style.display = 'none';
            updateChart();
            return;
        }

        CHART_STATE.selectedDay = dateStr;
        updateChart();

        const targetCol = scrollContainer.querySelector(`.tl-col[data-date="${dateStr}"]`);
        if (targetCol) {
            let v = 0;
            for (const sess of window.DATA.sessions || []) {
                if (sess.date === dateStr) {
                    if (CHART_STATE.metric === 'duration') v += sess.duration_min || 0;
                    else if (CHART_STATE.metric === 'events') v += sess.events || 0;
                    else if (CHART_STATE.metric === 'screens') v += sess.screens || 0;
                    else if (CHART_STATE.metric === 'tasks') v += sess.tasks_done || 0;
                }
            }
            
            let text = String(v);
            if (CHART_STATE.metric === 'duration') {
                const h = Math.floor(v / 60);
                const m = v % 60;
                text = (h > 0 ? h + 'ч ' : '') + m + 'м';
            }

            tooltip.innerHTML = `<div style="font-weight:600;color:#fff;font-size:14px;padding:6px 12px;background:var(--bg2);border:1px solid var(--border);border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.5);">${text}</div>`;
            tooltip.style.display = 'block';
            tooltip.style.position = 'fixed';
            tooltip.style.zIndex = '99999';

            const rect = targetCol.getBoundingClientRect();
            const bar = targetCol.querySelector('.tl-bar');
            
            tooltip.style.left = (rect.left + (rect.width / 2)) + 'px';
            tooltip.style.top = (rect.top + (rect.height - bar.getBoundingClientRect().height) - 40) + 'px';
            tooltip.style.transform = 'translateX(-50%)';
        }
    });

    // 7. СМЕНА МЕТРИКИ
    metricBar.querySelectorAll('button[data-metric]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const newMetric = btn.getAttribute('data-metric');
            if (CHART_STATE.metric === newMetric) return;
            
            CHART_STATE.metric = newMetric;
            CHART_STATE.selectedDay = null;
            tooltip.style.display = 'none';

            const currentScroll = scrollContainer.scrollLeft;
            renderActivityPageV2();

            setTimeout(() => {
                const newScroll = document.getElementById('tl-scroll');
                if (newScroll) {
                    newScroll.scrollLeft = currentScroll;
                    newScroll.dispatchEvent(new Event('scroll'));
                }
            }, 50);
        });
    });

    // Анимация входа
    setTimeout(() => {
        scrollContainer.scrollTo({ left: scrollContainer.scrollWidth, behavior: 'smooth' });
        setTimeout(() => { updateChart(); }, 600);
    }, 100);
}
