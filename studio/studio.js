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
  gloed: false,
  qrAan: false, // QR-chip op social posts: optioneel, standaard uit
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
function fotoBlok(extraClass, qr) {
  const chip = qr ? `<span class="p-qrchip"><img src="${qr}" alt=""><em>scan voor alles</em></span>` : "";
  if (fotoSrc()) return `<div class="p-photo ${extraClass}"><img src="${fotoSrc()}" alt="">${chip}</div>`;
  return `<div class="p-photo ${extraClass}">${placeholderInhoud(false)}${chip}</div>`;
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
      ${fotoBlok("p-rond" + (toel ? " p-photo--kort" : ""), state.qrAan ? state.woningQR : null)}
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
      ${fotoBlok("", state.qrAan ? state.woningQR : null)}
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
  return (cache.posterCSS = await (await fetch("poster.css?v=6")).text());
}

async function downloadPNG() {
  const knop = $("#downloadBtn");
  knop.classList.add("is-bezig");
  $("#downloadHint").textContent = "Bezig met renderen…";
  try {
    const { blob, naam } = await maakPosterPNG();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = naam;
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

async function maakPosterPNG() {
  {
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
    return { blob, naam: `focus-${state.template}-${state.formaat.replace("f", "")}.png` };
  }
}

/* Direct delen via het native deelmenu (mobiel → Instagram/Facebook-apps) */
async function deelPNG() {
  const knop = $("#deelBtn");
  knop.classList.add("is-bezig");
  $("#downloadHint").textContent = "Bezig met renderen…";
  try {
    const { blob, naam } = await maakPosterPNG();
    const bestand = new File([blob], naam, { type: "image/png" });
    if (navigator.canShare && navigator.canShare({ files: [bestand] })) {
      await navigator.share({ files: [bestand] });
      $("#downloadHint").textContent = "Gedeeld!";
    } else {
      // desktop-fallback: gewoon downloaden
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = naam;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      $("#downloadHint").textContent = "Delen werkt op je telefoon — hier gedownload.";
    }
  } catch (e) {
    if (e && e.name !== "AbortError") $("#downloadHint").textContent = "Delen lukte niet — probeer downloaden.";
    else $("#downloadHint").textContent = "Delen geannuleerd.";
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

/* ---------- Realworks-koppeling (lokale proxy óf teamtunnel; token blijft op Robbies PC) ---------- */
let RW_PROXY = "http://127.0.0.1:8465";
const RW_SLEUTEL = "fs-x7q9-oog-2026";
let rwObjecten = [];
let wnVulFn = null, brVulFn = null; // worden gezet door wnInit/brInit, aangeroepen zodra objecten binnen zijn

function rwFetch(pad, opts) {
  opts = opts || {};
  opts.headers = Object.assign({}, opts.headers, { "X-Studio-Sleutel": RW_SLEUTEL });
  return fetch(RW_PROXY + pad, opts);
}

async function rwVerbind() {
  // 1) lokale proxy (Robbies PC), 2) gepubliceerde teamtunnel-URL
  try {
    const r = await rwFetch("/gezond", { signal: AbortSignal.timeout(2000) });
    if (r.ok) return true;
  } catch {}
  try {
    const pub = await (await fetch("api-url.json?cb=" + Date.now())).json();
    if (pub && pub.url) {
      RW_PROXY = pub.url.replace(/\/$/, "");
      const r = await rwFetch("/gezond", { signal: AbortSignal.timeout(6000) });
      if (r.ok) return true;
    }
  } catch {}
  return false;
}
let rwActief = null; // { tekoop:{...}, verkocht:{...}, openhuis:{...}, foto, fotoGloed }

const RW_STATUS_KICKER = {
  BESCHIKBAAR: "Te koop", IN_AANMELDING: "Binnenkort te koop",
  IN_VOORBEREIDING: "Binnenkort te koop", ONDER_BOD: "Te koop"
};

async function rwInit() {
  try {
    if (!await rwVerbind()) return;
    rwObjecten = (await (await rwFetch("/objecten")).json()).objecten || [];
    if (!rwObjecten.length) return;
    const sel = $("#rwSelect");
    rwObjecten.forEach((o, i) => {
      const opt = document.createElement("option");
      opt.value = i;
      opt.textContent = `${o.straat} ${o.huisnummer}, ${o.plaats}`;
      sel.appendChild(opt);
    });
    sel.addEventListener("change", () => wnKies(+sel.value)); // via de hub-flow: alle modules zien dezelfde woning
    $("#rwVeld").classList.remove("is-verborgen");
  } catch { /* proxy draait niet — sectie blijft verborgen */ }
  finally {
    // hub en brochure-kiezer nu pas vullen — geen race met de (tragere) tunnel
    if (wnVulFn) wnVulFn();
    if (brVulFn) brVulFn();
  }
}

function rwToepassen() {
  if (!rwActief) return;
  state.woningQR = rwActief.qr || null; // QR naar de woningpagina (te koop + open huis)
  Object.assign(state.velden, rwActief[state.template] || {});
  if (rwActief.foto && SJABLONEN[state.template].foto) {
    state.fotoOrigineel = rwActief.foto;
    state.fotoGloed = rwActief.fotoGloed;
    state.fotoIsUpload = true;
    const drop = $("#dropzone");
    drop.classList.add("heeft-foto");
    drop.style.backgroundImage = `url(${rwActief.foto})`;
    $("#dropTekst").textContent = "Andere foto kiezen";
  }
}

function resetPoster() {
  // verse standaardtemplate: geen invullingen of foto van de vorige woning meenemen
  state.velden = {};
  state.fotoOrigineel = null;
  state.fotoGloed = null;
  state.fotoIsUpload = false;
  state.woningQR = null;
  const drop = $("#dropzone");
  drop.classList.remove("heeft-foto");
  drop.style.backgroundImage = "";
  $("#dropTekst").innerHTML = "Sleep een woningfoto hierheen<br><em>of klik om te kiezen</em>";
}

let rwKiesNr = 0; // race-guard: alleen de laatst gekozen woning mag de poster vullen

async function rwKies(o) {
  if (!o) return;
  const mijn = ++rwKiesNr;
  resetPoster();
  swReset(o); // fotobibliotheek-knop tonen; cache van vorige woning opruimen
  bouwInputs(); render(); // oude woning meteen van het podium
  const adres = `${o.straat} ${o.huisnummer}`;
  const prijs = o.koopprijs
    ? `€ ${Math.round(o.koopprijs).toLocaleString("nl-NL")} ${o.koopconditie === "VRIJ_OP_NAAM" ? "v.o.n." : "k.k."}`
    : (o.huurprijs ? `€ ${Math.round(o.huurprijs).toLocaleString("nl-NL")} p.m.` : "");
  const actief = {
    tekoop: Object.assign({ straat: adres, plaats: o.plaats, prijs },
                          RW_STATUS_KICKER[o.status] ? { kicker: RW_STATUS_KICKER[o.status] } : {}),
    verkocht: { adres: `${adres} · ${o.plaats}` },
    openhuis: { waar: `${adres}, ${o.plaats}` },
    foto: null, fotoGloed: null
  };
  rwActief = actief;
  $("#rwHint").textContent = "Woning laden…";
  try { // QR naar de woningpagina
    const qb = await (await rwFetch("/qr?data=" + encodeURIComponent(wpUrlVan(o)))).blob();
    const qdu = await naarDataURL(qb);
    if (mijn !== rwKiesNr) return;
    actief.qr = qdu;
  } catch { /* QR niet beschikbaar */ }
  if (o.hoofdfoto) {
    try {
      const blob = await (await rwFetch("/foto?url=" + encodeURIComponent(o.hoofdfoto))).blob();
      const dataurl = await naarDataURL(blob);
      if (mijn !== rwKiesNr) return; // intussen andere woning gekozen
      actief.foto = dataurl;
    } catch { /* foto niet beschikbaar */ }
  }
  if (mijn !== rwKiesNr) return;
  rwToepassen();
  bouwInputs(); render();
  $("#rwHint").textContent = "Adres, prijs en foto zijn ingevuld";
  if (actief.foto) {
    const gloed = await warmeGloed(actief.foto);
    if (mijn !== rwKiesNr) return;
    actief.fotoGloed = gloed;
    if (state.fotoOrigineel === actief.foto) { state.fotoGloed = gloed; render(); }
  }
}

/* ---------- fotobibliotheek voor social posts (kiezen uit woningfoto's) ---------- */
let swCache = null; // { code, fotos: [{link, thumb?}] } — alleen de laatst gekozen woning

function swReset(o) {
  if (swCache && swCache.code !== o.objectcode) {
    swCache.fotos.forEach(f => { if (f.thumb) URL.revokeObjectURL(f.thumb); });
    swCache = null;
    $("#swGrid").innerHTML = "";
  }
  $("#swBieb").classList.remove("is-verborgen");
}

async function swOpen() {
  if (!gekozenWoning) return;
  const grid = $("#swGrid");
  $("#swModal").classList.remove("is-verborgen");
  if (swCache && swCache.code === gekozenWoning.objectcode) return; // grid staat al klaar
  grid.innerHTML = '<p class="hint hint--licht">Foto’s laden…</p>';
  try {
    const obj = await (await rwFetch(`/object/${gekozenWoning.afdelingscode}/${gekozenWoning.objectcode}`)).json();
    const fotos = (obj.media || []).filter(m => ["HOOFDFOTO", "FOTO"].includes(m.soort) && m.vrijgave)
      .sort((a, b) => (a.soort !== "HOOFDFOTO") - (b.soort !== "HOOFDFOTO") || (a.volgnummer || 99) - (b.volgnummer || 99));
    if (!fotos.length) { grid.innerHTML = '<p class="hint hint--licht">Geen foto’s gevonden bij deze woning.</p>'; return; }
    swCache = { code: gekozenWoning.objectcode, fotos };
    grid.innerHTML = fotos.map((f, i) => `<button data-i="${i}" title="Kies deze foto"></button>`).join("");
    await Promise.all(fotos.map(async (f, i) => {
      try {
        const blob = await (await rwFetch(`/foto?maat=thumb&url=${encodeURIComponent(f.link)}`)).blob();
        f.thumb = URL.createObjectURL(blob);
        const b = grid.querySelector(`button[data-i="${i}"]`);
        if (b) b.innerHTML = `<img src="${f.thumb}" alt="">`;
      } catch { /* thumb overslaan */ }
    }));
  } catch {
    grid.innerHTML = '<p class="hint hint--licht">Foto’s laden mislukte — draait de proxy?</p>';
  }
}

async function swKies(i) {
  const actief = rwActief;
  const f = swCache && swCache.fotos[i];
  if (!f || !actief) return;
  $("#swModal").classList.add("is-verborgen");
  $("#rwHint").textContent = "Foto laden…";
  try {
    const blob = await (await rwFetch("/foto?url=" + encodeURIComponent(f.link))).blob();
    const dataurl = await naarDataURL(blob);
    if (rwActief !== actief) return; // intussen andere woning gekozen
    actief.foto = dataurl; actief.fotoGloed = null;
    state.fotoOrigineel = dataurl; state.fotoGloed = null; state.fotoIsUpload = true;
    const drop = $("#dropzone");
    drop.classList.add("heeft-foto");
    drop.style.backgroundImage = `url(${dataurl})`;
    $("#dropTekst").textContent = "Andere foto kiezen";
    render();
    $("#rwHint").textContent = "Foto uit de woningbibliotheek gekozen";
    const gloed = await warmeGloed(dataurl);
    if (rwActief === actief && actief.foto === dataurl) {
      actief.fotoGloed = gloed;
      if (state.fotoOrigineel === dataurl) { state.fotoGloed = gloed; render(); }
    }
  } catch { $("#rwHint").textContent = "Foto laden mislukte — probeer het nog eens"; }
}

/* ---------- brochure-editor ---------- */
let ed = null; // { compact, obj, media:[{link,soort,dataurl}], paginas:[], actief, qr, brandfotos }

const BR_STATUS = {
  BESCHIKBAAR: "Te koop", IN_AANMELDING: "Binnenkort te koop", IN_VOORBEREIDING: "Binnenkort te koop",
  ONDER_BOD: "Onder bod", ONDER_OPTIE: "Onder optie", VERKOCHT_ONDER_VOORBEHOUD: "Verkocht o.v.",
  VERKOCHT: "Verkocht", VERHUURD: "Verhuurd"
};

function brNet(s) {
  if (!s) return null;
  s = String(s).replace(/_/g, " ").toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function brEuro(n) { return "€ " + Math.round(n).toLocaleString("nl-NL"); }

function brKenmerken(obj) {
  const alg = obj.algemeen || {}, fin = (obj.financieel || {}).overdracht || {};
  const det = obj.detail || {}, buiten = det.buitenruimte || {}, etages = det.etages || [];
  const slaap = etages.reduce((s, e) => s + (e.aantalSlaapkamers || 0), 0) || null;
  const bad = etages.reduce((s, e) => s + ((e.badkamers || []).length), 0) || null;
  const eerste = a => (a && a.length ? brNet(a[0]) : null);
  const conditie = { KOSTEN_KOPER: "k.k.", VRIJ_OP_NAAM: "v.o.n." }[fin.koopconditie] || "";
  const prijs = fin.koopprijs || fin.huurprijs;

  const blok = (titel, rijen) => {
    rijen = rijen.filter(([, v]) => v != null && v !== "");
    if (!rijen.length) return "";
    return `<div class="kblok"><h3>${titel}</h3><table>` +
      rijen.map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join("") + `</table></div>`;
  };
  return blok("Overdracht", [
      ["Status", BR_STATUS[fin.status] || brNet(fin.status)],
      [brNet(fin.koopprijsvoorvoegsel) || "Vraagprijs", prijs ? `${brEuro(prijs)} ${conditie}`.trim() : null],
      ["Aanvaarding", brNet(fin.aanvaarding)],
      ["Servicekosten", fin.servicekosten ? brEuro(fin.servicekosten) + " p.m." : null]])
    + blok("Bouw", [
      ["Soort", brNet(alg.woonhuistype) || brNet(alg.appartementsoort)],
      ["Bouwjaar", alg.bouwjaar], ["Bouwvorm", brNet(alg.bouwvorm)],
      ["Dak", eerste(alg.dakmaterialen)]])
    + blok("Oppervlakten & inhoud", [
      ["Woonoppervlakte", alg.woonoppervlakte ? alg.woonoppervlakte + " m²" : null],
      ["Perceel", alg.totaleKadestraleOppervlakte ? alg.totaleKadestraleOppervlakte + " m²" : null],
      ["Inhoud", alg.inhoud ? alg.inhoud + " m³" : null],
      ["Tuin", buiten.tuinTotaleOppervlakte ? `${buiten.tuinTotaleOppervlakte} m² (${brNet(buiten.hoofdtuintype)})` : brNet(buiten.hoofdtuintype)]])
    + blok("Indeling", [
      ["Kamers", alg.aantalKamers], ["Slaapkamers", slaap], ["Badkamers", bad],
      ["Woonlagen", etages.length || null]])
    + blok("Energie", [
      ["Energielabel", alg.energieklasse], ["Verwarming", eerste(alg.verwarmingsoorten)],
      ["CV-ketel", alg.cvKetelBouwjaar ? `${brNet(alg.cvKetelBrandstof)} (${alg.cvKetelBouwjaar})` : null],
      ["Isolatie", eerste(alg.isolatievormen)]])
    + blok("Buiten", [
      ["Garage", eerste(buiten.garagesoorten)], ["Parkeren", eerste(buiten.parkeerfaciliteiten)],
      ["Berging", brNet(buiten.schuurBergingSoort)], ["Ligging", eerste(alg.liggingen)]]);
}

async function brDataURL(url) {
  // paden die met / beginnen lopen via de Realworks-proxy (met sleutel)
  const blob = await (await (url.startsWith("/") ? rwFetch(url) : fetch(url))).blob();
  return naarDataURL(blob);
}

/* Alle fotovakken zijn liggend (wens Robbie: langgerekte staande vakken zijn onbruikbaar).
   "fototekst" en "tekst3" staan niet meer in de keuzelijst (staande vakken) maar renderen
   nog wél, zodat eerder bewaard werk blijft werken. */
const ED_LAYOUTS = {
  cover:         { naam: "Cover" },
  fotos2boven:   { naam: "2 foto's boven + tekst" },
  magazine:      { naam: "Magazine (foto boven + tekst)" },
  tekstbovenfoto:{ naam: "Tekst boven + grote foto" },
  tekstfoto:     { naam: "Tekst + 2 foto's + accent" },
  sfeer:         { naam: "Quote + panorama" },
  drieluik:      { naam: "Drieluik (3 foto's)" },
  verhaal:       { naam: "Het verhaal (tekst + bewonersquote)" },
  driedingen:    { naam: "Drie dingen (3 kaarten)" },
  indeling:      { naam: "Indeling (plattegrond + lijstjes)" },
  buurt:         { naam: "De buurt (kaart + reistijden)" },
  spreadlinks:   { naam: "Spread links (tekst + doorloopfoto)" },
  spreadrechts:  { naam: "Spread rechts (vervolg foto)" },
  raster:        { naam: "Fotoraster (6 foto's)" },
  vol:           { naam: "Paginavullende foto" },
  bijzonder:     { naam: "Bijzonderheden" },
  kenmerken:     { naam: "Kenmerken (automatisch)" },
  plattegrond:   { naam: "Plattegrond" },
  lijstvanzaken: { naam: "Lijst van zaken (automatisch)" },
  kaarten:       { naam: "Kadastrale kaart + locatie" },
  overfocus:     { naam: "Over Focus (vast)" },
  contact:       { naam: "Contact (vast)" }
};

/* lijst van zaken: geneste Realworks-structuur → platte rijen */
const LVZ_ANTWOORDEN = [["BLIJFT_ACHTER", "Blijft achter"], ["GAAT_MEE", "Gaat mee"], ["KAN_WORDEN_OVERGENOMEN", "Ter overname"]];
const LVZ_PER_PAGINA = 40;

function edLvzRijen(data) {
  const label = k => k.replace(/([A-Z])/g, " $1").toLowerCase().replace(/^./, c => c.toUpperCase());
  const isItem = v => v && typeof v === "object" && "antwoord" in v && "vraag" in v;
  const rijen = [];
  const loop = (node, pad) => {
    const uit = [];
    for (const [k, v] of Object.entries(node)) {
      if (k === "omschrijving" || !v || typeof v !== "object") continue;
      if (isItem(v)) {
        if (v.antwoord && v.antwoord !== "NVT" && !/^Vrije invulling/i.test(v.vraag || ""))
          uit.push({ type: "item", tekst: v.vraag, antwoord: v.antwoord, sleutel: `${pad}.${k}` });
      } else {
        const kinderen = loop(v, `${pad}.${k}`);
        if (kinderen.length) {
          uit.push({ type: v.omschrijving ? "kop" : "groep", tekst: v.omschrijving || label(k) });
          uit.push(...kinderen);
        }
      }
    }
    return uit;
  };
  for (const [hoofd, inhoud] of Object.entries(data || {})) {
    if (!inhoud || typeof inhoud !== "object") continue;
    const kinderen = loop(inhoud, hoofd);
    if (kinderen.length) rijen.push({ type: "groep", tekst: label(hoofd) }, ...kinderen);
  }
  return rijen;
}

function edLvzDeel(paginaIndex) {
  let deel = 0;
  for (let i = 0; i < paginaIndex; i++) if (ed.paginas[i].layout === "lijstvanzaken") deel++;
  return deel;
}

const ED_LEEG_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="3"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>`;

function edOpslagKey() {
  return `focus-brochure:${ed.compact.afdelingscode}/${ed.compact.objectcode}`;
}
function edBewaar() {
  try {
    localStorage.setItem(edOpslagKey(), JSON.stringify({
      paginas: ed.paginas, vestiging: $("#brVestiging").value, lvzOverrides: ed.lvzOverrides || {}
    }));
  } catch { $("#brHint").textContent = "Let op: opslag vol — uploads worden niet bewaard"; }
}

/* Printmodus: foto's als blob-URL i.p.v. base64 in de HTML-string — een brochure
   met 40-80 foto's werd anders honderden MB's groot en bevroor de browser (collega, 08-08). */
let edPrintModus = false;
const blobURLCache = new Map();
function alsBlobURL(dataurl) {
  if (blobURLCache.has(dataurl)) return blobURLCache.get(dataurl);
  const [kop, b64] = dataurl.split(",");
  const mime = (kop.match(/^data:([^;]+)/) || [])[1] || "image/jpeg";
  const bin = atob(b64), arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  const url = URL.createObjectURL(new Blob([arr], { type: mime }));
  blobURLCache.set(dataurl, url);
  return url;
}

function edFotoSrc(ref) {
  if (!ref) return null;
  const src = ref.bron === "upload" ? ref.dataurl : (ed.media[ref.i] ? ed.media[ref.i].dataurl : null);
  return (edPrintModus && src && src.startsWith("data:")) ? alsBlobURL(src) : src;
}

function edSlot(p, slot, extraClass) {
  const src = edFotoSrc(p.fotos[slot]);
  const inhoud = src ? `<img src="${src}" alt="">` :
    `<div class="bslot-leeg">${ED_LEEG_SVG}<span>Klik om een foto<br>te kiezen</span></div>`;
  return `<div class="bslot ${extraClass || ""}" data-slot="${slot}">${inhoud}</div>`;
}
function edTekst(p, slot, cls, hint, tag) {
  const t = tag || "div";
  return `<${t} class="btekst ${cls}" contenteditable="true" data-tslot="${slot}" data-hint="${hint}">${esc(p.teksten[slot] || "")}</${t}>`;
}

function edKern(obj) {
  const alg = obj.algemeen || {}, fin = (obj.financieel || {}).overdracht || {};
  const det = obj.detail || {};
  const items = [];
  const prijs = fin.koopprijs || fin.huurprijs;
  if (prijs) items.push([brEuro(prijs), fin.huurprijs && !fin.koopprijs ? "huur p.m." : ({ KOSTEN_KOPER: "k.k.", VRIJ_OP_NAAM: "v.o.n." }[fin.koopconditie] || "vraagprijs")]);
  if (alg.bouwjaar) items.push([alg.bouwjaar, "bouwjaar"]);
  if (alg.woonoppervlakte) items.push([alg.woonoppervlakte + " m²", "woonoppervlakte"]);
  if (alg.totaleKadestraleOppervlakte) items.push([alg.totaleKadestraleOppervlakte + " m²", "perceel"]);
  if (alg.aantalKamers) items.push([alg.aantalKamers, "kamers"]);
  if (alg.energieklasse) items.push([alg.energieklasse, "energielabel"]);
  return items.slice(0, 6).map(([w, l]) => `<div><strong>${esc(w)}</strong><span>${esc(l)}</span></div>`).join("");
}

function edPaginaHTML(p, nr) {
  const obj = ed.obj, adres = obj.adres || {}, fin = (obj.financieel || {}).overdracht || {};
  const hn = (adres.huisnummer || {});
  const straatnr = `${adres.straat || ""} ${hn.hoofdnummer || ""}${hn.toevoeging ? "-" + hn.toevoeging : ""}`.trim();
  const plaats = (adres.plaats || "").split(" ").map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(" ");
  const vest = FOCUS.vestigingen[$("#brVestiging").value] || Object.values(FOCUS.vestigingen)[0];
  const vestNaam = $("#brVestiging").value;
  const logo = `<div class="bp-logo">${ed.logo}</div>`;
  const nrBadge = nr > 1 ? `<span class="bp-nr">${nr}</span>` : "";

  switch (p.layout) {
    case "cover": {
      const prijs = fin.koopprijs || fin.huurprijs;
      return `<div class="bp bp--cover">${edSlot(p, "f1")}
        <div class="onder">
          <span class="bkicker">${BR_STATUS[fin.status] || "Te koop"} &middot; ${esc(plaats)}</span>
          <h1>${esc(straatnr)}</h1>
          <div class="plaats">${esc(adres.postcode || "")} ${esc(plaats)}</div>
          ${prijs ? `<div class="prijs"><span>${brEuro(prijs)} ${({ KOSTEN_KOPER: "k.k.", VRIJ_OP_NAAM: "v.o.n." }[fin.koopconditie] || "")}</span></div>` : ""}
          <div class="kern">${edKern(obj)}</div>
        </div>
        <div class="bp-merkrow">Focus Makelaars ${esc(vestNaam)}</div>
        <div class="bp-logo bp-logo--wit">${ed.logoWit}</div></div>`;
    }
    case "fotos2boven":
      return `<div class="bp bp--fotos2boven">${logo}${nrBadge}
        <div class="rij">${edSlot(p, "f1")}${edSlot(p, "f2")}</div>
        <span class="bkicker">${esc(straatnr)}</span>
        ${edTekst(p, "kop", "", "Klik om een kop te typen…", "h2")}
        ${edTekst(p, "lopend", "btekst--lopend", "Klik en typ of plak hier de tekst — bijvoorbeeld uit het Realworks-paneel links.")}</div>`;
    case "magazine":
      return `<div class="bp bp--magazine">${nrBadge}
        <div class="held">${edSlot(p, "f1")}</div>
        <div class="bp-logo bp-logo--wit">${ed.logoWit}</div>
        <div class="onder"><span class="bkicker">${esc(straatnr)}</span>
          ${edTekst(p, "kop", "", "Klik om een kop te typen…", "h2")}
          ${edTekst(p, "lopend", "btekst--lopend", "Klik en typ of plak hier de tekst…")}</div></div>`;
    case "tekstbovenfoto":
      return `<div class="bp bp--tekstbovenfoto">${logo}${nrBadge}
        <span class="bkicker">${esc(straatnr)}</span>
        ${edTekst(p, "kop", "", "Klik om een kop te typen…", "h2")}
        ${edTekst(p, "lopend", "btekst--lopend", "Klik en typ of plak hier de tekst…")}
        ${edSlot(p, "f1", "bslot--onder")}</div>`;
    case "tekstfoto":
      return `<div class="bp bp--tekstfoto">${logo}${nrBadge}
        <div class="links"><span class="bkicker">${esc(straatnr)}</span>
          ${edTekst(p, "kop", "", "Klik om een kop te typen…", "h2")}
          ${edTekst(p, "lopend", "btekst--lopend", "Klik en typ of plak hier de tekst…")}</div>
        <div class="rechts">${edSlot(p, "f1")}
          <div class="accent">${edTekst(p, "accent", "btekst--accent", 'Klik voor een accent — bijv. "Licht, ruim en instapklaar."')}</div>
          ${edSlot(p, "f2")}</div></div>`;
    case "sfeer":
      return `<div class="bp bp--sfeer">${logo}${nrBadge}
        <span class="bkicker">${esc(straatnr)}</span>
        ${edTekst(p, "quote", "btekst--quote serif", "Klik voor een sfeerzin — bijv. Thuiskomen begint bij de voordeur.")}
        ${edSlot(p, "f1", "bslot--panorama")}
        <div class="rij">${edSlot(p, "f2")}${edSlot(p, "f3")}</div></div>`;
    case "drieluik":
      return `<div class="bp bp--drieluik">${logo}${nrBadge}
        <span class="bkicker">${esc(straatnr)}</span>
        ${edSlot(p, "f1", "bslot--groot")}
        <div class="rij">${edSlot(p, "f2")}${edSlot(p, "f3")}</div>
        ${edTekst(p, "caption", "btekst--caption", "Optioneel bijschrift…")}</div>`;
    case "verhaal":
      return `<div class="bp bp--verhaal">${logo}${nrBadge}
        <span class="bkicker">Het verhaal</span>
        <h2>${edTekst(p, "kop", "kop-a", "Klik voor de kop,", "span")} ${edTekst(p, "kops", "kop-b serif", "en het serif-deel.", "span")}</h2>
        ${edTekst(p, "intro", "btekst--intro", "Klik voor een korte intro van 2-3 regels die de woning samenvat…")}
        ${edTekst(p, "lopend", "btekst--lopend", "Klik en typ of plak hier het verhaal van de woning — de eerste letter wordt vanzelf een sierletter.")}
        <div class="rij">${edSlot(p, "f1")}${edSlot(p, "f2")}</div>
        <div class="bkaart">
          <span class="bkaart__kop">De bewoners aan het woord</span>
          ${edTekst(p, "quote", "btekst--bquote serif", "“Klik voor een quote van de verkopers over het huis…”")}
          ${edTekst(p, "bron", "btekst--bbron", "— De bewoners van …")}
        </div></div>`;
    case "driedingen": {
      const ding = k => {
        const tekst = `<div class="dtekst"><span class="dnr">0${k}</span>
          ${edTekst(p, `t${k}kop`, "ding__kop", "Klik voor een kop…", "h3")}
          ${edTekst(p, `t${k}tekst`, "ding__tekst", "Klik voor de toelichting…")}</div>`;
        const foto = edSlot(p, "f" + k);
        return k === 2
          ? `<div class="ding ding--omgekeerd">${foto}${tekst}</div>`
          : `<div class="ding">${tekst}${foto}</div>`;
      };
      return `<div class="bp bp--driedingen">${logo}${nrBadge}
        <span class="bkicker">Waar je blij van wordt</span>
        ${edTekst(p, "kop", "", "Drie dingen die dit huis bijzonder maken.", "h2")}
        ${ding(1)}${ding(2)}${ding(3)}</div>`;
    }
    case "indeling":
      return `<div class="bp bp--indeling">${logo}${nrBadge}
        <span class="bkicker">De indeling</span>
        ${edTekst(p, "kop", "", "Zo loop je erdoorheen.", "h2")}
        <div class="kols">
          <div class="plat">
            ${edTekst(p, "platlabel", "plat__label", "Bijv. BEGANE GROND & TUIN")}
            ${edSlot(p, "f1", "bslot--contain")}
          </div>
          <div class="rechts">${[1, 2, 3].map(k =>
            `<div class="vkaart">${edTekst(p, `v${k}kop`, "vkaart__kop", "Bijv. BEGANE GROND")}
             ${edTekst(p, `v${k}tekst`, "vkaart__tekst", "Klik en som de ruimtes op — elke regel een punt…")}</div>`).join("")}
          </div>
        </div></div>`;
    case "buurt": {
      const kaartInhoud = (!p.fotos.f1 && ed.kaart)
        ? `<div class="bslot bslot--kaart" data-slot="f1"><img src="${edPrintModus ? alsBlobURL(ed.kaart) : ed.kaart}" alt=""></div>`
        : edSlot(p, "f1", "bslot--kaart");
      const pill = k => `<div class="pill"><span class="pill__bol"></span>
        ${edTekst(p, `b${k}n`, "pill__naam", "Plek", "span")}${edTekst(p, `b${k}t`, "pill__tijd", "± … min", "span")}</div>`;
      return `<div class="bp bp--buurt">${logo}${nrBadge}
        <span class="bkicker">De buurt</span>
        <h2>${edTekst(p, "kop", "kop-a", "Klik voor de kop,", "span")} ${edTekst(p, "kops", "kop-b serif", "en het serif-deel.", "span")}</h2>
        ${kaartInhoud}
        <div class="pills">${[1, 2, 3, 4, 5, 6].map(pill).join("")}</div>
        ${edTekst(p, "lopend", "btekst--lopend", "Klik en vertel over de buurt — voorzieningen, bereikbaarheid, sfeer…")}</div>`;
    }
    case "spreadlinks": {
      const src = edFotoSrc(p.fotos.f1);
      const inhoud = src ? `<img src="${src}" alt="">`
        : `<div class="bslot-leeg">${ED_LEEG_SVG}<span>Klik voor de doorloopfoto<br>(loopt door op de<br>volgende pagina)</span></div>`;
      return `<div class="bp bp--spreadlinks">${logo}${nrBadge}
        <div class="tekst"><span class="bkicker">${esc(straatnr)}</span>
          ${edTekst(p, "kop", "", "Klik om een kop te typen…", "h2")}
          ${edTekst(p, "lopend", "btekst--lopend", "Klik en typ of plak hier de tekst…")}</div>
        <div class="bslot doorloop" data-slot="f1">${inhoud}</div></div>`;
    }
    case "spreadrechts": {
      const vorige = ed.paginas[nr - 2];
      const bron = vorige && vorige.layout === "spreadlinks" ? edFotoSrc(vorige.fotos.f1) : null;
      const inhoud = bron ? `<img src="${bron}" alt="">`
        : `<div class="bslot-leeg">${ED_LEEG_SVG}<span>Vervolg van de doorloopfoto —<br>deze pagina hoort direct na<br>een "Spread links"-pagina</span></div>`;
      return `<div class="bp bp--spreadrechts">${nrBadge}
        <div class="bslot doorloop" data-slot="f1" data-spread="vorige">${inhoud}</div></div>`;
    }
    case "fototekst": /* verouderd — alleen voor oude opgeslagen brochures */
      return `<div class="bp bp--fototekst">${logo}${nrBadge}
        <div class="links"><span class="bkicker">${esc(straatnr)}</span>
          ${edTekst(p, "kop", "", "Klik om een kop te typen…", "h2")}
          ${edTekst(p, "lopend", "btekst--lopend", "Klik en typ of plak hier de tekst — bijvoorbeeld uit het Realworks-paneel links.")}
          ${edSlot(p, "f2")}
        </div>
        <div class="rechts">${edSlot(p, "f1")}</div></div>`;
    case "raster":
      return `<div class="bp bp--raster">${logo}${nrBadge}
        <div class="grid">${edSlot(p, "f1")}${edSlot(p, "f2")}${edSlot(p, "f3")}${edSlot(p, "f4")}${edSlot(p, "f5")}${edSlot(p, "f6")}</div>
        ${edTekst(p, "caption", "btekst--caption", "Optioneel bijschrift…")}</div>`;
    case "vol":
      return `<div class="bp bp--vol">${edSlot(p, "f1")}<div class="scrim"></div>
        <div class="bp-logo bp-logo--wit">${ed.logoWit}</div>
        <div class="volonder">
          ${edTekst(p, "kicker", "btekst--volkicker", "Klik voor een label — bijv. DE LIVING · CA. 70 M²")}
          ${edTekst(p, "caption", "btekst--caption", "Klik voor een bijschrift over deze foto…")}
        </div></div>`;
    case "tekst3":
      return `<div class="bp bp--tekst3">${logo}${nrBadge}
        <div class="links"><span class="bkicker">${esc(straatnr)}</span>
          ${edTekst(p, "kop", "", "Klik om een kop te typen…", "h2")}
          ${edTekst(p, "lopend", "btekst--lopend", "Klik en typ of plak hier de tekst…")}
        </div>
        <div class="rechts">${edSlot(p, "f1")}${edSlot(p, "f2")}${edSlot(p, "f3")}</div></div>`;
    case "bijzonder":
      return `<div class="bp bp--bijzonder">${logo}${nrBadge}
        ${edSlot(p, "f1")}
        <h2>Bijzonderheden <span class="serif">op een rij.</span></h2>
        ${edTekst(p, "lijst", "btekst--lijst", "Klik en typ de bijzonderheden — elke regel wordt een punt…")}</div>`;
    case "kenmerken":
      return `<div class="bp" style="padding:26mm 14mm 14mm;display:flex;flex-direction:column">${logo}${nrBadge}
        <span class="bkicker">De feiten</span>
        <h2 style="font-size:15.5pt;font-weight:700;margin-top:2.5mm">Alles op een rij, <span class="serif" style="color:#B0836B;font-weight:500">zwart op wit.</span></h2>
        <div style="margin-top:6mm;display:grid;grid-template-columns:1fr 1fr;gap:5mm 8mm">${brKenmerken(obj)
          .replace(/class="kblok"/g, 'style="background:#fff;border-radius:4mm;padding:5mm 6mm 4mm"')
          .replace(/<h3>/g, '<h3 style="font-size:9.5pt;font-weight:700;color:#F15D22;letter-spacing:.08em;text-transform:uppercase;margin-bottom:2.5mm">')
          .replace(/<table>/g, '<table style="width:100%;border-collapse:collapse;font-size:9pt">')
          .replace(/<td>/g, '<td style="padding:1.1mm 0;color:#4b4a45;width:42%">')}</div></div>`;
    case "plattegrond":
      return `<div class="bp bp--plattegrond">${logo}${nrBadge}
        <span class="bkicker">Indeling</span>
        ${edTekst(p, "kop", "", "Bijv. Plattegrond begane grond…", "h2")}
        ${edSlot(p, "f1", "bslot--contain")}</div>`;
    case "lijstvanzaken": {
      const rijen = ed.lvz || [];
      const deel = edLvzDeel(nr - 1);
      const stuk = rijen.slice(deel * LVZ_PER_PAGINA, (deel + 1) * LVZ_PER_PAGINA);
      const kolommen = LVZ_ANTWOORDEN.map(([, l]) => `<th class="k">${l}</th>`).join("");
      const rijHTML = stuk.map(r => {
        if (r.type !== "item") return `<tr class="${r.type}"><td colspan="4">${esc(r.tekst)}</td></tr>`;
        const antwoord = (ed.lvzOverrides || {})[r.sleutel] || r.antwoord;
        const cellen = LVZ_ANTWOORDEN.map(([a]) =>
          `<td class="k" data-lvz="${esc(r.sleutel)}" data-ant="${a}"><span class="${antwoord === a ? "aan" : ""}"></span></td>`).join("");
        return `<tr><td>${esc(r.tekst)}</td>${cellen}</tr>`;
      }).join("");
      const rest = rijen.length - (deel + 1) * LVZ_PER_PAGINA;
      return `<div class="bp bp--lvz">${logo}${nrBadge}
        <span class="bkicker">Lijst van zaken${deel ? ` · vervolg ${deel + 1}` : ""}</span>
        <h2>Wat blijft, wat gaat mee, <span class="serif">wat kun je overnemen.</span></h2>
        <table><tr><th>Beschrijving</th>${kolommen}</tr>${rijHTML ||
          '<tr><td colspan="4">Alle punten staan al op de eerdere lijst-pagina’s.</td></tr>'}</table>
        ${rest > 0 ? `<div class="vervolg">&rarr; nog ${rest} punten &mdash; voeg nog een "Lijst van zaken"-pagina toe</div>` : ""}</div>`;
    }
    case "kaarten": {
      const locatie = (!p.fotos.f2 && ed.kaart)
        ? `<div class="bslot bslot--contain" data-slot="f2"><img src="${ed.kaart}" alt=""></div>`
        : edSlot(p, "f2", "bslot--contain");
      return `<div class="bp bp--kaarten">${logo}${nrBadge}
        <div class="helft"><h3>Kadastrale <span class="serif">kaart.</span></h3>${edSlot(p, "f1", "bslot--contain")}</div>
        <div class="helft"><h3>Locatie <span class="serif">op de kaart.</span></h3>${locatie}</div></div>`;
    }
    case "overfocus":
      return `<div class="bp bp--overfocus">${logo}${nrBadge}
        <span class="bkicker">Over Focus Makelaars</span>
        <h2>Niet alleen oog voor de markt, <span class="serif">maar vooral voor de mens.</span></h2>
        <p class="intro">Focus Makelaars begeleidt mensen tijdens één van de belangrijkste stappen in hun leven. Door lokale marktkennis te combineren met persoonlijke aandacht helpen we je met vertrouwen een woning te kopen of verkopen. Deskundig, helder en oprecht betrokken — dat is de Focus Methodiek:</p>
        <div class="stappen">
          <div class="stap"><b>1</b><div><strong>Fundament</strong> · <span>waar sta je vandaag? We beginnen met goed luisteren.</span></div></div>
          <div class="stap"><b>2</b><div><strong>Oog voor kansen</strong> · <span>waar wil je naartoe? Samen bepalen we de beste strategie.</span></div></div>
          <div class="stap"><b>3</b><div><strong>Connectie</strong> · <span>wie brengt je verder? Heldere communicatie met alle betrokkenen.</span></div></div>
          <div class="stap"><b>4</b><div><strong>Uitvoering</strong> · <span>hoe maken we het waar? Van presentatie tot onderhandeling.</span></div></div>
          <div class="stap"><b>5</b><div><strong>Succes</strong> · <span>het resultaat van Focus: terugkijken met een goed gevoel.</span></div></div>
        </div>
        <div class="foto"><img src="${ed.brandfotos[0]}" alt=""></div></div>`;
    case "contact":
      return `<div class="bp bp--contact">
        <div class="foto"><img src="${ed.brandfotos[1]}" alt=""></div>
        <div class="bp-logo bp-logo--wit">${ed.logoWit}</div>
        <div class="fototekst"><h2>Benieuwd geworden? <span class="serif">De koffie staat klaar.</span></h2></div>
        <div class="onder">
          <p>Plan een bezichtiging, stel je vragen of loop gewoon eens binnen. We kijken graag met je mee — <span class="serif" style="color:#F15D22">met oog voor jou.</span></p>
          <div class="kaart">
            <div class="t"><h3>Plan een <span class="serif">bezichtiging.</span></h3>
              <p>Bel <strong>${esc(vest.telefoon)}</strong> of mail <strong>${esc(vest.mail)}</strong><br>Focus Makelaars ${esc(vestNaam)} &middot; ${esc(vest.adres)}</p></div>
            ${ed.woningQR ? `<div class="qr"><img src="${ed.woningQR}" alt="QR"><span>Deze woning online —<br>foto's &amp; documenten</span></div>` : ""}
            <div class="qr"><img src="${ed.qr}" alt="QR"><span>Scan voor de gratis<br>online waardecheck</span></div>
          </div>
          <div class="voet"><strong>Focus Makelaars ${esc(vestNaam)}</strong> &middot; ${esc(vest.adres)} &middot; ${esc(vest.telefoon)} &middot; ${esc(vest.mail)} &mdash; met oog voor jou. Aan deze brochure kunnen geen rechten worden ontleend. Maten en gegevens zijn indicatief.</div>
        </div></div>`;
  }
  return `<div class="bp">${logo}</div>`;
}

/* ---------- brochure-sjablonen: 3 standaardopzetten + eigen sjablonen ---------- */
const LAYOUT_SLOTS = { cover: 1, fotos2boven: 2, magazine: 1, tekstbovenfoto: 1, tekstfoto: 2,
  sfeer: 3, drieluik: 3, raster: 6, vol: 1, bijzonder: 1, tekst3: 3, fototekst: 2,
  spreadlinks: 1, verhaal: 2, driedingen: 3 };
const TEKSTDRAGERS = ["spreadlinks", "fotos2boven", "tekstbovenfoto", "magazine", "verhaal"];

const ED_STANDAARD_SJABLONEN = [
  { naam: "Compleet", oms: "De vertrouwde opzet: spread, accenten, alles erop en eraan",
    layouts: ["cover", "spreadlinks", "spreadrechts", "tekstbovenfoto", "tekstfoto", "sfeer", "drieluik",
              "kenmerken", "plattegrond", "plattegrond", "plattegrond", "kaarten",
              "lijstvanzaken", "lijstvanzaken", "overfocus", "contact"] },
  { naam: "Magazine", oms: "Fotorijk en editorial: verhaal, drie dingen, de buurt",
    layouts: ["cover", "spreadlinks", "spreadrechts", "magazine", "verhaal", "driedingen", "sfeer",
              "drieluik", "raster", "kenmerken", "indeling", "buurt",
              "lijstvanzaken", "lijstvanzaken", "overfocus", "contact"] },
  { naam: "Compact", oms: "8 pagina's — kort en krachtig voor kleinere woningen",
    layouts: ["cover", "spreadlinks", "spreadrechts", "tekstbovenfoto",
              "kenmerken", "plattegrond", "lijstvanzaken", "contact"] }
];

function edBouwPaginas(layouts) {
  /* Generieke bouwer: foto's op volgorde over de vakken, plattegronden naar
     plattegrond-pagina's, aanbiedingstekst gesplitst over de eerste tekstdragers. */
  const teksten = ed.obj.teksten || {};
  const tekst = teksten.a4Tekst || teksten.aanbiedingstekst || "";
  let deel1 = "", deel2 = "";
  tekst.split(/\n\s*\n/).forEach(a => {
    if (deel1.length < 1100 && !deel2) deel1 += (deel1 ? "\n\n" : "") + a;
    else deel2 += (deel2 ? "\n\n" : "") + a;
  });
  const media = ed.media;
  const plats = media.map((m, i) => ({ m, i })).filter(x => x.m.soort === "PLATTEGROND");
  let fi = 0, pi = 0, welkom = 0;
  const volgFoto = () => {
    while (fi < media.length && media[fi].soort === "PLATTEGROND") fi++;
    return media[fi] ? { bron: "media", i: fi++ } : undefined;
  };
  const paginas = layouts.map(l => {
    const p = { layout: l, fotos: {}, teksten: {} };
    if (l === "plattegrond") {
      const x = plats[pi++];
      if (x) p.fotos.f1 = { bron: "media", i: x.i };
      p.teksten.kop = "Plattegrond";
    } else {
      const n = LAYOUT_SLOTS[l] || 0;
      for (let k = 1; k <= n; k++) { const f = volgFoto(); if (f) p.fotos["f" + k] = f; }
    }
    if (TEKSTDRAGERS.includes(l) && welkom === 0) { p.teksten.kop = "Welkom binnen."; p.teksten.lopend = deel1; welkom = 1; }
    else if (TEKSTDRAGERS.includes(l) && welkom === 1 && deel2) { p.teksten.lopend = deel2; welkom = 2; }
    if (l === "driedingen" && !p.teksten.kop) p.teksten.kop = "Drie dingen die dit huis bijzonder maken.";
    if (l === "indeling") p.teksten.kop = "Zo loop je erdoorheen.";
    return p;
  });
  // extra échte plattegronden achter de laatste plattegrond-pagina
  if (pi < plats.length && paginas.some(p => p.layout === "plattegrond")) {
    const li = paginas.map(p => p.layout).lastIndexOf("plattegrond");
    paginas.splice(li + 1, 0, ...plats.slice(pi).map(x =>
      ({ layout: "plattegrond", fotos: { f1: { bron: "media", i: x.i } }, teksten: { kop: "Plattegrond" } })));
  }
  // extra lvz-pagina's als de lijst niet past
  const nodig = Math.max(1, Math.ceil((ed.lvz || []).length / LVZ_PER_PAGINA));
  const huidig = layouts.filter(l => l === "lijstvanzaken").length;
  if (huidig && nodig > huidig) {
    const li = paginas.map(p => p.layout).lastIndexOf("lijstvanzaken");
    paginas.splice(li + 1, 0, ...Array.from({ length: nodig - huidig },
      () => ({ layout: "lijstvanzaken", fotos: {}, teksten: {} })));
  }
  return paginas;
}

function edToonUI() {
  $("#edLaden").classList.add("is-verborgen");
  $("#edSjablonen").classList.add("is-verborgen");
  $("#edCanvas").classList.remove("is-verborgen");
  $("#edStrip").classList.remove("is-verborgen");
  $("#edToolbar").classList.remove("is-verborgen");
  $("#edBladerL").classList.remove("is-verborgen");
  $("#edBladerR").classList.remove("is-verborgen");
  $("#brPrint").disabled = false;
  $("#brDruk").disabled = false;
}

let eigenSjablonen = [];
async function sjablonenLaad() {
  try { eigenSjablonen = (await (await rwFetch("/sjablonen")).json()).sjablonen || []; }
  catch { eigenSjablonen = []; }
}

function edSjablonenToon() {
  $("#edLaden").classList.add("is-verborgen");
  $("#edSjablonen").classList.remove("is-verborgen");
  const kaart = (naam, oms, n, eigen) =>
    `<button class="ed-sjabloon" data-naam="${esc(naam)}"${eigen ? ' data-eigen="1"' : ""}>
       <strong>${esc(naam)}</strong><span>${esc(oms)}</span><em>${n} pagina's</em>
       ${eigen ? '<i class="ed-sjabloon__x" title="Sjabloon verwijderen">&times;</i>' : ""}</button>`;
  $("#edSjablonenGrid").innerHTML =
    ED_STANDAARD_SJABLONEN.map(s => kaart(s.naam, s.oms, s.layouts.length, false)).join("") +
    eigenSjablonen.map(s => kaart(s.naam, "Eigen sjabloon van het team", s.layouts.length, true)).join("");
  $("#brStatus").textContent = "Kies een opzet om mee te starten";
}

function edStartMet(layouts) {
  $("#edSjablonen").classList.add("is-verborgen");
  ed.lvzOverrides = {};
  ed.paginas = edBouwPaginas(layouts);
  ed.actief = 0;
  edToonUI();
  edRender();
}

function edRenderStrip() {
  const strip = $("#edStrip");
  strip.innerHTML = ed.paginas.map((p, i) =>
    `<div class="ed-mini${i === ed.actief ? " is-actief" : ""}" data-p="${i}">
       <div class="ed-mini__schaal">${edPaginaHTML(p, i + 1)}</div>
       <span class="ed-mini__nr">${i + 1}</span></div>`).join("") +
    `<button class="ed-nieuw" id="edNieuw" title="Pagina toevoegen">+</button>`;
  strip.querySelectorAll(".ed-mini [contenteditable]").forEach(el => el.removeAttribute("contenteditable"));
}

/* ---------- blader-weergave: 1 pagina of spread (2 naast elkaar) ----------
   Pagina 1 (cover) staat altijd alleen; daarna spreads 2-3, 4-5, enz. —
   precies zoals de brochure straks gedrukt en opengeslagen wordt. */
let edWeergave = +(() => { try { return localStorage.getItem("fs-ed-weergave2"); } catch { return 2; } })() || 2; // spread is de standaard

function edSpreadVan(i) {
  if (i === 0) return [0];
  const start = i % 2 === 1 ? i : i - 1;
  return start + 1 < ed.paginas.length ? [start, start + 1] : [start];
}

function edBladLabel() {
  if (!ed) return;
  const idx = edWeergave === 2 ? edSpreadVan(ed.actief) : [ed.actief];
  $("#edBlad").textContent = `Pagina ${idx.map(i => i + 1).join("–")} van ${ed.paginas.length}`;
}

function edActiveer(i) {
  // actieve pagina wisselen zonder her-render (behoudt focus/caret in tekstvakken)
  ed.actief = i;
  $$("#edCanvas .ed-spreadpagina").forEach(el => el.classList.toggle("is-actief", +el.dataset.pagina === i));
  $$("#edStrip .ed-mini").forEach(el => el.classList.toggle("is-actief", +el.dataset.p === i));
  $("#edLayout").value = ed.paginas[i].layout;
  edBladLabel();
}

function edBlader(richting) {
  if (!ed) return;
  let doel;
  if (edWeergave === 2) {
    const start = edSpreadVan(ed.actief)[0];
    doel = start === 0 ? (richting > 0 ? 1 : 0) : start + richting * 2;
    if (doel < 0) doel = 0;
  } else doel = ed.actief + richting;
  if (doel < 0 || doel >= ed.paginas.length || doel === ed.actief) return;
  ed.actief = doel;
  edRender();
}

function edRenderCanvas() {
  const canvas = $("#edCanvas");
  canvas.classList.toggle("ed-schaal--spread", edWeergave === 2);
  if (edWeergave === 2) {
    const idx = edSpreadVan(ed.actief);
    canvas.innerHTML = `<div class="ed-spread${idx[0] === 0 ? " ed-spread--los" : ""}">` +
      idx.map(i => `<div class="ed-spreadpagina${i === ed.actief ? " is-actief" : ""}" data-pagina="${i}">` +
                   edPaginaHTML(ed.paginas[i], i + 1) + `</div>`).join("") + `</div>`;
  } else {
    canvas.innerHTML = edPaginaHTML(ed.paginas[ed.actief], ed.actief + 1);
  }
  $("#edLayout").value = ed.paginas[ed.actief].layout;
  edBladLabel();
}

function edRender() {
  edRenderCanvas();
  edRenderStrip();
  const n = ed.paginas.length;
  const teller = $("#edAantal");
  teller.textContent = n % 4 === 0
    ? `${n} pagina's · drukklaar (4-voud)`
    : `${n} pagina's · nog geen 4-voud (voor drukwerk)`;
  teller.classList.toggle("is-waarschuwing", n % 4 !== 0);
  edBewaar();
}

let edFotoSlotDoel = null;
let edFotoDoelPagina = null; // meestal ed.actief; bij "Spread rechts" de linkerpagina
function edOpenFotoKiezer(slot) {
  edFotoSlotDoel = slot;
  const grid = $("#edFotoGrid");
  grid.innerHTML = ed.media.map((m, i) =>
    `<button data-i="${i}"><img src="${m.dataurl}" alt="">${m.soort === "PLATTEGROND" ? '<span class="tag">Plattegrond</span>' : ""}</button>`).join("") ||
    '<p style="color:var(--ink-soft)">Geen media gevonden bij deze woning.</p>';
  $("#edFotoModal").classList.remove("is-verborgen");
}
function edSluitFotoKiezer() { $("#edFotoModal").classList.add("is-verborgen"); edFotoSlotDoel = null; edFotoDoelPagina = null; }

let edKiesNr = 0;       // race-guard: alleen de laatst gekozen woning mag de editor vullen
let edLaadCode = null;  // objectcode die nu laadt (voorkomt dubbel laden via tab-wissel)

async function edKies(compactObj) {
  const mijn = ++edKiesNr;
  edLaadCode = compactObj.objectcode;
  // blob-URL's van de vorige brochure opruimen (anders groeit het geheugen per woning)
  blobURLCache.forEach(url => URL.revokeObjectURL(url));
  blobURLCache.clear();
  const st = $("#brStatus");
  const laad = t => { st.textContent = t; $("#edLadenTekst").textContent = t; };
  $("#brPrint").disabled = true;
  $("#brDruk").disabled = true;
  $("#edSjablonen").classList.add("is-verborgen");
  $("#edLeeg").classList.add("is-verborgen");
  $("#edCanvas").classList.add("is-verborgen");
  $("#edStrip").classList.add("is-verborgen");
  $("#edToolbar").classList.add("is-verborgen");
  $("#edBladerL").classList.add("is-verborgen");
  $("#edBladerR").classList.add("is-verborgen");
  $("#edLaden").classList.remove("is-verborgen");
  laad(`${compactObj.straat} ${compactObj.huisnummer} laden…`);
  try {
    const obj = await (await rwFetch(`/object/${compactObj.afdelingscode}/${compactObj.objectcode}`)).json();
    if (mijn !== edKiesNr) return; // intussen andere woning gekozen
    const mediaRuw = (obj.media || []).filter(m => ["HOOFDFOTO", "FOTO", "PLATTEGROND"].includes(m.soort) && m.vrijgave)
      .sort((a, b) => (a.soort !== "HOOFDFOTO") - (b.soort !== "HOOFDFOTO") || (a.volgnummer || 99) - (b.volgnummer || 99));
    ed = { compact: compactObj, obj, media: [], paginas: [], actief: 0 };
    ed.logo = await laadLogo();
    ed.logoWit = ed.logo.replace(/currentColor/g, "#FFFFFF").replace('class="logo"', "");
    ed.qr = await brDataURL("qr-waardecheck.png");
    try { // QR naar de woningpagina (voor de contactpagina)
      ed.woningQR = await naarDataURL(await (await rwFetch("/qr?data=" + encodeURIComponent(wpUrlVan(compactObj)))).blob());
    } catch { ed.woningQR = null; }
    if (mijn !== edKiesNr) return;
    ed.brandfotos = [await brDataURL("../assets/img/stel-tuin.png"), await brDataURL("../assets/img/makelaar-gesprek.png")];
    for (let i = 0; i < mediaRuw.length; i++) {
      laad(`Foto's laden… (${i + 1}/${mediaRuw.length})`);
      try {
        const dataurl = await brDataURL(`/foto?url=${encodeURIComponent(mediaRuw[i].link)}`);
        if (mijn !== edKiesNr) return;
        mediaRuw[i].dataurl = dataurl;
        ed.media.push(mediaRuw[i]);
      } catch { /* foto overslaan */ }
    }
    if (mijn !== edKiesNr) return;
    // lijst van zaken ophalen
    ed.lvz = []; ed.lvzOverrides = {};
    try {
      laad("Lijst van zaken ophalen…");
      const lvzData = await (await rwFetch(`/lijstvanzaken/${compactObj.afdelingscode}/${compactObj.objectcode}`)).json();
      if (mijn !== edKiesNr) return;
      ed.lvz = edLvzRijen(lvzData);
    } catch { /* geen lijst beschikbaar */ }
    // locatiekaart ophalen (OpenStreetMap via proxy)
    try {
      laad("Locatiekaart maken…");
      const adr = obj.adres || {}, h = adr.huisnummer || {};
      const zoek = `${adr.straat || ""} ${h.hoofdnummer || ""}, ${adr.postcode || ""} ${adr.plaats || ""}`;
      ed.kaart = await brDataURL(`/kaart?q=${encodeURIComponent(zoek)}`);
      if (mijn !== edKiesNr) return;
    } catch { ed.kaart = null; }
    // eerder werk terugzetten of standaardopzet maken
    let bewaard = null;
    try { bewaard = JSON.parse(localStorage.getItem(`focus-brochure:${compactObj.afdelingscode}/${compactObj.objectcode}`)); } catch {}
    // nooit stilzwijgend oud werk terugzetten: altijd vragen
    let herstel = false;
    if (bewaard && bewaard.paginas && bewaard.paginas.length &&
        confirm("Op dit apparaat staat eerder werk aan deze brochure.\n\nOK = verdergaan met dat werk\nAnnuleren = vers beginnen met een opzet naar keuze")) {
      ed.paginas = bewaard.paginas;
      ed.lvzOverrides = bewaard.lvzOverrides || {};
      if (bewaard.vestiging && FOCUS.vestigingen[bewaard.vestiging]) $("#brVestiging").value = bewaard.vestiging;
      st.textContent = "Eerder werk aan deze brochure teruggezet";
      herstel = true;
    }
    // teksten-paneel
    const namen = { aanbiedingstekst: "Aanbiedingstekst", a4Tekst: "A4-tekst", flyertekst: "Flyertekst", aanbiedingstekstEngels: "Aanbiedingstekst (EN)" };
    const tk = obj.teksten || {};
    $("#edTeksten").innerHTML = Object.entries(namen)
      .filter(([k]) => tk[k])
      .map(([k, naam]) => `<div class="ed-tekst"><strong>${naam}</strong><p>${esc(tk[k])}</p><button data-kopie="${k}">Kopieer tekst</button></div>`)
      .join("") || '<p class="hint hint--licht">Geen teksten bij deze woning.</p>';
    $("#edTekstenVeld").classList.remove("is-verborgen");

    if (herstel) {
      edToonUI();
      ed.actief = 0;
      edRender();
    } else {
      await sjablonenLaad();
      if (mijn !== edKiesNr) return;
      edSjablonenToon();
    }
  } catch (e) {
    if (mijn !== edKiesNr) return; // een nieuwere laadactie beheert de UI al
    ed = null; edLaadCode = null;  // schone lei, zodat opnieuw proberen werkt
    $("#edLaden").classList.add("is-verborgen");
    $("#edLeeg").classList.remove("is-verborgen");
    st.textContent = "Laden mislukte: " + e.message;
  }
}

async function edPrint() {
  if (!ed) return;
  $("#brHint").textContent = "PDF-weergave openen…";
  const [fonts, paginaCSS] = await Promise.all([fontsAlsCSS(), (await fetch("brochure-paginas.css?v=8")).text()]);
  edPrintModus = true;
  let paginasHTML;
  try { paginasHTML = ed.paginas.map((p, i) => edPaginaHTML(p, i + 1)).join(""); }
  finally { edPrintModus = false; }
  const doc = `<!DOCTYPE html><html lang="nl"><head><meta charset="UTF-8"><title>Brochure</title>
    <style>${fonts}\n${paginaCSS}\n@page{size:210mm 297mm;margin:0}html,body{margin:0;padding:0}.bp{page-break-after:always}
    .bslot-leeg{display:none!important}.vervolg{display:none!important}[contenteditable]{outline:none}
    .btekst:empty::before{content:none!important}</style></head>
    <body>${paginasHTML.replace(/ contenteditable="true"/g, "")}
    <script>addEventListener("load",()=>setTimeout(()=>print(),900))<\/script></body></html>`;
  const w = window.open(URL.createObjectURL(new Blob([doc], { type: "text/html" })), "_blank");
  $("#brHint").textContent = w
    ? "Kies 'Opslaan als PDF' in het printvenster"
    : "Pop-up geblokkeerd — sta pop-ups toe voor deze site en probeer opnieuw";
}

function brInit() {
  const bv = $("#brVestiging");
  bv.innerHTML = Object.keys(FOCUS.vestigingen).map(v => `<option${v === state.vestiging ? " selected" : ""}>${v}</option>`).join("");
  const sel = $("#brSelect");
  const st = $("#brStatus");
  const vul = () => {
    if (!rwObjecten.length) {
      st.innerHTML = "Geen verbinding met Realworks.<br>Start de proxy op deze PC en herlaad de pagina.";
      sel.innerHTML = '<option value="" selected disabled>Niet beschikbaar</option>';
      return;
    }
    sel.disabled = false;
    sel.innerHTML = '<option value="" selected disabled>Kies een woning…</option>' +
      rwObjecten.map((o, i) => `<option value="${i}">${esc(o.straat)} ${esc(o.huisnummer)}, ${esc(o.plaats)}</option>`).join("");
    st.textContent = `${rwObjecten.length} woning(en) beschikbaar`;
  };
  brVulFn = vul;
  sel.addEventListener("change", () => edKies(rwObjecten[+sel.value]));
  bv.addEventListener("change", () => { if (ed) edRender(); });

  const layoutSel = $("#edLayout");
  layoutSel.innerHTML = Object.entries(ED_LAYOUTS).map(([k, v]) => `<option value="${k}">${v.naam}</option>`).join("");
  // vaste koppen die bij een layout horen: voorvullen als echte tekst (hints printen niet mee)
  const LAYOUT_STD_TEKSTEN = {
    driedingen: { kop: "Drie dingen die dit huis bijzonder maken." },
    indeling: { kop: "Zo loop je erdoorheen." }
  };
  layoutSel.addEventListener("change", () => {
    if (!ed) return;
    const p = ed.paginas[ed.actief];
    Object.entries(LAYOUT_STD_TEKSTEN[layoutSel.value] || {}).forEach(([k, v]) => {
      if (!p.teksten[k]) p.teksten[k] = v;
    });
    ed.paginas[ed.actief].layout = layoutSel.value;
    // spread is een tweeluik: bij "Spread links" hoort direct een "Spread rechts"-pagina
    if (layoutSel.value === "spreadlinks") {
      const volgende = ed.paginas[ed.actief + 1];
      if (!volgende || volgende.layout !== "spreadrechts")
        ed.paginas.splice(ed.actief + 1, 0, { layout: "spreadrechts", fotos: {}, teksten: {} });
    }
    edRender();
  });
  $("#edOmhoog").addEventListener("click", () => {
    if (!ed || ed.actief === 0) return;
    const p = ed.paginas.splice(ed.actief, 1)[0];
    ed.paginas.splice(--ed.actief, 0, p);
    edRender();
  });
  $("#edOmlaag").addEventListener("click", () => {
    if (!ed || ed.actief >= ed.paginas.length - 1) return;
    const p = ed.paginas.splice(ed.actief, 1)[0];
    ed.paginas.splice(++ed.actief, 0, p);
    edRender();
  });
  $("#edVerwijder").addEventListener("click", () => {
    if (!ed || ed.paginas.length <= 1) return;
    ed.paginas.splice(ed.actief, 1);
    ed.actief = Math.min(ed.actief, ed.paginas.length - 1);
    edRender();
  });
  $("#edToevoeg").addEventListener("click", () => {
    if (!ed) return;
    ed.paginas.splice(++ed.actief, 0, { layout: "tekstbovenfoto", fotos: {}, teksten: {} });
    ed.actief = Math.min(ed.actief, ed.paginas.length - 1);
    edRender();
  });
  $("#edReset").addEventListener("click", async () => {
    if (!ed) return;
    if (!confirm("Bewaard werk aan deze brochure wissen en opnieuw beginnen?")) return;
    try { localStorage.removeItem(edOpslagKey()); } catch {}
    await sjablonenLaad();
    $("#edCanvas").classList.add("is-verborgen");
    $("#edStrip").classList.add("is-verborgen");
    $("#edToolbar").classList.add("is-verborgen");
    $("#edBladerL").classList.add("is-verborgen");
    $("#edBladerR").classList.add("is-verborgen");
    edSjablonenToon();
  });

  // sjabloonkeuze: kiezen, of eigen sjabloon verwijderen
  $("#edSjablonenGrid").addEventListener("click", async e => {
    if (!ed) return;
    const x = e.target.closest(".ed-sjabloon__x");
    const kaart = e.target.closest(".ed-sjabloon");
    if (!kaart) return;
    const naam = kaart.dataset.naam;
    if (x) {
      if (!confirm(`Sjabloon "${naam}" voor het hele team verwijderen?`)) return;
      try {
        await rwFetch("/sjabloon-verwijder", { method: "POST", headers: { "Content-Type": "application/json" },
                                               body: JSON.stringify({ naam }) });
      } catch {}
      await sjablonenLaad();
      edSjablonenToon();
      return;
    }
    const s = ED_STANDAARD_SJABLONEN.find(t => t.naam === naam) || eigenSjablonen.find(t => t.naam === naam);
    if (s) edStartMet(s.layouts);
  });

  // huidige pagina-opzet bewaren als team-sjabloon
  $("#edSjabloonOpslaan").addEventListener("click", async () => {
    if (!ed || !ed.paginas.length) return;
    const naam = (prompt("Naam voor dit sjabloon (zichtbaar voor het hele team):") || "").trim();
    if (!naam) return;
    try {
      await rwFetch("/sjabloon", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ naam, layouts: ed.paginas.map(p => p.layout) }) });
      $("#brStatus").textContent = `Sjabloon "${naam}" bewaard — het team kan 'm nu kiezen`;
    } catch { $("#brStatus").textContent = "Sjabloon bewaren mislukte — draait de proxy?"; }
  });

  // paginastrip: selecteren + toevoegen
  $("#edStrip").addEventListener("click", e => {
    const nieuw = e.target.closest("#edNieuw");
    if (nieuw && ed) {
      ed.paginas.splice(++ed.actief, 0, { layout: "tekstbovenfoto", fotos: {}, teksten: {} });
      ed.actief = Math.min(ed.actief, ed.paginas.length - 1);
      edRender();
      return;
    }
    const mini = e.target.closest(".ed-mini");
    if (mini) { ed.actief = +mini.dataset.p; edRender(); }
  });

  // canvas: fotoslots, lijst-van-zaken-vinkjes + tekstinvoer
  $("#edCanvas").addEventListener("click", e => {
    if (!ed) return;
    // in spread-weergave: klik in een pagina maakt die pagina actief
    const sp = e.target.closest(".ed-spreadpagina");
    if (sp && +sp.dataset.pagina !== ed.actief) edActiveer(+sp.dataset.pagina);
    const cel = e.target.closest("[data-lvz]");
    if (cel) {
      const sleutel = cel.dataset.lvz, ant = cel.dataset.ant;
      const origineel = (ed.lvz.find(r => r.sleutel === sleutel) || {}).antwoord;
      ed.lvzOverrides = ed.lvzOverrides || {};
      const huidig = ed.lvzOverrides[sleutel] || origineel;
      ed.lvzOverrides[sleutel] = huidig === ant ? "GEEN" : ant;
      edRender();
      return;
    }
    const slot = e.target.closest(".bslot");
    if (slot && !e.target.closest("[contenteditable]")) {
      edFotoDoelPagina = ed.actief;
      if (slot.dataset.spread === "vorige") {
        // "Spread rechts" toont de foto van de linkerpagina — die bewerken we dus
        if (!(ed.actief > 0 && ed.paginas[ed.actief - 1].layout === "spreadlinks")) return;
        edFotoDoelPagina = ed.actief - 1;
      }
      edOpenFotoKiezer(slot.dataset.slot);
    }
  });
  let stripTimer = null;
  $("#edCanvas").addEventListener("input", e => {
    const el = e.target.closest("[data-tslot]");
    if (!el || !ed) return;
    const sp = e.target.closest(".ed-spreadpagina");
    const doel = sp ? +sp.dataset.pagina : ed.actief;
    ed.paginas[doel].teksten[el.dataset.tslot] = el.innerText;
    clearTimeout(stripTimer);
    stripTimer = setTimeout(() => { edRenderStrip(); edBewaar(); }, 600);
  });

  // fotokiezer
  $("#edFotoSluit").addEventListener("click", edSluitFotoKiezer);
  $("#edFotoModal").addEventListener("click", e => { if (e.target === $("#edFotoModal")) edSluitFotoKiezer(); });
  $("#edFotoGrid").addEventListener("click", e => {
    const b = e.target.closest("button[data-i]");
    if (!b || !ed || edFotoSlotDoel == null) return;
    ed.paginas[edFotoDoelPagina ?? ed.actief].fotos[edFotoSlotDoel] = { bron: "media", i: +b.dataset.i };
    edSluitFotoKiezer();
    edRender();
  });
  $("#edFotoUpload").addEventListener("change", async e => {
    const f = e.target.files[0];
    if (!f || !ed || edFotoSlotDoel == null) return;
    ed.paginas[edFotoDoelPagina ?? ed.actief].fotos[edFotoSlotDoel] = { bron: "upload", dataurl: await naarDataURL(f) };
    e.target.value = "";
    edSluitFotoKiezer();
    edRender();
  });
  $("#edFotoLeeg").addEventListener("click", () => {
    if (!ed || edFotoSlotDoel == null) return;
    delete ed.paginas[edFotoDoelPagina ?? ed.actief].fotos[edFotoSlotDoel];
    edSluitFotoKiezer();
    edRender();
  });

  // teksten-paneel: kopieerknoppen
  $("#edTeksten").addEventListener("click", async e => {
    const b = e.target.closest("button[data-kopie]");
    if (!b || !ed) return;
    await navigator.clipboard.writeText((ed.obj.teksten || {})[b.dataset.kopie] || "");
    b.textContent = "Gekopieerd!";
    setTimeout(() => { b.textContent = "Kopieer tekst"; }, 2500);
  });

  $("#brPrint").addEventListener("click", edPrint);

  // blader-weergave: 1 pagina of spread
  const zetWeergave = (n, bewaar = true) => {
    edWeergave = n;
    if (bewaar) { try { localStorage.setItem("fs-ed-weergave2", n); } catch {} } // alleen bewuste keuze onthouden
    $("#edWeergave1").classList.toggle("is-actief", n === 1);
    $("#edWeergave2").classList.toggle("is-actief", n === 2);
    if (ed) edRenderCanvas();
  };
  $("#edWeergave1").addEventListener("click", () => zetWeergave(1));
  $("#edWeergave2").addEventListener("click", () => zetWeergave(2));
  zetWeergave(edWeergave === 1 ? 1 : 2, false);

  $("#edBladerL").addEventListener("click", () => edBlader(-1));
  $("#edBladerR").addEventListener("click", () => edBlader(1));
  document.addEventListener("keydown", e => {
    if (!ed || $("#tab-brochure").classList.contains("is-verborgen")) return;
    const a = document.activeElement;
    if (a && (a.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName))) return;
    if (e.key === "ArrowRight") { e.preventDefault(); edBlader(1); }
    if (e.key === "ArrowLeft") { e.preventDefault(); edBlader(-1); }
  });
}

