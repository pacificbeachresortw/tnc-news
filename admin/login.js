/* TNC NEWS Admin - Login System */
(function () {
  'use strict';

  var DEFAULT_PWD_HASH = 'tnc2026_hashed';
  var SESSION_KEY = 'tnc_admin_session';
  var PWD_KEY = 'tnc_admin_pwd';

  /* Simple hash: XOR + base64-like obfuscation (client-side only, not for production security) */
  function hashPwd(pwd) {
    var salt = 'TNC_NEWS_SALT_2026';
    var result = '';
    for (var i = 0; i < pwd.length; i++) {
      result += String.fromCharCode(pwd.charCodeAt(i) ^ salt.charCodeAt(i % salt.length));
    }
    return btoa(result);
  }

  function getStoredHash() {
    return localStorage.getItem(PWD_KEY) || hashPwd('tnc2026');
  }

  function isLoggedIn() {
    var session = sessionStorage.getItem(SESSION_KEY);
    return session === 'authenticated';
  }

  function login(pwd) {
    return hashPwd(pwd) === getStoredHash();
  }

  function logout() {
    sessionStorage.removeItem(SESSION_KEY);
    showLoginPage();
  }

  function setSession() {
    sessionStorage.setItem(SESSION_KEY, 'authenticated');
  }

  /* ---- UI ---- */
  function showLoginPage() {
    document.getElementById('login-page').style.display = 'flex';
    document.getElementById('admin-page').style.display = 'none';
    document.getElementById('login-pwd').value = '';
    document.getElementById('login-error').classList.remove('show');
  }

  function showAdminPage() {
    document.getElementById('login-page').style.display = 'none';
    document.getElementById('admin-page').style.display = 'flex';
  }

  function handleLogin() {
    var pwd = document.getElementById('login-pwd').value;
    var errEl = document.getElementById('login-error');
    var card = document.getElementById('login-card');
    if (!pwd) {
      errEl.textContent = '\u8ACB\u8F38\u5165\u5BC6\u78BC';
      errEl.classList.add('show');
      return;
    }
    if (login(pwd)) {
      setSession();
      errEl.classList.remove('show');
      showAdminPage();
      /* Trigger admin init if not yet done */
      if (typeof window.adminInit === 'function') {
        window.adminInit();
      }
    } else {
      errEl.textContent = '\u5BC6\u78BC\u932F\u8AA4\uFF0C\u8ACB\u518D\u8A66\u4E00\u6B21';
      errEl.classList.add('show');
      card.classList.remove('login-shake');
      void card.offsetWidth;
      card.classList.add('login-shake');
    }
  }

  function togglePwdVisibility() {
    var input = document.getElementById('login-pwd');
    var icon = document.getElementById('pwd-toggle-icon');
    if (input.type === 'password') {
      input.type = 'text';
      icon.className = 'fa-solid fa-eye-slash login-input-icon';
    } else {
      input.type = 'password';
      icon.className = 'fa-solid fa-eye login-input-icon';
    }
  }

  function showChangePwd() {
    var modal = document.getElementById('change-pwd-modal');
    modal.classList.add('open');
    document.getElementById('cp-current').value = '';
    document.getElementById('cp-new').value = '';
    document.getElementById('cp-confirm').value = '';
    document.getElementById('cp-error').classList.remove('show');
  }

  function hideChangePwd() {
    document.getElementById('change-pwd-modal').classList.remove('open');
  }

  function doChangePwd() {
    var current = document.getElementById('cp-current').value;
    var newPwd = document.getElementById('cp-new').value;
    var confirm = document.getElementById('cp-confirm').value;
    var errEl = document.getElementById('cp-error');

    if (!login(current)) {
      errEl.textContent = '\u76EE\u524D\u5BC6\u78BC\u932F\u8AA4';
      errEl.classList.add('show'); return;
    }
    if (newPwd.length < 6) {
      errEl.textContent = '\u65B0\u5BC6\u78BC\u81F3\u5C116\u4F4D';
      errEl.classList.add('show'); return;
    }
    if (newPwd !== confirm) {
      errEl.textContent = '\u5169\u6B21\u8F38\u5165\u7684\u65B0\u5BC6\u78BC\u4E0D\u4E00\u81F4';
      errEl.classList.add('show'); return;
    }
    localStorage.setItem(PWD_KEY, hashPwd(newPwd));
    hideChangePwd();
    showToastLogin('\u5BC6\u78BC\u5DF2\u66F4\u65B0\u6210\u529F', 'success');
  }

  function showToastLogin(msg, type) {
    if (typeof toast === 'function') { toast(msg, type); return; }
    alert(msg);
  }

  /* ---- INIT ---- */
  document.addEventListener('DOMContentLoaded', function () {
    /* Bind login form */
    document.getElementById('login-btn').addEventListener('click', handleLogin);
    document.getElementById('login-pwd').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') handleLogin();
    });
    document.getElementById('pwd-toggle-icon').addEventListener('click', togglePwdVisibility);

    /* Change password */
    var changePwdBtn = document.getElementById('btn-change-pwd');
    if (changePwdBtn) changePwdBtn.addEventListener('click', showChangePwd);
    document.getElementById('cp-cancel').addEventListener('click', hideChangePwd);
    document.getElementById('cp-confirm-btn').addEventListener('click', doChangePwd);

    /* Logout */
    var logoutBtn = document.getElementById('btn-logout');
    if (logoutBtn) logoutBtn.addEventListener('click', logout);

    /* Check session */
    if (isLoggedIn()) {
      showAdminPage();
      if (typeof window.adminInit === 'function') window.adminInit();
    } else {
      showLoginPage();
    }
  });

  /* Expose logout globally */
  window.adminLogout = logout;
})();
