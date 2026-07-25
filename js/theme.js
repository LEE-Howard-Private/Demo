/* ==================================================================
   亮 / 暗模式
   優先順序：使用者手動選過的 > 系統 prefers-color-scheme > 亮色。
   ================================================================== */
window.THEME = (function () {

  const KEY = 'hsinchu-bus-theme';
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const listeners = [];

  function stored() {
    try { return localStorage.getItem(KEY); } catch { return null; }
  }

  let theme = stored() || (media.matches ? 'dark' : 'light');

  function apply() {
    document.documentElement.setAttribute('data-theme', theme);
  }

  function get() { return theme; }

  function set(t) {
    if (t !== 'light' && t !== 'dark') return;
    theme = t;
    try { localStorage.setItem(KEY, t); } catch { /* 存不了就算了 */ }
    apply();
    listeners.forEach((fn) => fn(theme));
  }

  function toggle() { set(theme === 'dark' ? 'light' : 'dark'); }

  function onChange(fn) { listeners.push(fn); }

  // 使用者還沒手動選過的話，系統切換深色模式時跟著換
  media.addEventListener('change', (e) => {
    if (stored()) return;
    theme = e.matches ? 'dark' : 'light';
    apply();
    listeners.forEach((fn) => fn(theme));
  });

  apply();

  return { get, set, toggle, onChange };
})();
