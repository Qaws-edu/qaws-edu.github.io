/* تثبيت قَوْس كتطبيق + تسجيل الـ service worker */
(function () {
  if (!('serviceWorker' in navigator)) return;
  var base = (document.currentScript && document.currentScript.src) ? new URL('../', document.currentScript.src).href : './';
  var standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

  window.addEventListener('load', function () {
    navigator.serviceWorker.register(base + 'sw.js', { scope: base, updateViaCache: 'none' }).then(function (reg) {
      document.addEventListener('visibilitychange', function () { if (!document.hidden) reg.update().catch(function () {}); });
    }).catch(function () {});
  });
  if (standalone) return;

  var ua = navigator.userAgent || '';
  var ios = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var KEY = 'qaws-pwa-hide-until', deferred = null, btn = null;
  var hideUntil = 0; try { hideUntil = +localStorage.getItem(KEY) || 0; } catch (e) {}
  if (Date.now() < hideUntil) return;

  function style() {
    var s = document.createElement('style');
    s.textContent = '.pwa-bar{position:fixed;z-index:99999;left:12px;right:12px;bottom:78px;max-width:406px;margin:0 auto;display:flex;align-items:center;gap:10px;background:#fff;color:#0F4C5C;border:2px solid rgba(15,76,92,.25);border-radius:20px;box-shadow:0 4px 0 rgba(10,70,90,.25),0 10px 18px rgba(10,60,80,.2);padding:10px 12px;font-family:Tajawal,Tahoma,Arial,sans-serif;direction:rtl}.pwa-bar img{width:44px;height:44px;border-radius:12px;flex:none}.pwa-bar div{flex:1;font-size:14px;line-height:1.5;font-weight:800}.pwa-bar button{font:inherit;font-weight:800;font-size:14px;border:0;border-radius:12px;padding:8px 16px;cursor:pointer;background:#FFD25E;color:#6A3F00;box-shadow:0 3px 0 rgba(10,70,90,.25)}.pwa-bar .x{background:#E3F3F5;color:#0F4C5C;padding:8px 11px}html[data-theme=dark] .pwa-bar{background:#1F344E;color:#E8EEF5;border-color:rgba(255,255,255,.14)}html[data-theme=dark] .pwa-bar .x{background:#2A4160;color:#E8EEF5}';
    document.head.appendChild(s);
  }
  function close(days) {
    try { localStorage.setItem(KEY, String(Date.now() + days * 864e5)); } catch (e) {}
    if (btn) { btn.remove(); btn = null; }
  }
  function bar(text, action) {
    if (btn) return; style();
    btn = document.createElement('div'); btn.className = 'pwa-bar'; btn.setAttribute('role', 'dialog');
    btn.innerHTML = '<img src="' + base + 'icons/icon-192.png" alt=""><div></div>' + (action ? '<button type="button" class="go">تثبيت</button>' : '') + '<button type="button" class="x" aria-label="إغلاق">✕</button>';
    btn.querySelector('div').textContent = text;
    btn.querySelector('.x').onclick = function () { close(ios ? 14 : 7); };
    if (action) btn.querySelector('.go').onclick = action;
    document.body.appendChild(btn);
  }
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault(); deferred = e;
    bar('ثبّت قَوْس على موبايلك وافتحه كتطبيق', function () {
      deferred.prompt(); deferred.userChoice.then(function (r) { deferred = null; close(r && r.outcome === 'accepted' ? 365 : 3); });
    });
  });
  window.addEventListener('appinstalled', function () { close(365); });
  if (ios) setTimeout(function () {
    bar('للتثبيت: اضغط زر المشاركة ثم «إضافة إلى الشاشة الرئيسية»', null);
  }, 2500);
})();
