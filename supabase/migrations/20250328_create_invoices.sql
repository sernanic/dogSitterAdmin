-- Create invoices table to store payment information from Stripe
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_type TEXT NOT NULL CHECK (booking_type IN ('walking', 'boarding')),
  walking_booking_id UUID REFERENCES walking_bookings(id) ON DELETE SET NULL,
  boarding_booking_id UUID REFERENCES boarding_bookings(id) ON DELETE SET NULL,
  sitter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  stripe_payment_intent_id TEXT,
  stripe_invoice_id TEXT,
  amount DECIMAL(10, 2) NOT NULL,
  platform_fee DECIMAL(10, 2) NOT NULL,
  sitter_payout DECIMAL(10, 2) NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
  payment_method TEXT,
  service_type TEXT NOT NULL CHECK (service_type IN ('walking', 'boarding', 'daycare', 'other')),
  service_date DATE NOT NULL,
  refund_amount DECIMAL(10, 2) DEFAULT 0,
  refund_reason TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS invoices_sitter_id_idx ON invoices(sitter_id);
CREATE INDEX IF NOT EXISTS invoices_owner_id_idx ON invoices(owner_id);
CREATE INDEX IF NOT EXISTS invoices_walking_booking_id_idx ON invoices(walking_booking_id);
CREATE INDEX IF NOT EXISTS invoices_boarding_booking_id_idx ON invoices(boarding_booking_id);
CREATE INDEX IF NOT EXISTS invoices_service_date_idx ON invoices(service_date);
CREATE INDEX IF NOT EXISTS invoices_created_at_idx ON invoices(created_at);
CREATE INDEX IF NOT EXISTS invoices_status_idx ON invoices(status);

-- Add trigger for updated_at timestamp
CREATE TRIGGER set_invoices_updated_at
BEFORE UPDATE ON invoices
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

-- Enable Row Level Security
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Create policies for access control
-- Sitters can view their own earnings
CREATE POLICY "Sitters can view their own invoices"
  ON invoices
  FOR SELECT
  USING (auth.uid() = sitter_id);

-- Owners can view their own payments
CREATE POLICY "Owners can view their own invoices"
  ON invoices
  FOR SELECT
  USING (auth.uid() = owner_id);

-- Only system/server can insert/update invoices (this would happen through your backend)
CREATE POLICY "Only system can insert invoices"
  ON invoices
  FOR INSERT
  WITH CHECK (false);

CREATE POLICY "Only system can update invoices"
  ON invoices
  FOR UPDATE
  USING (false);

-- Create view for sitter earnings summary
CREATE OR REPLACE VIEW sitter_earnings_summary AS
WITH date_ranges AS (
  SELECT 
    id AS sitter_id,
    CURRENT_DATE AS today,
    DATE_TRUNC('week', CURRENT_DATE)::DATE AS week_start,
    (DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '6 days')::DATE AS week_end,
    DATE_TRUNC('month', CURRENT_DATE)::DATE AS month_start,
    (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::DATE AS month_end
  FROM profiles
  WHERE role = 'sitter'
)
SELECT 
  d.sitter_id,
  COALESCE(SUM(CASE WHEN i.service_date = d.today AND i.status = 'paid' THEN i.sitter_payout ELSE 0 END), 0) AS today_earnings,
  COALESCE(SUM(CASE WHEN i.service_date BETWEEN d.week_start AND d.week_end AND i.status = 'paid' THEN i.sitter_payout ELSE 0 END), 0) AS weekly_earnings,
  COALESCE(SUM(CASE WHEN i.service_date BETWEEN d.month_start AND d.month_end AND i.status = 'paid' THEN i.sitter_payout ELSE 0 END), 0) AS monthly_earnings,
  COALESCE(SUM(CASE WHEN i.status = 'paid' THEN i.sitter_payout ELSE 0 END), 0) AS total_earnings,
  COUNT(CASE WHEN i.status = 'paid' THEN 1 ELSE NULL END) AS paid_invoices_count,
  COUNT(CASE WHEN i.status = 'pending' THEN 1 ELSE NULL END) AS pending_invoices_count
FROM date_ranges d
LEFT JOIN invoices i ON d.sitter_id = i.sitter_id
GROUP BY d.sitter_id, d.today, d.week_start, d.week_end, d.month_start, d.month_end;

-- Grant access to the view
GRANT SELECT ON sitter_earnings_summary TO authenticated;

-- Create function to get sitter earnings for a specific timeframe
-- Add constraint to ensure exactly one booking ID is set
ALTER TABLE invoices ADD CONSTRAINT one_booking_id_set_check 
  CHECK (
    (walking_booking_id IS NOT NULL AND boarding_booking_id IS NULL) OR 
    (walking_booking_id IS NULL AND boarding_booking_id IS NOT NULL) OR
    (walking_booking_id IS NULL AND boarding_booking_id IS NULL)
  );

-- Create a view that contains booking information from both tables
CREATE OR REPLACE VIEW booking_details AS (
  SELECT 
    'walking' as booking_type,
    wb.id as booking_id,
    wb.sitter_id,
    wb.owner_id,
    wb.booking_date as service_date,
    wb.status,
    wb.total_price as amount
  FROM walking_bookings wb
  UNION ALL
  SELECT 
    'boarding' as booking_type,
    bb.id as booking_id,
    bb.sitter_id,
    bb.owner_id,
    bb.start_date as service_date,
    bb.status,
    bb.total_price as amount
  FROM boarding_bookings bb
);

CREATE OR REPLACE FUNCTION get_sitter_earnings(
  p_sitter_id UUID,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
  period TEXT,
  earnings DECIMAL(10, 2),
  bookings_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- If no dates provided, return summary data
  IF p_start_date IS NULL OR p_end_date IS NULL THEN
    RETURN QUERY
    SELECT 
      'today' AS period,
      COALESCE(SUM(sitter_payout), 0) AS earnings,
      COUNT(*) AS bookings_count
    FROM invoices
    WHERE 
      sitter_id = p_sitter_id AND
      service_date = CURRENT_DATE AND
      status = 'paid'
    UNION ALL
    SELECT 
      'this_week' AS period,
      COALESCE(SUM(sitter_payout), 0) AS earnings,
      COUNT(*) AS bookings_count
    FROM invoices
    WHERE 
      sitter_id = p_sitter_id AND
      service_date BETWEEN DATE_TRUNC('week', CURRENT_DATE)::DATE AND (DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '6 days')::DATE AND
      status = 'paid'
    UNION ALL
    SELECT 
      'this_month' AS period,
      COALESCE(SUM(sitter_payout), 0) AS earnings,
      COUNT(*) AS bookings_count
    FROM invoices
    WHERE 
      sitter_id = p_sitter_id AND
      service_date BETWEEN DATE_TRUNC('month', CURRENT_DATE)::DATE AND (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::DATE AND
      status = 'paid';
  ELSE
    -- Return data for specific date range
    RETURN QUERY
    SELECT 
      'custom_range' AS period,
      COALESCE(SUM(sitter_payout), 0) AS earnings,
      COUNT(*) AS bookings_count
    FROM invoices
    WHERE 
      sitter_id = p_sitter_id AND
      service_date BETWEEN p_start_date AND p_end_date AND
      status = 'paid';
  END IF;
END;
$$;
