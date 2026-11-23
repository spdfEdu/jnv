const estb = 2003;
const nth = function(d) {
  if (d > 3 && d < 21) return 'th';
  switch (d % 10) {
    case 1:  return "st";
    case 2:  return "nd";
    case 3:  return "rd";
    default: return "th";
  }
};
var year = new Date().getFullYear();
const addYear = [((typeof BATCH !== "undefined" && BATCH) ? Number(BATCH) : all[0].Batch) - 7];
let x = Number([addYear]);
let y = Number([estb]);
var z = [x-y+1];
var batch = z + nth(z);
var xii =(x+7);

//small helpers shared by the public and private blogs
function nameKey(p) { return p.Name.replace(/ /g,'_'); }
function findByKey(k) { return all.find(function(p){ return nameKey(p) === k; }); }
function mailOf(e) { e = String(e || "").trim(); return e ? (e.indexOf("@") > -1 ? e : e + "@gmail.com") : ""; }
function mailShow(e) { e = String(e || "").trim(); return e.indexOf("@") > -1 ? e : e + "[at]gmail.com"; }
function ph91(n) { n = String(n).trim(); return n.length <= 10 ? "91" + n : n; }

document.title = `${xii} JNV MSD`;
urlChange = '/' +xii +window.location.hash;
window.history.replaceState('','',urlChange);

document.body.classList.add("batch-page");
var upper = document.createElement("section");
upper.className = "batch-card";
upper.innerHTML =
 `<div class="bc-photo"></div>
  <div class="bc-body">
    <div class="bc-head">
      <h1 id="head-main">${xii}</h1>
      <span class="bc-badge">Batch ${batch}</span>
    </div>
    <dl class="bc-stats">
      <div class="bc-stat"><dt>Studied</dt><dd>${x} to ${xii}</dd></div>
      <div class="bc-stat"><dt>Registered Alumni</dt><dd>${all.length}</dd></div>
      ${(typeof date !== "undefined" && !window.JNV_LIVE) ? `<div class="bc-stat bc-wide"><dt>Data collected</dt><dd>${date}</dd></div>` : ""}
    </dl>
  </div>`;
var coverBox = document.querySelector(".tc");
if (!coverBox) {
  coverBox = document.createElement("div");
  coverBox.className = "tc";
  coverBox.innerHTML = `<img alt="Batch ${xii}" src="https://spdfedu.github.io/jnv/images/cover/${xii}.jpg">`;
}
upper.querySelector(".bc-photo").append(coverBox);
if (window.JNV_SLIDES && window.JNV_SLIDES.length) makeSlider(upper.querySelector(".bc-photo"), coverBox);
document.getElementById("upper").append(upper);

document.getElementById("down").innerHTML = "<h2>Other batches</h2><p>Current passout batch: " +year +
"<br>Established: " + [estb] +
"<br>Total batches: " +[year -[estb] -6]+"</p>";

  //creating the profiles
main = document.getElementById("mainContainer")
vesselBox = document.createElement("div")
vesselBox.id = "vessel_box"
main.append(vesselBox)
insertProfiles = document.getElementById("vessel_box");
git = "https://spdfedu.github.io/jnv/"
giti = git+"images/"

all.sort((a, b) => {
  const nameA = a.Name.toUpperCase(); 
  const nameB = b.Name.toUpperCase(); 
  if (nameA < nameB) {return -1}
  if (nameA > nameB) {return 1}
  return 0;
});

all.forEach(createProfile);
function createProfile(ele,i) {
 child = document.createElement("div")
 nameDash = ele.Name.replace(/ /g,'_')
 img = xii+'/'+nameDash+'.jpg'
 var photos = photoList(ele, img, 96)
  child.className = "vessels collapsed";
  child.innerHTML =
 `<a class="nameBox" href="#${nameDash}">
    <div class="pp">
      <img class="svgP svgPP">
      <img class="coverPP" loading="lazy" decoding="async" width="60" height="60" src="${esc(photos[0])}" data-rest="${esc(JSON.stringify(photos.slice(1)))}" referrerpolicy="no-referrer" onerror="jnvNextPhoto(this)" alt="${ele.Name}" />
    </div>
    <h2 class="naming">${ele.Name}</h2>
  </a>
  
  <div hidden="until-found" class="contentBox" id="${nameDash}">
  <div class="bscrool">
  <div class="nameBox2 flex" onclick="doh2(this)">
    <h2 class="naming2">${ele.Name}</h2>
    <div class="back"><i class="svgBack"></i></div>
  </div>
  <div class="details">
  ${heroHtml(ele, photoList(ele, img, 240))}
  ${galleryCard(ele)}
  ${ripDiv(ele.rip)}
  ${aboutCard(ele.Bio)}
  ${factsHtml(ele)}
  ${card("Current Status", ele.CurrentStatus ? `<p class="para">${esc(ele.CurrentStatus)}</p>` : "")}
  ${workCard(ele.WorkList)}
  ${eduCard(ele.EduList)}
  ${listCard("Achievements", ele.Achievements)}
  ${visitCard(ele.JnvVisits)}
  ${memoCard(ele.Memories)}
  ${chipCard("Skills", ele.Skills)}
  ${chipCard("Languages", ele.Languages)}
  <div class="card" ${styDisplay(ele.Phone, ele.Phone2)}>
    <h3>Contact Details</h3>
    ${phnDiv(ele.Phone)}
    ${phnDiv(ele.Phone2)}
  ${saveDiv(ele)}
</div>
  ${socialCard(ele)}
  <div class="card" ${styDisplay(ele.House)}>
     <h3>House</h3>
     <img loading="lazy" class="hsimg" width="100%" src="${giti}tshirt/webp/${ele.House}.webp" alt="${ele.House} House Tshirt" />
     <p style="text-align:center">${ele.House}</p>
   </div>
  <div class="card" ${styDisplay(ele.Address, ele.PinCode, ele.District)}>
    <h3>Address</h3>
    <p>${addrHtml(ele)}</p>
  </div>
  
<div class="card">
    <h3>Share</h3>
    <div class="w100">
     <div class="w50" style="display:block" data-key="${nameDash}" onclick="share(this.dataset.key)"><i class="svg svgShare"></i>Share with others</div>
  </div>
</div>
<p class="visits" id="pv_${nameDash}" hidden>Total visits: <b></b></p>
    </div>
    </div>
  </div>`;
  insertProfiles.append(child);
  initProfileSliders(child);
}


