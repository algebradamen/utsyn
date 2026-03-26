# Restaurant Utsyn

Velkommen til det offisielle bestillingssystemet for Restaurant Utsyn ved Tangen videregående skole! Dette systemet gjør det enkelt for gjester å reservere bord online, og for de ansatte å administrere åpningstider, bordkart og SMS-varslinger.

---

## Prosjektgruppe og Roller

Prosjektet ble utformet og utviklet av et dedikert team. Slik var ansvaret fordelt:

- **Iusup**
  Hovedutvikler for både frontend og backend. Har hatt ansvar for database, drift, optimeringer, designgjennomføring, distribusjon (deploy) og feilretting. Han bidro spesielt med å bygge opp koden og databasen for å effektivisere systemet og få ideen til livs.

- **Nell**
  Kundeansvarlig og design-ressurs. Har jobbet med kundemøter, brukertesting og planlegging. Bidro sterkt i de tidlige fasene av prosjektet med prototyping i Figma, utforming av databasesystemer og dokumentasjon av konseptet.

- **Helle**
  Kundeansvarlig og konseptutvikler. Har jobbet tett på kundemøter og brukerstøtte. Bidro betydelig med idémyldring rundt videreutvikling av systemet, og med tidlige løsninger for databasesystemet og design via Figma.

---

## Hvordan starte opp

For å kjøre denne nettsiden trenger du en database (PostgreSQL) og Node.js installert på PC-en din (eller på en server som Railway/Vercel).

### 1. Klon eller last ned koden
Først, last ned prosjektkoden til din datamaskin eller server.
```bash
git clone https://github.com/y114git/utsyn-app.git
cd utsyn-app
```

### 2. Installer nødvendige filer
Kjør denne kommandoen for å installere pakkene systemet trenger:
```bash
npm install
```

### 3. Koble til databasen
Opprett en ny tekstfil i hovedmappen og kall den **nøyaktig** `.env.local`. I denne filen limer du inn adressen til databasen din (f.eks. fra Neon, Supabase eller Railway):
```env
DATABASE_URL=postgres://bruker:passord@host:port/database?sslmode=require
```

### 4. Start nettsiden
Kjør programmet:
```bash
npm run dev
```
Gå til **http://localhost:3000** i nettleseren din, og nettsiden er i gang! 

*(For produksjon / live server, bruker du `npm run build` og deretter `npm start`)*

---

## Førstegangsoppsett (Viktig!)

Når systemet kjører for første gang og er koblet til en tom database, må du opprette en administrator:
1. Gå til **http://localhost:3000/admin**
2. Databasen vil nå bygge seg selv automatisk!
3. Du vil se et skjema. Skriv inn ditt ønskede **Brukernavn** og **Passord**.
4. Nå kan du logge inn som administrator og styre alt fra dashbordet.

---

## Slik styrer du Åpningstider og Datoer

I admin-panelet under **Innstillinger**, finner du to veldig viktige seksjoner for å styre når gjester kan besøke restauranten:

### 1. Åpningstider (Standard uke)
Her bestemmer du hvordan en helt vanlig uke ser ut.
* **Standard:** Standard genererer systemet selv tilgjengelige tider basert på feltene *Fra*, *Til* og et valgt intervall (f.eks hvert 15. minutt).
* **Spesifikke tidspunkt:** Ønsker du nøyaktig kontroll over hvilke tider som kan velges? Fyll inn **Spesifikke tidspunkt** med kommaseparerte tider (f.eks: `17:00, 18:00, 19:30`). Da vil systemet ignorere Fra/Til, og kunden kan *kun* velge de tidene du har skrevet!

### 2. Avvikende åpningstider / Stengte dager
Her legger du inn tider for ferier, helligdager eller spesielle eventer. Alt du legger inn her vil **overkjøre** den vanlige uken.
* **Vil du stenge helt en dag?** Velg dato og huk av for *"Helt stengt denne dagen"*.
* **Vil du ha åpent, men med andre tider enn normalt?** Velg dato, huk *bort* "Helt stengt denne dagen", og skriv inn dine egne *Spesifikke tidspunkt* (f.eks `12:00, 14:00`). Gjestene vil da kun kunne bestille på disse tidene akkurat denne dagen.

---

## SMS-Varslinger (Konfigurasjon)

Restaurant Utsyn har et smart, innebygd system for SMS. Under **Innstillinger** > **Kontakt og Kapasitet** kan du endre leverandør og maler.

### Malene du kan tilpasse:
Du kan skrive akkurat hva du vil i SMS-ene gjesten mottar ved hjelp av smarte "koder" som fyller seg ut selv: `{kode}`, `{dato}`, `{tid}`, `{antall}`.
1. **Ny booking:** Sendes umiddelbart når gjesten bestiller på nettsiden.
2. **Bekreftelse/Bord tildelt:** Sendes manuelt av servitørene når de tildeler et bord i Bordkartet og trykker "Send SMS".
3. **Kansellert:** Sendes automatisk hvis du setter reservasjonen til "Kansellert" i dashbordet.
4. **Ikke møtt:** Sendes automatisk hvis du setter status til "Ikke møtt" i dashbordet.

### Valg av SMS-leverandør:
* **Twilio (Anbefales for enklest oppsett):** Fyll inn din Twilio SID, Token og telefonnummer rett i innstillingene, og systemet gjør alt selv.
* **Webhook (For avanserte, f.eks Make.com/Zapier):** Hvis du velger dette, vil systemet sende SMS-løpene dit du vil. Perfekt hvis du har et annet felles bedriftssystem.

---

## Endre Bordkartet

Systemet har et interaktivt bordkart hvor hovmester kan dra og slippe bookinger på bord.
Ønsker du å endre utseendet eller plasseringen av bordene fysisk på skjermen?
Du kan redigere koordinatene og størrelsene på bord og søyler direkte i filen:
`src/app/admin/(dashboard)/bord/page.tsx`.

---

## Tilgjengelighet
Nettsiden følger strenge standarder for universell utforming (WCAG 2.1 AA):
* Full tastaturnavigasjon og opplesbarhet for svaksynte.
* Egen tilgjengelighets-meny *(A11yToolbar)* for å øke tekststørrelse eller bytte til høykontrast/svart-hvitt.
* Både Engelsk og Norsk språk lett tilgjengelig for gjestene.

---

## Feilsøking (Hjelp, noe fungerer ikke!)

**Nettsiden vil ikke starte og klager på databasen?**
* Sørg for at du faktisk la filen `.env.local` i selve rotmappen (ikke inni en annen mappe).
* Sjekk at `DATABASE_URL` er helt korrekt kopiert fra din database-leverandør.

**Får en oppdatering eller endring ikke utslag?**
* Hvis du har endret kode, prøv å bygge prosjektet på nytt ved å slette `.next`-mappen og kjøre programmer på nytt med `npm run dev`.

---
*Laget med 💖 for Restaurant Utsyn, Tangen videregående skole.*
