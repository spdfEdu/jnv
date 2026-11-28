/* JNV MSD alumni: one sign-in for the whole site.
   Load it from the theme <head> WITHOUT async/defer, so window.JNV_ME is ready before the batch page scripts run:
   <script src=".../signin.js" data-api="https://api..." data-client="...apps.googleusercontent.com"></script>
   It keeps the existing 30 day session (localStorage "jnv-session" = {t, user}), so people who are signed in stay signed in.
   window.JNVAuth: ready(cb), user(), token(), signOut(), onChange(cb), plus api(), me(), picker(), registerView() for the pages. */
(function () {
  if (window.JNVAuth) return; // loaded twice: keep the first copy

  /* ---------- settings ---------- */
  var me = document.currentScript || {};
  var ds = me.dataset || {};
  var CFG = {
    api: String(ds.api || window.JNV_API || "https://api.jnvmurshidabad.workers.dev").replace(/\/+$/, ""),
    client: ds.client || window.JNV_CLIENT || "1019761610975-qba21qjqvvlr8kbeda7sut319m6gnt2f.apps.googleusercontent.com",
    login: ds.login || window.JNV_LOGIN || "/p/login.html",
    admin: ds.admin || window.JNV_ADMIN || "/p/admin.html"
  };
  // the other scripts read these names; setting them here means every page talks to the same API with the same Google client
  window.JNV_API = window.JNV_API || CFG.api;
  window.JNV_CLIENT = window.JNV_CLIENT || CFG.client;
  window.JNV_LOGIN = window.JNV_LOGIN || CFG.login;
  window.JNV_ADMIN = window.JNV_ADMIN || CFG.admin;

  var SESSION_KEY = "jnv-session";  // the 30 day sign-in: {t: token, user: {...}} (same key and format as before)
  var TOKEN_KEY = "jnv-id-token";   // an older one hour Google sign-in, still accepted and swapped for a session
  var ME_KEY = "jnv-me";            // a small copy of "who am I" so JNV_ME is ready at once (no phone, email or birthday in it)

  /* ---------- storage that never throws (private mode, blocked storage): falls back to memory ---------- */
  var memory = {};
  var LS = (function () { try { var k = "__jnv"; localStorage.setItem(k, k); localStorage.removeItem(k); return localStorage; } catch (e) { return null; } })();
  function sGet(k) {
    if (LS) { try { return LS.getItem(k); } catch (e) {} }
    return memory.hasOwnProperty(k) ? memory[k] : null;
  }
  function sSet(k, v) {
    if (LS) { try { LS.setItem(k, v); delete memory[k]; return; } catch (e) {} }
    memory[k] = v;
  }
  function sDel(k) {
    delete memory[k];
    if (LS) { try { LS.removeItem(k); } catch (e) {} }
  }
  function sJson(k) { try { return JSON.parse(sGet(k) || "null"); } catch (e) { return null; } }

  /* ---------- tiny helpers ---------- */
  function decode(t) {
    try { return JSON.parse(decodeURIComponent(escape(atob(String(t).split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))))); } catch (e) { return null; }
  }
  function nameKey(n) { return String(n || "").replace(/ /g, "_"); }
  function fp(t) { return t ? String(t).slice(-12) : ""; } // ties the saved "who am I" to one sign-in
  function h(tag, attrs) {
    var el = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      var v = attrs[k];
      if (k === "class") el.className = v;
      else if (k === "text") el.textContent = v; // server text always goes in as text, never as HTML
      else if (k.slice(0, 2) === "on") el.addEventListener(k.slice(2), v);
      else if (v !== false && v != null) el.setAttribute(k, v === true ? "" : v);
    }
    (function add(list) {
      for (var i = 0; i < list.length; i++) {
        var c = list[i];
        if (c == null || c === false) continue;
        if (Array.isArray(c)) add(c);
        else el.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
      }
    })(Array.prototype.slice.call(arguments, 2));
    return el;
  }
  function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); }
  function later(fn) { setTimeout(fn, 0); }

  /* ---------- the current sign-in ---------- */
  var st = { token: null, session: false, sUser: null, me: null, checked: false, readyCbs: [], changeCbs: [], gallery: null };

  // read the saved sign-in: the 30 day session first, then an older Google sign-in that is still valid
  function readSaved() {
    var ss = sJson(SESSION_KEY);
    if (ss && ss.t) return { token: ss.t, session: true, user: ss.user || {} };
    var g = sGet(TOKEN_KEY), c = g && decode(g);
    if (c && c.exp * 1000 > Date.now() + 60000) return { token: g, session: false, user: { email: c.email, name: c.name, picture: c.picture, sub: c.sub } };
    return null;
  }
  function adopt(saved) {
    st.token = saved ? saved.token : null;
    st.session = !!(saved && saved.session);
    st.sUser = saved ? saved.user : null;
  }

  // keep only what the pages need; the full answer stays in memory
  function slim(m) {
    if (!m) return null;
    var mem = m.member, d = mem ? merged(mem) : {};
    return {
      user: m.user ? { email: m.user.email || "", name: m.user.name || "", picture: m.user.picture || "" } : null,
      role: m.role || null, isAdmin: !!m.isAdmin, isCore: !!m.isCore,
      member: mem ? { id: mem.id, name: mem.name, batch: mem.batch, status: mem.status, photo: mem.photo || null, data: { Name: d.Name || mem.name, gpic: d.gpic || "" } } : null,
      have: mem ? haveList(d) : null // which of the 12 profile items are filled (true / false only)
    };
  }
  function merged(mem) { // saved details with a pending change on top, like the login page shows them
    var d = {}, k;
    for (k in (mem.data || {})) d[k] = mem.data[k];
    for (k in (mem.draft || {})) d[k] = mem.draft[k];
    return d;
  }
  function saveMe(m) {
    st.me = m;
    window.JNV_ME = m;
    sSet(ME_KEY, JSON.stringify({ k: fp(st.token), me: slim(m), g: st.gallery }));
  }

  // at load: set JNV_ME right now (before portfolioz_core.js runs) from the saved copy of this sign-in
  adopt(readSaved());
  window.JNV_SIGNED = !!st.token;
  (function () {
    var snap = sJson(ME_KEY);
    if (st.token && snap && snap.k === fp(st.token) && snap.me) {
      st.me = snap.me; st.gallery = typeof snap.g === "number" ? snap.g : null;
      if (!window.JNV_ME) window.JNV_ME = snap.me; // shape: { member: { name, batch, data: { Name } }, role, isAdmin, isCore, user }
    } else if (!st.token) sDel(ME_KEY);
  })();

  /* ---------- talking to the API ---------- */
  // opts: method, json, blob, asBlob, auth (default true when signed in)
  function api(path, opts) {
    opts = opts || {};
    var headers = {}, body;
    var useAuth = opts.auth !== false && st.token;
    if (useAuth) headers.Authorization = "Bearer " + st.token;
    if (opts.json !== undefined) { headers["Content-Type"] = "application/json"; body = JSON.stringify(opts.json); }
    if (opts.blob) { headers["Content-Type"] = opts.blob.type; body = opts.blob; }
    var sent = st.token;
    return fetch(CFG.api + path, { method: opts.method || "GET", headers: headers, body: body }).then(function (r) {
      if (opts.asBlob && r.ok) return r.blob();
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (r.status === 401 && useAuth) {
          // One refused request is not proof that the sign-in ended (this is what signed people out on the Meet form).
          // Ask /api/me: only if that also says 401 is the sign-in really over.
          return (path === "/api/me" ? Promise.resolve(false) : check()).then(function (alive) {
            if (!alive && st.token === sent) endLocal("expired");
            var e = new Error(alive ? (j.error || "Please sign in again") : "expired");
            e.status = 401; throw e;
          });
        }
        if (!r.ok) { var e = new Error(j.error || "Something went wrong (" + r.status + ")"); e.status = r.status; throw e; }
        return j;
      });
    }, function () { var e = new Error("Could not reach the server. Check your internet connection and try again."); e.network = true; throw e; });
  }

  // is the saved sign-in still good? resolves true / false (a network problem counts as "still good")
  function check() {
    if (!st.token) return Promise.resolve(false);
    var sent = st.token;
    return fetch(CFG.api + "/api/me", { headers: { Authorization: "Bearer " + sent } }).then(function (r) {
      if (r.status === 401) return false;
      if (!r.ok) return true;
      return r.json().then(function (j) { if (st.token === sent) saveMe(j); return true; }, function () { return true; });
    }, function () { return true; });
  }

  // fetch "who am I" again; ends the sign-in only when the server says it is over
  function refresh() {
    var sent = st.token;
    if (!sent) return Promise.resolve(null);
    return fetch(CFG.api + "/api/me", { headers: { Authorization: "Bearer " + sent } }).then(function (r) {
      if (st.token !== sent) return st.me;
      if (r.status === 401) { endLocal("expired"); return null; }
      if (!r.ok) return st.me;
      return r.json().then(function (j) { if (st.token === sent) { saveMe(j); paintHeader(); } return j; });
    }).catch(function () { return st.me; }); // offline: stay signed in with the saved copy
  }

  // someone who signed in before the 30 day sign-in existed: quietly swap the hour-long token for a session
  function upgrade() {
    if (!st.token || st.session) return;
    var g = st.token;
    fetch(CFG.api + "/api/session", { method: "POST", headers: { Authorization: "Bearer " + g } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) { if (j && j.session && st.token === g) storeSession(j); })
      .catch(function () {});
  }
  function storeSession(r) {
    sSet(SESSION_KEY, JSON.stringify({ t: r.session, user: r.user })); // the same format as before
    sDel(TOKEN_KEY);
    adopt({ token: r.session, session: true, user: r.user });
    window.JNV_SIGNED = true;
  }

  /* ---------- change listeners ---------- */
  function userObj() {
    if (!st.token) return null;
    var m = st.me || {}, u = m.user || st.sUser || {};
    return { email: u.email || "", name: u.name || "", picture: u.picture || "", role: m.role || null, isAdmin: !!m.isAdmin, isCore: !!m.isCore, member: m.member || null };
  }
  function fire(reason) {
    var u = userObj();
    st.changeCbs.slice().forEach(function (cb) { try { cb(u, reason); } catch (e) { if (window.console) console.error(e); } });
    paintHeader();
    // batch pages draw "Signed in / Edit my profile" once; after a change in another tab, draw them again
    if (reason === "other-tab" && document.body && document.body.classList.contains("batch-page")) location.reload();
  }
  function markReady() {
    if (st.checked) return;
    st.checked = true;
    var cbs = st.readyCbs; st.readyCbs = [];
    cbs.forEach(function (cb) { try { cb(userObj()); } catch (e) { if (window.console) console.error(e); } });
  }
  // forget the sign-in on this device (other tabs hear about it through the storage event)
  function endLocal(reason) {
    var had = !!st.token;
    sDel(SESSION_KEY); sDel(TOKEN_KEY); sDel(ME_KEY);
    adopt(null); st.me = null; st.gallery = null;
    window.JNV_ME = null; window.JNV_SIGNED = false;
    if (window.google && google.accounts && google.accounts.id) { try { google.accounts.id.disableAutoSelect(); } catch (e) {} }
    closeModal();
    if (had) fire(reason || "signout");
  }

  function signOut() {
    var t = st.token, wasSession = st.session;
    endLocal("signout");
    if (t && wasSession) { // end it on the server too
      return fetch(CFG.api + "/api/session", { method: "DELETE", headers: { Authorization: "Bearer " + t } }).then(function () {}, function () {});
    }
    return Promise.resolve();
  }

  // sign in after Google: through a picked profile ({id} or {batch, name}) or as a new registration
  function signInWith(body, credential) {
    if (!decode(credential)) return Promise.reject(new Error("Google sign-in failed. Please try again."));
    return fetch(CFG.api + "/api/signin", { method: "POST", headers: { Authorization: "Bearer " + credential, "Content-Type": "application/json" }, body: JSON.stringify(body) })
      .then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (j) {
          if (!r.ok || !j.session) throw new Error(j.error || "Could not sign in (" + r.status + ")");
          var before = st.token;
          storeSession(j);
          st.gallery = null;
          if (j.me) saveMe(j.me);
          if (before !== st.token) fire("signin");
          markReady();
          return j;
        });
      }, function () { throw new Error("Could not reach the server. Check your internet connection and try again."); });
  }
  function signInWithProfile(pick, credential) {
    var body = typeof pick === "string" ? { member_id: pick } : pick && pick.id ? { member_id: pick.id } : { profile: { batch: pick && pick.batch, name: pick && pick.name } };
    return signInWith(body, credential);
  }
  function register(credential) { return signInWith({ register: true }, credential); }

  // sign-in or sign-out in another tab
  window.addEventListener("storage", function (e) {
    if (e.key !== SESSION_KEY && e.key !== TOKEN_KEY && e.key !== ME_KEY && e.key !== null) return;
    if (e.key === ME_KEY) { // the other tab refreshed "who am I": just repaint
      var snap = sJson(ME_KEY);
      if (snap && snap.k === fp(st.token) && snap.me && !st.me) { st.me = snap.me; paintHeader(); }
      return;
    }
    var saved = readSaved(), before = st.token;
    if ((saved ? saved.token : null) === before) return;
    adopt(saved);
    st.me = null; st.gallery = null; window.JNV_ME = null; window.JNV_SIGNED = !!st.token;
    closeModal();
    if (!st.token) { fire("other-tab"); return; }
    refresh().then(function () { fire("other-tab"); });
  });

  /* ---------- Google Identity Services (already used by the site) ---------- */
  function whenGoogle(cb, fail, n) {
    if (window.google && google.accounts && google.accounts.id) return cb();
    if (!n && !document.querySelector('script[src*="accounts.google.com/gsi/client"]')) {
      var s = document.createElement("script"); s.src = "https://accounts.google.com/gsi/client"; s.async = true; document.head.appendChild(s);
    }
    if ((n || 0) > 150) { if (fail) fail(); return; }
    setTimeout(function () { whenGoogle(cb, fail, (n || 0) + 1); }, 100);
  }
  // draws the Google button in box; onCred(credential) gets the Google ID token (it is checked on the server)
  function googleButton(box, onCred, onFail, hint) {
    whenGoogle(function () {
      google.accounts.id.initialize({ client_id: CFG.client, callback: function (r) { if (r && r.credential) onCred(r.credential); }, auto_select: false, cancel_on_tap_outside: false, login_hint: hint || undefined }); // hint: open Google on the linked account
      clear(box);
      google.accounts.id.renderButton(box, { theme: "filled_blue", size: "large", shape: "pill", text: "continue_with" });
    }, onFail);
  }

  /* ---------- profile search, then Google to prove it is you (login page and Alumni Meet) ---------- */
  var SEARCH_ICON = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false"><path fill="currentColor" d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>';
  var MAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  var last = { q: "", results: null }; // so Back shows the same list again

  function avatarEl(photo, name, size) {
    var letter = String(name || "?").trim().charAt(0).toUpperCase() || "?";
    var ini = h("span", { class: "jnv-ps-ini", "aria-hidden": "true", text: letter, style: "width:" + size + "px;height:" + size + "px" });
    if (!photo) return ini;
    var img = h("img", { class: "jnv-ps-img", src: photo, alt: "", width: String(size), height: String(size), loading: "lazy", referrerpolicy: "no-referrer" });
    img.addEventListener("error", function () { if (img.parentNode) img.parentNode.replaceChild(ini, img); });
    return img;
  }
  function subLine(p) { return ["Batch " + p.batch, p.house ? p.house + " House" : "", p.linked === false ? "Gmail not linked yet" : ""].filter(Boolean).join(" \u00b7 "); }

  // box: where to draw. o: { title, intro, note, onDone(result) after sign-in, onRegister() for "New Alumni Registration" }
  function picker(box, o) {
    o = o || {};
    var input = h("input", { class: "jnv-ps-q", type: "search", name: "q", placeholder: "Your name or full Gmail", "aria-label": "Your name or full Gmail",
      autocomplete: "off", autocapitalize: "words", spellcheck: "false", enterkeyhint: "search", maxlength: "80", value: last.q });
    var go = h("button", { class: "jnv-ps-go", type: "submit", "aria-label": "Search" });
    go.innerHTML = SEARCH_ICON; // fixed icon, no server text
    var msg = h("p", { class: "jnv-ps-msg", role: "status", "aria-live": "polite" });
    var list = h("div", { class: "jnv-ps-list" });
    var form = h("form", { class: "jnv-ps-form", role: "search", novalidate: true, onsubmit: function (e) { e.preventDefault(); run(); } }, input, go);
    // "Not finding your name?": choose your batch to see its names (a short list, no photos)
    var sel = h("select", { class: "jnv-ps-q jnv-ps-sel", "aria-label": "Choose your batch", onchange: function () { if (sel.value) runBatch(sel.value); else { batchList = null; clear(list); say(""); } } }, h("option", { value: "", text: "Or choose your batch" }));
    api("/api/meet/batches", { auth: false }).then(function (r) {
      (r.batches || []).forEach(function (b) { sel.appendChild(h("option", { value: String(b.batch), text: "Batch " + b.batch })); });
    }, function () {});
    // live mode (Alumni Meet): typing filters the chosen batch, or searches after 3 letters without pressing Enter
    var live = !!o.live, batchList = null, timer = null;
    function filterBatch(q) {
      q = String(q || "").toLowerCase();
      draw(!q ? batchList : batchList.filter(function (p) { return (p.name + " " + (p.email || "")).toLowerCase().indexOf(q) >= 0; }));
    }
    if (live) input.addEventListener("input", function () {
      clearTimeout(timer);
      var q = String(input.value || "").replace(/\s+/g, " ").trim();
      if (batchList) return filterBatch(q);
      if (q.length < 3 || q.indexOf("@") >= 0) return; // a Gmail is searched with Enter
      timer = setTimeout(run, 500);
    });
    var reg = o.onRegister ? h("button", { class: "jnv-ps-btn jnv-ps-regbtn", type: "button", text: "New Alumni Registration", onclick: function () { o.onRegister(); } }) : null;
    var wrap = h("div", { class: "jnv-ps" },
      o.title ? h("h2", { class: "jnv-ps-title", text: o.title }) : null,
      h("p", { class: "jnv-ps-muted", text: o.intro || "Type your name or your full Gmail, then press Search. Pick your profile and confirm with Google." }),
      o.note ? h("p", { class: "jnv-ps-note", text: o.note }) : null,
      form, h("div", { class: "jnv-ps-batch" }, sel), msg, list,
      reg ? h("div", { class: "jnv-ps-or" }, h("span", { text: "New here?" }), reg) : null);
    clear(box); box.appendChild(wrap);

    function say(t, bad) { msg.textContent = t || ""; msg.className = "jnv-ps-msg" + (bad ? " jnv-ps-bad" : ""); }
    function busy(on) { go.disabled = on; input.readOnly = on; go.setAttribute("aria-busy", on ? "true" : "false"); }
    function notFound() {
      clear(list);
      say("");
      list.appendChild(h("div", { class: "jnv-ps-none" },
        h("p", { text: "Search again with just your first name" }),
        h("button", { class: "jnv-ps-btn jnv-ps-reg", type: "button", text: "Name not found? Register", onclick: function () { if (o.onRegister) o.onRegister(); else location.href = CFG.login + "#register"; } })));
    }
    function draw(results) {
      clear(list); say("");
      if (!results.length) return notFound();
      results.forEach(function (p) {
        list.appendChild(h("button", { class: "jnv-ps-item", type: "button", onclick: function () { verify(box, p, o); } },
          avatarEl(p.photo, p.name, 40),
          h("span", { class: "jnv-ps-who" }, h("b", { text: p.name }), h("span", { text: subLine(p) }), live && p.email ? h("span", { text: p.email }) : null)));
      });
      if (live && o.onRegister) list.appendChild(h("button", { class: "jnv-ps-btn jnv-ps-reg", type: "button", text: "Name not found? Register yourself", onclick: function () { o.onRegister(); } }));
    }
    function run() {
      var q = String(input.value || "").replace(/\s+/g, " ").trim();
      if (batchList) return filterBatch(q);
      if (q.indexOf("@") >= 0) { if (!MAIL_RE.test(q)) return say("Type the full Gmail address, like name@gmail.com", true); }
      else if (q.replace(/[^A-Za-z\u00c0-\u024f\u0900-\u0dff]/g, "").length < 3) return say("Type at least 3 letters of your name", true);
      busy(true); say("Searching..."); clear(list);
      api("/api/search?q=" + encodeURIComponent(q) + (live ? "&lite=1" : ""), { auth: false }).then(function (r) {
        busy(false); last.q = q; last.results = r.results || [];
        draw(last.results);
        if (r.more) say(live ? "Showing the first 60. Type more of the name or pick a batch." : "Showing the first 10. Add your surname to narrow it down.");
      }, function (e) { busy(false); say(e.message, true); });
    }
    function runBatch(b) {
      busy(true); say("Loading..."); clear(list);
      api("/api/search?batch=" + encodeURIComponent(b), { auth: false }).then(function (r) {
        busy(false); last.q = ""; last.results = r.results || [];
        if (live) { batchList = last.results; filterBatch(input.value); return; }
        input.value = ""; draw(last.results);
      }, function (e) { busy(false); say(e.message, true); });
    }
    if (last.results && last.q === input.value) draw(last.results);
    return { focus: function () { try { input.focus(); } catch (e) {} } };
  }

  // after a profile is picked: show it and the Google button; the server checks that this Google account owns it
  function verify(box, p, o) {
    var gbtn = h("div", { class: "jnv-ps-gbtn" }), err = h("p", { class: "jnv-ps-msg jnv-ps-bad", role: "alert", hidden: true });
    var card = h("div", { class: "jnv-ps" },
      h("button", { class: "jnv-ps-back", type: "button", text: "\u2190 Back to search", onclick: function () { picker(box, o); } }),
      h("div", { class: "jnv-ps-pick" }, avatarEl(p.photo, p.name, 56), h("span", { class: "jnv-ps-who" }, h("b", { text: p.name }), h("span", { text: subLine(p) }))),
      p.linked
        ? (p.email ? h("p", { class: "jnv-ps-muted" }, "Is this you? Continue with ", h("b", { text: p.email }), ".")
          : h("p", { class: "jnv-ps-muted", text: "Is this you? Continue with the Google account (Gmail) linked to this profile." }))
        : h("p", { class: "jnv-ps-note", text: p.auto ? "No Gmail is linked to this profile yet. Continue with your own Gmail: it will be linked to this profile." : "No Gmail is linked to this profile yet. Continue with your own Gmail and send your details: the admin will check them and link your Gmail to this profile." }),
      gbtn, err);
    clear(box); box.appendChild(card);
    if (card.scrollIntoView) card.scrollIntoView({ block: "nearest" });
    function draw() {
      googleButton(gbtn, function (cred) {
        err.hidden = true; clear(gbtn); gbtn.appendChild(h("p", { class: "jnv-ps-muted", text: "Checking..." }));
        signInWithProfile(p, cred).then(function (res) {
          if (o.onDone) o.onDone({ me: res.me, linked: res.linked !== false, pick: p });
        }, function (e) { err.textContent = e.message; err.hidden = false; draw(); });
      }, function () { err.textContent = "Google sign-in could not load. Check your connection and reload the page."; err.hidden = false; }, p.linked ? (p.email || p.hint) : "");
    }
    draw();
  }

  // "New Alumni Registration": Google first, then the page shows its own form. o: { title, intro, onDone(result), onBack() }
  function registerView(box, o) {
    o = o || {};
    var gbtn = h("div", { class: "jnv-ps-gbtn" }), err = h("p", { class: "jnv-ps-msg jnv-ps-bad", role: "alert", hidden: true });
    clear(box);
    box.appendChild(h("div", { class: "jnv-ps" },
      o.onBack ? h("button", { class: "jnv-ps-back", type: "button", text: "\u2190 Back to search", onclick: function () { o.onBack(); } }) : null,
      h("h2", { class: "jnv-ps-title", text: o.title || "New Alumni Registration" }),
      h("p", { class: "jnv-ps-muted", text: o.intro || "Continue with your Gmail, then fill in your details. New profiles show on the site after the admin approves them." }),
      gbtn, err));
    function draw() {
      googleButton(gbtn, function (cred) {
        err.hidden = true; clear(gbtn); gbtn.appendChild(h("p", { class: "jnv-ps-muted", text: "Checking..." }));
        register(cred).then(function (res) { if (o.onDone) o.onDone({ me: res.me, linked: true, pick: null }); },
          function (e) { err.textContent = e.message; err.hidden = false; draw(); });
      }, function () { err.textContent = "Google sign-in could not load. Check your connection and reload the page."; err.hidden = false; });
    }
    draw();
  }

  /* ---------- profile completeness: 12 items, the same list as the profile card ---------- */
  var ITEMS = [["About you", "Bio"], ["City", "City"], ["Birthday", "DOB"], ["Blood group", "BloodGroup"], ["Current status", "CurrentStatus"],
    ["Work", "WorkList"], ["Education", "EduList"], ["Skills", "Skills"], ["Languages", "Languages"], ["Memories", "Memories"], ["Social links", "*social"], ["Photos", "*photos"]];
  function haveList(d) {
    return ITEMS.map(function (it) {
      if (it[1] === "*social") return ["fb", "insta", "linkedin", "twitter", "youtube"].some(function (k) { return !!d[k]; });
      if (it[1] === "*photos") return null; // filled in from the gallery count
      return !!d[it[1]];
    });
  }
  function completeness() {
    var m = st.me && st.me.member;
    if (!m) return null;
    var have = st.me.have || haveList(merged(m)); // the saved copy keeps only true/false; the full answer has the details
    var missing = [];
    ITEMS.forEach(function (it, i) {
      var ok = it[1] === "*photos" ? (st.gallery || 0) > 0 : !!have[i];
      if (!ok) missing.push(it[0]);
    });
    return { pct: Math.round((ITEMS.length - missing.length) / ITEMS.length * 100), missing: missing };
  }

  /* ---------- header: photo and first name, or "Sign in" ---------- */
  var slot = null;
  function firstName() {
    var m = st.me && st.me.member, u = userObj() || {};
    var n = (m && ((m.data && m.data.Name) || m.name)) || u.name || u.email || "";
    return String(n).split(/[\s@]/)[0] || "Me";
  }
  function photoUrl() {
    var m = st.me && st.me.member, u = userObj() || {};
    if (m && m.photo && /^live\//.test(m.photo)) return CFG.api + "/api/photo/" + m.photo;
    return (m && m.data && m.data.gpic) || u.picture || "";
  }
  function findSlot() {
    if (slot && document.body.contains(slot)) return slot;
    slot = document.getElementById("jnv-auth-slot");
    if (!slot) { // no placeholder in the theme: add one at the start of the header buttons
      var acts = document.querySelector(".jnv-actions");
      if (acts) { slot = h("span", { id: "jnv-auth-slot" }); acts.insertBefore(slot, acts.firstChild); }
    }
    return slot;
  }
  function paintHeader() {
    if (!document.body) return;
    var s = findSlot();
    if (!s) return;
    clear(s);
    if (!st.token) {
      s.appendChild(h("a", { class: "jnv-au-in", href: CFG.login, text: "Sign in" }));
      return;
    }
    var name = firstName();
    s.appendChild(h("button", { class: "jnv-au-chip", type: "button", "aria-haspopup": "dialog", "aria-label": "Your account: " + name, onclick: openModal },
      avatarEl(photoUrl(), name, 30), h("span", { class: "jnv-au-name", text: name })));
  }

  /* ---------- the account window ---------- */
  var modal = null;
  function openModal() {
    if (modal) return;
    var u = userObj();
    if (!u) return;
    var m = u.member, prevFocus = document.activeElement, scrollY = window.pageYOffset || 0;
    var closeBtn = h("button", { class: "jnv-au-x", type: "button", "aria-label": "Close", text: "\u00d7", onclick: function () { closeModal(); } });
    var name = (m && ((m.data && m.data.Name) || m.name)) || u.name || u.email;
    var meter = h("div", { class: "jnv-au-meter" });
    var body = h("div", { class: "jnv-au-body" },
      h("div", { class: "jnv-au-ph" }, avatarEl(photoUrl(), name, 88)),
      h("h2", { class: "jnv-au-title", id: "jnv-au-t", text: name }),
      h("p", { class: "jnv-au-sub", text: m ? "Batch " + m.batch : (u.email || "") }),
      m && m.status === "approved"
        ? h("a", { class: "jnv-au-btn jnv-au-primary", href: "/" + m.batch + "#" + nameKey((m.data && m.data.Name) || m.name), text: "Visit Profile" }) // same link as Share and "Go to my profile"
        : h("p", { class: "jnv-au-note", text: m ? "Your profile is waiting for admin approval." : "No profile yet." }),
      meter,
      u.isAdmin ? h("a", { class: "jnv-au-btn", href: CFG.admin, text: "Open Admin Panel" }) : null, // the server still checks the role on every admin action
      h("button", { class: "jnv-au-btn jnv-au-out", type: "button", text: "Sign Out", onclick: function () { signOut(); } }));
    var dlg = h("div", { class: "jnv-au-dlg", role: "dialog", "aria-modal": "true", "aria-labelledby": "jnv-au-t" }, closeBtn, body);
    var overlay = h("div", { class: "jnv-au-ov" }, dlg);
    overlay.addEventListener("click", function (e) { if (e.target === overlay) closeModal(); });

    function drawMeter() {
      clear(meter);
      var c = completeness();
      if (!c) { meter.appendChild(h("a", { class: "jnv-au-btn", href: CFG.login + "#edit", text: "Create my profile" })); return; }
      if (c.pct >= 100) return; // complete: no meter
      meter.appendChild(h("p", { class: "jnv-au-mt" }, h("b", { text: "Your profile" }), h("span", { text: c.pct + "% complete" })));
      meter.appendChild(h("div", { class: "jnv-au-bar", role: "progressbar", "aria-valuemin": "0", "aria-valuemax": "100", "aria-valuenow": String(c.pct), "aria-label": "Profile complete" },
        h("i", { style: "width:" + c.pct + "%" })));
      meter.appendChild(h("p", { class: "jnv-au-miss", text: "Add: " + c.missing.slice(0, 3).join(", ") + (c.missing.length > 3 ? " and more" : "") }));
      meter.appendChild(h("a", { class: "jnv-au-btn jnv-au-primary", href: CFG.login + "#edit", text: "Complete my profile" }));
    }
    drawMeter();
    if (m && m.status === "approved") { // photos count lives in the gallery list; fetch it once per page
      api("/api/me/gallery").then(function (r) {
        st.gallery = (r.photos || []).length;
        if (st.me) sSet(ME_KEY, JSON.stringify({ k: fp(st.token), me: st.me.have ? st.me : slim(st.me), g: st.gallery }));
        if (modal) drawMeter();
      }, function () {});
    }

    function onKey(e) {
      if (e.key === "Escape" || e.key === "Esc") { e.preventDefault(); closeModal(); }
      else if (e.key === "Tab") { // keep the focus inside the window
        var f = dlg.querySelectorAll("a[href],button:not([disabled])");
        if (!f.length) return;
        var a = f[0], z = f[f.length - 1];
        if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
        else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
      }
    }
    // lock the page behind (position:fixed also works on iPhone Safari)
    var bs = document.body.style, saved = { position: bs.position, top: bs.top, left: bs.left, right: bs.right, width: bs.width, overflow: bs.overflow };
    bs.position = "fixed"; bs.top = -scrollY + "px"; bs.left = "0"; bs.right = "0"; bs.width = "100%"; bs.overflow = "hidden";
    document.documentElement.classList.add("jnv-au-lock");
    document.addEventListener("keydown", onKey);
    document.body.appendChild(overlay);
    // one history entry, so the phone Back button closes only this window
    var pushed = false;
    try { history.pushState({ jnvAuthModal: 1 }, "", location.href); pushed = true; } catch (e) {}
    modal = {
      el: overlay, pushed: pushed,
      done: function () {
        document.removeEventListener("keydown", onKey);
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        for (var k in saved) bs[k] = saved[k];
        document.documentElement.classList.remove("jnv-au-lock");
        window.scrollTo(0, scrollY);
        if (prevFocus && prevFocus.focus) { try { prevFocus.focus(); } catch (e) {} }
      }
    };
    closeBtn.focus();
  }
  var skipPop = false;
  function closeModal(fromBack) {
    if (!modal) return;
    var md = modal; modal = null;
    md.done();
    if (md.pushed && !fromBack) { skipPop = true; try { history.back(); } catch (e) { skipPop = false; } }
  }
  // registered before the page scripts, so the page never sees a Back that only closed this window
  window.addEventListener("popstate", function (e) {
    if (skipPop) { skipPop = false; e.stopImmediatePropagation(); return; }
    if (modal) { e.stopImmediatePropagation(); closeModal(true); }
  });

  /* ---------- styles (theme tokens --jb-* with the same fallbacks as login.css) ---------- */
  var CSS = [
    "#jnv-auth-slot{display:inline-flex;align-items:center}",
    ".jnv-au-in{display:inline-flex;align-items:center;min-height:44px;padding:0 12px;color:#fff!important;font-size:14px;font-weight:600;text-decoration:none;white-space:nowrap}",
    ".jnv-au-in:hover{color:var(--jb-gold,#E6B84A)!important}",
    ".jnv-au-chip{display:inline-flex;align-items:center;gap:8px;min-height:44px;max-width:150px;padding:0 8px 0 2px;border:0;border-radius:999px;background:none;color:#fff;font:inherit;font-size:14px;font-weight:600;cursor:pointer;-webkit-tap-highlight-color:transparent}",
    ".jnv-au-chip:hover .jnv-au-name{color:var(--jb-gold,#E6B84A)}",
    ".jnv-au-chip:focus-visible,.jnv-au-in:focus-visible{outline:2px solid var(--jb-gold,#E6B84A);outline-offset:2px}",
    ".jnv-au-chip img,.jnv-au-chip .jnv-ps-ini{flex:none;border:1.5px solid var(--jb-gold,#E6B84A)}",
    ".jnv-au-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
    "@media(max-width:420px){.jnv-au-name{max-width:70px}}",
    ".jnv-ps-img{display:block;flex:none;border-radius:50%;object-fit:cover;background:var(--jb-surface2,#EAF1FB)}",
    ".jnv-ps-ini{display:inline-flex;flex:none;align-items:center;justify-content:center;border-radius:50%;background:var(--jb-surface2,#EAF1FB);color:var(--jb-accent,#1B6BB8);font-weight:700;font-size:16px;line-height:1}",
    /* account window */
    "html.jnv-au-lock{overflow:hidden}",
    ".jnv-au-ov{position:fixed;top:0;right:0;bottom:0;left:0;z-index:10000;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(5,10,20,.55);animation:jnvAuFade .15s ease-out}",
    ".jnv-au-dlg{position:relative;width:100%;max-width:360px;max-height:calc(100vh - 32px);overflow:auto;-webkit-overflow-scrolling:touch;padding:22px 18px 18px;border:1px solid var(--jb-line,#D5E0EF);border-radius:18px;background:var(--jb-surface,#fff);color:var(--jb-text,#0E1B36);box-shadow:0 12px 40px rgba(0,0,0,.3);text-align:center;font-family:inherit}",
    ".jnv-au-dlg *{box-sizing:border-box}",
    ".jnv-au-x{position:absolute;top:6px;right:6px;width:44px;height:44px;border:0;border-radius:50%;background:none;color:var(--jb-muted,#56667F);font-size:26px;line-height:1;cursor:pointer}",
    ".jnv-au-x:hover{color:var(--jb-text,#0E1B36)}",
    ".jnv-au-ph{display:flex;justify-content:center;margin:0 0 10px}",
    ".jnv-au-ph img,.jnv-au-ph .jnv-ps-ini{border:2px solid var(--jb-gold,#E6B84A);font-size:30px}",
    ".jnv-au-title{margin:0 0 2px;font-size:20px;line-height:1.25;color:var(--jb-text,#0E1B36);overflow-wrap:anywhere}",
    ".jnv-au-sub{margin:0 0 14px;font-size:14px;color:var(--jb-muted,#56667F)}",
    ".jnv-au-note{margin:0 0 12px;font-size:14px;color:var(--jb-muted,#56667F)}",
    ".jnv-au-btn{display:flex;align-items:center;justify-content:center;width:100%;min-height:44px;margin:0 0 10px;padding:9px 16px;border:1px solid var(--jb-line,#D5E0EF);border-radius:12px;background:var(--jb-surface,#fff);color:var(--jb-accent,#1B6BB8)!important;font:inherit;font-size:15px;font-weight:600;text-decoration:none;cursor:pointer;-webkit-appearance:none;appearance:none}",
    ".jnv-au-btn:hover{border-color:var(--jb-accent,#1B6BB8)}",
    ".jnv-au-primary{border-color:var(--jb-accent,#1B6BB8);background:var(--jb-accent,#1B6BB8);color:#fff!important}",
    ".jnv-au-out{color:#d64545!important}",
    ".jnv-au-btn:focus-visible,.jnv-au-x:focus-visible{outline:2px solid var(--jb-accent,#1B6BB8);outline-offset:2px}",
    ".jnv-au-meter{margin:4px 0 6px;padding:12px;border:1px solid var(--jb-line,#D5E0EF);border-radius:14px;background:var(--jb-surface2,#EAF1FB);text-align:left}",
    ".jnv-au-meter:empty{display:none}",
    ".jnv-au-mt{display:flex;justify-content:space-between;margin:0 0 6px;font-size:14px;color:var(--jb-text,#0E1B36)}",
    ".jnv-au-bar{height:8px;margin:0 0 8px;border-radius:999px;background:var(--jb-line,#D5E0EF);overflow:hidden}",
    ".jnv-au-bar i{display:block;height:100%;border-radius:999px;background:var(--jb-gold,#E6B84A)}",
    ".jnv-au-miss{margin:0 0 10px;font-size:13px;color:var(--jb-muted,#56667F)}",
    ".jnv-au-meter .jnv-au-btn{margin:0}",
    "@keyframes jnvAuFade{from{opacity:0}to{opacity:1}}",
    /* profile search */
    ".jnv-ps{text-align:left;color:var(--jb-text,#0E1B36)}",
    ".jnv-ps *{box-sizing:border-box}",
    ".jnv-ps-title{margin:0 0 6px;font-size:20px;line-height:1.25;color:var(--jb-text,#0E1B36)}",
    ".jnv-ps-muted{margin:0 0 12px;font-size:14px;line-height:1.5;color:var(--jb-muted,#56667F)}",
    ".jnv-ps-note{margin:0 0 12px;padding:10px 12px;border-left:4px solid var(--jb-gold,#E6B84A);border-radius:10px;background:var(--jb-surface2,#EAF1FB);font-size:14px;line-height:1.45;color:var(--jb-text,#0E1B36)}",
    ".jnv-ps-form{display:flex;gap:8px;margin:0 0 8px}",
    ".jnv-ps-q{flex:1;min-width:0;min-height:46px;margin:0;padding:0 14px;border:1px solid var(--jb-line,#D5E0EF);border-radius:12px;background:var(--jb-surface,#fff);color:var(--jb-text,#0E1B36);font:inherit;font-size:16px;-webkit-appearance:none;appearance:none}",
    ".jnv-ps-batch{margin:0 0 8px}",
    ".jnv-ps-sel{width:100%}",
    ".jnv-ps-q:focus{outline:2px solid var(--jb-accent,#1B6BB8);outline-offset:-2px}",
    ".jnv-ps-go{flex:none;display:inline-flex;align-items:center;justify-content:center;width:48px;min-height:46px;border:0;border-radius:12px;background:var(--jb-accent,#1B6BB8);color:#fff;cursor:pointer}",
    ".jnv-ps-go:disabled{opacity:.55;cursor:wait}",
    ".jnv-ps-go:focus-visible{outline:2px solid var(--jb-accent,#1B6BB8);outline-offset:2px}",
    ".jnv-ps-msg{min-height:0;margin:0 0 8px;font-size:14px;color:var(--jb-muted,#56667F)}",
    ".jnv-ps-msg:empty{display:none}",
    ".jnv-ps-bad{color:#d64545}",
    ".jnv-ps-list{display:flex;flex-direction:column;gap:8px;margin:0 0 12px}",
    ".jnv-ps-item,.jnv-ps-pick{display:flex;align-items:center;gap:12px;width:100%;min-height:56px;padding:8px 12px;border:1px solid var(--jb-line,#D5E0EF);border-radius:12px;background:var(--jb-surface2,#EAF1FB);color:var(--jb-text,#0E1B36);font:inherit;text-align:left}",
    ".jnv-ps-item{cursor:pointer}",
    ".jnv-ps-item:hover,.jnv-ps-item:focus-visible{border-color:var(--jb-accent,#1B6BB8);outline:0}",
    ".jnv-ps-pick{margin:0 0 12px;background:var(--jb-surface,#fff)}",
    ".jnv-ps-who{display:flex;flex-direction:column;gap:2px;min-width:0}",
    ".jnv-ps-who b{font-size:15px;overflow-wrap:anywhere}",
    ".jnv-ps-who span{font-size:13px;color:var(--jb-muted,#56667F)}",
    ".jnv-ps-none{padding:12px;border:1px dashed var(--jb-line,#D5E0EF);border-radius:12px;text-align:center}",
    ".jnv-ps-none p{margin:0 0 10px;font-size:15px;font-weight:600;color:var(--jb-text,#0E1B36)}",
    ".jnv-ps-btn{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:9px 18px;border:1px solid var(--jb-accent,#1B6BB8);border-radius:12px;background:var(--jb-surface,#fff);color:var(--jb-accent,#1B6BB8);font:inherit;font-size:15px;font-weight:600;cursor:pointer}",
    ".jnv-ps-reg{border-color:#d64545;background:#d64545;color:#fff}",
    ".jnv-ps-or{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px;margin:14px 0 0;padding:12px 0 0;border-top:1px solid var(--jb-line,#D5E0EF);font-size:14px;color:var(--jb-muted,#56667F)}",
    ".jnv-ps-back{display:inline-flex;align-items:center;min-height:44px;margin:0 0 6px;padding:0 2px;border:0;background:none;color:var(--jb-accent,#1B6BB8);font:inherit;font-weight:600;cursor:pointer}",
    ".jnv-ps-gbtn{display:flex;justify-content:center;min-height:44px;margin:8px 0}",
    "@media (prefers-reduced-motion: reduce){.jnv-au-ov{animation:none}.jnv-au-chip,.jnv-ps-item,.jnv-au-btn{transition:none}}"
  ].join("\n");
  function addStyle() {
    if (document.getElementById("jnv-auth-css")) return;
    var s = document.createElement("style"); s.id = "jnv-auth-css"; s.textContent = CSS;
    (document.head || document.documentElement).appendChild(s);
  }

  /* ---------- public interface ---------- */
  window.JNVAuth = {
    config: CFG,
    // cb(user or null) once the saved sign-in has been checked with the server (or at once when signed out)
    ready: function (cb) { if (st.checked) later(function () { cb(userObj()); }); else st.readyCbs.push(cb); },
    // { email, name, picture, role, isAdmin, isCore, member } or null
    user: userObj,
    // the bearer token for the API, or null
    token: function () { return st.token; },
    // the whole "who am I" answer (same shape as GET /api/me) when it is known
    me: function () { return st.me; },
    signOut: signOut,
    // cb(user or null, reason) on sign-in, sign-out, expiry, or a change in another tab; returns a function that stops it
    onChange: function (cb) { st.changeCbs.push(cb); return function () { st.changeCbs = st.changeCbs.filter(function (x) { return x !== cb; }); }; },
    api: api,
    refresh: refresh,
    signInWithProfile: signInWithProfile,
    register: register,
    googleButton: googleButton,
    picker: picker,
    registerView: registerView,
    completeness: completeness,
    nameKey: nameKey
  };

  /* ---------- start ---------- */
  addStyle();
  function start() {
    paintHeader();
    if (!st.token) { markReady(); return; }
    refresh().then(function () { markReady(); if (st.token) upgrade(); });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();