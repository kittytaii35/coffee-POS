'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Users, Plus, Pencil, Trash2, Save, X,
  ArrowLeft, ShieldCheck, RefreshCw, Coffee,
  Eye, EyeOff, UserPlus, Search, ChevronRight, Globe
} from 'lucide-react'
import { useLanguage } from '@/context/LanguageContext'
import { translations } from '@/lib/translations'

// ── Types ──────────────────────────────────────────────────────
interface Employee {
  id: string
  name: string
  role: string
  pin_code: string
  created_at: string
}

type FormMode = 'add' | 'edit' | null

const ROLES = ['Barista', 'Manager', 'Cashier', 'Supervisor', 'Part-time']

const ROLE_COLORS: Record<string, { bg: string; color: string }> = {
  Manager:    { bg: '#fef3c7', color: '#92400e' },
  Supervisor: { bg: '#ede9fe', color: '#6d28d9' },
  Barista:    { bg: '#dbeafe', color: '#1e40af' },
  Cashier:    { bg: '#d1fae5', color: '#065f46' },
  'Part-time':{ bg: '#f3f4f6', color: '#374151' },
}

// ── Main Component ─────────────────────────────────────────────
export default function EmployeesPage() {
  const { lang, toggleLang } = useLanguage()
  const c = translations[lang].common

  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [formMode, setFormMode] = useState<FormMode>(null)
  const [editTarget, setEditTarget] = useState<Employee | null>(null)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  const [search, setSearch] = useState('')
  const [showPin, setShowPin] = useState(false)

  // Form state
  const [form, setForm] = useState({ name: '', role: 'Barista', pin_code: '' })
  const [formErr, setFormErr] = useState('')

  // ── helpers ───────────────────────────────────────────────
  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 3500)
  }

  const fetchEmployees = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/employees')
      const data = await res.json()
      if (data.employees) setEmployees(data.employees)
    } catch {
      showToast('error', 'ไม่สามารถโหลดข้อมูลพนักงานได้')
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchEmployees() }, [fetchEmployees])

  // ── Form helpers ─────────────────────────────────────────
  const openAdd = () => {
    setForm({ name: '', role: 'Barista', pin_code: '' })
    setFormErr('')
    setEditTarget(null)
    setFormMode('add')
    setShowPin(false)
  }

  const openEdit = (emp: Employee) => {
    setForm({ name: emp.name, role: emp.role, pin_code: emp.pin_code })
    setFormErr('')
    setEditTarget(emp)
    setFormMode('edit')
    setShowPin(false)
  }

  const closeForm = () => {
    setFormMode(null)
    setEditTarget(null)
    setFormErr('')
  }

  const validateForm = () => {
    if (!form.name.trim()) return 'กรุณาระบุชื่อพนักงาน'
    if (!form.pin_code) return 'กรุณาระบุ PIN'
    if (!/^\d{4}$/.test(form.pin_code)) return 'PIN ต้องเป็นตัวเลข 4 หลักเท่านั้น'
    return ''
  }

  // ── Submit ───────────────────────────────────────────────
  const handleSubmit = async () => {
    const err = validateForm()
    if (err) { setFormErr(err); return }

    setSaving(true)
    setFormErr('')
    try {
      const isEdit = formMode === 'edit' && editTarget
      const res = await fetch('/api/employees', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isEdit ? { id: editTarget!.id, ...form } : form),
      })
      const data = await res.json()
      if (!res.ok) { setFormErr(data.error || 'เกิดข้อผิดพลาด'); return }
      showToast('success', isEdit ? `✅ แก้ไขข้อมูล ${form.name} แล้ว` : `✅ เพิ่มพนักงาน ${form.name} แล้ว`)
      closeForm()
      fetchEmployees()
    } catch {
      setFormErr('เกิดข้อผิดพลาดในการบันทึก')
    } finally {
      setSaving(false)
    }
  }

  // ── Delete ───────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      const res = await fetch(`/api/employees?id=${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) { showToast('error', data.error || 'ลบไม่สำเร็จ'); return }
      showToast('success', '🗑️ ลบพนักงานเรียบร้อยแล้ว')
      fetchEmployees()
    } catch {
      showToast('error', 'เกิดข้อผิดพลาดในการลบ')
    } finally {
      setDeletingId(null)
      setConfirmDeleteId(null)
    }
  }

  // ── Filtered list ────────────────────────────────────────
  const filtered = search.trim()
    ? employees.filter(e =>
        e.name.toLowerCase().includes(search.toLowerCase()) ||
        e.role.toLowerCase().includes(search.toLowerCase())
      )
    : employees

  // ── Render ───────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface)' }}>

      {/* ── Header ── */}
      <div style={{
        background: 'linear-gradient(135deg, var(--coffee-dark) 0%, var(--coffee-brown) 100%)',
        padding: '24px 20px',
        position: 'sticky', top: 0, zIndex: 50,
        boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
      }}>
        <div className="header-content" style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
            <Link href="/">
              <button style={{
                width: '40px', height: '40px', borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.1)',
                color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', flexShrink: 0,
              }} title={lang === 'th' ? 'หน้าหลัก' : 'Home'}>
                <ArrowLeft size={20} />
              </button>
            </Link>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '44px', height: '44px', borderRadius: '14px',
                background: 'linear-gradient(135deg, var(--gold), var(--gold-light))',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <Users size={22} color="var(--coffee-dark)" />
              </div>
              <div>
                <h1 className="thai-fix" style={{ color: 'white', fontSize: '20px', fontWeight: '800' }}>
                  {lang === 'th' ? 'จัดการพนักงาน' : 'Employee Management'}
                </h1>
                <p style={{ color: 'rgba(245,230,211,0.6)', fontSize: '13px' }}>
                  {lang === 'th' ? `${employees.length} คน` : `${employees.length} staff members`}
                </p>
              </div>
            </div>
          </div>

          <div className="header-actions" style={{ display: 'flex', gap: '8px' }}>
            <button 
              onClick={toggleLang} 
              className="thai-fix"
              style={{
                background: 'rgba(255,255,255,0.15)', color: 'white',
                border: '1px solid rgba(255,255,255,0.25)', padding: '8px 16px',
                borderRadius: '12px', fontSize: '13px', fontWeight: '700', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '8px'
              }}
            >
              <Globe size={16} /> <span>{c.langToggle}</span>
            </button>
            <button onClick={openAdd} style={{
              background: 'var(--gold)', color: 'var(--coffee-dark)',
              border: 'none', padding: '8px 16px', borderRadius: '12px',
              fontSize: '14px', fontWeight: '800', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '6px',
            }}>
              <UserPlus size={16} />
              {lang === 'th' ? 'เพิ่มพนักงาน' : 'Add Staff'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Toast ── */}
      {toast && (
        <div style={{
          position: 'fixed', top: '80px', left: '50%', transform: 'translateX(-50%)',
          zIndex: 999, background: toast.type === 'success' ? '#f0fdf4' : '#fef2f2',
          border: `1px solid ${toast.type === 'success' ? '#86efac' : '#fca5a5'}`,
          color: toast.type === 'success' ? '#16a34a' : '#dc2626',
          padding: '12px 24px', borderRadius: '14px', fontWeight: '700',
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)', fontSize: '14px',
          animation: 'slideDown 0.3s ease',
        }}>
          {toast.msg}
        </div>
      )}

      {/* ── Content ── */}
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '28px 20px' }}>

        {/* Search bar */}
        <div style={{
          position: 'relative', marginBottom: '24px',
        }}>
          <Search size={18} style={{
            position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)',
            color: 'var(--coffee-light)',
          }} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={lang === 'th' ? 'ค้นหาชื่อหรือตำแหน่ง...' : 'Search by name or role...'}
            style={{
              width: '100%', padding: '12px 16px 12px 44px', borderRadius: '14px',
              border: '1px solid #e8d5c4', fontSize: '14px', outline: 'none',
              background: 'white', boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Employee list */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px', color: 'var(--coffee-light)' }}>
            <RefreshCw size={40} style={{ margin: '0 auto 12px', animation: 'spin 1s linear infinite', display: 'block' }} />
            <p style={{ fontSize: '16px' }}>{lang === 'th' ? 'กำลังโหลด...' : 'Loading...'}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px', color: 'var(--coffee-light)' }}>
            <Users size={52} style={{ margin: '0 auto 16px', opacity: 0.3, display: 'block' }} />
            <p style={{ fontSize: '18px', fontWeight: '700' }}>
              {search ? (lang === 'th' ? 'ไม่พบพนักงาน' : 'No matching staff') : (lang === 'th' ? 'ยังไม่มีพนักงาน' : 'No staff yet')}
            </p>
            {!search && (
              <button onClick={openAdd} style={{
                marginTop: '20px', padding: '12px 28px', background: 'var(--gold)',
                color: 'var(--coffee-dark)', border: 'none', borderRadius: '12px',
                fontWeight: '800', fontSize: '15px', cursor: 'pointer',
              }}>
                + {lang === 'th' ? 'เพิ่มพนักงานคนแรก' : 'Add First Employee'}
              </button>
            )}
          </div>
        ) : (
        <div className="card-grid" style={{ 
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
          gap: '20px' 
        }}>
          {filtered.map(emp => {
            const rc = ROLE_COLORS[emp.role] || ROLE_COLORS['Part-time']
            return (
              <div key={emp.id} className="card" style={{
                borderRadius: '18px',
                border: '1px solid #f0e8df',
                overflow: 'hidden',
                transition: 'box-shadow 0.2s',
                padding: '18px 20px',
                display: 'flex', alignItems: 'center', gap: '16px',
              }}>
                {/* Avatar */}
                <div style={{
                  width: '52px', height: '52px', borderRadius: '16px', flexShrink: 0,
                  background: 'linear-gradient(135deg, var(--coffee-medium), var(--gold))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'white', fontSize: '20px', fontWeight: '900',
                }}>
                  {emp.name.charAt(0).toUpperCase()}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p className="thai-fix" style={{ fontWeight: '800', fontSize: '16px', color: 'var(--coffee-dark)', marginBottom: '4px' }}>
                    {emp.name}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{
                      background: rc.bg, color: rc.color,
                      padding: '3px 10px', borderRadius: '20px',
                      fontSize: '12px', fontWeight: '700',
                    }}>
                      {emp.role}
                    </span>
                    <span style={{
                      background: '#f0f9ff', color: '#0369a1',
                      padding: '3px 10px', borderRadius: '20px',
                      fontSize: '12px', fontWeight: '600',
                      display: 'flex', alignItems: 'center', gap: '4px',
                    }}>
                      <ShieldCheck size={11} />
                      PIN: {emp.pin_code}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                  <button
                    onClick={() => openEdit(emp)}
                    title={lang === 'th' ? 'แก้ไข' : 'Edit'}
                    style={{
                      width: '38px', height: '38px', borderRadius: '10px',
                      border: '1.5px solid #e8d5c4', background: 'white',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'var(--coffee-medium)',
                    }}>
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId(emp.id)}
                    title={lang === 'th' ? 'ลบ' : 'Delete'}
                    disabled={deletingId === emp.id}
                    style={{
                      width: '38px', height: '38px', borderRadius: '10px',
                      border: '1.5px solid #fca5a5', background: '#fff5f5',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#dc2626', opacity: deletingId === emp.id ? 0.5 : 1,
                    }}>
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
        )}
      </div>

      {/* ══════ ADD / EDIT MODAL ══════ */}
      {formMode && (
        <div
          onClick={closeForm}
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="animate-slide-up modal-full-mobile"
            style={{
              background: 'white', borderRadius: '24px', padding: '32px',
              width: '100%', maxWidth: '440px',
              boxShadow: '0 24px 80px rgba(0,0,0,0.25)',
              overflowY: 'auto'
            }}
          >
            {/* Modal header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '44px', height: '44px', borderRadius: '14px',
                  background: formMode === 'add' ? 'linear-gradient(135deg, var(--gold), var(--gold-light))' : '#dbeafe',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {formMode === 'add' ? <UserPlus size={20} color="var(--coffee-dark)" /> : <Pencil size={20} color="#1e40af" />}
                </div>
                <h2 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--coffee-dark)' }}>
                  {formMode === 'add'
                    ? (lang === 'th' ? 'เพิ่มพนักงานใหม่' : 'Add New Staff')
                    : (lang === 'th' ? 'แก้ไขข้อมูลพนักงาน' : 'Edit Staff')}
                </h2>
              </div>
              <button onClick={closeForm} style={{
                width: '36px', height: '36px', borderRadius: '50%',
                border: '1.5px solid #e8d5c4', background: '#fdf6f0',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--coffee-medium)',
              }}>
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* Name */}
              <div>
                <label style={{ display: 'block', fontWeight: '700', fontSize: '14px', marginBottom: '8px', color: 'var(--coffee-dark)' }}>
                  {lang === 'th' ? 'ชื่อ-นามสกุล' : 'Full Name'} <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder={lang === 'th' ? 'เช่น สมชาย ใจดี' : 'e.g. John Smith'}
                  className="input-field"
                />
              </div>

              {/* Role */}
              <div>
                <label style={{ display: 'block', fontWeight: '700', fontSize: '14px', marginBottom: '8px', color: 'var(--coffee-dark)' }}>
                  {lang === 'th' ? 'ตำแหน่ง' : 'Role'} <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {ROLES.map(r => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, role: r }))}
                      style={{
                        padding: '8px 16px', borderRadius: '20px', fontWeight: '700', fontSize: '13px',
                        cursor: 'pointer', border: '2px solid',
                        borderColor: form.role === r ? 'var(--coffee-medium)' : '#e8d5c4',
                        background: form.role === r ? '#fdf6f0' : 'white',
                        color: form.role === r ? 'var(--coffee-medium)' : 'var(--coffee-light)',
                        transition: 'all 0.15s',
                      }}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* PIN */}
              <div>
                <label style={{ display: 'block', fontWeight: '700', fontSize: '14px', marginBottom: '8px', color: 'var(--coffee-dark)' }}>
                  {lang === 'th' ? 'รหัส PIN (4 หลัก)' : 'PIN Code (4 digits)'} <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPin ? 'text' : 'password'}
                    inputMode="numeric"
                    maxLength={4}
                    value={form.pin_code}
                    onChange={e => setForm(f => ({ ...f, pin_code: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                    placeholder="••••"
                    className="input-field"
                    style={{ letterSpacing: '8px', fontSize: '20px', textAlign: 'center' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(v => !v)}
                    style={{
                      position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer', color: 'var(--coffee-light)',
                    }}
                  >
                    {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--coffee-light)', marginTop: '6px' }}>
                  {lang === 'th'
                    ? 'PIN ใช้สำหรับล็อกอินหน้าลงเวลา ต้องไม่ซ้ำกับพนักงานคนอื่น'
                    : 'Used for attendance clock-in. Must be unique across all employees.'}
                </p>
              </div>

              {/* Error */}
              {formErr && (
                <div style={{
                  background: '#fef2f2', border: '1px solid #fca5a5',
                  color: '#dc2626', padding: '12px 16px', borderRadius: '12px',
                  fontSize: '14px', fontWeight: '600',
                }}>
                  {formErr}
                </div>
              )}

              {/* Buttons */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                <button
                  onClick={closeForm}
                  style={{
                    flex: 1, padding: '14px', borderRadius: '14px',
                    border: '2px solid #e8d5c4', background: 'white',
                    cursor: 'pointer', fontWeight: '700', color: 'var(--coffee-light)',
                    fontSize: '15px',
                  }}
                >
                  {lang === 'th' ? 'ยกเลิก' : 'Cancel'}
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={saving}
                  style={{
                    flex: 2, padding: '14px', borderRadius: '14px',
                    background: 'linear-gradient(135deg, var(--coffee-dark), var(--coffee-brown))',
                    border: 'none', color: 'white', fontWeight: '800', fontSize: '15px',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    opacity: saving ? 0.7 : 1,
                  }}
                >
                  {saving
                    ? <><RefreshCw size={16} className="spin" /> {lang === 'th' ? 'กำลังบันทึก...' : 'Saving...'}</>
                    : <><Save size={16} /> {formMode === 'add' ? (lang === 'th' ? 'เพิ่มพนักงาน' : 'Add Employee') : (lang === 'th' ? 'บันทึกการเปลี่ยนแปลง' : 'Save Changes')}</>
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════ CONFIRM DELETE MODAL ══════ */}
      {confirmDeleteId && (
        <div
          onClick={() => setConfirmDeleteId(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 300,
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'white', borderRadius: '24px', padding: '32px',
              maxWidth: '380px', width: '100%', textAlign: 'center',
              boxShadow: '0 24px 80px rgba(0,0,0,0.25)',
            }}
          >
            <div style={{
              width: '64px', height: '64px', borderRadius: '50%',
              background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <Trash2 size={28} color="#dc2626" />
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--coffee-dark)', marginBottom: '8px' }}>
              {lang === 'th' ? 'ยืนยันการลบ?' : 'Confirm Delete?'}
            </h3>
            <p style={{ color: 'var(--coffee-light)', fontSize: '14px', marginBottom: '24px' }}>
              {lang === 'th'
                ? 'การดำเนินการนี้ไม่สามารถย้อนกลับได้ ข้อมูลประวัติการลงเวลาจะยังคงอยู่'
                : 'This action cannot be undone. Attendance history will be preserved.'}
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setConfirmDeleteId(null)}
                style={{
                  flex: 1, padding: '13px', borderRadius: '14px',
                  border: '1.5px solid #e8d5c4', background: 'white',
                  fontWeight: '700', cursor: 'pointer', color: 'var(--coffee-dark)',
                }}
              >
                {lang === 'th' ? 'ยกเลิก' : 'Cancel'}
              </button>
              <button
                onClick={() => handleDelete(confirmDeleteId)}
                disabled={!!deletingId}
                style={{
                  flex: 1, padding: '13px', borderRadius: '14px',
                  background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                  border: 'none', color: 'white', fontWeight: '800', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  opacity: deletingId ? 0.7 : 1,
                }}
              >
                {deletingId ? <RefreshCw size={15} className="spin" /> : <Trash2 size={15} />}
                {lang === 'th' ? 'ลบเลย' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateX(-50%) translateY(-8px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
