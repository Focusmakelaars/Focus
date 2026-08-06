/* ============================================================
   FOCUS STUDIO — merk- en teamdata
   Eén bron voor vestigingen, teamleden en brand-constanten.
   ============================================================ */

const FOCUS = {
  site: "focusmakelaars.nl",
  siteUrl: "https://focusmakelaars.github.io/Focus/",
  tagline: "met oog voor jou",

  kleuren: {
    warmOranje:  "#F15D22",
    focusOranje: "#F6871F",
    comfortBeige:"#DFD1BB",
    helderBeige: "#F7F3EB",
    irisBruin:   "#B0836B",
    pupilZwart:  "#1D2023",
    wit:         "#FFFFFF"
  },

  vestigingen: {
    "Helmond":      { telefoon: "0492 - 792 172",  adres: "Steenovenweg 5, Helmond",            mail: "helmond@focusmakelaars.nl" },
    "Eindhoven":    { telefoon: "040 - 218 00 78", adres: "Hurksestraat 60, Eindhoven",         mail: "eindhoven@focusmakelaars.nl" },
    "Breda":        { telefoon: "076 - 766 01 03", adres: "Lage Mosten 49, Breda",              mail: "breda@focusmakelaars.nl" },
    "Rotterdam":    { telefoon: "010 - 200 43 14", adres: "Olivier van Noortlaan 110, Vlaardingen", mail: "rotterdam@focusmakelaars.nl" },
    "Kennemerland": { telefoon: "0251 - 342 414",  adres: "Maerelaan 15, Heemskerk",            mail: "kennemerland@focusmakelaars.nl" },
    "de Meierij":   { telefoon: "06 - 50 62 77 49", adres: "Kofferen 34, Sint-Oedenrode",       mail: "meierij@focusmakelaars.nl" }
  },

  team: [
    { id: "edwin-de-brauwer",      naam: "Edwin de Brauwer",      rol: "Makelaar / Taxateur", vestiging: "Helmond",      mail: "edwin@focusmakelaars.nl",       tel: "06 - 51 29 83 04" },
    { id: "esther-mertens",        naam: "Esther Mertens",        rol: "Makelaar / Taxateur", vestiging: "Helmond",      mail: "esther@focusmakelaars.nl",      tel: "06 - 12 02 97 96" },
    { id: "bart-smits",            naam: "Bart Smits",            rol: "Makelaar / Taxateur", vestiging: "Helmond",      mail: "bart@focusmakelaars.nl",        tel: "06 - 24 56 71 15" },
    { id: "chantal-kanters",       naam: "Chantal Kanters",       rol: "Kandidaat-makelaar",  vestiging: "Helmond",      mail: "chantal@focusmakelaars.nl",     tel: "06 - 20 48 54 95" },
    { id: "robert-jan-bekkering",  naam: "Robert-Jan Bekkering",  rol: "Makelaar (RM/RT)",    vestiging: "Eindhoven",    mail: "robertjan@focusmakelaars.nl",   tel: "06 - 28 91 72 12" },
    { id: "eric-van-woerkum",      naam: "Eric van Woerkum",      rol: "Makelaar (RM/RT)",    vestiging: "Eindhoven",    mail: "eric@focusmakelaars.nl",        tel: "06 - 50 41 97 65" },
    { id: "tim-de-rouw",           naam: "Tim de Rouw",           rol: "Makelaar (RM/RT)",    vestiging: "Eindhoven",    mail: "tim@focusmakelaars.nl",         tel: "06 - 23 62 46 70" },
    { id: "bas-simons",            naam: "Bas Simons",            rol: "Makelaar (RM/RT)",    vestiging: "Eindhoven",    mail: "bas@focusmakelaars.nl",         tel: "06 - 34 19 17 47" },
    { id: "joris-vissers",         naam: "Joris Vissers",         rol: "Makelaar",            vestiging: "Breda",        mail: "joris@focusmakelaars.nl",       tel: "06 - 15 18 79 62" },
    { id: "hendrik-hueskes",       naam: "Hendrik Hueskes",       rol: "Makelaar",            vestiging: "Breda",        mail: "hendrik@focusmakelaars.nl",     tel: "06 - 48 17 71 19" },
    { id: "marcel-crans",          naam: "Marcel Crans",          rol: "Makelaar",            vestiging: "Rotterdam",    mail: "marcel@focusmakelaars.nl",      tel: "06 - 10 95 04 75" },
    { id: "patrick-jansen",        naam: "Patrick Jansen",        rol: "Makelaar (RM/RT)",    vestiging: "Kennemerland", mail: "kennemerland@focusmakelaars.nl", tel: "0251 - 342 414" },
    { id: "marc-wewer",            naam: "Marc Wewer",            rol: "Makelaar (RM/RT)",    vestiging: "Kennemerland", mail: "kennemerland@focusmakelaars.nl", tel: "0251 - 342 414" },
    { id: "bart-greijmans",        naam: "Bart Greijmans",        rol: "Makelaar (RM/RT)",    vestiging: "de Meierij",   mail: "bartgreijmans@focusmakelaars.nl", tel: "06 - 50 62 77 49" },
    { id: "jorn-van-de-bovenkamp", naam: "Jorn van de Bovenkamp", rol: "Taxateur BOG",        vestiging: "de Meierij",   mail: "jorn@focusmakelaars.nl",        tel: "06 - 10 80 02 82" }
  ],

  /* Beeldmerk (oog/target) — originele paden uit de brand-SVG, fill via currentColor */
  beeldmerkPaths: [
    "M142.8867.493v40.765c35.029,6.953,62.503,35.099,68.474,70.467h40.639C245.4327,54.129,200.1497,8.149,142.8867.493",
    "M0,111.725h40.639c6.192-36.662,35.481-65.571,72.344-71.152V0C53.897,6.05,6.718,52.834,0,111.725",
    "M40.8159,141.6289H.1259c7.129,58.426,54.099,104.723,112.857,110.74v-40.573c-36.53-5.532-65.619-33.975-72.167-70.167",
    "M142.8867,211.1107v40.764c56.936-7.611,102.017-53.113,108.988-110.246h-40.688c-6.316,34.904-33.597,62.593-68.3,69.482",
    "M156.4087,126.1845c0,16.794-13.615,30.408-30.409,30.408s-30.408-13.614-30.408-30.408,13.614-30.409,30.408-30.409,30.409,13.615,30.409,30.409"
  ]
};

function beeldmerkSVG(cls) {
  return `<svg class="${cls || ""}" viewBox="0 0 252 252.37" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">` +
    FOCUS.beeldmerkPaths.map(d => `<path d="${d}" fill="currentColor"/>`).join("") + `</svg>`;
}