/* ---------- woning-hub + omwonende-mailing ---------- */
let gekozenWoning = null;      // compact object uit rwObjecten
let om = { foto: null, teksten: {} };

function toonTab(naam) {
  $$(".tab").forEach(x => x.classList.toggle("is-active", x.dataset.tab === naam));
  $$("main[id^='tab-']").forEach(m => m.classList.toggle("is-verborgen", m.id !== "tab-" + naam));
  if (naam === "social") schaalPodium();
  // de op de hub gekozen woning werkt overal door, ook wie via de tabbalk navigeert
  if (gekozenWoning) {
    if (naam === "brochure" && edLaadCode !== gekozenWoning.objectcode &&
        (!ed || ed.compact.objectcode !== gekozenWoning.objectcode)) {
      const brSel = $("#brSelect");
      if (brSel && !brSel.disabled) brSel.value = rwObjecten.indexOf(gekozenWoning);
      edKies(gekozenWoning);
    }
    if (naam === "mailing" && !om.laadt && (!om.o || om.o.objectcode !== gekozenWoning.objectcode ||
        (!om.foto && gekozenWoning.hoofdfoto))) omZet(gekozenWoning);
  }
}

const OM_STANDAARD = {
  tekoop: {
    kicker: "Nieuw in de verkoop · bij u in de buurt",
    kop: (adres) => `${adres} staat <span class="serif">te koop.</span>`,
    intro: "Misschien heeft u het bord al zien staan: deze woning bij u in de buurt is nieuw in de verkoop.",
    brief: "Beste buurtbewoner,\n\nBij u in de buurt is deze woning nieuw in de verkoop gekomen. Kent u iemand die hier graag zou wonen — familie, vrienden, collega's? Deel het gerust, of plan een bezichtiging.\n\nEn wist u dat een verkoop in de buurt ook iets zegt over de waarde van úw woning? Met de gratis Focus Waardecheck ziet u het in 60 seconden. Scannen maar!"
  },
  verkocht: {
    kicker: "Verkocht · bij u in de buurt",
    kop: (adres) => `${adres} is <span class="serif">verkocht.</span>`,
    intro: "Goed nieuws uit de buurt: deze woning is verkocht — u krijgt binnenkort nieuwe buren.",
    brief: "Beste buurtbewoner,\n\nDeze woning bij u in de buurt is verkocht. Zo'n verkoop zegt ook iets over de waarde van úw woning — en die is misschien hoger dan u denkt.\n\nBenieuwd? Doe de gratis Focus Waardecheck via de QR-code, of vraag een gratis waardebepaling aan. We komen graag even langs — vrijblijvend, met oog voor u en uw verhaal."
  },
  openhuis: {
    kicker: "Open huis · bij u in de buurt",
    kop: (adres) => `Kom binnenkijken bij <span class="serif">${adres}.</span>`,
    intro: "U bent van harte welkom bij het open huis — loop vrijblijvend binnen en kijk rond.",
    brief: "Beste buurtbewoner,\n\nBinnenkort houden we open huis bij deze woning bij u in de buurt. Kom gerust binnenkijken — of stuur de uitnodiging door aan iemand die hier zou willen wonen.\n\nDatum: (vul in)\nTijd: (vul in)\n\nTot dan! De koffie staat klaar."
  }
};

