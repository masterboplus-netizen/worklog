// МОДУЛЬ: SUPABASE CLIENT
const SUPABASE_URL = "https://ruomhtlvyqmaqhqqsfqn.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1b21odGx2eXFtYXFocXFzZnFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMzOTQwMjUsImV4cCI6MjEwODk3MDAyNX0.7FWm5KVmMqyVxNjXMhcGhgzb6nD8aLfie7cxBlohIO4";

async function loadDataFromSupabase() {
    try {
        console.log("Загрузка данных из Supabase...");
        
        // Проверяем, загрузилась ли библиотека
        if (typeof window.supabase === 'undefined') {
            throw new Error('Библиотека supabase-js не загружена');
        }

        // Создаем клиент внутри функции
        const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

        const { data: projects, error: e1 } = await supabase.from('worklog_projects').select('*');
        if (e1) throw e1;

        const { data: phases, error: e2 } = await supabase.from('worklog_phases').select('*').order('order_num');
        if (e2) throw e2;

        const { data: tasks, error: e3 } = await supabase.from('worklog_tasks').select('*').order('order_num');
        if (e3) throw e3;

        const { data: subtasks, error: e3_sub } = await supabase.from('worklog_subtasks').select('*');
        if (e3_sub) throw e3_sub;

        const { data: sessions, error: e4 } = await supabase.from('worklog_sessions').select('*').order('date', { ascending: false }).order('start_time', { ascending: false });
        if (e4) throw e4;

        // Приводим данные из базы к формату старого JSON
        const mappedSessions = (sessions || []).map(s => ({
            id: s.id,
            date: s.date,
            start: s.start_time,     // Переименовываем
            end: s.end_time,         // Переименовываем
            project: s.project_id,   // Переименовываем
            duration_min: s.duration_min || 0,
            events: s.events || 0,
            screens: s.screens || 0,
            tasks_done: s.tasks_done || 0,
            note: s.note || ''
        }));

        window.DATA = {
            projects: projects || [],
            sessions: mappedSessions,
            baseline: { minutes: 336, messages: 0 } // Временно, или найдем в сессиях
        };

        window.DATA.projects.forEach(proj => {
            proj.plan = phases.filter(ph => ph.project_id === proj.id).map(ph => {
                return {
                    phase: ph.name,
                    status: ph.status,
                    items: tasks.filter(t => t.phase_id === ph.id).map(t => ({
                        text: t.name,
                        done: t.status === 'done',
                        status: t.status,
                        subtasks: (subtasks || []).filter(st => st.task_id === t.id).map(st => ({
                            text: st.name,
                            done: st.status === 'done',
                            status: st.status
                        }))
                    }))
                };
            });
        });

                // ОТЛАДКА: смотрим, что пришло из базы
        if (window.DATA.sessions.length > 0) {
            const first = window.DATA.sessions[0];
            
            
        }
        
        console.log("✅ Данные загружены из Supabase");
        return true;
    } catch (e) {
        console.error("❌ Ошибка загрузки из Supabase:", e);
        // Показываем ошибку на экране
        const errDiv = document.getElementById('debug-error');
        if (errDiv) errDiv.remove();
        const d = document.createElement('div');
        d.id = 'debug-error';
        d.style.cssText = 'position:fixed; bottom:10px; left:10px; right:10px; background:red; color:white; padding:15px; z-index:99999; font-size:14px; border-radius:8px;';
        d.textContent = 'ОШИБКА SUPABASE: ' + e.message;
        document.body.appendChild(d);
        return false;
    }
}
