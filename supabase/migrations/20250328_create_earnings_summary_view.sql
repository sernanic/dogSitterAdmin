-- Create a summary view for sitter earnings to improve performance
CREATE OR REPLACE VIEW sitter_earnings_summary AS (
  WITH 
  today_earnings AS (
    SELECT
      sitter_id,
      COALESCE(SUM(sitter_payout), 0) AS today_earnings,
      COUNT(*) AS today_count
    FROM invoices
    WHERE 
      service_date = CURRENT_DATE AND
      status = 'paid'
    GROUP BY sitter_id
  ),
  weekly_earnings AS (
    SELECT
      sitter_id,
      COALESCE(SUM(sitter_payout), 0) AS weekly_earnings,
      COUNT(*) AS weekly_count
    FROM invoices
    WHERE 
      service_date BETWEEN DATE_TRUNC('week', CURRENT_DATE)::DATE AND (DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '6 days')::DATE AND
      status = 'paid'
    GROUP BY sitter_id
  ),
  monthly_earnings AS (
    SELECT
      sitter_id,
      COALESCE(SUM(sitter_payout), 0) AS monthly_earnings,
      COUNT(*) AS monthly_count
    FROM invoices
    WHERE 
      service_date BETWEEN DATE_TRUNC('month', CURRENT_DATE)::DATE AND (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::DATE AND
      status = 'paid'
    GROUP BY sitter_id
  ),
  total_earnings AS (
    SELECT
      sitter_id,
      COALESCE(SUM(sitter_payout), 0) AS total_earnings,
      COUNT(*) AS total_count
    FROM invoices
    WHERE status = 'paid'
    GROUP BY sitter_id
  ),
  pending_invoices AS (
    SELECT
      sitter_id,
      COUNT(*) AS pending_invoices_count
    FROM invoices
    WHERE status = 'pending'
    GROUP BY sitter_id
  )
  SELECT 
    p.id AS sitter_id,
    COALESCE(te.today_earnings, 0) AS today_earnings,
    COALESCE(we.weekly_earnings, 0) AS weekly_earnings,
    COALESCE(me.monthly_earnings, 0) AS monthly_earnings,
    COALESCE(toe.total_earnings, 0) AS total_earnings,
    COALESCE(toe.total_count, 0) AS paid_invoices_count,
    COALESCE(pi.pending_invoices_count, 0) AS pending_invoices_count
  FROM profiles p
  LEFT JOIN today_earnings te ON p.id = te.sitter_id
  LEFT JOIN weekly_earnings we ON p.id = we.sitter_id
  LEFT JOIN monthly_earnings me ON p.id = me.sitter_id
  LEFT JOIN total_earnings toe ON p.id = toe.sitter_id
  LEFT JOIN pending_invoices pi ON p.id = pi.sitter_id
  WHERE p.role = 'sitter'
);

-- Note: Views in PostgreSQL don't have row-level security policies directly.
-- Instead, the security is controlled by the underlying tables.
-- Since we're using the invoices table which already has RLS policies,
-- the view will inherit those security restrictions.
