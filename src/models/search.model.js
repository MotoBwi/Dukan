const pool = require('../config/db');

// Whitelisted ORDER BY fragments — never interpolate user input.
const ORDER_BY = {
  due_desc: 'total_due DESC, total_amount DESC, c.name ASC',
  due_asc: 'total_due ASC, c.name ASC',
  recent: 'last_sale_date IS NULL, last_sale_date DESC, c.name ASC',
  name: 'c.name ASC',
};

/**
 * Customer-centric search. q matches name / phone / address / item / bill number / notes / collector.
 * Sales totals are computed over the date range (or all time if no range) so "due" is comparable
 * with the Report page. With a date range, only customers with a sale, return or recovery in it appear.
 */
async function searchCustomers({ q = '', address = '', from = null, to = null, onlyDue = false, sort = 'due_desc', limit = 200 } = {}) {
  const [rows] = await pool.query(
    `SELECT c.id AS customer_id, c.name, c.phone, c.address,
            COALESCE(agg.sales_count, 0)  AS sales_count,
            COALESCE(agg.total_amount, 0) AS total_amount,
            COALESCE(agg.total_paid, 0)   AS total_paid,
            COALESCE(agg.total_due, 0)    AS total_due,
            agg.last_sale_date
       FROM customers c
       LEFT JOIN (
         SELECT s.customer_id,
                COUNT(*)           AS sales_count,
                SUM(s.amount)      AS total_amount,
                SUM(s.paid_amount) AS total_paid,
                SUM(s.due_amount)  AS total_due,
                MAX(s.sale_date)   AS last_sale_date
           FROM sales s
          WHERE s.deleted_at IS NULL
            AND (:from IS NULL OR s.sale_date >= :from)
            AND (:to IS NULL OR s.sale_date <= :to)
          GROUP BY s.customer_id
       ) agg ON agg.customer_id = c.id
      WHERE c.deleted_at IS NULL
        AND (:address = '' OR c.address LIKE CONCAT('%', :address, '%'))
        AND (:q = ''
             OR c.name LIKE CONCAT('%', :q, '%')
             OR c.phone LIKE CONCAT('%', :q, '%')
             OR c.address LIKE CONCAT('%', :q, '%')
             OR EXISTS (SELECT 1 FROM sales s2
                         WHERE s2.customer_id = c.id AND s2.deleted_at IS NULL
                           AND (s2.item_name LIKE CONCAT('%', :q, '%')
                                OR s2.note LIKE CONCAT('%', :q, '%')
                                OR CAST(s2.bill_id AS CHAR) = :q))
             OR EXISTS (SELECT 1 FROM recovery_payments rp2
                         WHERE rp2.customer_id = c.id AND rp2.deleted_at IS NULL
                           AND (rp2.note LIKE CONCAT('%', :q, '%')
                                OR rp2.collected_by LIKE CONCAT('%', :q, '%'))))
        AND (:hasRange = 0
             OR agg.customer_id IS NOT NULL
             OR EXISTS (SELECT 1 FROM returns r3 JOIN sales s3 ON s3.id = r3.sale_id
                         WHERE s3.customer_id = c.id AND r3.deleted_at IS NULL
                           AND (:from IS NULL OR r3.return_date >= :from)
                           AND (:to IS NULL OR r3.return_date <= :to))
             OR EXISTS (SELECT 1 FROM recovery_payments rp3
                         WHERE rp3.customer_id = c.id AND rp3.deleted_at IS NULL
                           AND (:from IS NULL OR rp3.payment_date >= :from)
                           AND (:to IS NULL OR rp3.payment_date <= :to)))
        AND (:onlyDue = 0 OR COALESCE(agg.total_due, 0) > 0)
      ORDER BY ${ORDER_BY[sort] || ORDER_BY.due_desc}
      LIMIT :limit`,
    { q, address, from, to, hasRange: from || to ? 1 : 0, onlyDue: onlyDue ? 1 : 0, limit }
  );
  return rows;
}

module.exports = { searchCustomers };
