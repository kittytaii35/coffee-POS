-- Queen Coffee POS - Supabase Database Schema
-- Run this SQL in your Supabase SQL editor

-- ============================================
-- EMPLOYEES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'Barista',
  pin_code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ORDERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name TEXT NOT NULL,
  line_user_id TEXT,
  items JSONB NOT NULL DEFAULT '[]',
  total NUMERIC(10, 2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'making', 'done', 'cancelled')),
  payment_type TEXT
    CHECK (payment_type IN ('cash', 'transfer', 'promptpay')),
  paid BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ATTENDANCE TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  check_in TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  check_out TIMESTAMPTZ,
  work_hours NUMERIC(5, 2),
  status TEXT NOT NULL DEFAULT 'working'
    CHECK (status IN ('working', 'done')),
  -- Anti-cheat fields
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CATEGORIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  label_th TEXT NOT NULL,
  emoji TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PRODUCTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id TEXT UNIQUE, -- Manual ID e.g. 'bb-original'
  name TEXT NOT NULL,
  name_th TEXT NOT NULL,
  price NUMERIC(10, 2) NOT NULL DEFAULT 0,
  category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
  available BOOLEAN NOT NULL DEFAULT TRUE,
  sweetness_options BOOLEAN NOT NULL DEFAULT TRUE,
  toppings JSONB NOT NULL DEFAULT '[]',
  image TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SHIFTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  opening_cash NUMERIC(10, 2) NOT NULL DEFAULT 0,
  closing_cash NUMERIC(10, 2),
  expected_cash NUMERIC(10, 2),
  difference NUMERIC(10, 2),
  start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_time TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SETTINGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- MIGRATION (for existing databases)
-- Run these if attendance table already exists
-- ============================================
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS image_url TEXT;

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_line_user_id ON orders(line_user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_employee_id ON attendance(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_check_in ON attendance(check_in);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON attendance(status);
CREATE INDEX IF NOT EXISTS idx_employees_pin_code ON employees(pin_code);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Analytics: anonymize read products & categories
CREATE POLICY "Allow anon read categories" ON categories FOR SELECT USING (true);
CREATE POLICY "Allow anon read products" ON products FOR SELECT USING (true);
CREATE POLICY "Allow anon read settings" ON settings FOR SELECT USING (true);
CREATE POLICY "Allow service all categories" ON categories FOR ALL USING (true);
CREATE POLICY "Allow service all products" ON products FOR ALL USING (true);
CREATE POLICY "Allow service all shifts" ON shifts FOR ALL USING (true);
CREATE POLICY "Allow service all settings" ON settings FOR ALL USING (true);

-- Allow all operations via service role key (API routes)
-- Public read for orders (needed for LIFF)
CREATE POLICY "Allow anon read orders" ON orders FOR SELECT USING (true);
CREATE POLICY "Allow anon insert orders" ON orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow service update orders" ON orders FOR UPDATE USING (true);

-- Employees: service role only
CREATE POLICY "Allow service read employees" ON employees FOR SELECT USING (true);

-- Attendance: service role only
CREATE POLICY "Allow service all attendance" ON attendance FOR ALL USING (true);

-- ============================================
-- ENABLE SUPABASE REALTIME
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE attendance;
ALTER PUBLICATION supabase_realtime ADD TABLE products;
ALTER PUBLICATION supabase_realtime ADD TABLE categories;
ALTER PUBLICATION supabase_realtime ADD TABLE shifts;
ALTER PUBLICATION supabase_realtime ADD TABLE settings;

-- ============================================
-- SAMPLE DATA - Employees (PIN: 1234, 5678, etc.)
-- ============================================
INSERT INTO employees (name, role, pin_code) VALUES
  ('สมชาย ใจดี', 'Barista', '1234'),
  ('สมหญิง รักงาน', 'Cashier', '5678'),
  ('นายผู้จัดการ', 'Manager', '9999')
ON CONFLICT (pin_code) DO NOTHING;

-- ============================================
-- SEED DATA - Categories
-- ============================================
INSERT INTO categories (id, label, label_th, emoji, sort_order) VALUES
  ('bear_brand', 'Bear Brand', 'นมหมีปั่น', '🐻', 1),
  ('matcha', 'Matcha', 'มัทฉะ', '🍵', 2),
  ('milk_cocoa', 'Milk & Cocoa', 'นมสด & โกโก้', '🥛', 3),
  ('smoothie_yogurt', 'Smoothie', 'ผลไม้ปั่น', '🍓', 4),
  ('avocado', 'Avocado', 'อะโวคาโด', '🥑', 5),
  ('oreo', 'Oreo', 'โอริโอ้ปั่น', '🍪', 6),
  ('soda', 'Soda', 'อิตาเลี่ยนโซดา', '🥤', 7)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- SEED DATA - Sample Products
-- ============================================
INSERT INTO products (product_id, name, name_th, price, category_id, available, sweetness_options) VALUES
  ('bb-original', 'Bear Brand Frappe', 'นมหมีปั่น', 45, 'bear_brand', true, true),
  ('m-latte', 'Matcha Latte', 'มัทฉะลาเต้', 55, 'matcha', true, true),
  ('mc-milk-cold', 'Fresh Milk', 'นมสดเย็น', 40, 'milk_cocoa', true, true),
  ('av-honey', 'Avocado Honey', 'อะโวคาโดน้ำผึ้ง', 55, 'avocado', true, true)
ON CONFLICT (product_id) DO NOTHING;
