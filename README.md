# Restaurant Utsyn

Bestillingssystem for Restaurant Utsyn ved Tangen videregående skole.
Online reservation system for Restaurant Utsyn at Tangen Upper Secondary School.

# Roller

-Iusup, 
    -utvikler, drift, optimismer 

-Nell
    -design, brukerstøtte, tidlig utvikler i prosjektet

-Helle    
    -design, brukerstøtte, tidlig utvikler i prosjektet, prototype design

Hvorfor disse rollene

Isusp
-Han kom in etter vi var hadde komme opp med hoved ideen, han er god på å kode og lage databaser som hjalp oss med og effektivisere arbeidet

Nell
-Han hjalp med design og dokumentere og tidlig design av system/ database system

Helle
-Hun har hjalp med tidligere design og tidlige løsninger til database samt ideer på videre utvikling.

Typer av teknologi brukt

Slutt produktet

    -typescript
    -html
    -css

prototype

    -figma
    
## Forutsetninger

- Node.js 18 eller nyere: https://nodejs.org/
- npm (folger med Node.js)

## Installasjon

1. Klon prosjektet:

```bash
git clone https://github.com/y114git/utsyn-app.git
cd utsyn-app
```

2. Installer avhengigheter:

```bash
npm install
```

3. (Valgfritt) Sett miljovariabler. Opprett `.env.local`:

```
JWT_SECRET=en-lang-tilfeldig-tekst-her
```

Hvis denne ikke er satt, brukes en standard-verdi. For produksjon **ma** dette settes.

## Kjoring

### Utviklingsmodus

```bash
npm run dev
```

Apne http://localhost:3000 i nettleseren.

### Produksjon

```bash
npm run build
npm start
```

Serveren starter pa port 3000 som standard. For a endre port:

```bash
PORT=8080 npm start
```

## Forstegangsoppsett

1. Start serveren med `npm run dev` eller `npm start`
2. Ga til http://localhost:3000/admin
3. Første gang du besøker denne siden, vises et oppsettskjema
4. Skriv inn brukernavn (minst 3 tegn) og passord (minst 6 tegn)
5. Logg inn med den nye kontoen

Databasen (`data/utsyn.db`) opprettes automatisk forste gang serveren startes.

## Struktur

```
src/
  app/
    api/                  Backend (API-ruter)
      auth/               Innlogging og utlogging
      availability/       Sjekk ledige tider
      closures/           Spesielle stengte dager
      open-days/          Apningstider per ukedag
      reservations/       Reservasjoner (opprett, list, oppdater)
      settings/           Innstillinger for nettsiden
      setup/              Forstegangsoppsett
      users/              Brukeradministrasjon
    admin/                Admin-sider
      (dashboard)/
        brukere/          Administrer brukere
        dashboard/        Oversikt (reservasjoner i dag)
        innstillinger/    Rediger innhold, timer, priser
        reservasjoner/    Haandter reservasjoner
    bestill/              Bestillingswizard for gjester
    globals.css           Designsystem (CSS-variabler)
    layout.tsx            Rot-layout
    page.tsx              Forsiden
  components/             React-komponenter
    A11yToolbar.tsx        Tilgjengelighetsverktoy (skriftstorrelse, kontrast)
    Footer.tsx             Bunntekst
    Header.tsx             Toppnavigasjon
    Icons.tsx              SVG-ikoner (tilgjengelige, universell utforming)
    LocaleProvider.tsx     Sprakstotte (norsk/engelsk)
  lib/                    Hjelpefunksjoner
    auth.ts               JWT og passord-hashing
    db.ts                 SQLite database og skjema
    i18n.ts               Oversettelser (norsk og engelsk)
    utils.ts              Validering, formatering, hjelpefunksjoner
data/                     SQLite-database (genereres automatisk)
```

## Funksjoner

### For gjester

- Bestilling av bord direkte pa nettsiden, 24/7
- Flerstegs wizard: antall gjester, dato, tidspunkt, kontaktinfo, bekreftelse
- Se tilgjengelige og opptatte tidspunkter
- Bekreftelseskode etter bestilling
- Norsk og engelsk (bytt i toppmenyen)
- Tilgjengelig for alle: tastaturnavigasjon, skjermleser, justerbar skrift, hoykontrast

### For ansatte

