/* ============================================================
   FOCUS STUDIO — logica
   Posters worden als DOM opgebouwd, live geschaald, en bij
   download via SVG-foreignObject → canvas als PNG geëxporteerd
   (fonts + afbeeldingen als data-URI, dus pixel-perfect).
   ============================================================ */

(() => {
"use strict";

const $  = (s, el) => (el || document).querySelector(s);
const $$ = (s, el) => [...(el || document).querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));

const state = {
  template: "tekoop",
  formaat: "f45",
  vestiging: "Helmond",
  gloed: true,
  fotoOrigineel: null,   // data-URL zoals aangeleverd
  fotoGloed: null,       // data-URL met warme gloed
  fotoIsUpload: false,
  velden: {},
  teamlid: FOCUS.team[0].id
};

const FORMAAT_H = { f45: 1350, f11: 1080, f916: 1920 };

const telIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.9.5 2.8.7a2 2 0 0 1 1.8 2Z"/></svg>`;

/* ---------- assets: logo + standaardfoto's ---------- */
const cache = { logo: null, fonts: null, posterCSS: null, fotos: {} };

async function laadLogo() {
  if (cache.logo) return cache.logo;
  const txt = await (await fetch("../assets/logo/logo-liggend-warm-oranje.svg")).text();
  cache.logo = txt
    .replace(/<\?xml[^?]*\?>/, "")
    .replace(/style="fill:[^"]*"/g, 'fill="currentColor"')
    .replace(/fill="#[0-9a-fA-F]{3,8}"/g, 'fill="currentColor"');
  return cache.logo;
}

function naarDataURL(blob) {
  return new Promise(res => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(blob); });
}
async function fetchDataURL(url) {
  if (cache.fotos[url]) return cache.fotos[url];
  const b = await (await fetch(url)).blob();
  return (cache.fotos[url] = await naarDataURL(b));
}
function laadImg(src) {
  return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
}

// geen voorbeeldfoto's: de placeholder maakt duidelijk dat hier de upload komt
const STANDAARD_FOTO = { tekoop: null, verkocht: null, openhuis: null };

function placeholderInhoud(donker) {
  return `<div class="p-placeholder${donker ? " p-placeholder--donker" : ""}">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="3"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
    <strong>Hier komt jouw woningfoto</strong>
    <span class="serif">upload of sleep &#8217;m in het linkerpaneel</span>
  </div>`;
}
function fotoBlok(extraClass) {
  if (fotoSrc()) return `<div class="p-photo ${extraClass}"><img src="${fotoSrc()}" alt=""></div>`;
  return `<div class="p-photo ${extraClass}">${placeholderInhoud(false)}</div>`;
}

