/* ============================================================
   FOCUS WAARDECHECK — logica
   Indicatieve woningwaarde op basis van mediane NVM-
   transactieprijzen per m², per gemeente en woningtype.
   Indicatie ≠ taxatie: de CTA brengt de bezoeker naar een
   gratis waardebepaling door de juiste vestiging.

   De cijfers hieronder zijn GEGENEREERD — niet met de hand
   bijwerken. Nieuwe NVM-dump geplaatst? Draai:
     python focus-marktdata\maak_waardecheck.py
   Dat pakt automatisch de laatste vier AFGERONDE kwartalen.
   ============================================================ */

(() => {
"use strict";

const VESTIGINGEN = {
  "Helmond":      { tel: "0492 - 792 172",  mail: "helmond@focusmakelaars.nl" },
  "Eindhoven":    { tel: "040 - 218 00 78", mail: "eindhoven@focusmakelaars.nl" },
  "Breda":        { tel: "076 - 766 01 03", mail: "breda@focusmakelaars.nl" },
  "Rotterdam":    { tel: "010 - 200 43 14", mail: "rotterdam@focusmakelaars.nl" },
  "Kennemerland": { tel: "0251 - 342 414",  mail: "kennemerland@focusmakelaars.nl" },
  "de Meierij":   { tel: "06 - 50 62 77 49", mail: "meierij@focusmakelaars.nl" }
};

/* >>> CIJFERS — automatisch gegenereerd door focus-marktdata\maak_waardecheck.py <<< */
const PEILDATUM = "3e kwartaal 2025 t/m 2e kwartaal 2026";
/* gewogen mediane transactieprijs per m2 over 3e kwartaal 2025 t/m 2e kwartaal 2026; n = aantal transacties.
   Uitsluitend AFGERONDE kwartalen — bron: NVM/VGM via focus-marktdata. */
const DATA = {
 "Best":{v:"Eindhoven",loop:28,verkocht:386,t:{"Tussenwoning":[4280,130],"Hoekwoning":[4384,75],"2-onder-1-kapwoning":[4357,78],"Vrijstaande woning":[4653,54],"Appartement":[5514,49],"Totaal":[4524,386]}},
 "Beverwijk":{v:"Kennemerland",loop:26,verkocht:520,t:{"Tussenwoning":[4250,130],"Hoekwoning":[4469,62],"2-onder-1-kapwoning":[4629,58],"Vrijstaande woning":[4864,29],"Appartement":[4767,241],"Totaal":[4592,520]}},
 "Breda":{v:"Breda",loop:23,verkocht:2634,t:{"Tussenwoning":[4404,799],"Hoekwoning":[4435,361],"2-onder-1-kapwoning":[4742,284],"Vrijstaande woning":[5292,220],"Appartement":[5039,970],"Totaal":[4752,2634]}},
 "Castricum":{v:"Kennemerland",loop:32,verkocht:479,t:{"Tussenwoning":[4356,112],"Hoekwoning":[4743,78],"2-onder-1-kapwoning":[4902,76],"Vrijstaande woning":[5583,79],"Appartement":[5413,134],"Totaal":[5004,479]}},
 "Drimmelen":{v:"Breda",loop:34,verkocht:359,t:{"Tussenwoning":[3897,71],"Hoekwoning":[4128,50],"2-onder-1-kapwoning":[4193,103],"Vrijstaande woning":[4374,112],"Appartement":[5045,23],"Totaal":[4236,359]}},
 "Eindhoven":{v:"Eindhoven",loop:28,verkocht:3226,t:{"Tussenwoning":[4416,1063],"Hoekwoning":[4433,438],"2-onder-1-kapwoning":[4601,190],"Vrijstaande woning":[5021,122],"Appartement":[5362,1413],"Totaal":[4867,3226]}},
 "Etten-Leur":{v:"Breda",loop:24,verkocht:534,t:{"Tussenwoning":[3722,205],"Hoekwoning":[3895,104],"2-onder-1-kapwoning":[4241,64],"Vrijstaande woning":[4346,89],"Appartement":[4858,72],"Totaal":[4075,534]}},
 "Geertruidenberg":{v:"Breda",loop:29,verkocht:290,t:{"Tussenwoning":[3724,101],"Hoekwoning":[3785,46],"2-onder-1-kapwoning":[4016,73],"Vrijstaande woning":[4262,38],"Appartement":[4921,32],"Totaal":[4010,290]}},
 "Geldrop-Mierlo":{v:"Eindhoven",loop:28,verkocht:498,t:{"Tussenwoning":[4010,182],"Hoekwoning":[4228,92],"2-onder-1-kapwoning":[4151,85],"Vrijstaande woning":[4743,79],"Appartement":[5199,60],"Totaal":[4334,498]}},
 "Heemskerk":{v:"Kennemerland",loop:28,verkocht:404,t:{"Tussenwoning":[4290,123],"Hoekwoning":[4421,75],"2-onder-1-kapwoning":[5016,44],"Vrijstaande woning":[5648,30],"Appartement":[5088,132],"Totaal":[4755,404]}},
 "Heiloo":{v:"Kennemerland",loop:50,verkocht:307,t:{"Tussenwoning":[4596,60],"Hoekwoning":[4744,53],"2-onder-1-kapwoning":[5174,56],"Vrijstaande woning":[5782,70],"Appartement":[5828,68],"Totaal":[5270,307]}},
 "Helmond":{v:"Helmond",loop:26,verkocht:1031,t:{"Tussenwoning":[3737,341],"Hoekwoning":[3805,174],"2-onder-1-kapwoning":[4015,193],"Vrijstaande woning":[4277,119],"Appartement":[4445,204],"Totaal":[4003,1031]}},
 "Maassluis":{v:"Rotterdam",loop:34,verkocht:433,t:{"Tussenwoning":[4149,142],"Hoekwoning":[4107,70],"2-onder-1-kapwoning":[4662,13],"Vrijstaande woning":[5883,6],"Appartement":[4460,202],"Totaal":[4327,433]}},
 "Meierijstad":{v:"de Meierij",loop:35,verkocht:1022,t:{"Tussenwoning":[3814,275],"Hoekwoning":[4139,172],"2-onder-1-kapwoning":[4188,229],"Vrijstaande woning":[4400,202],"Appartement":[4766,144],"Totaal":[4202,1022]}},
 "Midden-Delfland":{v:"Rotterdam",loop:32,verkocht:222,t:{"Tussenwoning":[4850,78],"Hoekwoning":[5043,49],"2-onder-1-kapwoning":[5232,31],"Vrijstaande woning":[6271,22],"Appartement":[5664,42],"Totaal":[5241,222]}},
 "Oirschot":{v:"Eindhoven",loop:36,verkocht:244,t:{"Tussenwoning":[4176,66],"Hoekwoning":[4500,37],"2-onder-1-kapwoning":[4542,48],"Vrijstaande woning":[4907,72],"Appartement":[5937,21],"Totaal":[4665,244]}},
 "Oosterhout":{v:"Breda",loop:25,verkocht:767,t:{"Tussenwoning":[3841,243],"Hoekwoning":[3868,111],"2-onder-1-kapwoning":[3980,154],"Vrijstaande woning":[4524,92],"Appartement":[4582,167],"Totaal":[4116,767]}},
 "Rotterdam":{v:"Rotterdam",loop:33,verkocht:8272,t:{"Tussenwoning":[4253,1226],"Hoekwoning":[4457,466],"2-onder-1-kapwoning":[5012,158],"Vrijstaande woning":[5597,113],"Appartement":[4777,6309],"Totaal":[4697,8272]}},
 "Someren":{v:"Helmond",loop:25,verkocht:183,t:{"Tussenwoning":[3974,31],"Hoekwoning":[4440,11],"2-onder-1-kapwoning":[3810,82],"Vrijstaande woning":[4183,37],"Appartement":[4934,22],"Totaal":[4086,183]}},
 "Son en Breugel":{v:"Eindhoven",loop:26,verkocht:194,t:{"Tussenwoning":[3865,42],"Hoekwoning":[4426,38],"2-onder-1-kapwoning":[4234,69],"Vrijstaande woning":[4724,24],"Appartement":[5305,21],"Totaal":[4368,194]}},
 "Uitgeest":{v:"Kennemerland",loop:26,verkocht:146,t:{"Tussenwoning":[4276,45],"Hoekwoning":[4397,30],"2-onder-1-kapwoning":[4825,32],"Vrijstaande woning":[5525,14],"Appartement":[5621,25],"Totaal":[4771,146]}},
 "Veldhoven":{v:"Eindhoven",loop:36,verkocht:634,t:{"Tussenwoning":[4561,193],"Hoekwoning":[4525,104],"2-onder-1-kapwoning":[4580,131],"Vrijstaande woning":[5017,105],"Appartement":[5121,101],"Totaal":[4724,634]}},
 "Vlaardingen":{v:"Rotterdam",loop:30,verkocht:891,t:{"Tussenwoning":[4190,241],"Hoekwoning":[4352,113],"2-onder-1-kapwoning":[4877,38],"Vrijstaande woning":[4813,17],"Appartement":[3989,482],"Totaal":[4143,891]}},
 "Zaanstad":{v:"Kennemerland",loop:33,verkocht:1972,t:{"Tussenwoning":[4292,660],"Hoekwoning":[4439,351],"2-onder-1-kapwoning":[4810,211],"Vrijstaande woning":[4844,162],"Appartement":[5300,588],"Totaal":[4720,1972]}}
};
/* >>> EINDE CIJFERS <<< */

const STAAT = {
  moderniseren: { factor: 0.93, tekst: "toe aan modernisering" },
  goed:         { factor: 1.00, tekst: "goed onderhouden" },
  luxe:         { factor: 1.07, tekst: "recent gemoderniseerd" }
};

/* minimaal aantal transacties voordat we het type-specifieke m²-cijfer vertrouwen */
const MIN_N = 12;

const $ = (s, el) => (el || document).querySelector(s);
const $$ = (s, el) => [...(el || document).querySelectorAll(s)];

const antwoord = { gemeente: null, type: null, m2: 120, staat: null };

/* ---------- navigatie ---------- */
const STAPPEN = ["gemeente", "type", "m2", "staat", "resultaat"];
let huidig = -1; // -1 = hero

function toon(stapId) {
  $$(".stap").forEach(s => s.classList.remove("is-actief"));
  $("#stap-" + stapId).classList.add("is-actief");
  huidig = STAPPEN.indexOf(stapId);
  $$(".dots span").forEach((d, i) => {
    d.classList.toggle("is-hier", i === huidig);
    d.classList.toggle("is-af", i < huidig);
  });
  $("#wizard").scrollIntoView({ behavior: "smooth", block: "start" });
}

/* ---------- stap 1: gemeente ---------- */
function vulGemeentes() {
  const sel = $("#gemeenteSelect");
  Object.keys(DATA).sort((a, b) => a.localeCompare(b, "nl")).forEach(g => {
    const o = document.createElement("option");
    o.value = g; o.textContent = g;
    sel.appendChild(o);
  });
  const anders = document.createElement("option");
  anders.value = "__anders"; anders.textContent = "Mijn gemeente staat er niet bij…";
  sel.appendChild(anders);
}

/* ---------- rekenwerk ---------- */
function euro(n) {
  return "€ " + Math.round(n).toLocaleString("nl-NL");
}
function afronden1000(n) { return Math.round(n / 1000) * 1000; }

function bereken() {
  const d = DATA[antwoord.gemeente];
  let [m2prijs, n] = d.t[antwoord.type] || [0, 0];
  let fallback = false;
  if (!m2prijs || n < MIN_N) { [m2prijs, n] = d.t["Totaal"]; fallback = true; }
  const mid = m2prijs * antwoord.m2 * STAAT[antwoord.staat].factor;
  return {
    laag: afronden1000(mid * 0.91),
    hoog: afronden1000(mid * 1.09),
    mid: afronden1000(mid),
    m2prijs, fallback, d
  };
}

/* ---------- resultaat ---------- */
function toonResultaat() {
  const r = bereken();
  const d = r.d;
  const vest = VESTIGINGEN[d.v];

  $("#resRange").textContent = `${euro(r.laag)} – ${euro(r.hoog)}`;
  $("#resMid").innerHTML = `Indicatie voor een ${STAAT[antwoord.staat].tekst.toLowerCase()} ${typeLabel(antwoord.type).toLowerCase()} van ${antwoord.m2} m² in ${antwoord.gemeente}`;

  $("#chipM2").innerHTML = `<strong>${euro(r.m2prijs)}</strong> mediane verkoopprijs per m²${r.fallback ? " (alle woningtypen)" : " voor dit woningtype"}`;
  $("#chipVerkocht").innerHTML = `<strong>${d.verkocht.toLocaleString("nl-NL")}</strong> woningen verkocht in ${antwoord.gemeente} (${PEILDATUM})`;
  $("#chipLooptijd").innerHTML = `<strong>± ${d.loop} dagen</strong> gemiddelde verkooptijd`;

  $("#resDuiding").innerHTML =
    `Deze indicatie is rekenwerk op basis van échte NVM-verkopen in jouw gemeente. ` +
    `Maar jouw woning is geen gemiddelde: ligging, tuin, energielabel, uitbouw en afwerking ` +
    `kunnen tienduizenden euro's verschil maken. Die ziet alleen een makelaar die langskomt.`;

  $("#ctaVestiging").textContent = `Focus Makelaars ${d.v}`;
  const tel = $("#ctaBel");
  tel.href = "tel:" + vest.tel.replace(/[^\d+]/g, "");
  tel.querySelector("span").textContent = `Bel ${vest.tel}`;

  const onderwerp = encodeURIComponent(`Gratis waardebepaling aanvragen — ${antwoord.gemeente}`);
  const body = encodeURIComponent(
`Hoi Focus Makelaars ${d.v},

Ik deed de Focus Waardecheck en wil graag een gratis waardebepaling aanvragen.

Mijn woning:
• Gemeente: ${antwoord.gemeente}
• Type: ${typeLabel(antwoord.type)}
• Woonoppervlak: ± ${antwoord.m2} m²
• Staat: ${STAAT[antwoord.staat].tekst}
• Indicatie uit de check: ${euro(r.laag)} – ${euro(r.hoog)}

Mijn adres: (vul hier je adres in)
Mijn telefoonnummer: (vul hier je nummer in)

Groeten!`);
  $("#ctaMail").href = `mailto:${vest.mail}?subject=${onderwerp}&body=${body}`;

  toon("resultaat");
}

function typeLabel(t) {
  return t === "2-onder-1-kapwoning" ? "2-onder-1-kapwoning" : t;
}

/* ---------- rekenanimatie ---------- */
function startBerekening() {
  $("#wizardKaart").classList.add("is-verborgen");
  $("#rekenKaart").classList.remove("is-verborgen");
  const zinnen = ["NVM-verkoopcijfers ophalen…", `Vergelijken met verkopen in ${antwoord.gemeente}…`, "Jouw indicatie opstellen…"];
  const p = $("#rekenTekst");
  let i = 0;
  p.textContent = zinnen[0];
  const t = setInterval(() => { i++; if (i < zinnen.length) p.textContent = zinnen[i]; }, 650);
  setTimeout(() => {
    clearInterval(t);
    $("#rekenKaart").classList.add("is-verborgen");
    $("#wizardKaart").classList.remove("is-verborgen");
    toonResultaat();
  }, 2050);
}

/* ---------- "andere gemeente" ---------- */
function toonAnders() {
  $("#stap-gemeente").classList.remove("is-actief");
  $("#stap-anders").classList.add("is-actief");
}

/* ---------- init ---------- */
document.addEventListener("DOMContentLoaded", () => {
  vulGemeentes();

  /* ?gemeente=Helmond (bv. via QR op de wijkmailing) → alvast voorselecteren */
  const qs = new URLSearchParams(location.search).get("gemeente");
  if (qs) {
    const match = Object.keys(DATA).find(g => g.toLowerCase() === qs.toLowerCase());
    if (match) {
      $("#gemeenteSelect").value = match;
      $("#gemeenteVerder").disabled = false;
    }
  }

  $("#startBtn").addEventListener("click", () => {
    $("#wizard").classList.remove("is-verborgen");
    toon("gemeente");
  });

  $("#gemeenteVerder").addEventListener("click", () => {
    const v = $("#gemeenteSelect").value;
    if (!v) return;
    if (v === "__anders") { toonAnders(); return; }
    antwoord.gemeente = v;
    toon("type");
  });
  $("#gemeenteSelect").addEventListener("change", e => {
    $("#gemeenteVerder").disabled = !e.target.value;
  });

  $$("#typeTegels .tegel").forEach(t => t.addEventListener("click", () => {
    $$("#typeTegels .tegel").forEach(x => x.classList.remove("is-gekozen"));
    t.classList.add("is-gekozen");
    antwoord.type = t.dataset.type;
    setTimeout(() => toon("m2"), 260);
  }));

  const slider = $("#m2Slider");
  const upd = () => { antwoord.m2 = +slider.value; $("#m2Waarde").firstChild.textContent = slider.value; };
  slider.addEventListener("input", upd); upd();
  $("#m2Verder").addEventListener("click", () => toon("staat"));

  $$("#staatTegels .tegel").forEach(t => t.addEventListener("click", () => {
    $$("#staatTegels .tegel").forEach(x => x.classList.remove("is-gekozen"));
    t.classList.add("is-gekozen");
    antwoord.staat = t.dataset.staat;
    setTimeout(startBerekening, 260);
  }));

  $$("[data-terug]").forEach(b => b.addEventListener("click", () => toon(b.dataset.terug)));
  $("#opnieuwBtn").addEventListener("click", () => {
    antwoord.gemeente = antwoord.type = antwoord.staat = null;
    $("#gemeenteSelect").value = "";
    $("#gemeenteVerder").disabled = true;
    $$(".tegel").forEach(x => x.classList.remove("is-gekozen"));
    toon("gemeente");
  });
  $("#andersTerug").addEventListener("click", () => {
    $("#stap-anders").classList.remove("is-actief");
    toon("gemeente");
  });
});

})();