let omZetNr = 0; // race-guard: alleen de laatst gekozen woning mag de mailing vullen

async function omZet(o) {
  const mijn = ++omZetNr;
  om = { o, foto: null, laadt: true, logo: om.logo, qr: om.qr, qrWB: om.qrWB,
         teksten: om.o && om.o.objectcode === o.objectcode ? om.teksten : {} };
  const mijnOm = om;
  $("#omStatus").textContent = `${o.straat} ${o.huisnummer}, ${o.plaats}`;
  if (o.hoofdfoto) {
    try {
      const foto = await brDataURL(`/foto?url=${encodeURIComponent(o.hoofdfoto)}`);
      if (mijn !== omZetNr) return; // intussen andere woning gekozen
      mijnOm.foto = foto;
    } catch { /* foto niet beschikbaar */ }
  }
  try { // QR naar de woningpagina (voor te koop / open huis; verkocht houdt de waardecheck-QR)
    mijnOm.woningQR = await naarDataURL(await (await rwFetch("/qr?data=" + encodeURIComponent(wpUrlVan(o)))).blob());
  } catch { mijnOm.woningQR = null; }
  mijnOm.logo = mijnOm.logo || await laadLogo();
  mijnOm.qr = mijnOm.qr || await brDataURL("qr-waardecheck.png");
  mijnOm.qrWB = mijnOm.qrWB || await brDataURL("qr-waardebepaling.png"); // gratis waardebepaling (achterkant)
  mijnOm.laadt = false;
  if (mijn !== omZetNr) return;
  $("#omPrint").disabled = false;
  $("#omDruk").disabled = false;
  $("#omBag").disabled = false;
  $("#omLeeg").classList.add("is-verborgen");
  $("#omCanvas").classList.remove("is-verborgen");
  omRender();
}

