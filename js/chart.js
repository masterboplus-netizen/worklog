window.onerror = function(msg, url, line) { alert('ОШИБКА В ГРАФИКЕ:\n' + msg + '\nСтрока: ' + line); return false; };
// === МОДУЛЬ: ГРАФИК (ЧИСТАЯ ВЕРСИЯ V4) ===
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

    // 2. ГРАФИК (Ось Y + Лента)
    const chartWrapper = document.createElement('div');
    chartWrapper.style.cssText = 'display: flex; flex-direction: row; width: 100%; height: 220px; position: relative; box-sizing: border-box;';

    // Ось Y
    const yAxis = document.createElement('div');
    yAxis.id = 'tl-y-axis';
    yAxis.style.cssText = 'width: 32px; display: flex; flex-direction: column; justify-content: space-between; font-size: 10px; color: var(--fg-dim); text-align: right; padding-right: 8px; box-sizing: border-box; height: 100%; padding-bottom: 30px; padding-top: 0;';

    // Лента
    const scrollContainer = document.createElement('div');
    scrollContainer.className = 'tl-container';
    scrollContainer.id = 'tl-scroll';
    scrollContainer.style.flex = '1';
    scrollContainer.style.position = 'relative';

    // Создаем тултип (вне scrollContainer, чтобы не обрезался)
    let tooltip = document.getElementById('global-chart-tooltip');
    if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.id = 'global-chart-tooltip';
        tooltip.className = 'floating-tooltip';
        tooltip.style.display = 'none';
        document.body.appendChild(tooltip);
    }

    chartWrapper.appendChild(yAxis);
    chartWrapper.appendChild(scrollContainer);
    c.appendChild(chartWrapper);

    // 3. НИЖНИЕ КНОПКИ
    const metrics = [['duration', 'Время'], ['events', 'Сообщения'], ['screens', 'Скрины'], ['tasks', 'Задачи']];
    const metricHTML = metrics.map(([key, label]) =>
        '<button class="seg-btn ' + (CHART_STATE.metric === key ? 'active' : '') + '" data-metric="' + key + '">' + label + '</button>'
    ).join('');

    const metricBar = document.createElement('div');
    metricBar.className = "chart-tabs";
    metricBar.style.cssText = 'margin: 16px 0; padding: 4px; display: flex; gap: 4px; border-radius: 20px; background: var(--bg3); width: 100%; box-sizing: border-box;'; gap:4px; margin: 16px 0; justify-content: space-between; box-sizing: border-box; width: 100%;';
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

    // 6. ЛОГИКА ОБНОВЛЕНИЯ
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

        // Отрисовка Оси Y
        let yHTML = '';
        const step = maxVal / 4;
        for (let i = 4; i >= 0; i--) {
            const val = Math.round(step * i);
            const lbl = CHART_STATE.metric === 'duration' ? (Math.floor(val / 60) + 'ч') : String(val);
            yHTML += '<div>' + lbl + '</div>';
        }
        yAxis.innerHTML = yHTML;

        // Отрисовка столбиков
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
            col.querySelector('.tl-bar').classList.remove('selected');

            if (dateStr === CHART_STATE.selectedDay) {
                col.querySelector('.tl-bar').classList.add('selected');
            }
        });
    };

    // Слушаем скролл
    scrollContainer.addEventListener('scroll', () => {
        clearTimeout(scrollContainer._scrollTimeout);
        scrollContainer._scrollTimeout = setTimeout(updateChart, 100);
    });

    // КЛИК
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

        // Показываем тултип
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
            const text = CHART_STATE.metric === 'duration' ? fmtH(v) : String(v);
            tooltip.innerHTML = `<div style="font-weight:600;color:var(--fg);">${text}</div>`;
            tooltip.style.display = 'block';

            // Позиционируем относительно документа
            const rect = targetCol.getBoundingClientRect();
            const bar = targetCol.querySelector('.tl-bar');
            
            // Центр столбика по X (глобальные координаты)
            let leftPos = rect.left + (rect.width / 2) + window.scrollX;
            
            // Высота столбика (глобальные координаты)
            const barHeightPx = bar.getBoundingClientRect().height;
            let topPos = rect.top + (rect.height - barHeightPx) - 40 + window.scrollY;

            tooltip.style.position = 'absolute';
    // Смена метрики (ИСПРАВЛЕНО)
    c.querySelectorAll(".seg-btn[data-metric]").forEach(btn => {
        btn.addEventListener("click", (e) => {
            e.stopPropagation();
            const newMetric = btn.getAttribute("data-metric");
            if (CHART_STATE.metric === newMetric) return;
            
            CHART_STATE.metric = newMetric;
            CHART_STATE.selectedDay = null;
            const t = document.getElementById("global-chart-tooltip");
            if (t) t.style.display = "none";
            
            const currentScroll = scrollContainer.scrollLeft;
            renderActivityPageV2();
            
            setTimeout(() => {
                const newScroll = document.getElementById("tl-scroll");
                if (newScroll) {
                    newScroll.scrollLeft = currentScroll;
                    newScroll.dispatchEvent(new Event("scroll"));
                }
            }, 50);
        });
    });
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
