-- Dukan — seed data: roles, permissions, role-permission matrix, super admin

-- 1. Roles
INSERT INTO roles (name, description) VALUES
  ('SUPER_ADMIN', 'Full access — manages users, roles, all modules'),
  ('ADMIN',       'Manages daily operations: customers, purchase, sales, return, recovery, reminders'),
  ('STAFF',       'Limited: create/read on customers, purchase, sales, return; no delete, no user mgmt')
ON DUPLICATE KEY UPDATE description = VALUES(description);

-- 2. Permissions (module x action)
INSERT INTO permissions (module, action) VALUES
  ('users','create'), ('users','read'), ('users','update'), ('users','delete'),
  ('roles','create'), ('roles','read'), ('roles','update'), ('roles','delete'),
  ('customers','create'), ('customers','read'), ('customers','update'), ('customers','delete'),
  ('items','create'), ('items','read'), ('items','update'), ('items','delete'),
  ('purchases','create'), ('purchases','read'), ('purchases','update'), ('purchases','delete'),
  ('sales','create'), ('sales','read'), ('sales','update'), ('sales','delete'),
  ('returns','create'), ('returns','read'), ('returns','update'), ('returns','delete'),
  ('reminders','create'), ('reminders','read'), ('reminders','update'), ('reminders','delete'),
  ('recovery','create'), ('recovery','read'), ('recovery','update'), ('recovery','delete'),
  ('dashboard','read'),
  ('audit_logs','read')
ON DUPLICATE KEY UPDATE module = VALUES(module);

-- 3. Role -> Permission matrix

-- SUPER_ADMIN: every permission
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'SUPER_ADMIN'
ON DUPLICATE KEY UPDATE role_id = role_id;

-- ADMIN: everything except users/roles delete and audit_logs remain read-only via users/roles read
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'ADMIN'
  AND NOT (p.module IN ('users','roles') AND p.action IN ('create','update','delete'))
ON DUPLICATE KEY UPDATE role_id = role_id;

-- STAFF: create + read only, on operational modules; no users/roles/audit_logs, no delete anywhere
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'STAFF'
  AND p.module IN ('customers','items','purchases','sales','returns','reminders','recovery','dashboard')
  AND p.action IN ('create','read')
ON DUPLICATE KEY UPDATE role_id = role_id;

-- 4. Users are deliberately NOT seeded here: a default password in a file is a known password.
-- `npm run setup-db` creates the first Super Admin and Admin with random passwords, shown once.
