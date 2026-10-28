// === МОДУЛЬ: ГРАФИК (ЧИСТАЯ ВЕРСИЯ V3) ===
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

    monthSpan.addEventListener('click', () => openMonthPicker());
    yearSpan.addEventListener('click', () => openYearPicker());

    navRow.appendChild(monthSpan);
    navRow.appendChild(yearSpan);
    c.appendChild(navRow);

    // 2. ГРАФИК
    const chartWrapper = document.createElement('div');
    chartWrapper.style.cssText = 'display: flex; width: 100%; height: 240px; position: relative; padding-bottom: 30px; box-sizing: border-box;';

    // Ось Y (3 значения)
    const yAxis = document.createElement('div');
    yAxis.style.cssText = 'width: 45px; display: flex; flex-direction: column; justify-content: space-between; font-size: 10px; color: var(--fg-dim); text-align: right; padding-right: 8px; box-sizing: border-box; height: 100%; padding-bottom: 30px; padding-top: 0;';

    // Лента
    const scrollContainer = document.createElement('div');
    scrollContainer.className = 'tl-container';
    scrollContainer.id = 'tl-scroll';
    scrollContainer.style.flex = '1';
    scrollContainer.style.padding = '0';
    scrollContainer.style.margin = '0';

    chartWrapper.appendChild(yAxis);
    chartWrapper.appendChild(scrollContainer);
    c.appendChild(chartWrapper);

    // 3. ЛЕГЕНДА
    const legendBar = document.createElement('div');
    legendBar.id = 'tl-legend-bar';
    legendBar.style.cssText = 'height: 24px; text-align: center; font-size: 14px; font-weight: 600; color: var(--accent); margin: 8px 0;';
    c.appendChild(legendBar);

    // 4. КНОПКИ (Полные названия)
    const metrics = [['duration', 'Время'], ['events', 'Сообщения'], ['screens', 'Скрины'], ['tasks', 'Задачи']];
    const metricHTML = metrics.map(([key, label]) =>
        '<button class="cal-btn' + (CHART_STATE.metric === key ? ' active' : '') + '" data-metric="' + key + '" style="flex:1; text-align:center; padding: 6px 0; font-size: 10px; white-space: nowrap;">' + label + '</button>'
    ).join('');

    const metricBar = document.createElement('div');
    metricBar.style.cssText = 'display:flex; gap:4px; margin: 0 8px 16px 8px; justify-content: space-between; box-sizing: border-box;';
    metricBar.innerHTML = metricHTML;
    c.appendChild(metricBar);

    // 5. ГЕНЕРАЦИЯ ЛЕНТЫ
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
        const dateStr = _localDate(iterDate);
        allDates.push(dateStr);

        const col = document.createElement('div');
        col.className = 'tl-col';
        col.dataset.date = dateStr;
        col.style.position = 'relative';
        col.style.outline = 'none';

        const topSpace = document.createElement('div');
        topSpace.style.cssText = 'flex: 1; width: 100%; display: flex; flex-direction: column; justify-content: flex-end; align-items: center; position: relative;';

        const barDiv = document.createElement('div');
        barDiv.className = 'tl-bar';
        topSpace.appendChild(barDiv);

        const labelDiv = document.createElement('div');
        labelDiv.className = 'tl-label';
        const dayNum = iterDate.getDate();
        const dowNames = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
        labelDiv.innerHTML = `<div>${dayNum}</div><div style="font-size:9px;opacity:0.6;">${dowNames[iterDate.getDay()]}</div>`;

        col.appendChild(topSpace);
        col.appendChild(labelDiv);
        scrollContainer.appendChild(col);

        iterDate.setDate(iterDate.getDate() + 1);
    }

    // 6. ОБНОВЛЕНИЕ
    const updateChart = () => {
        const scrollLeft = scrollContainer.scrollLeft;
        const containerWidth = scrollContainer.clientWidth;
        const colWidth = 40;

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
            const dateStr = allDates[i];
            let v = 0;
            for (const sess of window.DATA.sessions || []) {
                if (sess.date === dateStr) {
                    if (CHART_STATE.metric === 'duration') v += sess.duration_min || 0;
                    else if (CHART_STATE.metric === 'events') v += sess.events || 0;
                    else if (CHART_STATE.metric === 'screens') v += sess.screens || 0;
                    else if (CHART_STATE.metric === 'tasks') v += sess.tasks_done || 0;
                }
            }
            if (v > maxVal) maxVal = v;
        }
        if (maxVal === 0) maxVal = CHART_STATE.metric === 'duration' ? 720 : 10;

        // Ось Y (3 значения)
        let yHTML = '';
        const values = [0, maxVal / 2, maxVal];
        for (let i = 2; i >= 0; i--) {
            const val = Math.round(values[i]);
            const lbl = CHART_STATE.metric === 'duration' ? (Math.floor(val / 60) + 'ч') : String(val);
            yHTML += '<div>' + lbl + '</div>';
        }
        yAxis.innerHTML = yHTML;

        const cols = scrollContainer.querySelectorAll('.tl-col');
        cols.forEach(col => {
            const dateStr = col.dataset.date;
            let v = 0;
            for (const sess of window.DATA.sessions || []) {
                if (sess.date === dateStr) {
                    if (CHART_STATE.metric === 'duration') v += sess.duration_min || 0;
                    else if (CHART_STATE.metric === 'events') v += sess.events || 0;
                    else if (CHART_STATE.metric === 'screens') v += sess.screens || 0;
                    else if (CHART_STATE.metric === 'tasks') v += sess.tasks_done || 0;
                }
            }
            const h = v ? Math.max(2, Math.round(v / maxVal * 100)) : 0;
            col.querySelector('.tl-bar').style.height = h + '%';

            if (dateStr === CHART_STATE.selectedDay) {
                col.querySelector('.tl-bar').classList.add('selected');
                const text = CHART_STATE.metric === 'duration' ? fmtH(v) : String(v);
                const d = new Date(dateStr + 'T00:00:00');
                const monthsShort = ['янв','фев','мар','апр','мая','июн','июл','авг','сен','окт','ноя','дек'];
                const dowNamesShort = ['вс','пн','вт','ср','чт','пт','сб'];
                const dateStrFormat = d.getDate() + ' ' + monthsShort[d.getMonth()] + ', ' + dowNamesShort[d.getDay()];
                legendBar.textContent = dateStrFormat + ' — ' + text;
            } else {
                col.querySelector('.tl-bar').classList.remove('selected');
            }
        });
    };

    scrollContainer.addEventListener('scroll', () => {
        clearTimeout(scrollContainer._scrollTimeout);
        scrollContainer._scrollTimeout = setTimeout(() => {
            if (CHART_STATE.selectedDay) {
                CHART_STATE.selectedDay = null;
                legendBar.textContent = '';
            }
            updateChart();
        }, 100);
    });

    scrollContainer.addEventListener('click', (e) => {
        const col = e.target.closest('.tl-col');
        if (!col) return;
        const dateStr = col.dataset.date;
        if (CHART_STATE.selectedDay === dateStr) {
            CHART_STATE.selectedDay = null;
            legendBar.textContent = '';
            updateChart();
            return;
        }
        CHART_STATE.selectedDay = dateStr;
        updateChart();
    });

    c.querySelectorAll('.cal-btn[data-metric]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            CHART_STATE.metric = btn.dataset.metric;
            CHART_STATE.selectedDay = null;
            legendBar.textContent = '';
            const currentScroll = scrollContainer.scrollLeft;
            renderActivityPageV2();
            setTimeout(() => {
                const newScroll = document.getElementById('tl-scroll');
                if (newScroll) {
                    newScroll.scrollLeft = currentScroll;
                    updateChart();
                }
            }, 50);
        });
    });

    setTimeout(() => {
        scrollContainer.scrollTo({ left: scrollContainer.scrollWidth, behavior: 'smooth' });
        setTimeout(() => { updateChart(); }, 600);
    }, 100);
}
