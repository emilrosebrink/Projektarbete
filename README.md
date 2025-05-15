# GDPR-verktyg

Webbapplikation för att söka och maskera personuppgifter lagrade i en databas. Byggt som projektarbete med Next.js och TypeScript.

## Funktioner

- Sök på namn, e-post, telefon, adress, personnummer, medlemsnummer eller ordernummer
- Fuzzy-matchning för namnsökning (tolererar stavfel och omvänd ordföljd)
- Maskera enskilda fält eller all information (skriver `XXXXX` till datakällan)

## Kom igång

```bash
npm install
npm run dev
# Öppna http://localhost:3000
```

Appen körs med mockdata (JSON-filer) och kräver ingen extern databas för att testa.

## Projektstruktur

```
src/
├── app/
│   ├── page.tsx                  # Huvudsida — sök och maskera
│   ├── page.module.css           # Styling
│   └── api/documents/route.ts   # API: PATCH (maskera fält)
├── lib/
│   ├── fuzzy.ts                  # Levenshtein + fuzzy-matchning
│   └── mockdata/
│       ├── sources.tsx           # Lista över alla datakällor
│       ├── searchMockData.tsx    # Sök- och datahämtningslogik per källa
│       └── *.json                # Ett dokument per datakälla
└── providers/
    └── auth.tsx                  # Auth-provider (Azure AD / MSAL)
```

## Teknikstack

- **Next.js** — ramverk
- **TypeScript** — språk
- **Radix UI** — UI-komponenter
- **Biome** — linting och formattering
