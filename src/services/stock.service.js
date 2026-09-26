/** Writes one stock_ledger row per transaction line. Call within the same connection/transaction as the caller. */
async function recordStockChange(conn, { itemId, refType, refId, qtyChange }) {
  await conn.query(
    `INSERT INTO stock_ledger (item_id, ref_type, ref_id, qty_change)
     VALUES (:itemId, :refType, :refId, :qtyChange)`,
    { itemId, refType, refId, qtyChange }
  );
}

module.exports = { recordStockChange };
