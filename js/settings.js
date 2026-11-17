// МОДУЛЬ: НАСТРОЙКИ

function renderSettingsScreen() {
  const c = document.getElementById('content-settings');
  if (!c) return;
  c.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.className = 'section';
  wrap.style.cssText = 'padding:16px;';
  wrap.innerHTML = `
    <h2 style="margin-bottom:16px;color:var(--fg);font-size:22px;">Настройки</h2>
    <div style="font-size:13px;color:var(--fg-dim);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">Активность</div>
    <div id="settings-tags-row" style="display:flex;align-items:center;justify-content:space-between;padding:16px;background:rgba(255,255,255,0.03);border-radius:12px;border:1px solid rgba(255,255,255,0.05);cursor:pointer;margin-bottom:12px;">
      <div>
        <div style="font-size:16px;color:var(--fg);">Теги</div>
        <div style="font-size:12px;color:var(--fg-dim);">Управление тегами сессий</div>
      </div>
      <div style="color:var(--fg-dim);font-size:20px;">›</div>
    </div>
  `;
  c.appendChild(wrap);
  document.getElementById('settings-tags-row').addEventListener('click', () => switchTab('tags'));
}
window.renderSettingsScreen = renderSettingsScreen;
