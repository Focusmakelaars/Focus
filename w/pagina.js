/* ============================================================
   FOCUS WONINGPAGINA — logica
   Haalt de woning op via de Focus-proxy (lokaal of teamtunnel),
   registreert kijkers (naam + e-mail) en toont daarna de
   volledige presentatie. URL: /Focus/w/?w=<afdelingscode>-<objectcode>
   ============================================================ */

(() => {
"use strict";

const $ = (s, el) => (el || document).querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));

let RW_PROXY = "http://127.0.0.1:8465";
const RW_SLEUTEL = "fs-x7q9-oog-2026";
const AFDELINGEN = { "935046": "Eindhoven" }; // afdelingscode → vestigingsnaam (uitbreiden per vestiging)
const MAX_GALERIJ = 15;

const OOG_SVG = `<svg viewBox="0 0 252 252.37" xmlns="http://www.w3.org/2000/svg"><path d="M142.8867.493v40.765c35.029,6.953,62.503,35.099,68.474,70.467h40.639C245.4327,54.129,200.1497,8.149,142.8867.493" fill="currentColor"/><path d="M0,111.725h40.639c6.192-36.662,35.481-65.571,72.344-71.152V0C53.897,6.05,6.718,52.834,0,111.725" fill="currentColor"/><path d="M40.8159,141.6289H.1259c7.129,58.426,54.099,104.723,112.857,110.74v-40.573c-36.53-5.532-65.619-33.975-72.167-70.167" fill="currentColor"/><path d="M142.8867,211.1107v40.764c56.936-7.611,102.017-53.113,108.988-110.246h-40.688c-6.316,34.904-33.597,62.593-68.3,69.482" fill="currentColor"/><path d="M156.4087,126.1845c0,16.794-13.615,30.408-30.409,30.408s-30.408-13.614-30.408-30.408,13.614-30.409,30.408-30.409,30.409,13.615,30.409,30.409" fill="currentColor"/></svg>`;

function rwFetch(pad, opts) {
  opts = opts || {};
  opts.headers = Object.assign({}, opts.headers, { "X-Studio-Sleutel": RW_SLEUTEL });
  return fetch(RW_PROXY + pad, opts);
}

async function verbind() {
  try {
    const r = await rwFetch("/gezond", { signal: AbortSignal.timeout(2000) });
    if (r.ok) return true;
  } catch {}
  try {
    const pub = await (await fetch("../studio/api-url.json?cb=" + Date.now())).json();
    if (pub && pub.url) {
      RW_PROXY = pub.url.replace(/\/$/, "");
      const r = await rwFetch("/gezond", { signal: AbortSignal.timeout(8000) });
      if (r.ok) return true;
    }
  } catch {}
  return false;
}

const net = s => { s = String(s || "").replace(/_/g, " ").toLowerCase(); return s.charAt(0).toUpperCase() + s.slice(1); };
const euro = n => "€ " + Math.round(n).toLocaleString("nl-NL");
const STATUS = {
  BESCHIKBAAR: "Te koop", IN_AANMELDING: "Binnenkort te koop", IN_VOORBEREIDING: "Binnenkort te koop",
  ONDER_BOD: "Te koop · onder bod", ONDER_OPTIE: "Te koop · onder optie",
  VERKOCHT_ONDER_VOORBEHOUD: "Verkocht o.v.", VERKOCHT: "Verkocht", VERHUURD: "Verhuurd"
};

let afd = null, code = null, obj = null, fotoLijst = [];

async function fotoURL(link, maat) {
  const blob = await (await rwFetch(`/foto?url=${encodeURIComponent(link)}${maat ? "&maat=" + maat : ""}`)).blob();
  return URL.createObjectURL(blob);
}

function kernHTML() {
  const alg = obj.algemeen || {}, fin = (obj.financieel || {}).overdracht || {};
  const etages = ((obj.detail || {}).etages) || [];
  const slaap = etages.reduce((s, e) => s + (e.aantalSlaapkamers || 0), 0) || null;
  const items = [];
  if (alg.woonoppervlakte) items.push([alg.woonoppervlakte + " m²", "woonoppervlakte"]);
  if (alg.totaleKadestraleOppervlakte) items.push([alg.totaleKadestraleOppervlakte + " m²", "perceel"]);
  if (alg.aantalKamers) items.push([alg.aantalKamers, "kamers"]);
  if (slaap) items.push([slaap, "slaapkamers"]);
  if (alg.bouwjaar) items.push([alg.bouwjaar, "bouwjaar"]);
  if (alg.energieklasse) items.push([alg.energieklasse, "energielabel"]);
  return items.slice(0, 6).map(([w, l]) => `<div><strong>${esc(w)}</strong><span>${esc(l)}</span></div>`).join("");
}

