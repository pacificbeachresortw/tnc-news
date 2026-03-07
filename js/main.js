/* TNC NEWS — MAIN.JS
   互動功能：日期、搜尋、漢堡選單、回頂部
*/

// 顯示今日日期
(function () {
  var el = document.getElementById('live-date');
  if (!el) return;
  var now = new Date();
  var opts = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
  el.textContent = now.toLocaleDateString('zh-TW', opts);
})();

// 搜尋列開關
(function () {
  var btn = document.getElementById('search-toggle');
  var bar = document.getElementById('search-bar');
  if (!btn || !bar) return;

  btn.addEventListener('click', function () {
    var isOpen = bar.classList.toggle('open');
    btn.setAttribute('aria-expanded', isOpen);
    if (isOpen) {
      var input = bar.querySelector('input');
      if (input) setTimeout(function () { input.focus(); }, 100);
    }
  });

  // 點擊外部關閉
  document.addEventListener('click', function (e) {
    if (!bar.contains(e.target) && !btn.contains(e.target)) {
      bar.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
    }
  });
})();

// 漢堡選單開關
(function () {
  var hamburger = document.getElementById('hamburger');
  var nav       = document.getElementById('main-nav');
  if (!hamburger || !nav) return;

  // 建立遮罩
  var overlay = document.createElement('div');
  overlay.style.cssText = [
    'position:fixed', 'inset:0', 'background:rgba(0,0,0,0.6)',
    'z-index:149', 'display:none', 'opacity:0',
    'transition:opacity .3s ease'
  ].join(';');
  document.body.appendChild(overlay);

  function openMenu() {
    hamburger.classList.add('active');
    nav.classList.add('open');
    overlay.style.display = 'block';
    requestAnimationFrame(function () { overlay.style.opacity = '1'; });
    document.body.style.overflow = 'hidden';
  }

  function closeMenu() {
    hamburger.classList.remove('active');
    nav.classList.remove('open');
    overlay.style.opacity = '0';
    setTimeout(function () { overlay.style.display = 'none'; }, 300);
    document.body.style.overflow = '';
  }

  hamburger.addEventListener('click', function () {
    if (nav.classList.contains('open')) { closeMenu(); } else { openMenu(); }
  });

  overlay.addEventListener('click', closeMenu);

  // ESC 鍵關閉
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeMenu();
  });

  // 視窗放大時自動關閉
  window.addEventListener('resize', function () {
    if (window.innerWidth > 900) closeMenu();
  });
})();

// 回頂部按鈕
(function () {
  var btn = document.getElementById('back-to-top');
  if (!btn) return;

  window.addEventListener('scroll', function () {
    if (window.scrollY > 400) {
      btn.classList.add('show');
    } else {
      btn.classList.remove('show');
    }
  }, { passive: true });

  btn.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
})();

// Header scroll blur 效果（捲動超過 80px 加玻璃質感）
(function () {
  var header = document.querySelector('.site-header');
  if (!header) return;

  window.addEventListener('scroll', function () {
    if (window.scrollY > 80) {
      header.classList.add('site-header--scrolled');
    } else {
      header.classList.remove('site-header--scrolled');
    }
  }, { passive: true });
})();

// 導航連結 active 狀態
(function () {
  var links = document.querySelectorAll('.main-nav a');
  links.forEach(function (link) {
    link.addEventListener('click', function () {
      links.forEach(function (l) { l.classList.remove('active'); });
      this.classList.add('active');
    });
  });
})();

// ══ Canvas 海浪動畫（慢速真實） ══
(function () {
  var canvas = document.getElementById('wave-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var W, H;
  var t = 0;

  // 三層慢速波浪（speed 大幅降低，振幅拉高）
  var waves = [
    { amp: 13, freq: 0.012, speed: 0.008,  phase: 0,    alpha: 1.00, yFrac: 0.60 },
    { amp: 9,  freq: 0.018, speed: -0.005, phase: 1.2,  alpha: 0.50, yFrac: 0.48 },
    { amp: 6,  freq: 0.025, speed: 0.006,  phase: 2.5,  alpha: 0.22, yFrac: 0.38 }
  ];

  function resize() {
    W = canvas.offsetWidth || window.innerWidth;
    H = 56;
    canvas.width  = W;
    canvas.height = H;
  }

  function drawWave(w, time) {
    ctx.beginPath();
    var yMid = H * w.yFrac;
    ctx.moveTo(0, H);
    for (var x = 0; x <= W; x += 1) {
      // 多頻正弦疊加：主波 + 次波 + 微擾
      var y = yMid
        + Math.sin(x * w.freq + time + w.phase) * w.amp
        + Math.sin(x * w.freq * 1.6 + time * 0.7 + w.phase) * (w.amp * 0.35)
        + Math.sin(x * w.freq * 0.5 + time * 0.4) * (w.amp * 0.2);
      ctx.lineTo(x, y);
    }
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fillStyle = 'rgba(245,245,245,' + w.alpha + ')';
    ctx.fill();
  }

  function animate() {
    ctx.clearRect(0, 0, W, H);
    for (var i = waves.length - 1; i >= 0; i--) {
      drawWave(waves[i], t * waves[i].speed);
    }
    t++;
    requestAnimationFrame(animate);
  }

  resize();
  window.addEventListener('resize', resize);
  animate();
})();