function omHTML(adres) { // adres optioneel: {naam?, straat, pc, plaats} voor geadresseerde post
  const o = om.o, soort = $("#omSoort").value, std = OM_STANDAARD[soort];
  const t = om.teksten[soort] || {};
  const wAdres = `${o.straat} ${o.huisnummer}`;
  const vestNaam = $("#omVestiging").value;
  const vest = FOCUS.vestigingen[vestNaam];
  const prijs = (soort !== "verkocht" && o.koopprijs)
    ? `€ ${Math.round(o.koopprijs).toLocaleString("nl-NL")} ${o.koopconditie === "VRIJ_OP_NAAM" ? "v.o.n." : "k.k."}` : "";
  const fotoInhoud = om.foto ? `<img src="${om.foto}" alt="">`
    : '<div style="position:absolute;inset:0;background:#DFD1BB"></div>';
  const chip = (soort === "tekoop" || soort === "openhuis") && om.woningQR
    ? `<span class="m-qrchip"><img src="${om.woningQR}" alt=""><em>scan voor alles</em></span>` : "";
  const adresblok = adres
    ? `<div class="adresblok">${esc(adres.naam || "Aan de bewoners van")}<br><strong>${esc(adres.straat)}</strong><br>${esc(adres.pc)}&nbsp;&nbsp;${esc(adres.plaats.toUpperCase())}</div>`
    : `<div class="adresblok"><span class="aanhef">Aan de bewoners van</span><br><strong>dit adres</strong><br><span class="aanhef">(adressen via "Geadresseerde post")</span></div>`;
  return `
  <div class="mp mp--voor">
    <div class="bslot">${fotoInhoud}</div>${chip}
    <div class="voorband">
      <span class="mkicker">${std.kicker}</span>
      <h1>${std.kop(esc(wAdres))}</h1>
      <div class="mlogo">${om.logo}<span>${esc(o.plaats)}${prijs ? " · " + prijs : ""}</span></div>
    </div>
  </div>
  <div class="mp mp--achter">
    <div class="links">
      <h2>Met oog voor de buurt, <span class="serif">en voor u.</span></h2>
      <div class="brief btekst" contenteditable="true" data-om="brief">${esc(t.brief ?? std.brief)}</div>
      <div class="qr" style="margin-top:2.5mm"><img src="${om.qrWB || om.qr}" alt="QR">
        <span><strong>Plan een gratis waardebepaling</strong><br>Scan de code of bel ${esc(vest.telefoon)}</span></div>
      <div class="mvoetje">Focus Makelaars ${esc(vestNaam)} · ${esc(vest.adres)} · ${esc(vest.mail)} — met oog voor jou.<br>Liever geen post van ons? Laat het weten via ${esc(vest.mail)}.</div>
    </div>
    <div class="scheiding"></div>
    <div class="rechts">
      <div class="postzegel">postzegel<br>niet nodig bij<br>partijenpost</div>
      ${adresblok}
    </div>
  </div>`;
}

