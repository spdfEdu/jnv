/* JNV MSD alumni: find your profile, confirm with Google, see your details, switch on Edit to change them.
   Needs <div id="jnv-login"> on the page and signin.js in the theme (it holds the sign-in, the API address and the Google client).
   Links: #edit opens the form, #photos jumps to Photos, #edit=<id> lets an admin edit someone, #register starts a new registration. */
(function () {
  var root = document.getElementById("jnv-login");
  if (!root) return;
  var Auth = window.JNVAuth;
  var API = Auth ? Auth.config.api : (root.dataset.api || "").replace(/\/+$/, ""); // one API address for every page (see note.md, item 1)
  var IMAGES = root.dataset.images || "https://spdfedu.github.io/jnv/images/";

  var HOUSES = ["Aravali", "Nilgiri", "Shivalik", "Udaigiri"];
  var BLOOD = ["A +ve", "A -ve", "B +ve", "B -ve", "AB +ve", "AB -ve", "O +ve", "O -ve"];
  var STATUS = ["Studying", "Working", "Preparation", "Self employed", "Employee", "Looking for a job"];
  var thisYear = new Date().getFullYear();
  var YEARS = []; for (var yr = 2010; yr <= thisYear + 1; yr++) YEARS.push(String(yr));

  // placeholders always start with "eg." so nobody mistakes them for saved values
  var PH = {
    Name: "eg. Mobayea Biswas", City: "eg. Kolkata", Phone: "eg. 9876543210", Phone2: "eg. 9876543210", EmailId: "eg. name@gmail.com",
    Address: "eg. House no., street, village or town", PinCode: "eg. 742202", District: "eg. Murshidabad",
    fb: "eg. username or https://facebook.com/username", insta: "eg. username",
    linkedin: "eg. https://linkedin.com/in/username", twitter: "eg. username", youtube: "eg. https://youtube.com/@channel",
    Bio: "eg. A few lines about you, your work and your interests...", Skills: "eg. Teaching, Python, Photography", Languages: "eg. Bengali, English, Hindi",
    Achievements: "eg. Gold medal in Class XII\nState level badminton player", Memories: "eg. Evening prayers, midnight tiffin with friends, the day we won the inter-house cup..."
  };
  var ICON = {
    "Personal": "\ud83d\udc64", "Contact": "\ud83d\udcde", "Address": "\ud83d\udccd", "Current status": "\ud83c\udfaf", "Education history": "\ud83c\udf93",
    "Employment history": "\ud83d\udcbc", "Extracurricular: JNV visits": "\ud83c\udfc5", "Social": "\ud83d\udd17", "About you": "\u2728"
  };

  // [key, label, type, options, private, mode, max length]   mode: "lines" (one per line, saved with ~) or "more" (hidden behind Add more)
  var SECTIONS = [
    ["Personal", [
      ["Name", "Full name", "text"],
      ["Batch", "Class XII pass-out year", "select", YEARS],
      ["House", "House", "select", HOUSES],
      ["BloodGroup", "Blood group", "select", BLOOD],
      ["DOB", "Date of birth", "date", null, true],
      ["City", "Current city", "text"],
    ]],
    ["Contact", [
      ["Phone", "Phone", "tel", null, true],
      ["Phone2", "Alternate phone", "tel", null, true],
      ["EmailId", "Email", "email"],
    ]],
    ["Address", [
      ["Address", "Address", "text", null, true],
      ["PinCode", "Pin code", "text", null, true],
      ["District", "District", "text"],
    ]],
    ["Current status", [
      ["CurrentStatus", "Current status", "select", STATUS],
    ]],
    ["Social", [
      ["fb", "Facebook (username or link)", "text"],
      ["insta", "Instagram (username or link)", "text"],
      ["linkedin", "LinkedIn (link)", "text", null, false, "more"],
      ["twitter", "X (username)", "text", null, false, "more"],
      ["youtube", "YouTube (link)", "text", null, false, "more"],
    ]],
    ["About you", [
      ["Bio", "A few lines about you", "textarea"],
      ["Skills", "Skills (comma separated)", "text", null, false, null, 300],
      ["Languages", "Languages known (comma separated)", "text", null, false, null, 200],
      ["Achievements", "Achievements (one per line)", "textarea", null, false, "lines", 600],
      ["Memories", "Favourite memories of Navodaya", "textarea", null, false, null, 1200],
    ]],
  ];

  // Repeatable lists. Saved as one text value: rows joined by "~", columns by "|".
  // education: from|to|course|institute|city|highest   work: from|to|place|position|city   visits: year|activity|jnv
  // cols: [key, label, placeholder, kind, options, wide]
  var JNV = "JNV Murshidabad", JNV_CITY = "Berhampore", FIRST_YEAR = 1990;
  function span(top, low) { var o = []; for (var y = top; y >= low; y--) o.push(String(y)); return o; }
  var LISTS = [
    { key: "EduList", title: "Education history", add: "Add education", hq: true, jnv: true, cols: [
      ["From", "From", "", "year", span(thisYear, FIRST_YEAR)], ["To", "To", "", "year", span(thisYear + 8, FIRST_YEAR)],
      ["Course", "Course", "eg. MBBS, B.Tech in Electrical Engineering", "text", null, true],
      ["Institute", "Institute name", "eg. RG Kar Medical College", "text", null, true],
      ["City", "City", "eg. Kolkata", "text", null, true]] },
    { key: "WorkList", title: "Employment history", add: "Add employment", cols: [
      ["From", "From", "", "year", span(thisYear, FIRST_YEAR)], ["To", "To", "", "year", ["Present"].concat(span(thisYear, FIRST_YEAR))],
      ["Place", "Place of Work", "eg. Company name...", "area", null, true],
      ["Position", "Position", "eg. Software Engineer", "text", null, true],
      ["City", "City", "eg. Kolkata", "text", null, true]] },
    { key: "JnvVisits", title: "Extracurricular: JNV visits", add: "Add visit", cols: [
      ["Year", "Year", "", "year", span(thisYear, FIRST_YEAR)], ["Activity", "Activity", "eg. Badminton", "text"],
      ["JNV", "JNV (District)", "eg. JNV Nadia", "text", null, true]] }
  ];
  var AFTER = { "Current status": [0, 1, 2] }; // where each list sits: education, employment, then the JNV visits
  var MAX_ROWS = 10, uid = 0;
  var KEEP_OLD = ["Employment", "Occupation", "Company", "WorkCity", "Institute", "HQD"]; // no longer on the form; saved as they are

  function clean(t) { return String(t || "").replace(/[|~]/g, " ").replace(/\s+/g, " ").trim(); }
  function parseRows(t) { return t ? String(t).split("~").map(function (r) { return r.split("|"); }) : []; }
  // older saves had one "year" column: education year|course|institute|city, work year|company|position|city
  function normEdu(r) { return r.length >= 6 ? r : ["", r[0] || "", r[1] || "", r[2] || "", r[3] || "", ""]; }
  function normWork(r) { return r.length >= 5 ? r : ["", r[0] || "", r[1] || "", r[2] || "", r[3] || ""]; }
  function rowsOf(def, val) {
    var rows = parseRows(val);
    if (def.key === "EduList") rows = rows.map(normEdu);
    if (def.key === "WorkList") rows = rows.map(normWork);
    return rows;
  }
  function readList(box, def) {
    var rows = [], n = def.cols.length + (def.hq ? 1 : 0);
    [].forEach.call(box.querySelectorAll(".jl-item"), function (it) {
      var arr = []; for (var i = 0; i < n; i++) arr.push("");
      [].forEach.call(it.querySelectorAll("[data-i]"), function (el) { arr[Number(el.getAttribute("data-i"))] = clean(el.value); });
      if (it.getAttribute("data-fixed")) { arr[3] = JNV; arr[4] = JNV_CITY; if (!arr[0] && !arr[1]) return; }
      else if (!arr.slice(0, def.cols.length).some(Boolean)) return;
      var r = it.querySelector('input[type="radio"]');
      if (def.hq && r && r.checked) arr[n - 1] = "1";
      rows.push(arr.join("|"));
    });
    return rows.join("~");
  }
  function listBox(def, val, editing, batch) {
    var box = h("fieldset", { class: "jl-sec jl-list", "data-list": def.key }, h("legend", { text: def.title, "data-ico": ICON[def.title] || "" }));
    var wrap = h("div", { class: "jl-items" }), n = def.cols.length, hqName = "jl-hq-" + def.key;
    box.appendChild(wrap);
    function pickHq(e) { // only one card can be the highest qualification; tapping it again unmarks it
      var r = e.target, was = r.getAttribute("data-was") === "1";
      [].forEach.call(box.querySelectorAll('input[type="radio"]'), function (x) { x.setAttribute("data-was", "0"); });
      if (was) r.checked = false; else r.setAttribute("data-was", "1");
      markDirty();
    }
    function addRow(vals, fixed) {
      if (wrap.children.length >= MAX_ROWS) return;
      var it = h("div", { class: "jl-item" + (fixed ? " jl-fixed" : "") });
      if (fixed) {
        it.setAttribute("data-fixed", "1");
        it.appendChild(h("div", { class: "jl-fixedhead jl-wide" }, h("b", { text: JNV }), h("span", { text: JNV_CITY })));
      }
      def.cols.forEach(function (c, i) {
        if (fixed && i > 1) return;
        var id = "jl-l" + (++uid), v = vals[i] || "", inp;
        if (c[3] === "year") {
          inp = h("select", { id: id, disabled: !editing });
          inp.appendChild(h("option", { value: "", text: editing ? "Select" : "-" }));
          var list = c[4].slice(); if (v && list.indexOf(v) < 0) list.push(v);
          list.forEach(function (o) { inp.appendChild(h("option", { value: o, text: o })); });
        } else if (c[3] === "area") {
          inp = h("textarea", { id: id, rows: 2, maxlength: 120, disabled: !editing, placeholder: editing ? c[2] : "-" });
        } else {
          inp = h("input", { id: id, type: "text", maxlength: 120, disabled: !editing, placeholder: editing ? c[2] : "-", autocomplete: "off" });
        }
        inp.value = v; inp.setAttribute("data-i", i);
        it.appendChild(h("div", { class: "jl-field" + (c[5] ? " jl-wide" : "") }, h("label", { for: id, text: c[1] }), inp));
      });
      if (def.hq) {
        var on = vals[n] === "1";
        if (editing) {
          var radio = h("input", { type: "radio", name: hqName, checked: on, "data-was": on ? "1" : "0", onclick: pickHq });
          it.appendChild(h("label", { class: "jl-hq jl-wide" }, radio, h("span", { text: "Highest qualification" })));
        } else if (on) it.appendChild(h("span", { class: "jl-hqbadge jl-wide", text: "Highest qualification" }));
      }
      if (editing && !fixed) it.appendChild(h("button", { type: "button", class: "jl-btn jl-small jl-rm jl-wide", text: "Remove", onclick: function () { wrap.removeChild(it); markDirty(); } }));
      wrap.appendChild(it);
    }
    var rows = rowsOf(def, val), at = -1;
    if (def.jnv) { // JNV Murshidabad is always the first card and cannot be removed
      rows.forEach(function (r, i) { if (at < 0 && String(r[3]).toLowerCase() === JNV.toLowerCase()) at = i; });
      var fixedVals = at >= 0 ? rows[at] : (batch ? [String(Number(batch) - 7), String(batch), "", JNV, JNV_CITY, ""] : null);
      if (fixedVals && !fixedVals[0] && fixedVals[1]) fixedVals = fixedVals.slice(), fixedVals[0] = String(Number(fixedVals[1]) - 7); // older saves only had the end year
      if (fixedVals) addRow(fixedVals, true);
    }
    rows.forEach(function (r, i) { if (i !== at) addRow(r, false); });
    if (editing) {
      if (!wrap.children.length) addRow([], false);
      box.appendChild(h("button", { type: "button", class: "jl-btn jl-small jl-add", text: "+ " + def.add, onclick: function () { addRow([], false); markDirty(); } }));
    } else if (!wrap.children.length) box.appendChild(h("p", { class: "jl-muted", text: "Not added" }));
    return box;
  }

  var ADMIN_URL = root.dataset.admin || "/p/admin.html";
  var editMatch = /^#edit=([0-9a-f-]{36})$/i.exec(location.hash || "");
  var startHash = /^#(edit|photos|register)$/i.test(location.hash || "") ? location.hash.slice(1).toLowerCase() : ""; // used once, after sign-in
  var state = { editId: editMatch ? editMatch[1].toLowerCase() : null, target: null, notAdmin: false, dirty: false, pushed: false, skipPop: false, afterSave: null, flash: "", claim: null, registering: false, me: null, photoBlob: null, photoUrl: null, ownPhotoUrl: null, editing: false, busy: false };

  /* ---------- tiny helpers ---------- */
  function h(tag, attrs) {
    var el = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      if (k === "class") el.className = attrs[k];
      else if (k === "text") el.textContent = attrs[k];
      else if (k.slice(0, 2) === "on") el.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] !== false && attrs[k] != null) el.setAttribute(k, attrs[k] === true ? "" : attrs[k]);
    }
    for (var i = 2; i < arguments.length; i++) {
      var c = arguments[i];
      if (c == null || c === false) continue;
      el.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    }
    return el;
  }
  function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); }
  function show(node) { clear(root); root.appendChild(node); }
  function nameKey(n) { return String(n || "").replace(/ /g, "_"); }

  /* ---------- API (signin.js adds the sign-in and checks a refused request before signing out) ---------- */
  function api(path, opts) { return Auth.api(path, opts); }
  function fail(msg) { show(h("div", { class: "jl-card" }, h("p", { class: "jl-msg jl-bad", text: msg }))); }

  /* ---------- signed out: search your profile, then Google confirms it (no open Google button) ---------- */
  function renderSignedOut(note) {
    state.me = null; state.target = null; state.claim = null; state.registering = false;
    var box = h("div");
    show(h("div", { class: "jl-card" },
      h("h2", { text: "Alumni sign in" }),
      h("p", { class: "jl-muted", text: "Find your profile to see and update your alumni details. You do not need to sign in to browse the site." }),
      note ? h("p", { class: "jl-msg jl-warn", text: note }) : null,
      box));
    Auth.picker(box, {
      intro: "Type your name (or your full Gmail) and press Search. Pick your profile, then confirm with the Google account linked to it.",
      onDone: function (res) { state.claim = res.linked ? null : res.pick; load(); },
      onRegister: renderRegister
    });
  }
  // New Alumni Registration: Google first, then the same form as Edit details (new profiles wait for the admin)
  function renderRegister() {
    var box = h("div");
    show(h("div", { class: "jl-card" }, box));
    Auth.registerView(box, {
      onBack: function () { renderSignedOut(""); },
      onDone: function () { state.registering = true; load(); }
    });
  }

  function signOut() { Auth.signOut(); } // signin.js tells every tab; onChange below redraws this page

  /* ---------- load my entry ---------- */
  function load() {
    show(h("div", { class: "jl-card jl-center" }, h("p", { class: "jl-muted", text: "Loading your details..." })));
    return api("/api/me").then(function (me) {
      state.me = me; state.editing = false; state.dirty = false; state.photoBlob = null; state.gallery = null; state.target = null;
      if (state.ownPhotoUrl) { URL.revokeObjectURL(state.ownPhotoUrl); state.ownPhotoUrl = null; }
      if (state.editId && !me.isAdmin) { state.editId = null; state.notAdmin = true; }
      if (state.editId) { // an admin editing someone else: same form, their details, saved through the admin route
        return api("/api/admin/" + state.editId).then(function (r) {
          state.target = r.member; state.editing = true;
          state.me = { user: me.user, role: me.role, isAdmin: me.isAdmin, isCore: me.isCore, member: r.member };
        });
      }
      var m = me.member;
      if (m && m.draft_photo) {
        return api("/api/me/photo", { asBlob: true }).then(function (b) { state.ownPhotoUrl = URL.createObjectURL(b); }, function () {});
      }
    }).then(function () { dropPushed(); render(); afterLoad(); }).catch(function (e) { if (e.message !== "expired") fail(e.message); });
  }
  // one time actions after the first load: #edit, #photos, a new registration or a link request
  function afterLoad() {
    var m = state.me && state.me.member, hash = startHash;
    startHash = "";
    if (hash) { try { history.replaceState(history.state, "", location.pathname + location.search); } catch (e) {} }
    if (state.target) return;
    if ((state.registering || state.claim || hash === "edit") && !state.editing && (!m || hash === "edit")) { state.registering = false; return startEditing(); }
    if (hash === "photos") {
      var g = document.getElementById("jl-gallery");
      if (g && g.scrollIntoView) g.scrollIntoView({ block: "start" });
    }
  }

  /* ---------- screen ---------- */
  function values() {
    var m = state.me.member;
    var v = {};
    if (!m) { // a new profile: start from the picked profile (a link request) or the Google name
      var u = state.me.user || {}, c = state.claim || {};
      return { Name: c.name || u.name || "", Batch: c.batch ? String(c.batch) : "", House: c.house || "", EmailId: u.email || "" };
    }
    var d = {}, k; // a pending request (new entry, or a new name or batch) is shown on top of the saved details
    for (k in (m.data || {})) d[k] = m.data[k];
    for (k in (m.draft || {})) d[k] = m.draft[k];
    for (k in d) v[k] = d[k];
    v.Name = v.Name || m.name; v.Batch = v.Batch || m.batch;
    return v;
  }

  function statusBox(m) {
    if (!m) return null;
    var box = h("div", { class: "jl-status" });
    function line(cls, t) { box.appendChild(h("p", { class: "jl-msg " + cls, text: t })); }
    if (state.flash) { line("jl-ok", state.flash); state.flash = ""; }
    if (m.status === "approved") {
      if (m.draft) line("jl-warn", "Your name or batch change is waiting for admin approval.");
      else if (!box.firstChild) line("jl-ok", "Approved. Your details are on the alumni site.");
    } else if (m.status === "rejected") line("jl-bad", "Your last submission was not approved. Please check your details and save again.");
    else line("jl-warn", "Waiting for admin approval. Your details will appear on the site once approved.");
    return box;
  }

  function avatar(v, m) {
    var img = h("img", { class: "jl-photo", alt: "", width: "96", height: "96" });
    var fallback = function () { img.removeAttribute("src"); img.classList.add("jl-nophoto"); };
    if (state.photoUrl) img.src = state.photoUrl;
    else if (state.ownPhotoUrl) img.src = state.ownPhotoUrl;
    else if (m && m.photo) img.src = API + "/api/photo/" + m.photo;
    else if (m && v.Name && v.Batch) img.src = IMAGES + v.Batch + "/" + nameKey(v.Name) + ".jpg";
    else fallback();
    img.addEventListener("error", fallback);
    return img;
  }

  function render() {
    var me = state.me, m = me.member, v = values();
    var user = me.user || {};
    var editing = state.editing;
    var admin = !!state.target; // an admin editing another member
    var isNew = !m;
    var form = h("form", { class: "jl-form" + (editing ? " jl-editing" : ""), novalidate: true, onsubmit: onSave });

    SECTIONS.forEach(function (sec) {
      var box = h("fieldset", { class: "jl-sec" }, h("legend", { text: sec[0], "data-ico": ICON[sec[0]] || "" }));
      var extras = [];
      sec[1].forEach(function (f) {
        var key = f[0], type = f[2], opts = f[3], priv = f[4], ph = editing ? (PH[key] || "") : "Not added";
        var val = v[key] === undefined || v[key] === null ? "" : String(v[key]);
        if (f[5] === "lines") val = val.split("~").join("\n");
        var id = "jl-" + key, input;
        if (type === "select") {
          input = h("select", { id: id, name: key, disabled: !editing }, h("option", { value: "", text: editing ? "Select" : "Not added" }));
          var list = opts.slice(); if (val && list.indexOf(val) < 0) list.push(val);
          list.forEach(function (o) { input.appendChild(h("option", { value: o, text: o })); });
        } else if (type === "textarea") {
          input = h("textarea", { id: id, name: key, rows: f[5] === "lines" ? 4 : 3, maxlength: f[6] || 400, disabled: !editing, placeholder: ph });
        } else {
          input = h("input", { id: id, name: key, type: (type === "date" && !editing) ? "text" : type, disabled: !editing, maxlength: f[6] || 200, placeholder: ph, autocomplete: "off" });
          if (type === "tel") input.setAttribute("inputmode", "tel");
          if (key === "PinCode") input.setAttribute("inputmode", "numeric");
          if (opts) { var dl = h("datalist", { id: id + "-list" }); opts.forEach(function (o) { dl.appendChild(h("option", { value: o })); }); input.setAttribute("list", id + "-list"); box.appendChild(dl); }
        }
        input.value = val;
        var label = h("label", { for: id }, f[1], priv ? h("span", { class: "jl-tag", text: "Private" }) : null);
        var fieldEl = h("div", { class: "jl-field" }, label, input);
        if (f[5] === "more") extras.push({ el: fieldEl, has: !!val }); else box.appendChild(fieldEl);
      });
      if (extras.length) { // the less common links stay hidden until "Add more"
        var any = extras.some(function (x) { return x.has; }), more = h("div", { class: "jl-more" });
        extras.forEach(function (x) { if (!editing && !x.has) x.el.hidden = true; more.appendChild(x.el); });
        if (editing && !any) {
          more.hidden = true;
          box.appendChild(h("button", { type: "button", class: "jl-btn jl-small jl-addmore", text: "+ Add more", onclick: function (e) { more.hidden = false; e.target.parentNode.removeChild(e.target); } }));
        }
        if (editing || any) box.appendChild(more);
      }
      form.appendChild(box);
      (AFTER[sec[0]] || []).forEach(function (i) { form.appendChild(listBox(LISTS[i], v[LISTS[i].key], editing, v.Batch)); });
    });

    state.dirty = false;
    form.addEventListener("input", markDirty);
    form.addEventListener("change", markDirty);

    if (admin) { // only admins see this box: the Gmail the person signs in with, and the memorial year
      var box = h("fieldset", { class: "jl-sec jl-adminbox" }, h("legend", { text: "Admin only", "data-ico": "\ud83d\udd11" }),
        h("div", { class: "jl-field" }, h("label", { for: "jl-__email", text: "Google email (used to sign in)" }),
          h("input", { id: "jl-__email", name: "__email", type: "email", maxlength: 200, value: m.email || "", disabled: !editing, autocomplete: "off" })),
        h("div", { class: "jl-field" }, h("label", { for: "jl-rip", text: "In memoriam (year)" }),
          h("input", { id: "jl-rip", name: "rip", type: "text", maxlength: 40, value: (m.data && m.data.rip) || "", placeholder: "eg. 2024", disabled: !editing, autocomplete: "off" })));
      form.insertBefore(box, form.firstChild);
    }

    var actions = h("div", { class: "jl-actions" },
      h("button", { type: "submit", class: "jl-btn jl-primary", id: "jl-save", text: admin ? "Save" : "Save changes" }),
      h("button", { type: "button", class: "jl-btn", text: "Cancel", onclick: function () { guard(admin ? function () { location.href = ADMIN_URL; } : stopEditing); } }),
      h("span", { class: "jl-msg", id: "jl-note", role: "status" }));
    form.appendChild(actions);

    var fileInput = h("input", { type: "file", accept: "image/*", class: "jl-file", id: "jl-file", onchange: onPhoto });
    var head = h("div", { class: "jl-head" },
      h("div", { class: "jl-ph" }, avatar(v, m),
        editing && !admin ? h("label", { class: "jl-btn jl-small", for: "jl-file", text: "Change photo" }) : null, editing && !admin ? fileInput : null),
      h("div", { class: "jl-who" },
        h("h2", { text: v.Name || user.name || "Welcome" }),
        h("p", { class: "jl-muted", text: v.Batch ? "Batch " + v.Batch : "No entry yet" }),
        me.isAdmin && !admin ? h("span", { class: "jl-chip", text: "Admin" }) : null,
        me.isCore && !admin ? h("span", { class: "jl-chip", text: "Core member" }) : null));

    var toggle = h("label", { class: "jl-switch" },
      h("input", { type: "checkbox", role: "switch", id: "jl-edit", checked: editing, onchange: function (e) { if (e.target.checked) return startEditing(); if (state.dirty) e.target.checked = true; guard(stopEditing); } }),
      h("span", { class: "jl-track" }), h("span", { text: "Edit details" }));

    var top = h("div", { class: "jl-top" },
      h("div", { class: "jl-acct" },
        user.picture ? h("img", { src: user.picture, alt: "", width: "24", height: "24", referrerpolicy: "no-referrer" }) : null,
        h("span", { text: user.email || "" })),
      h("button", { type: "button", class: "jl-link", text: "Sign out", onclick: function () { guard(function () { state.editing = false; state.dirty = false; signOut(); }); } }));

    var pn = m && m.status === "approved" ? ((m.data && m.data.Name) || m.name) : "";
    var profileBtn = pn && m.batch ? h("a", { class: "jl-btn jl-profilebtn", href: "/" + m.batch + "#" + nameKey(pn), text: "Go to my profile" }) : null;
    var adminBar = !admin ? null : h("div", { class: "jl-adminbar" },
      h("p", { class: "jl-adminttl" }, h("b", { text: "Editing " + m.name + " (Batch " + m.batch + ")" }), " as admin"),
      h("div", { class: "jl-adminacts" },
        h("a", { class: "jl-btn jl-small", href: ADMIN_URL, text: "Back to admin" }),
        pn ? h("a", { class: "jl-btn jl-small", href: "/" + m.batch + "#" + nameKey(pn), text: "View profile" }) : null,
        m.has_prev ? h("button", { type: "button", class: "jl-btn jl-small", text: "Undo last edit", onclick: function () { guard(function () { adminAct("/api/admin/" + m.id + "/undo", "Go back to the version before the last edit?", function () { state.flash = "Reverted."; load(); }); }); } }) : null,
        h("button", { type: "button", class: "jl-btn jl-small jl-danger", text: "Delete member", onclick: function () { guard(function () { adminAct("/api/admin/" + m.id, "Delete " + m.name + " permanently?", function () { state.dirty = false; location.href = ADMIN_URL; }); }); } })));
    var body = admin ? [adminBar, top, head] : [profileBtn, top, head];
    if (state.notAdmin) body.push(h("p", { class: "jl-msg jl-warn", text: "Only admins can edit other members. This is your own profile." }));
    if (me.isAdmin && !admin) body.push(h("a", { class: "jl-btn jl-primary jl-adminlink", href: root.dataset.admin || "/p/admin.html", text: "Open admin page" }));
    if (admin) {
      body.push(h("p", { class: "jl-hint", text: m.status === "approved" ? "Changes go live on the site right away." : "Not approved yet. Saving updates their sign-up request; approve it on the admin page." }));
      body.push(form);
    } else if (isNew && !editing) {
      body.push(h("p", { class: "jl-msg jl-warn", text: state.claim
        ? "No Gmail is linked to " + state.claim.name + " (Batch " + state.claim.batch + ") yet. Check your details and save: the admin will link " + (user.email || "your Gmail") + " to that profile."
        : "We could not find an alumni entry for " + (user.email || "this account") + ". If you are already listed under another email, tell the admin so it can be linked. Otherwise create your profile." }));
      body.push(h("button", { type: "button", class: "jl-btn jl-primary", text: "Create my profile", onclick: startEditing }));
    } else {
      body.push(statusBox(m));
      body.push(h("div", { class: "jl-row" }, toggle));
      body.push(h("p", { class: "jl-hint", text: m && m.status === "approved"
        ? "Your changes go live on the site right away. Changing your name or batch needs admin approval. Phone, address and pin code are shown on the site only to admins and core members."
        : "Your entry needs admin approval before it goes on the site. Phone, address and pin code are shown on the site only to admins and core members." }));
      body.push(form);
    }
    show(h.apply(null, ["div", { class: "jl-card" }].concat(body)));
    if (!admin) mountGallery();
  }

  function markDirty() { state.dirty = true; }
  function adminAct(path, ask, done) {
    if (!window.confirm(ask)) return;
    api(path, { method: path.slice(-5) === "/undo" ? "POST" : "DELETE" }).then(done).catch(function (e) { if (e.message !== "expired") window.alert(e.message); });
  }
  function startEditing() {
    state.editing = true; state.dirty = false;
    try { history.pushState({ jlEdit: 1 }, "", location.href); state.pushed = true; } catch (e) {} // so the Back button asks before leaving
    render();
  }
  function stopEditing() {
    state.editing = false; state.dirty = false; state.photoBlob = null;
    if (state.photoUrl) { URL.revokeObjectURL(state.photoUrl); state.photoUrl = null; }
    dropPushed();
    render();
  }
  function dropPushed() { if (state.pushed) { state.pushed = false; state.skipPop = true; history.back(); } }

  /* ---------- "save before you leave" ---------- */
  function askSave(done) {
    var prev = document.activeElement;
    var overlay = h("div", { class: "jl-modal" });
    function close(choice) {
      document.removeEventListener("keydown", onKey);
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      if (prev && prev.focus) { try { prev.focus(); } catch (e) {} }
      done(choice);
    }
    function onKey(e) { if (e.key === "Escape") close("stay"); }
    var saveBtn = h("button", { type: "button", class: "jl-btn jl-primary", text: "Save", onclick: function () { close("save"); } });
    overlay.appendChild(h("div", { class: "jl-dialog", role: "dialog", "aria-modal": "true", "aria-labelledby": "jl-mt" },
      h("h3", { id: "jl-mt", text: "Save your changes?" }),
      h("p", { text: "You have changes that are not saved yet." }),
      h("div", { class: "jl-dactions" }, saveBtn,
        h("button", { type: "button", class: "jl-btn", text: "Don't save", onclick: function () { close("discard"); } }),
        h("button", { type: "button", class: "jl-btn jl-ghost", text: "Keep editing", onclick: function () { close("stay"); } }))));
    overlay.addEventListener("click", function (e) { if (e.target === overlay) close("stay"); });
    document.addEventListener("keydown", onKey);
    document.body.appendChild(overlay);
    saveBtn.focus();
  }
  // run leave() now, or after the person has chosen Save / Don't save
  function guard(leave, stay) {
    if (!(state.editing && state.dirty)) return leave();
    askSave(function (c) {
      if (c === "discard") { state.dirty = false; leave(); }
      else if (c === "save") saveThen(leave);
      else if (stay) stay();
    });
  }
  window.addEventListener("popstate", function () { // Back pressed while editing
    if (state.skipPop) { state.skipPop = false; return; }
    if (!state.editing) return;
    state.pushed = false;
    if (!state.dirty) { state.editing = false; history.back(); return; }
    askSave(function (c) {
      if (c === "discard") { state.dirty = false; state.editing = false; history.back(); }
      else if (c === "save") saveThen(function () { state.editing = false; history.back(); });
      else { try { history.pushState({ jlEdit: 1 }, "", location.href); state.pushed = true; } catch (e) {} }
    });
  });
  window.addEventListener("beforeunload", function (e) { // closing the tab or reloading
    if (state.editing && state.dirty) { e.preventDefault(); e.returnValue = ""; }
  });
  root.addEventListener("click", function (e) { // links on this page (profile, admin)
    var a = e.target.closest && e.target.closest("a[href]");
    if (!a || !state.editing || !state.dirty || a.getAttribute("target") === "_blank" || e.metaKey || e.ctrlKey) return;
    e.preventDefault();
    var href = a.href;
    guard(function () { location.href = href; });
  });

  /* ---------- photo to WebP ---------- */
  function toWebp(file) {
    return (file && file.d ? Promise.resolve(file) : loadImage(file)).then(function (o) {
      var side = Math.min(o.w, o.h), sx = (o.w - side) / 2, sy = (o.h - side) / 2;
      var sizes = [480, 400, 320, 240], quals = [0.82, 0.7, 0.6, 0.5], tries = [];
      sizes.forEach(function (s) { quals.forEach(function (q) { tries.push([s, q]); }); });
      function attempt(i) {
        var s = tries[i][0], q = tries[i][1];
        var c = document.createElement("canvas"); c.width = c.height = s;
        c.getContext("2d").drawImage(o.d, sx, sy, side, side, 0, 0, s, s);
        return new Promise(function (res) { c.toBlob(res, "image/webp", q); }).then(function (b) {
          if (b && b.type !== "image/webp") return new Promise(function (res) { c.toBlob(res, "image/jpeg", q); }); // browser cannot make WebP
          return b;
        }).then(function (b) {
          if (b && (b.size <= 90 * 1024 || i === tries.length - 1)) return b;
          return attempt(i + 1);
        });
      }
      return attempt(0);
    });
  }
  function loadImage(file) {
    if (window.createImageBitmap) {
      return createImageBitmap(file, { imageOrientation: "from-image" })
        .then(function (b) { return { d: b, w: b.width, h: b.height }; })
        .catch(function () { return viaImg(file); });
    }
    return viaImg(file);
  }
  function viaImg(file) {
    return new Promise(function (res, rej) {
      var u = URL.createObjectURL(file), i = new Image();
      i.onload = function () { res({ d: i, w: i.naturalWidth, h: i.naturalHeight }); URL.revokeObjectURL(u); };
      i.onerror = function () { rej(new Error("That file is not a photo")); };
      i.src = u;
    });
  }

  /* ---------- profile photo cropper (1:1) ----------
     Drag inside = move the photo. Pinch / slider / wheel = zoom. Drag a corner or an edge of the square = make the
     crop smaller; when you let go, the photo zooms in smoothly so that crop fills the screen. Rotate button = 90 degrees. */
  function openCropper(o) {
    return new Promise(function (resolve) {
      var src = o.d, sw = o.w, sh = o.h, LIM = 2400;
      if (Math.max(sw, sh) > LIM) { // keep the working copy light for phones
        var k0 = LIM / Math.max(sw, sh), wc = document.createElement("canvas");
        wc.width = Math.round(sw * k0); wc.height = Math.round(sh * k0);
        wc.getContext("2d").drawImage(o.d, 0, 0, wc.width, wc.height);
        src = wc; sw = wc.width; sh = wc.height;
      }
      // s = screen px per photo px; (tx,ty) = photo centre relative to the stage centre; the crop square is (fcx,fcy,fsz)
      var rot = 0, s = 1, tx = 0, ty = 0, minS = 1, maxS = 12, W = 0, H = 0, F0 = 0, cx = 0, cy = 0, fcx = 0, fcy = 0, fsz = 0, dpr = 1, done = false;
      var pts = {}, drag = null, anim = null;

      var canvas = h("canvas", { class: "jc-canvas" });
      var ctx = canvas.getContext("2d");
      var zoom = h("input", { type: "range", min: "0", max: "100", value: "0", step: "0.5", class: "jc-zoom", "aria-label": "Zoom" });
      var rotBtn = h("button", { type: "button", class: "jc-ico", "aria-label": "Rotate", text: "\u21BB" });
      var cancelBtn = h("button", { type: "button", class: "jc-txt", text: "Cancel" });
      var doneBtn = h("button", { type: "button", class: "jc-txt jc-done", text: "Done" });
      var modal = h("div", { class: "jc-modal", role: "dialog", "aria-modal": "true", "aria-label": "Crop photo" },
        h("div", { class: "jc-title", text: "Move and zoom, or drag the corners to crop" }),
        h("div", { class: "jc-stage" }, canvas),
        h("div", { class: "jc-zrow" }, h("span", { class: "jc-zs", text: "\u2212" }), zoom, h("span", { class: "jc-zs", text: "+" })),
        h("div", { class: "jc-bar" }, cancelBtn, rotBtn, doneBtn));

      function dims() { return rot % 2 ? [sh, sw] : [sw, sh]; }
      function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
      function setBase() { var d = dims(); minS = F0 / Math.min(d[0], d[1]); maxS = minS * 12; }
      function resetFrame() { fcx = cx; fcy = cy; fsz = F0; }
      function fit() {
        endAnim(); drag = null; pts = {};
        var r = canvas.parentNode.getBoundingClientRect();
        W = Math.max(1, r.width); H = Math.max(1, r.height);
        dpr = Math.min(window.devicePixelRatio || 1, 3);
        canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
        F0 = Math.max(120, Math.min(W - 24, H - 24, 520));
        cx = W / 2; cy = H / 2; resetFrame(); setBase();
        s = clamp(s, minS, maxS); limit(); draw();
      }
      function limit() { // the photo must always cover the crop square
        var d = dims(), mx = Math.max(0, (d[0] * s - fsz) / 2), my = Math.max(0, (d[1] * s - fsz) / 2);
        tx = clamp(tx, -mx, mx); ty = clamp(ty, -my, my);
      }
      function zoomAt(px, py, ns) {
        ns = clamp(ns, minS, maxS);
        var k = ns / s, ccx = cx + tx, ccy = cy + ty;
        tx = px - (px - ccx) * k - cx; ty = py - (py - ccy) * k - cy; s = ns;
      }
      function paint(c, ox, oy, k) { // draws the photo with the current move, zoom and rotation
        c.save(); c.translate(ox + tx * k, oy + ty * k); c.rotate(rot * Math.PI / 2); c.scale(s * k, s * k);
        c.imageSmoothingEnabled = true; c.imageSmoothingQuality = "high";
        c.drawImage(src, -sw / 2, -sh / 2); c.restore();
      }
      function draw() {
        var fx = fcx - fsz / 2, fy = fcy - fsz / 2;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.fillStyle = "#05080c"; ctx.fillRect(0, 0, W, H);
        paint(ctx, cx, cy, 1);
        ctx.fillStyle = "rgba(0,0,0,.62)"; ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.rect(fx, fy, fsz, fsz); ctx.fill("evenodd");
        ctx.lineWidth = 1; ctx.strokeStyle = "rgba(255,255,255,.35)"; ctx.beginPath();
        for (var i = 1; i < 3; i++) {
          ctx.moveTo(fx + fsz * i / 3, fy); ctx.lineTo(fx + fsz * i / 3, fy + fsz);
          ctx.moveTo(fx, fy + fsz * i / 3); ctx.lineTo(fx + fsz, fy + fsz * i / 3);
        }
        ctx.stroke();
        ctx.beginPath(); ctx.arc(fcx, fcy, fsz / 2, 0, Math.PI * 2); ctx.setLineDash([5, 5]); ctx.stroke(); ctx.setLineDash([]); // how it will look as a circle
        ctx.strokeStyle = "rgba(255,255,255,.7)"; ctx.strokeRect(fx + .5, fy + .5, fsz - 1, fsz - 1);
        var L = Math.min(22, fsz / 4), M = Math.min(13, fsz / 8), x2 = fx + fsz, y2 = fy + fsz;
        ctx.lineWidth = 3; ctx.strokeStyle = "#fff"; ctx.beginPath();
        ctx.moveTo(fx, fy + L); ctx.lineTo(fx, fy); ctx.lineTo(fx + L, fy);                 // corners
        ctx.moveTo(x2 - L, fy); ctx.lineTo(x2, fy); ctx.lineTo(x2, fy + L);
        ctx.moveTo(fx, y2 - L); ctx.lineTo(fx, y2); ctx.lineTo(fx + L, y2);
        ctx.moveTo(x2 - L, y2); ctx.lineTo(x2, y2); ctx.lineTo(x2, y2 - L);
        ctx.moveTo(fcx - M, fy); ctx.lineTo(fcx + M, fy); ctx.moveTo(fcx - M, y2); ctx.lineTo(fcx + M, y2); // edge handles
        ctx.moveTo(fx, fcy - M); ctx.lineTo(fx, fcy + M); ctx.moveTo(x2, fcy - M); ctx.lineTo(x2, fcy + M);
        ctx.stroke();
        zoom.value = String(maxS > minS ? (s - minS) / (maxS - minS) * 100 : 0);
      }

      /* ----- dragging a corner or an edge of the square ----- */
      function hit(p) {
        var L = fcx - fsz / 2, T = fcy - fsz / 2, R = L + fsz, B = T + fsz, rc = Math.min(36, fsz / 3), re = Math.min(22, fsz / 5);
        var cs = [[L, T, -1, -1], [R, T, 1, -1], [L, B, -1, 1], [R, B, 1, 1]];
        for (var i = 0; i < 4; i++) {
          if (Math.hypot(p.x - cs[i][0], p.y - cs[i][1]) <= rc) {
            return { t: "c", dx: cs[i][2], dy: cs[i][3], ax: fcx - cs[i][2] * fsz / 2, ay: fcy - cs[i][3] * fsz / 2, ox: p.x - cs[i][0], oy: p.y - cs[i][1] };
          }
        }
        if (p.x >= L && p.x <= R) {
          if (Math.abs(p.y - T) <= re) return { t: "e", nx: 0, ny: -1, ay: B, xc: fcx, ox: 0, oy: p.y - T };
          if (Math.abs(p.y - B) <= re) return { t: "e", nx: 0, ny: 1, ay: T, xc: fcx, ox: 0, oy: p.y - B };
        }
        if (p.y >= T && p.y <= B) {
          if (Math.abs(p.x - L) <= re) return { t: "e", nx: -1, ny: 0, ax: R, yc: fcy, ox: p.x - L, oy: 0 };
          if (Math.abs(p.x - R) <= re) return { t: "e", nx: 1, ny: 0, ax: L, yc: fcy, ox: p.x - R, oy: 0 };
        }
        return null;
      }
      function resizeTo(p) {
        var qx = p.x - drag.ox, qy = p.y - drag.oy, d = dims(), hw = d[0] * s / 2, hh = d[1] * s / 2;
        var iL = cx + tx - hw, iR = cx + tx + hw, iT = cy + ty - hh, iB = cy + ty + hh, minF = Math.max(64, F0 / 6), size, mx;
        if (drag.t === "c") {
          size = Math.max((qx - drag.ax) * drag.dx, (qy - drag.ay) * drag.dy);
          mx = Math.min(F0, drag.dx > 0 ? iR - drag.ax : drag.ax - iL, drag.dy > 0 ? iB - drag.ay : drag.ay - iT);
          size = clamp(size, minF, Math.max(minF, mx));
          fcx = drag.ax + drag.dx * size / 2; fcy = drag.ay + drag.dy * size / 2;
        } else if (drag.nx) {
          size = (qx - drag.ax) * drag.nx;
          mx = Math.min(F0, drag.nx > 0 ? iR - drag.ax : drag.ax - iL, 2 * Math.min(drag.yc - iT, iB - drag.yc));
          size = clamp(size, minF, Math.max(minF, mx));
          fcx = drag.ax + drag.nx * size / 2; fcy = drag.yc;
        } else {
          size = (qy - drag.ay) * drag.ny;
          mx = Math.min(F0, drag.ny > 0 ? iB - drag.ay : drag.ay - iT, 2 * Math.min(drag.xc - iL, iR - drag.xc));
          size = clamp(size, minF, Math.max(minF, mx));
          fcy = drag.ay + drag.ny * size / 2; fcx = drag.xc;
        }
        fsz = size;
      }
      function settle() { // zoom in smoothly so the chosen square fills the screen
        var kf = Math.max(1, F0 / fsz);
        if (s * kf > maxS) kf = Math.max(1, maxS / s);
        anim = { t0: performance.now(), dur: 280, s0: s, cx0: cx + tx, cy0: cy + ty, fx0: fcx, fy0: fcy, fz0: fsz, kf: kf, raf: 0 };
        anim.raf = requestAnimationFrame(step);
      }
      function step(now) {
        if (!anim) return;
        var a = anim, t = clamp((now - a.t0) / a.dur, 0, 1), e = 1 - Math.pow(1 - t, 3), k = Math.pow(a.kf, e);
        fcx = a.fx0 + (cx - a.fx0) * e; fcy = a.fy0 + (cy - a.fy0) * e; fsz = a.fz0 * k; s = a.s0 * k;
        tx = fcx + (a.cx0 - a.fx0) * k - cx; ty = fcy + (a.cy0 - a.fy0) * k - cy;
        if (t >= 1) { fcx = cx; fcy = cy; anim = null; limit(); } else a.raf = requestAnimationFrame(step);
        draw();
      }
      function endAnim() { if (anim) { cancelAnimationFrame(anim.raf); var a = anim; step(a.t0 + a.dur); } }

      // Android Chrome only: start with the square placed around the biggest face
      function autoFrameFace() {
        if (!("FaceDetector" in window)) return; // iPhone and others: keep the centred crop
        try {
          new FaceDetector({ fastMode: true, maxDetectedFaces: 5 }).detect(src).then(function (faces) {
            // skip if nothing was found, or the person already moved, zoomed or rotated
            if (!faces.length || done || rot || tx || ty || s !== minS) return;
            var f = faces.reduce(function (a, b) {
              var A = a.boundingBox, B = b.boundingBox;
              return B.width * B.height > A.width * A.height ? b : a; // biggest face
            }).boundingBox;
            var side = Math.max(f.width, f.height) * 2.4;     // face plus hair and shoulders
            var fx = f.x + f.width / 2;
            var fy = f.y + f.height / 2 + f.height * 0.15;    // a little lower, to include shoulders
            s = clamp(F0 / side, minS, maxS);                 // zoom so that area fills the square
            tx = (sw / 2 - fx) * s;                           // move the face to the middle
            ty = (sh / 2 - fy) * s;
            limit(); draw();
          }).catch(function () {});
        } catch (e) {}
      }

      /* ----- touch, mouse and pen ----- */
      function pos(e) { var r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
      canvas.addEventListener("pointerdown", function (e) {
        e.preventDefault(); endAnim();
        if (drag) return;
        try { canvas.setPointerCapture(e.pointerId); } catch (x) {}
        var p = pos(e), hd = Object.keys(pts).length ? null : hit(p);
        if (hd) { hd.id = e.pointerId; drag = hd; return; }
        pts[e.pointerId] = p;
      });
      canvas.addEventListener("pointermove", function (e) {
        var p = pos(e);
        if (drag) { if (e.pointerId === drag.id) { e.preventDefault(); resizeTo(p); draw(); } return; }
        var old = pts[e.pointerId];
        if (!old) { // mouse hovering: show which handle is under the cursor
          if (e.pointerType === "mouse") { var hd = hit(p); canvas.style.cursor = !hd ? "" : hd.t === "c" ? (hd.dx * hd.dy > 0 ? "nwse-resize" : "nesw-resize") : (hd.nx ? "ew-resize" : "ns-resize"); }
          return;
        }
        e.preventDefault();
        var ids = Object.keys(pts);
        if (ids.length >= 2) {
          var o2 = pts[ids[0] === String(e.pointerId) ? ids[1] : ids[0]];
          var od = Math.hypot(old.x - o2.x, old.y - o2.y), nd = Math.hypot(p.x - o2.x, p.y - o2.y);
          var om = { x: (old.x + o2.x) / 2, y: (old.y + o2.y) / 2 }, nm = { x: (p.x + o2.x) / 2, y: (p.y + o2.y) / 2 };
          if (od > 8) zoomAt(nm.x, nm.y, s * nd / od);
          tx += nm.x - om.x; ty += nm.y - om.y;
        } else { tx += p.x - old.x; ty += p.y - old.y; }
        pts[e.pointerId] = p; limit(); draw();
      });
      function up(e) {
        if (drag && e.pointerId === drag.id) { drag = null; settle(); return; }
        delete pts[e.pointerId];
      }
      canvas.addEventListener("pointerup", up); canvas.addEventListener("pointercancel", up);
      canvas.addEventListener("wheel", function (e) {
        e.preventDefault(); endAnim(); var p = pos(e); zoomAt(p.x, p.y, s * Math.exp(-e.deltaY * 0.0015)); limit(); draw();
      }, { passive: false });
      zoom.addEventListener("input", function () { endAnim(); zoomAt(cx, cy, minS + (maxS - minS) * (parseFloat(zoom.value) / 100)); limit(); draw(); });
      rotBtn.addEventListener("click", function () { endAnim(); rot = (rot + 1) % 4; tx = ty = 0; resetFrame(); setBase(); s = minS; draw(); });

      var prevOverflow = document.body.style.overflow;
      function finish(result) {
        if (done) return; done = true;
        if (anim) cancelAnimationFrame(anim.raf);
        window.removeEventListener("resize", fit); window.removeEventListener("keydown", onKey);
        document.body.style.overflow = prevOverflow;
        if (modal.parentNode) modal.parentNode.removeChild(modal);
        resolve(result);
      }
      function onKey(e) { if (e.key === "Escape") finish(null); }
      cancelBtn.addEventListener("click", function () { finish(null); });
      doneBtn.addEventListener("click", function () {
        if (drag) { drag = null; settle(); }
        endAnim();
        var n = Math.max(240, Math.min(720, Math.round(fsz / s))), out = document.createElement("canvas");
        out.width = out.height = n;
        paint(out.getContext("2d"), n / 2, n / 2, n / fsz);
        finish({ d: out, w: n, h: n });
      });
      window.addEventListener("resize", fit); window.addEventListener("keydown", onKey);
      document.body.style.overflow = "hidden";
      document.body.appendChild(modal);
      fit(); s = minS; tx = ty = 0; draw(); // first view: the short side of the photo fills the square
      autoFrameFace();
      doneBtn.focus();
    });
  }

  /* ---------- photos: up to 5 pictures, shrunk to a WebP under 200 KB ---------- */
  var GAL_MAX = 5;
  function resizeForGallery(file) {
    return loadImage(file).then(function (o) {
      var sizes = [1600, 1280, 1024, 800, 640], quals = [0.82, 0.72, 0.62, 0.52, 0.42], tries = [];
      sizes.forEach(function (s) { quals.forEach(function (q) { tries.push([s, q]); }); });
      function attempt(i) {
        var s = tries[i][0], q = tries[i][1], k = Math.min(1, s / Math.max(o.w, o.h));
        var c = document.createElement("canvas"); c.width = Math.max(1, Math.round(o.w * k)); c.height = Math.max(1, Math.round(o.h * k));
        c.getContext("2d").drawImage(o.d, 0, 0, c.width, c.height);
        return new Promise(function (res) { c.toBlob(res, "image/webp", q); }).then(function (b) {
          if (b && b.type !== "image/webp") return new Promise(function (res) { c.toBlob(res, "image/jpeg", q); }); // browser cannot make WebP
          return b;
        }).then(function (b) {
          if (b && (b.size <= 195 * 1024 || i === tries.length - 1)) return b;
          return attempt(i + 1);
        });
      }
      return attempt(0);
    });
  }

  function mountGallery() {
    var m = state.me && state.me.member;
    var old = document.getElementById("jl-gallery");
    if (old) old.remove();
    if (!m) return;
    var card = h("div", { class: "jl-card jl-gal", id: "jl-gallery" }, h("h3", { text: "Photos" }));
    if (m.status !== "approved") {
      card.appendChild(h("p", { class: "jl-hint", text: "You can add photos once your profile is approved." }));
      return root.appendChild(card);
    }
    card.appendChild(h("p", { class: "jl-hint", text: "Photos will appear in your profile. Some photos may be shown in the Batch gallery. Group photos are selected most." }));
    var grid = h("div", { class: "jl-gal-grid" });
    var note = h("p", { class: "jl-msg jl-gnote", role: "status", hidden: true });
    var file = h("input", { type: "file", accept: "image/*", multiple: true, class: "jl-file", id: "jl-gfile" });
    card.appendChild(grid); card.appendChild(note); card.appendChild(file);
    root.appendChild(card);

    function say(t, bad) { note.hidden = !t; note.textContent = t || ""; note.className = "jl-msg jl-gnote " + (bad ? "jl-bad" : "jl-ok"); }
    function draw(list) {
      while (grid.firstChild) grid.removeChild(grid.firstChild);
      list.forEach(function (p) {
        var del = h("button", { type: "button", class: "jl-gal-x", "aria-label": "Delete this photo", text: "×", onclick: function () {
          if (!confirm("Delete this photo?")) return;
          say("Deleting...");
          api("/api/me/gallery/" + p.id, { method: "DELETE" }).then(function () { return refresh(); }).then(function () { say("Photo deleted."); }).catch(function (e) { if (e.message !== "expired") say(e.message, true); });
        } });
        grid.appendChild(h("div", { class: "jl-gal-t" }, h("img", { src: p.url, alt: "", loading: "lazy" }), del, h("span", { class: "jl-gal-lab", text: "Uploaded" })));
      });
      if (list.length < GAL_MAX) grid.appendChild(h("label", { class: "jl-gal-add", for: "jl-gfile" }, h("span", { class: "jl-gal-plus", text: "+" }), h("span", { text: "Add photo" })));
      if (list.length >= GAL_MAX) say("You have added all 5 photos. Delete one to add another.");
    }
    function refresh() { return api("/api/me/gallery").then(function (r) { state.gallery = r.photos; draw(r.photos); }); }
    file.addEventListener("change", function () {
      var files = [].slice.call(file.files || []); file.value = "";
      var room = GAL_MAX - (state.gallery || []).length;
      if (!files.length) return;
      if (files.length > room) { files = files.slice(0, room); }
      var i = 0, fails = 0;
      (function next() {
        if (i >= files.length) { return refresh().then(function () { say(fails ? "Some photos could not be added." : "Added. Your photos now show in your profile.", !!fails); }); }
        say("Adding photo " + (i + 1) + " of " + files.length + "...");
        resizeForGallery(files[i]).then(function (blob) {
          if (!blob) throw new Error("Could not prepare that photo");
          return api("/api/me/gallery", { method: "POST", blob: blob });
        }).catch(function (e) { if (e.message === "expired") throw e; fails++; say(e.message, true); }).then(function () { i++; next(); }, function () {});
      })();
    });
    if (state.gallery) draw(state.gallery);
    else refresh().catch(function (e) { if (e.message !== "expired") say(e.message, true); });
  }

  function onPhoto(e) {
    var input = e.target, f = input.files && input.files[0];
    if (!f) return;
    var note = document.getElementById("jl-note");
    if (note) { note.textContent = "Opening photo..."; note.className = "jl-msg"; }
    loadImage(f).then(function (o) {
      input.value = ""; // so the same photo can be picked again
      return openCropper(o).then(function (cropped) {
        if (!cropped) { if (note) note.textContent = ""; return; }
        if (note) { note.textContent = "Preparing photo..."; note.className = "jl-msg"; }
        return toWebp(cropped).then(function (blob) {
          if (!blob) throw new Error("Could not prepare the photo");
          if (blob.size > 240 * 1024) throw new Error("That photo is too large, please pick another");
          state.photoBlob = blob; markDirty();
          if (state.photoUrl) URL.revokeObjectURL(state.photoUrl);
          state.photoUrl = URL.createObjectURL(blob);
          var img = root.querySelector(".jl-photo");
          if (img) { img.classList.remove("jl-nophoto"); img.src = state.photoUrl; }
          if (note) { note.textContent = "Photo ready (" + Math.round(blob.size / 1024) + " KB). Press Save changes."; }
        });
      });
    }).catch(function (err) { if (note) { note.textContent = err.message; note.className = "jl-msg jl-bad"; } });
  }

  /* ---------- save ---------- */
  function onSave(e) { e.preventDefault(); doSave(e.target); }
  function saveThen(fn) { var f = root.querySelector("form.jl-form"); if (!f) return; state.afterSave = fn; doSave(f); }
  function doSave(form) {
    if (state.busy) return;
    var data = {}, note = document.getElementById("jl-note"), btn = document.getElementById("jl-save");
    SECTIONS.forEach(function (sec) { sec[1].forEach(function (f) {
      var v = String(form.elements[f[0]].value || "").trim();
      if (f[5] === "lines") v = v.split(/\n+/).map(clean).filter(Boolean).join("~");
      if (v) data[f[0]] = v;
    }); });
    var old = values(); KEEP_OLD.forEach(function (k) { if (old[k] && data[k] === undefined) data[k] = old[k]; });
    LISTS.forEach(function (def) { var b = form.querySelector('[data-list="' + def.key + '"]'), s = b ? readList(b, def) : ""; if (s) data[def.key] = s; });
    if (!data.Name || data.Name.length < 2) return say("Please enter your full name", true);
    if (!data.Batch) return say("Please choose your pass-out year", true);
    function say(t, bad) { note.textContent = t; note.className = "jl-msg " + (bad ? "jl-bad" : "jl-ok"); if (bad) state.afterSave = null; }
    state.busy = true; btn.disabled = true; say("Saving...");
    if (state.target) { // admin: save through the admin route, then go back to the admin page
      var rip = String(form.elements.rip.value || "").trim();
      if (rip) data.rip = rip;
      return api("/api/admin/" + state.target.id, { method: "PUT", json: { email: String(form.elements.__email.value || "").trim(), data: data } }).then(function () {
        state.busy = false; state.dirty = false; state.editing = false; state.afterSave = null;
        say("Saved.");
        setTimeout(function () { location.href = ADMIN_URL; }, 400);
      }).catch(function (err) {
        state.busy = false; btn.disabled = false; state.afterSave = null;
        if (err.message !== "expired") say(err.message, true);
      });
    }
    var said = "";
    api("/api/me", { method: "PUT", json: { data: data } }).then(function (r) {
      said = r.message || "";
      if (state.photoBlob) return api("/api/me/photo", { method: "POST", blob: state.photoBlob });
    }).then(function () {
      state.busy = false; state.flash = said;
      if (state.photoUrl) { URL.revokeObjectURL(state.photoUrl); state.photoUrl = null; }
      return load().then(function () { var f = state.afterSave; state.afterSave = null; if (f) f(); });
    }).catch(function (err) {
      state.busy = false; btn.disabled = false; state.afterSave = null;
      if (err.message !== "expired") say(err.message, true);
    });
  }

  /* ---------- start ---------- */
  if (!Auth) return fail("Sign-in could not load (signin.js is missing from the theme). Please reload the page.");
  // signed in or out here, in another tab, or the sign-in ended
  Auth.onChange(function (u, why) {
    if (!u) {
      state.editing = false; state.dirty = false; state.photoBlob = null; dropPushed();
      return renderSignedOut(why === "expired" ? "Your sign-in expired. Please sign in again." : why === "other-tab" ? "You signed out in another tab." : "");
    }
    if (why === "other-tab" && !(state.editing && state.dirty)) load(); // a sign-in on this page loads through onDone instead
  });
  if (Auth.token()) load();
  else if (startHash === "register") { startHash = ""; renderRegister(); }
  else renderSignedOut("");
})();
