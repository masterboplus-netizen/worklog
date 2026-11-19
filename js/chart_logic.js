

// === ШТОРКА ВЫБОРА ГОДА ===







// === НОВАЯ ЛЕНТА ГРАФИКА (V2) ===
let CHART_STATE_V2 = { metric: 'duration', selectedDay: null, currentMonth: null, currentYear: null };

function renderActivityPageV2() {
    const c = document.getElementById('content-chart');
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

    if (!CHART_STATE_V2.currentMonth) {
        const now = new Date();
        CHART_STATE_V2.currentMonth = now.getMonth();
        CHART_STATE_V2.currentYear = now.getFullYear();
    }

    const months = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
    monthSpan.textContent = months[CHART_STATE_V2.currentMonth];
    yearSpan.textContent = CHART_STATE_V2.currentYear;

    monthSpan.addEventListener('click', () => openMonthPicker());
    yearSpan.addEventListener('click', () => openYearPicker());

    navRow.appendChild(monthSpan);
    navRow.appendChild(yearSpan);
    c.appendChild(navRow);

    // 2. ГРАФИК (Ось Y + Лента)
    const chartWrapper = document.createElement('div');
    chartWrapper.style.cssText = 'display: flex; flex-direction: row; width: 100%; height: 260px; position: relative; box-sizing: border-box;';

    // Ось Y
    const yAxis = document.createElement('div');
    yAxis.id = 'tl-y-axis';
    yAxis.style.cssText = 'width: 40px; position: relative; font-size: 10px; color: var(--fg-dim); text-align: right; padding-right: 8px; box-sizing: border-box; height: 100%; padding-bottom: 30px; padding-top: 0;';
    
    // Лента
    const scrollContainer = document.createElement('div');
    scrollContainer.className = 'tl-container';
    scrollContainer.id = 'tl-scroll';
    scrollContainer.style.flex = '1';
    scrollContainer.style.padding = '0';
    scrollContainer.style.margin = '0';
    scrollContainer.style.height = '100%';

    chartWrapper.appendChild(yAxis);
    chartWrapper.appendChild(scrollContainer);
    c.appendChild(chartWrapper);

    // 3. ЛЕГЕНДА (Фиксированная строка)
    const legendBar = document.createElement('div');
    legendBar.id = 'tl-legend-bar';
    legendBar.style.cssText = 'height: 24px; text-align: center; font-size: 14px; font-weight: 600; color: var(--accent); margin-top: 8px; margin-bottom: 8px;';
    c.appendChild(legendBar);

    // 4. НИЖНИЕ КНОПКИ
    const metrics = [['duration', 'Время'], ['events', 'Сообщения'], ['screens', 'Скрины'], ['tasks', 'Задачи']];
    const metricHTML = metrics.map(([key, label]) =>
        '<button class="cal-btn' + (CHART_STATE_V2.metric === key ? ' active' : '') + '" data-metric="' + key + '" style="flex:1; text-align:center; padding: 4px 2px; font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">' + label + '</button>'
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
        col.style.outline = 'none'; // Убираем рамку фокуса при тапе

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
        const mergedSessions = window.DATA.sessions || [];
        const scrollLeft = scrollContainer.scrollLeft;
        const containerWidth = scrollContainer.clientWidth;
        const colWidth = 40;

        const startIndex = Math.floor(scrollLeft / colWidth);
        const endIndex = Math.min(allDates.length - 1, Math.floor((scrollLeft + containerWidth) / colWidth));

        if (allDates[startIndex]) {
            const d = new Date(allDates[startIndex] + 'T00:00:00');
            monthSpan.textContent = months[d.getMonth()];
            yearSpan.textContent = d.getFullYear();
            CHART_STATE_V2.currentMonth = d.getMonth();
            CHART_STATE_V2.currentYear = d.getFullYear();
        }

        let maxVal = 0;
        // Берем только уникальные активности, чтобы не было дублей
        const uniqueSessions = [];
        const seenIds = new Set();
        for (const sess of window.DATA.sessions || []) {
            if (!seenIds.has(sess.id)) {
                seenIds.add(sess.id);
                uniqueSessions.push(sess);
            }
        }

        for (let i = startIndex; i <= endIndex && i < allDates.length; i++) {
            const dateStr = allDates[i];
            let v = 0;
            for (const sess of mergedSessions) {
                if (sess.date === dateStr) {
                    if (CHART_STATE_V2.metric === 'duration') v += sess.duration_min || 0;
                    else if (CHART_STATE_V2.metric === 'events') v += sess.events || 0;
                    else if (CHART_STATE_V2.metric === 'screens') v += sess.screens || 0;
                    else if (CHART_STATE_V2.metric === 'tasks') v += sess.tasks_done || 0;
                }
            }
            if (v > maxVal) maxVal = v;
        }
        if (maxVal === 0) maxVal = CHART_STATE_V2.metric === 'duration' ? 720 : 10;

        // Округляем максимальное значение ВВЕРХ до целого (без кратных 4)
        if (CHART_STATE_V2.metric === 'duration') {
            // Для времени: переводим минуты в часы и округляем вверх до целого
            const hours = maxVal / 60;
            const roundedHours = Math.ceil(hours);
            maxVal = roundedHours * 60;
        } else {
            // Для остальных метрик: просто округляем вверх до целого
            maxVal = Math.ceil(maxVal);
        }

        // Отрисовка Оси Y (абсолютное позиционирование)
        let yHTML = '';
        const step = maxVal / 4;
        // Верхняя метка (100%)
        const topVal = maxVal;
        const topLbl = CHART_STATE_V2.metric === 'duration' ? (Math.floor(topVal / 60) + 'ч') : String(topVal);
        yHTML += `<div style="position: absolute; top: 0; right: 8px; transform: translateY(0);">${topLbl}</div>`;
        
        // Центральная метка (50%)
        const midVal = Math.round(step * 2);
        const midLbl = CHART_STATE_V2.metric === 'duration' ? (Math.floor(midVal / 60) + 'ч') : String(midVal);
        yHTML += `<div style="position: absolute; top: 50%; right: 8px; transform: translateY(-50%);">${midLbl}</div>`;
        
        // Нижняя метка (0%)
        yHTML += `<div style="position: absolute; bottom: 30px; right: 8px; transform: translateY(0);">0</div>`;
        
        yAxis.innerHTML = yHTML;

        // Отрисовка столбиков и легенды
        const cols = scrollContainer.querySelectorAll('.tl-col');
        cols.forEach(col => {
            const dateStr = col.dataset.date;
            let v = 0;
            for (const sess of mergedSessions) {
                if (sess.date === dateStr) {
                    if (CHART_STATE_V2.metric === 'duration') v += sess.duration_min || 0;
                    else if (CHART_STATE_V2.metric === 'events') v += sess.events || 0;
                    else if (CHART_STATE_V2.metric === 'screens') v += sess.screens || 0;
                    else if (CHART_STATE_V2.metric === 'tasks') v += sess.tasks_done || 0;
                }
            }
            const h = v ? Math.max(2, Math.round(v / maxVal * 100)) : 0;
            col.querySelector('.tl-bar').style.height = h + '%';
            
            if (dateStr === CHART_STATE_V2.selectedDay) {
                col.querySelector('.tl-bar').classList.add('selected');
                
                // Записываем текст в фиксированную строку
                const text = CHART_STATE_V2.metric === 'duration' ? fmtH(v) : String(v);
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

    // Слушаем скролл
    scrollContainer.addEventListener('scroll', () => {
        clearTimeout(scrollContainer._scrollTimeout);
        scrollContainer._scrollTimeout = setTimeout(() => {
            if (CHART_STATE_V2.selectedDay) {
                CHART_STATE_V2.selectedDay = null;
                legendBar.textContent = '';
            }
            updateChart();
        }, 100);
    });

    // Клик
    scrollContainer.addEventListener('click', (e) => {
        const col = e.target.closest('.tl-col');
        if (!col) return;
        
        const dateStr = col.dataset.date;

        if (CHART_STATE_V2.selectedDay === dateStr) {
            CHART_STATE_V2.selectedDay = null;
            legendBar.textContent = '';
            updateChart();
            return;
        }

        CHART_STATE_V2.selectedDay = dateStr;
        updateChart();
    });

    // Смена метрики
    c.querySelectorAll('.cal-btn[data-metric]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            CHART_STATE_V2.metric = btn.dataset.metric;
            CHART_STATE_V2.selectedDay = null;
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

    // Анимация входа
    setTimeout(() => {
        scrollContainer.scrollTo({ left: scrollContainer.scrollWidth, behavior: 'smooth' });
        setTimeout(() => { updateChart(); }, 600);
    }, 100);

    // Скрываем тултип при клике в любое пустое место
    const hideTooltip = (e) => {
        if (!e.target.closest('.tl-col')) {
            CHART_STATE_V2.selectedDay = null;
            legendBar.textContent = '';
            updateChart();
        }
    };
    c.removeEventListener('click', hideTooltip);
    c.addEventListener('click', hideTooltip);

    // ПРИНУДИТЕЛЬНЫЙ ПЕРВЫЙ РЕНДЕР ОСИ (до скролла)
    // Вызываем updateChart сразу после построения ленты
    setTimeout(() => {
        updateChart();
    }, 50);
}
// === ОБНОВЛЕННЫЙ DASHBOARD С АНИМАЦИЕЙ ===