function omRender() {
  if (!om.o) return;
  $("#omCanvas").innerHTML = omHTML();
}

async function omPrintDoc() {
  const [fonts, css] = await Promise.all([fontsAlsCSS(), (await fetch("brochure-paginas.css?v=8")).text()]);
  return `<!DOCTYPE html><html lang="nl"><head><meta charset="UTF-8"><title>Omwonende-mailing</title>
    <style>${fonts}\n${css}\n@page{size:210mm 148mm;margin:0}html,body{margin:0;padding:0}[contenteditable]{outline:none}
    .btekst:empty::before{content:none!important}</style>
    </head><body>${omHTML().replace(/ contenteditable="true"/g, "")}</body></html>`;
}
window.omPrintDoc = omPrintDoc; // voor geautomatiseerd renderen (drukbestanden)

async function omPrint() {
  if (!om.o) return;
  const doc = await omPrintDoc();
  const w = window.open(URL.createObjectURL(new Blob([doc], { type: "text/html" })), "_blank");
  if (w) setTimeout(() => w.print(), 1000);
}

/* ---------- drukklare output: 3mm afloop + snijtekens + slugregel (norm: de wikkelfolder) ---------- */
const DRUK_AFLOOP = 3, DRUK_SLUG = 7; // mm

function drukCSS(nettoW, nettoH) {
  const a = DRUK_AFLOOP, s = DRUK_SLUG, bw = nettoW + 2 * (a + s), bh = nettoH + 2 * (a + s);
  const schaal = Math.max((nettoW + 2 * a) / nettoW, (nettoH + 2 * a) / nettoH).toFixed(5);
  return `@page{size:${bw}mm ${bh}mm;margin:0}html,body{margin:0;padding:0}
  .vel{position:relative;width:${bw}mm;height:${bh}mm;overflow:hidden;page-break-after:always;background:#fff}
  .vel__bleed{position:absolute;left:${s}mm;top:${s}mm;width:${nettoW + 2 * a}mm;height:${nettoH + 2 * a}mm;overflow:hidden;display:flex;align-items:center;justify-content:center}
  .vel__schaal{flex:none;transform:scale(${schaal})}
  .snij{position:absolute;background:#000}
  .snij--h{height:.3mm;width:${s - 2}mm}
  .snij--v{width:.3mm;height:${s - 2}mm}
  .vel__slug{position:absolute;left:${s}mm;bottom:1.6mm;font:6pt/1 sans-serif;color:#000}
  .bp,.mp{page-break-after:auto!important}`;
}