//---------- profile helpers (new fields) ----------
// Photos to try in order: the one they uploaded, the old photo on GitHub, the Drive photo from the Meet form, then their Google (Gmail) photo
function photoList(ele, img, size) {
  var l = [];
  if (ele.photo) l.push(ele.photo);
  l.push(giti + img);
  if (ele.ppl) l.push("https://lh3.googleusercontent.com/d/" + ele.ppl);
  if (ele.gpic) l.push(ele.gpic.replace(/=s\d+-c$/, "=s" + size + "-c"));
  return l;
}
function jnvNextPhoto(el) { // the picture did not load: try the next one, then show the placeholder
  var rest = [];
  try { rest = JSON.parse(el.getAttribute("data-rest") || "[]"); } catch (e) {}
  if (rest.length) { el.setAttribute("data-rest", JSON.stringify(rest.slice(1))); el.src = rest[0]; return; }
  if (el.classList.contains("coverPP")) el.className = "svgP svgPP"; else el.style.display = "none";
}
function esc(t) { return String(t == null ? "" : t).replace(/[&<>"']/g, function(c) { return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]; }); }
function rowsOf(t) { return t ? String(t).split("~").map(function(r) { return r.split("|").map(function(c) { return c.trim(); }); }) : []; }
function yearOf(r) { var m = String(r[0] || "").match(/\d{4}/g); return m ? Number(m[m.length - 1]) : 0; }
function newest(a, b) { return yearOf(b) - yearOf(a); }
function dobShow(d) {
  var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d || "");
  if (!m) return esc(d);
  return Number(m[3]) + " " + ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][Number(m[2]) - 1] + " " + m[1];
}
function card(title, inner) { return inner ? `<div class="card"><h3>${title}</h3><div class="cb">${inner}</div></div>` : ""; }

function act(href, label, ico, primary) {
  return `<a class="act${primary ? " act-p" : ""}" href="${esc(href)}"><i class="ico ${ico}"></i>${label}</a>`;
}
function heroHtml(ele, photos) {
  var p = ele.Phone || ele.Phone2, acts = "";
  if (p) acts += act("tel:" + p, "Call", "svgCall", true) + act("whatsapp://send?phone=" + ph91(p), "WhatsApp", "svgWp");
  var pic = `<img class="coverP" loading="lazy" src="${esc(photos[0])}" data-rest="${esc(JSON.stringify(photos.slice(1)))}" referrerpolicy="no-referrer" onerror="jnvNextPhoto(this)" alt="">`;
  pic = `<a href="#" class="hero-zoom" onclick="return jnvZoom(this)" aria-label="View photo larger">${pic}</a>`;
  var sub = [ele.CurrentStatus, hqOf(ele)].filter(Boolean).map(esc).join(" · ");
  var own = isOwn(ele), tag = ele.tag || (own && window.JNV_ME.role ? ({ owner: "Admin", admin: "Admin", core: "Core Member" })[window.JNV_ME.role] : "");
  var chips = (tag ? (own ? `<a class="chip chip-role chip-link" href="${esc(window.JNV_ADMIN || "/p/admin.html")}" title="Open the admin page">${esc(tag)}</a>` : `<span class="chip chip-role">${esc(tag)}</span>`) : "") +
    [`Batch ${batch}`, ele.House ? ele.House + " House" : "", ele.City].filter(Boolean).map(function(c) { return `<span class="chip">${esc(c)}</span>`; }).join("");
  var key = ele.Name.replace(/ /g, "_"), hint = mailOf(ele.EmailId), signed = !!window.JNV_SIGNED;
  var signBtn = !signed && hint ? `<button class="gsign" type="button" data-key="${esc(key)}" onclick="jnvSignIn(this)"><span class="gsign-ic"><svg viewBox="0 0 48 48" width="24" height="24" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg></span><span>Sign in with Google</span></button>` : "";
  var meBar = own ? `<div class="hero-me"><span class="me-on">Signed in</span><a class="me-edit" href="${esc(window.JNV_LOGIN || "/p/login.html")}">Edit my profile</a></div>` : "";
  return `<div class="hero">
    <div class="hero-ph"><img class="svgP" alt="">${pic}</div>
    <h1 class="hero-name">${esc(ele.Name)}</h1>
    <p class="hero-sub">${sub || "JNV Murshidabad · " + x + " to " + xii}</p>
    <div class="chips">${chips}</div>
    ${signBtn}
    <div class="gs-box" hidden></div>
    ${meBar}
    ${acts ? `<div class="acts">${acts}</div>` : ""}
  </div>`;
}
function aboutCard(t) { return t ? card("About", `<p class="para">${esc(t).replace(/\n/g, "<br>")}</p>`) : ""; }
function factsHtml(ele) {
  var f = [];
  if (ele.DOB) f.push(`<div class="fact"><span>Born</span><b>${dobShow(ele.DOB)}</b></div>`);
  if (ele.BloodGroup) f.push(`<div class="fact fact-blood"><span>Blood</span><b>${esc(ele.BloodGroup)}</b></div>`);
  if (ele.City) f.push(`<div class="fact"><span>City</span><b>${esc(ele.City)}</b></div>`);
  return f.length ? `<div class="facts">${f.join("")}</div>` : "";
}
function chipCard(title, t) {
  var l = String(t || "").split(",").map(function(c) { return c.trim(); }).filter(Boolean);
  return card(title, l.length ? `<div class="chips">${l.map(function(c) { return `<span class="chip">${esc(c)}</span>`; }).join("")}</div>` : "");
}
function listCard(title, t) {
  var l = String(t || "").split("~").map(function(c) { return c.trim(); }).filter(Boolean);
  return card(title, l.map(function(c) { return `<div class="tl"><i class="dot"></i><div><p class="tl-t">${esc(c)}</p></div></div>`; }).join(""));
}
// older saves had one "year" column: education year|course|institute|city, work year|company|position|city
function normEdu(r) { return r.length >= 6 ? r : ["", r[0] || "", r[1] || "", r[2] || "", r[3] || "", ""]; }
function normWork(r) { return r.length >= 5 ? r : ["", r[0] || "", r[1] || "", r[2] || "", r[3] || ""]; }
function hqOf(ele) { // the course marked as the highest qualification
  var rows = rowsOf(ele.EduList).map(normEdu);
  for (var i = 0; i < rows.length; i++) if (rows[i][5] === "1") return rows[i][2] || rows[i][3] || "";
  return "";
}
function endOf(r) { return r[1] === "Present" ? 9999 : (parseInt(r[1], 10) || parseInt(r[0], 10) || 0); }
function newestFirst(a, b) { return endOf(b) - endOf(a) || (parseInt(b[0], 10) || 0) - (parseInt(a[0], 10) || 0); }
function yrBadge(from, to) {
  from = String(from || "").trim(); to = String(to || "").trim();
  if (to === "Present") return `<span class="yr yr2">${from ? `<span>${esc(from)} -</span>` : ""}<span>Present</span></span>`; // "Present" on its own line keeps it narrow on phones
  var t;
  if (from && to && from !== to) t = from + " - " + to.slice(-2);
  else if (from && !to) t = from + " -";
  else t = from || to;
  return `<span class="yr">${esc(t || "-")}</span>`;
}
function timeline(title, rows, mk) {
  return card(title, rows.map(function(r) {
    var o = mk(r);
    return `<div class="tl">${o.badge}<div><p class="tl-t">${esc(o.t)}</p>${o.s ? `<p class="tl-s">${esc(o.s)}</p>` : ""}${o.extra || ""}</div></div>`;
  }).join(""));
}
function place(a, b, c) { // bold line "A \u2022 B", second line c; falls back to c alone
  var t = [a, b].filter(Boolean).join(" \u2022 ");
  return t ? { t: t, s: c } : { t: c || "", s: "" };
}
function oneLine(x) { return String(x || "").replace(/\s+/g, " ").trim(); }
function eduCard(t) { // from | to | course | institute | city | highest
  var rows = rowsOf(t).map(normEdu).sort(newestFirst);
  return timeline("Education history", rows, function(r) {
    var o = place(r[3], r[4], r[2]);
    o.badge = yrBadge(r[0], r[1]);
    if (r[5] === "1") o.extra = `<span class="hq">Highest qualification</span>`;
    return o;
  });
}
function workCard(t) { // from | to | place of work | position | city
  var rows = rowsOf(t).map(normWork).sort(newestFirst);
  return timeline("Employment history", rows, function(r) { var o = place(oneLine(r[2]), r[4], r[3]); o.badge = yrBadge(r[0], r[1]); return o; });
}
function visitCard(t) { // year | activity | JNV (district)
  var rows = rowsOf(t).sort(newest);
  return card("Extracurricular: JNV visits", rows.length ? `<div class="tiles">${rows.map(function(r) {
    return `<div class="tile"><b>${esc(r[1] || "Activity")}</b><span>${esc(r[2] || "")}</span><span>${esc(r[0] || "")}</span></div>`;
  }).join("")}</div>` : "");
}
//---------- photos: one fixed-size slider for the batch photo and for each profile ----------
function galleryCard(ele) {
  var g = ele.gallery || [];
  if (!g.length) return "";
  return card("Photos", '<div class="pslider" data-photos="' + esc(JSON.stringify(g)) + '"></div>');
}
function initProfileSliders(root) {
  [].forEach.call(root.querySelectorAll(".pslider[data-photos]"), function (el) {
    try { buildSlider(el, JSON.parse(el.getAttribute("data-photos"))); } catch (e) {}
    el.removeAttribute("data-photos");
  });
}
function jnvLightbox(list, i) {
  var lb = document.createElement("div");
  lb.className = "jn-lb"; lb.setAttribute("role", "dialog"); lb.setAttribute("aria-modal", "true"); lb.setAttribute("aria-label", "Photo");
  lb.innerHTML = '<img alt="" draggable="false"><button type="button" class="lb-x" aria-label="Close">\u00d7</button>' +
    (list.length > 1 ? '<button type="button" class="lb-p" aria-label="Previous">\u2039</button><button type="button" class="lb-n" aria-label="Next">\u203a</button>' : "");
  var img = lb.querySelector("img");
  var s = 1, tx = 0, ty = 0, MAXZ = 6;            // zoom, and how far the photo is moved
  var pts = {}, pinch = null, drag = null, lastTap = 0, tapAt = null;
  function put(anim) { img.classList.toggle("anim", !!anim); img.style.transform = "translate(" + tx + "px," + ty + "px) scale(" + s + ")"; }
  function limit() { // the photo can be moved only as far as its edges
    var mx = Math.max(0, (img.clientWidth * s - lb.clientWidth) / 2), my = Math.max(0, (img.clientHeight * s - lb.clientHeight) / 2);
    tx = Math.min(mx, Math.max(-mx, tx)); ty = Math.min(my, Math.max(-my, ty));
  }
  function zoomTo(ns, cx, cy, anim) { // zoom around a point so that point stays under the finger
    ns = Math.min(MAXZ, Math.max(1, ns));
    var ox = cx - lb.clientWidth / 2, oy = cy - lb.clientHeight / 2;
    tx = ox - (ox - tx) * (ns / s); ty = oy - (oy - ty) * (ns / s); s = ns;
    if (s === 1) { tx = 0; ty = 0; }
    limit(); put(anim);
  }
  function show(k) { i = (k + list.length) % list.length; s = 1; tx = 0; ty = 0; put(false); img.src = list[i]; }
  function close() { document.removeEventListener("keydown", key); document.body.style.overflow = prevOverflow; lb.remove(); }
  function key(e) { if (e.key === "Escape") close(); else if (e.key === "ArrowLeft" && list.length > 1) show(i - 1); else if (e.key === "ArrowRight" && list.length > 1) show(i + 1); else if (e.key === "+" || e.key === "=") zoomTo(s * 1.4, lb.clientWidth / 2, lb.clientHeight / 2, true); else if (e.key === "-") zoomTo(s / 1.4, lb.clientWidth / 2, lb.clientHeight / 2, true); }
  function dist() { var k = Object.keys(pts), a = pts[k[0]], b = pts[k[1]]; return Math.hypot(a.x - b.x, a.y - b.y); }
  function mid() { var k = Object.keys(pts), a = pts[k[0]], b = pts[k[1]]; return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; }

  lb.addEventListener("pointerdown", function (e) {
    if (e.target.closest("button")) return;
    pts[e.pointerId] = { x: e.clientX, y: e.clientY };
    try { lb.setPointerCapture(e.pointerId); } catch (err) {}
    var n = Object.keys(pts).length;
    if (n === 2) { var m = mid(); pinch = { d: dist(), s: s, tx: tx, ty: ty, mx: m.x, my: m.y }; drag = null; tapAt = null; }
    else if (n === 1) { drag = { x: e.clientX, y: e.clientY, tx: tx, ty: ty, moved: false, t: Date.now() }; tapAt = { x: e.clientX, y: e.clientY }; }
  });
  lb.addEventListener("pointermove", function (e) {
    if (!pts[e.pointerId]) return;
    pts[e.pointerId] = { x: e.clientX, y: e.clientY };
    if (pinch && Object.keys(pts).length >= 2) { // two fingers: zoom, and follow the middle point
      var m = mid(), ns = Math.min(MAXZ, Math.max(1, pinch.s * dist() / pinch.d));
      var ox = pinch.mx - lb.clientWidth / 2, oy = pinch.my - lb.clientHeight / 2;
      tx = (m.x - lb.clientWidth / 2) - (ox - pinch.tx) * (ns / pinch.s);
      ty = (m.y - lb.clientHeight / 2) - (oy - pinch.ty) * (ns / pinch.s);
      s = ns; if (s === 1) { tx = 0; ty = 0; }
      limit(); put(false); tapAt = null; return;
    }
    if (drag) {
      var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (Math.abs(dx) + Math.abs(dy) > 8) { drag.moved = true; tapAt = null; }
      if (s > 1) { tx = drag.tx + dx; ty = drag.ty + dy; limit(); put(false); }
    }
  });
  function up(e) {
    if (!pts[e.pointerId]) return;
    var was = drag, left = Object.keys(pts).length;
    delete pts[e.pointerId];
    try { lb.releasePointerCapture(e.pointerId); } catch (err) {}
    if (left === 2) { // one finger stays: carry on as a drag from here
      var k = Object.keys(pts)[0]; pinch = null; drag = { x: pts[k].x, y: pts[k].y, tx: tx, ty: ty, moved: true, t: Date.now() };
      if (s < 1.05) { s = 1; tx = 0; ty = 0; put(true); }
      return;
    }
    drag = null; pinch = null;
    if (!was) return;
    var dx = e.clientX - was.x, dy = e.clientY - was.y;
    if (was.moved && s === 1 && list.length > 1 && Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) { show(i + (dx < 0 ? 1 : -1)); return; } // swipe to the next photo
    if (!was.moved && tapAt) { // a tap: double tap zooms in or back out, a tap outside the photo closes
      var now = Date.now();
      if (e.target === img) {
        if (now - lastTap < 320) { lastTap = 0; if (s > 1) zoomTo(1, e.clientX, e.clientY, true); else zoomTo(2.5, e.clientX, e.clientY, true); }
        else lastTap = now;
      } else if (e.target === lb) close();
    }
    tapAt = null;
  }
  lb.addEventListener("pointerup", up);
  lb.addEventListener("pointercancel", function (e) { delete pts[e.pointerId]; drag = null; pinch = null; tapAt = null; });
  lb.addEventListener("wheel", function (e) { e.preventDefault(); zoomTo(s * (e.deltaY < 0 ? 1.2 : 1 / 1.2), e.clientX, e.clientY, false); }, { passive: false });
  lb.addEventListener("click", function (e) {
    if (e.target.classList.contains("lb-x")) close();
    else if (e.target.classList.contains("lb-p")) show(i - 1);
    else if (e.target.classList.contains("lb-n")) show(i + 1);
  });
  var prevOverflow = document.body.style.overflow;
  document.body.style.overflow = "hidden";
  document.addEventListener("keydown", key);
  show(i); document.body.appendChild(lb);
}
// the profile photo on a profile page opens in the same zoomable viewer
function jnvZoom(a) {
  var img = a.querySelector("img");
  if (!img || img.style.display === "none" || !img.naturalWidth) return false; // no photo to show
  jnvLightbox([(img.currentSrc || img.src).replace(/=s\d+-c$/, "=s1200-c")], 0);
  return false;
}
// A slider whose box never changes size: photos sit inside a fixed 4:3 stage, never cropped,
// with a blurred copy of the photo filling any empty space. It slides by itself while visible.
function buildSlider(host, urls) {
  urls = urls.filter(Boolean);
  if (!urls.length) return;
  host.classList.add("slider");
  var stage = document.createElement("div"); stage.className = "sl-stage";
  var bg = document.createElement("div"); bg.className = "sl-bg";
  var img = document.createElement("img"); img.className = "sl-img"; img.alt = ""; img.decoding = "async";
  stage.appendChild(bg); stage.appendChild(img); host.appendChild(stage);
  var cur = 0, timer = null, busy = false, seen = false, many = urls.length > 1;
  function paint(u) { img.src = u; bg.style.backgroundImage = 'url("' + u + '")'; }
  paint(urls[0]);
  stage.addEventListener("click", function (e) { if (!e.target.closest("button")) jnvLightbox(urls, cur); });
  if (!many) return;
  var dots = document.createElement("div"); dots.className = "sl-dots";
  urls.forEach(function (u, n) { var d = document.createElement("button"); d.type = "button"; d.className = "sl-dot"; d.setAttribute("aria-label", "Photo " + (n + 1)); d.addEventListener("click", function () { go(n, true); }); dots.appendChild(d); });
  var prev = document.createElement("button"), next = document.createElement("button");
  prev.type = next.type = "button"; prev.className = "sl-btn sl-prev"; next.className = "sl-btn sl-next";
  prev.setAttribute("aria-label", "Previous photo"); next.setAttribute("aria-label", "Next photo"); prev.textContent = "‹"; next.textContent = "›";
  stage.appendChild(prev); stage.appendChild(next); stage.appendChild(dots);
  function mark() { [].forEach.call(dots.children, function (d, n) { d.classList.toggle("on", n === cur); }); }
  function go(n, byUser) {
    n = (n + urls.length) % urls.length;
    if (n === cur || busy) return;
    busy = true; img.style.opacity = 0;
    var pre = new Image();
    var done = false;
    function show() { if (done) return; done = true; cur = n; paint(urls[n]); img.style.opacity = 1; mark(); busy = false; new Image().src = urls[(n + 1) % urls.length]; }
    pre.onload = pre.onerror = function () { setTimeout(show, 140); };
    setTimeout(show, 1500); // never get stuck if a photo is slow
    pre.src = urls[n];
    if (byUser) restart();
  }
  function stop() { if (timer) { clearInterval(timer); timer = null; } }
  function restart() { stop(); if (seen) timer = setInterval(function () { if (!document.hidden) go(cur + 1); }, 3000); }
  prev.addEventListener("click", function () { go(cur - 1, true); });
  next.addEventListener("click", function () { go(cur + 1, true); });
  var x0 = null;
  stage.addEventListener("touchstart", function (e) { x0 = e.touches[0].clientX; stop(); }, { passive: true });
  stage.addEventListener("touchend", function (e) { if (x0 !== null) { var dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 40) go(cur + (dx < 0 ? 1 : -1), true); else restart(); } x0 = null; }, { passive: true });
  stage.addEventListener("touchcancel", function () { x0 = null; restart(); }, { passive: true });
  if (window.matchMedia && matchMedia("(hover: hover) and (pointer: fine)").matches) { // pause under a mouse pointer, never on touch screens
    stage.addEventListener("mouseenter", stop); stage.addEventListener("mouseleave", restart);
  }
  mark(); new Image().src = urls[1];
  // slide only while it is on screen
  if (window.IntersectionObserver) new IntersectionObserver(function (es) { seen = es[0].isIntersecting; if (seen) restart(); else stop(); }, { threshold: 0.3 }).observe(stage);
  else { seen = true; restart(); }
}
// the batch photo becomes a slider when photos have been approved for it: the cover first, then the others in random order
function makeSlider(box, coverBox) {
  var main = coverBox.querySelector("img");
  if (!main) return;
  var rest = window.JNV_SLIDES.slice();
  for (var k = rest.length - 1; k > 0; k--) { var r = Math.floor(Math.random() * (k + 1)), t = rest[k]; rest[k] = rest[r]; rest[r] = t; }
  buildSlider(coverBox, [main.getAttribute("src")].concat(rest));
}
function memoCard(t) { return t ? card("Favourite memories of Navodaya", `<blockquote class="memo">${esc(t).replace(/\n/g, "<br>")}</blockquote>`) : ""; }

