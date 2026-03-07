/* TNC NEWS — ANIMATIONS.JS
   入場動畫控制邏輯
*/
(function () {
  var overlay  = document.getElementById('intro-overlay');
  var site     = document.getElementById('site-wrapper');
  var content  = document.querySelector('.intro-content');
  var brand    = document.querySelector('.intro-brand');
  var bars     = document.querySelectorAll('.intro-bar');
  var rule     = document.querySelector('.intro-rule');
  var sub      = document.querySelector('.intro-sub');
  var loader   = document.querySelector('.intro-loader');
  var header   = document.querySelector('.site-header');
  var breaking = document.querySelector('.breaking-bar');

  // 入場動畫序列（更精緻的時間點）
  requestAnimationFrame(function () {
    // Step 1: 頂部細線從上落下
    if (content) setTimeout(function () { content.classList.add('animate-line'); }, 80);
    // Step 2: 兩側橫線展開
    setTimeout(function () {
      bars.forEach(function (b) { b.classList.add('animate'); });
    }, 250);
    // Step 3: Logo 淡入上升
    setTimeout(function () { brand.classList.add('animate'); }, 450);
    // Step 4: 底部裝飾線展開
    setTimeout(function () { if (rule) rule.classList.add('animate'); }, 800);
    // Step 5: 副標淡入
    setTimeout(function () { sub.classList.add('animate'); }, 950);
    // Step 6: 載入點出現
    setTimeout(function () { loader.classList.add('animate'); }, 1250);
  });

  // 3.2秒後淡出 intro，以頁面淡入取代
  setTimeout(function () {
    overlay.classList.add('fade-out');
    site.classList.remove('hidden');
    site.classList.add('visible');
    if (header)   header.classList.add('play');
    if (breaking) breaking.classList.add('play');
    initScrollReveal();
  }, 3200);

  // 捲動顯示動畫
  function initScrollReveal() {
    var targets = document.querySelectorAll(
      '.cat-section, .sidebar-widget, .section-hero, .site-footer'
    );
    targets.forEach(function (el) {
      el.classList.add('reveal');
    });

    if (!('IntersectionObserver' in window)) {
      targets.forEach(function (el) { el.classList.add('in-view'); });
      return;
    }

    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('in-view');
          obs.unobserve(e.target);
        }
      });
    }, { threshold: 0.08 });

    targets.forEach(function (el) { obs.observe(el); });
  }
})();