function drukVel(inhoud, nettoW, nettoH, slug) {
  const a = DRUK_AFLOOP, s = DRUK_SLUG, W = nettoW + 2 * (a + s), H = nettoH + 2 * (a + s);
  const T = s + a, B = H - s - a, L = s + a, R = W - s - a;
  const marks =
    `<span class="snij snij--h" style="left:0;top:${T}mm"></span><span class="snij snij--h" style="left:0;top:${B}mm"></span>` +
    `<span class="snij snij--h" style="right:0;top:${T}mm"></span><span class="snij snij--h" style="right:0;top:${B}mm"></span>` +
    `<span class="snij snij--v" style="top:0;left:${L}mm"></span><span class="snij snij--v" style="top:0;left:${R}mm"></span>` +
    `<span class="snij snij--v" style="bottom:0;left:${L}mm"></span><span class="snij snij--v" style="bottom:0;left:${R}mm"></span>`;
  return `<div class="vel"><div class="vel__bleed"><div class="vel__schaal">${inhoud}</div></div>${marks}<span class="vel__slug">${esc(slug)}</span></div>`;
}

function drukDatum() { const d = new Date(); return `${d.getDate()}-${d.getMonth() + 1}-${d.getFullYear()}`; }

function drukOpen(titel, extraCSS, vellen, fonts, paginaCSS, hintEl, okTekst) {
  const doc = `<!DOCTYPE html><html lang="nl"><head><meta charset="UTF-8"><title>${esc(titel)}</title>
    <style>${fonts}\n${paginaCSS}\n${extraCSS}
    .bslot-leeg{display:none!important}.vervolg{display:none!important}[contenteditable]{outline:none}
    .btekst:empty::before{content:none!important}</style></head>
    <body>${vellen.replace(/ contenteditable="true"/g, "")}
    <script>addEventListener("load",()=>setTimeout(()=>print(),900))<\/script></body></html>`;
  const w = window.open(URL.createObjectURL(new Blob([doc], { type: "text/html" })), "_blank");
  hintEl.textContent = w ? okTekst : "Pop-up geblokkeerd — sta pop-ups toe en probeer opnieuw";
}

