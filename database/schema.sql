-- Dukan — MySQL 8 schema
-- Source: Sohon.pdf (Customer / Purchase / Sales / Return registers) + docs/ARCHITECTURE.md

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- =========================================================
-- 1. ACCESS CONTROL (RBAC)
-- =========================================================

CREATE TABLE IF NOT EXISTS roles (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(50) NOT NULL UNIQUE,       -- SUPER_ADMIN, ADMIN, STAFF
  description   VARCHAR(255) NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS permissions (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  module        VARCHAR(50) NOT NULL,   -- customers, items, purchases, sales, returns, reminders, recovery, users, roles, dashboard
  action        VARCHAR(20) NOT NULL,   -- create, read, update, delete
  UNIQUE KEY uq_module_action (module, action)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id       INT UNSIGNED NOT NULL,
  permission_id INT UNSIGNED NOT NULL,
  PRIMARY KEY (role_id, permission_id),
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS users (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  username      VARCHAR(50) NULL UNIQUE,        -- optional login ID (phone or email also work)
  email         VARCHAR(150) NULL UNIQUE,
  phone         VARCHAR(20) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role_id       INT UNSIGNED NOT NULL,
  status        ENUM('active','disabled') NOT NULL DEFAULT 'active',
  failed_attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,   -- consecutive wrong passwords
  locked_until  DATETIME NULL,                           -- login blocked until this time after too many failures
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (role_id) REFERENCES roles(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id       INT UNSIGNED NOT NULL,
  token_hash    VARCHAR(255) NOT NULL,
  expires_at    DATETIME NOT NULL,
  revoked       TINYINT(1) NOT NULL DEFAULT 0,
  revoked_at    DATETIME NULL,          -- when it was revoked; lets us tell a tab race from token theft
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user (user_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS audit_logs (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id       INT UNSIGNED NULL,
  module        VARCHAR(50) NOT NULL,
  action        VARCHAR(20) NOT NULL,
  record_id     BIGINT UNSIGNED NULL,
  before_json   JSON NULL,
  after_json    JSON NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_module_record (module, record_id)
) ENGINE=InnoDB;

-- =========================================================
-- 2. CUSTOMER REGISTRATION  (per PDF: Name, Age, Phone No, Address)
-- =========================================================

CREATE TABLE IF NOT EXISTS customers (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  age           SMALLINT UNSIGNED NULL,
  phone         VARCHAR(20) NOT NULL,
  address       VARCHAR(255) NULL,
  created_by    INT UNSIGNED NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at    TIMESTAMP NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_phone (phone),
  INDEX idx_name (name)
) ENGINE=InnoDB;

-- Item master catalogue (name reused across purchase/sales/return lines)
CREATE TABLE IF NOT EXISTS items (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(100) NOT NULL UNIQUE,
  default_unit  ENUM('KG','PCS','GARI_BY_WHEEL','TROLLY','TIN','NUMBER') NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at    TIMESTAMP NULL
) ENGINE=InnoDB;

-- =========================================================
-- 3. PURCHASE REGISTRATION (stock IN)
-- Per PDF: Item Name, Measurement (KG/Pcs/Gari by whell), Qty (Number), Price -> Amount
-- =========================================================

CREATE TABLE IF NOT EXISTS purchases (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  item_id       INT UNSIGNED NOT NULL,
  item_name     VARCHAR(100) NOT NULL,  -- snapshot at time of entry
  unit          ENUM('KG','PCS','GARI_BY_WHEEL','TROLLY','TIN','NUMBER') NOT NULL,
  wheels        TINYINT UNSIGNED NULL,        -- only for GARI_BY_WHEEL: 4, 6, 10... (price is per gari of that type)
  qty           DECIMAL(12,2) NOT NULL,
  price         DECIMAL(12,2) NOT NULL,       -- unit price
  amount        DECIMAL(14,2) NOT NULL,       -- qty * price
  purchase_date DATE NOT NULL,
  note          VARCHAR(255) NULL,
  created_by    INT UNSIGNED NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at    TIMESTAMP NULL,
  FOREIGN KEY (item_id) REFERENCES items(id),
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_item_date (item_id, purchase_date)
) ENGINE=InnoDB;

-- =========================================================
-- 4. SALES REGISTRATION (stock OUT)
-- Per PDF: Item Name, Measurement (KG/Pcs/Trolly/Tin/Number), Qty, Price -> Amount
-- Linked to a customer; tracks paid vs due for "Recovery Amount" / dues dashboard.
-- =========================================================

CREATE TABLE IF NOT EXISTS sales (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  customer_id   INT UNSIGNED NOT NULL,
  bill_id       BIGINT UNSIGNED NULL,   -- id of the first line of the bill; groups multi-item sales
  item_id       INT UNSIGNED NOT NULL,
  item_name     VARCHAR(100) NOT NULL,
  unit          ENUM('KG','PCS','TROLLY','TIN','NUMBER') NOT NULL,
  qty           DECIMAL(12,2) NOT NULL,
  price         DECIMAL(12,2) NOT NULL,
  amount        DECIMAL(14,2) NOT NULL,        -- qty * price
  paid_amount   DECIMAL(14,2) NOT NULL DEFAULT 0,  -- initial_paid + recovery applied later
  initial_paid  DECIMAL(14,2) NOT NULL DEFAULT 0,  -- amount received at the time of sale (used by the ledger)
  due_amount    DECIMAL(14,2) NOT NULL DEFAULT 0,  -- amount - paid_amount, recalculated on write
  sale_date     DATE NOT NULL,
  note          VARCHAR(255) NULL,
  created_by    INT UNSIGNED NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at    TIMESTAMP NULL,
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (item_id) REFERENCES items(id),
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_customer_date (customer_id, sale_date),
  INDEX idx_item_date (item_id, sale_date)
) ENGINE=InnoDB;

-- =========================================================
-- 5. RETURN REGISTRATION — "Auto by sales"
-- Per PDF: Item Name (Number), Measurement (Auto by sales), Qty, Price -> Amount
-- Always linked to a prior sale; reverses stock + reduces the sale's due/amount.
-- =========================================================

CREATE TABLE IF NOT EXISTS returns (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  sale_id       BIGINT UNSIGNED NOT NULL,
  item_id       INT UNSIGNED NOT NULL,
  unit          ENUM('KG','PCS','TROLLY','TIN','NUMBER') NOT NULL,
  qty           DECIMAL(12,2) NOT NULL,
  price         DECIMAL(12,2) NOT NULL,
  amount        DECIMAL(14,2) NOT NULL,
  return_date   DATE NOT NULL,
  reason        VARCHAR(255) NULL,
  created_by    INT UNSIGNED NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at    TIMESTAMP NULL,
  FOREIGN KEY (sale_id) REFERENCES sales(id),
  FOREIGN KEY (item_id) REFERENCES items(id),
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_sale (sale_id)
) ENGINE=InnoDB;

-- =========================================================
-- 6. STOCK LEDGER — derived/auditable stock balance
-- balance per item = SUM(qty_change)
-- =========================================================

CREATE TABLE IF NOT EXISTS stock_ledger (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  item_id       INT UNSIGNED NOT NULL,
  ref_type      ENUM('purchase','sale','return') NOT NULL,
  ref_id        BIGINT UNSIGNED NOT NULL,
  qty_change    DECIMAL(12,2) NOT NULL,   -- +qty for purchase/return, -qty for sale
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (item_id) REFERENCES items(id),
  INDEX idx_item (item_id),
  INDEX idx_ref (ref_type, ref_id)
) ENGINE=InnoDB;

-- =========================================================
-- 7. RECOVERY — dues collection against a customer / sale
-- =========================================================

CREATE TABLE IF NOT EXISTS recovery_payments (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  customer_id   INT UNSIGNED NOT NULL,
  sale_id       BIGINT UNSIGNED NULL,     -- optional: payment against a specific sale
  amount        DECIMAL(14,2) NOT NULL,
  payment_mode  ENUM('UPI','CASH','BANK') NOT NULL DEFAULT 'CASH',
  collected_by  VARCHAR(100) NULL,        -- free-text name of who collected the payment
  payment_date  DATE NOT NULL,
  note          VARCHAR(255) NULL,
  created_by    INT UNSIGNED NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at    TIMESTAMP NULL,
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_customer (customer_id)
) ENGINE=InnoDB;

-- =========================================================
-- 8. SELF REMINDER — follow-ups tied to a customer/sale
-- =========================================================

CREATE TABLE IF NOT EXISTS reminders (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  customer_id   INT UNSIGNED NULL,
  sale_id       BIGINT UNSIGNED NULL,
  title         VARCHAR(150) NOT NULL,
  email         VARCHAR(150) NULL,            -- recipient, typed by hand when the reminder is created
  note          VARCHAR(255) NULL,
  remind_at     DATETIME NOT NULL,
  status        ENUM('pending','done','snoozed') NOT NULL DEFAULT 'pending',
  sent_at       DATETIME NULL,                -- set when the reminder email was actually sent
  last_error    VARCHAR(255) NULL,            -- last SMTP failure, cleared on success
  channel       ENUM('email') NOT NULL DEFAULT 'email',
  created_by    INT UNSIGNED NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_remind_at (remind_at, status)
) ENGINE=InnoDB;

SET FOREIGN_KEY_CHECKS = 1;