function feitenHTML() {
  const alg = obj.algemeen || {}, fin = (obj.financieel || {}).overdracht || {};
  const det = obj.detail || {}, buiten = det.buitenruimte || {}, etages = det.etages || [];
  const eerste = a => (a && a.length ? net(a[0]) : null);
  const prijs = fin.koopprijs || fin.huurprijs;
  const conditie = { KOSTEN_KOPER: "k.k.", VRIJ_OP_NAAM: "v.o.n." }[fin.koopconditie] || "";
  const blok = (titel, rijen) => {
    rijen = rijen.filter(([, v]) => v != null && v !== "");
    if (!rijen.length) return "";
    return `<div class="fblok"><h3>${titel}</h3><table>` +
      rijen.map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join("") + `</table></div>`;
  };
  return blok("Overdracht", [
      ["Status", STATUS[fin.status] || net(fin.status)],
      ["Vraagprijs", prijs ? `${euro(prijs)} ${conditie}`.trim() : null],
      ["Aanvaarding", net(fin.aanvaarding)]])
    + blok("Bouw", [
      ["Soort", net(alg.woonhuistype) || net(alg.appartementsoort)],
      ["Bouwjaar", alg.bouwjaar], ["Bouwvorm", net(alg.bouwvorm)]])
    + blok("Oppervlakten", [
      ["Woonoppervlakte", alg.woonoppervlakte ? alg.woonoppervlakte + " m²" : null],
      ["Perceel", alg.totaleKadestraleOppervlakte ? alg.totaleKadestraleOppervlakte + " m²" : null],
      ["Inhoud", alg.inhoud ? alg.inhoud + " m³" : null]])
    + blok("Indeling", [
      ["Kamers", alg.aantalKamers],
      ["Slaapkamers", etages.reduce((s, e) => s + (e.aantalSlaapkamers || 0), 0) || null],
      ["Woonlagen", etages.length || null]])
    + blok("Energie", [
      ["Energielabel", alg.energieklasse], ["Verwarming", eerste(alg.verwarmingsoorten)],
      ["Isolatie", eerste(alg.isolatievormen)]])
    + blok("Buiten", [
      ["Tuin", net(buiten.hoofdtuintype)], ["Garage", eerste(buiten.garagesoorten)],
      ["Parkeren", eerste(buiten.parkeerfaciliteiten)]]);
}

function vestiging() {
  const naam = AFDELINGEN[afd];
  const v = naam && typeof FOCUS !== "undefined" && FOCUS.vestigingen[naam];
  return v ? Object.assign({ naam }, v) : null;
}

function toonContact() {
  const v = vestiging();
  const tel = v ? v.telefoon : "";
  $("#wCtaTekst").textContent = v
    ? `Plan een bezichtiging of stel je vragen aan Focus Makelaars ${v.naam} — ${v.adres}.`
    : "Plan een bezichtiging of stel je vragen — we kijken graag met je mee.";
  $("#wCtaKnoppen").innerHTML = v
    ? `<a class="bel" href="tel:${v.telefoon.replace(/[^\d+]/g, "")}">Bel ${esc(v.telefoon)}</a>
       <a class="mail" href="mailto:${esc(v.mail)}?subject=${encodeURIComponent("Bezichtiging " + $("#wAdres").textContent)}">Mail ons</a>`
    : "";
  if (v) $("#wVoet").textContent = `Focus Makelaars ${v.naam} · ${v.adres} · ${v.telefoon} — met oog voor jou.`;
  $("#wFoutContact").innerHTML = v
    ? `Focus Makelaars ${esc(v.naam)} · <a href="tel:${v.telefoon.replace(/[^\d+]/g, "")}">${esc(v.telefoon)}</a> · <a href="mailto:${esc(v.mail)}">${esc(v.mail)}</a>` : "";
}

async function toonVolledig() {
  $("#wPoort").classList.add("is-verborgen");
  $("#wVol").classList.remove("is-verborgen");
  // verhaal
  const teksten = obj.teksten || {};
  const verhaal = teksten.aanbiedingstekst || teksten.a4Tekst || "";
  if (verhaal) $("#wVerhaal").textContent = verhaal;
  else $("#wVerhaalBlok").classList.add("is-verborgen");
  // feiten
  $("#wFeiten").innerHTML = feitenHTML();
  // galerij (lui laden, klein formaat)
  const gal = $("#wGalerij");
  gal.innerHTML = fotoLijst.slice(0, MAX_GALERIJ).map((m, i) =>
    `<div class="foto${i % 5 === 0 ? " foto--breed" : ""}" data-i="${i}"></div>`).join("");
  for (const el of gal.querySelectorAll(".foto")) {
    try {
      const url = await fotoURL(fotoLijst[+el.dataset.i].link, "klein");
      el.innerHTML = `<img src="${url}" alt="Woningfoto" loading="lazy">`;
    } catch { el.remove(); }
  }
}

