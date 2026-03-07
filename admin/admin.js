/* TNC NEWS Admin Panel - Complete JavaScript */
'use strict';

const state = {
  news: [],
  editingId: null,
  imageUrl: '',
  apiKeys: { jsonbinKey: '', jsonbinBinId: '', imgbbKey: '' }
};
let pendingDeleteId = null;

const $ = id => document.getElementById(id);

document.addEventListener('DOMContentLoaded', () => {
  loadApiKeys();
  bindEvents();
  bindFormLivePreview();
  setDefaultDate();
  fetchNews();
});

function setDefaultDate() {
  const d = $('f-date');
  if (d && !d.value) d.value = new Date().toISOString().slice(0, 10);
}

/* API KEYS */
function loadApiKeys() {
  try {
    const saved = JSON.parse(localStorage.getItem('tnc_admin_keys') || '{}');
    state.apiKeys = Object.assign(state.apiKeys, saved);
    if ($('api-jsonbin-key')) $('api-jsonbin-key').value = state.apiKeys.jsonbinKey;
    if ($('api-bin-id')) $('api-bin-id').value = state.apiKeys.jsonbinBinId;
    if ($('api-imgbb-key')) $('api-imgbb-key').value = state.apiKeys.imgbbKey;
  } catch (e) {}
}

function saveApiKeys() {
  state.apiKeys.jsonbinKey = $('api-jsonbin-key').value.trim();
  state.apiKeys.jsonbinBinId = $('api-bin-id').value.trim();
  state.apiKeys.imgbbKey = $('api-imgbb-key').value.trim();
  localStorage.setItem('tnc_admin_keys', JSON.stringify(state.apiKeys));
  toast('API 設定已儲存', 'success');
  fetchNews();
}

function toggleApiPanel() {
  const panel = $('api-panel');
  panel.classList.toggle('open');
  const btn = $('btn-api-toggle');
  btn.innerHTML = panel.classList.contains('open')
    ? '<i class="fa-solid fa-gear"></i> 隱藏設定'
    : '<i class="fa-solid fa-gear"></i> API 設定';
}

/* EVENTS */
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
}

/* LIVE PREVIEW */
function bindFormLivePreview() {
  var ids = ['f-title','f-category','f-excerpt','f-content','f-author','f-date'];
  ids.forEach(function(id) {
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
    pc.innerHTML = '<div class="preview-empty"><i class="fa-regular fa-newspaper"></i><p>開始輸入以預覽文章效果</p></div>';
    return;
  }

  var catColors = { '社會':'#e63946','國際':'#4a9eff','科技':'#a55eea','娛樂':'#ff6b9d','體育':'#2ed573','生活':'#ffa502' };
  var cc = catColors[category] || '#e63946';

  var coverHtml = state.imageUrl
    ? '<div class="ap-cover"><img src="' + state.imageUrl + '" alt="cover" /></div>'
    : '<div class="ap-cover"><div class="ap-cover-empty"><i class="fa-regular fa-image"></i><span style="font-size:0.8rem">尚未設定封面圖</span></div></div>';

  var contentHtml = content
    ? content.split('\n').filter(function(l){ return l.trim(); }).map(function(l){ return '<p>' + esc(l) + '</p>'; }).join('')
    : '';

  pc.innerHTML = '<div class="preview-wrap">'
    + '<div class="ap-category" style="background:' + cc + '22;color:' + cc + ';border-color:' + cc + '44"><i class="fa-solid fa-tag"></i>' + (category || '分類') + '</div>'
    + '<h1 class="ap-title">' + (esc(title) || '文章標題') + '</h1>'
    + '<div class="ap-meta">'
    + '<div class="ap-meta-item"><i class="fa-regular fa-user"></i>' + (esc(author) || '作者') + '</div>'
    + '<div class="ap-meta-item"><i class="fa-regular fa-calendar"></i>' + (date || '日期') + '</div>'
    + '</div><div class="ap-divider"></div>'
    + coverHtml
    + (excerpt ? '<div class="ap-excerpt">' + esc(excerpt) + '</div>' : '')
    + '<div class="ap-content">' + contentHtml + '</div>'
    + '</div>';
}

function esc(str) {
  return String(str).replace(/&/g,'&').replace(/</g,'<').replace(/>/g,'>').replace(/"/g,'"');
}

/* TABS */
function switchTab(tab) {
  document.querySelectorAll('.preview-tab').forEach(function(t) { t.classList.toggle('active', t.dataset.tab === tab); });
  document.querySelectorAll('.preview-tab-content').forEach(function(c) { c.classList.toggle('active', c.dataset.tab === tab); });
}

/* IMAGE */
function handleFileSelect(e) {
  var file = e.target.files[0];
  if (file) uploadImage(file);
}

function uploadImage(file) {
  if (!state.apiKeys.imgbbKey) { toast('請先設定 imgbb API Key', 'error'); return; }
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
        toast('圖片上傳成功', 'success');
      } else {
        throw new Error((data.error && data.error.message) || '上傳失敗');
      }
    })
    .catch(function(err) { toast('圖片上傳失敗：' + err.message, 'error'); })
    .finally(function() { progress.classList.remove('show'); });
}

