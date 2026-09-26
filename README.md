# Dukan

Shop management system for the Customer / Purchase / Sales / Return / Recovery registers in `Sohon.pdf`, plus
ledger, reports, invoices, search and email reminders.

- **Backend:** Node.js + Express + MySQL (`src/`), JWT auth, role-based access control.
- **Frontend:** React + Vite + Tailwind admin dashboard (`frontend/`).
- More design notes: `docs/ARCHITECTURE.md`, `docs/PLANNING.md`, `docs/HIERARCHY.md`.

## Setup

1. **Install**
   ```
   npm install
   cd frontend && npm install
   ```

2. **Configure the backend.** Copy `.env.example` to `.env`, fill in the database details, and generate the two JWT
   secrets (the server refuses to start with short or placeholder secrets):
   ```
   cp .env.example .env
   chmod 600 .env
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"   # run twice: access + refresh secret
   ```
   `.env` holds real secrets: keep it out of git and readable only by you (`chmod 600`). `.env.example` must only ever
   contain placeholders.

3. **Create the tables and the first accounts**
   ```
   npm run setup-db
   ```
   Creates the schema, the roles/permission matrix, and a Super Admin (`0000000000`) and Admin (`1111111111`) with
   **random passwords printed once**. Existing accounts are never touched, so it is safe to re-run. Sign in, then change
   the password from *Change password* in the top bar.

   Forgot a password? `npm run reset-password -- <phone-or-email>` generates a new random one (and signs the user out
   everywhere). Users can sign in with a username, phone or email; set the username in the Users page.

4. **Run**
   ```
   npm run dev                       # API on http://localhost:4000
   cd frontend && cp .env.example .env && npm run dev   # app on http://localhost:5173
   ```

## Security model

| Area | How it works |
|---|---|
| Passwords | bcrypt (cost 12). At least 8 characters, a letter and a number, at most 72. |
| Login protection | 5 wrong passwords lock the account for 15 minutes (`MAX_FAILED_LOGINS`, `LOCKOUT_MINUTES`); failed logins are also rate limited per IP; unknown users cost the same time as wrong passwords. |
| Sessions | Short-lived access token (15 min) kept **in memory** by the frontend; refresh token in an **httpOnly, SameSite=Strict cookie** scoped to `/api/v1/auth`. Refresh tokens rotate on every use; replaying an old one signs the user out everywhere. |
| Access control | Every request re-reads the user's status and role from the database, so disabling an account or changing a role takes effect immediately. Only a Super Admin can edit roles, permissions, Super Admin accounts and recovery entries; the last Super Admin cannot be disabled or demoted. |
| CSRF | Cookie-authenticated calls (`/auth/refresh`, `/auth/logout`) also require an `X-Requested-With` header, and CORS only allows the origins in `CORS_ORIGIN` (never `*`). |
| Errors | Unexpected errors return a generic message; details are only logged on the server. |
| Database | TLS with certificate pinning (`DB_SSL_FINGERPRINT`), or `DB_SSL_CA` / `DB_SSL=true` for a normal CA. |
| Email | Reminder mail goes out over SMTP and a copy is filed in the mailbox's Sent folder (IMAP). Creating reminders is rate limited and the server caps sends per hour (`MAX_EMAILS_PER_HOUR`). |
| Frontend | Production build ships a strict Content-Security-Policy. No token is ever written to `localStorage`. |

### Before going to production

- Set `NODE_ENV=production` (makes the refresh cookie `Secure`, so **serve everything over HTTPS**).
- Set `CORS_ORIGIN` to the real frontend origin. The refresh cookie is `SameSite=Strict`, so the app and the API must
  share a site (for example `app.shop.com` and `api.shop.com`, or one domain behind a reverse proxy).
- Behind a reverse proxy or load balancer set `TRUST_PROXY=1` so rate limits see real client IPs.
- Use a dedicated MySQL user that has rights on the `dukan` schema only (no `DROP` / global privileges).
- Rotate any password that has ever been pasted into a chat, ticket or file (database, SMTP), and change the two
  starter accounts' passwords.
- Serve the built frontend (`npm run build` in `frontend/`) with HSTS and `X-Frame-Options: DENY` set by your web server.
- Run `npm audit --omit=dev` in both folders regularly.

### Upgrading an older database

`npm run setup-db` only creates missing tables. If your database was created before these columns existed, add them:

```sql
ALTER TABLE users ADD COLUMN failed_attempts TINYINT UNSIGNED NOT NULL DEFAULT 0 AFTER status,
                  ADD COLUMN locked_until DATETIME NULL AFTER failed_attempts;
ALTER TABLE refresh_tokens ADD COLUMN revoked_at DATETIME NULL AFTER revoked;
```

## Features

Customers, Items (with stock), Purchases (incl. gari by wheel), multi-item Sales bills with available stock,
Returns (checked against what was sold), Recovery (UPI/Cash/Bank, collected by; Super Admin can correct entries and dues
re-balance), Customer ledger, customer-wise Reports, Search (by name/phone/address/item/bill, sorted by due), printable
Invoices (bill number search), and Reminders sent by email.

Invoice header details come from `SHOP_NAME`, `SHOP_ADDRESS`, `SHOP_PHONE`, `SHOP_GSTIN`, `SHOP_TERMS` in `.env`.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` / `npm start` | Start the API |
| `npm run setup-db` | Create tables, roles, permissions and the first accounts |
| `npm run reset-password -- <phone-or-email>` | Reset a user's password (random one printed once) |
| `npm run hash-password -- <password>` | Print a bcrypt hash |
