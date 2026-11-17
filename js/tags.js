// МОДУЛЬ: ТЕГИ
// Экран: Активность → Теги

async function loadTags() {
  if (!window.supabaseClient) throw new Error('Supabase client not init');
  const { data, error } = await window.supabaseClient.from('worklog_tags').select('*').order('name');
  if (error) throw error;
  if (window.DATA) window.DATA.tags = data || [];
  return data || [];
}

function renderTagsScreen() {
  const c = document.getElementById('content-tags');
  if (!c) return;
  c.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.className = 'section';
  wrap.style.cssText = 'padding:16px;';
  wrap.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
      <button id="tag-back-btn" style="background:transparent;border:0;color:var(--fg);font-size:24px;cursor:pointer;padding:0 4px;">‹</button>
      <div style="font-size:20px;font-weight:700;flex:1;">Теги</div>
      <button id="tag-add-btn" class="pulse-btn" style="background:var(--accent);color:#fff;border:0;padding:8px 14px;border-radius:8px;cursor:pointer;">+ Добавить</button>
    </div>
    <div id="tags-list"></div>
  `;
  c.appendChild(wrap);
  renderTagsList();
  document.getElementById('tag-add-btn').addEventListener('click', () => openTagEditor());
  document.getElementById('tag-back-btn').addEventListener('click', () => switchTab('settings'));
}

function renderTagsList() {
  const list = document.getElementById('tags-list');
  if (!list) return;
  const tags = window.DATA && window.DATA.tags ? window.DATA.tags : [];
  if (!tags.length) { list.innerHTML = '<div class="empty" style="padding:20px 0;text-align:center;color:var(--fg-dim);">Тегов пока нет</div>'; return; }
  list.innerHTML = '';
  tags.forEach(t => {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:12px;padding:12px;margin-bottom:8px;background:rgba(255,255,255,0.03);border-radius:12px;border:1px solid rgba(255,255,255,0.05);';
    row.innerHTML = `
      <span style="width:14px;height:14px;border-radius:50%;background:${t.color || '#7c8cff'};flex-shrink:0;"></span>
      <div style="flex:1;">
        <div style="font-size:15px;color:var(--fg);">${escapeHtml(t.name)}</div>
        ${t.category ? `<div style="font-size:12px;color:var(--fg-dim);">${escapeHtml(t.category)}</div>` : ''}
      </div>
      <button data-edit="${t.id}" style="background:transparent;border:0;color:var(--fg-dim);cursor:pointer;padding:4px;">✏️</button>
      <button data-del="${t.id}" style="background:transparent;border:0;color:var(--red);cursor:pointer;padding:4px;">🗑️</button>
    `;
    list.appendChild(row);
  });
  list.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => openTagEditor(b.dataset.edit)));
  list.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => deleteTag(b.dataset.del)));
}

function escapeHtml(s) { return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

function openTagEditor(id) {
  const tags = window.DATA && window.DATA.tags ? window.DATA.tags : [];
  const tag = id ? tags.find(t => String(t.id) === String(id)) : { name: '', color: '#7c8cff', category: '' };
  const overlay = document.createElement('div');
  overlay.className = 'goal-sheet-overlay';
  overlay.innerHTML = `
    <div class="goal-sheet" style="padding:24px;">
      <h3 style="margin-bottom:16px;color:var(--fg);">${id ? 'Редактировать тег' : 'Новый тег'}</h3>
      <input id="tag-name" type="text" value="${escapeHtml(tag.name)}" placeholder="Название (напр. #fix)"
        style="width:100%;padding:12px;border-radius:8px;border:1px solid var(--border);background:var(--bg3);color:var(--fg);font-size:16px;margin-bottom:12px;box-sizing:border-box;">
      <input id="tag-category" type="text" value="${escapeHtml(tag.category || '')}" placeholder="Категория (опционально)"
        style="width:100%;padding:12px;border-radius:8px;border:1px solid var(--border);background:var(--bg3);color:var(--fg);font-size:16px;margin-bottom:12px;box-sizing:border-box;">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">
        <label style="color:var(--fg-dim);font-size:14px;">Цвет:</label>
        <input id="tag-color" type="color" value="${tag.color || '#7c8cff'}"
          style="width:48px;height:36px;border:0;background:transparent;cursor:pointer;">
      </div>
      <div style="display:flex;gap:8px;">
        <button id="tag-cancel" style="flex:1;padding:12px;border-radius:8px;border:1px solid var(--border);background:transparent;color:var(--fg);cursor:pointer;">Отмена</button>
        <button id="tag-save" style="flex:1;padding:12px;border-radius:8px;border:0;background:var(--accent);color:#fff;cursor:pointer;font-weight:600;">Сохранить</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  document.getElementById('tag-cancel').addEventListener('click', () => overlay.remove());
  document.getElementById('tag-save').addEventListener('click', async () => {
    const name = document.getElementById('tag-name').value.trim();
    const category = document.getElementById('tag-category').value.trim();
    const color = document.getElementById('tag-color').value;
    if (!name) return alert('Введите название');
    try {
      if (id) await updateTag(id, name, color, category);
      else await createTag(name, color, category);
      overlay.remove();
      await loadTags();
      renderTagsList();
    } catch (e) { alert('Ошибка: ' + e.message); }
  });
}

async function createTag(name, color, category) {
  const { error } = await window.supabaseClient.from('worklog_tags').insert({ name, color, category });
  if (error) throw error;
}
async function updateTag(id, name, color, category) {
  const { error } = await window.supabaseClient.from('worklog_tags').update({ name, color, category }).eq('id', id);
  if (error) throw error;
}
async function deleteTag(id) {
  if (!confirm('Удалить тег? Он отвяжется от всех сессий.')) return;
  const { error } = await window.supabaseClient.from('worklog_tags').delete().eq('id', id);
  if (error) return alert('Ошибка: ' + error.message);
  await loadTags();
  renderTagsList();
}

// Экспорт для switchTab
window.renderTagsScreen = renderTagsScreen;
