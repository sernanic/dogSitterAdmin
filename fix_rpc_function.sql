-- Updated RPC function

-- Updated get_sitter_availability_for_date function
CREATE OR REPLACE FUNCTION get_sitter_availability_for_date(
    p_sitter_id UUID,
    p_date DATE
) RETURNS TABLE (
    id UUID,
    weekday INT,
    start_time TIME,
    end_time TIME
) AS $$
DECLARE
    v_weekday INT := EXTRACT(DOW FROM p_date + 1)::INT; -- Adjusts Sunday from 0 to 7
BEGIN
    -- Check if the sitter is unavailable on this date
    IF EXISTS (SELECT 1 FROM sitter_unavailability WHERE sitter_id = p_sitter_id AND unavailable_date = p_date) THEN
        RETURN; -- No availability if explicitly unavailable
    END IF;

    -- Return weekly availability for the corresponding weekday
    RETURN QUERY
    SELECT wa.id, wa.weekday, wa.start_time, wa.end_time
    FROM sitter_weekly_availability wa
    WHERE wa.sitter_id = p_sitter_id
    AND wa.weekday = v_weekday
    ORDER BY wa.start_time;
END;
$$ LANGUAGE plpgsql;
