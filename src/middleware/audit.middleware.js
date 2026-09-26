const pool = require('../config/db');

/**
 * Fire-and-forget audit log write. Call from controllers after a mutating action:
 *   audit(req, { module: 'sales', action: 'create', recordId: sale.id, after: sale })
 */
async function audit(req, { module, action, recordId = null, before = null, after = null }) {
  try {
    await pool.query(
      `INSERT INTO audit_logs (user_id, module, action, record_id, before_json, after_json)
       VALUES (:userId, :module, :action, :recordId, :before, :after)`,
      {
        userId: req.user?.id ?? null,
        module,
        action,
        recordId,
        before: before ? JSON.stringify(before) : null,
        after: after ? JSON.stringify(after) : null,
      }
    );
  } catch (err) {
    // Audit logging must never break the primary request.
    console.error('audit log write failed:', err.message);
  }
}

module.exports = audit;