function socialUrl(base, v) {
  v = String(v).trim();
  if (/^https?:\/\//i.test(v)) return v;
  if (/^(www\.)?[a-z0-9-]+(\.[a-z0-9-]+)+\//i.test(v)) return "https://" + v;
  return base + v.replace(/^@/, "");
}
function socialCard(ele) {
  var nets = [["fb","Facebook","svgFb","https://facebook.com/"],["insta","Instagram","svgInsta","https://instagram.com/"],["linkedin","LinkedIn","svgIn","https://linkedin.com/in/"],["twitter","X","svgX","https://x.com/"],["youtube","YouTube","svgYt","https://youtube.com/@"]];
  var mail = ele.EmailId ? `<a class="soc" href="mailto:${esc(mailOf(ele.EmailId))}"><i class="ico svgMail"></i>Email</a>` : "";
  var out = mail + nets.filter(function(n) { return ele[n[0]]; }).map(function(n) {
    return `<a class="soc" href="${esc(socialUrl(n[3], ele[n[0]]))}" target="_blank" rel="noopener"><i class="ico ${n[2]}"></i>${n[1]}</a>`;
  }).join("");
  return out ? `<div class="card"><h3>Connect</h3><div class="cb socs">${out}</div></div>` : "";
}

function phnDiv(a) {
 if(a) return `<div class="w100">
   <p><span class="qes">Phone No. :</span><span class="ans">${a}</span></p>
   <div class="w100 flex">
    <div class="w50" onclick="location.href='tel:${a}'"><i class="svg svgCall"></i></div>
    <div class="w50" onclick="location.href='whatsapp://send?phone=${(Number(a).toString().length<=10)? '91':''}${a}'"><i class="svg svgWp"></i></div>
  </div></div>`
else return "";
}

function ripDiv(a) {
  if(a) return `<div class="card">
      <h3>Remembering...</h3>
      <img width="100%" src="${giti}icons/grave_stone.webp">
   </div>`
   return "";
}

var visitBusy = {};
function ppVisit(a) {
  var box = document.getElementById("pv_" + a), cfg = window.JNV_COUNTER;
  if (!box || !cfg || !cfg.workspace || !cfg.key || visitBusy[a]) return;
  var name = (xii + "_" + a).toLowerCase().replace(/[^a-z0-9_-]/g, "_");
  var flag = "jnv-seen-" + name, counted = false;
  try { counted = sessionStorage.getItem(flag) === "1"; } catch(e) {}
  visitBusy[a] = true;
  fetch("https://api.counterapi.dev/v2/" + cfg.workspace + "/" + name + (counted ? "" : "/up"), {
    headers: { Authorization: "Bearer " + cfg.key }
  })
  .then(function(r) { if (!r.ok) throw new Error(r.status); return r.json(); })
  .then(function(j) {
    var d = j && j.data;
    if (!d) return;
    box.querySelector("b").textContent = ((d.up_count || 0) - (d.down_count || 0)).toLocaleString();
    box.hidden = false;
    try { sessionStorage.setItem(flag, "1"); } catch(e) {}
  })
  .catch(function() {})
  .then(function() { visitBusy[a] = false; });
}

function addrHtml(ele) {
  var out = [];
  if (ele.Address) out.push(ele.Address);
  if (ele.PinCode) out.push('<span class="qes">Pin Code :</span>' + ele.PinCode);
  if (ele.District) out.push('<span class="qes">District :</span>' + ele.District);
  return out.join("<br>");
}

function saveDiv(ele) {
  if (!ele.Phone && !ele.Phone2) return "";
  return `<div class="w100 flex"><div class="w50" style="display:block" data-key="${nameKey(ele)}" onclick="downVcardi(this.dataset.key)"><i class="svg svgContact"></i>Save as Contact</div></div>`;
}

function styDisplay(a,b,c) {
  return `style = "display: ${(!a && !b && !c)? 'none' : 'block'}"`;
}

//creating the Filter
sorting = {
  BloodGroup : ['O +ve', 'A +ve','B +ve','AB +ve','O -ve','A -ve','B -ve','AB -ve'],
  House : ['Aravali','Nilgiri','Shivalik','Udaigiri'],
  CurrentStatus : ['Studying','Employee']
}

bgInsert = document.createElement("div")
bgplText = `<strong>${all.length}</strong> Registered Alumni`
bgInsert.className = "bgpc"
bgInsert.innerHTML =`
<div class="tb-top">
  <p id="bgpl">${bgplText}</p>
  <button type="button" class="view-toggle" id="viewToggle" aria-label="Switch to grid view" aria-pressed="false" title="Grid or list view">
    <svg class="i-grid" viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="8" rx="2"/><rect x="3" y="13" width="8" height="8" rx="2"/><rect x="13" y="13" width="8" height="8" rx="2"/></svg>
    <svg class="i-list" viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><rect x="3" y="4" width="18" height="4" rx="2"/><rect x="3" y="10" width="18" height="4" rx="2"/><rect x="3" y="16" width="18" height="4" rx="2"/></svg>
  </button>
</div>
<div class="tb-filters">
  <select onchange="find(event)" id="to-find" aria-label="Filter alumni">
     <option disabled selected value="a">Filter</option>
     <option value="BloodGroup">Blood Group</option>
     <option value="House">House</option>
     <option value="CurrentStatus">Current Status</option>
  </select>
  <button type="button" onclick="erase()">Clear</button>
  <select onchange="ckFind(event)" id="getFind" aria-label="Filter value"></select>
</div>
 `;
main.insertBefore(bgInsert, main.firstChild);

//list or grid view, remembered per device
(function(){
  var btn = document.getElementById("viewToggle");
  function setView(grid) {
    main.classList.toggle("grid-view", grid);
    btn.setAttribute("aria-pressed", grid ? "true" : "false");
    btn.setAttribute("aria-label", grid ? "Switch to list view" : "Switch to grid view");
  }
  var saved = null;
  try { saved = localStorage.getItem("jnv-view"); } catch(e) {}
  setView(saved !== "list"); // grid unless they chose list before
  btn.addEventListener("click", function() {
    var grid = !main.classList.contains("grid-view");
    setView(grid);
    try { localStorage.setItem("jnv-view", grid ? "grid" : "list"); } catch(e) {}
  });
})();

getFind= document.querySelector('#getFind')
bgpl= document.getElementById('bgpl')

function find(e) {
  var findvalue = e.target.value
  getFind.style.display = 'block'
  getFind.innerHTML = `<option selected disabled value="${findvalue}">-- Select ${findvalue} --</option>`
  findSort = sorting[findvalue]
  for (let k in findSort) {
      var sel = document.createElement('option')
       sel.innerHTML = findSort[k]
       sel.value = findSort[k]
       getFind.appendChild(sel)
    }
  insertProfiles.innerHTML=''
  all.forEach(createProfile);
}

function ckFind(ev) {
 var toFind = ev.target[0].value;
  filter = all.filter(person => person[toFind] === ev.target.value)
  bgpl.innerHTML = "<strong>" + filter.length + "</strong> of " + all.length + " Alumni (" + ev.target[0].value + ": " + ev.target.value + ")"
  insertProfiles.innerHTML=''
  filter.forEach(createProfile);
  }

function erase() {
  bgpl.innerHTML= bgplText
  getFind.style.display= 'none'
  document.getElementById('to-find').value = "a"
  insertProfiles.innerHTML=''
  all.forEach(createProfile);
}

function share(key) {
  var h = findByKey(key);
  if (!h) return;
  var lines = ["*JNV Msd Batch " + batch + "*", h.Name];
  var phones = [h.Phone, h.Phone2].filter(Boolean);
  if (phones.length) { phones.forEach(function(p) { lines.push("   " + p); }); }
  else if (h.EmailId) { lines.push("   " + mailOf(h.EmailId)); }
  var text = lines.join("\n") + "\n\n" + location.origin + "/" + xii + "#" + key;
  if (navigator.share) {
    navigator.share({ title: "JNV MSD Batch " + batch, text: text }).catch(function() {});
  } else {
    window.open("whatsapp://send?text=" + encodeURIComponent(text));
  }
}

//save as contact (.vcf), vcard.js is loaded from the repo only when needed
function withVcard(cb) {
  if (window.vCard) return cb();
  var sc = document.createElement("script");
  sc.src = git + "vcard.js";
  sc.onload = cb;
  sc.onerror = function() { alert("Could not load the contact helper. Please try again."); };
  document.head.appendChild(sc);
}

function downVcardi(key) {
  var h = findByKey(key);
  if (!h) return;
  var g = { version: "2.1", fn: h.Name + " " + String(h.Batch || xii).slice(2) + " Jnv" };
  var tel = [];
  [h.Phone, h.Phone2].forEach(function(p) { if (p) tel.push({ value: ph91(p), type: "Phone" }); });
  if (tel.length) g.tel = tel;
  if (h.EmailId) g.email = [{ value: mailOf(h.EmailId), type: "Personal" }];
  withVcard(function() { vCard.export(g, g.fn, true); });
}

//---------- open / close a profile (works on Android, iOS and desktop) ----------
function openProfile(vessel) {
  var d = vessel.querySelector(".contentBox");
  vessel.classList.remove("collapsed");
  d.removeAttribute("hidden");
  d.classList.add("active");
  document.body.style.overflow = "hidden";
  if (location.hash !== "#" + d.id) history.pushState({ jnvOpen: 1 }, "", "#" + d.id);
  ppVisit(d.id);
}
function closeProfile(vessel) {
  var d = vessel.querySelector(".contentBox");
  vessel.classList.add("collapsed");
  d.setAttribute("hidden", "until-found");
  d.classList.remove("active");
  document.body.style.overflow = "scroll";
}

// one listener for all tiles, including tiles re-created by the filters
insertProfiles.addEventListener("click", function (e) {
  var a = e.target.closest(".nameBox");
  if (!a) return;
  e.preventDefault();
  var v = a.closest(".vessels");
  if (v.classList.contains("collapsed")) openProfile(v); else closeProfile(v);
});

// Chrome find-in-page reveal
insertProfiles.addEventListener("beforematch", function (e) {
  var v = e.target.closest(".vessels");
  if (v) openProfile(v);
});

// the back arrow inside a profile
function doh2(el) {
  if (history.state && history.state.jnvOpen) {
    history.back(); // the popstate listener below closes the profile
  } else { // opened from a shared link, nothing was pushed
    closeProfile(el.closest(".vessels"));
    history.replaceState(null, "", location.pathname + location.search);
  }
}

// phone Back button / swipe-back closes the open profile
window.addEventListener("popstate", function () {
  var d = document.querySelector(".contentBox.active");
  if (d) closeProfile(d.closest(".vessels"));
});

// a shared link like /2018#Name opens that profile on load
(function () {
  var id = decodeURIComponent(location.hash.slice(1));
  var d = id && document.getElementById(id);
  if (d && d.classList.contains("contentBox")) openProfile(d.closest(".vessels"));
})();
  
  for (i=y+7;i<=year;i++) {
var batches = document.createElement("div");
batches.className="boxBatch";
batches.innerHTML = `
<a class="batch" href="/${i}">
      <img class="coverb" src="${giti}cover/${i}.jpg" alt="Batch ${i}" onerror="this.src='${giti}cover/Jnv_Murshidabad.jpg'">
      <div class="form-link">Batch 
      ${i-y-6}${nth(i-y-6)} (${i-7} - ${i})
      </div>
    </a>`;
document.getElementById("other").append(batches);
}


//---------- sign in with the Gmail of this profile ----------
function isOwn(ele) {
  var m = window.JNV_ME && window.JNV_ME.member;
  if (!m || !ele) return false;
  var n = String(ele.Name || "").toLowerCase(), mine = [m.name, m.data && m.data.Name].map(function(x) { return String(x || "").toLowerCase(); });
  return Number(m.batch) === Number(ele.Batch) && mine.indexOf(n) > -1;
}
function whenGsi(cb, n) {
  if (window.google && google.accounts && google.accounts.id) return cb();
  if (!n) { var s = document.createElement("script"); s.src = "https://accounts.google.com/gsi/client"; s.async = true; document.head.appendChild(s); }
  if ((n || 0) > 100) return;
  setTimeout(function() { whenGsi(cb, (n || 0) + 1); }, 100);
}
function jnvSignIn(btn) {
  var ele = findByKey(btn.dataset.key), card = btn.closest(".hero"), box = card.querySelector(".gs-box");
  if (!ele) return;
  if (!box.hidden) { box.hidden = true; return; }
  var hint = mailOf(ele.EmailId), API = window.JNV_API || "https://api.jnvmurshidabad.workers.dev";
  var CLIENT = window.JNV_CLIENT || "1019761610975-qba21qjqvvlr8kbeda7sut319m6gnt2f.apps.googleusercontent.com";
  box.hidden = false;
  box.innerHTML = `<p class="gs-t">Sign in with <b>${esc(hint)}</b></p><div class="gs-btn"></div><p class="gs-err" role="alert" hidden></p>`;
  var err = box.querySelector(".gs-err");
  whenGsi(function() {
    google.accounts.id.initialize({
      client_id: CLIENT, auto_select: false, cancel_on_tap_outside: false, login_hint: hint,
      callback: function(r) {
        // the server decides whether this Gmail owns this profile
        fetch(API + "/api/me", { headers: { Authorization: "Bearer " + r.credential } })
          .then(function(x) { return x.ok ? x.json() : null; })
          .then(function(j) {
            var keep = window.JNV_ME; window.JNV_ME = j;
            if (j && isOwn(ele)) {
              // trade the one hour Google sign-in for a 30 day session, then reload on the same profile
              var saveHour = function() { try { localStorage.setItem("jnv-id-token", r.credential); } catch (e) {} };
              fetch(API + "/api/session", { method: "POST", headers: { Authorization: "Bearer " + r.credential } })
                .then(function(x) { return x.ok ? x.json() : null; })
                .then(function(sx) { try { if (sx) localStorage.setItem("jnv-session", JSON.stringify({ t: sx.session, user: sx.user })); else saveHour(); } catch (e) {} location.reload(); })
                .catch(function() { saveHour(); location.reload(); });
            } else {
              window.JNV_ME = keep;
              err.textContent = "That Gmail is not linked to this profile. Please use " + hint + ".";
              err.hidden = false;
            }
          }).catch(function() { err.textContent = "Could not check the sign-in. Please try again."; err.hidden = false; });
      }
    });
    google.accounts.id.renderButton(box.querySelector(".gs-btn"), { theme: "filled_blue", size: "large", shape: "pill", text: "signin_with" });
  });
}