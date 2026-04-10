'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Clock, CheckCircle, LogOut, LogIn, Loader2, User,
  MapPin, Camera, ShieldCheck, X, History, BarChart2,
  AlertTriangle, ChevronRight, Calendar,
} from 'lucide-react'
import { useSettings } from '@/context/SettingsContext'

// ─── Types ────────────────────────────────────────────────────
interface Employee { id: string; name: string; role: string }
interface AttendanceRecord {
  id: string; check_in: string; check_out?: string
  work_hours?: number; status: 'working' | 'done'
  latitude?: number; longitude?: number; image_url?: string
}
interface Summary { today: number; weekly: number; monthly: number }

type Screen = 'pin' | 'main'
type Tab = 'status' | 'history' | 'summary'
type AntiCheatStep = 'idle' | 'gps' | 'camera' | 'ready'

// ─── Helpers ──────────────────────────────────────────────────
function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function formatHours(h: number) {
  const hrs = Math.floor(h)
  const mins = Math.round((h - hrs) * 60)
  return mins > 0 ? `${hrs} ชม. ${mins} น.` : `${hrs} ชม.`
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false })
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ─── Component ────────────────────────────────────────────────
export default function AttendancePage() {
  const { settings, loading: settingsLoading } = useSettings()
  const shopLat = settings.attendance.shop_lat
  const shopLng = settings.attendance.shop_lng
  const shopName = settings.receipt.header
  const allowedRadius = settings.attendance.allowed_radius_meters

  const [screen, setScreen]       = useState<Screen>('pin')
  const [activeTab, setActiveTab] = useState<Tab>('status')
  const [pin, setPin]             = useState('')
  const [employee, setEmployee]   = useState<Employee | null>(null)
  const [attendance, setAttendance] = useState<AttendanceRecord | null>(null)
  const [history, setHistory]     = useState<AttendanceRecord[]>([])
  const [summary, setSummary]     = useState<Summary | null>(null)
  const [loading, setLoading]     = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [error, setError]         = useState('')
  const [success, setSuccess]     = useState('')
  const [currentTime, setCurrentTime] = useState('')
  const [currentDate, setCurrentDate] = useState('')
  const [workTimer, setWorkTimer] = useState('')

  // Anti-cheat
  const [antiCheatStep, setAntiCheatStep] = useState<AntiCheatStep>('idle')
  const [gpsStatus, setGpsStatus]         = useState<'idle' | 'loading' | 'ok' | 'fail'>('idle')
  const [gpsDistance, setGpsDistance]     = useState<number | null>(null)
  const [capturedCoords, setCapturedCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [cameraStatus, setCameraStatus]   = useState<'idle' | 'loading' | 'preview' | 'captured' | 'fail'>('idle')
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const videoRef  = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // Confirm checkout modal
  const [showConfirmOut, setShowConfirmOut] = useState(false)

  // ── Clock ────────────────────────────────────────────────────
  useEffect(() => {
    const tick = () => {
      const now = new Date()
      setCurrentTime(now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }))
      setCurrentDate(now.toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }))
    }
    tick(); const t = setInterval(tick, 1000); return () => clearInterval(t)
  }, [])

  // ── Work timer ───────────────────────────────────────────────
  useEffect(() => {
    if (attendance?.status !== 'working') { setWorkTimer(''); return }
    const calc = () => {
      const elapsed = Date.now() - new Date(attendance.check_in).getTime()
      const h = Math.floor(elapsed / 3600000)
      const m = Math.floor((elapsed % 3600000) / 60000)
      const s = Math.floor((elapsed % 60000) / 1000)
      setWorkTimer(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`)
    }
    calc(); const t = setInterval(calc, 1000); return () => clearInterval(t)
  }, [attendance])

  // Cleanup camera
  useEffect(() => () => { streamRef.current?.getTracks().forEach(t => t.stop()) }, [])

  // Fetch history & summary when entering main screen or switching tabs
  const fetchHistoryAndSummary = useCallback(async (emp: Employee) => {
    setHistoryLoading(true)
    try {
      const [hRes, sRes] = await Promise.all([
        fetch(`/api/attendance/history?employee_id=${emp.id}&limit=30`),
        fetch(`/api/attendance/summary?employee_id=${emp.id}`),
      ])
      const [hData, sData] = await Promise.all([hRes.json(), sRes.json()])
      if (hData.history) setHistory(hData.history)
      if (!sData.error) setSummary(sData)
    } catch { /* silent */ }
    finally { setHistoryLoading(false) }
  }, [])

  // ── PIN login ────────────────────────────────────────────────
  const handlePinDigit = (digit: string) => {
    if (pin.length >= 4 || loading) return
    const newPin = pin + digit
    setPin(newPin); setError('')
    if (newPin.length === 4) setTimeout(() => loginWithPin(newPin), 300)
  }

  const loginWithPin = async (p: string) => {
    setLoading(true); setError('')
    try {
      const res  = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin_code: p }) })
      const data = await res.json()
      if (data.success) {
        setEmployee(data.employee); setAttendance(data.attendance)
        setScreen('main'); setActiveTab('status'); setPin('')
        fetchHistoryAndSummary(data.employee)
      } else { setError(data.error || 'PIN ไม่ถูกต้อง'); setPin('') }
    } catch { setError('เชื่อมต่อไม่ได้'); setPin('') }
    finally { setLoading(false) }
  }

  // ── GPS Step ─────────────────────────────────────────────────
  const startCheckIn = useCallback(async () => {
    setAntiCheatStep('gps'); setGpsStatus('loading'); setError('')
    if (!navigator.geolocation) {
      setGpsStatus('ok'); setCapturedCoords(null)
      setAntiCheatStep('camera'); return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords
        const dist = haversineMeters(lat, lng, shopLat, shopLng)
        setGpsDistance(dist); setCapturedCoords({ lat, lng }); setGpsStatus('ok')
        
        // Anti-cheat strict logic: if dist > allowedRadius, fail it or warn
        if (dist > allowedRadius) {
           setError(`คุณอยู่ห่างจากร้านเกินไป (${Math.round(dist)} ม.)`)
           // Optionally block here if strict, or just let them continue with warning
        }

        setTimeout(() => setAntiCheatStep('camera'), 800)
      },
      () => { setGpsStatus('fail'); setCapturedCoords(null); setTimeout(() => setAntiCheatStep('camera'), 800) },
      { timeout: 10000, enableHighAccuracy: true }
    )
  }, [shopLat, shopLng, allowedRadius])

  // ── Camera Step ──────────────────────────────────────────────
  const openCamera = useCallback(async () => {
    setCameraStatus('loading')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
      streamRef.current = stream; setCameraStatus('preview')
    } catch { setCameraStatus('fail') }
  }, [])

  useEffect(() => { if (antiCheatStep === 'camera') openCamera() }, [antiCheatStep, openCamera])

  useEffect(() => {
    if (cameraStatus === 'preview' && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current
    }
  }, [cameraStatus])

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return
    const v = videoRef.current; const c = canvasRef.current
    c.width = v.videoWidth; c.height = v.videoHeight
    c.getContext('2d')?.drawImage(v, 0, 0)
    setCapturedImage(c.toDataURL('image/jpeg', 0.7))
    streamRef.current?.getTracks().forEach(t => t.stop())
    setCameraStatus('captured'); setAntiCheatStep('ready')
  }, [])

  const retakePhoto = useCallback(() => {
    setCapturedImage(null); setCameraStatus('idle'); setAntiCheatStep('camera')
  }, [])

  // ── Submit check-in ──────────────────────────────────────────
  const submitCheckIn = useCallback(async () => {
    if (!employee) return
    setLoading(true); setError(''); setSuccess('')
    try {
      const res  = await fetch('/api/checkin', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee_id: employee.id, latitude: capturedCoords?.lat, longitude: capturedCoords?.lng, image_url: capturedImage }),
      })
      const data = await res.json()
      if (data.success) {
        setAttendance(data.attendance)
        setSuccess(`✅ เข้างานสำเร็จ! ${new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.`)
        setAntiCheatStep('idle'); setCapturedImage(null); setCapturedCoords(null); setGpsStatus('idle'); setCameraStatus('idle')
        fetchHistoryAndSummary(employee)
        setTimeout(() => setSuccess(''), 4000)
      } else { setError(data.error || 'เข้างานไม่สำเร็จ'); setAntiCheatStep('idle') }
    } catch { setError('เชื่อมต่อไม่ได้'); setAntiCheatStep('idle') }
    finally { setLoading(false) }
  }, [employee, capturedCoords, capturedImage, fetchHistoryAndSummary])

  // ── Check-out (after confirm) ────────────────────────────────
  const handleCheckOut = async () => {
    if (!employee) return
    setShowConfirmOut(false); setLoading(true); setError(''); setSuccess('')
    try {
      const res  = await fetch('/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ employee_id: employee.id }) })
      const data = await res.json()
      if (data.success) {
        setAttendance(data.attendance)
        setSuccess(`👋 ออกงานสำเร็จ! ทำงาน ${parseFloat(data.work_hours).toFixed(1)} ชม.`)
        fetchHistoryAndSummary(employee)
        setTimeout(() => { setSuccess(''); setScreen('pin'); setEmployee(null); setAttendance(null); setPin('') }, 4000)
      } else { setError(data.error || 'ออกงานไม่สำเร็จ') }
    } catch { setError('เชื่อมต่อไม่ได้') }
    finally { setLoading(false) }
  }

  const cancelAntiCheat = () => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    setAntiCheatStep('idle'); setGpsStatus('idle'); setCameraStatus('idle')
    setCapturedImage(null); setCapturedCoords(null); setError('')
  }

  const isWorking = attendance?.status === 'working'
  const isDone    = attendance?.status === 'done'

  // Current worked hours (for confirm modal)
  const currentHrsWorked = attendance && isWorking
    ? (Date.now() - new Date(attendance.check_in).getTime()) / 3600000
    : 0

  // ── RENDER ───────────────────────────────────────────────────
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, var(--coffee-dark) 0%, var(--coffee-brown) 60%, var(--coffee-medium) 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: screen === 'pin' ? 'center' : 'flex-start',
      padding: screen === 'pin' ? '24px' : '0',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Glow */}
      <div style={{ position: 'absolute', top: '-120px', right: '-120px', width: '480px', height: '480px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(212,175,55,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />

      {/* ══════════════ PIN SCREEN ══════════════ */}
      {screen === 'pin' && (
        <>
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', marginBottom: '4px' }}>{currentDate}</p>
            <h1 style={{ color: 'white', fontSize: '54px', fontWeight: '900', letterSpacing: '3px', fontVariantNumeric: 'tabular-nums', textShadow: '0 4px 24px rgba(0,0,0,0.4)', lineHeight: 1 }}>{currentTime}</h1>
            <p style={{ color: 'rgba(212,175,55,0.7)', fontSize: '14px', fontWeight: '600', marginTop: '4px' }}>👑 {shopName}</p>
          </div>
          <div className="animate-slide-up glass" style={{ padding: '32px', borderRadius: '28px', width: '100%', maxWidth: '340px', textAlign: 'center' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--coffee-medium), var(--gold))', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
              <User size={26} color="white" />
            </div>
            <h2 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--coffee-dark)', marginBottom: '4px' }}>ลงเวลาพนักงาน</h2>
            <p style={{ color: 'var(--coffee-medium)', fontSize: '14px', marginBottom: '24px' }}>กรอก PIN 4 หลัก</p>
            {/* Dots */}
            <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', marginBottom: '28px' }}>
              {[0,1,2,3].map(i => <div key={i} style={{ width: '18px', height: '18px', borderRadius: '50%', background: i < pin.length ? 'var(--coffee-medium)' : '#e8d5c4', transition: 'all 0.15s ease', transform: i < pin.length ? 'scale(1.2)' : 'scale(1)', boxShadow: i < pin.length ? '0 0 0 4px rgba(44,89,66,0.2)' : 'none' }} />)}
            </div>
            {/* Pad */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' }}>
              {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((d, i) =>
                d === '' ? <div key={i} /> : (
                  <button key={d} className="pin-digit" style={{ margin: '0 auto' }} onClick={() => { if (d === '⌫') { setPin(p => p.slice(0,-1)); setError('') } else handlePinDigit(d) }}>
                    {loading && pin.length === 4 && d === '⌫' ? <Loader2 size={18} className="spin" /> : d}
                  </button>
                )
              )}
            </div>
            {error && <div style={{ background: '#fee2e2', color: '#dc2626', padding: '10px 16px', borderRadius: '10px', fontSize: '14px', fontWeight: '600', border: '1px solid #fca5a5', marginBottom: '8px' }}>{error}</div>}
            {loading && <div style={{ color: 'var(--coffee-medium)', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}><Loader2 size={16} className="spin" /> กำลังตรวจสอบ...</div>}
          </div>
        </>
      )}

      {/* ══════════════ ANTI-CHEAT OVERLAY ══════════════ */}
      {screen === 'main' && antiCheatStep !== 'idle' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', zIndex: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          {/* GPS */}
          {antiCheatStep === 'gps' && (
            <div style={{ textAlign: 'center', color: 'white', maxWidth: '320px' }}>
              <MapPin size={56} color={gpsStatus === 'ok' ? '#22c55e' : gpsStatus === 'fail' ? '#ef4444' : 'var(--gold)'} style={{ margin: '0 auto 16px', display: 'block', animation: gpsStatus === 'loading' ? 'pulse-glow 1.5s infinite' : 'none' }} />
              <h3 style={{ fontSize: '22px', fontWeight: '800', marginBottom: '8px' }}>
                {gpsStatus === 'loading' ? '📍 กำลังตรวจสอบตำแหน่ง...' : gpsStatus === 'ok' ? '✅ ยืนยัน GPS สำเร็จ' : '⚠️ ไม่สามารถรับ GPS'}
              </h3>
              {gpsDistance !== null && (
                <div style={{ padding: '12px 20px', borderRadius: '12px', background: gpsDistance <= allowedRadius ? 'rgba(34,197,94,0.2)' : 'rgba(245,158,11,0.2)', border: `1px solid ${gpsDistance <= allowedRadius ? '#22c55e' : '#f59e0b'}`, marginTop: '12px' }}>
                  <p style={{ color: gpsDistance <= allowedRadius ? '#4ade80' : '#fbbf24', fontSize: '18px', fontWeight: '800' }}>
                    {gpsDistance <= allowedRadius ? `✅ ภายในร้าน (${Math.round(gpsDistance)} ม.)` : `⚠️ ระยะห่างจากร้าน ${Math.round(gpsDistance)} ม.`}
                  </p>
                </div>
              )}
              {gpsStatus === 'fail' && <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', marginTop: '8px' }}>กำลังดำเนินการต่อโดยไม่มี GPS...</p>}
            </div>
          )}

          {/* Camera */}
          {(antiCheatStep === 'camera' || antiCheatStep === 'ready') && (
            <div style={{ width: '100%', maxWidth: '380px', textAlign: 'center' }}>
              <h3 style={{ color: 'white', fontSize: '20px', fontWeight: '800', marginBottom: '16px' }}>
                <Camera size={22} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} /> ถ่ายรูปเพื่อยืนยัน
              </h3>
              {cameraStatus === 'loading' && (
                <div style={{ color: 'rgba(255,255,255,0.7)', padding: '40px' }}>
                  <Loader2 size={40} className="spin" style={{ margin: '0 auto 12px', display: 'block' }} />
                  <p>กำลังเปิดกล้อง...</p>
                </div>
              )}
              {cameraStatus === 'preview' && (
                <>
                  <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', borderRadius: '16px', border: '3px solid var(--gold)' }} />
                  <button onClick={capturePhoto} style={{ marginTop: '16px', width: '72px', height: '72px', borderRadius: '50%', background: 'var(--gold)', border: '4px solid white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '16px auto 0', boxShadow: '0 0 0 6px rgba(212,175,55,0.3)' }}>
                    <Camera size={28} color="var(--coffee-dark)" />
                  </button>
                  <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', marginTop: '8px' }}>กดปุ่มเพื่อถ่ายรูป</p>
                </>
              )}
              {cameraStatus === 'fail' && (
                <div style={{ color: '#fca5a5', padding: '24px' }}>
                  <AlertTriangle size={36} style={{ margin: '0 auto 8px', display: 'block' }} />
                  <p>ไม่สามารถเปิดกล้องได้</p>
                  <button onClick={() => setAntiCheatStep('ready')} style={{ marginTop: '16px', padding: '10px 24px', borderRadius: '12px', background: 'var(--gold)', border: 'none', fontWeight: '700', color: 'var(--coffee-dark)', cursor: 'pointer' }}>ดำเนินการต่อ</button>
                </div>
              )}
              {cameraStatus === 'captured' && capturedImage && (
                <>
                  <div style={{ position: 'relative' }}>
                    <img src={capturedImage} alt="captured" style={{ width: '100%', borderRadius: '16px', border: '3px solid #22c55e' }} />
                    <div style={{ position: 'absolute', bottom: '8px', left: '8px', background: 'rgba(0,0,0,0.6)', color: 'white', padding: '4px 10px', borderRadius: '8px', fontSize: '12px' }}>
                      📸 รูปเข้างาน {new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                    <button onClick={retakePhoto} style={{ flex: 1, padding: '14px', borderRadius: '12px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', fontWeight: '600', cursor: 'pointer', fontSize: '15px' }}>🔄 ถ่ายใหม่</button>
                    <button onClick={submitCheckIn} disabled={loading} style={{ flex: 2, padding: '14px', borderRadius: '12px', background: 'linear-gradient(135deg, #22c55e, #16a34a)', border: 'none', color: 'white', fontWeight: '800', cursor: 'pointer', fontSize: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                      {loading ? <Loader2 size={18} className="spin" /> : <ShieldCheck size={18} />} ยืนยันเข้างาน
                    </button>
                  </div>
                </>
              )}
              <button onClick={cancelAntiCheat} style={{ marginTop: '16px', background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px', margin: '16px auto 0' }}>
                <X size={16} /> ยกเลิก
              </button>
            </div>
          )}
          <canvas ref={canvasRef} style={{ display: 'none' }} />
        </div>
      )}

      {/* ══════════════ CONFIRM CHECKOUT MODAL ══════════════ */}
      {showConfirmOut && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ background: 'white', borderRadius: '24px', padding: '32px', maxWidth: '340px', width: '100%', textAlign: 'center', boxShadow: '0 24px 80px rgba(0,0,0,0.4)' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <LogOut size={28} color="#dc2626" />
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--coffee-dark)', marginBottom: '8px' }}>ยืนยันออกงาน?</h3>
            <p style={{ color: 'var(--coffee-light)', fontSize: '14px', marginBottom: '16px' }}>คุณต้องการออกงานใช่ไหม?</p>
            <div style={{ background: '#fafcfb', borderRadius: '14px', padding: '16px', marginBottom: '20px', border: '1px solid #e8d5c4' }}>
              <p style={{ fontSize: '12px', color: 'var(--coffee-light)', marginBottom: '4px' }}>ทำงานมาแล้ว</p>
              <p style={{ fontSize: '32px', fontWeight: '900', color: 'var(--coffee-dark)', fontVariantNumeric: 'tabular-nums' }}>{workTimer}</p>
              <p style={{ fontSize: '13px', color: 'var(--coffee-medium)', marginTop: '4px' }}>≈ {formatHours(currentHrsWorked)}</p>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setShowConfirmOut(false)} style={{ flex: 1, padding: '14px', borderRadius: '12px', border: '1.5px solid #e8d5c4', background: 'white', fontWeight: '700', cursor: 'pointer', fontSize: '15px', color: 'var(--coffee-dark)' }}>ยกเลิก</button>
              <button onClick={handleCheckOut} disabled={loading} style={{ flex: 1, padding: '14px', borderRadius: '12px', background: 'linear-gradient(135deg, #ef4444, #dc2626)', border: 'none', color: 'white', fontWeight: '800', cursor: 'pointer', fontSize: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                {loading ? <Loader2 size={16} className="spin" /> : <LogOut size={16} />} ออกงาน
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════ MAIN SCREEN ══════════════ */}
      {screen === 'main' && employee && antiCheatStep === 'idle' && (
        <div style={{ width: '100%', maxWidth: '440px', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
          {/* ── Header ── */}
          <div style={{ background: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(16px)', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--coffee-medium), var(--gold))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: '800', color: 'white' }}>
                {employee.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p style={{ color: 'white', fontWeight: '800', fontSize: '15px', lineHeight: 1.2 }}>{employee.name}</p>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>{employee.role}</p>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ color: 'white', fontWeight: '700', fontSize: '20px', fontVariantNumeric: 'tabular-nums' }}>{currentTime}</p>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px' }}>{currentDate.split(' ').slice(0,2).join(' ')}</p>
            </div>
          </div>

          {/* ── Tabs ── */}
          <div style={{ display: 'flex', background: 'rgba(0,0,0,0.2)', padding: '8px 12px', gap: '4px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            {([
              { id: 'status',  icon: Clock,    label: 'สถานะ' },
              { id: 'history', icon: History,   label: 'ประวัติ' },
              { id: 'summary', icon: BarChart2, label: 'สรุป' },
            ] as const).map(({ id, icon: Icon, label }) => (
              <button key={id} onClick={() => setActiveTab(id)} style={{
                flex: 1, padding: '8px 4px', borderRadius: '10px', border: 'none',
                background: activeTab === id ? 'rgba(255,255,255,0.15)' : 'transparent',
                color: activeTab === id ? 'white' : 'rgba(255,255,255,0.45)',
                fontSize: '13px', fontWeight: activeTab === id ? '700' : '500',
                cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
              }}>
                <Icon size={18} />
                {label}
              </button>
            ))}
          </div>

          {/* ── Tab Content ── */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>

            {/* Messages */}
            {success && <div style={{ background: '#d1fae5', color: '#065f46', padding: '12px 16px', borderRadius: '12px', marginBottom: '12px', fontWeight: '700', border: '1px solid #6ee7b7', fontSize: '14px' }}>{success}</div>}
            {error   && <div style={{ background: '#fee2e2', color: '#dc2626', padding: '12px 16px', borderRadius: '12px', marginBottom: '12px', fontWeight: '700', border: '1px solid #fca5a5', fontSize: '14px' }}>{error}</div>}

            {/* ─── STATUS TAB ─── */}
            {activeTab === 'status' && (
              <div>
                {/* Status badge */}
                <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '20px', padding: '20px', marginBottom: '14px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.12)' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 20px', borderRadius: '24px', background: isWorking ? 'rgba(34,197,94,0.2)' : isDone ? 'rgba(96,165,250,0.2)' : 'rgba(251,191,36,0.2)', border: `1px solid ${isWorking ? '#22c55e' : isDone ? '#60a5fa' : '#fbbf24'}`, marginBottom: '14px' }}>
                    {isWorking ? (
                      <><div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', animation: 'pulse-glow 2s infinite' }} /><span style={{ color: '#4ade80', fontWeight: '800', fontSize: '15px' }}>กำลังทำงาน</span></>
                    ) : isDone ? (
                      <><CheckCircle size={16} color="#60a5fa" /><span style={{ color: '#93c5fd', fontWeight: '800', fontSize: '15px' }}>เสร็จสิ้นแล้ว</span></>
                    ) : (
                      <><Clock size={16} color="#fbbf24" /><span style={{ color: '#fde68a', fontWeight: '800', fontSize: '15px' }}>ยังไม่ได้เข้างาน</span></>
                    )}
                  </div>

                  {/* Live timer */}
                  {isWorking && workTimer && (
                    <div style={{ marginBottom: '8px' }}>
                      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', marginBottom: '2px' }}>ทำงานมาแล้ว</p>
                      <p style={{ color: 'var(--gold)', fontSize: '44px', fontWeight: '900', fontVariantNumeric: 'tabular-nums', letterSpacing: '2px', lineHeight: 1 }}>{workTimer}</p>
                    </div>
                  )}

                  {/* Attendance details */}
                  {attendance && (
                    <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '12px', padding: '12px', border: '1px solid rgba(255,255,255,0.08)', textAlign: 'left', marginTop: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>เข้างาน</span>
                        <span style={{ color: 'white', fontWeight: '700', fontSize: '14px' }}>{fmtTime(attendance.check_in)} น.</span>
                      </div>
                      {attendance.check_out && (
                        <>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>ออกงาน</span>
                            <span style={{ color: 'white', fontWeight: '700', fontSize: '14px' }}>{fmtTime(attendance.check_out)} น.</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>รวม</span>
                            <span style={{ color: 'var(--gold)', fontWeight: '900', fontSize: '16px' }}>{formatHours(attendance.work_hours || 0)}</span>
                          </div>
                        </>
                      )}
                      {attendance.latitude && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                          <MapPin size={12} color="#4ade80" />
                          <span style={{ color: '#4ade80', fontSize: '12px', fontWeight: '600' }}>
                            GPS ยืนยันแล้ว
                            {gpsDistance !== null && ` (${Math.round(gpsDistance)} ม. จากร้าน)`}
                          </span>
                        </div>
                      )}
                      {attendance.image_url && (
                        <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', marginBottom: '6px' }}>📸 รูปเข้างาน {fmtTime(attendance.check_in)} น.</p>
                          <img src={attendance.image_url} alt="check-in" style={{ width: '100%', borderRadius: '10px', maxHeight: '120px', objectFit: 'cover' }} />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                {!isWorking && !isDone && (
                  <button onClick={startCheckIn} disabled={loading} style={{ width: '100%', padding: '20px', background: 'linear-gradient(135deg, #22c55e, #16a34a)', border: 'none', borderRadius: '18px', color: 'white', fontSize: '20px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', boxShadow: '0 8px 28px rgba(34,197,94,0.35)', marginBottom: '12px', opacity: loading ? 0.7 : 1 }}>
                    <LogIn size={26} /> เข้างาน
                  </button>
                )}
                {isWorking && (
                  <button onClick={() => setShowConfirmOut(true)} disabled={loading} style={{ width: '100%', padding: '20px', background: 'linear-gradient(135deg, #ef4444, #dc2626)', border: 'none', borderRadius: '18px', color: 'white', fontSize: '20px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', boxShadow: '0 8px 28px rgba(239,68,68,0.35)', marginBottom: '12px', opacity: loading ? 0.7 : 1 }}>
                    {loading ? <Loader2 size={24} className="spin" /> : <LogOut size={24} />}
                    ออกงาน
                  </button>
                )}
                {isDone && (
                  <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '16px', padding: '16px', textAlign: 'center', marginBottom: '12px', color: 'rgba(255,255,255,0.6)', fontSize: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
                    ✅ เสร็จสิ้นกะวันนี้แล้ว
                  </div>
                )}
                <button onClick={() => { setScreen('pin'); setEmployee(null); setAttendance(null); setPin(''); setError(''); setSuccess('') }} style={{ width: '100%', padding: '14px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '14px', color: 'rgba(255,255,255,0.7)', fontSize: '15px', cursor: 'pointer', fontWeight: '600' }}>
                  ← ออกจากระบบ
                </button>
              </div>
            )}

            {/* ─── HISTORY TAB ─── */}
            {activeTab === 'history' && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <Calendar size={18} color="rgba(255,255,255,0.6)" />
                  <h3 style={{ color: 'white', fontWeight: '800', fontSize: '16px' }}>ประวัติการทำงาน</h3>
                </div>
                {historyLoading ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.4)' }}>
                    <Loader2 size={32} className="spin" style={{ margin: '0 auto 8px', display: 'block' }} />
                    <p>กำลังโหลด...</p>
                  </div>
                ) : history.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.4)' }}>
                    <History size={40} style={{ margin: '0 auto 8px', display: 'block', opacity: 0.3 }} />
                    <p>ยังไม่มีประวัติ</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {history.map((rec) => (
                      <div key={rec.id} style={{ background: 'rgba(255,255,255,0.07)', borderRadius: '16px', padding: '14px 16px', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', marginBottom: '4px' }}>{fmtDate(rec.check_in)}</p>
                          <p style={{ color: 'white', fontWeight: '700', fontSize: '14px' }}>
                            {fmtTime(rec.check_in)} – {rec.check_out ? fmtTime(rec.check_out) : <span style={{ color: '#4ade80' }}>กำลังทำงาน</span>}
                          </p>
                          {rec.latitude && <p style={{ color: '#4ade80', fontSize: '11px', marginTop: '2px' }}>📍 GPS</p>}
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          {rec.work_hours ? (
                            <div style={{ background: 'rgba(212,175,55,0.15)', border: '1px solid rgba(212,175,55,0.3)', borderRadius: '10px', padding: '6px 12px' }}>
                              <p style={{ color: 'var(--gold)', fontWeight: '900', fontSize: '18px', lineHeight: 1 }}>{rec.work_hours.toFixed(1)}</p>
                              <p style={{ color: 'rgba(212,175,55,0.6)', fontSize: '10px' }}>ชม.</p>
                            </div>
                          ) : (
                            <div style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '10px', padding: '6px 12px' }}>
                              <p style={{ color: '#4ade80', fontSize: '12px', fontWeight: '700' }}>Active</p>
                            </div>
                          )}
                          <ChevronRight size={14} color="rgba(255,255,255,0.2)" style={{ marginTop: '4px', float: 'right' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ─── SUMMARY TAB ─── */}
            {activeTab === 'summary' && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <BarChart2 size={18} color="rgba(255,255,255,0.6)" />
                  <h3 style={{ color: 'white', fontWeight: '800', fontSize: '16px' }}>สรุปชั่วโมงทำงาน</h3>
                </div>
                {historyLoading ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.4)' }}>
                    <Loader2 size={32} className="spin" style={{ margin: '0 auto 8px', display: 'block' }} /><p>กำลังโหลด...</p>
                  </div>
                ) : (
                  <>
                    {/* Summary cards */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                      {[
                        { label: 'วันนี้',   value: summary?.today   ?? 0, target: 8,   color: '#4ade80', icon: '📅' },
                        { label: 'สัปดาห์นี้', value: summary?.weekly  ?? 0, target: 40,  color: '#60a5fa', icon: '📆' },
                        { label: 'เดือนนี้',  value: summary?.monthly ?? 0, target: 160, color: '#c084fc', icon: '🗓️' },
                      ].map(({ label, value, target, color, icon }) => {
                        const pct = Math.min((value / target) * 100, 100)
                        return (
                          <div key={label} style={{ background: 'rgba(255,255,255,0.07)', borderRadius: '18px', padding: '18px 20px', border: '1px solid rgba(255,255,255,0.1)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '12px' }}>
                              <div>
                                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', marginBottom: '4px' }}>{icon} {label}</p>
                                <p style={{ color: 'white', fontSize: '32px', fontWeight: '900', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{value.toFixed(1)}</p>
                                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px' }}>ชั่วโมง จากเป้า {target} ชม.</p>
                              </div>
                              <p style={{ color, fontSize: '22px', fontWeight: '800' }}>{Math.round(pct)}%</p>
                            </div>
                            <div style={{ height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px' }}>
                              <div style={{ height: '8px', borderRadius: '4px', background: color, width: `${pct}%`, transition: 'width 0.6s ease' }} />
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {/* Recent history mini */}
                    <div style={{ background: 'rgba(255,255,255,0.07)', borderRadius: '18px', padding: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
                      <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', fontWeight: '700', marginBottom: '12px' }}>7 วันล่าสุด</p>
                      {history.slice(0, 7).map((rec) => (
                        <div key={rec.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px' }}>{fmtDate(rec.check_in)}</p>
                          <p style={{ color: rec.work_hours ? 'var(--gold)' : '#4ade80', fontWeight: '800', fontSize: '14px' }}>
                            {rec.work_hours ? `${rec.work_hours.toFixed(1)} ชม.` : 'Active'}
                          </p>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