async function edDruk() {
  if (!ed) return;
  $("#brHint").textContent = "Drukklare PDF maken…";
  const [fonts, paginaCSS] = await Promise.all([fontsAlsCSS(), (await fetch("brochure-paginas.css?v=8")).text()]);
  const datum = drukDatum();
  const naam = `Brochure_${(ed.compact.straat + "-" + ed.compact.huisnummer).replace(/\s+/g, "-")}_${datum}`;
  edPrintModus = true;
  let vellen;
  try { vellen = ed.paginas.map((p, i) => drukVel(edPaginaHTML(p, i + 1), 210, 297, `${naam} · p${i + 1} · ${datum}`)).join(""); }
  finally { edPrintModus = false; }
  drukOpen(naam, drukCSS(210, 297), vellen, fonts, paginaCSS, $("#brHint"),
    "Drukklaar: 3mm afloop + snijtekens — kies 'Opslaan als PDF'");
}

function parseAdressen(txt) {
  const uit = [], gezien = new Set();
  (txt || "").split(/\r?\n/).forEach(r => {
    const k = r.split(/[;\t]/).map(x => x.trim()).filter(Boolean);
    if (k.length < 3) return;
    const a = k.length >= 4 ? { naam: k[0], straat: k[1], pc: k[2], plaats: k[3] }
                            : { straat: k[0], pc: k[1], plaats: k[2] };
    const sleutel = (a.straat + a.pc).toLowerCase().replace(/\s+/g, "");
    if (!gezien.has(sleutel)) { gezien.add(sleutel); uit.push(a); }
  });
  return uit;
}

async function omDruk() {
  if (!om.o) return;
  const adressen = parseAdressen($("#omAdressen").value);
  const [fonts, css] = await Promise.all([fontsAlsCSS(), (await fetch("brochure-paginas.css?v=8")).text()]);
  const datum = drukDatum();
  const naam = `Mailing_${(om.o.straat + "-" + om.o.huisnummer).replace(/\s+/g, "-")}_${datum}`;
  const setjes = adressen.length ? adressen : [null];
  const bak = document.createElement("div");
  const vellen = setjes.map((a, i) => {
    bak.innerHTML = omHTML(a);
    return [...bak.children].map((el, k) =>
      drukVel(el.outerHTML, 210, 148, `${naam} · kaart ${i + 1} ${k === 0 ? "voor" : "achter"} · ${datum}`)).join("");
  }).join("");
  drukOpen(naam, drukCSS(210, 148), vellen, fonts, css, $("#omAdresInfo"),
    adressen.length ? `${adressen.length} adressen → ${adressen.length * 2} vellen, drukklaar` : "1 blanco kaart (voor + achter), drukklaar");
}

function wnKies(i) {
  const o = rwObjecten[i];
  if (!o) return;
  gekozenWoning = o;
  $$("#wnActies .hub__kaart").forEach(b => b.disabled = false);
  $("#wnStatus").textContent = `${o.straat} ${o.huisnummer}, ${o.plaats} — kies wat je wilt maken`;
  rwKies(o);                                   // socials alvast vullen
  const rwSel = $("#rwSelect"); if (rwSel) rwSel.value = i;
  omZet(o);                                    // mailing alvast klaarzetten
  wpToon(o);                                   // woningpagina-link + QR + kijkerslijst
}

/* ---------- woningpagina (deelbare presentatie + kijkersregistratie) ---------- */
const WP_BASIS = "https://focusmakelaars.github.io/Focus/w/";
const wpUrlVan = o => `${WP_BASIS}?w=${o.afdelingscode}-${o.objectcode}`;

