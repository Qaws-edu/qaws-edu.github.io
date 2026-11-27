/* قَوْس: الوضع الليلي. الاختيار يُحفظ في localStorage باسم qaws-theme (dark أو light) */
(function () {
  var KEY = 'qaws-theme', root = document.documentElement;
  function get() { try { return localStorage.getItem(KEY) === 'dark' ? 'dark' : 'light'; } catch (e) { return 'light'; } }
  function apply(t) {
    if (t === 'dark') root.setAttribute('data-theme', 'dark'); else root.removeAttribute('data-theme');
    var m = document.querySelector('meta[name=theme-color]');
    if (m) m.setAttribute('content', t === 'dark' ? '#112033' : '#FFFBF2');
    var b = document.querySelectorAll('.hthemes');
    for (var i = 0; i < b.length; i++) { b[i].setAttribute('aria-pressed', t === 'dark'); b[i].innerHTML = icon(t); b[i].title = t === 'dark' ? 'الوضع النهاري' : 'الوضع الليلي'; b[i].setAttribute('aria-label', b[i].title); }
  }
  var SUN = '<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
  var MOON = '<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';
  function icon(t) { return t === 'dark' ? SUN : MOON; }
  function toggle() {
    var n = get() === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem(KEY, n); } catch (e) {}
    apply(n);
  }
  function mount() {
    var hs = document.querySelectorAll('header');
    for (var i = 0; i < hs.length; i++) {
      if (hs[i].querySelector('.hthemes')) continue;
      var sides = hs[i].querySelectorAll('.side'), side = sides[sides.length - 1];
      if (!side) continue;
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'hthemes'; b.onclick = toggle;
      side.insertBefore(b, side.firstChild);
    }
    apply(get());
  }
  apply(get());
  var t = null;
  function sched() { if (t) return; t = setTimeout(function () { t = null; mount(); }, 30); }
  function start() {
    mount();
    new MutationObserver(sched).observe(document.getElementById('app') || document.body, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  window.addEventListener('storage', function (e) { if (e.key === KEY) apply(get()); });
})();
