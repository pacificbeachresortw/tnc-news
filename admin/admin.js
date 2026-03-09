/* TNC NEWS Admin Panel - Complete JavaScript */
'use strict';

const state = {
  news: [],
  editingId: null,
  imageUrl: '',
  apiKeys: { jsonbinKey: '', jsonbinBinId: '', imgbbKey: '', githubToken: '', githubRepo: '', siteUrl: '' }
};
let pendingDeleteId = null;

const $ = id => document.getElementById(id);

/* Admin init is called by login.js after authentication */
window._adminInited = false;
window.adminInit = function() {
  if (window._adminInited) return;
  window._adminInited = true;
  loadApiKeys();
  bindEvents();
  bindFormLivePreview();
  setDefaultDate();
  fetchNews();
};

function setDefaultDate() {
  var d = $('f-date');
  if (d && !d.value) {
    var now = new Date();
    var local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    d.value = local.toISOString().slice(0, 16);
  }
}

function formatDateTime(val) {
  if (!val) return '';
  var d = new Date(val);
  if (isNaN(d.getTime())) return val;
  var m = d.getMonth() + 1;
  var day = d.getDate();
  var hh = String(d.getHours()).padStart(2, '0');
  var mm = String(d.getMinutes()).padStart(2, '0');
  return m + '\u6708' + day + '\u65E5 ' + hh + ':' + mm;
}

function loadApiKeys() {
  try {
    const saved = JSON.parse(localStorage.getItem('tnc_admin_keys') || '{}');
    state.apiKeys = Object.assign(state.apiKeys, saved);
    if ($('api-jsonbin-key')) $('api-jsonbin-key').value = state.apiKeys.jsonbinKey;
    if ($('api-bin-id')) $('api-bin-id').value = state.apiKeys.jsonbinBinId;
    if ($('api-imgbb-key')) $('api-imgbb-key').value = state.apiKeys.imgbbKey;
    if ($('api-github-token')) $('api-github-token').value = state.apiKeys.githubToken;
    if ($('api-github-repo')) $('api-github-repo').value = state.apiKeys.githubRepo;
    if ($('api-site-url')) $('api-site-url').value = state.apiKeys.siteUrl;
  } catch (e) {}
}

function saveApiKeys() {
  state.apiKeys.jsonbinKey = $('api-jsonbin-key').value.trim();
  state.apiKeys.jsonbinBinId = $('api-bin-id').value.trim();
  state.apiKeys.imgbbKey = $('api-imgbb-key').value.trim();
  state.apiKeys.githubToken = $('api-github-token') ? $('api-github-token').value.trim() : '';
  state.apiKeys.githubRepo = $('api-github-repo') ? $('api-github-repo').value.trim() : '';
  state.apiKeys.siteUrl = $('api-site-url') ? $('api-site-url').value.trim().replace(/\/$/, '') : '';
  localStorage.setItem('tnc_admin_keys', JSON.stringify(state.apiKeys));
  toast('API \u8A2D\u5B9A\u5DF2\u5132\u5B58', 'success');
  fetchNews();
}

function toggleApiPanel() {
  const panel = $('api-panel');
  panel.classList.toggle('open');
  const btn = $('btn-api-toggle');
  btn.innerHTML = panel.classList.contains('open')
    ? '<i class="fa-solid fa-gear"></i> \u96B1\u85CF\u8A2D\u5B9A'
    : '<i class="fa-solid fa-gear"></i> API \u8A2D\u5B9A';
}

function bindEvents() {
  $('btn-api-toggle').addEventListener('click', toggleApiPanel);
  $('btn-api-save').addEventListener('click', saveApiKeys);
  $('btn-api-test').addEventListener('click', testConnection);
  $('btn-save').addEventListener('click', saveNews);
  $('btn-reset').addEventListener('click', resetForm);
  $('btn-new').addEventListener('click', resetForm);
  $('btn-preview-toggle').addEventListener('click', function() { switchTab('preview'); });

  const area = $('img-upload-area');
  area.addEventListener('click', function() { $('img-file-input').click(); });
  $('img-file-input').addEventListener('change', handleFileSelect);
  $('btn-img-url').addEventListener('click', applyImageUrl);
  $('img-url-input').addEventListener('keydown', function(e) { if (e.key === 'Enter') applyImageUrl(); });
  $('btn-img-change').addEventListener('click', function(e) { e.stopPropagation(); $('img-file-input').click(); });
  $('btn-img-remove').addEventListener('click', function(e) { e.stopPropagation(); clearImage(); });

  area.addEventListener('dragover', function(e) { e.preventDefault(); area.style.borderColor = 'var(--blue)'; });
  area.addEventListener('dragleave', function() { area.style.borderColor = ''; });
  area.addEventListener('drop', function(e) {
    e.preventDefault(); area.style.borderColor = '';
    var file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) uploadImage(file);
  });

  document.querySelectorAll('.preview-tab').forEach(function(tab) {
    tab.addEventListener('click', function() { switchTab(tab.dataset.tab); });
  });

  $('list-search-input').addEventListener('input', renderList);
  $('list-filter').addEventListener('change', renderList);
  $('modal-cancel').addEventListener('click', closeModal);
  $('modal-confirm').addEventListener('click', confirmDelete);

  $('btn-add-image').addEventListener('click', addExtraImageSlot);
}

