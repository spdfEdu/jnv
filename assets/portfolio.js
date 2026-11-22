/* JNV MSD alumni year page loader.
   Asks the API for this batch. The browser keeps the last copy together with its version number and asks
   "has it changed?": if not, the saved copy is used and almost nothing is downloaded. If the API is down
   it falls back to the saved copy, then to the data pasted in the post. Then it starts the page (portfolioz_core.js). */
(function () {
  var API = window.JNV_API || "https://api.jnvmurshidabad.workers.dev"; // set window.JNV_API before this script to point elsewhere
  window.JNV_API = API;
  var TOKEN_KEY = "jnv-id-token";   // an older one hour Google sign-in
  var SESSION_KEY = "jnv-session";  // the 30 day sign-in
  var me = document.currentScript;
  var base = me && me.src ? me.src.replace(/[^\/]*$/, "") : "";

  var year = (typeof BATCH !== "undefined" && BATCH) || (typeof all !== "undefined" && all[0] && all[0].Batch) || ((location.pathname.match(/(\d{4})/) || [])[1]);
  var cacheKey = "jnv-cache-" + year;

  /* ---------- who is signed in ---------- */
  function readSession() {
    try { var s = JSON.parse(localStorage.getItem(SESSION_KEY) || "null"); return s && s.t ? s : null; } catch (e) { return null; }
  }
  function googleToken() {
    try {
      var t = localStorage.getItem(TOKEN_KEY);
      var c = t && JSON.parse(atob(t.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
      return c && c.exp * 1000 > Date.now() + 60000 ? t : null;
    } catch (e) { return null; }
  }
  function token() { var s = readSession(); return s ? s.t : googleToken(); }
  function clearSignIn() { try { localStorage.removeItem(SESSION_KEY); localStorage.removeItem(TOKEN_KEY); } catch (e) {} }
  // someone who signed in before the 30 day sign-in existed: quietly swap their hour-long token for a session
  function upgrade(g) {
    fetch(API + "/api/session", { method: "POST", headers: { Authorization: "Bearer " + g } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) { if (j) { localStorage.setItem(SESSION_KEY, JSON.stringify({ t: j.session, user: j.user })); localStorage.removeItem(TOKEN_KEY); } })
      .catch(function () {});
  }

  /* ---------- the batch data and its saved copy ---------- */
  function readCache() {
    try { var c = JSON.parse(localStorage.getItem(cacheKey)); return c && c.v && c.entries ? c : null; } catch (e) { return null; }
  }
  function saveCache(j) {
    if (!j.ver) return;
    try { localStorage.setItem(cacheKey, JSON.stringify({ v: j.ver, entries: j.entries || [], slides: j.slides || [] })); } catch (e) {}
  }

  function fetchBatch(level, tok, v) {
    var ctl = window.AbortController ? new AbortController() : null;
    var timer = ctl ? setTimeout(function () { ctl.abort(); }, 6000) : null;
    return fetch(API + "/api/batch/" + year + "?level=" + level + (v ? "&v=" + v : ""), { headers: tok ? { Authorization: "Bearer " + tok } : {}, signal: ctl ? ctl.signal : undefined })
      .then(function (r) { if (timer) clearTimeout(timer); if (!r.ok) throw new Error(r.status); return r.json(); });
  }

  // the public version: ask with the saved copy's version number, and keep the saved copy if nothing changed
  function publicBatch() {
    var c = readCache();
    return fetchBatch("public", null, c && c.v).then(function (j) {
      if (j.unchanged && c) return { j: { entries: c.entries, slides: c.slides, ver: c.v }, level: "public" };
      saveCache(j);
      return { j: j, level: "public" };
    });
  }

  function use(list, level) {
    all.length = 0;
    Array.prototype.push.apply(all, list);
    window.JNV_LIVE = true;
    window.JNV_LEVEL = level;
  }

  function startPage() {
    var s = document.createElement("script");
    s.src = base + "portfolioz_core.js";
    // the profiles are built after the page has loaded, so open a linked profile (#Name) ourselves
    s.onload = function () {
      var h = location.hash;
      if (h && h.length > 1) { history.replaceState(null, "", location.pathname + location.search); location.hash = h; }
    };
    document.body.appendChild(s);
  }

  if (!year) return startPage();
  var tok = token();
  window.JNV_SIGNED = !!tok;
  // signed-in core members and admins get the full version (never saved); everyone else the public one
  var first = tok
    ? fetchBatch("full", tok).then(function (j) { return { j: j, level: "full" }; }, function () { return publicBatch(); })
    : publicBatch();

  first.then(function (r) {
    window.JNV_SLIDES = r.j.slides || []; // photos approved for the batch slider
    if (r.j.entries && r.j.entries.length) use(r.j.entries, r.level);
  }).catch(function () {
    var c = readCache();
    if (c && c.entries.length) use(c.entries, "public");
    window.JNV_SLIDES = c ? c.slides || [] : [];
  }).then(function () {
    // who is signed in (used to mark their own profile and show Edit)
    if (!tok) return;
    return fetch(API + "/api/me", { headers: { Authorization: "Bearer " + tok } })
      .then(function (r) { if (r.status === 401) { clearSignIn(); window.JNV_SIGNED = false; return null; } return r.ok ? r.json() : null; })
      .then(function (j) { if (j) { window.JNV_ME = j; if (!readSession()) upgrade(tok); } })
      .catch(function () {});
  }).then(startPage);
})();
