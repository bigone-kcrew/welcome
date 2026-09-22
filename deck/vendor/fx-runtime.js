/* html-ppt :: fx-runtime.js
 * Canvas FX autoloader + lifecycle manager.
 * - Dynamically loads all fx modules listed in FX_LIST
 * - Initializes [data-fx] elements when their slide becomes active
 * - Calls handle.stop() when the slide leaves
 */
(function(){
  'use strict';

  // 이 덱에서 실제로 쓰는 것만 남긴다 (원본은 20종 전부를 즉시 로드한다)
  const FX_LIST = ['_util', 'starfield'];

  // Resolve base path of this script so it works from any page location.
  const myScript = document.currentScript || (function(){
    const all = document.getElementsByTagName('script');
    for (const s of all){ if (s.src && s.src.indexOf('fx-runtime.js')>-1) return s; }
    return null;
  })();
  const base = myScript ? myScript.src.replace(/fx-runtime\.js.*$/, 'fx/') : 'assets/animations/fx/';

  let loaded = 0;
  const total = FX_LIST.length;
  const ready = new Promise((resolve) => {
    if (!total) return resolve();
    FX_LIST.forEach((name) => {
      const s = document.createElement('script');
      s.src = base + name + '.js';
      s.async = false;
      s.onload = s.onerror = () => { if (++loaded >= total) resolve(); };
      document.head.appendChild(s);
    });
  });

  window.__hpxActive = window.__hpxActive || new Map();

  // data-fx 는 슬라이드 자신에 붙는다. querySelectorAll 은 자손만 보므로
  // 뿌리도 함께 넣어야 한다 (원본의 결함 — 이 때문에 효과가 돈 적이 없다).
  function fxEls(root){
    const list = [...root.querySelectorAll('[data-fx]')];
    if (root.hasAttribute && root.hasAttribute('data-fx')) list.unshift(root);
    return list;
  }

  function initFxIn(root){
    if (!window.HPX) return;
    const els = fxEls(root);
    els.forEach((el) => {
      if (window.__hpxActive.has(el)) return;
      const name = el.getAttribute('data-fx');
      const fn = window.HPX[name];
      if (typeof fn !== 'function') return;
      try {
        const handle = fn(el, {}) || { stop(){} };
        window.__hpxActive.set(el, handle);
      } catch(e){ console.warn('[hpx-fx]', name, e); }
    });
  }

  function stopFxIn(root){
    const els = fxEls(root);
    els.forEach((el) => {
      const h = window.__hpxActive.get(el);
      if (h && typeof h.stop === 'function'){
        try{ h.stop(); }catch(e){}
      }
      window.__hpxActive.delete(el);
    });
  }

  function reinitFxIn(root){
    stopFxIn(root);
    initFxIn(root);
  }
  window.__hpxReinit = reinitFxIn;

  function boot(){
    ready.then(() => {
      const active = document.querySelector('.slide.is-active') || document.querySelector('.slide');
      if (active) initFxIn(active);

      // Watch all slides for class changes
      const slides = document.querySelectorAll('.slide');
      slides.forEach((sl) => {
        const mo = new MutationObserver((muts) => {
          for (const m of muts){
            if (m.attributeName === 'class'){
              if (sl.classList.contains('is-active')) initFxIn(sl);
              else stopFxIn(sl);
            }
          }
        });
        mo.observe(sl, { attributes: true, attributeFilter: ['class'] });
      });
    });
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
