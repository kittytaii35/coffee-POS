-- ============================================================
-- MIGRATION 003: Prevent duplicate check-in at DB level
-- Run in Supabase SQL Editor
-- ============================================================

-- ── STEP 1: ลบ duplicate 'working' rows ที่เกิดจาก bug เดิม ──
-- เก็บไว้แค่ row ที่ check_in เก่าที่สุด (row แรก) ของแต่ละ employee
-- row ที่เหลือ (ซ้ำ) จะถูกลบออก
DELETE FROM attendance
WHERE id IN (
  SELECT id FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY employee_id
        ORDER BY check_in ASC   -- เก็บ row แรกสุดไว้
      ) AS rn
    FROM attendance
    WHERE status = 'working'
  ) ranked
  WHERE rn > 1  -- ลบทุก row ที่ไม่ใช่ row แรก
);

-- ── STEP 2: สร้าง Unique Index ──
-- พนักงาน 1 คนมีได้แค่ 1 record ที่ status = 'working' ในทุกเวลา
-- (พอ check-out → status เปลี่ยนเป็น 'done' → constraint ไม่มีผลกับ row นั้นอีก)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_attendance_one_working_per_employee
  ON attendance (employee_id)
  WHERE status = 'working';


