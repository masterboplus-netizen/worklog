// МОДУЛЬ: НАСТРОЙКИ

function renderSettingsScreen() {
  const c = document.getElementById('content-settings');
  if (!c) return;
  c.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.className = 'section';
  wrap.style.cssText = 'padding:16px;';
  wrap.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
      <h2 style="color:var(--fg);font-size:22px;margin:0;">Настройки</h2>
      <button id="settings-close-btn" style="background:transparent;border:0;color:var(--fg-dim);font-size:24px;cursor:pointer;padding:4px;">✕</button>
    </div>
    <div style="font-size:13px;color:var(--fg-dim);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">Активность</div>
    <div id="settings-tags-row" style="display:flex;align-items:center;justify-content:space-between;padding:16px;background:rgba(255,255,255,0.03);border-radius:12px;border:1px solid rgba(255,255,255,0.05);cursor:pointer;margin-bottom:12px;">
      <div>
        <div style="font-size:16px;color:var(--fg);">Теги</div>
        <div style="font-size:12px;color:var(--fg-dim);">Управление тегами активностей</div>
      </div>
      <div style="color:var(--fg-dim);font-size:20px;">›</div>
    </div>
  `;
  c.appendChild(wrap);
  document.getElementById('settings-tags-row').addEventListener('click', () => switchTab('tags'));
  document.getElementById('settings-close-btn').addEventListener('click', () => switchTab('dashboard'));
}
window.renderSettingsScreen = renderSettingsScreen;