- Oversikt over dagens og kommende reservasjoner
- Marker reservasjoner som fullfort, kansellert eller ikke-mott
- Filtrer etter dato og status
- Interaktivt bordkart for å manuelt tildele og bekrefte bord med tilhørende utsending av bekreftelses-SMS

### For administratorer

- Alt ansatte kan, pluss:
- Rediger apningstider (dag for dag)
- Legg til stengte dager (ferier, helligdager)
- Endre priser, adresse, telefon, e-post
- Endre forsiden (tittel, undertittel, om oss) pa norsk og engelsk
- Opprett og slett brukerkontoer (administrator eller ansatt)
- Konfigurer SMS-leverandør (Twilio eller Webhook) og skreddersy egne SMS-maler direkte i nettleseren

## Database

Databasen opprettes automatisk forste gang serveren starter. Filen lagres som `data/utsyn.db`.

Tabeller:

- `users` - Admin- og ansattkontoer
- `settings` - Innstillinger (nokkel-verdi)
- `open_days` - Apningstider per ukedag
- `special_closures` - Spesielle stengte dager
- `reservations` - Bordbestillinger
- `tables_config` - Bordoppsett

For a nullstille databasen: slett `data/utsyn.db` og start serveren pa nytt.

## Sikkerhet

- Passord hashes med bcrypt (12 runder)
- Innlogging via JWT i httpOnly-cookies
- Input-validering og sanitering pa alle API-ruter
- Rate limiting pa bestillinger
- Parameteriserte SQL-sporringer (ingen SQL-injeksjon)
- CORS-beskyttelse via Next.js

## SMS-oppsett (valgfritt)

Restaurant Utsyn har to måter å sende SMS-bekreftelser på, som kan konfigureres under admin-innstillingene ved å endre "SMS Leverandør":

### 1. Twilio (Direkte integrasjon - Anbefalt)
Fyll inn dine API-detaljer rett i innstillingene, så sender systemet SMS helt automatisk uten noen mellomledd:
- **Twilio Account SID**
- **Twilio Auth Token**
- **Twilio Sender Number**

### 2. Webhook (Make.com, Zapier, etc.)
Ved å bruke Webhook sender systemet en POST-forespørsel til en gitt URL. Perfekt hvis du vil koble SMS opp mot et annet system eller bruke en annen SMS-leverandør enn Twilio.
Forespørselen inneholder følgende JSON:
```json
{
  "phone": "+4712345678",
  "message": "Meldingen generert fra malene dine..."
}
```

### SMS-Maler og Utsendelse
Du kan fritt redigere innholdet på SMS-meldingene direkte i admin-panelet via to maler (med hjelp av hendige variabler som `{kode}`, `{dato}`, `{tid}` og `{antall}`):
- **SMS Mal - Ny booking:** Sendes umiddelbart og automatisk når en gjest oppretter en ny bestilling.
- **SMS Mal - Bekreftelse/Bord tildelt:** Sendes manuelt av personalet når de har tildelt nok bordplasser til gjesten via "Bordkart"-siden og deretter trykker "Bekreft & Send SMS".

## Bordkart

For å endre plassering av bordene, eller andre objekter, gå til src\app\admin\(dashboard)\bord\page.tsx og endre koordinatene i tablePositions, pillarPositions, floorPlan osv.

## Tilgjengelighet

Nettsiden folger WCAG 2.1 AA:

- Stotte for skjermlesere (ARIA-labels)
- Full tastaturnavigasjon
- Justerbar skriftstorrelse
- Hoykontrastmodus
- Minimale trykkmaal pa 44x44px
- Respekterer brukerens preferanser for redusert bevegelse
- SVG-ikoner med tilgjengelighetsstotte

## Teknologier

- Next.js 16 (App Router, TypeScript)
- SQLite via better-sqlite3
- JWT + bcrypt for autentisering
- Vanilla CSS med designtokens
- Eget oversettelsessystem (norsk/engelsk)

## Feilsoking

Serveren starter ikke:

- Sjekk at Node.js 18+ er installert: `node --version`
- Sjekk at port 3000 er ledig
- Slett `.next`-mappen og prov igjen: `rm -rf .next && npm run dev`

Databasefeil:

- Slett `data/utsyn.db` og start pa nytt for a nullstille

Lock-feil ved `npm run dev`:

- En annen instans kjorer. Stopp den forst, eller slett `.next/dev/lock`

## Lisens

Laget for Tangen videregaende skole.
