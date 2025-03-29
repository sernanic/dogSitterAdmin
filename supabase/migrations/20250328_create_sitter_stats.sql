-- Create the sitter_stats table to store real statistics for the home screen
CREATE TABLE IF NOT EXISTS sitter_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sitter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  total_bookings INTEGER NOT NULL DEFAULT 0,
  completed_bookings INTEGER NOT NULL DEFAULT 0,
  average_rating DECIMAL(3,2) NOT NULL DEFAULT 0,
  total_clients INTEGER NOT NULL DEFAULT 0,
  last_updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT sitter_stats_sitter_id_key UNIQUE (sitter_id)
);

-- Create index for faster lookups by sitter_id
CREATE INDEX IF NOT EXISTS sitter_stats_sitter_id_idx ON sitter_stats(sitter_id);

-- Enable Row Level Security
ALTER TABLE sitter_stats ENABLE ROW LEVEL SECURITY;

-- Create policy for sitters to view their own stats
CREATE POLICY "Sitters can view their own stats"
  ON sitter_stats
  FOR SELECT
  USING (auth.uid() = sitter_id);

-- Create policy for admin access to all stats (optional, comment out if not needed)
-- CREATE POLICY "Admins can view all sitter stats"
--   ON sitter_stats
--   FOR SELECT
--   USING (
--     auth.uid() IN (
--       SELECT id FROM profiles WHERE role = 'admin'
--     )
--   );

-- Create a function to calculate and update sitter stats
CREATE OR REPLACE FUNCTION update_sitter_stats(p_sitter_id UUID)
RETURNS VOID AS $$
DECLARE
  v_total_bookings INTEGER;
  v_completed_bookings INTEGER;
  v_avg_rating DECIMAL(3,2);
  v_total_clients INTEGER;
BEGIN
  -- Calculate total bookings (walking + boarding)
  SELECT 
    COALESCE(
      (SELECT COUNT(*) FROM walking_bookings WHERE sitter_id = p_sitter_id), 
      0
    ) +
    COALESCE(
      (SELECT COUNT(*) FROM boarding_bookings WHERE sitter_id = p_sitter_id),
      0
    )
  INTO v_total_bookings;
  
  -- Calculate completed bookings (walking + boarding with status 'completed')
  SELECT 
    COALESCE(
      (SELECT COUNT(*) FROM walking_bookings WHERE sitter_id = p_sitter_id AND status = 'completed'), 
      0
    ) +
    COALESCE(
      (SELECT COUNT(*) FROM boarding_bookings WHERE sitter_id = p_sitter_id AND status = 'completed'),
      0
    )
  INTO v_completed_bookings;
  
  -- Calculate average rating
  SELECT COALESCE(AVG(rating), 0)
  INTO v_avg_rating
  FROM reviews
  WHERE sitter_id = p_sitter_id;
  
  -- Calculate total unique clients (owners) from both booking types
  WITH all_clients AS (
    SELECT DISTINCT owner_id FROM walking_bookings WHERE sitter_id = p_sitter_id
    UNION
    SELECT DISTINCT owner_id FROM boarding_bookings WHERE sitter_id = p_sitter_id
  )
  SELECT COUNT(*) INTO v_total_clients FROM all_clients;
  
  -- Insert or update the stats record
  INSERT INTO sitter_stats (
    sitter_id, 
    total_bookings, 
    completed_bookings, 
    average_rating, 
    total_clients,
    last_updated_at
  ) 
  VALUES (
    p_sitter_id, 
    v_total_bookings, 
    v_completed_bookings, 
    v_avg_rating, 
    v_total_clients,
    now()
  )
  ON CONFLICT (sitter_id) 
  DO UPDATE SET 
    total_bookings = v_total_bookings,
    completed_bookings = v_completed_bookings,
    average_rating = v_avg_rating,
    total_clients = v_total_clients,
    last_updated_at = now();
