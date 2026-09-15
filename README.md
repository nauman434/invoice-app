# Invoice Generator

A personal invoice generator built for a single freelancer workflow:
category-grouped line items, per-invoice currency, client autofill from
history, full invoice history, and an analytics dashboard. Built with
Next.js (App Router), Prisma + Postgres, and NextAuth (email/password).

## What it does

- **Invoice builder** — add/remove categories (Emails, UI/UX, etc.), each
  with line items (description, hours, total). Total auto-calculates as
  `hours × rate`, with a per-line manual override for one-off cases.
- **Currency per invoice** — pick USD/PKR/GBP/etc. per invoice; only that
  currency is shown, no dual-currency clutter.
- **Client autofill** — type a client name that already exists in your
  history and their last rate, bank details, currency, and category
  structure prefill automatically. New client name → blank form.
- **History** — every invoice is saved. Browse, edit, duplicate, delete,
  filter by client/date/currency.
- **Analytics** — total earned, total hours, monthly trend charts, top
  clients by revenue.
- **Export** — download any invoice as PDF or DOCX (matches the layout of
  your original template: header, category tables with subtotals, grand
  total, bank details, thank-you note).
- **Auth** — single email/password login (schema supports more users later
  if you ever bring on a collaborator).

## Local setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Set up a Postgres database.** Easiest options:
   - [Neon](https://neon.tech) (free tier, works great with Vercel)
   - [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres) (create it from your Vercel project's Storage tab)
   - Or any Postgres instance you already have.

3. **Copy the env file and fill it in:**

   ```bash
   cp .env.example .env
   ```

   - `DATABASE_URL` — your Postgres connection string
   - `NEXTAUTH_SECRET` — generate with `openssl rand -base64 32`
   - `NEXTAUTH_URL` — `http://localhost:3000` for local dev

4. **Push the schema to your database:**

   ```bash
   npx prisma db push
   ```

5. **Create your login** (there's no public sign-up page on purpose):

   ```bash
   npm run seed:user -- you@example.com "your-password" "Your Name"
   ```

6. **Run it:**

   ```bash
   npm run dev
   ```

   Visit `http://localhost:3000`, sign in, and create your first invoice.

## Deploying to Vercel

1. Push this project to a GitHub repo.
2. In Vercel, "Add New Project" → import the repo.
3. Add a Postgres database from the Storage tab (or connect an existing
   Neon database) — Vercel will auto-populate `DATABASE_URL`.
4. Add the remaining environment variables in the Vercel project settings:
   - `NEXTAUTH_SECRET` (same `openssl rand -base64 32` approach)
   - `NEXTAUTH_URL` → your production URL, e.g. `https://your-app.vercel.app`
5. Deploy.
6. After the first deploy, run the schema push and create your user against
   the production database. Easiest way: run these locally with your `.env`
   pointed at the **production** `DATABASE_URL`:

   ```bash
   npx prisma db push
   npm run seed:user -- you@example.com "your-password" "Your Name"
   ```

7. Visit your Vercel URL and log in.

## Project structure (for future changes)

```
app/                     Routes (App Router)
  invoices/              History list, new invoice, edit invoice
  analytics/              Analytics dashboard
  api/                    REST-style API routes (invoices, clients, analytics, export)
  login/                  Login page
components/               React components (form, history list, dashboard, navbar)
lib/
  repository.ts           All database reads/writes go through here (repository pattern) —
                           this is the one file to touch if you ever swap Postgres for
                           something else, or add features like multi-currency totals.
  export/                 PDF and DOCX generation
  auth.ts                 NextAuth config
  types.ts                Shared types + currency list
prisma/schema.prisma       Database schema
```

### Extending it later

- **New export format**: add a file under `lib/export/`, wire up an API
  route under `app/api/invoices/[id]/`.
- **More currencies**: edit the `CURRENCIES` array in `lib/types.ts`.
- **Live exchange rates**: `lib/repository.ts` and the analytics endpoint
  are the places to add conversion logic — the schema already stores each
  invoice's currency separately so nothing needs to change there.
- **Multiple users**: the schema already scopes everything to `userId`;
  you'd just need a way to create additional users (extend
  `scripts/create-user.ts` or add an admin page).
