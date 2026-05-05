-- ============================================================
-- MIGRATION 001: Members, Modifiers & Point Transactions
-- Queen Coffee POS
-- Run this in your Supabase SQL Editor
-- ============================================================

-- ============================================================
-- 1. MEMBERS TABLE (create if not exists)
-- ============================================================
CREATE TABLE IF NOT EXISTS members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  line_id TEXT,
  points INTEGER NOT NULL DEFAULT 0 CHECK (points >= 0),
  total_spent NUMERIC(12, 2) NOT NULL DEFAULT 0,
  last_visited TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. ADD member_id TO ORDERS TABLE
-- ============================================================
ALTER TABLE orders ADD COLUMN IF NOT EXISTS member_id UUID REFERENCES members(id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS points_earned INTEGER NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS points_redeemed INTEGER NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10, 2) NOT NULL DEFAULT 0;

-- ============================================================
-- 3. ADD MODIFIERS SUPPORT TO ORDER ITEMS (JSONB column on orders)
-- The existing `items` JSONB column already supports arbitrary shape.
-- We document the expected structure via comments. No schema change needed
-- as items already is JSONB — just ensure TypeScript types are updated.
-- ============================================================

-- ============================================================
-- 4. POINT TRANSACTIONS TABLE (audit trail)
-- ============================================================
CREATE TABLE IF NOT EXISTS point_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  delta INTEGER NOT NULL,           -- positive = earned, negative = redeemed/deducted
  type TEXT NOT NULL DEFAULT 'earn' CHECK (type IN ('earn', 'redeem', 'adjust', 'void')),
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_point_tx_member ON point_transactions(member_id);
CREATE INDEX IF NOT EXISTS idx_point_tx_order  ON point_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_orders_member_id ON orders(member_id);

-- ============================================================
-- 5. RLS POLICIES
-- ============================================================
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service all members"            ON members            FOR ALL USING (true);
CREATE POLICY "Allow service all point_transactions" ON point_transactions FOR ALL USING (true);

-- ============================================================
-- 6. REALTIME
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE members;
ALTER PUBLICATION supabase_realtime ADD TABLE point_transactions;

-- ============================================================
-- 7. DB TRIGGER: Auto-earn points on order completed
--    Runs AFTER UPDATE on orders when status changes → 'completed'
-- ============================================================
CREATE OR REPLACE FUNCTION fn_award_points_on_complete()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_points_earned INTEGER;
BEGIN
  -- Only fire when status transitions TO 'completed' and a member is linked
  IF NEW.status = 'completed'
     AND OLD.status <> 'completed'
     AND NEW.member_id IS NOT NULL
     AND NEW.points_earned = 0   -- idempotency guard
  THEN
    -- 50 THB = 1 point (floor division)
    v_points_earned := FLOOR(NEW.total / 50);

    IF v_points_earned > 0 THEN
      -- Update order record
      UPDATE orders
        SET points_earned = v_points_earned
        WHERE id = NEW.id;

      -- Credit member
      UPDATE members
        SET points       = points + v_points_earned,
            total_spent  = total_spent + NEW.total,
            last_visited = NOW()
        WHERE id = NEW.member_id;

      -- Audit trail
      INSERT INTO point_transactions (member_id, order_id, delta, type, note)
        VALUES (NEW.member_id, NEW.id, v_points_earned, 'earn',
                'Auto-earned from order ' || COALESCE(NEW.order_id, NEW.id::text));
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_award_points ON orders;
CREATE TRIGGER trg_award_points
  AFTER UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION fn_award_points_on_complete();

-- ============================================================
-- 8. DB TRIGGER: Rollback points + inventory on cancellation
--    Runs AFTER UPDATE on orders when status changes → 'cancelled'
-- ============================================================
CREATE OR REPLACE FUNCTION fn_rollback_on_cancel()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- Only fire when status transitions TO 'cancelled'
  IF NEW.status = 'cancelled'
     AND OLD.status <> 'cancelled'
  THEN
    -- 8a. Reverse member points if any were earned for this order
    IF NEW.member_id IS NOT NULL AND NEW.points_earned > 0 THEN
      -- Deduct points (floor at 0)
      UPDATE members
        SET points      = GREATEST(0, points - NEW.points_earned),
            total_spent = GREATEST(0, total_spent - NEW.total)
        WHERE id = NEW.member_id;

      -- Audit trail
      INSERT INTO point_transactions (member_id, order_id, delta, type, note)
        VALUES (NEW.member_id, NEW.id, -NEW.points_earned, 'void',
                'Voided – order cancelled: ' || COALESCE(NEW.order_id, NEW.id::text));

      -- Zero out points_earned on order record
      UPDATE orders SET points_earned = 0 WHERE id = NEW.id;
    END IF;

    -- 8b. Inventory rollback placeholder
    -- If you have an `inventory_movements` or `stock` table, add rollback SQL here.
    -- Example (uncomment and adapt to your schema):
    --
    -- INSERT INTO inventory_movements (product_id, qty_change, reason, order_id)
    -- SELECT
    --   (item->>'product_id')::UUID,
    --   (item->>'quantity')::INTEGER,   -- positive = restore
    --   'order_cancelled',
    --   NEW.id
    -- FROM jsonb_array_elements(NEW.items) AS item
    -- WHERE item->>'product_id' IS NOT NULL;

  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_rollback_cancel ON orders;
CREATE TRIGGER trg_rollback_cancel
  AFTER UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION fn_rollback_on_cancel();