/* EXTRA IMAGES */
var extraImages = [];

function addExtraImageSlot(prefill) {
  var idx = extraImages.length;
  var item = { url: '', source: '', photographer: '' };
  if (prefill && typeof prefill === 'object') {
    item = { url: prefill.url || '', source: prefill.source || '', photographer: prefill.photographer || '' };
  }
  extraImages.push(item);

  var slot = document.createElement('div');
  slot.className = 'extra-img-slot';
  slot.dataset.idx = idx;
  slot.style.cssText = 'background:var(--bg-2);border:1px solid var(--border);border-radius:var(--radius-md);padding:12px;display:flex;flex-direction:column;gap:8px;';
  slot.innerHTML = '<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">'
    + '<span style="font-size:0.78rem;font-weight:600;color:var(--text-secondary)"><i class="fa-regular fa-image"></i> \u5167\u6587\u5716\u7247 #' + (idx+1) + '</span>'
    + '<button type="button" class="btn btn-ghost btn-sm" style="margin-left:auto;padding:3px 8px;" onclick="removeExtraImage(' + idx + ')"><i class="fa-solid fa-trash"></i></button>'
    + '</div>'
    + '<div style="display:flex;gap:8px;">'
    + '<input type="url" class="form-input" placeholder="\u5716\u7247\u7DB2\u5740..." value="' + esc(item.url) + '" style="flex:1;font-size:0.78rem;" oninput="extraImages[' + idx + '].url=this.value;updatePreview()" />'
    + '<button type="button" class="btn btn-secondary btn-sm" onclick="triggerExtraUpload(' + idx + ')"><i class="fa-solid fa-upload"></i></button>'
    + '</div>'
    + '<input type="file" accept="image/*" style="display:none" class="extra-file-input" />'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">'
    + '<input type="text" class="form-input" placeholder="\u5716\u7247\u4F86\u6E90" value="' + esc(item.source) + '" style="font-size:0.78rem;" oninput="extraImages[' + idx + '].source=this.value" />'
    + '<input type="text" class="form-input" placeholder="\u651D\u5F71\u8A18\u8005" value="' + esc(item.photographer) + '" style="font-size:0.78rem;" oninput="extraImages[' + idx + '].photographer=this.value" />'
    + '</div>'
    + '<div class="upload-progress extra-upload-progress" style="display:none;align-items:center;gap:8px;font-size:0.8rem;color:var(--text-secondary);"><div class="spinner"></div><span>\u4E0A\u50B3\u4E2D...</span></div>';

  if (item.url) {
    var preview = document.createElement('img');
    preview.src = item.url;
    preview.style.cssText = 'width:100%;height:100px;object-fit:cover;border-radius:var(--radius-sm);';
    slot.appendChild(preview);
  }

  var fileInput = slot.querySelector('.extra-file-input');
  fileInput.addEventListener('change', function(e) {
    var file = e.target.files[0];
    if (!file) return;
    if (!state.apiKeys.imgbbKey) { toast('\u8ACB\u5148\u8A2D\u5B9A imgbb API Key', 'error'); return; }
    var prog = slot.querySelector('.extra-upload-progress');
    prog.style.display = 'flex';
    var fd = new FormData();
    fd.append('image', file);
    fetch('https://api.imgbb.com/1/upload?key=' + state.apiKeys.imgbbKey, { method:'POST', body:fd })
      .then(function(r){ return r.json(); })
      .then(function(data){
        if (data.success) {
          extraImages[idx].url = data.data.url;
          slot.querySelector('input[type="url"]').value = data.data.url;
          var existImg = slot.querySelector('img');
          if (existImg) existImg.src = data.data.url;
          else {
            var img2 = document.createElement('img');
            img2.src = data.data.url;
            img2.style.cssText = 'width:100%;height:100px;object-fit:cover;border-radius:var(--radius-sm);';
            slot.appendChild(img2);
          }
          updatePreview();
          toast('\u5716\u7247\u4E0A\u50B3\u6210\u529F', 'success');
        } else { throw new Error('\u4E0A\u50B3\u5931\u6557'); }
      })
      .catch(function(err){ toast('\u5716\u7247\u4E0A\u50B3\u5931\u6557\uFF1A' + err.message, 'error'); })
      .finally(function(){ prog.style.display = 'none'; });
  });

  $('extra-images-list').appendChild(slot);
}