function applyImageUrl() {
  var url = $('img-url-input').value.trim();
  if (url) { setImage(url); toast('圖片 URL 已套用', 'info'); }
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

/* JSONBIN */
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
    .catch(function(err) { setStatus('error'); toast('載入失敗：' + err.message, 'error'); })
    .finally(function() { showLoading(false); });
}

function saveToJsonbin() {
  var key = state.apiKeys.jsonbinKey, bid = state.apiKeys.jsonbinBinId;
  if (!key || !bid) return Promise.reject(new Error('請先設定 jsonbin API Key 與 Bin ID'));
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
  if (!key || !bid) { toast('請填寫 jsonbin API Key 與 Bin ID', 'warning'); return; }
  $('btn-api-test').disabled = true;
  fetch('https://api.jsonbin.io/v3/b/' + bid + '/latest', { headers: { 'X-Master-Key': key } })
    .then(function(r) {
      if (r.ok) { toast('連線成功！', 'success'); setStatus('connected'); }
      else throw new Error('HTTP ' + r.status);
    })
    .catch(function(err) { toast('連線失敗：' + err.message, 'error'); setStatus('error'); })
    .finally(function() { $('btn-api-test').disabled = false; });
}

/* SAVE NEWS */
function saveNews() {
  var title = $('f-title').value.trim();
  var content = $('f-content').value.trim();
  if (!title) { toast('請輸入新聞標題', 'warning'); $('f-title').focus(); return; }
  if (!content) { toast('請輸入新聞內文', 'warning'); $('f-content').focus(); return; }

  var article = {
    id: state.editingId || Date.now().toString(),
    title: title,
    category: $('f-category').value,
    excerpt: $('f-excerpt').value.trim(),
    content: content,
    author: $('f-author').value.trim() || 'TNC 編輯',
    date: $('f-date').value || new Date().toISOString().slice(0, 10),
    image: state.imageUrl,
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
      toast(isEdit ? '新聞已更新' : '新聞已新增', 'success');
      resetForm();
      renderList();
    })
    .catch(function(err) { toast('儲存失敗：' + err.message, 'error'); })
    .finally(function() { $('btn-save').disabled = false; });
}

/* RESET */
function resetForm() {
  state.editingId = null;
  state.imageUrl = '';
  $('f-title').value = '';
  $('f-category').value = '社會';
  $('f-excerpt').value = '';
  $('f-content').value = '';
  $('f-author').value = '';
  $('f-published').checked = true;
  setDefaultDate();
  clearImage();
  $('edit-mode-badge').classList.remove('show');
  $('btn-save').innerHTML = '<i class="fa-solid fa-floppy-disk"></i> 儲存新聞';
  $('btn-save').className = 'btn btn-primary';
  $('panel-form-title').textContent = '新增新聞';
  updateCharCount();
  updatePreview();
  document.querySelectorAll('.news-item').forEach(function(el) { el.classList.remove('active'); });
}

/* EDIT */
function loadForEdit(article) {
  state.editingId = article.id;
  $('f-title').value = article.title || '';
  $('f-category').value = article.category || '社會';
  $('f-excerpt').value = article.excerpt || '';
  $('f-content').value = article.content || '';
  $('f-author').value = article.author || '';
  $('f-date').value = article.date || '';
  $('f-published').checked = article.published !== false;
  if (article.image) { setImage(article.image); $('img-url-input').value = article.image; }
  else { clearImage(); }
  $('edit-mode-badge').classList.add('show');
  $('btn-save').innerHTML = '<i class="fa-solid fa-pen"></i> 更新新聞';
  $('btn-save').className = 'btn btn-blue';
  $('panel-form-title').textContent = '編輯新聞';
  updateCharCount();
  updatePreview();
  switchTab('preview');
  document.querySelectorAll('.news-item').forEach(function(el) { el.classList.remove('active'); });
  var activeItem = document.querySelector('.news-item[data-id="' + article.id + '"]');
  if (activeItem) activeItem.classList.add('active');
}

