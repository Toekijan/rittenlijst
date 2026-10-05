# Reisregistratie

Webapp om reisafstanden voor werk bij te houden. De registraties synchroniseren
automatisch tussen al je apparaten (telefoon, laptop, thuis-pc) via **Netlify Blobs**.
Geen inlogscherm, geen wachtwoord — zodra je de app op een apparaat opent, ziet en
bewerkt hij dezelfde dataset.

## Deployen via GitHub (aanbevolen)

De site is gekoppeld aan deze GitHub-repository. Elke `git push` naar `main` start
automatisch een nieuwe deploy op Netlify.

Eenmalige koppeling:

1. Log in op [app.netlify.com](https://app.netlify.com) met je GitHub-account.
2. **Add new site → Import an existing project → Deploy with GitHub**.
3. Geef Netlify toegang tot deze repository (`Toekijan/rittenlijst`).
4. Build-instellingen laten staan zoals ze zijn — `netlify.toml` regelt alles:
   - Branch: `main`
   - Build command: leeg
   - Publish directory: `.`
   - Functions directory: `netlify/functions`
5. **Deploy site**.

Daarna geldt: `git push` → Netlify bouwt → site is live. Je hoeft **geen**
environment variables in te stellen; bij een Git-deploy geeft Netlify de
site-context voor Blobs automatisch mee.

### Controleren of het werkt

Open `https://JOUW-SITE.netlify.app/.netlify/functions/data` in de browser.
Je moet JSON zien, bijvoorbeeld:

```json
{"entries":{},"declaredMonths":{},"updatedAt":null}
```

Krijg je in plaats daarvan een foutmelding, kijk dan in Netlify bij
**Deploys → (laatste deploy) → Functions** naar de log van `data`.

## Alternatief: handmatige drag-and-drop deploy

Bij een **handmatige zip-upload** geeft Netlify de Function niet automatisch de
site-context mee die Netlify Blobs nodig heeft. Dan moet je eenmalig twee
environment variables instellen:

1. **Site ID**: Site configuration → General → Site details.
2. **Personal Access Token**: avatar rechtsboven → User settings →
   Applications → Personal access tokens → New access token. Kopieer de token
   direct; hij wordt maar één keer getoond.
3. Site configuration → Environment variables → voeg toe:
   - `BLOBS_SITE_ID` = de Site ID
   - `BLOBS_TOKEN` = de token
4. Deploy opnieuw — environment variables worden pas actief na een nieuwe deploy.

Bij zo'n zip-upload moet `node_modules/` wél meegestuurd worden (bij een
Git-deploy installeert Netlify de dependencies zelf).

## Bestanden

```
reisregistratie/
├── index.html                     ← de app zelf
├── netlify.toml                   ← Netlify-configuratie
├── package.json                   ← dependency: @netlify/blobs
└── netlify/
    └── functions/
        └── data.js                ← serverless functie die data opslaat/ophaalt
```

## Gebruik

Open de site-URL op elk apparaat. De eerste keer wordt de lokale (mogelijk lege)
data naar de server gestuurd als startpunt; daarna haalt elk apparaat bij het
openen de laatste stand op en synchroniseert elke wijziging automatisch terug.
Rechtsonder zie je kort een statusindicatie ("Synchroniseren…" / "✓ Gesynchroniseerd").
Ben je offline, dan blijft de app werken met de lokale kopie en synchroniseert hij
zodra je weer verbinding hebt.

## Belangrijk om te weten

- **Geen toegangsbeveiliging op de app zelf.** Iedereen die de site-URL kent, kan
  de data lezen en wijzigen. Deel de link dus niet publiekelijk.
- Zet de GitHub-repository op **private** als je de data-structuur niet publiek
  wilt hebben. De Netlify-koppeling blijft dan gewoon werken.
- **De Personal Access Token (alleen nodig bij drag-and-drop) is gevoelig** —
  behandel die als een wachtwoord. Hij hoort alleen in de Netlify environment
  variables, nooit in de broncode.
- **localStorage blijft als lokale cache dienen** — bij een tijdelijk
  onbereikbare server verlies je geen data.
- Excel- en PDF-export werken op de (gesynchroniseerde) data.
