# Dukan — Project Planning

## 1. Goals

1. Digitize the paper-register workflow shown in the PDF: Customer, Purchase, Sales, Return registers.
2. Give the shop owner a single Admin Dashboard: live stock + customer dues at a glance.
3. Support multiple staff logins with different access levels (RBAC) under JWT auth.
4. Keep every register searchable, editable, and deletable (with audit trail).
5. Reminders for follow-ups, Recovery tracking for customer dues (bakaya collection).

## 2. Phased Delivery Plan

### Phase 0 — Foundation (this delivery)
- Architecture, planning, hierarchy docs
- MySQL schema (DDL) + seed data (roles, permissions, super admin)
- Node.js/Express project scaffold: config, DB pool, JWT auth, RBAC middleware
- Core modules wired end-to-end: auth, users/roles, customers, items, purchases, sales, returns, reminders, recovery, dashboard summary

### Phase 1 — Hardening
- Request validation (zod) on every route
- Centralized error handling + consistent API response envelope
- Audit logging on create/update/delete
- Rate limiting + helmet security headers
- Pagination + search/filter on list endpoints

### Phase 2 — Business logic depth
- Auto stock computation via `stock_ledger`
- Auto due-amount computation on sales + recovery
- Reminder scheduler (`node-cron`) — daily due-reminder sweep
- Reports: daily sales, purchase summary, top customers by dues

### Phase 3 — Admin Dashboard (frontend) — done
- React + Vite + Tailwind SPA in `frontend/`, consuming the REST API.
- Login (JWT access/refresh, auto-refresh on 401), dashboard summary, and CRUD screens for
  Customers, Items, Purchases, Sales, Returns, Recovery, Reminders, Users, Roles.
- Sidebar nav and every action (add/edit/delete button) hidden per the logged-in user's
  role_permissions — enforced again server-side by `rbac.middleware.js`, UI is not the only gate.
- Not yet built: reminder status change (done/snoozed) from the UI, pagination controls beyond a
  fixed page size, reports (Phase 2 item).

### Phase 4 — Ops
- Environment configs (dev/staging/prod), migrations tooling, backups, deployment (PM2/Docker)

## 3. Out of Scope (for now, confirm before building)

- Frontend admin dashboard UI (only API is being built)
- SMS/WhatsApp notification integration (schema leaves room for it — `reminders.channel`)
- Multi-shop / multi-tenant support (current schema assumes single shop)

## 4. Assumptions Made (please correct if wrong)

- "User control access" = RBAC (roles + permissions), not just single admin/staff split.
- Item name + unit (KG/Pcs/Trolly/Tin/Gari/Number) is chosen **per transaction line**, not fixed per item — since the PDF shows different unit options across Purchase/Sales modules for the same kind of item.
- Return is always linked to a prior Sale (per PDF: "Auto by sales").
- "Recovery Amount" = tracking partial/full payment collection against a customer's due balance from sales.
