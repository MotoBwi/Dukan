# Dukan — System Architecture

Source: `Sohon.pdf` (wireframe + flow diagram provided by client)

## 1. Overview

Dukan ek shop/retail management system hai jisme ek Admin Dashboard se puri dukan ki daily activity control hoti hai:

- **Customer Registration** — customer master data
- **Purchase Registration** — stock IN (dukan me maal aana)
- **Sales Registration** — stock OUT (dukan se maal bikna)
- **Return Registration** — sale se linked return (auto reference sale se aata hai)
- **Shared tools** — Search, Edit & Delete, Reminders, Recovery Amount (customer dues collection)

Dashboard par top-level summary: **current stock + customer dues (bakaya)**.

## 2. Tech Stack (as requested)

| Layer          | Choice                                           |
|----------------|---------------------------------------------------|
| Runtime        | Node.js (LTS)                                     |
| Framework      | Express.js                                        |
| Database       | MySQL 8                                            |
| DB Access      | `mysql2/promise` connection pool + raw parameterized SQL |
| Auth           | JWT (access + refresh token), `bcrypt` for password hashing |
| Access Control | Role-Based Access Control (RBAC) — roles + granular permissions stored in DB |
| Validation     | `zod` (or `joi`) for request validation           |
| Scheduling     | `node-cron` (reminders due-check, auto status jobs) |
| Logging        | `morgan` (HTTP) + simple audit_logs table          |

> Note: PDF ke apne diagram me Postgres + Prisma suggest hua tha, lekin aapke explicit instruction ke mutabiq stack **Node.js + MySQL + JWT** rakha gaya hai.

## 3. High-Level Flow

```
Admin/Staff Login
      │  (email/phone + password)
      ▼
JWT issued (access ~15m, refresh ~7d)
      │
      ▼
Admin Dashboard (React/any SPA — separate frontend, consumes REST API)
      │
      ├── GET /api/v1/dashboard/summary   → stock + dues summary
      │
      ├── /api/v1/customers      (CRUD)
      ├── /api/v1/items          (master item list)
      ├── /api/v1/purchases      (stock IN)
      ├── /api/v1/sales          (stock OUT)
      ├── /api/v1/returns        (linked to a sale)
      ├── /api/v1/reminders      (follow-up on dues)
      ├── /api/v1/recovery       (dues payment collection)
      └── /api/v1/users          (admin/staff + role management — SUPER_ADMIN only)
```

Every request: `auth.middleware (verify JWT)` → `rbac.middleware (check permission)` → `controller` → `model (SQL)` → `MySQL`.

## 4. Request Pipeline

```
Client
  → express.json()
  → morgan (logging)
  → route
  → authenticate()        # verifies JWT, loads req.user {id, role_id, role_name}
  → authorize(module, action)   # checks role_permissions table
  → validate(schema)       # zod request validation
  → controller
  → model (parameterized SQL via mysql2 pool)
  → response envelope { success, data, message }
  → errorHandler (central)
```

## 5. Module Responsibility Map

| Module     | Responsibility |
|------------|-----------------|
| `auth`     | login, refresh token, logout, change password |
| `users`    | manage admin/staff accounts, assign roles |
| `roles`    | manage roles + permission matrix (SUPER_ADMIN only) |
| `customers`| customer master CRUD, search |
| `items`    | item master CRUD (item name catalogue) |
| `purchases`| stock-in entries (item, unit, qty, price → amount), increases stock |
| `sales`    | stock-out entries, linked to a customer, tracks paid/due amount |
| `returns`  | return entries, always linked to a `sale_id`, reverses stock/amount |
| `reminders`| self-reminders tied to a customer/sale for follow-up |
| `recovery` | records payments collected against a customer's due amount |
| `dashboard`| aggregate stock levels + total dues for the summary screen |

## 6. Stock & Dues Logic (derived, not manually entered)

- **Stock balance per item** = Σ purchase qty − Σ sale qty + Σ return qty (tracked via `stock_ledger`, one row per transaction line — auditable and re-computable).
- **Customer due amount** = Σ sale.total_amount − Σ recovery_payments.amount (per customer), also cached on `sales.due_amount` for fast reads, recalculated on every sale/recovery write.

## 7. Security

- Passwords hashed with `bcrypt` (cost 12).
- JWT access token short-lived; refresh token stored hashed in `refresh_tokens` table (revocable, rotated on use).
- All destructive routes (`delete`, `edit` on financial records) gated by RBAC + audit-logged in `audit_logs`.
- Rate limiting on `/auth/login` (`express-rate-limit`) to blunt brute force.
