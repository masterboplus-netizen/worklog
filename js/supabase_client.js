// МОДУЛЬ: SUPABASE CLIENT
const SUPABASE_URL = "https://ruomhtlvyqmaqhqqsfqn.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1b21odGx2eXFtYXFocXFzZnFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMzOTQwMjUsImV4cCI6MjEwODk3MDAyNX0.7FWm5KVmMqyVxNjXMhcGhgzb6nD8aLfie7cxBlohIO4";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

async function loadDataFromSupabase() {
    try {
        console.log("Загрузка данных из Supabase...");
        
        const { data: projects } = await supabase.from('worklog_projects').select('*');
        const { data: phases } = await supabase.from('worklog_phases').select('*').order('order_num');
        const { data: tasks } = await supabase.from('worklog_tasks').select('*').order('order_num');
        const { data: sessions } = await supabase.from('worklog_sessions').select('*').order('date', { ascending: false });

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

        console.log("✅ Данные загружены из Supabase");
        return true;
    } catch (e) {
        console.error("❌ Ошибка загрузки из Supabase:", e);
        return false;
    }
}