async function registreer(e) {
  e.preventDefault();
  const naam = $("#wNaam").value.trim(), email = $("#wEmail").value.trim();
  const fout = $("#wFormFout");
  fout.classList.add("is-verborgen");
  if (!naam || !/.+@.+\..+/.test(email)) {
    fout.textContent = "Vul je naam en een geldig e-mailadres in.";
    fout.classList.remove("is-verborgen");
    return;
  }
  $("#wVerder").disabled = true;
  try {
    const r = await rwFetch("/lead", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        afdelingscode: afd, objectcode: code, adres: $("#wAdres").textContent,
        naam, email, telefoon: $("#wTel").value.trim()
      })
    });
    if (!r.ok) throw new Error("registratie mislukt");
    try { localStorage.setItem(`fs-w-${afd}-${code}`, JSON.stringify({ naam, email })); } catch {}
    toonVolledig();
  } catch {
    fout.textContent = "Er ging iets mis — probeer het nog eens, of bel ons gerust.";
    fout.classList.remove("is-verborgen");
  }
  $("#wVerder").disabled = false;
}

async function init() {
  $("#wLaadOog").innerHTML = OOG_SVG;
  const param = new URLSearchParams(location.search).get("w") || "";
  const streep = param.indexOf("-");
  afd = param.slice(0, streep); code = param.slice(streep + 1);
  if (!afd || !code || !await verbind()) {
    $("#wLaden").classList.add("is-verborgen");
    $("#wFout").classList.remove("is-verborgen");
    toonContact();
    return;
  }
  try {
    obj = await (await rwFetch(`/object/${afd}/${code}`)).json();
    if (!obj || obj.fout) throw new Error("niet gevonden");
  } catch {
    $("#wLaden").classList.add("is-verborgen");
    $("#wFout").classList.remove("is-verborgen");
    toonContact();
    return;
  }

  const adres = obj.adres || {}, hn = adres.huisnummer || {};
  const straatnr = `${adres.straat || ""} ${hn.hoofdnummer || ""}${hn.toevoeging ? "-" + hn.toevoeging : ""}`.trim();
  const plaats = (adres.plaats || "").split(" ").map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(" ");
  const fin = (obj.financieel || {}).overdracht || {};
  document.title = `${straatnr}, ${plaats} | Focus Makelaars`;
  $("#wAdres").textContent = straatnr;
  $("#wPlaats").textContent = `${adres.postcode || ""} ${plaats}`.trim();
  $("#wStatus").textContent = STATUS[fin.status] || "Te koop";
  const prijs = fin.koopprijs || fin.huurprijs;
  $("#wPrijs").textContent = prijs
    ? `${euro(prijs)} ${fin.huurprijs && !fin.koopprijs ? "p.m." : ({ KOSTEN_KOPER: "k.k.", VRIJ_OP_NAAM: "v.o.n." }[fin.koopconditie] || "")}`.trim() : "";
  $("#wKern").innerHTML = kernHTML();
  toonContact();

  fotoLijst = (obj.media || []).filter(m => ["HOOFDFOTO", "FOTO"].includes(m.soort) && m.vrijgave)
    .sort((a, b) => (a.soort !== "HOOFDFOTO") - (b.soort !== "HOOFDFOTO") || (a.volgnummer || 99) - (b.volgnummer || 99));
  if (fotoLijst.length) {
    try { $("#wHeroFoto").innerHTML = `<img src="${await fotoURL(fotoLijst[0].link, "klein")}" alt="${esc(straatnr)}">`; } catch {}
  }

  $("#wLaden").classList.add("is-verborgen");
  $("#wInhoud").classList.remove("is-verborgen");

  // al geregistreerd op dit apparaat? → meteen door
  let bekend = null;
  try { bekend = JSON.parse(localStorage.getItem(`fs-w-${afd}-${code}`)); } catch {}
  if (bekend && bekend.email) toonVolledig();

  $("#wForm").addEventListener("submit", registreer);
}

document.addEventListener("DOMContentLoaded", init);
})();
