# Reisregistratie — deploy op Netlify (drag-and-drop)

Deze versie synchroniseert je registraties automatisch tussen al je apparaten (telefoon, laptop, thuis-pc) via **Netlify Blobs**. Geen inlogscherm, geen wachtwoord — zodra je de app op een apparaat opent, ziet en bewerkt hij dezelfde dataset.

## Belangrijk: extra stap bij drag-and-drop

Bij een **handmatige zip-upload** (drag-and-drop) geeft Netlify de Function niet automatisch de juiste site-gegevens mee die Netlify Blobs nodig heeft. Daarom moet je **twee environment variables** instellen — eenmalig, hierna werkt alles vanzelf.

### Stap 1 — Site ID opzoeken

1. Ga naar je site in Netlify.
2. **Site configuration → General → Site details**.
3. Kopieer de **Site ID** (een lange code zoals `a1b2c3d4-5678-90ab-cdef-1234567890ab`).

### Stap 2 — Personal Access Token aanmaken

1. Klik rechtsboven op je gebruikersnaam/avatar → **User settings**.
2. Ga naar **Applications → Personal access tokens**.
3. Klik **New access token**, geef het een naam (bijv. `reisregistratie-blobs`), en klik **Generate token**.
4. Kopieer de token direct — deze wordt maar één keer getoond.

### Stap 3 — Environment variables instellen op de site

1. Ga naar je site → **Site configuration → Environment variables**.
2. Voeg twee variabelen toe:
   - **Key:** `BLOBS_SITE_ID` → **Value:** de Site ID uit stap 1
   - **Key:** `BLOBS_TOKEN` → **Value:** de token uit stap 2
3. Sla op.

### Stap 4 — Opnieuw deployen

Environment variables worden pas actief na een nieuwe deploy. Sleep de zip nogmaals naar het deploy-vlak (**Deploys → drag and drop**), of gebruik **Deploys → Trigger deploy** als die knop beschikbaar is bij handmatige deploys.

### Controleren of het werkt

Open `https://JOUW-SITE.netlify.app/.netlify/functions/data` in de browser. Je moet nu JSON zien, bijvoorbeeld:
```json
{"entries":{},"declaredMonths":{},"updatedAt":null}
```
Zie je in plaats daarvan een crash-melding, controleer dan of de Site ID en token exact goed zijn overgenomen (geen spaties ervoor/erna) en of je opnieuw hebt gedeployed ná het instellen van de variabelen.

## Bestanden

```
reisregistratie/
├── index.html                     ← de app zelf
├── netlify.toml                   ← Netlify-configuratie
├── package.json                   ← dependency: @netlify/blobs
├── node_modules/                  ← al geïnstalleerd, meegeleverd voor drag-and-drop
└── netlify/
    └── functions/
        └── data.js                ← serverless functie die data opslaat/ophaalt (Netlify Blobs)
```

## Gebruik

Open de site-URL op elk apparaat. De eerste keer wordt de lokale (mogelijk lege) data naar de server gestuurd als startpunt; daarna haalt elk apparaat bij het openen de laatste stand op en synchroniseert elke wijziging automatisch terug. Rechtsonder zie je kort een statusindicatie ("Synchroniseren…" / "✓ Gesynchroniseerd"). Ben je offline, dan blijft de app werken met de lokale kopie en synchroniseert hij zodra je weer verbinding hebt.

## Belangrijk om te weten

- **Geen toegangsbeveiliging op de app zelf.** Iedereen die de site-URL kent, kan de data lezen en wijzigen. Deel de link dus niet publiekelijk.
- **De Personal Access Token (stap 2) is wél gevoelig** — behandel deze als een wachtwoord. Hij staat alleen in de Netlify environment variables (server-side), nooit in de broncode of browser.
- **localStorage blijft als lokale cache dienen** — bij een tijdelijk onbereikbare server verlies je geen data; alles wordt bij herstel van de verbinding automatisch bijgewerkt.
- Excel- en PDF-export werken zoals voorheen, gebaseerd op de (nu gesynchroniseerde) data.
