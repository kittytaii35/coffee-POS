-- ============================================================
-- MIGRATION 005: Advanced Features Schema
-- Queen Coffee Management System — Phase 2 Upgrade
-- Run in Supabase SQL Editor
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- EPIC 1: INVENTORY & STOCK MANAGEMENT (BOM)
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ingredients (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                 VARCHAR(100) NOT NULL,
  name_th              VARCHAR(100),
  unit                 VARCHAR(20)  NOT NULL,              -- 'g', 'ml', 'piece'
  stock_qty            DECIMAL(10,3) NOT NULL DEFAULT 0,
  low_stock_threshold  DECIMAL(10,3) NOT NULL DEFAULT 0,
  cost_per_unit        DECIMAL(10,4) NOT NULL DEFAULT 0,  -- THB per unit
  category             VARCHAR(50),                        -- 'beans','milk','syrup','cup','topping'
  supplier             VARCHAR(100),
  image_url            TEXT,
  active               BOOLEAN DEFAULT TRUE,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

-- Bill of Materials: links each menu item → its required ingredients
CREATE TABLE IF NOT EXISTS recipe_items (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id   UUID NOT NULL,              -- อ้างถึง menu_items.id (ไม่ใช้ FK เพราะ table ยังไม่ได้สร้าง)
  ingredient_id  UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  qty_per_serve  DECIMAL(10,3) NOT NULL,  -- qty needed per 1 serving
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (menu_item_id, ingredient_id)
);

-- Full audit log of every stock change
CREATE TABLE IF NOT EXISTS stock_movements (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_id  UUID NOT NULL REFERENCES ingredients(id),
  movement_type  VARCHAR(20) NOT NULL
                   CHECK (movement_type IN ('in','out','adjust','waste')),
  qty_change     DECIMAL(10,3) NOT NULL,  -- + = stock in, - = stock out
  qty_before     DECIMAL(10,3) NOT NULL,
  qty_after      DECIMAL(10,3) NOT NULL,
  reason         VARCHAR(200),            -- 'order_deduct', 'stock_in', 'waste', 'manual'
  order_id       UUID REFERENCES orders(id),
  employee_id    UUID REFERENCES employees(id),
  cost_per_unit  DECIMAL(10,4),
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger: auto-update ingredients.updated_at
CREATE OR REPLACE FUNCTION fn_update_ingredient_timestamp()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;
DROP TRIGGER IF EXISTS trg_ingredient_updated ON ingredients;
CREATE TRIGGER trg_ingredient_updated
  BEFORE UPDATE ON ingredients
  FOR EACH ROW EXECUTE FUNCTION fn_update_ingredient_timestamp();


-- ────────────────────────────────────────────────────────────
-- EPIC 2: ADVANCED CRM & LOYALTY TIERS
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS member_tiers (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                VARCHAR(50) NOT NULL UNIQUE,   -- 'Bronze', 'Silver', 'Gold', 'Platinum'
  name_th             VARCHAR(50),
  min_points          INTEGER NOT NULL DEFAULT 0,    -- minimum cumulative points to reach tier
  point_multiplier    DECIMAL(4,2) NOT NULL DEFAULT 1.0,  -- 1.5 = earn 1.5x points
  discount_pct        DECIMAL(5,2) NOT NULL DEFAULT 0,    -- auto-applied % discount
  free_drink_every    INTEGER,                            -- e.g. every 10 orders = 1 free
  badge_color         VARCHAR(20) DEFAULT '#CD7F32',
  badge_icon          VARCHAR(10) DEFAULT '🥉',
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default tiers
INSERT INTO member_tiers (name, name_th, min_points, point_multiplier, discount_pct, badge_color, badge_icon)
VALUES
  ('Bronze',   'บรอนซ์',   0,    1.00, 0,   '#CD7F32', '🥉'),
  ('Silver',   'ซิลเวอร์', 200,  1.25, 3,   '#C0C0C0', '🥈'),
  ('Gold',     'โกลด์',    500,  1.50, 5,   '#FFD700', '🥇'),
  ('Platinum', 'แพลทินัม', 1000, 2.00, 10,  '#E5E4E2', '💎')
ON CONFLICT (name) DO NOTHING;

-- Upgrade members table for tiers + analytics
ALTER TABLE members
  ADD COLUMN IF NOT EXISTS tier_id            UUID REFERENCES member_tiers(id),
  ADD COLUMN IF NOT EXISTS lifetime_points    INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS visit_count        INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS favorite_menu_id   UUID,  -- อ้างถึง menu_items.id (ไม่ใช้ FK เพราะ table ยังไม่ได้สร้าง)
  ADD COLUMN IF NOT EXISTS notes              TEXT,
  ADD COLUMN IF NOT EXISTS birthday           DATE;

-- Trigger: auto-update member tier based on lifetime_points
CREATE OR REPLACE FUNCTION fn_auto_update_member_tier()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE v_tier_id UUID;
BEGIN
  SELECT id INTO v_tier_id
  FROM member_tiers
  WHERE min_points <= NEW.lifetime_points
  ORDER BY min_points DESC
  LIMIT 1;
  NEW.tier_id = v_tier_id;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_member_tier ON members;
CREATE TRIGGER trg_member_tier
  BEFORE INSERT OR UPDATE OF lifetime_points ON members
  FOR EACH ROW EXECUTE FUNCTION fn_auto_update_member_tier();


-- ────────────────────────────────────────────────────────────
-- EPIC 3: PROMOTION & DISCOUNT ENGINE
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS promotions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                VARCHAR(100) NOT NULL,
  name_th             VARCHAR(100),
  type                VARCHAR(30) NOT NULL
                        CHECK (type IN ('percentage','fixed','bogo','happy_hour','tier_discount')),
  -- For percentage: value = discount % (e.g. 15 = 15% off)
  -- For fixed: value = THB amount off
  -- For bogo: value = 0 (buy bogo_buy_qty get bogo_get_qty free)
  value               DECIMAL(10,2) DEFAULT 0,
  min_order_amount    DECIMAL(10,2) DEFAULT 0,       -- min cart total to apply
  max_discount_amount DECIMAL(10,2),                 -- cap on discount
  applies_to          VARCHAR(20) DEFAULT 'all'
                        CHECK (applies_to IN ('all','specific_items','category')),
  target_category     VARCHAR(50),                   -- if applies_to = 'category'
  happy_hour_start    TIME,
  happy_hour_end      TIME,
  happy_hour_days     INTEGER[] DEFAULT '{0,1,2,3,4,5,6}',  -- 0=Sun
  bogo_buy_qty        INTEGER DEFAULT 1,
  bogo_get_qty        INTEGER DEFAULT 1,
  start_date          DATE,
  end_date            DATE,
  usage_limit         INTEGER,                        -- NULL = unlimited
  usage_count         INTEGER NOT NULL DEFAULT 0,
  per_member_limit    INTEGER DEFAULT 1,
  requires_tier_id    UUID REFERENCES member_tiers(id),  -- NULL = all members
  active              BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Which specific menu items a promotion applies to
CREATE TABLE IF NOT EXISTS promotion_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_id  UUID NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
  menu_item_id  UUID NOT NULL,              -- อ้างถึง menu_items.id (ไม่ใช้ FK เพราะ table ยังไม่ได้สร้าง)
  UNIQUE (promotion_id, menu_item_id)
);

-- Audit: which promotions were applied to which orders
CREATE TABLE IF NOT EXISTS order_promotions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  promotion_id    UUID NOT NULL REFERENCES promotions(id),
  discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  applied_at      TIMESTAMPTZ DEFAULT NOW()
);


-- ────────────────────────────────────────────────────────────
-- EPIC 4: KITCHEN DISPLAY SYSTEM (KDS)
-- ────────────────────────────────────────────────────────────

-- Add KDS status column to orders
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS kds_status VARCHAR(20) DEFAULT 'queued'
    CHECK (kds_status IN ('queued','preparing','ready','served')),
  ADD COLUMN IF NOT EXISTS kds_started_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS kds_ready_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS priority        INTEGER NOT NULL DEFAULT 0;  -- higher = more urgent

-- Optional: KDS stations (for multi-bar setup)
CREATE TABLE IF NOT EXISTS kds_stations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(50) NOT NULL,    -- 'Main Bar', 'Cold Station'
  categories  VARCHAR(50)[],           -- which menu categories appear here
  active      BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger: set kds_started_at when status → preparing
CREATE OR REPLACE FUNCTION fn_kds_timestamps()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.kds_status = 'preparing' AND OLD.kds_status <> 'preparing' THEN
    NEW.kds_started_at = NOW();
  END IF;
  IF NEW.kds_status = 'ready' AND OLD.kds_status <> 'ready' THEN
    NEW.kds_ready_at = NOW();
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_kds_timestamps ON orders;
CREATE TRIGGER trg_kds_timestamps
  BEFORE UPDATE OF kds_status ON orders
  FOR EACH ROW EXECUTE FUNCTION fn_kds_timestamps();


-- ────────────────────────────────────────────────────────────
-- EPIC 5: EXPENSE TRACKING & NET PROFIT DASHBOARD
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS expense_categories (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       VARCHAR(50) NOT NULL UNIQUE,
  name_th    VARCHAR(50),
  icon       VARCHAR(10) DEFAULT '💰',
  color      VARCHAR(20) DEFAULT '#6b7280',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default categories
INSERT INTO expense_categories (name, name_th, icon, color) VALUES
  ('Rent',        'ค่าเช่า',        '🏠', '#ef4444'),
  ('Utilities',   'ค่าน้ำ/ไฟ',     '⚡', '#f59e0b'),
  ('Payroll',     'เงินเดือน',      '👥', '#3b82f6'),
  ('Materials',   'วัตถุดิบ',       '🛒', '#22c55e'),
  ('Marketing',   'การตลาด',        '📣', '#8b5cf6'),
  ('Maintenance', 'ซ่อมบำรุง',      '🔧', '#06b6d4'),
  ('Other',       'อื่นๆ',          '📋', '#9ca3af')
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS expenses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id     UUID REFERENCES expense_categories(id),
  amount          DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  description     TEXT,
  expense_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method  VARCHAR(30) DEFAULT 'cash'
                    CHECK (payment_method IN ('cash','transfer','credit_card')),
  receipt_url     TEXT,
  employee_id     UUID REFERENCES employees(id),
  is_recurring    BOOLEAN DEFAULT FALSE,
  recur_period    VARCHAR(20) CHECK (recur_period IN ('daily','weekly','monthly','yearly')),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Convenience view: daily revenue vs expense for dashboard
CREATE OR REPLACE VIEW v_daily_profit AS
SELECT
  d::DATE AS report_date,
  COALESCE(rev.revenue, 0)   AS revenue,
  COALESCE(exp.expenses, 0)  AS expenses,
  COALESCE(rev.revenue, 0) - COALESCE(exp.expenses, 0) AS net_profit,
  COALESCE(rev.order_count, 0) AS order_count
FROM generate_series(
  CURRENT_DATE - INTERVAL '30 days',
  CURRENT_DATE,
  '1 day'
) AS d
LEFT JOIN (
  SELECT
    DATE(created_at) AS day,
    SUM(total) AS revenue,
    COUNT(*) AS order_count
  FROM orders
  WHERE status = 'completed'
  GROUP BY DATE(created_at)
) rev ON rev.day = d::DATE
LEFT JOIN (
  SELECT
    expense_date AS day,
    SUM(amount) AS expenses
  FROM expenses
  GROUP BY expense_date
) exp ON exp.day = d::DATE;


-- ────────────────────────────────────────────────────────────
-- RLS POLICIES (enable row-level security)
-- ────────────────────────────────────────────────────────────
ALTER TABLE ingredients      ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_items     ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements  ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_tiers     ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotion_items  ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE kds_stations     ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses         ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (used by Next.js server)
CREATE POLICY "service_role_all" ON ingredients      FOR ALL USING (true);
CREATE POLICY "service_role_all" ON recipe_items     FOR ALL USING (true);
CREATE POLICY "service_role_all" ON stock_movements  FOR ALL USING (true);
CREATE POLICY "service_role_all" ON member_tiers     FOR ALL USING (true);
CREATE POLICY "service_role_all" ON promotions       FOR ALL USING (true);
CREATE POLICY "service_role_all" ON promotion_items  FOR ALL USING (true);
CREATE POLICY "service_role_all" ON order_promotions FOR ALL USING (true);
CREATE POLICY "service_role_all" ON kds_stations     FOR ALL USING (true);
CREATE POLICY "service_role_all" ON expense_categories FOR ALL USING (true);
CREATE POLICY "service_role_all" ON expenses         FOR ALL USING (true);