/* DELETE */
function deleteNews(id) {
  pendingDeleteId = id;
  var article = state.news.find(function(n) { return n.id === id; });
  $('modal-body-text').textContent = '確定要刪除「' + ((article && article.title) || '此新聞') + '」嗎？此操作無法復原。';
  openModal();
}

function confirmDelete() {
  if (!pendingDeleteId) return;
  var delId = pendingDeleteId;
  state.news = state.news.filter(function(n) { return n.id !== delId; });
  closeModal();
  saveToJsonbin()
    .then(function() {
      toast('新聞已刪除', 'success');
      if (state.editingId === delId) resetForm();
      renderList();
    })
    .catch(function(err) {
      toast('刪除失敗：' + err.message, 'error');
      fetchNews();
    });
  pendingDeleteId = null;
}

/* RENDER LIST */
function renderList() {
  var q = ($('list-search-input') ? $('list-search-input').value : '').toLowerCase();
  var cat = $('list-filter') ? $('list-filter').value : '';
  var items = state.news.slice();
  if (q) items = items.filter(function(n) { return (n.title && n.title.toLowerCase().includes(q)) || (n.author && n.author.toLowerCase().includes(q)); });
  if (cat) items = items.filter(function(n) { return n.category === cat; });

  var listEl = $('news-list');
  var countEl = $('list-count');
  if (countEl) countEl.textContent = '共 ' + items.length + ' 篇';

  if (!items.length) {
    listEl.innerHTML = '<div class="news-list-empty"><i class="fa-regular fa-newspaper"></i><p>' + (state.news.length ? '沒有符合條件的新聞' : '尚無新聞，點擊左側新增') + '</p></div>';
    return;
  }

  listEl.innerHTML = items.map(function(n) {
    var isActive = n.id === state.editingId;
    var thumbHtml = n.image ? '<img src="' + n.image + '" alt="" />' : '<i class="fa-regular fa-image"></i>';
    var statusHtml = n.published !== false
      ? '<span class="news-item-status pub">已發布</span>'
      : '<span class="news-item-status draft">草稿</span>';
    return '<div class="news-item' + (isActive ? ' active' : '') + '" data-id="' + n.id + '" onclick="handleItemClick(\'' + n.id + '\')">'
      + '<div class="news-item-thumb">' + thumbHtml + '</div>'
      + '<div class="news-item-body">'
      + '<div class="news-item-title">' + esc(n.title) + '</div>'
      + '<div class="news-item-meta">'
      + '<span class="news-item-cat">' + (n.category || '') + '</span>'
      + '<span class="news-item-date"><i class="fa-regular fa-calendar"></i>' + (n.date || '') + '</span>'
      + statusHtml
      + '</div></div>'
      + '<div class="news-item-actions">'
      + '<button class="news-item-btn" title="編輯" onclick="event.stopPropagation();loadForEdit(state.news.find(function(x){return x.id===\'' + n.id + '\';}))"><i class="fa-solid fa-pen"></i></button>'
      + '<button class="news-item-btn del" title="刪除" onclick="event.stopPropagation();deleteNews(\'' + n.id + '\')"><i class="fa-solid fa-trash"></i></button>'
      + '</div></div>';
  }).join('');
}

function handleItemClick(id) {
  var article = state.news.find(function(n) { return n.id === id; });
  if (article) loadForEdit(article);
}

/* MODAL */
function openModal() { $('modal-overlay').classList.add('open'); }
function closeModal() { $('modal-overlay').classList.remove('open'); pendingDeleteId = null; }

/* TOAST */
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

/* STATUS */
function setStatus(s) {
  var dot = $('status-dot'), txt = $('status-text');
  dot.className = 'status-dot' + (s === 'connected' ? ' connected' : s === 'error' ? ' error' : '');
  txt.textContent = s === 'connected' ? '已連線' : s === 'error' ? '連線失敗' : '未連線';
}

/* LOADING */
function showLoading(show) { $('loading-overlay').classList.toggle('show', show); }
