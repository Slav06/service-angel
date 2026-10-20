# Service Angel

Public website for selling websites to local businesses, plus a private portal for each sales rep and an owner admin.

## What's in it

**Public site (`/`)** — hero, pricing (one Website Plan at $500/month, from the Packages table), process, FAQ, and a quote form. Every quote becomes a lead.
A rep's referral link (`/?ref=<rep id>`, shown on their Profile page) assigns the quote straight to that rep.

**Rep portal (`/portal`)** — each rep only sees their own data:
- Dashboard: revenue, commission, calls, close rate (deals ÷ calls), connect rate, appointments, avg deal, cash collected,
  recurring revenue, leads received; for today / week / month / 30 days / quarter / year / all time
- Monthly revenue goal and daily call goal progress, commission owed vs paid out, pipeline by stage, follow-ups due,
  30-day charts of calls and revenue, leaderboard rank
- Log calls (one-tap outcomes: no answer, voicemail, gatekeeper, not interested, call back, interested, appointment, sold)
- My leads with stages, notes, follow-up dates, per-lead call history; add their own leads
- Record sales. Each sale is a client on a monthly plan; the rep earns their % (frozen on the sale) on **every payment**
  the client makes, for as long as they stay
- Request leads (quantity, niche, area, urgency) and track the request's status
- Leaderboard, profile (contact info, change key, referral link)

**Owner admin (`/admin`)** — company revenue collected, monthly recurring revenue, profit (payments − commission − build cost), margin, commissions, cash
collected, calls and rates, per-rep table; open any rep's dashboard; add reps / set commission % and goals / reset keys /
turn off; fill lead requests from the pool (optionally matching niche & area); import leads by pasting from a spreadsheet;
bulk assign; record client payments (one client, or a whole month for every active client at once), cancel clients,
mark commission paid; edit packages & prices shown on the website.

## Login

Name + easy key (a word + 2 digits, e.g. `tiger42`), same as EmployerCRM. Wrong guesses are throttled.
Reps can sign themselves up at `/join`, or the owner adds them on **Admin → Sales reps**, which shows a one-click
login link (`/auth?name=…&key=…`).

```bash
npm run user:add -- "Name" admin [key]   # create or reset a user from the command line
```

## Develop

```bash
npm install
npm run dev            # http://localhost:3000, embedded PGlite DB in ./data
npm run db:generate    # after editing src/db/schema.ts
```

Set `DATABASE_URL` (Neon) to use Postgres; migrations run automatically on first request.
Rename the business in `src/lib/brand.ts`.
