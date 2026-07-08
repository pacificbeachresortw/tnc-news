/* TNC NEWS - News Loader
 * 優先讀取 js/news-data.json（公開靜態檔，所有訪客可讀）
 * 後台瀏覽器可 fallback 至 JSONBin（需 API Key）
 */
(function () {
  'use strict';

  var keys = {};
  try { keys = JSON.parse(localStorage.getItem('tnc_admin_keys') || '{}'); } catch (e) {}

  var JSONBIN_KEY = keys.jsonbinKey || '';
  var JSONBIN_BIN = keys.jsonbinBinId
    || (window.TNC_CONFIG && window.TNC_CONFIG.jsonbinBinId)
    || '';

  var CAT_PAGES = {
    society: '\u793E\u6703',
    international: '\u570B\u969B',
    tech: '\u79D1\u6280',
    entertainment: '\u5A1B\u6A02',
    sports: '\u9AD4\u80B2',
    life: '\u751F\u6D3B'
  };

  function isInPagesDir() {
    return window.location.pathname.indexOf('/pages/') !== -1;
  }

  function dataFileUrl() {
    return (isInPagesDir() ? '../js/news-data.json' : 'js/news-data.json') + '?_=' + Date.now();
  }

  function articleUrl(article) {
    var prefix = isInPagesDir() ? 'news/' : 'pages/news/';
    return prefix + encodeURIComponent(article.id) + '.html';
  }

  function getPageCategory() {
    var match = /\/([^/]+)\.html$/.exec(window.location.pathname);
    return match && CAT_PAGES[match[1]] ? CAT_PAGES[match[1]] : null;
  }

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
    return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function publishedNews(news) {
    return news.filter(function(n) { return n.published !== false; });
  }

  /* ===== INDEX PAGE ===== */
  function renderHero(news) {
    var hero = document.querySelector('.section-hero');
    if (!hero) return;
    var featured = news.filter(function(n) { return n.featured === true; });
    var top = featured.length ? featured[0] : news[0];
    var rest = news.filter(function(n) { return n !== top; });
    var sides = rest.slice(0, 3);

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

  function renderBreakingTicker(news) {
    var track = document.querySelector('.ticker-track');
    if (!track) return;
    var breaking = news.filter(function(n) { return n.category === '\u5373\u6642'; }).slice(0, 8);
    var items = breaking.length ? breaking : news.slice(0, 5);
    if (!items.length) return;
    var txt = items.map(function(n) { return esc(n.title); }).join(' &nbsp;&bull;&nbsp; ');
    track.innerHTML = '<span>' + txt + ' &nbsp;&bull;&nbsp; ' + txt + '</span>';
  }

  function renderCatSection(cat, news) {
    var sec = document.querySelector('.cat-section[data-cat="' + cat + '"]');
    if (!sec) return;
    var grid = sec.querySelector('.cat-grid');
    if (!grid) return;
    var items = news.filter(function(n) { return n.category === cat; }).slice(0, 2);
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

  function renderHotList(news) {
    var list = document.querySelector('.hot-list');
    if (!list) return;
    var items = news.slice(0, 5);
    if (!items.length) return;
    list.innerHTML = items.map(function(n, i) {
      return '<li class="hot-item">'
        + '<span class="hot-rank">' + String(i + 1).padStart(2, '0') + '</span>'
        + '<a href="' + articleUrl(n) + '">' + esc(n.title) + '</a>'
        + '</li>';
    }).join('');
  }

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
    var items = news.filter(function(n) { return n.category === cat; }).slice(0, 3);
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

  function renderIndex(news) {
    if (!news.length) return;
    renderHero(news);
    renderBreakingTicker(news);
    renderCatSection('\u793E\u6703', news);
    renderCatSection('\u570B\u969B', news);
    renderCatSection('\u79D1\u6280', news);
    renderCatSection('\u5A1B\u6A02', news);
    renderCatSection('\u9AD4\u80B2', news);
    renderCatSection('\u751F\u6D3B', news);
    renderHotList(news);
    renderSidebarWidget('\u79D1\u6280', news);
    renderSidebarWidget('\u5A1B\u6A02', news);
    renderSidebarWidget('\u9AD4\u80B2', news);
  }

  /* ===== CATEGORY PAGE ===== */
  function renderCategoryPage(cat, news) {
    var catNews = news.filter(function(n) { return n.category === cat; });
    if (!catNews.length) return;

    renderBreakingTicker(news);

    var stats = document.querySelectorAll('.cat-banner-stat');
    if (stats[0]) stats[0].innerHTML = '<i class="fa-regular fa-newspaper"></i> \u5171 ' + catNews.length + ' \u7BC7\u6587\u7AE0';
    if (stats[1]) stats[1].innerHTML = '<i class="fa-regular fa-clock"></i> \u6700\u5F8C\u66F4\u65B0\uFF1A' + fmtDate(catNews[0].date);

    var featuredWrap = document.querySelector('.cat-featured .news-card--hero');
    if (featuredWrap) {
      var top = catNews[0];
      var imgHtml = top.image
        ? '<img src="' + esc(top.image) + '" alt="' + esc(top.title) + '" style="width:100%;height:100%;object-fit:cover;display:block" />'
        : '<div class="placeholder-icon"><i class="fa-regular fa-newspaper"></i></div>';
      featuredWrap.innerHTML = '<a href="' + articleUrl(top) + '" class="card-img card-img--placeholder">' + imgHtml + '</a>'
        + '<div class="card-body">'
        + '<span class="card-tag">' + esc(top.category) + '</span>'
        + '<h2 class="card-title"><a href="' + articleUrl(top) + '">' + esc(top.title) + '</a></h2>'
        + (top.excerpt ? '<p class="card-excerpt">' + esc(top.excerpt) + '</p>' : '')
        + '<div class="card-meta"><span><i class="fa-regular fa-clock"></i> ' + fmtDate(top.date) + '</span>'
        + '<span><i class="fa-regular fa-user"></i> ' + esc(top.author || 'TNC \u7DE8\u8F2F') + '</span></div>'
        + '</div>';
    }

    var countEl = document.querySelector('.articles-count');
    if (countEl) countEl.textContent = '\u5171 ' + catNews.length + ' \u7BC7';

    var grid = document.querySelector('.articles-grid');
    if (grid) {
      grid.innerHTML = catNews.slice(0, 12).map(function(n) {
        var imgHtml = n.image
          ? '<img src="' + esc(n.image) + '" alt="" style="width:100%;height:100%;object-fit:cover;display:block" />'
          : '<i class="fa-solid fa-newspaper"></i>';
        return '<div class="article-card">'
          + '<a href="' + articleUrl(n) + '" class="article-card-img">' + imgHtml + '</a>'
          + '<div class="article-card-body">'
          + '<span class="article-card-tag">' + esc(n.category) + '</span>'
          + '<p class="article-card-title"><a href="' + articleUrl(n) + '">' + esc(n.title) + '</a></p>'
          + '<div class="article-card-meta"><span><i class="fa-regular fa-clock"></i> ' + fmtDate(n.date) + '</span></div>'
          + '</div></div>';
      }).join('');
    }

    renderHotList(news);
  }

  function renderAll(news) {
    var published = publishedNews(news);
    if (!published.length) return;

    if (document.querySelector('.section-hero')) {
      renderIndex(published);
      return;
    }

    var pageCat = getPageCategory();
    if (pageCat) renderCategoryPage(pageCat, published);
  }

  function fetchFromJsonbin() {
    if (!JSONBIN_BIN) return Promise.reject(new Error('missing bin id'));
    var headers = JSONBIN_KEY ? { 'X-Master-Key': JSONBIN_KEY } : {};
    return fetch('https://api.jsonbin.io/v3/b/' + JSONBIN_BIN + '/latest', { headers: headers })
      .then(function(r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function(data) { return (data.record && data.record.news) || []; });
  }

  function fetchFromStaticFile() {
    return fetch(dataFileUrl(), { cache: 'no-store' })
      .then(function(r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function(data) { return data.news || []; });
  }

  fetchFromStaticFile()
    .then(renderAll)
    .catch(function() {
      return fetchFromJsonbin().then(renderAll);
    })
    .catch(function(err) {
      console.warn('[TNC news-loader] ' + err.message);
    });

})();