function triggerExtraUpload(idx) {
  var slots = $('extra-images-list').querySelectorAll('.extra-img-slot');
  var slot = slots[idx] ? slots[idx] : document.querySelector('.extra-img-slot[data-idx="' + idx + '"]');
  if (slot) slot.querySelector('.extra-file-input').click();
}

function removeExtraImage(idx) {
  extraImages.splice(idx, 1);
  var list = $('extra-images-list');
  list.innerHTML = '';
  var copy = extraImages.slice();
  extraImages = [];
  copy.forEach(function(item){ addExtraImageSlot(item); });
  updatePreview();
}

function clearExtraImages() {
  extraImages = [];
  $('extra-images-list').innerHTML = '';
}

function bindFormLivePreview() {
  ['f-title','f-category','f-excerpt','f-content','f-author','f-date'].forEach(function(id) {
    var el = $(id);
    if (el) el.addEventListener('input', updatePreview);
  });
  $('f-title').addEventListener('input', updateCharCount);
  $('f-excerpt').addEventListener('input', updateCharCount);
}

function updateCharCount() {
  var t = $('f-title'), x = $('f-excerpt');
  var ct = document.querySelector('[data-count="title"]');
  var cx = document.querySelector('[data-count="excerpt"]');
  if (t && ct) ct.textContent = t.value.length + ' / 80';
  if (x && cx) cx.textContent = x.value.length + ' / 200';
}

function updatePreview() {
  var title = $('f-title').value;
  var category = $('f-category').value;
  var excerpt = $('f-excerpt').value;
  var content = $('f-content').value;
  var author = $('f-author').value;
  var date = $('f-date').value;
  var pc = $('preview-content');
  if (!pc) return;

  if (!title && !content) {
    pc.innerHTML = '<div class="preview-empty"><i class="fa-regular fa-newspaper"></i><p>\u958B\u59CB\u8F38\u5165\u4EE5\u9810\u89BD\u6587\u7AE0\u6548\u679C</p></div>';
    return;
  }

  var catColors = {
    '\u793E\u6703':'#e63946',
    '\u570B\u969B':'#4a9eff',
    '\u79D1\u6280':'#a55eea',
    '\u5A1B\u6A02':'#ff6b9d',
    '\u9AD4\u80B2':'#2ed573',
    '\u751F\u6D3B':'#ffa502'
  };
  var cc = catColors[category] || '#e63946';

  var coverHtml = state.imageUrl
    ? '<div class="ap-cover"><img src="' + state.imageUrl + '" alt="cover" /></div>'
    : '<div class="ap-cover"><div class="ap-cover-empty"><i class="fa-regular fa-image"></i><span style="font-size:0.8rem">\u5C1A\u672A\u8A2D\u5B9A\u5C01\u9762\u5716</span></div></div>';

  var contentHtml = content
    ? content.split('\n').filter(function(l){ return l.trim(); }).map(function(l){ return '<p>' + esc(l) + '</p>'; }).join('')
    : '';

  pc.innerHTML = '<div class="preview-wrap">'
    + '<div class="ap-category" style="background:' + cc + '22;color:' + cc + ';border-color:' + cc + '44"><i class="fa-solid fa-tag"></i>' + (category || '\u5206\u985E') + '</div>'
    + '<h1 class="ap-title">' + (esc(title) || '\u6587\u7AE0\u6A19\u984C') + '</h1>'
    + '<div class="ap-meta">'
    + '<div class="ap-meta-item"><i class="fa-regular fa-user"></i>' + (esc(author) || '\u4F5C\u8005') + '</div>'
    + '<div class="ap-meta-item"><i class="fa-regular fa-calendar"></i>' + (date || '\u65E5\u671F') + '</div>'
    + '</div><div class="ap-divider"></div>'
    + coverHtml
    + (excerpt ? '<div class="ap-excerpt">' + esc(excerpt) + '</div>' : '')
    + '<div class="ap-content">' + contentHtml + '</div>'
    + '</div>';
}

function esc(str) {
  return String(str)
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"');
}

function switchTab(tab) {
  document.querySelectorAll('.preview-tab').forEach(function(t) { t.classList.toggle('active', t.dataset.tab === tab); });
  document.querySelectorAll('.preview-tab-content').forEach(function(c) { c.classList.toggle('active', c.dataset.tab === tab); });
}

function handleFileSelect(e) {
  var file = e.target.files[0];
  if (file) uploadImage(file);
}

