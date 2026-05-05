-- ============================================================
-- Helper RPC: adjust_member_points (atomic increment/decrement)
-- Called from Server Actions to safely update points
-- ============================================================
CREATE OR REPLACE FUNCTION adjust_member_points(
  p_member_id UUID,
  p_delta      INTEGER
)
RETURNS INTEGER   -- returns new points total
LANGUAGE plpgsql AS $$
DECLARE
  v_new_points INTEGER;
BEGIN
  UPDATE members
    SET points = GREATEST(0, points + p_delta)
    WHERE id = p_member_id
    RETURNING points INTO v_new_points;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Member % not found', p_member_id;
  END IF;

  RETURN v_new_points;
END;
$$;
