/* Planify auth: login gate, account sync and activity tracking.
   script.js (the app) is loaded only after the user is signed in. */
(function () {
  'use strict';
  var KEY = 'planify.dash.v3', FIRED = 'planify.fired', UID = 'planify.uid';
  var me = null, mode = 'in', queue = [], latest = null, saveTimer = null, booted = false, hooked = false;

  function $(s) { return document.querySelector(s); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function api(method, url, body, keepalive) {
    return fetch(url, { method: method, credentials: 'same-origin', keepalive: !!keepalive,
      headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok) { var e = new Error(j.error || 'Something went wrong (' + r.status + ')'); e.status = r.status; throw e; }
        return j;
      });
    });
  }

  /* ---------- sign in / create account screen ---------- */
  function showGate(msg) {
    var g = document.createElement('div'); g.id = 'gate';
    g.innerHTML = '<div class="gbox"><div class="gside"><h2>Plan the week.<br>Finish the work.</h2><p>Sign in to keep your tasks, exams and settings on every device you use.</p></div>' +
      '<form class="gform" id="gf" novalidate><div class="gtabs" role="tablist">' +
      '<button type="button" role="tab" data-m="in" aria-selected="true">Sign in</button>' +
      '<button type="button" role="tab" data-m="up" aria-selected="false">Create account</button></div>' +
      '<div id="gn" hidden><label for="gname">Your name</label><input id="gname" autocomplete="name" maxlength="60"></div>' +
      '<label for="gem">Email</label><input id="gem" type="email" autocomplete="email" required>' +
      '<label for="gpw">Password</label><input id="gpw" type="password" autocomplete="current-password" required>' +
      '<small class="gfoot" id="ghint" hidden>Use at least 8 characters.</small>' +
      '<div id="gerr" role="alert"></div><button class="btn" id="gbtn" type="submit">Sign in</button>' +
      '<p class="gfoot">Passwords are hashed on the server and never stored as plain text.</p></form></div>';
    document.body.appendChild(g);
    if (msg) $('#gerr').textContent = msg;
    function setMode(m) {
      mode = m;
      [].forEach.call(g.querySelectorAll('[data-m]'), function (b) { b.setAttribute('aria-selected', b.dataset.m === m); });
      $('#gn').hidden = m !== 'up'; $('#ghint').hidden = m !== 'up';
      $('#gbtn').textContent = m === 'up' ? 'Create account' : 'Sign in';
      $('#gpw').autocomplete = m === 'up' ? 'new-password' : 'current-password';
      $('#gerr').textContent = '';
    }
    g.addEventListener('click', function (e) { var b = e.target.closest('[data-m]'); if (b) setMode(b.dataset.m); });
    $('#gf').addEventListener('submit', function (e) {
      e.preventDefault();
      var name = $('#gname').value.trim(), email = $('#gem').value.trim(), pw = $('#gpw').value, err = $('#gerr'), btn = $('#gbtn');
      if (mode === 'up' && !name) { err.textContent = 'Enter your name.'; return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { err.textContent = 'Enter a valid email address.'; return; }
      if (!pw || (mode === 'up' && pw.length < 8)) { err.textContent = mode === 'up' ? 'Use a password with at least 8 characters.' : 'Enter your password.'; return; }
      err.textContent = ''; btn.disabled = true;
      api('POST', mode === 'up' ? '/api/signup' : '/api/login', { name: name, email: email, password: pw })
        .then(function (j) { g.remove(); boot(j.user, j.state); })
        .catch(function (x) { err.textContent = x.status ? x.message : 'Can’t reach the Planify server. Open the site from its web address, or run npm start.'; btn.disabled = false; });
    });
    $('#gem').focus();
  }

  /* ---------- start the app after sign-in ---------- */
  function boot(user, state) {
    me = user;
    try {
      if (localStorage.getItem(UID) !== user.id) localStorage.removeItem(FIRED);
      localStorage.setItem(UID, user.id);
      localStorage.setItem(KEY, JSON.stringify(state || { name: user.name }));
    } catch (e) {}
    hook(); fillAccount(); log('app_open');
    if (booted) return; booted = true;
    document.body.classList.remove('locked');
    var s = document.createElement('script'); s.src = 'script.js'; document.body.appendChild(s);
  }
  function fillAccount() { if ($('#aname')) { $('#aname').textContent = me.name; $('#amail').textContent = me.email; } }

  /* ---------- keep the user's data on the server ---------- */
  function hook() {
    if (hooked) return; hooked = true;
    var orig = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k, v) {
      orig.apply(this, arguments);
      if (this === window.localStorage && k === KEY && me) { latest = v; clearTimeout(saveTimer); saveTimer = setTimeout(flushState, 1500); }
    };
  }
  function flushState() {
    clearTimeout(saveTimer); if (!latest || !me) return;
    var v = latest; latest = null;
    try { api('PUT', '/api/state', { state: JSON.parse(v) }, true).catch(function () {}); } catch (e) {}
  }

  /* ---------- activity log ---------- */
  function log(type, detail) { if (!me) return; queue.push({ type: type, detail: detail || '' }); if (queue.length >= 20) flushAct(); }
  function flushAct(unload) {
    if (!queue.length || !me) return;
    var ev = queue.splice(0, 50);
    if (unload && navigator.sendBeacon) { navigator.sendBeacon('/api/activity', new Blob([JSON.stringify({ events: ev })], { type: 'application/json' })); return; }
    api('POST', '/api/activity', { events: ev }).catch(function () { queue = ev.concat(queue).slice(0, 200); });
  }
  setInterval(flushAct, 10000);
  document.addEventListener('visibilitychange', function () { if (document.hidden) { flushState(); flushAct(true); } });
  window.addEventListener('pagehide', function () { flushState(); flushAct(true); });
  var QUIET = { menu: 1, cal: 1, day: 1, dr: 1 };
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-a]');
    if (b && !QUIET[b.dataset.a]) log(b.dataset.a, b.dataset.p || '');
  }, true);
  document.addEventListener('change', function (e) { var t = e.target; if (t.dataset && t.dataset.s) log('setting', t.dataset.s); });

  /* ---------- account panel (inside Customize) ---------- */
  function clearLocal() { try { localStorage.removeItem(KEY); localStorage.removeItem(FIRED); localStorage.removeItem(UID); } catch (e) {} }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-auth]'); if (!b) return;
    var a = b.dataset.auth;
    if (a === 'out') {
      flushState(); flushAct();
      api('POST', '/api/logout').catch(function () {}).then(function () { me = null; clearLocal(); location.reload(); });
    } else if (a === 'act') {
      var box = $('#actl'); box.textContent = 'Loading…';
      api('GET', '/api/activity?limit=30').then(function (j) {
        box.innerHTML = j.events.length ? j.events.map(function (x) {
          return '<div class="dtk"><span>' + esc(x.type) + (x.detail ? ' · ' + esc(x.detail) : '') + '</span><small>' + esc(new Date(x.t).toLocaleString()) + '</small></div>';
        }).join('') : '<small class="m">No activity yet.</small>';
      }).catch(function (x) { box.textContent = x.message; });
    } else if (a === 'del') {
      var pw = window.prompt('This permanently deletes your account and data. Enter your password to confirm:');
      if (!pw) return;
      api('POST', '/api/delete-account', { password: pw }).then(function () { me = null; clearLocal(); location.reload(); })
        .catch(function (x) { window.alert(x.message); });
    }
  });

  /* ---------- go ---------- */
  api('GET', '/api/me').then(function (j) { boot(j.user, j.state); })
    .catch(function (x) { showGate(x.status === 401 ? '' : 'Can’t reach the Planify server. Open the site from its web address, or run npm start.'); });
})();
