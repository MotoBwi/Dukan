const pool = require('../config/db');

async function getSummary() {
  const [[stock]] = await pool.query(
    `SELECT COUNT(DISTINCT item_id) AS item_count
       FROM stock_ledger`
  );

  const [[dues]] = await pool.query(
    `SELECT COALESCE(SUM(due_amount), 0) AS total_due, COUNT(DISTINCT customer_id) AS customers_with_due
       FROM sales WHERE deleted_at IS NULL AND due_amount > 0`
  );

  const [[today]] = await pool.query(
    `SELECT
        (SELECT COALESCE(SUM(amount), 0) FROM sales WHERE deleted_at IS NULL AND sale_date = CURDATE()) AS today_sales,
        (SELECT COALESCE(SUM(amount), 0) FROM purchases WHERE deleted_at IS NULL AND purchase_date = CURDATE()) AS today_purchases`
  );

  const [[reminders]] = await pool.query(
    `SELECT COUNT(*) AS pending_reminders FROM reminders WHERE status = 'pending' AND remind_at <= NOW()`
  );

  return {
    stock_items_tracked: Number(stock.item_count),
    total_customer_dues: Number(dues.total_due),
    customers_with_due: Number(dues.customers_with_due),
    today_sales_amount: Number(today.today_sales),
    today_purchases_amount: Number(today.today_purchases),
    pending_reminders: Number(reminders.pending_reminders),
  };
}

module.exports = { getSummary };
