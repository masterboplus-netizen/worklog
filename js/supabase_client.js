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

        const { data: sessions, error: e4 } = await supabase.from('worklog_sessions').select('*').order('date', { ascending: false });
        if (e4) throw e4;

        window.DATA = {
            projects: projects || [],
            sessions: sessions || [],
            baseline: sessions.find(s => s.id === 'baseline') || { minutes: 0, messages: 0 }
        };

        window.DATA.projects.forEach(proj => {
            proj.plan = phases.filter(ph => ph.project_id === proj.id).map(ph => {
                return {
                    phase: ph.name,
                    status: ph.status,
                    items: tasks.filter(t => t.phase_id === ph.id).map(t => ({
                        text: t.name,
                        done: t.status === 'done',
                        status: t.status
                    }))
                };
            });
        });

                // ОТЛАДКА: смотрим, что пришло из базы
        if (window.DATA.sessions.length > 0) {
            const first = window.DATA.sessions[0];
            console.log("ПЕРВАЯ СЕССИЯ ИЗ БАЗЫ:", JSON.stringify(first, null, 2));
            alert("Первая сессия: date=" + first.date + ", start=" + first.start_time + ", project=" + first.project_id);
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
