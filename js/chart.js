// === МОДУЛЬ: ГРАФИК (ЧИСТАЯ ВЕРСИЯ V4) ===
let CHART_STATE = { metric: 'duration', selectedDay: null, currentMonth: null, currentYear: null };

function renderActivityPageV2() {
    const c = document.getElementById('content-activity');
    if (!c || !window.DATA) return;
    c.innerHTML = '';

    const navRow = document.createElement('div');
    navRow.style.cssText = 'display:flex; justify-content:center; align-items:center; gap:16px; margin-bottom: 24px; font-size:20px; font-weight:600; color:var(--fg);';

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

    navRow.appendChild(monthSpan);
    navRow.appendChild(yearSpan);
    c.appendChild(navRow);

    const chartWrapper = document.createElement('div');
    chartWrapper.className = 'chart-wrapper-v4';

    const yAxis = document.createElement('div');
    yAxis.className = 'chart-y-axis-v4';

    const scrollContainer = document.createElement('div');
    scrollContainer.className = 'tl-container';
    scrollContainer.id = 'tl-scroll';
    scrollContainer.style.position = 'relative'; // Важно для позиционирования тултипа

    // Создаем тултип и сразу кладем его внутрь контейнера скролла
    const tooltip = document.createElement('div');
    tooltip.className = 'floating-tooltip';
    tooltip.style.display = 'none';
    scrollContainer.appendChild(tooltip);

    chartWrapper.appendChild(yAxis);
    chartWrapper.appendChild(scrollContainer);
    c.appendChild(chartWrapper);


    const metrics = [['duration', 'Время'], ['events', 'Сообщения'], ['screens', 'Скрины'], ['tasks', 'Задачи']];
    const metricHTML = metrics.map(([key, label]) =>
        '<button class="cal-btn chart-metric-btn' + (CHART_STATE.metric === key ? ' active' : '') + '" data-metric="' + key + '">' + label + '</button>'
    ).join('');

    const metricBar = document.createElement('div');
    metricBar.className = 'chart-metrics-row-v4';
    metricBar.innerHTML = metricHTML;
    c.appendChild(metricBar);

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

        const barWrap = document.createElement('div');
        barWrap.className = 'tl-bar-wrap';
        const barDiv = document.createElement('div');
        barDiv.className = 'tl-bar';
        barWrap.appendChild(barDiv);

        const labelDiv = document.createElement('div');
        labelDiv.className = 'tl-label';
        const dayNum = iterDate.getDate();
        const dowNames = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
        labelDiv.innerHTML = `<div>${dayNum}</div><div style="font-size:9px;opacity:0.6;">${dowNames[iterDate.getDay()]}</div>`;

        col.appendChild(barWrap);
        col.appendChild(labelDiv);
        scrollContainer.appendChild(col);

        iterDate.setDate(iterDate.getDate() + 1);
    }

    const updateChart = () => {
        const scrollLeft = scrollContainer.scrollLeft;
        const containerWidth = scrollContainer.clientWidth;
        // Ширина одного столбика = ширина контейнера / 7 (как в CSS)
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

        let yHTML = '';
        const values = [maxVal, maxVal / 2, 0];
        for (let i = 0; i < 3; i++) {
            const val = Math.round(values[i]);
            const lbl = CHART_STATE.metric === 'duration' ? (Math.floor(val / 60) + 'ч') : String(val);
            yHTML += '<div>' + lbl + '</div>';
        }
        yAxis.innerHTML = yHTML;

        const cols = scrollContainer.querySelectorAll('.tl-col');
        
        // 1. Сначала сбрасываем выделение и СЧИТАЕМ ВЫСОТУ
        cols.forEach(col => {
            col.querySelector('.tl-bar').classList.remove('selected');
            
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
            // Восстанавливаем высоту столбика!
            const h = v ? Math.max(2, Math.round(v / maxVal * 100)) : 0;
            col.querySelector('.tl-bar').style.height = h + '%';
        });

        // Принудительно скрываем тултип перед новым отображением
        tooltip.style.display = 'none';

        // Если есть выбранный день, показываем тултип
        if (CHART_STATE.selectedDay) {
            const targetCol = scrollContainer.querySelector(`.tl-col[data-date="${CHART_STATE.selectedDay}"]`);
            if (targetCol) {
                const bar = targetCol.querySelector('.tl-bar');
                bar.classList.add('selected');
                
                let v = 0;
                for (const sess of window.DATA.sessions || []) {
                    if (sess.date === CHART_STATE.selectedDay) {
                        if (CHART_STATE.metric === 'duration') v += sess.duration_min || 0;
                        else if (CHART_STATE.metric === 'events') v += sess.events || 0;
                        else if (CHART_STATE.metric === 'screens') v += sess.screens || 0;
                        else if (CHART_STATE.metric === 'tasks') v += sess.tasks_done || 0;
                    }
                }
                
                const text = CHART_STATE.metric === 'duration' ? fmtH(v) : String(v);
                
                tooltip.innerHTML = `<div style="font-weight:600;color:var(--fg);">${text}</div>`;
                tooltip.style.display = 'block';
                
                // Позиционируем
                const colWidth = scrollContainer.clientWidth / 7;
                const colIndex = Array.from(cols).indexOf(targetCol);
                let leftPos = (colIndex * colWidth) + (colWidth / 2);
                
                // Умный сдвиг, чтобы не вылезать за края
                const tooltipWidth = 60;
                if (leftPos - tooltipWidth / 2 < 0) leftPos = tooltipWidth / 2;
                if (leftPos + tooltipWidth / 2 > scrollContainer.clientWidth) leftPos = scrollContainer.clientWidth - tooltipWidth / 2;
                
                const barHeightPx = (parseFloat(bar.style.height) / 100) * (scrollContainer.clientHeight - 32); 
                let topPos = scrollContainer.clientHeight - 32 - barHeightPx - 40;
                if (topPos < 0) topPos = scrollContainer.clientHeight - 32 - 20;

                tooltip.style.left = leftPos + 'px';
                tooltip.style.top = topPos + 'px';
            }
        }

        // 2. Если есть выбранный день, выделяем только его и показываем тултип
        if (CHART_STATE.selectedDay) {
            const targetCol = scrollContainer.querySelector(`.tl-col[data-date="${CHART_STATE.selectedDay}"]`);
            if (targetCol) {
                const bar = targetCol.querySelector('.tl-bar');
                bar.classList.add('selected');
                
                // Считаем значение для этого дня
                let v = 0;
                for (const sess of window.DATA.sessions || []) {
                    if (sess.date === CHART_STATE.selectedDay) {
                        if (CHART_STATE.metric === 'duration') v += sess.duration_min || 0;
                        else if (CHART_STATE.metric === 'events') v += sess.events || 0;
                        else if (CHART_STATE.metric === 'screens') v += sess.screens || 0;
                        else if (CHART_STATE.metric === 'tasks') v += sess.tasks_done || 0;
                    }
                }
                
                const text = CHART_STATE.metric === 'duration' ? fmtH(v) : String(v);
                const d = new Date(CHART_STATE.selectedDay + 'T00:00:00');
                const monthsShort = ['янв','фев','мар','апр','мая','июн','июл','авг','сен','окт','ноя','дек'];
                const dowNamesShort = ['вс','пн','вт','ср','чт','пт','сб'];
                const dateStrFormat = d.getDate() + ' ' + monthsShort[d.getMonth()] + ', ' + dowNamesShort[d.getDay()];
                
                // Формируем контент тултипа
                tooltip.innerHTML = `<div style="font-weight:600;color:var(--fg);">${text}</div>`;
                tooltip.style.display = 'block';
                
                // Позиционируем тултип
                // Ширина столбика теперь = 100/7 контейнера
                const colWidth = scrollContainer.clientWidth / 7;
                const colIndex = Array.from(cols).indexOf(targetCol);
                
                // Центр столбика по X (относительно контейнера скролла)
                let leftPos = (colIndex * colWidth) + (colWidth / 2);
        const tooltipWidth = 80;
        if (leftPos - tooltipWidth / 2 < 0) leftPos = tooltipWidth / 2;
        if (leftPos + tooltipWidth / 2 > scrollContainer.clientWidth) leftPos = scrollContainer.clientWidth - tooltipWidth / 2;
                
                // Высота столбика по Y
                const barHeightPx = (parseFloat(bar.style.height) / 100) * (scrollContainer.clientHeight - 32); 
                const topPos = scrollContainer.clientHeight - 32 - barHeightPx - 45; // 32 - подписи, 45 - высота тултипа

                tooltip.style.left = leftPos + 'px';
                tooltip.style.top = Math.max(0, topPos) + 'px'; // Чтобы не улетал за верхний край
            }
        } else {
            // Если ничего не выбрано, скрываем тултип
            tooltip.style.display = 'none';
        }
    };

    scrollContainer.addEventListener('scroll', () => {
        clearTimeout(scrollContainer._scrollTimeout);
        scrollContainer._scrollTimeout = setTimeout(() => {
            // Убрали сброс выделения при скролле! Тултип не будет моргать.
            updateChart();
        }, 100);
    });

    scrollContainer.addEventListener('click', (e) => {
        const col = e.target.closest('.tl-col');
        if (!col) return;
        
        const dateStr = col.dataset.date;

        // Если кликнули на уже выбранный столбик — закрываем тултип
        if (CHART_STATE.selectedDay === dateStr) {
            CHART_STATE.selectedDay = null;
            updateChart();
            return;
        }
        
        // Иначе — выбираем новый
        CHART_STATE.selectedDay = dateStr;
        updateChart();
    });

    c.querySelectorAll('.chart-metric-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            CHART_STATE.metric = btn.dataset.metric;
            CHART_STATE.selectedDay = null;
            tooltip.style.display = 'none';
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