function wpToon(o) {
  $("#wpBlok").classList.remove("is-verborgen");
  $("#wpUrl").value = wpUrlVan(o);
  $("#wpLijst").classList.add("is-verborgen");
  $("#wpLijst").innerHTML = "";
  $("#wpKijkers").textContent = "Kijkerslijst";
  wpDocsLaad();
}

async function wpDocsLaad() {
  if (!gekozenWoning) return;
  const el = $("#wpDocLijst");
  try {
    const r = await (await rwFetch(`/documenten/${gekozenWoning.afdelingscode}/${gekozenWoning.objectcode}`)).json();
    const docs = r.documenten || [];
    el.innerHTML = docs.length
      ? docs.map(d => `<span class="wp-doc">${esc(d.naam)}<button data-doc="${esc(d.naam)}" title="Van de pagina verwijderen">&times;</button></span>`).join("")
      : '<span class="hint hint--licht">Nog geen documenten — upload hier de brochure-PDF, vragenlijst B, het energielabel of de kadastrale kaart.</span>';
  } catch { el.innerHTML = ""; }
}

function wpInit() {
  $("#wpKopieer").addEventListener("click", async () => {
    try { await navigator.clipboard.writeText($("#wpUrl").value); } catch {}
    flashHint($("#wpKopieer"), "Gekopieerd!", "Kopieer link");
  });
  $("#wpQr").addEventListener("click", async () => {
    if (!gekozenWoning) return;
    try {
      const blob = await (await rwFetch(`/qr?data=${encodeURIComponent(wpUrlVan(gekozenWoning))}`)).blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `qr-${gekozenWoning.straat} ${gekozenWoning.huisnummer}.png`.replace(/\s+/g, "-").toLowerCase();
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    } catch { flashHint($("#wpQr"), "Mislukt — proxy?", "Download QR"); }
  });
  $("#wpKijkers").addEventListener("click", async () => {
    if (!gekozenWoning) return;
    const lijst = $("#wpLijst");
    if (!lijst.classList.contains("is-verborgen")) { lijst.classList.add("is-verborgen"); return; }
    try {
      const r = await (await rwFetch(`/leads/${gekozenWoning.afdelingscode}/${gekozenWoning.objectcode}`)).json();
      const leads = r.leads || [];
      lijst.innerHTML = leads.length
        ? `<table><tr><th>Wanneer</th><th>Naam</th><th>E-mail</th><th>Telefoon</th></tr>` +
          leads.map(l => `<tr><td>${esc((l.tijd || "").replace("T", " · ").slice(0, 18))}</td><td>${esc(l.naam)}</td>` +
            `<td><a href="mailto:${esc(l.email)}">${esc(l.email)}</a></td><td>${esc(l.telefoon || "—")}</td></tr>`).join("") + `</table>`
        : '<p class="hint hint--licht">Nog geen kijkers geregistreerd voor deze woning.</p>';
      lijst.classList.remove("is-verborgen");
      $("#wpKijkers").textContent = `Kijkerslijst (${leads.length})`;
    } catch { lijst.innerHTML = '<p class="hint hint--licht">Kijkerslijst ophalen mislukte — draait de proxy?</p>'; lijst.classList.remove("is-verborgen"); }
  });
  $("#wpDocUpload").addEventListener("change", async e => {
    if (!gekozenWoning || !e.target.files.length) return;
    $("#wpDocLijst").innerHTML = '<span class="hint hint--licht">Uploaden…</span>';
    for (const f of e.target.files) {
      try {
        const d = await naarDataURL(f);
        await rwFetch("/document", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ afdelingscode: gekozenWoning.afdelingscode, objectcode: gekozenWoning.objectcode,
                                 naam: f.name, data: d.split(",")[1] })
        });
      } catch { /* volgende bestand proberen */ }
    }
    e.target.value = "";
    wpDocsLaad();
  });
  $("#wpDocLijst").addEventListener("click", async e => {
    const b = e.target.closest("button[data-doc]");
    if (!b || !gekozenWoning) return;
    if (!confirm(`"${b.dataset.doc}" van de woningpagina verwijderen?`)) return;
    try {
      await rwFetch("/document-verwijder", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ afdelingscode: gekozenWoning.afdelingscode, objectcode: gekozenWoning.objectcode, naam: b.dataset.doc })
      });
    } catch {}
    wpDocsLaad();
  });
}

function wnInit() {
  const zoek = $("#wnZoek");
  const lijst = $("#wnResultaten");

  const gesorteerd = () => rwObjecten
    .map((o, i) => ({ o, i }))
    .sort((a, b) => String(b.o.invoerdatum || b.o.gewijzigd || "").localeCompare(String(a.o.invoerdatum || a.o.gewijzigd || "")));

  const toonResultaten = () => {
    const q = zoek.value.trim().toLowerCase().replace(/,/g, "").replace(/\s+/g, " ");
    const treffers = gesorteerd().filter(({ o }) =>
      !q || `${o.straat} ${o.huisnummer} ${o.plaats} ${o.postcode || ""}`.toLowerCase().replace(/\s+/g, " ").includes(q)
    ).slice(0, 12);
    lijst.innerHTML = treffers.length
      ? treffers.map(({ o, i }) =>
          `<div class="hub__rij" data-i="${i}"><div>${esc(o.straat)} ${esc(o.huisnummer)}<small>${esc(o.plaats)}</small></div>` +
          `<span class="status">${BR_STATUS[o.status] || brNet(o.status) || ""}</span></div>`).join("")
      : '<div class="hub__geen">Geen woningen gevonden — probeer een ander zoekwoord.</div>';
    lijst.classList.remove("is-verborgen");
  };

  const vul = () => {
    if (!rwObjecten.length) {
      $("#wnStatus").innerHTML = "Geen verbinding met Realworks — start de proxy op deze PC en herlaad de pagina.<br>De algemene onderdelen hieronder werken gewoon.";
      return;
    }
    zoek.disabled = false;
    $("#wnStatus").textContent = `${rwObjecten.length} woning(en) uit Realworks — typ om te zoeken`;
  };
  wnVulFn = vul;

  zoek.addEventListener("input", toonResultaten);
  zoek.addEventListener("focus", toonResultaten);
  document.addEventListener("click", e => {
    if (!e.target.closest(".hub__zoek")) lijst.classList.add("is-verborgen");
  });
  lijst.addEventListener("click", e => {
    const rij = e.target.closest(".hub__rij");
    if (!rij) return;
    const i = +rij.dataset.i;
    zoek.value = `${rwObjecten[i].straat} ${rwObjecten[i].huisnummer}, ${rwObjecten[i].plaats}`;
    lijst.classList.add("is-verborgen");
    wnKies(i);
  });

  $("#wnActies").addEventListener("click", e => {
    const b = e.target.closest(".hub__kaart");
    if (!b || b.disabled || !gekozenWoning) return;
    toonTab(b.dataset.doel); // toonTab laadt brochure/mailing zelf voor de gekozen woning
  });
  $$(".hub__link").forEach(b => b.addEventListener("click", () => {
    toonTab(b.dataset.doel === "social-algemeen" ? "social" : b.dataset.doel);
  }));

  const ov = $("#omVestiging");
  ov.innerHTML = Object.keys(FOCUS.vestigingen).map(v => `<option${v === state.vestiging ? " selected" : ""}>${v}</option>`).join("");
  ov.addEventListener("change", omRender);
  $("#omSoort").addEventListener("change", omRender);
  $("#omCanvas").addEventListener("input", e => {
    const el = e.target.closest("[data-om]");
    if (!el || !om.o) return;
    const soort = $("#omSoort").value;
    (om.teksten[soort] = om.teksten[soort] || {})[el.dataset.om] = el.innerText;
  });
  $("#omPrint").addEventListener("click", omPrint);
  $("#omDruk").addEventListener("click", omDruk);
  $("#brDruk").addEventListener("click", edDruk);
  $("#omAdressen").addEventListener("input", () => {
    const n = parseAdressen($("#omAdressen").value).length;
    $("#omAdresInfo").textContent = n ? `${n} adressen (na ontdubbeling) → ${n * 2} drukvellen` : "";
  });
  $("#omBag").addEventListener("click", async () => {
    if (!om.o) return;
    const straal = Math.min(Math.max(+$("#omStraal").value || 150, 25), 1000);
    const maxn = Math.min(Math.max(+$("#omMax").value || 100, 1), 500);
    $("#omBag").disabled = true;
    $("#omAdresInfo").textContent = `Buurt-adressen ophalen uit de BAG (${straal} m)…`;
    try {
      const adres = `${om.o.straat} ${om.o.huisnummer}, ${om.o.plaats}`;
      const eigen = `${om.o.straat} ${om.o.huisnummer}`;
      const r = await (await rwFetch(`/buurtadressen?adres=${encodeURIComponent(adres)}&straal=${straal}&max=${maxn}&eigen=${encodeURIComponent(eigen)}`)).json();
      const ad = r.adressen || [];
      if (!ad.length) throw new Error("leeg");
      $("#omAdressen").value = ad.map(a => `${a.straat}; ${a.pc}; ${a.plaats}`).join("\n");
      $("#omAdresInfo").textContent = `${ad.length} woonadressen binnen ${straal} m (BAG, dichtstbij eerst) — controleer en pas gerust aan`;
    } catch {
      $("#omAdresInfo").textContent = "Buurt-adressen ophalen mislukte — controleer de straal of probeer opnieuw";
    }
    $("#omBag").disabled = false;
  });
}

/* ---------- toegangspoort ---------- */
const POORT_HASH = "8c2574892063f995fdf756bce07f46c1a5193e54cd52837ed91e32008ccf41ac";

async function sha256hex(tekst) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(tekst));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
}

function poortInit() {
  const poort = $("#poort");
  $("#poortOog").innerHTML = beeldmerkSVG();
  try {
    if (localStorage.getItem("fs-toegang") === POORT_HASH) {
      poort.classList.add("is-verborgen");
      return;
    }
  } catch {}
  $("#poortForm").addEventListener("submit", async e => {
    e.preventDefault();
    const hash = await sha256hex($("#poortWachtwoord").value.trim());
    if (hash === POORT_HASH) {
      try { localStorage.setItem("fs-toegang", hash); } catch {}
      poort.classList.add("is-verborgen");
      schaalPodium();
    } else {
      $("#poortFout").classList.remove("is-verborgen");
      $("#poortWachtwoord").select();
    }
  });
}

/* ---------- events ---------- */
function init() {
  poortInit();
  $("#topBeeldmerk").innerHTML = beeldmerkSVG();
  // versienummer uit de cache-buster: klopt altijd met de echt geladen studio.js
  const jsSrc = ($("script[src^='studio.js']") || {}).src || "";
  $("#topVersie").textContent = "v" + ((jsSrc.match(/v=(\d+)/) || [])[1] || "?");
  $("#edLadenOog").innerHTML = beeldmerkSVG();

  // vestigingen
  const vs = $("#vestigingSelect");
  vs.innerHTML = Object.keys(FOCUS.vestigingen).map(v => `<option${v === state.vestiging ? " selected" : ""}>${v}</option>`).join("");
  vs.addEventListener("change", () => { state.vestiging = vs.value; render(); });

  // sjabloon-tegels
  $("#templateKeuze").addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b) return;
    $$("#templateKeuze button").forEach(x => x.classList.toggle("is-active", x === b));
    state.template = b.dataset.t;
    resetPoster();
    rwToepassen();
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
  $("#qrToggle").addEventListener("change", e => { state.qrAan = e.target.checked; render(); });
  $("#downloadBtn").addEventListener("click", downloadPNG);
  $("#deelBtn").addEventListener("click", deelPNG);
  $("#brToch").addEventListener("click", () => $("#tab-brochure").classList.add("toon-editor"));

  // fotobibliotheek van de gekozen woning (naast uploaden)
  $("#swBieb").addEventListener("click", swOpen);
  $("#swSluit").addEventListener("click", () => $("#swModal").classList.add("is-verborgen"));
  $("#swModal").addEventListener("click", e => { if (e.target === $("#swModal")) $("#swModal").classList.add("is-verborgen"); });
  $("#swGrid").addEventListener("click", e => {
    const b = e.target.closest("button[data-i]");
    if (b) swKies(+b.dataset.i);
  });

  // tabs
  $$(".tab").forEach(t => t.addEventListener("click", () => toonTab(t.dataset.tab)));

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
  rwInit();
  brInit();
  wnInit();
  wpInit();
}

document.addEventListener("DOMContentLoaded", init);
})();