function uploadImage(file) {
  if (!state.apiKeys.imgbbKey) { toast('\u8ACB\u5148\u8A2D\u5B9A imgbb API Key', 'error'); return; }
  var progress = $('upload-progress');
  progress.classList.add('show');
  var fd = new FormData();
  fd.append('image', file);
  fetch('https://api.imgbb.com/1/upload?key=' + state.apiKeys.imgbbKey, { method: 'POST', body: fd })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (data.success) {
        setImage(data.data.url);
        $('img-url-input').value = data.data.url;
        toast('\u5716\u7247\u4E0A\u50B3\u6210\u529F', 'success');
      } else {
        throw new Error((data.error && data.error.message) || '\u4E0A\u50B3\u5931\u6557');
      }
    })
    .catch(function(err) { toast('\u5716\u7247\u4E0A\u50B3\u5931\u6557\uFF1A' + err.message, 'error'); })
    .finally(function() { progress.classList.remove('show'); });
}

function applyImageUrl() {
  var url = $('img-url-input').value.trim();
  if (url) { setImage(url); toast('\u5716\u7247 URL \u5DF2\u5957\u7528', 'info'); }
}

function setImage(url) {
  state.imageUrl = url;
  $('img-preview-el').src = url;
  $('img-upload-area').classList.add('has-image');
  updatePreview();
}

function clearImage() {
  state.imageUrl = '';
  $('img-preview-el').src = '';
  $('img-upload-area').classList.remove('has-image');
  $('img-url-input').value = '';
  $('img-file-input').value = '';
  updatePreview();
}

function fetchNews() {
  var key = state.apiKeys.jsonbinKey, bid = state.apiKeys.jsonbinBinId;
  if (!key || !bid) { setStatus('disconnected'); renderList(); return; }
  showLoading(true);
  fetch('https://api.jsonbin.io/v3/b/' + bid + '/latest', { headers: { 'X-Master-Key': key } })
    .then(function(r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    })
    .then(function(data) {
      state.news = (data.record && data.record.news) || [];
      setStatus('connected');
      renderList();
      updatePreview();
    })
    .catch(function(err) { setStatus('error'); toast('\u8F09\u5165\u5931\u6557\uFF1A' + err.message, 'error'); })
    .finally(function() { showLoading(false); });
}

function saveToJsonbin() {
  var key = state.apiKeys.jsonbinKey, bid = state.apiKeys.jsonbinBinId;
  if (!key || !bid) return Promise.reject(new Error('\u8ACB\u5148\u8A2D\u5B9A jsonbin API Key \u8207 Bin ID'));
  return fetch('https://api.jsonbin.io/v3/b/' + bid, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'X-Master-Key': key },
    body: JSON.stringify({ news: state.news })
  }).then(function(r) {
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  });
}

function testConnection() {
  var key = state.apiKeys.jsonbinKey, bid = state.apiKeys.jsonbinBinId;
  if (!key || !bid) { toast('\u8ACB\u586B\u5BEB jsonbin API Key \u8207 Bin ID', 'warning'); return; }
  $('btn-api-test').disabled = true;
  fetch('https://api.jsonbin.io/v3/b/' + bid + '/latest', { headers: { 'X-Master-Key': key } })
    .then(function(r) {
      if (r.ok) { toast('\u9023\u7DDA\u6210\u529F\uFF01', 'success'); setStatus('connected'); }
      else throw new Error('HTTP ' + r.status);
    })
    .catch(function(err) { toast('\u9023\u7DDA\u5931\u6557\uFF1A' + err.message, 'error'); setStatus('error'); })
    .finally(function() { $('btn-api-test').disabled = false; });
}

function saveNews() {
  var title = $('f-title').value.trim();
  var content = $('f-content').value.trim();
  if (!title) { toast('\u8ACB\u8F38\u5165\u65B0\u805E\u6A19\u984C', 'warning'); $('f-title').focus(); return; }
  if (!content) { toast('\u8ACB\u8F38\u5165\u65B0\u805E\u5167\u6587', 'warning'); $('f-content').focus(); return; }

  var article = {
    id: state.editingId || Date.now().toString(),
    title: title,
    category: $('f-category').value,
    excerpt: $('f-excerpt').value.trim(),
    content: content,
    author: $('f-author').value.trim() || 'TNC \u7DE8\u8F2F',
    date: $('f-date').value || new Date().toISOString().slice(0, 16),
    image: state.imageUrl,
    imageSource: $('img-source').value.trim(),
    imagePhotographer: $('img-photographer').value.trim(),
    extraImages: extraImages.filter(function(i){ return i.url; }),
    featured: $('f-featured') ? $('f-featured').checked : false,
    published: $('f-published').checked
  };

  if (state.editingId) {
    var idx = state.news.findIndex(function(n) { return n.id === state.editingId; });
    if (idx > -1) state.news[idx] = article;
  } else {
    state.news.unshift(article);
  }

  $('btn-save').disabled = true;
  var isEdit = !!state.editingId;
  saveToJsonbin()
    .then(function() {
      toast(isEdit ? '\u65B0\u805E\u5DF2\u66F4\u65B0' : '\u65B0\u805E\u5DF2\u65B0\u589E', 'success');
      publishArticlePage(article);
      resetForm();
      renderList();
    })
    .catch(function(err) { toast('\u5132\u5B58\u5931\u6557\uFF1A' + err.message, 'error'); })
    .finally(function() { $('btn-save').disabled = false; });
}

