/* TNC NEWS - News Loader
 * 從 JSONbin 讀取新聞並渲染到前台頁面
 * API Key 讀自 localStorage（由 admin.html 儲存）
 */
(function () {
  'use strict';

  var keys = {};
  try { keys = JSON.parse(localStorage.getItem('tnc_admin_keys') || '{}'); } catch (e) {}

  var JSONBIN_KEY = keys.jsonbinKey || '';
  var JSONBIN_BIN = keys.jsonbinBinId || '';

  if (!JSONBIN_KEY || !JSONBIN_BIN) return;

  function fmtDate(val) {
    if (!val) return '';
    var d = new Date(val);
    if (isNaN(d.getTime())) return val;
    var m = d.getMonth() + 1;
    var day = d.getDate();
    var hh = String(d.getHours()).padStart(2, '0');
    var mm = String(d.getMinutes()).padStart(2, '0');
    return m + '\u6708' + day + '\u65E5 ' + hh + ':' + mm;
  }

  function esc(str) {
    return String(str || '').replace(/&/g,'&').replace(/</g,'<').replace(/>/g,'>').replace(/"/g,'"');
  }

  function articleUrl(article) {
    return 'pages/news/' + encodeURIComponent(article.id) + '.html';
  }

  /* ===== HERO ===== */
  function renderHero(news) {
    var hero = document.querySelector('.section-hero');
    if (!hero) return;
    var top = news[0];
    var sides = news.slice(1, 4);

    var primaryEl = hero.querySelector('.hero-primary');
    var sideEl = hero.querySelector('.hero-side');
    if (!primaryEl || !sideEl) return;

    var imgHtml = top.image
      ? '<img src="' + esc(top.image) + '" alt="' + esc(top.title) + '" style="width:100%;height:100%;object-fit:cover;display:block" />'
      : '<div class="placeholder-icon"><i class="fa-regular fa-newspaper"></i></div>';

    primaryEl.innerHTML = '<div class="news-card news-card--hero">'
      + '<a href="' + articleUrl(top) + '" class="card-img card-img--placeholder">' + imgHtml + '</a>'
      + '<div class="card-body">'
      + '<span class="card-tag">' + esc(top.category) + '</span>'
      + '<h2 class="card-title"><a href="' + articleUrl(top) + '">' + esc(top.title) + '</a></h2>'
      + (top.excerpt ? '<p class="card-excerpt">' + esc(top.excerpt) + '</p>' : '')
      + '<div class="card-meta"><span><i class="fa-regular fa-clock"></i> ' + fmtDate(top.date) + '</span>'
      + '<span><i class="fa-regular fa-user"></i> ' + esc(top.author || 'TNC \u7DE8\u8F2F') + '</span></div>'
      + '</div></div>';

    sideEl.innerHTML = sides.map(function(n) {
      var imgS = n.image
        ? '<img src="' + esc(n.image) + '" alt="" style="width:100%;height:100%;object-fit:cover;display:block" />'
        : '<div class="placeholder-icon"><i class="fa-regular fa-newspaper"></i></div>';
      return '<div class="news-card news-card--sm">'
        + '<a href="' + articleUrl(n) + '" class="card-img card-img--placeholder card-img--sm">' + imgS + '</a>'
        + '<div class="card-body">'
        + '<span class="card-tag card-tag--gray">' + esc(n.category) + '</span>'
        + '<h3 class="card-title card-title--sm"><a href="' + articleUrl(n) + '">' + esc(n.title) + '</a></h3>'
        + '<div class="card-meta"><span><i class="fa-regular fa-clock"></i> ' + fmtDate(n.date) + '</span></div>'
        + '</div></div>';
    }).join('');
  }

  /* ===== BREAKING TICKER ===== */
  function renderBreakingTicker(news) {
    var track = document.querySelector('.ticker-track');
    if (!track) return;
    var breaking = news.filter(function(n){ return n.category === '\u5373\u6642'; }).slice(0, 8);
    var items = breaking.length ? breaking : news.slice(0, 5);
    var txt = items.map(function(n){ return esc(n.title); }).join(' &nbsp;&bull;&nbsp; ');
    track.innerHTML = '<span>' + txt + ' &nbsp;&bull;&nbsp; ' + txt + '</span>';
  }

  /* ===== CATEGORY SECTIONS ===== */
  function renderCatSection(cat, news) {
    var sec = document.querySelector('.cat-section[data-cat="' + cat + '"]');
    if (!sec) return;
    var grid = sec.querySelector('.cat-grid');
    if (!grid) return;
    var items = news.filter(function(n){ return n.category === cat; }).slice(0, 2);
    if (!items.length) return;
    grid.innerHTML = items.map(function(n) {
      var imgHtml = n.image
        ? '<img src="' + esc(n.image) + '" alt="" style="width:100%;height:100%;object-fit:cover;display:block" />'
        : '<div class="placeholder-icon"><i class="fa-solid fa-newspaper"></i></div>';
      return '<div class="news-card news-card--list">'
        + '<a href="' + articleUrl(n) + '" class="card-img card-img--placeholder card-img--md">' + imgHtml + '</a>'
        + '<div class="card-body">'
        + '<h3 class="card-title card-title--md"><a href="' + articleUrl(n) + '">' + esc(n.title) + '</a></h3>'
        + (n.excerpt ? '<p class="card-excerpt card-excerpt--sm">' + esc(n.excerpt) + '</p>' : '')
        + '<div class="card-meta"><span><i class="fa-regular fa-clock"></i> ' + fmtDate(n.date) + '</span></div>'
        + '</div></div>';
    }).join('');
  }

  /* ===== HOT LIST ===== */
  function renderHotList(news) {
    var list = document.querySelector('.hot-list');
    if (!list) return;
    var items = news.slice(0, 5);
    list.innerHTML = items.map(function(n, i) {
      return '<li class="hot-item">'
        + '<span class="hot-rank">' + String(i+1).padStart(2,'0') + '</span>'
        + '<a href="' + articleUrl(n) + '">' + esc(n.title) + '</a>'
        + '</li>';
    }).join('');
  }

  /* ===== SIDEBAR WIDGETS ===== */
  function renderSidebarWidget(cat, news) {
    var iconMap = {
      '\u79D1\u6280': 'fa-microchip',
      '\u5A1B\u6A02': 'fa-film',
      '\u9AD4\u80B2': 'fa-futbol',
      '\u751F\u6D3B': 'fa-leaf',
      '\u793E\u6703': 'fa-people-group',
      '\u570B\u969B': 'fa-earth-asia'
    };
    var icon = iconMap[cat] || 'fa-newspaper';
    var widgets = document.querySelectorAll('.sidebar-widget');
    var target = null;
    widgets.forEach(function(w) {
      var hdr = w.querySelector('.widget-header');
      if (hdr && hdr.textContent.indexOf(cat) > -1) target = w;
    });
    if (!target) return;
    var wlist = target.querySelector('.widget-news-list');
    if (!wlist) return;
    var items = news.filter(function(n){ return n.category === cat; }).slice(0, 3);
    if (!items.length) return;
    wlist.innerHTML = items.map(function(n) {
      return '<div class="wn-item">'
        + '<a href="' + articleUrl(n) + '" class="wn-img" style="overflow:hidden;display:flex;align-items:center;justify-content:center">'
        + (n.image ? '<img src="' + esc(n.image) + '" alt="" style="width:100%;height:100%;object-fit:cover" />' : '<i class="fa-solid ' + icon + '"></i>')
        + '</a>'
        + '<div class="wn-body">'
        + '<p><a href="' + articleUrl(n) + '">' + esc(n.title) + '</a></p>'
        + '<span><i class="fa-regular fa-clock"></i> ' + fmtDate(n.date) + '</span>'
        + '</div></div>';
    }).join('');
  }

  /* ===== MAIN ===== */
  function renderIndex(news) {
    var published = news.filter(function(n){ return n.published !== false; });
    if (!published.length) return;
    renderHero(published);
    renderBreakingTicker(published);
    renderCatSection('\u793E\u6703', published);
    renderCatSection('\u570B\u969B', published);
    renderCatSection('\u79D1\u6280', published);
    renderCatSection('\u5A1B\u6A02', published);
    renderCatSection('\u9AD4\u80B2', published);
    renderCatSection('\u751F\u6D3B', published);
    renderHotList(published);
    renderSidebarWidget('\u79D1\u6280', published);
    renderSidebarWidget('\u5A1B\u6A02', published);
    renderSidebarWidget('\u9AD4\u80B2', published);
  }

  /* ===== FETCH ===== */
  fetch('https://api.jsonbin.io/v3/b/' + JSONBIN_BIN + '/latest', {
    headers: { 'X-Master-Key': JSONBIN_KEY }
  })
  .then(function(r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
  .then(function(data) {
    var news = (data.record && data.record.news) || [];
    if (document.querySelector('.section-hero')) renderIndex(news);
  })
  .catch(function(err) { console.warn('[TNC news-loader] ' + err.message); });

})();
