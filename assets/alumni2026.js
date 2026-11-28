/* JNV MSD alumni: Alumni Meet 2026 page (form) and its responses table (core members and admins).
   Needs <div id="jnv-meet"> on the page and signin.js in the theme. Add data-mode="responses" for the table page.
   Sign-in, the API address and the Google client all come from signin.js (window.JNVAuth), the same as every other page. */
(function () {
  var root = document.getElementById("jnv-meet");
  if (!root) return;
  var Auth = window.JNVAuth;
  var MODE = root.dataset.mode === "responses" ? "responses" : "form";
  var LOGIN = root.dataset.login || "/p/login.html";
  var RESPONSES = root.dataset.responses || "/p/alumni2026-responses.html";
  var FORM = root.dataset.form || "/p/alumni2026.html";

  var STATUS = ["Studying", "Working", "Preparation", "Self employed", "Employee", "Looking for a job"];
  var SIZES = ["XS", "S", "M", "L", "XL", "XXL"];
  var FIRST_BATCH = 2010; // batch 1 passed Class XII in 2010, so 2018 is the 9th batch
  var thisYear = new Date().getFullYear();

  var st = { pick: null, err: "", me: null, note: "", f: { year: "", att: "", q: "" }, rows: [] };

  /* ---------- helpers ---------- */
  function h(tag, attrs) {
    var el = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      var v = attrs[k];
      if (k === "class") el.className = v;
      else if (k === "text") el.textContent = v;
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
  var head = h("div"), main = h("div");
  root.textContent = "";
  root.appendChild(head); root.appendChild(main);
  function show(node) { while (main.firstChild) main.removeChild(main.firstChild); main.appendChild(node); }
  function toMain() { if (main.scrollIntoView) main.scrollIntoView({ block: "start" }); }
  function ord(n) { var s = ["th", "st", "nd", "rd"], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); }
  function batchLabel(y) { y = Number(y); return ord(y - FIRST_BATCH + 1) + " - " + y; }
  function msg(text, kind) { return h("p", { class: "am-msg am-" + (kind || "warn"), text: text, role: kind === "bad" ? "alert" : "status" }); }

  /* ---------- sign in and API (all through signin.js) ---------- */
  // opts.auth: send the sign-in. A refused request is checked by signin.js before it signs anyone out.
  function api(path, opts) {
    opts = opts || {};
    return Auth.api(path, { method: opts.method, json: opts.json, auth: !!opts.auth });
  }
  function signOut() { Auth.signOut(); } // every tab hears it; onChange below redraws this page
  function email() { var u = Auth.user(); return (u && u.email) || ""; }
  function topBar(email, extra) {
    return h("div", { class: "am-top" }, h("span", { class: "am-acct", text: email }),
      h("span", { class: "am-topbtns" }, extra, h("button", { class: "am-link", type: "button", text: "Sign out", onclick: function () { signOut(); } })));
  }

  /* ================= FORM PAGE ================= */
  function welcome() {
    var p = function (t) { return h("p", { text: t }); };
    return h("div", { class: "am-card am-welcome" },
      h("h1", { text: "JNV MURSHIDABAD ALUMNI MEET 2026" }), h("p", { class: "am-date", text: "26th December 2026" }),
      h("p", { class: "am-quote", text: "\ud83d\udc90 \u201cLes retrouvailles ont le go\u00fbt des souvenirs.\u201d \ud83c\udf3f" }),
      h("p", { class: "am-quote", text: "Some reunions carry the taste of memories." }),
      p("Dear Alumni,"),
      p("Years may have taken us to different cities, professions and paths, but some places never really become a memory\u2014they remain a part of who we are. Navodaya is one such place."),
      p("After years of waving goodbye, countless stories, and friendships that survived the distance, it is time to meet again\u2014not through a screen, but face to face, heart to heart, and under the same sky we once shared."),
      p("The years of the pandemic taught us how to stay connected even when we could not be together; today, this reunion gives us the privilege of doing what screens could never truly replace\u2014reuniting in person."),
      p("This one-of-a-kind reunion, after seven years, brings us together once again\u2014not merely as alumni, but as the same Navodayans who once walked these corridors, laughed together and dreamed together. And after those unforgettable online years, this gathering gives us the joy of finally being together in person again."),
      p("Welcome back to where many of our stories began. Let us reunite, reminisce, and create a few more memories worth carrying home. \ud83d\udc96"),
      h("p", { class: "am-small", text: "(We are also trying to collect the data of the Alumni Members to preserve them in Alumni Association's Database for any future use, so please fill the given Details) Thanks for your Support. \ud83d\ude0a" }));
  }

  // step 1 and 2: search your name (the server answers with a short list), tap it, then confirm with that Gmail
  function picker(note) {
    var box = h("div");
    var card = h("div", { class: "am-card" }, box);
    show(card);
    Auth.picker(box, {
      live: true, title: "Find your name", note: note || "",
      intro: "Type your name or your full Gmail and press Search. Tap your name, then sign in with that Gmail.",
      onDone: function (res) { st.pick = { name: res.pick.name, batch: String(res.pick.batch) }; loadMe(); },
      onRegister: registerScreen
    });
  }
  // "Name not found? Register": sign in with any Gmail, then type the name and batch in the form
  function registerScreen() {
    var box = h("div");
    show(h("div", { class: "am-card" }, box)); toMain();
    Auth.registerView(box, {
      title: "Register yourself",
      intro: "Sign in with your Gmail. You will enter your name and batch in the next step.",
      onBack: function () { picker(); },
      onDone: function () { st.pick = { register: true }; loadMe(); }
    });
  }

  function loadMe() {
    show(h("div", { class: "am-card am-center" }, h("p", { class: "am-muted", text: "Loading..." })));
    return api("/api/meet/me", { auth: true }).then(function (me) { st.me = me; formScreen(); }).catch(function (e) {
      if (e.message !== "expired") show(h("div", { class: "am-card" }, msg(e.message, "bad"),
        h("button", { class: "am-btn", type: "button", text: "Try again", onclick: function () { loadMe(); } }), " ",
        h("button", { class: "am-btn", type: "button", text: "Sign out", onclick: function () { signOut(); } })));
    });
  }

  function group(name, label, opts, value, onChange, hint) {
    return h("fieldset", { class: "am-fs" }, h("legend", { text: label }), hint ? h("p", { class: "am-hint", text: hint }) : null,
      h("div", { class: "am-opts" }, opts.map(function (o) {
        return h("label", { class: "am-opt" }, h("input", { type: "radio", name: name, value: o, checked: o === value, onchange: onChange || function () {} }), h("span", { text: o }));
      })));
  }
  function field(id, label, input, hint) { return h("div", { class: "am-field" }, h("label", { for: id, text: label }), input, hint ? h("p", { class: "am-hint", text: hint }) : null); }

  // The Meet form, used on the member's own page and by admins adding or changing a response.
  // o: { r: answers so far, v: {Name, Batch, Phone, CurrentStatus}, locked, title, gmail: {value, editable, label}, submit, save(d) -> promise, saved(res, button, note) }
  function meetForm(o) {
    var r = o.r || {}, v = o.v;
    var tshirtOther = r.Tshirt && SIZES.indexOf(r.Tshirt) < 0, mentorOther = r.Mentor && r.Mentor !== "Yes" && r.Mentor !== "No";

    var batchSel = h("select", { id: "am-Batch", name: "Batch", class: "am-input" }, h("option", { value: "", text: "Select your batch" }));
    for (var y = FIRST_BATCH; y <= thisYear + 1; y++) batchSel.appendChild(h("option", { value: String(y), text: batchLabel(y) }));
    batchSel.value = v.Batch; if (o.locked) batchSel.disabled = true;
    var statusSel = h("select", { id: "am-CurrentStatus", name: "CurrentStatus", class: "am-input" }, h("option", { value: "", text: "Choose one" }));
    var sopts = STATUS.slice(); if (v.CurrentStatus && sopts.indexOf(v.CurrentStatus) < 0) sopts.push(v.CurrentStatus);
    sopts.forEach(function (x) { statusSel.appendChild(h("option", { value: x, text: x })); });
    statusSel.value = v.CurrentStatus;

    var more = h("div", { class: "am-more" }), countBox = h("div", { class: "am-field" });
    var tshirtText = h("input", { class: "am-input", name: "TshirtOther", type: "text", maxlength: "20", placeholder: "eg. 3XL", "aria-label": "Other T-shirt size", value: tshirtOther ? r.Tshirt : "" });
    var mentorText = h("input", { class: "am-input", name: "MentorOther", type: "text", maxlength: "80", placeholder: "eg. I can guide students on career choices", "aria-label": "Other answer", value: mentorOther ? r.Mentor : "" });
    var count = h("input", { id: "am-CompanionCount", name: "CompanionCount", class: "am-input", type: "number", min: "1", max: "10", inputmode: "numeric", value: r.CompanionCount ? String(r.CompanionCount) : "" });
    countBox.appendChild(h("label", { for: "am-CompanionCount", text: "How many people will accompany you?" })); countBox.appendChild(count);

    function sync() {
      var f = form.elements;
      more.hidden = f.Attend.value !== "Yes";
      countBox.hidden = f.Companions.value !== "Yes";
      tshirtText.hidden = f.Tshirt.value !== "Other";
      mentorText.hidden = f.Mentor.value !== "Other";
    }
    more.appendChild(h("h3", { text: "Details for Alumni Meet - 2026" }));
    more.appendChild(group("Companions", "Will you be accompanied by anyone?", ["No", "Yes"], r.Companions || "", sync, "No if you are alone. Yes if accompanied by spouse or children."));
    more.appendChild(countBox);
    more.appendChild(group("Breakfast", "Would you like to have breakfast at the event?", ["Yes", "No"], r.Breakfast || ""));
    more.appendChild(group("Lunch", "Would you like to have lunch at the event?", ["Yes", "No"], r.Lunch || ""));
    more.appendChild(group("Tshirt", "What is your T-shirt size?", SIZES.concat("Other"), tshirtOther ? "Other" : (r.Tshirt || ""), sync, "The Alumni Association is trying to provide a customized T-shirt to each alumnus on the day of the event."));
    more.appendChild(tshirtText);
    more.appendChild(group("Mentor", "Would you be interested in mentoring or guiding current students, or performing something on stage?", ["Yes", "No", "Other"], mentorOther ? "Other" : (r.Mentor || ""), sync, "Subject to time."));
    more.appendChild(mentorText);

    var note = h("div", { id: "am-note" }, st.note ? msg(st.note, "ok") : null); st.note = "";
    var button = h("button", { class: "am-btn am-primary", type: "submit", text: o.submit });
    var form = h("form", { class: "am-form", novalidate: true, onsubmit: function (e) {
      e.preventDefault();
      var f = form.elements, d = {
        Name: f.Name.value, Batch: f.Batch.value, Phone: f.Phone.value, CurrentStatus: f.CurrentStatus.value, Attend: f.Attend.value,
        Companions: f.Companions.value, CompanionCount: f.CompanionCount.value, Breakfast: f.Breakfast.value, Lunch: f.Lunch.value,
        Tshirt: f.Tshirt.value === "Other" ? f.TshirtOther.value : f.Tshirt.value, Mentor: f.Mentor.value === "Other" ? f.MentorOther.value : f.Mentor.value
      };
      if (o.gmail.editable) d.Email = f.Email.value;
      note.textContent = ""; button.disabled = true; button.textContent = "Saving...";
      o.save(d).then(function (res) { o.saved(res, button, note); })
        .catch(function (err) { button.disabled = false; button.textContent = o.submit; if (err.message !== "expired") { note.textContent = ""; note.appendChild(msg(err.message, "bad")); note.scrollIntoView({ block: "center" }); } });
    } },
      h("div", { class: "am-card" }, h("h2", { text: o.title || "Your details" }),
        field("am-Name", "Name", h("input", { id: "am-Name", name: "Name", class: "am-input", type: "text", maxlength: "80", autocomplete: "name", placeholder: "eg. Mobayea Biswas", readonly: !!o.locked, value: v.Name }), o.locked ? "Your name and batch come from your alumni profile." : null),
        field("am-Batch", "Batch", batchSel),
        field("am-Gmail", o.gmail.label, h("input", { id: "am-Gmail", name: "Email", class: "am-input", type: "email", readonly: !o.gmail.editable, placeholder: o.gmail.editable ? "eg. name@gmail.com" : null, value: o.gmail.value })),
        field("am-Phone", "Phone number", h("input", { id: "am-Phone", name: "Phone", class: "am-input", type: "tel", inputmode: "tel", autocomplete: "tel", placeholder: "eg. 9876543210", value: v.Phone })),
        field("am-CurrentStatus", "Current status", statusSel)),
      h("div", { class: "am-card" }, h("h2", { text: "Alumni Meet 2026" }),
        group("Attend", "Will you attend the Alumni Meet? (on 26th December 2026)", ["Yes", "No"], r.Attend || "", sync), more),
      note, button);
    form.sync = sync;
    return form;
  }

  function formScreen() {
    var me = st.me, r = me.response || {}, m = me.member || {}, p = st.pick || {};
    function pre(k, alt) { var v = r[k] !== undefined && r[k] !== "" ? r[k] : (m[k] !== undefined && m[k] !== "" ? m[k] : alt); return v === undefined || v === null ? "" : String(v); }
    var v = { Name: pre("Name", p.name || me.user.name), Batch: pre("Batch", p.batch), Phone: pre("Phone", ""), CurrentStatus: pre("CurrentStatus", "") };
    var form = meetForm({
      r: r, v: v, locked: !!m.locked, gmail: { value: me.user.email, editable: false, label: "Gmail (from your sign-in)" }, submit: "Save and Next",
      save: function (d) { return api("/api/meet/me", { method: "PUT", auth: true, json: { data: d } }); },
      saved: function (res, button, note) { button.textContent = "Saved. Opening your profile..."; note.textContent = ""; note.appendChild(msg(res.message, "ok")); setTimeout(function () { location.href = LOGIN; }, 900); }
    });
    var extra = me.canView ? h("a", { class: "am-viewbtn", href: RESPONSES, text: "View Responses" }) : null;
    var wrap = h("div", null, topBar(me.user.email, extra),
      me.response ? msg("You have already responded. You can change your answers below.", "ok") : null, form);
    show(wrap); form.sync(); toMain();
  }

  /* ================= RESPONSES PAGE ================= */
  function signedOutResponses(note) {
    var box = h("div");
    show(h("div", { class: "am-card" }, box));
    Auth.picker(box, {
      title: "Alumni Meet 2026 responses", note: note || "",
      intro: "For core members and admins. Find your profile, then confirm with the Gmail linked to it.",
      onDone: function () { loadResponses(); }
    });
  }
  function loadResponses() {
    show(h("div", { class: "am-card am-center" }, h("p", { class: "am-muted", text: "Loading..." })));
    return api("/api/meet/responses", { auth: true }).then(function (r) { st.rows = r.responses; st.canEdit = !!r.canEdit; drawResponses(); }).catch(function (e) {
      if (e.message === "expired") return;
      show(h("div", { class: "am-card" }, msg(/only/i.test(e.message) ? "This page is for core members and admins only. This Gmail is not on the list." : e.message, "bad"),
        h("button", { class: "am-btn", type: "button", text: "Sign out", onclick: function () { signOut(); } }), " ", h("a", { class: "am-btn", href: FORM, text: "Back to the form" })));
    });
  }
  function statusText(x) { return [x.CurrentStatus, x.Institute].filter(Boolean).join(" \u00b7 "); }
  function withText(x) { return x.Attend !== "Yes" ? "" : (x.Companions === "Yes" ? "Yes (" + x.CompanionCount + ")" : "No"); }
  function csv(rows) {
    var cols = ["Batch", "Name", "Email", "Phone", "Current status", "Institute", "Attend", "Accompanied", "Number accompanying", "Breakfast", "Lunch", "T-shirt", "Mentor / stage", "Updated"];
    var q = function (s) { s = String(s == null ? "" : s); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    var out = [cols.join(",")];
    rows.forEach(function (x) { out.push([batchLabel(x.Batch), x.Name, realMail(x.email), x.Phone, x.CurrentStatus, x.Institute, x.Attend, x.Companions, x.CompanionCount, x.Breakfast, x.Lunch, x.Tshirt, x.Mentor, new Date(x.updated_at * 1000).toISOString().slice(0, 10)].map(q).join(",")); });
    return out.join("\n");
  }
  // admins: one form to add a response by hand or change an existing one
  function adminForm(row) {
    var r = row || {};
    var form = meetForm({
      r: r, v: { Name: r.Name || "", Batch: r.Batch ? String(r.Batch) : "", Phone: r.Phone || "", CurrentStatus: r.CurrentStatus || "" }, locked: false,
      title: row ? "Change this response" : "Add a response",
      gmail: row ? { value: realMail(row.email), editable: false, label: "Gmail (cannot be changed)" } : { value: "", editable: true, label: "Gmail (leave empty if they have none)" },
      submit: "Save",
      save: function (d) { return row ? api("/api/admin/meet/" + encodeURIComponent(row.email), { method: "PUT", auth: true, json: { data: d } }) : api("/api/admin/meet", { method: "POST", auth: true, json: { email: d.Email, data: d } }); },
      saved: function () { st.note = ""; loadResponses(); }
    });
    show(h("div", null, topBar(email(), null), form, h("button", { class: "am-btn", type: "button", text: "Cancel", onclick: function () { drawResponses(); } })));
    form.sync(); toMain();
  }
  function removeResponse(x) {
    if (!window.confirm("Delete the response of " + x.Name + "? This cannot be undone.")) return;
    api("/api/admin/meet/" + encodeURIComponent(x.email), { method: "DELETE", auth: true }).then(function () {
      st.rows = st.rows.filter(function (y) { return y.email !== x.email; }); drawResponses();
    }).catch(function (e) { if (e.message !== "expired") window.alert(e.message); });
  }
  function realMail(e) { return /@jnvmsd\.invalid$/i.test(e || "") ? "" : e; } // people added without a Gmail
  function drawResponses() {
    var all = st.rows;
    var yrs = {}; all.forEach(function (x) { yrs[x.Batch] = 1; });
    var tiles = h("div", { class: "am-tiles" }), table = h("div", { class: "am-tw" }), shirts = h("p", { class: "am-muted" });
    function tile(n, label) { return h("div", { class: "am-tile" }, h("b", { text: String(n) }), h("span", { text: label })); }
    function list() {
      var q = st.f.q.toLowerCase().trim();
      return all.filter(function (x) { return (!st.f.year || String(x.Batch) === st.f.year) && (!st.f.att || x.Attend === st.f.att) && (!q || (x.Name + " " + realMail(x.email) + " " + x.Phone).toLowerCase().indexOf(q) >= 0); });
    }
    function fill() {
      var rows = list(), yes = rows.filter(function (x) { return x.Attend === "Yes"; });
      var people = yes.reduce(function (s, x) { return s + 1 + (x.Companions === "Yes" ? Number(x.CompanionCount) || 0 : 0); }, 0);
      tiles.textContent = "";
      tiles.appendChild(tile(rows.length, "Responses")); tiles.appendChild(tile(yes.length, "Attending")); tiles.appendChild(tile(rows.length - yes.length, "Not attending"));
      tiles.appendChild(tile(people, "People coming")); tiles.appendChild(tile(yes.filter(function (x) { return x.Breakfast === "Yes"; }).length, "Breakfast"));
      tiles.appendChild(tile(yes.filter(function (x) { return x.Lunch === "Yes"; }).length, "Lunch"));
      var sz = {}; yes.forEach(function (x) { if (x.Tshirt) sz[x.Tshirt] = (sz[x.Tshirt] || 0) + 1; });
      shirts.textContent = "T-shirts: " + (Object.keys(sz).length ? SIZES.concat(Object.keys(sz).filter(function (k) { return SIZES.indexOf(k) < 0; })).filter(function (k) { return sz[k]; }).map(function (k) { return k + " " + sz[k]; }).join(", ") : "none yet");
      table.textContent = "";
      if (!rows.length) return table.appendChild(h("p", { class: "am-empty", text: "No responses match." }));
      var t = h("table", { class: "am-table" }, h("thead", null, h("tr", null, ["Batch", "Name", "Phone", "Current status", "Attend", "With", "Breakfast", "Lunch", "T-shirt", "Mentor / stage"].concat(st.canEdit ? [""] : []).map(function (c) { return h("th", { scope: "col", text: c }); }))));
      var tb = h("tbody");
      rows.forEach(function (x) {
        tb.appendChild(h("tr", null, h("td", { text: batchLabel(x.Batch) }), h("td", null, h("b", { text: x.Name }), h("small", { text: realMail(x.email) || "no Gmail" })),
          h("td", null, x.Phone ? h("a", { href: "tel:" + x.Phone, text: x.Phone }) : ""), h("td", { text: statusText(x) }),
          h("td", { class: x.Attend === "Yes" ? "am-yes" : "am-no", text: x.Attend }), h("td", { text: withText(x) }), h("td", { text: x.Breakfast }), h("td", { text: x.Lunch }), h("td", { text: x.Tshirt }), h("td", { text: x.Mentor }),
          st.canEdit ? h("td", { class: "am-acts" }, h("button", { class: "am-rowbtn", type: "button", text: "Edit", "aria-label": "Edit the response of " + x.Name, onclick: function () { adminForm(x); } }), h("button", { class: "am-rowbtn am-del", type: "button", text: "Delete", "aria-label": "Delete the response of " + x.Name, onclick: function () { removeResponse(x); } })) : null));
      });
      t.appendChild(tb); table.appendChild(t);
    }
    var yearSel = h("select", { class: "am-input", "aria-label": "Batch", onchange: function (e) { st.f.year = e.target.value; fill(); } }, h("option", { value: "", text: "All batches" }),
      Object.keys(yrs).sort().map(function (y) { return h("option", { value: y, text: "Batch " + batchLabel(y), selected: String(y) === st.f.year }); }));
    var attSel = h("select", { class: "am-input", "aria-label": "Attending", onchange: function (e) { st.f.att = e.target.value; fill(); } }, h("option", { value: "", text: "Everyone" }), h("option", { value: "Yes", text: "Attending", selected: st.f.att === "Yes" }), h("option", { value: "No", text: "Not attending", selected: st.f.att === "No" }));
    var search = h("input", { class: "am-input", type: "search", placeholder: "Search name, Gmail or phone", "aria-label": "Search", value: st.f.q, oninput: function (e) { st.f.q = e.target.value; fill(); } });
    var dl = h("button", { class: "am-btn", type: "button", text: "Download CSV", onclick: function () {
      var a = h("a", { href: URL.createObjectURL(new Blob(["\ufeff" + csv(list())], { type: "text/csv" })), download: "alumni-meet-2026-responses.csv" });
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
    } });
    show(h("div", null, topBar(email(), h("a", { class: "am-link", href: FORM, text: "Back to form" })),
      h("h2", { class: "am-title", text: "Alumni Meet 2026 responses" }), tiles, shirts, h("div", { class: "am-filters" }, search, yearSel, attSel, dl), st.canEdit ? h("p", null, h("button", { class: "am-btn am-add", type: "button", text: "+ Add a response", onclick: function () { adminForm(null); } })) : null, table));
    fill();
  }

  /* ---------- start ---------- */
  if (!Auth) return show(h("div", { class: "am-card" }, msg("Sign-in could not load (signin.js is missing from the theme). Please reload the page.", "bad")));
  // signed out here or in another tab, the sign-in ended, or someone signed in in another tab
  Auth.onChange(function (u, why) {
    var note = why === "expired" ? "Your sign-in expired. Please sign in again." : why === "other-tab" && !u ? "You signed out in another tab." : "";
    if (!u) { st.me = null; st.pick = null; return MODE === "responses" ? signedOutResponses(note) : picker(note); }
    if (why === "other-tab") { if (MODE === "responses") loadResponses(); else loadMe(); } // a sign-in on this page continues through onDone
  });
  var signed = !!Auth.token(); // the saved 30 day sign-in, read synchronously by signin.js
  if (MODE === "responses") { if (signed) loadResponses(); else signedOutResponses(""); }
  else { head.appendChild(welcome()); if (signed) loadMe(); else picker(); }
})();