/* ---------- warme gloed (fotorecept uit het brandbook) ---------- */
async function warmeGloed(dataURL) {
  const img = await laadImg(dataURL);
  const schaal = Math.min(1, 1600 / img.width);
  const w = Math.round(img.width * schaal), h = Math.round(img.height * schaal);
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const ctx = c.getContext("2d");
  ctx.drawImage(img, 0, 0, w, h);

  const d = ctx.getImageData(0, 0, w, h), a = d.data;
  for (let i = 0; i < a.length; i += 4) {
    a[i]     = Math.min(255, a[i] * 1.07 + 3);   // R
    a[i + 1] = Math.min(255, a[i + 1] * 1.005);  // G
    a[i + 2] = a[i + 2] * 0.86;                  // B
  }
  ctx.putImageData(d, 0, 0);

  ctx.globalCompositeOperation = "screen";       // gouden gloed rechtsboven
  const g = ctx.createRadialGradient(w * .85, h * .05, 0, w * .85, h * .05, Math.max(w, h) * .9);
  g.addColorStop(0, "rgba(246,135,31,.28)");
  g.addColorStop(.5, "rgba(246,135,31,.10)");
  g.addColorStop(1, "rgba(246,135,31,0)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);

  ctx.globalCompositeOperation = "source-over";  // 4,5% warm-oranje-zweem
  ctx.fillStyle = "rgba(241,93,34,.045)";
  ctx.fillRect(0, 0, w, h);

  const c2 = document.createElement("canvas"); c2.width = w; c2.height = h;
  const x2 = c2.getContext("2d");
  x2.filter = "contrast(1.05) saturate(.96) brightness(1.02)";
  x2.drawImage(c, 0, 0);
  return c2.toDataURL("image/jpeg", .92);
}

/* ---------- klantreis-pad (decoratief) ---------- */
function padStrip() {
  let d = "", x = 0; const y = 44, r = 34, dash = 52, gap = 26;
  for (let i = 0; i < 5; i++) {
    d += `M${x} ${y} h${dash} `; x += dash + gap;
    d += `M${x} ${y} a${r} ${r} 0 0 1 ${r * 2} 0 `; x += r * 2 + gap;
  }
  return `<svg viewBox="0 0 ${x} 60" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMinYMid meet"><path d="${d}" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round"/></svg>`;
}

/* ---------- veld-definities per sjabloon ---------- */
const SJABLONEN = {
  tekoop: {
    naam: "Te koop", foto: true,
    velden: [
      { id: "kicker", label: "Label", type: "select", opties: ["Te koop", "Nieuw in de verkoop", "Binnenkort te koop", "Te huur"], std: "Te koop" },
      { id: "straat", label: "Straat + huisnummer", std: "Voorbeeldstraat 12" },
      { id: "plaats", label: "Plaats", std: "Helmond" },
      { id: "prijs",  label: "Prijs (leeg = verbergen)", std: "€ 425.000 k.k." },
      { id: "toelichting", label: "Toelichting (max ±3 regels, leeg = verbergen)", type: "textarea", std: "" }
    ]
  },
  verkocht: {
    naam: "Verkocht", foto: true,
    velden: [
      { id: "badge", label: "Badge", type: "select", opties: ["— geen —", "Boven de vraagprijs", "Binnen één week", "Stille verkoop"], std: "Boven de vraagprijs" },
      { id: "adres", label: "Adres (klein, leeg = verbergen)", std: "Voorbeeldstraat 12 · Helmond" },
      { id: "sub",   label: "Boodschap", type: "textarea", std: "Óók benieuwd wat jouw woning waard is? Wij kijken graag met je mee." }
    ]
  },
  openhuis: {
    naam: "Open huis", foto: true,
    velden: [
      { id: "datum", label: "Datum", std: "Zaterdag 14 september" },
      { id: "tijd",  label: "Tijd", std: "11:00 – 13:00 uur" },
      { id: "waar",  label: "Adres", std: "Voorbeeldstraat 12, Helmond" }
    ]
  },
  gezocht: {
    naam: "Gezocht", foto: false,
    velden: [
      { id: "wat",  label: "Wat zoeken we?", std: "Gezinswoning met tuin" },
      { id: "waar", label: "Waar?", std: "in Helmond of omgeving" },
      { id: "chip1", label: "Kenmerk 1", std: "budget tot € 550.000" },
      { id: "chip2", label: "Kenmerk 2", std: "4+ slaapkamers" },
      { id: "chip3", label: "Kenmerk 3 (leeg = verbergen)", std: "instapklaar" }
    ]
  },
  team: {
    naam: "Team", foto: false,
    velden: [
      { id: "teamlid", label: "Teamlid", type: "teamlid" },
      { id: "quote", label: "Quote", type: "textarea", std: "Achter iedere woning zit een verhaal. Daar begint mijn werk." }
    ]
  },
  markt: {
    naam: "Marktupdate", foto: false,
    velden: [
      { id: "cijfer", label: "Het cijfer", std: "+4,1%" },
      { id: "label",  label: "Wat is het?", std: "gemiddelde prijsstijging in Helmond, het afgelopen jaar" },
      { id: "duiding", label: "Wat betekent het?", type: "textarea", std: "Wat betekent dit voor jouw woning? We vertellen het je graag — persoonlijk." },
      { id: "bron",   label: "Bron", std: "Bron: NVM · Q2 2026" }
    ]
  }
};

/* ---------- poster-html per sjabloon ---------- */
function brandrow(kleur, chip) {
  return `<div class="p-brandrow"><span class="p-logo" style="color:${kleur}">${cache.logo}</span>${chip ? `<span class="p-chip" style="color:${kleur}">${chip}</span>` : ""}</div>`;
}
function bottomrow(tel) {
  return `<div class="p-bottom"><span class="p-tel">${telIcon}${esc(tel)}</span><span class="p-site">${FOCUS.site}</span></div>`;
}
function fotoSrc() {
  return (state.gloed && state.fotoGloed) ? state.fotoGloed : state.fotoOrigineel;
}

const RENDER = {
  tekoop(v, tel) {
    const toel = (v.toelichting || "").trim();
    return `<div class="p-pad">
      ${brandrow("var(--warm-oranje)")}
      ${fotoBlok("p-rond" + (toel ? " p-photo--kort" : ""))}
      <span class="p-kicker">${esc(v.kicker)}</span>
      <div class="p-straat" data-fit="46">${esc(v.straat)}</div>
      <div class="p-plaats serif">${esc(v.plaats)}</div>
      ${v.prijs ? `<div class="p-prijsrow"><span class="p-pill">${esc(v.prijs)}</span></div>` : ""}
      ${toel ? `<div class="p-toelichting">${esc(toel).replace(/\n/g, "<br/>")}</div>` : ""}
      ${bottomrow(tel)}
    </div>`;
  },
  verkocht(v, tel) {
    const foto = fotoSrc();
    return `${foto
      ? `<div class="p-fullphoto"><img src="${foto}" alt=""></div><div class="p-scrim"></div>`
      : `<div class="p-fullphoto">${placeholderInhoud(true)}</div>`}
    <div class="p-pad">
      ${brandrow("var(--helder-beige)")}
      <div class="p-badge">${v.badge && v.badge !== "— geen —" ? `<span class="p-pill">${esc(v.badge)}</span>` : ""}</div>
      <div class="p-groot">Verkocht.</div>
      ${v.adres ? `<div class="p-adreslabel">${esc(v.adres)}</div>` : ""}
      <div class="p-sub serif" data-fit="30">${esc(v.sub)}</div>
      ${bottomrow(tel)}
    </div>`;
  },
  openhuis(v, tel) {
    return `<div class="p-pad">
      ${brandrow("var(--warm-oranje)")}
      <span class="p-kicker">Open huis</span>
      <div class="p-datum" data-fit="48">${esc(v.datum)}</div>
      <div class="p-tijd">${esc(v.tijd)}</div>
      <div class="p-waar serif">${esc(v.waar)}</div>
      <span class="p-pill">Loop vrijblijvend binnen</span>
      ${fotoBlok("")}
      ${bottomrow(tel)}
    </div>`;
  },
  gezocht(v, tel) {
    const chips = [v.chip1, v.chip2, v.chip3].filter(Boolean).map(c => `<span>${esc(c)}</span>`).join("");
    return `<div class="p-beeldmerk-bg">${beeldmerkSVG()}</div>
    <div class="p-pad">
      ${brandrow("var(--helder-beige)")}
      <span class="p-kicker">Gezocht voor onze zoeker</span>
      <div class="p-wat" data-fit="52">${esc(v.wat)}</div>
      <div class="p-waar serif">${esc(v.waar)}</div>
      ${chips ? `<div class="p-chips">${chips}</div>` : ""}
      <div class="p-cta">Herken jij jouw woning hierin?<br><span class="serif">Bel ons dan even.</span></div>
      ${bottomrow(tel)}
    </div>`;
  },
  team(v, tel) {
    const lid = FOCUS.team.find(t => t.id === state.teamlid) || FOCUS.team[0];
    return `<div class="p-beeldmerk-bg">${beeldmerkSVG()}</div>
    <div class="p-pad">
      ${brandrow("var(--warm-oranje)")}
      <div class="p-portret"><img src="${v._teamfoto || ""}" alt=""></div>
      <div class="p-quote serif" data-fit="34">${esc(v.quote)}</div>
      <div class="p-wie">
        <div class="p-naam">${esc(lid.naam)}</div>
        <div class="p-rol">${esc(lid.rol)} · Focus Makelaars ${esc(lid.vestiging)}</div>
      </div>
      ${bottomrow(tel)}
    </div>`;
  },
  markt(v, tel) {
    return `<div class="p-pad">
      ${brandrow("var(--warm-oranje)")}
      <span class="p-kicker">Marktupdate</span>
      <div class="p-cijfer" data-fit="120">${esc(v.cijfer)}</div>
      <div class="p-cijferlabel" data-fit="34">${esc(v.label)}</div>
      <div class="p-duiding serif">${esc(v.duiding)}</div>
      <div class="p-pad-strip">${padStrip()}</div>
      <div class="p-bron">${esc(v.bron)}</div>
      ${bottomrow(tel)}
    </div>`;
  }
};

/* ---------- render ---------- */
let renderTeller = 0;
async function render() {
  const mijnBeurt = ++renderTeller;
  await laadLogo();

  // standaardfoto klaarzetten indien nodig
  const sj = SJABLONEN[state.template];
  if (sj.foto && !state.fotoIsUpload) {
    const url = STANDAARD_FOTO[state.template];
    state.fotoOrigineel = url ? await fetchDataURL(url) : null;
    if (mijnBeurt !== renderTeller) return;
    state.fotoGloed = null; // brandfoto's zijn al warm gegradeerd
  }
  const velden = { ...state.velden };
  if (state.template === "team") {
    const lid = FOCUS.team.find(t => t.id === state.teamlid) || FOCUS.team[0];
    velden._teamfoto = await fetchDataURL(`../assets/img/team/${lid.id}.jpg`);
    if (mijnBeurt !== renderTeller) return;
  }

  const tel = FOCUS.vestigingen[state.vestiging].telefoon;
  const host = $("#posterHost");
  host.innerHTML = `<div class="poster ${state.formaat} t-${state.template}" id="poster">${RENDER[state.template](velden, tel)}</div>`;

  pasTekstAan($("#poster"));
  schaalPodium();
}

/* tekst die niet past stapsgewijs verkleinen */
function pasTekstAan(poster) {
  $$("[data-fit]", poster).forEach(el => {
    const min = parseInt(el.dataset.fit, 10) || 30;
    let maat = parseFloat(getComputedStyle(el).fontSize);
    let bewaker = 40;
    while (bewaker-- && maat > min && (el.scrollWidth > el.clientWidth + 2 || el.scrollHeight > el.clientHeight + 2)) {
      maat -= 3;
      el.style.fontSize = maat + "px";
    }
  });
}

function schaalPodium() {
  const podium = $(".podium"), poster = $("#poster");
  if (!poster) return;
  const beschikbaarB = podium.clientWidth - 80;
  const beschikbaarH = podium.clientHeight - 80;
  const s = Math.min(beschikbaarB / 1080, beschikbaarH / FORMAAT_H[state.formaat], .85);
  $("#podiumSchaal").style.transform = `scale(${s})`;
  $("#podiumSchaal").style.width = "1080px";
  $("#podiumSchaal").style.height = FORMAAT_H[state.formaat] + "px";
}

/* ---------- inputs opbouwen ---------- */
function bouwInputs() {
  const wrap = $("#inputsWrap");
  const sj = SJABLONEN[state.template];
  wrap.innerHTML = "";
  sj.velden.forEach(v => {
    const div = document.createElement("div");
    if (v.type === "select") {
      div.innerHTML = `<label>${v.label}</label><select class="select" data-veld="${v.id}">` +
        v.opties.map(o => `<option${o === (state.velden[v.id] ?? v.std) ? " selected" : ""}>${esc(o)}</option>`).join("") + `</select>`;
    } else if (v.type === "teamlid") {
      div.innerHTML = `<label>${v.label}</label><select class="select" data-veld="teamlid">` +
        FOCUS.team.map(t => `<option value="${t.id}"${t.id === state.teamlid ? " selected" : ""}>${esc(t.naam)} — ${esc(t.vestiging)}</option>`).join("") + `</select>`;
    } else if (v.type === "textarea") {
      div.innerHTML = `<label>${v.label}</label><textarea data-veld="${v.id}">${esc(state.velden[v.id] ?? v.std)}</textarea>`;
    } else {
      div.innerHTML = `<label>${v.label}</label><input type="text" data-veld="${v.id}" value="${esc(state.velden[v.id] ?? v.std)}">`;
    }
    wrap.appendChild(div);
    if (v.id !== "teamlid") state.velden[v.id] = state.velden[v.id] ?? v.std;
  });
  $("#fotoVeld").classList.toggle("is-verborgen", !sj.foto);
}

/* ---------- PNG-export ---------- */
async function fontsAlsCSS() {
  if (cache.fonts) return cache.fonts;
  const defs = [
    ["Silka-Regular.woff2", 400, "normal", "Silka"],
    ["Silka-Medium.woff2", 500, "normal", "Silka"],
    ["Silka-SemiBold.woff2", 600, "normal", "Silka"],
    ["Silka-Bold.woff2", 700, "normal", "Silka"],
    ["Silka-Black.woff2", 900, "normal", "Silka"],
    ["STIXTwoTextItalic-Var.woff2", "400 600", "italic", "STIX Two Text"]
  ];
  const stukken = await Promise.all(defs.map(async ([file, w, stijl, fam]) => {
    const buf = await (await fetch(`../assets/fonts/${file}`)).arrayBuffer();
    let bin = ""; const bytes = new Uint8Array(buf);
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return `@font-face{font-family:"${fam}";src:url(data:font/woff2;base64,${btoa(bin)}) format("woff2");font-weight:${w};font-style:${stijl};}`;
  }));
  return (cache.fonts = stukken.join("\n"));
}
async function posterCSSTekst() {
  if (cache.posterCSS) return cache.posterCSS;
  return (cache.posterCSS = await (await fetch("poster.css?v=5")).text());
}

async function downloadPNG() {
  const knop = $("#downloadBtn");
  knop.classList.add("is-bezig");
  $("#downloadHint").textContent = "Bezig met renderen…";
  try {
    const poster = $("#poster");
    const h = FORMAAT_H[state.formaat];
    const [fonts, css] = await Promise.all([fontsAlsCSS(), posterCSSTekst()]);

    const kloon = poster.cloneNode(true);
    kloon.style.margin = "0";
    const wrap = document.createElement("div");
    wrap.appendChild(kloon);

    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="${h}">` +
      `<foreignObject width="100%" height="100%">` +
      `<div xmlns="http://www.w3.org/1999/xhtml"><style>${fonts}\n${css}</style>` +
      new XMLSerializer().serializeToString(wrap.firstChild) +
      `</div></foreignObject></svg>`;

    const img = await laadImg("data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg));
    // fonts in SVG-images hebben soms een tik nodig
    await new Promise(r => setTimeout(r, 120));

    const canvas = $("#werkCanvas");
    canvas.width = 1080; canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, 1080, h);

    const blob = await new Promise(r => canvas.toBlob(r, "image/png"));
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `focus-${state.template}-${state.formaat.replace("f", "")}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    $("#downloadHint").textContent = "Gedownload! Klaar om te posten.";
  } catch (e) {
    console.error(e);
    $("#downloadHint").textContent = "Er ging iets mis — probeer opnieuw.";
  }
  knop.classList.remove("is-bezig");
  setTimeout(() => { $("#downloadHint").textContent = "1080 px, klaar voor Instagram & Facebook"; }, 4000);
}

/* ---------- e-mailhandtekening ---------- */
function sigHTML(lid) {
  const vest = FOCUS.vestigingen[lid.vestiging];
  const fotoURL = `${FOCUS.siteUrl}assets/img/team/${lid.id}.jpg`;
  const o = FOCUS.kleuren.warmOranje, z = FOCUS.kleuren.pupilZwart, b = FOCUS.kleuren.irisBruin;
  return `<table cellpadding="0" cellspacing="0" border="0" style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:${z};line-height:1.5">
  <tr>
    <td style="padding-right:18px;vertical-align:top">
      <img src="${fotoURL}" width="84" height="84" alt="${esc(lid.naam)}" style="display:block;width:84px;height:84px;border-radius:50%;object-fit:cover">
    </td>
    <td style="border-left:3px solid ${o};padding-left:18px;vertical-align:top">
      <div style="font-size:16px;font-weight:bold;color:${z}">${esc(lid.naam)}</div>
      <div style="color:${b};padding-bottom:6px">${esc(lid.rol)}</div>
      <div style="font-weight:bold;color:${o};padding-bottom:8px">FOCUS MAKELAARS&nbsp;&nbsp;·&nbsp;&nbsp;${esc(lid.vestiging)}</div>
      <div>${esc(vest.adres)}</div>
      <div>M&nbsp;<a href="tel:${lid.tel.replace(/[^\d+]/g, "")}" style="color:${z};text-decoration:none">${esc(lid.tel)}</a>&nbsp;&nbsp;·&nbsp;&nbsp;T&nbsp;<a href="tel:${vest.telefoon.replace(/[^\d+]/g, "")}" style="color:${z};text-decoration:none">${esc(vest.telefoon)}</a></div>
      <div><a href="mailto:${esc(lid.mail)}" style="color:${z};text-decoration:underline">${esc(lid.mail)}</a>&nbsp;&nbsp;·&nbsp;&nbsp;<a href="https://www.focusmakelaars.nl" style="color:${o};text-decoration:none;font-weight:bold">focusmakelaars.nl</a></div>
      <div style="font-family:Georgia,serif;font-style:italic;color:${o};padding-top:8px">met oog voor jou</div>
    </td>
  </tr>
</table>`;
}
function huidigLid() {
  return FOCUS.team.find(t => t.id === $("#sigTeamlid").value) || FOCUS.team[0];
}
function renderSig() {
  const html = sigHTML(huidigLid());
  $("#sigPreview").innerHTML = html;
  $("#sigCode").textContent = html;
}
function flashHint(el, tekst, terug) {
  el.textContent = tekst;
  setTimeout(() => { el.textContent = terug; }, 4000);
}
async function kopieerSig() {
  const html = $("#sigPreview").innerHTML;
  const plat = $("#sigPreview").innerText;
  try {
    await navigator.clipboard.write([new ClipboardItem({
      "text/html": new Blob([html], { type: "text/html" }),
      "text/plain": new Blob([plat], { type: "text/plain" })
    })]);
    $("#sigHint").textContent = "Gekopieerd! Plak 'm in je mailprogramma.";
  } catch {
    const sel = window.getSelection(), range = document.createRange();
    range.selectNodeContents($("#sigPreview"));
    sel.removeAllRanges(); sel.addRange(range);
    document.execCommand("copy"); sel.removeAllRanges();
    $("#sigHint").textContent = "Gekopieerd via selectie — plak 'm in je mail.";
  }
  setTimeout(() => { $("#sigHint").textContent = "Wordt gekopieerd mét opmaak"; }, 4000);
}

/* ---------- events ---------- */
function init() {
  $("#topBeeldmerk").innerHTML = beeldmerkSVG();

  // vestigingen
  const vs = $("#vestigingSelect");
  vs.innerHTML = Object.keys(FOCUS.vestigingen).map(v => `<option${v === state.vestiging ? " selected" : ""}>${v}</option>`).join("");
  vs.addEventListener("change", () => { state.vestiging = vs.value; render(); });

  // sjabloon-tegels
  $("#templateKeuze").addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b) return;
    $$("#templateKeuze button").forEach(x => x.classList.toggle("is-active", x === b));
    state.template = b.dataset.t;
    state.velden = {};
    state.fotoIsUpload = false;
    bouwInputs(); render();
  });

  // formaat
  $("#formaatKeuze").addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b) return;
    $$("#formaatKeuze button").forEach(x => x.classList.toggle("is-active", x === b));
    state.formaat = b.dataset.f;
    render();
  });

  // inputs (delegatie)
  $("#inputsWrap").addEventListener("input", e => {
    const veld = e.target.dataset.veld; if (!veld) return;
    if (veld === "teamlid") {
      state.teamlid = e.target.value;
      const lid = FOCUS.team.find(t => t.id === state.teamlid);
      if (lid) { state.vestiging = lid.vestiging; $("#vestigingSelect").value = lid.vestiging; }
    } else state.velden[veld] = e.target.value;
    render();
  });

  // foto
  const drop = $("#dropzone"), input = $("#fotoInput");
  drop.addEventListener("click", () => input.click());
  input.addEventListener("change", () => input.files[0] && nieuweFoto(input.files[0]));
  ["dragover", "dragenter"].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add("is-over"); }));
  ["dragleave", "drop"].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove("is-over"); }));
  drop.addEventListener("drop", e => e.dataTransfer.files[0] && nieuweFoto(e.dataTransfer.files[0]));

  async function nieuweFoto(file) {
    const d = await naarDataURL(file);
    state.fotoOrigineel = d;
    state.fotoIsUpload = true;
    $("#dropTekst").textContent = "Andere foto kiezen";
    drop.classList.add("heeft-foto");
    drop.style.backgroundImage = `url(${d})`;
    render();                       // meteen tonen
    state.fotoGloed = await warmeGloed(d);
    render();                       // en dan met gloed
  }

  $("#gloedToggle").addEventListener("change", e => { state.gloed = e.target.checked; render(); });
  $("#downloadBtn").addEventListener("click", downloadPNG);

  // tabs
  $$(".tab").forEach(t => t.addEventListener("click", () => {
    $$(".tab").forEach(x => x.classList.toggle("is-active", x === t));
    $("#tab-social").classList.toggle("is-verborgen", t.dataset.tab !== "social");
    $("#tab-handtekening").classList.toggle("is-verborgen", t.dataset.tab !== "handtekening");
    if (t.dataset.tab === "social") schaalPodium();
  }));

  // handtekening
  const st = $("#sigTeamlid");
  st.innerHTML = FOCUS.team.map(t => `<option value="${t.id}">${esc(t.naam)} — ${esc(t.vestiging)}</option>`).join("");
  st.addEventListener("change", renderSig);
  $("#sigKopieer").addEventListener("click", kopieerSig);
  $("#sigHtmlKopieer").addEventListener("click", async () => {
    await navigator.clipboard.writeText($("#sigCode").textContent);
    flashHint($("#sigCrmHint"), "HTML-code gekopieerd — plak 'm in Realworks.", "De code staat ook onder het voorbeeld");
  });
  $("#sigHtmlDownload").addEventListener("click", () => {
    const lid = huidigLid();
    const doc = `<!DOCTYPE html>\n<html lang="nl"><head><meta charset="UTF-8"><title>E-mailhandtekening ${esc(lid.naam)} — Focus Makelaars</title></head><body>\n${$("#sigCode").textContent}\n</body></html>`;
    const blob = new Blob([doc], { type: "text/html" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `focus-handtekening-${lid.id}.html`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    flashHint($("#sigCrmHint"), "Gedownload!", "De code staat ook onder het voorbeeld");
  });
  renderSig();

  window.addEventListener("resize", schaalPodium);

  bouwInputs();
  render();
}

document.addEventListener("DOMContentLoaded", init);
})();
