/* ============================================================
   FOCUS WAARDECHECK — logica
   Indicatieve woningwaarde op basis van mediane NVM-
   transactieprijzen per m² (feb–jul 2026), per gemeente en
   woningtype. Indicatie ≠ taxatie: de CTA brengt de bezoeker
   naar een gratis waardebepaling door de juiste vestiging.
   ============================================================ */

(() => {
"use strict";

const PEILDATUM = "februari t/m juli 2026";

const VESTIGINGEN = {
  "Helmond":      { tel: "0492 - 792 172",  mail: "helmond@focusmakelaars.nl" },
  "Eindhoven":    { tel: "040 - 218 00 78", mail: "eindhoven@focusmakelaars.nl" },
  "Breda":        { tel: "076 - 766 01 03", mail: "breda@focusmakelaars.nl" },
  "Rotterdam":    { tel: "010 - 200 43 14", mail: "rotterdam@focusmakelaars.nl" },
  "Kennemerland": { tel: "0251 - 342 414",  mail: "kennemerland@focusmakelaars.nl" },
  "de Meierij":   { tel: "06 - 50 62 77 49", mail: "meierij@focusmakelaars.nl" }
};

/* m2 = gewogen mediane transactieprijs per m² (feb–jul 2026), n = aantal transacties */
const DATA = {
 "Best":{v:"Eindhoven",loop:29,verkocht:212,t:{"Tussenwoning":[4427,66],"Hoekwoning":[4539,43],"2-onder-1-kapwoning":[4445,39],"Vrijstaande woning":[4744,36],"Appartement":[5588,28],"Totaal":[4660,212]}},
 "Beverwijk":{v:"Kennemerland",loop:30,verkocht:249,t:{"Tussenwoning":[4355,60],"Hoekwoning":[4557,38],"2-onder-1-kapwoning":[4692,26],"Vrijstaande woning":[5079,18],"Appartement":[4807,107],"Totaal":[4667,249]}},
 "Breda":{v:"Breda",loop:24,verkocht:1318,t:{"Tussenwoning":[4442,401],"Hoekwoning":[4499,187],"2-onder-1-kapwoning":[4777,141],"Vrijstaande woning":[5348,115],"Appartement":[5119,474],"Totaal":[4808,1318]}},
 "Castricum":{v:"Kennemerland",loop:31,verkocht:227,t:{"Tussenwoning":[4237,62],"Hoekwoning":[4958,38],"2-onder-1-kapwoning":[5107,35],"Vrijstaande woning":[6116,34],"Appartement":[5698,58],"Totaal":[5146,227]}},
 "Drimmelen":{v:"Breda",loop:43,verkocht:178,t:{"Tussenwoning":[3833,42],"Hoekwoning":[4202,24],"2-onder-1-kapwoning":[4224,54],"Vrijstaande woning":[4403,45],"Appartement":[5023,13],"Totaal":[4232,178]}},
 "Eindhoven":{v:"Eindhoven",loop:32,verkocht:1605,t:{"Tussenwoning":[4436,536],"Hoekwoning":[4427,217],"2-onder-1-kapwoning":[4591,102],"Vrijstaande woning":[5041,54],"Appartement":[5294,696],"Totaal":[4837,1605]}},
 "Etten-Leur":{v:"Breda",loop:24,verkocht:277,t:{"Tussenwoning":[3765,102],"Hoekwoning":[3974,57],"2-onder-1-kapwoning":[4379,35],"Vrijstaande woning":[4466,48],"Appartement":[4802,35],"Totaal":[4138,277]}},
 "Geertruidenberg":{v:"Breda",loop:35,verkocht:136,t:{"Tussenwoning":[3680,55],"Hoekwoning":[3736,17],"2-onder-1-kapwoning":[4036,29],"Vrijstaande woning":[4397,18],"Appartement":[4935,16],"Totaal":[4017,136]}},
 "Geldrop-Mierlo":{v:"Eindhoven",loop:28,verkocht:255,t:{"Tussenwoning":[4056,90],"Hoekwoning":[4190,46],"2-onder-1-kapwoning":[4109,44],"Vrijstaande woning":[4869,41],"Appartement":[5154,34],"Totaal":[4367,255]}},
 "Heemskerk":{v:"Kennemerland",loop:32,verkocht:213,t:{"Tussenwoning":[4259,62],"Hoekwoning":[4459,36],"2-onder-1-kapwoning":[5270,19],"Vrijstaande woning":[5618,15],"Appartement":[5177,79],"Totaal":[4819,213]}},
 "Heiloo":{v:"Kennemerland",loop:47,verkocht:159,t:{"Tussenwoning":[4425,31],"Hoekwoning":[4772,26],"2-onder-1-kapwoning":[5377,34],"Vrijstaande woning":[5922,34],"Appartement":[5685,34],"Totaal":[5275,159]}},
 "Helmond":{v:"Helmond",loop:28,verkocht:516,t:{"Tussenwoning":[3695,171],"Hoekwoning":[3821,88],"2-onder-1-kapwoning":[4115,101],"Vrijstaande woning":[4369,56],"Appartement":[4618,100],"Totaal":[4051,516]}},
 "Maassluis":{v:"Rotterdam",loop:42,verkocht:235,t:{"Tussenwoning":[4233,77],"Hoekwoning":[4164,40],"2-onder-1-kapwoning":[4082,8],"Vrijstaande woning":[5360,3],"Appartement":[4657,106],"Totaal":[4439,235]}},
 "Meierijstad":{v:"de Meierij",loop:40,verkocht:542,t:{"Tussenwoning":[3812,142],"Hoekwoning":[4215,87],"2-onder-1-kapwoning":[4286,130],"Vrijstaande woning":[4424,108],"Appartement":[4917,75],"Totaal":[4265,542]}},
 "Midden-Delfland":{v:"Rotterdam",loop:32,verkocht:125,t:{"Tussenwoning":[4802,53],"Hoekwoning":[5005,30],"2-onder-1-kapwoning":[5124,14],"Vrijstaande woning":[5684,6],"Appartement":[5712,22],"Totaal":[5089,125]}},
 "Oirschot":{v:"Eindhoven",loop:54,verkocht:117,t:{"Tussenwoning":[4243,26],"Hoekwoning":[4525,28],"2-onder-1-kapwoning":[4512,26],"Vrijstaande woning":[5164,31],"Appartement":[5668,5],"Totaal":[4675,117]}},
 "Oosterhout":{v:"Breda",loop:29,verkocht:386,t:{"Tussenwoning":[3806,120],"Hoekwoning":[3817,59],"2-onder-1-kapwoning":[4164,77],"Vrijstaande woning":[4598,45],"Appartement":[4732,85],"Totaal":[4175,386]}},
 "Rotterdam":{v:"Rotterdam",loop:34,verkocht:4108,t:{"Tussenwoning":[4328,604],"Hoekwoning":[4735,241],"2-onder-1-kapwoning":[5313,84],"Vrijstaande woning":[5732,57],"Appartement":[4777,3122],"Totaal":[4733,4108]}},
 "Someren":{v:"Helmond",loop:27,verkocht:92,t:{"Tussenwoning":[3892,18],"Hoekwoning":[4580,6],"2-onder-1-kapwoning":[3916,37],"Vrijstaande woning":[4907,17],"Appartement":[5042,14],"Totaal":[4309,92]}},
 "Son en Breugel":{v:"Eindhoven",loop:24,verkocht:104,t:{"Tussenwoning":[3997,26],"Hoekwoning":[4654,17],"2-onder-1-kapwoning":[4360,39],"Vrijstaande woning":[5210,14],"Appartement":[5481,7],"Totaal":[4511,104]}},
 "Uitgeest":{v:"Kennemerland",loop:29,verkocht:76,t:{"Tussenwoning":[4421,21],"Hoekwoning":[4361,18],"2-onder-1-kapwoning":[5067,17],"Vrijstaande woning":[5772,5],"Appartement":[6177,13],"Totaal":[4985,76]}},
 "Veldhoven":{v:"Eindhoven",loop:42,verkocht:313,t:{"Tussenwoning":[4563,93],"Hoekwoning":[4574,46],"2-onder-1-kapwoning":[4469,73],"Vrijstaande woning":[4799,47],"Appartement":[5215,54],"Totaal":[4691,313]}},
 "Vlaardingen":{v:"Rotterdam",loop:33,verkocht:457,t:{"Tussenwoning":[4233,126],"Hoekwoning":[4542,60],"2-onder-1-kapwoning":[4778,21],"Vrijstaande woning":[5123,8],"Appartement":[4096,241],"Totaal":[4242,457]}},
 "Zaanstad":{v:"Kennemerland",loop:36,verkocht:1009,t:{"Tussenwoning":[4290,352],"Hoekwoning":[4461,187],"2-onder-1-kapwoning":[4838,99],"Vrijstaande woning":[4891,71],"Appartement":[5275,300],"Totaal":[4711,1009]}}
};

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
