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
  var mutedColor  = isDark ? '#555' : '#94a3b8';

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

  /* ── CSS ──────────────────────────────────────────────────────────────── */
  var css = [
    '#tw-btn{position:fixed;top:14px;left:14px;z-index:9000;',
    'background:',bgColor,';border:1.5px solid ',borderColor,';color:',textColor,';',
    'border-radius:9px;padding:8px 12px;font-size:17px;line-height:1;cursor:pointer;',
    'box-shadow:0 2px 12px rgba(0,0,0,.18);transition:border-color .15s,color .15s;}',
    '#tw-btn:hover{border-color:',primary,';color:',primary,';}',

    '#tw-ov{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9001;',
    'opacity:0;pointer-events:none;transition:opacity .25s;}',
    '#tw-ov.on{opacity:1;pointer-events:auto;}',

    '#tw-pnl{position:fixed;top:0;left:0;height:100%;width:min(300px,86vw);',
    'background:',bgColor,';border-right:1.5px solid ',borderColor,';z-index:9002;',
    'transform:translateX(-100%);transition:transform .25s ease;',
    'display:flex;flex-direction:column;overflow-y:auto;padding:18px 18px 40px;gap:20px;',
    "font-family:'Nunito',sans-serif;}",
    '#tw-pnl.on{transform:translateX(0);}',

    '.tw-sec{display:flex;flex-direction:column;gap:8px;}',
    '.tw-lbl{font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:',mutedColor,';font-weight:800;}',

    '.tw-home{display:flex;align-items:center;gap:8px;background:',surfColor,';',
    'border:1.5px solid ',borderColor,';border-radius:9px;padding:11px 14px;',
    'color:',textColor,';text-decoration:none;font-weight:800;font-size:.88rem;',
    'transition:border-color .15s;}',
    '.tw-home:hover{border-color:',primary,';}',

    '.tw-chips{display:flex;gap:7px;}',
    '.tw-chip{background:',surfColor,';border:1.5px solid ',borderColor,';',
    'border-radius:99px;padding:5px 13px;font-weight:800;font-size:.82rem;',
    'color:',mutedColor,';cursor:pointer;',
    "font-family:'Nunito',sans-serif;transition:all .15s;}",
    '.tw-chip.on{background:',(isDark?'#1a1f00':primary),';border-color:',primary,';',
    'color:',(isDark?primary:'#fff'),';}'  ,

    '.tw-inp{background:',(isDark?'#0d0d0d':'#e0f4ff'),';border:1.5px solid ',borderColor,';',
    'border-radius:8px;padding:9px 11px;color:',textColor,';',
    "font-family:'Nunito',sans-serif;font-size:.88rem;font-weight:700;",
    'outline:none;width:100%;box-sizing:border-box;}',
    '.tw-inp:focus{border-color:',primary,';}',
    '.tw-inp::placeholder{color:',mutedColor,';}',

    '.tw-sbtn{background:',primary,';color:',(isDark?'#000':'#fff'),';',
    'border:none;border-radius:8px;',
    "font-family:'Nunito',sans-serif;font-size:.88rem;font-weight:800;",
    'padding:9px 16px;cursor:pointer;transition:opacity .15s;}',
    '.tw-sbtn:hover{opacity:.85;}',

    '.tw-fb{font-size:.78rem;font-weight:700;min-height:16px;',
    'color:',(isDark?'#47ff8a':'#2a8a4a'),';transition:opacity .3s;}',

    '.tw-hr{border:none;border-top:1px solid ',borderColor,';}',

    '.tw-flist{display:flex;flex-direction:column;gap:5px;}',
    '.tw-frow{display:flex;align-items:center;gap:6px;background:',surfColor,';',
    'border:1.5px solid ',borderColor,';border-radius:8px;padding:9px 11px;',
    'cursor:pointer;transition:border-color .15s;}',
    '.tw-frow:hover{border-color:',primary,';}',
    '.tw-fname{flex:1;font-weight:800;font-size:.86rem;color:',textColor,';}',
    '.tw-fdel{background:none;border:none;color:',mutedColor,';cursor:pointer;',
    'padding:2px 5px;font-size:.85rem;transition:color .15s;}',
    '.tw-fdel:hover{color:',(isDark?'#ff4747':'#ff5c6a'),';}'  ,

    '.tw-empty{font-size:.82rem;font-weight:700;color:',mutedColor,';}',

    // Light-theme overrides (applied when html[data-theme="light"])
    'html[data-theme="light"] #tw-btn{background:#fff!important;border-color:#e2e8f0!important;color:#1e293b!important;}',
    'html[data-theme="light"] #tw-btn:hover{border-color:#818cf8!important;color:#818cf8!important;}',
    'html[data-theme="light"] #tw-pnl{background:#fff!important;border-color:#e2e8f0!important;}',
    'html[data-theme="light"] .tw-lbl{color:#64748b!important;}',
    'html[data-theme="light"] .tw-home{background:#f8faff!important;border-color:#e2e8f0!important;color:#1e293b!important;}',
    'html[data-theme="light"] .tw-home:hover{border-color:#818cf8!important;}',
    'html[data-theme="light"] .tw-chip{background:#f8faff!important;border-color:#e2e8f0!important;color:#64748b!important;}',
    'html[data-theme="light"] .tw-chip.on{background:#ede9fe!important;border-color:#818cf8!important;color:#4f46e5!important;}',
    'html[data-theme="light"] .tw-inp{background:#f8faff!important;border-color:#e2e8f0!important;color:#1e293b!important;}',
    'html[data-theme="light"] .tw-inp::placeholder{color:#94a3b8!important;}',
    'html[data-theme="light"] .tw-inp:focus{border-color:#818cf8!important;}',
    'html[data-theme="light"] .tw-fb{color:#166534!important;}',
    'html[data-theme="light"] .tw-hr{border-color:#e2e8f0!important;}',
    'html[data-theme="light"] .tw-frow{background:#f8faff!important;border-color:#e2e8f0!important;}',
    'html[data-theme="light"] .tw-frow:hover{border-color:#818cf8!important;}',
    'html[data-theme="light"] .tw-fname{color:#1e293b!important;}',
    'html[data-theme="light"] .tw-fdel{color:#94a3b8!important;}',
    'html[data-theme="light"] .tw-empty{color:#94a3b8!important;}',
  ].join('');

  var st = document.createElement('style');
  st.textContent = css;
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