END;
$$ LANGUAGE plpgsql;

-- Create triggers to automatically update sitter stats when related data changes

-- Trigger for walking_bookings changes
CREATE OR REPLACE FUNCTION trigger_update_sitter_stats_on_walking_booking()
RETURNS TRIGGER AS $$
BEGIN
  -- For inserts and updates, update stats for the new sitter
  IF (TG_OP = 'INSERT') OR (TG_OP = 'UPDATE' AND OLD.sitter_id <> NEW.sitter_id) THEN
    PERFORM update_sitter_stats(NEW.sitter_id);
  END IF;
  
  -- For updates where status changes to 'completed', update stats
  IF (TG_OP = 'UPDATE' AND OLD.status <> 'completed' AND NEW.status = 'completed') THEN
    PERFORM update_sitter_stats(NEW.sitter_id);
  END IF;
  
  -- For deletes and updates where the sitter changed, update stats for the old sitter
  IF (TG_OP = 'DELETE') OR (TG_OP = 'UPDATE' AND OLD.sitter_id <> NEW.sitter_id) THEN
    PERFORM update_sitter_stats(OLD.sitter_id);
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_walking_bookings_stats ON walking_bookings;
CREATE TRIGGER trigger_walking_bookings_stats
AFTER INSERT OR UPDATE OR DELETE ON walking_bookings
FOR EACH ROW EXECUTE FUNCTION trigger_update_sitter_stats_on_walking_booking();

-- Trigger for boarding_bookings changes
CREATE OR REPLACE FUNCTION trigger_update_sitter_stats_on_boarding_booking()
RETURNS TRIGGER AS $$
BEGIN
  -- For inserts and updates, update stats for the new sitter
  IF (TG_OP = 'INSERT') OR (TG_OP = 'UPDATE' AND OLD.sitter_id <> NEW.sitter_id) THEN
    PERFORM update_sitter_stats(NEW.sitter_id);
  END IF;
  
  -- For updates where status changes to 'completed', update stats
  IF (TG_OP = 'UPDATE' AND OLD.status <> 'completed' AND NEW.status = 'completed') THEN
    PERFORM update_sitter_stats(NEW.sitter_id);
  END IF;
  
  -- For deletes and updates where the sitter changed, update stats for the old sitter
  IF (TG_OP = 'DELETE') OR (TG_OP = 'UPDATE' AND OLD.sitter_id <> NEW.sitter_id) THEN
    PERFORM update_sitter_stats(OLD.sitter_id);
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_boarding_bookings_stats ON boarding_bookings;
CREATE TRIGGER trigger_boarding_bookings_stats
AFTER INSERT OR UPDATE OR DELETE ON boarding_bookings
FOR EACH ROW EXECUTE FUNCTION trigger_update_sitter_stats_on_boarding_booking();

-- Trigger for reviews changes
CREATE OR REPLACE FUNCTION trigger_update_sitter_stats_on_review()
RETURNS TRIGGER AS $$
BEGIN
  -- For inserts, updates, and deletes, update the stats for the affected sitter
  IF (TG_OP = 'INSERT') OR (TG_OP = 'UPDATE') THEN
    PERFORM update_sitter_stats(NEW.sitter_id);
  ELSIF (TG_OP = 'DELETE') THEN
    PERFORM update_sitter_stats(OLD.sitter_id);
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_reviews_stats ON reviews;
CREATE TRIGGER trigger_reviews_stats
AFTER INSERT OR UPDATE OR DELETE ON reviews
FOR EACH ROW EXECUTE FUNCTION trigger_update_sitter_stats_on_review();

-- Initialize stats for all existing sitters
DO $$
DECLARE
  sitter record;
BEGIN
  FOR sitter IN
    SELECT id FROM profiles WHERE role = 'sitter'
  LOOP
    PERFORM update_sitter_stats(sitter.id);
  END LOOP;
END;
$$;
