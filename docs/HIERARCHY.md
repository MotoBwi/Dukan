# Dukan — Project Hierarchy & Access Control

## 1. Folder Structure

```
Dukan/
├── Sohon.pdf                 # source wireframe/flow (client-provided)
├── README.md                 # setup + run instructions
├── package.json
├── .env.example
├── database/
│   ├── schema.sql            # DDL: all tables
│   └── seed.sql              # roles, permissions, role_permissions, super admin
├── docs/
│   ├── PLANNING.md           # goals, phased delivery plan, assumptions
│   ├── ARCHITECTURE.md       # tech stack, request pipeline, module map
│   └── HIERARCHY.md          # this file
├── scripts/
│   └── hash-password.js      # generates a bcrypt hash for seeding/reset
└── src/
    ├── app.js                # express app: middleware + route mounting
    ├── server.js             # entrypoint: starts HTTP server + scheduler
    ├── config/
    │   ├── env.js             # loads/validates process.env
    │   └── db.js              # mysql2 connection pool
    ├── middleware/
    │   ├── auth.middleware.js     # verifies JWT, sets req.user
    │   ├── rbac.middleware.js     # authorize(module, action) — checks role_permissions
    │   ├── validate.middleware.js # zod request validation
    │   ├── audit.middleware.js    # writes audit_logs on mutations
    │   └── error.middleware.js    # 404 + centralized error handler
    ├── routes/                # one file per module, mounted under /api/v1
    ├── controllers/           # request/response glue, calls models + audit
    ├── models/                # raw parameterized SQL via the mysql2 pool
    ├── services/
    │   └── stock.service.js   # shared stock_ledger writer
    ├── validators/            # zod schemas per module
    └── scheduler/
        └── reminder.scheduler.js  # node-cron due-reminder sweep
```

## 2. Request Hierarchy (who touches what, in order)

```
Client
  → routes/*.routes.js          (path + HTTP verb)
  → auth.middleware              (JWT → req.user)
  → rbac.middleware               (module:action permission check)
  → validate.middleware           (zod: body/params/query)
  → controllers/*.controller.js   (orchestration, calls model + audit)
  → models/*.model.js             (SQL, transactions, stock_ledger writes)
  → MySQL
```

## 3. Role Hierarchy (User Control Access / RBAC)

```
SUPER_ADMIN
  └── full access to every module, including users & roles management
      (bypasses the permission-matrix lookup entirely — see rbac.middleware.js)
ADMIN
  └── full access to daily-operation modules (customers, items, purchases,
      sales, returns, reminders, recovery, dashboard)
  └── read-only on users/roles (cannot create/update/delete accounts or roles)
STAFF
  └── create + read only, operational modules only
  └── no delete anywhere, no access to users/roles/audit_logs
```

Permissions are **not hardcoded to role names** — they live in the
`role_permissions` table (see `database/seed.sql`), so the matrix can be
edited later (`PUT /api/v1/roles/:id/permissions`) without touching code.

## 4. Permission Matrix (module × action)

| Module      | SUPER_ADMIN | ADMIN            | STAFF          |
|-------------|-------------|-------------------|----------------|
| users       | CRUD        | Read only         | —              |
| roles       | CRUD        | Read only         | —              |
| customers   | CRUD        | CRUD              | Create, Read   |
| items       | CRUD        | CRUD              | Create, Read   |
| purchases   | CRUD        | CRUD              | Create, Read   |
| sales       | CRUD        | CRUD              | Create, Read   |
| returns     | CRUD        | CRUD              | Create, Read   |
| recovery    | CRUD        | CRUD              | Create, Read   |
| reminders   | CRUD        | CRUD              | Create, Read   |
| dashboard   | Read        | Read              | Read           |
| audit_logs  | Read        | —                 | —              |

## 5. Data Hierarchy (how records relate)

```
users ──belongs to──> roles ──has many──> permissions (via role_permissions)

customers ──has many──> sales ──has many──> returns ("Auto by sales")
                    └──> has many──> recovery_payments

items ──referenced by──> purchases, sales, returns
                    └──> stock_ledger (purchase +qty, sale -qty, return +qty)
                         → SUM(qty_change) per item = current stock balance

sales.due_amount ──reduced by──> recovery_payments, returns
                   (recalculated on every write, never manually edited)

reminders ──optionally linked to──> customers, sales
audit_logs ──references──> users (who did it), any module + record_id (what changed)
```