/* GITHUB - publish static article page */
function buildArticleHtml(article) {
  var siteUrl = (state.apiKeys.siteUrl || '').replace(/\/$/, '');
  var pageUrl = siteUrl + '/pages/news/' + article.id + '.html';
  var fmtD = formatDateTime(article.date);

  function he(s) { return String(s||'').replace(/&/g,'&').replace(/</g,'<').replace(/>/g,'>').replace(/"/g,'"'); }

  var bodyParagraphs = (article.content || '').split('\n').filter(function(l){return l.trim();}).map(function(l){return '<p>'+he(l)+'</p>';}).join('');

  var creditLine = '';
  if (article.imageSource || article.imagePhotographer) {
    creditLine = '<p style="font-size:0.75rem;color:#666;margin-top:6px;margin-bottom:24px">';
    if (article.imageSource) creditLine += '&#169; ' + he(article.imageSource) + ' ';
    if (article.imagePhotographer) creditLine += '/ ' + he(article.imagePhotographer);
    creditLine += '</p>';
  }

  var extraImgHtml = '';
  if (article.extraImages && article.extraImages.length) {
    extraImgHtml = article.extraImages.filter(function(i){return i.url;}).map(function(img){
      var cr = '';
      if (img.source || img.photographer) {
        cr = '<p style="font-size:0.75rem;color:#666;margin-top:4px;margin-bottom:20px">';
        if (img.source) cr += '&#169; ' + he(img.source) + ' ';
        if (img.photographer) cr += '/ ' + he(img.photographer);
        cr += '</p>';
      }
      return '<figure style="margin:28px 0 0"><img src="'+he(img.url)+'" alt="" style="width:100%;border-radius:10px;display:block" />'+cr+'</figure>';
    }).join('');
  }

  var catMap = {'\u5373\u6642':'society','\u793E\u6703':'society','\u570B\u969B':'international','\u79D1\u6280':'tech','\u5A1B\u6A02':'entertainment','\u9AD4\u80B2':'sports','\u751F\u6D3B':'life'};
  var catSlug = catMap[article.category] || 'society';

  return '<!DOCTYPE html>\n<html lang="zh-TW">\n<head>\n'
    + '<meta charset="UTF-8" />\n'
    + '<meta name="viewport" content="width=device-width, initial-scale=1.0" />\n'
    + '<title>' + he(article.title) + ' \u2014 TNC NEWS</title>\n'
    + '<meta name="description" content="' + he(article.excerpt || article.title) + '" />\n'
    + '<meta property="og:type" content="article" />\n'
    + '<meta property="og:site_name" content="TNC NEWS \u53F0\u7063\u7DB2\u8DEF\u89C0\u5BDF\u65B0\u805E\u7DB2" />\n'
    + '<meta property="og:title" content="' + he(article.title) + '" />\n'
    + '<meta property="og:description" content="' + he(article.excerpt || article.title) + '" />\n'
    + (article.image ? '<meta property="og:image" content="' + he(article.image) + '" />\n' : '')
    + '<meta property="og:url" content="' + he(pageUrl) + '" />\n'
    + '<meta name="twitter:card" content="summary_large_image" />\n'
    + '<meta name="twitter:title" content="' + he(article.title) + '" />\n'
    + '<meta name="twitter:description" content="' + he(article.excerpt || article.title) + '" />\n'
    + (article.image ? '<meta name="twitter:image" content="' + he(article.image) + '" />\n' : '')
    + '<link rel="icon" href="../../image/weblogo.png" type="image/png" />\n'
    + '<link rel="stylesheet" href="../../css/animations.css" />\n'
    + '<link rel="stylesheet" href="../../css/style.css" />\n'
    + '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" />\n'
    + '<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@300;400;500;700;900&family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />\n'
    + '<style>body{background:#0d0d0d;color:#ddd}.ap{max-width:820px;margin:0 auto;padding:32px 20px 60px}.ap-cat{display:inline-flex;align-items:center;gap:6px;background:rgba(255,255,255,.06);color:#ccc;border:1px solid rgba(255,255,255,.12);padding:4px 14px;border-radius:20px;font-size:.8rem;font-weight:600;letter-spacing:.05em;margin-bottom:18px;text-decoration:none}.ap-h1{font-size:2rem;font-weight:800;line-height:1.3;color:#f0f0f0;margin-bottom:12px;font-family:"Noto Sans TC",sans-serif}.ap-ex{font-size:1.05rem;color:#999;line-height:1.7;margin-bottom:20px;padding-bottom:20px;border-bottom:1px solid #222;font-style:italic}.ap-meta{display:flex;gap:16px;flex-wrap:wrap;margin-bottom:28px;font-size:.82rem;color:#666}.ap-cover{width:100%;border-radius:12px;overflow:hidden;margin-bottom:8px;max-height:480px}.ap-cover img{width:100%;object-fit:cover;display:block}.ap-body{font-size:1rem;color:#ddd;line-height:1.9}.ap-body p{margin-bottom:18px}.ap-div{height:1px;background:#222;margin:32px 0}.share-bar{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.share-btn{display:inline-flex;align-items:center;gap:6px;padding:7px 14px;border-radius:6px;border:1px solid #333;background:transparent;color:#999;font-size:.82rem;text-decoration:none;transition:all .2s}.share-btn:hover{background:#1e1e1e;color:#f0f0f0;border-color:#555}</style>\n'
    + '</head>\n<body>\n'
    + '<header class="site-header" style="position:sticky;top:0;z-index:100">\n'
    + '<div class="header-inner container" style="padding:14px 20px">\n'
    + '<div class="header-logo"><a href="../../index.html" class="logo-img-wrap"><img src="../../image/logo.png" alt="TNC NEWS" class="logo-img" /></a></div>\n'
    + '<nav class="main-nav"><ul>'
    + '<li><a href="../../index.html"><i class="fa-solid fa-house nav-icon"></i>\u9996\u9801</a></li>'
    + '<li><a href="../society.html">\u793E\u6703</a></li>'
    + '<li><a href="../international.html">\u570B\u969B</a></li>'
    + '<li><a href="../tech.html">\u79D1\u6280</a></li>'
    + '<li><a href="../entertainment.html">\u5A1B\u6A02</a></li>'
    + '<li><a href="../sports.html">\u9AD4\u80B2</a></li>'
    + '<li><a href="../life.html">\u751F\u6D3B</a></li>'
    + '</ul></nav>'
    + '<div class="header-actions"><button class="hamburger" id="hamburger" aria-label="\u9078\u55AE"><span></span><span></span><span></span></button></div>\n'
    + '</div></header>\n'
    + '<main style="min-height:80vh">\n<div class="ap">\n'
    + '<a href="../../index.html" style="display:inline-flex;align-items:center;gap:8px;color:#888;font-size:.85rem;text-decoration:none;margin-bottom:24px"><i class="fa-solid fa-arrow-left"></i> \u56DE\u9996\u9801</a>\n'
    + '<a href="../' + catSlug + '.html" class="ap-cat"><i class="fa-solid fa-tag"></i>' + he(article.category) + '</a>\n'
    + '<h1 class="ap-h1">' + he(article.title) + '</h1>\n'
    + (article.excerpt ? '<p class="ap-ex">' + he(article.excerpt) + '</p>\n' : '')
    + '<div class="ap-meta"><span><i class="fa-regular fa-user"></i> ' + he(article.author || 'TNC\u7DE8\u8F2F') + '</span><span><i class="fa-regular fa-clock"></i> ' + fmtD + '</span></div>\n'
    + (article.image ? '<div class="ap-cover"><img src="' + he(article.image) + '" alt="' + he(article.title) + '" /></div>\n' + creditLine : '')
    + '<div class="ap-body">' + bodyParagraphs + '</div>\n'
    + extraImgHtml
    + '<div class="ap-div"></div>\n'
    + '<div class="share-bar" style="margin-top:0">\n'
    + '<span style="font-size:.82rem;color:#666"><i class="fa-solid fa-share-nodes"></i> \u5206\u4EAB\uFF1A</span>\n'
    + '<a class="share-btn" href="https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(pageUrl) + '" target="_blank" rel="noopener"><i class="fa-brands fa-facebook-f"></i> Facebook</a>\n'
    + '<a class="share-btn" href="https://line.me/R/msg/text/?' + encodeURIComponent(article.title) + '%0D%0A' + encodeURIComponent(pageUrl) + '" target="_blank" rel="noopener"><i class="fa-brands fa-line"></i> LINE</a>\n'
    + '</div>\n</div></main>\n'
    + '<footer class="site-footer"><div class="footer-bottom"><div class="container footer-bottom-inner">'
    + '<p>&copy; 2026 TNC NEWS \u53F0\u7063\u7DB2\u8DEF\u89C0\u5BDF\u65B0\u805E\u7DB2. All Rights Reserved.</p>'
    + '</div></div></footer>\n'
    + '<script src="../../js/main.js"><\/script>\n'
    + '</body>\n</html>';
}

function publishArticlePage(article) {
  var token = state.apiKeys.githubToken;
  var repo = state.apiKeys.githubRepo;
  if (!token || !repo) {
    toast('\u672A\u8A2D\u5B9A GitHub Token\uFF0C\u7565\u904E\u767C\u5E03', 'info');
    return;
  }

  var newPath = 'pages/news/' + article.id + '.html';
  var apiBase = 'https://api.github.com/repos/' + repo + '/contents/';
  var headers = {
    'Authorization': 'Bearer ' + token,
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28'
  };

  /* 生成靜態 HTML 內容（不需要 API Key，任何人可讀） */
  var htmlContent = buildArticleHtml(article);
  var encoded = btoa(unescape(encodeURIComponent(htmlContent)));

  /* 檢查目標檔案是否已存在（取 SHA） */
  fetch(apiBase + newPath, { headers: headers })
    .then(function(r2) { return r2.ok ? r2.json() : null; })
    .then(function(existing) {
      var body = {
        message: 'publish: ' + article.title,
        content: encoded,
        branch: 'main'
      };
      if (existing && existing.sha) body.sha = existing.sha;
      return fetch(apiBase + newPath, {
        method: 'PUT',
        headers: Object.assign({}, headers, { 'Content-Type': 'application/json' }),
        body: JSON.stringify(body)
      });
    })
    .then(function(r) {
      if (r && (r.status === 200 || r.status === 201)) {
        var siteUrl = (state.apiKeys.siteUrl || '').replace(/\/$/, '');
        var url = siteUrl ? siteUrl + '/' + newPath : newPath;
        toast('\u9801\u9762\u5DF2\u767C\u5E03\uFF01 ' + newPath, 'success');
        console.log('[TNC]', url);
      } else if (r) {
        return r.json().then(function(e) {
          toast('GitHub \u767C\u5E03\u5931\u6557\uFF1A' + (e.message || r.status), 'warning');
        });
      }
    })
    .catch(function(err) { toast('GitHub \u767C\u5E03\u5931\u6557\uFF1A' + err.message, 'warning'); });
}

function resetForm() {
  state.editingId = null;
  state.imageUrl = '';
  $('f-title').value = '';
  $('f-category').value = '\u5373\u6642';
  $('f-excerpt').value = '';
  $('f-content').value = '';
  $('f-author').value = '';
  $('f-published').checked = true;
  setDefaultDate();
  clearImage();
  clearExtraImages();
  if ($('img-source')) $('img-source').value = '';
  if ($('img-photographer')) $('img-photographer').value = '';
  if ($('f-featured')) $('f-featured').checked = false;
  $('edit-mode-badge').classList.remove('show');
  $('btn-save').innerHTML = '<i class="fa-solid fa-floppy-disk"></i> \u5132\u5B58\u65B0\u805E';
  $('btn-save').className = 'btn btn-primary';
  $('panel-form-title').textContent = '\u65B0\u589E\u65B0\u805E';
  updateCharCount();
  updatePreview();
  document.querySelectorAll('.news-item').forEach(function(el) { el.classList.remove('active'); });
}

function loadForEdit(article) {
  state.editingId = article.id;
  $('f-title').value = article.title || '';
  $('f-category').value = article.category || '\u793E\u6703';
  $('f-excerpt').value = article.excerpt || '';
  $('f-content').value = article.content || '';
  $('f-author').value = article.author || '';
  $('f-date').value = article.date || '';
  $('f-published').checked = article.published !== false;
  if (article.image) { setImage(article.image); $('img-url-input').value = article.image; }
  else { clearImage(); }
  if ($('img-source')) $('img-source').value = article.imageSource || '';
  if ($('img-photographer')) $('img-photographer').value = article.imagePhotographer || '';
  if ($('f-featured')) $('f-featured').checked = article.featured === true;
  clearExtraImages();
  if (article.extraImages && article.extraImages.length) {
    article.extraImages.forEach(function(img){ addExtraImageSlot(img); });
  }
  $('edit-mode-badge').classList.add('show');
  $('btn-save').innerHTML = '<i class="fa-solid fa-pen"></i> \u66F4\u65B0\u65B0\u805E';
  $('btn-save').className = 'btn btn-blue';
  $('panel-form-title').textContent = '\u7DE8\u8F2F\u65B0\u805E';
  updateCharCount();
  updatePreview();
  switchTab('preview');
  document.querySelectorAll('.news-item').forEach(function(el) { el.classList.remove('active'); });
  var activeItem = document.querySelector('.news-item[data-id="' + article.id + '"]');
  if (activeItem) activeItem.classList.add('active');
}

function deleteNews(id) {
  pendingDeleteId = id;
  var article = state.news.find(function(n) { return n.id === id; });
  $('modal-body-text').textContent = '\u78BA\u5B9A\u8981\u522A\u9664\u300C' + ((article && article.title) || '\u6B64\u65B0\u805E') + '\u300D\u55CE\uFF1F\u6B64\u64CD\u4F5C\u7121\u6CD5\u5FA9\u539F\u3002';
  openModal();
}

function confirmDelete() {
  if (!pendingDeleteId) return;
  var delId = pendingDeleteId;
  state.news = state.news.filter(function(n) { return n.id !== delId; });
  closeModal();
  saveToJsonbin()
    .then(function() {
      toast('\u65B0\u805E\u5DF2\u522A\u9664', 'success');
      if (state.editingId === delId) resetForm();
      renderList();
    })
    .catch(function(err) {
      toast('\u522A\u9664\u5931\u6557\uFF1A' + err.message, 'error');
      fetchNews();
    });
  pendingDeleteId = null;
}

function renderList() {
  var q = ($('list-search-input') ? $('list-search-input').value : '').toLowerCase();
  var cat = $('list-filter') ? $('list-filter').value : '';
  var items = state.news.slice();
  if (q) items = items.filter(function(n) { return (n.title && n.title.toLowerCase().includes(q)) || (n.author && n.author.toLowerCase().includes(q)); });
  if (cat) items = items.filter(function(n) { return n.category === cat; });

  var listEl = $('news-list');
  var countEl = $('list-count');
  if (countEl) countEl.textContent = '\u5171 ' + items.length + ' \u7BC7';

  if (!items.length) {
    listEl.innerHTML = '<div class="news-list-empty"><i class="fa-regular fa-newspaper"></i><p>' + (state.news.length ? '\u6C92\u6709\u7B26\u5408\u689D\u4EF6\u7684\u65B0\u805E' : '\u5C1A\u7121\u65B0\u805E\uFF0C\u9EDE\u64CA\u5DE6\u5074\u65B0\u589E') + '</p></div>';
    return;
  }

  listEl.innerHTML = items.map(function(n) {
    var isActive = n.id === state.editingId;
    var thumbHtml = n.image ? '<img src="' + n.image + '" alt="" />' : '<i class="fa-regular fa-image"></i>';
    var statusHtml = n.published !== false
      ? '<span class="news-item-status pub">\u5DF2\u767C\u5E03</span>'
      : '<span class="news-item-status draft">\u8349\u7A3F</span>';
    return '<div class="news-item' + (isActive ? ' active' : '') + '" data-id="' + n.id + '" onclick="handleItemClick(\'' + n.id + '\')">'
      + '<div class="news-item-thumb">' + thumbHtml + '</div>'
      + '<div class="news-item-body">'
      + '<div class="news-item-title">' + esc(n.title) + '</div>'
      + '<div class="news-item-meta">'
      + (n.featured ? '<span style="font-size:0.72rem;background:rgba(255,255,255,0.08);color:#ccc;border:1px solid rgba(255,255,255,0.15);padding:1px 7px;border-radius:10px;font-weight:600"><i class="fa-solid fa-star" style="font-size:0.65rem"></i> \u982D\u689D</span>' : '')
      + '<span class="news-item-cat">' + (n.category || '') + '</span>'
      + '<span class="news-item-date"><i class="fa-regular fa-clock"></i>' + formatDateTime(n.date) + '</span>'
      + statusHtml
      + '</div></div>'
      + '<div class="news-item-actions">'
      + '<button class="news-item-btn" title="\u7DE8\u8F2F" onclick="event.stopPropagation();loadForEdit(state.news.find(function(x){return x.id===\'' + n.id + '\';}))"><i class="fa-solid fa-pen"></i></button>'
      + '<button class="news-item-btn del" title="\u522A\u9664" onclick="event.stopPropagation();deleteNews(\'' + n.id + '\')"><i class="fa-solid fa-trash"></i></button>'
      + '</div></div>';
  }).join('');
}

function handleItemClick(id) {
  var article = state.news.find(function(n) { return n.id === id; });
  if (article) loadForEdit(article);
}

function openModal() { $('modal-overlay').classList.add('open'); }
function closeModal() { $('modal-overlay').classList.remove('open'); pendingDeleteId = null; }

function toast(msg, type) {
  type = type || 'info';
  var icons = { success:'fa-circle-check', error:'fa-circle-xmark', info:'fa-circle-info', warning:'fa-triangle-exclamation' };
  var container = $('toast-container');
  var el = document.createElement('div');
  el.className = 'toast ' + type;
  el.innerHTML = '<i class="fa-solid ' + (icons[type] || icons.info) + ' toast-icon"></i><span class="toast-msg">' + msg + '</span>';
  container.appendChild(el);
  setTimeout(function() {
    el.classList.add('removing');
    setTimeout(function() { el.remove(); }, 320);
  }, 3000);
}

function setStatus(s) {
  var dot = $('status-dot'), txt = $('status-text');
  dot.className = 'status-dot' + (s === 'connected' ? ' connected' : s === 'error' ? ' error' : '');
  txt.textContent = s === 'connected' ? '\u5DF2\u9023\u7DDA' : s === 'error' ? '\u9023\u7DDA\u5931\u6557' : '\u672A\u9023\u7DDA';
}

function showLoading(show) { $('loading-overlay').classList.toggle('show', show); }
