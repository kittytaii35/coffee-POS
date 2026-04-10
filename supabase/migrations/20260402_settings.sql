-- Global Settings Table
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Initial Deployment Settings
INSERT INTO settings (key, value) VALUES
('pos', '{
  "vat_rate": 7,
  "service_charge": 0,
  "enable_qr": true,
  "currency": "฿",
  "shop_id": "queen-coffee-01"
}'::jsonb),
('attendance', '{
  "shop_lat": 13.7563,
  "shop_lng": 100.5018,
  "allowed_radius_meters": 100,
  "require_photo": true,
  "auto_checkout_hour": 22
}'::jsonb),
('notifications', '{
  "line_enabled": true,
  "line_token": "",
  "notify_on_order": true,
  "notify_on_attendance": true
}'::jsonb),
('receipt', '{
  "header": "Queen Coffee",
  "footer": "Thank you for your visit!",
  "show_qr": true,
  "promptpay_id": "0812345678"
}'::jsonb)
ON CONFLICT (key) DO NOTHING;
