# Reisregistratie

Webapp om reisafstanden voor werk bij te houden. De registraties synchroniseren
automatisch tussen al je apparaten (telefoon, laptop, thuis-pc) via **Netlify Blobs**.
Meerdere mensen kunnen de app gebruiken: iedereen logt in met een eigen
gebruikersnaam en wachtwoord en ziet alleen de eigen ritten.

## Accounts instellen (verplicht)

Zonder deze twee environment variables kan niemand inloggen. Stel ze in via
Netlify → **Site configuration → Environment variables → Add a variable**:

| Variabele        | Waarde                                                                 |
|------------------|------------------------------------------------------------------------|
| `RITTEN_USERS`   | Accounts als `naam:wachtwoord`, gescheiden door komma's. Bijv. `benito:Zomer-Fiets-42,piet:Rood-Kanaal-17` |
| `SESSION_SECRET` | Een lange willekeurige tekst (minstens 32 tekens). Niemand hoeft die te onthouden. |

Daarna **Deploys → Trigger deploy → Deploy site**: environment variables worden pas
actief na een nieuwe deploy.

- **Iemand toevoegen**: zet `,naam:wachtwoord` achter `RITTEN_USERS` en deploy opnieuw.
  Geef die persoon de site-URL, de naam en het wachtwoord.
- **Iemand verwijderen**: haal de naam uit `RITTEN_USERS` en deploy opnieuw. Die persoon
  kan direct niet meer inloggen. De ritten blijven bewaard; zet je de naam terug, dan
  zijn ze er weer.
- **Wachtwoord wijzigen**: pas het aan in `RITTEN_USERS` en deploy opnieuw.
- **Iedereen uitloggen**: wijzig `SESSION_SECRET` en deploy opnieuw.
- Namen mogen letters, cijfers, punt, streepje en liggend streepje bevatten
  (hoofdletters maken niet uit). Wachtwoorden mogen geen komma bevatten.
- **De eerste naam in de lijst is de eigenaar**: die krijgt bij de eerste keer inloggen
  de ritten die al in de app stonden van vóór de invoering van accounts.
- Een sessie blijft 30 dagen geldig; daarna vraagt de app opnieuw om in te loggen.

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

Daarna geldt: `git push` → Netlify bouwt → site is live. Voor de opslag hoef je
geen extra environment variables in te stellen; bij een Git-deploy geeft Netlify de
site-context voor Blobs automatisch mee. De accounts moet je wel instellen (zie
hierboven).

### Controleren of het werkt

Open `https://JOUW-SITE.netlify.app/.netlify/functions/data` in de browser.
Ben je ingelogd, dan zie je JSON met je ritten, bijvoorbeeld:

```json
{"entries":{},"declaredMonths":{},"updatedAt":null}
```

Niet ingelogd? Dan zie je `{"error":"Niet ingelogd."}`. Dat hoort zo.

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
    ├── lib/
    │   └── session.js             ← accounts en sessiecookies
    └── functions/
        ├── auth.js                ← inloggen / uitloggen
        └── data.js                ← serverless functie die data opslaat/ophaalt
```

## Gebruik

Open de site-URL op elk apparaat en log in. De eerste keer wordt de lokale (mogelijk lege)
data naar de server gestuurd als startpunt; daarna haalt elk apparaat bij het
openen de laatste stand op en synchroniseert elke wijziging automatisch terug.
Rechtsonder zie je kort een statusindicatie ("Synchroniseren…" / "✓ Gesynchroniseerd").
Ben je offline, dan blijft de app werken met de lokale kopie en synchroniseert hij
zodra je weer verbinding hebt.

## Belangrijk om te weten

- **Alleen ingelogde gebruikers** kunnen data lezen of wijzigen, en alleen hun eigen
  ritten. Als beheerder van Netlify kun jij de wachtwoorden in `RITTEN_USERS` zien:
  laat mensen dus geen wachtwoord gebruiken dat ze ook elders gebruiken.
- Iemand die uitlogt op een gedeeld apparaat, laat een lokale kopie van de eigen ritten
  achter in de browser. Die is alleen zichtbaar voor wie op hetzelfde account inlogt.
- Zet de GitHub-repository op **private** als je de data-structuur niet publiek
  wilt hebben. De Netlify-koppeling blijft dan gewoon werken.
- **De Personal Access Token (alleen nodig bij drag-and-drop) is gevoelig** —
  behandel die als een wachtwoord. Hij hoort alleen in de Netlify environment
  variables, nooit in de broncode.
- **localStorage blijft als lokale cache dienen** — bij een tijdelijk
  onbereikbare server verlies je geen data.
- Excel- en PDF-export werken op de (gesynchroniseerde) data.
