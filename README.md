# Focus Makelaars — website

Nieuwe merkwebsite voor Focus Makelaars (voorheen ERA Focus Makelaars), gebouwd volgens het
**Focus Brandbook** (Dropbox: `1. ERA Focus Holding BV\18. Branding\Final`).

## Bekijken

Open `index.html` direct in de browser, of start een lokale server:

```
python -m http.server 8137
```

en ga naar http://localhost:8137

## Structuur

```
index.html            hoofdpagina (hero, diensten, methodiek, ons verhaal, vestigingen, reviews, CTA)
diensten/             detailpagina's, bereikbaar via de Diensten-dropdown, kaarten en footer:
  verkopen.html         woning verkopen
  aankopen.html         woning aankopen (aankoopmakelaar)
  taxeren.html          taxaties wonen (NWWI) — verwijst door naar BOG
  taxeren-bog.html      taxaties bedrijfsmatig vastgoed (NRVT/IVS, Focus Taxateurs-logo)
  adviseren.html        advies / woningmarktconsultancy
assets/css/style.css  volledige styling, merk-tokens als CSS-variabelen
assets/js/main.js     scroll-reveals + mobiel menu
assets/fonts/         Silka (woff2, geconverteerd uit brand-OTF's) + STIX Two Text Italic (variable)
assets/logo/          officiële logo-SVG's uit de brandmap
assets/icons/         diensten-iconen (Verkopen/Aankopen/Taxeren/Adviseren) uit de brandmap
assets/img/           brandfotografie, geëxtraheerd uit het brandbook-PDF
```

## Brand-tokens (uit het brandbook)

| Kleur | HEX |
|---|---|
| Warm Oranje | `#F15D22` |
| Focus Oranje | `#F6871F` |
| Comfort Beige | `#DFD1BB` |
| Helder Beige | `#F7F3EB` |
| Iris Bruin | `#B0836B` |
| Pupil Zwart | `#1D2023` |

Typografie: **Silka** (primair) + **STIX Two Text Italic** (accent, spaarzaam).
Tagline: *met oog voor jou*.

## Aannames / nog te doen

- E-mailadressen zijn omgezet naar het nieuwe domein (`*@focusmakelaars.nl`) — controleren of dit domein/adressenschema klopt.
- Review-quote ("Familie van der Heijden") is een placeholder — vervangen door een echte Funda-review.
- Statistieken (180+ woningen, 25+ jaar) komen van erafocus.nl / schatting — controleren.
- Woningaanbod-koppeling (Funda/Realworks) is nog niet gebouwd; de site is nu een statische one-pager.
- STIX Two Text Italic stond niet in de brandmap (map was leeg) en is als open-source Google Font (latin, variable) toegevoegd.
