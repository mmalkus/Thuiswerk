(function () {
  document.body.classList.add('tw-sidebar-active');

  function getTheme() { return localStorage.getItem('thuiswerk_theme') || 'dark'; }
  // Apply theme immediately so CSS responds before any render
  document.documentElement.dataset.theme = getTheme();

  var cfg = window.THUISWERK_APP || {};
  var isDark = cfg.theme === 'dark';
  var primary = cfg.primaryColor || '#818cf8';
  var bgColor  = isDark ? '#161616' : '#ffffff';
  var surfColor= isDark ? '#1e1e1e' : '#f0f8ff';
  var borderColor = isDark ? '#2a2a2a' : '#b8d8f5';
  var textColor   = cfg.textColor || (isDark ? '#f0f0f0' : '#1a3a5c');
  var mutedColor  = isDark ? '#999' : '#64748b';

  function getLang() {
    return localStorage.getItem('thuiswerk_lang') || 'nl';
  }
  function loadI18n(lc) {
    if (typeof window.loadI18n === 'function') return window.loadI18n(lc);
    window._i18n = window._i18n || {};
    if (window._i18n[lc]) return Promise.resolve(window._i18n[lc]);
    return fetch('i18n-' + lc + '.json').then(function (r) { return r.json(); })
      .then(function (d) { window._i18n[lc] = d; return d; });
  }
  function loadWords(lc) {
    if (typeof window.loadWords === 'function') return window.loadWords(lc);
    window._words = window._words || {};
    if (window._words[lc]) return Promise.resolve(window._words[lc]);
    return fetch('words-' + lc + '.json').then(function (r) { return r.json(); })
      .then(function (d) { window._words[lc] = d; return d; });
  }
  function getFavs() {
    try { return JSON.parse(localStorage.getItem('thuiswerk_favorites') || '[]'); } catch (e) { return []; }
  }
  function setFavs(favs) {
    try { localStorage.setItem('thuiswerk_favorites', JSON.stringify(favs)); } catch (e) {}
  }

  function ui() {
    var lc = getLang();
    if (window._i18n && window._i18n[lc] && window._i18n[lc].sidebar) return window._i18n[lc].sidebar;
    // Tiny inline fallback for the rare case the JSON hasn't loaded yet
    return lc === 'en'
      ? { home:'Back to Home', language:'Language', theme:'Theme', themeDark:'🌙 Dark', themeLight:'☀️ Light', saveTitle:'Save as favourite', placeholder:'Name…', saveBtn:'Save', savedMsg:'✓ Saved!', noName:'Enter a name', favsTitle:'Saved favourites', noFavs:'No favourites saved yet.' }
      : { home:'Terug naar Home', language:'Taal', theme:'Thema', themeDark:'🌙 Donker', themeLight:'☀️ Licht', saveTitle:'Opslaan als favoriet', placeholder:'Naam…', saveBtn:'Opslaan', savedMsg:'✓ Opgeslagen!', noName:'Geef een naam op', favsTitle:'Opgeslagen favorieten', noFavs:'Nog geen favorieten opgeslagen.' };
  }
  function esc(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  /* ── Inject per-app CSS custom properties ───────────────────────────────── */
  var st = document.createElement('style');
  st.textContent = ':root{' +
    '--tw-bg:'        + bgColor      + ';' +
    '--tw-surf:'      + surfColor    + ';' +
    '--tw-border:'    + borderColor  + ';' +
    '--tw-text:'      + textColor    + ';' +
    '--tw-muted:'     + mutedColor   + ';' +
    '--tw-primary:'   + primary      + ';' +
    '--tw-inp-bg:'    + (isDark ? '#0d0d0d' : '#e0f4ff') + ';' +
    '--tw-sbtn-color:' + (isDark ? '#000' : '#fff') + ';' +
  '}';
  document.head.appendChild(st);

  /* ── DOM ──────────────────────────────────────────────────────────────── */
  var ov  = document.createElement('div'); ov.id = 'tw-ov';
  var pnl = document.createElement('div'); pnl.id = 'tw-pnl';
  var btn = document.createElement('button'); btn.id = 'tw-btn';
  btn.setAttribute('aria-label', 'Menu');
  btn.innerHTML = '&#9776;';

  ov.addEventListener('click', close);
  btn.addEventListener('click', function () { pnl.classList.contains('on') ? close() : open(); });

  document.body.appendChild(ov);
  document.body.appendChild(pnl);
  document.body.appendChild(btn);

  function open()  { render(); pnl.classList.add('on'); ov.classList.add('on'); }
  function close() { pnl.classList.remove('on'); ov.classList.remove('on'); }

  function favListHtml(appFavs, u) {
    if (appFavs.length === 0) return '<div class="tw-empty">' + esc(u.noFavs) + '</div>';
    return appFavs.map(function (f) {
      return '<div class="tw-frow" onclick="window._twSB.load(\'' + f.id + '\')">' +
        '<span class="tw-fname">' + esc(f.name) + '</span>' +
        '<button class="tw-fdel" onclick="event.stopPropagation();window._twSB.del(\'' + f.id + '\')" title="Verwijder">&#x2715;</button>' +
        '</div>';
    }).join('');
  }

  function render() {
    var u = ui(), lang = getLang(), theme = getTheme();
    var appFavs = getFavs().filter(function (f) { return f.app === cfg.id; });
    pnl.innerHTML =
      '<div class="tw-sec">' +
        '<a href="index.html" class="tw-home">&#127968; ' + esc(u.home) + '</a>' +
      '</div>' +
      '<div class="tw-sec">' +
        '<div class="tw-lbl">' + esc(u.language) + '</div>' +
        '<div class="tw-chips">' +
          '<button class="tw-chip' + (lang==='nl'?' on':'') + '" onclick="window._twSB.lang(\'nl\')">NL</button>' +
          '<button class="tw-chip' + (lang==='en'?' on':'') + '" onclick="window._twSB.lang(\'en\')">EN</button>' +
        '</div>' +
      '</div>' +
      '<div class="tw-sec">' +
        '<div class="tw-lbl">' + esc(u.theme||'Thema') + '</div>' +
        '<div class="tw-chips">' +
          '<button class="tw-chip tw-tc' + (theme==='dark'?' on':'') + '" onclick="window._twSB.setTheme(\'dark\')">' + esc(u.themeDark||'🌙 Donker') + '</button>' +
          '<button class="tw-chip tw-tc' + (theme==='light'?' on':'') + '" onclick="window._twSB.setTheme(\'light\')">' + esc(u.themeLight||'☀️ Licht') + '</button>' +
        '</div>' +
      '</div>' +
      (typeof cfg.getSettings === 'function' ?
        '<hr class="tw-hr"/>' +
        '<div class="tw-sec">' +
          '<div class="tw-lbl">' + esc(u.saveTitle) + '</div>' +
          '<input id="tw-name" class="tw-inp" type="text" placeholder="' + esc(u.placeholder) + '" autocomplete="off"/>' +
          '<button class="tw-sbtn" onclick="window._twSB.save()">' + esc(u.saveBtn) + '</button>' +
          '<div class="tw-fb" id="tw-fb"></div>' +
        '</div>' +
        '<hr class="tw-hr"/>' +
        '<div class="tw-sec">' +
          '<div class="tw-lbl">' + esc(u.favsTitle) + '</div>' +
          '<div class="tw-flist" id="tw-flist">' + favListHtml(appFavs, u) + '</div>' +
        '</div>'
      : '');
  }

  /* ── Public API ───────────────────────────────────────────────────────── */
  window._twSB = {
    lang: function (lc) {
      localStorage.setItem('thuiswerk_lang', lc);
      if (cfg.id === 'reken') localStorage.setItem('rekentoets_lang', lc);
      // Update chips immediately
      document.querySelectorAll('#tw-pnl .tw-chip').forEach(function (c) {
        if (c.textContent === 'NL') c.classList.toggle('on', lc === 'nl');
        if (c.textContent === 'EN') c.classList.toggle('on', lc === 'en');
      });
      // Ensure both i18n (and words for dictee) are cached before firing the event
      var fetches = [loadI18n(lc)];
      if (cfg.id === 'dictee') fetches.push(loadWords(lc));
      Promise.all(fetches).then(function () {
        window.dispatchEvent(new CustomEvent('thuiswerk:setLang', { detail: lc }));
        if (pnl.classList.contains('on')) render();
      });
    },
    save: function () {
      var nameEl = document.getElementById('tw-name');
      var fbEl   = document.getElementById('tw-fb');
      var u = ui();
      var name = nameEl ? nameEl.value.trim() : '';
      if (!name) { if (fbEl) fbEl.textContent = u.noName; return; }
      var gs = cfg.getSettings;
      if (typeof gs !== 'function') return;
      var settings = gs();
      var favs = getFavs();
      var id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      favs.push({ id: id, name: name, app: cfg.id, settings: settings });
      setFavs(favs);
      if (nameEl) nameEl.value = '';
      if (fbEl) { fbEl.textContent = u.savedMsg; setTimeout(function () { if (fbEl) fbEl.textContent = ''; }, 2000); }
      var listEl = document.getElementById('tw-flist');
      if (listEl) listEl.innerHTML = favListHtml(getFavs().filter(function (f) { return f.app === cfg.id; }), u);
    },
    load: function (id) {
      var fav = getFavs().find(function (f) { return f.id === id; });
      if (!fav) return;
      var as = cfg.applySettings;
      if (typeof as === 'function') as(fav.settings);
      close();
    },
    del: function (id) {
      setFavs(getFavs().filter(function (f) { return f.id !== id; }));
      render();
    },
    setTheme: function (t) {
      localStorage.setItem('thuiswerk_theme', t);
      document.documentElement.dataset.theme = t;
      if (pnl.classList.contains('on')) render();
    }
  };
})();
