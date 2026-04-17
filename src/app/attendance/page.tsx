'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Clock, CheckCircle, LogOut, LogIn, Loader2, User,
  MapPin, Camera, ShieldCheck, X, History, BarChart2,
  AlertTriangle, ChevronRight, Calendar, Globe
} from 'lucide-react'
import { useSettings } from '@/context/SettingsContext'
import { useLanguage } from '@/context/LanguageContext'
import { translations } from '@/lib/translations'

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
  const { lang, toggleLang } = useLanguage()
  const t = translations[lang].attendance
  const c = translations[lang].common

  const { settings } = useSettings()
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
  const [activeAction, setActiveAction] = useState<'checkin' | 'checkout' | null>(null)
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null)

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

  // Fetch history & summary
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
      } else { setError(data.error || t.wrongPin); setPin('') }
    } catch { setError(t.connectFail); setPin('') }
    finally { setLoading(false) }
  }

  // ── GPS Step ─────────────────────────────────────────────────
  const startAntiCheat = useCallback(async (action: 'checkin' | 'checkout') => {
    setActiveAction(action)
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
        if (dist > allowedRadius) setError(`${t.tooFar} (${Math.round(dist)} m)`)
        setTimeout(() => setAntiCheatStep('camera'), 800)
      },
      () => { setGpsStatus('fail'); setCapturedCoords(null); setTimeout(() => setAntiCheatStep('camera'), 800) },
      { timeout: 10000, enableHighAccuracy: true }
    )
  }, [shopLat, shopLng, allowedRadius, t.tooFar])

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

  const submitAntiCheat = useCallback(async () => {
    if (!employee || !activeAction) return
    setLoading(true); setError(''); setSuccess('')
    try {
      const endpoint = activeAction === 'checkin' ? '/api/checkin' : '/api/checkout'
      const payload = activeAction === 'checkin' 
        ? { employee_id: employee.id, latitude: capturedCoords?.lat, longitude: capturedCoords?.lng, image_url: capturedImage }
        : { employee_id: employee.id, latitude: capturedCoords?.lat, longitude: capturedCoords?.lng, check_out_image: capturedImage }

      const res  = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await res.json()
      if (data.success) {
        setAttendance(data.attendance)
        if (activeAction === 'checkin') {
          setSuccess(`${t.checkInSuccess} ${new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}`)
        } else {
          setSuccess(`${t.checkOutSuccess} ${parseFloat(data.work_hours).toFixed(1)} ${t.hrs}`)
          setTimeout(() => { setScreen('pin'); setEmployee(null); setAttendance(null); setPin('') }, 4000)
        }
        setAntiCheatStep('idle'); setCapturedImage(null); setCapturedCoords(null); setGpsStatus('idle'); setCameraStatus('idle'); setActiveAction(null)
        fetchHistoryAndSummary(employee)
        setTimeout(() => setSuccess(''), 4000)
      } else { setError(data.error || t.connectFail); setAntiCheatStep('idle') }
    } catch { setError(t.connectFail); setAntiCheatStep('idle') }
    finally { setLoading(false) }
  }, [employee, activeAction, capturedCoords, capturedImage, fetchHistoryAndSummary, t])

  const handleCheckOut = () => { setShowConfirmOut(false); startAntiCheat('checkout') }

  const cancelAntiCheat = () => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    setAntiCheatStep('idle'); setGpsStatus('idle'); setCameraStatus('idle')
    setCapturedImage(null); setCapturedCoords(null); setError('')
  }

  const isWorking = attendance?.status === 'working'
  const isDone    = attendance?.status === 'done'
  const currentHrsWorked = attendance && isWorking ? (Date.now() - new Date(attendance.check_in).getTime()) / 3600000 : 0

  return (
    <div style={{
      minHeight: '100vh', background: 'linear-gradient(160deg, var(--coffee-dark) 0%, var(--coffee-brown) 60%, var(--coffee-medium) 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: screen === 'pin' ? 'center' : 'flex-start',
      padding: screen === 'pin' ? '24px' : '0', position: 'relative', overflow: 'hidden'
    }}>
      <div style={{ position: 'absolute', top: '-120px', right: '-120px', width: '480px', height: '480px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(212,175,55,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />

      {screen === 'pin' && (
        <>
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <p className="thai-fix" style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', marginBottom: '4px' }}>{currentDate}</p>
            <h1 style={{ color: 'white', fontSize: '54px', fontWeight: '900', letterSpacing: '3px', lineHeight: 1 }}>{currentTime}</h1>
            <p className="thai-fix" style={{ color: 'rgba(212,175,55,0.7)', fontSize: '14px', fontWeight: '600' }}>👑 {shopName}</p>
          </div>
          <div className="animate-slide-up glass" style={{ padding: '32px', borderRadius: '28px', width: '100%', maxWidth: '340px', textAlign: 'center', position: 'relative' }}>
            <a href="/" style={{ position: 'absolute', top: '16px', left: '16px' }}><button style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '12px', padding: '6px 10px', color: 'var(--coffee-dark)', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}>🏠 {lang === 'th' ? 'กลับ' : 'Back'}</button></a>
            <button onClick={toggleLang} style={{ position: 'absolute', top: '16px', right: '16px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '12px', padding: '6px 12px', color: 'var(--coffee-dark)', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}><Globe size={14} /> {c.langToggle}</button>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--coffee-medium), var(--gold))', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}><User size={26} color="white" /></div>
            <h2 className="thai-fix" style={{ fontSize: '22px', fontWeight: '800', color: 'var(--coffee-dark)' }}>{t.pinTitle}</h2>
            <p className="thai-fix" style={{ color: 'var(--coffee-medium)', fontSize: '14px', marginBottom: '24px' }}>{t.pinSubtitle}</p>
            <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', marginBottom: '28px' }}>
              {[0,1,2,3].map(i => <div key={i} style={{ width: '18px', height: '18px', borderRadius: '50%', background: i < pin.length ? 'var(--coffee-medium)' : '#e8d5c4', transition: 'all 0.15s ease' }} />)}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((d, i) => d === '' ? <div key={i}/> : <button key={d} className="pin-digit" onClick={() => d === '⌫' ? setPin(p => p.slice(0, -1)) : handlePinDigit(d)}>{d}</button>)}
            </div>
            {error && <div style={{ color: '#dc2626', marginTop: '12px', fontSize: '14px', fontWeight: '600' }}>{error}</div>}
          </div>
        </>
      )}

      {screen === 'main' && antiCheatStep !== 'idle' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', zIndex: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          {antiCheatStep === 'gps' && (
            <div style={{ textAlign: 'center', color: 'white', maxWidth: '320px' }}>
              <MapPin size={56} color={gpsStatus === 'ok' ? '#22c55e' : gpsStatus === 'fail' ? '#ef4444' : 'var(--gold)'} style={{ margin: '0 auto 16px', display: 'block' }} />
              <h3>{gpsStatus === 'loading' ? t.gpsChecking : gpsStatus === 'ok' ? t.gpsOk : t.gpsFail}</h3>
              {gpsDistance !== null && (
                <div style={{ padding: '12px 20px', borderRadius: '12px', background: 'rgba(255,255,255,0.1)', marginTop: '12px' }}>
                  <p style={{ color: gpsDistance <= allowedRadius ? '#4ade80' : '#fbbf24', fontSize: '18px', fontWeight: '800' }}>{gpsDistance <= allowedRadius ? `✅ ${t.inShop}` : `⚠️ ${t.farFromShop} ${Math.round(gpsDistance)} m`}</p>
                </div>
              )}
            </div>
          )}
          {(antiCheatStep === 'camera' || antiCheatStep === 'ready') && (
            <div style={{ width: '100%', maxWidth: '380px', textAlign: 'center' }}>
              <h3 style={{ color: 'white', marginBottom: '16px' }}><Camera size={22} style={{ display: 'inline', marginRight: '8px' }} /> {t.takePhoto}</h3>
              {cameraStatus === 'preview' && (
                <>
                  <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', borderRadius: '16px', border: '3px solid var(--gold)' }} />
                  <button onClick={capturePhoto} style={{ marginTop: '16px', width: '72px', height: '72px', borderRadius: '50%', background: 'var(--gold)', border: '4px solid white', cursor: 'pointer' }}><Camera size={28} /></button>
                </>
              )}
              {cameraStatus === 'captured' && capturedImage && (
                <>
                  <img src={capturedImage} alt="captured" style={{ width: '100%', borderRadius: '16px' }} />
                  <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                    <button onClick={retakePhoto} style={{ flex: 1, padding: '14px', borderRadius: '12px', background: 'rgba(255,255,255,0.1)', color: 'white' }}>{t.retake}</button>
                    <button onClick={submitAntiCheat} style={{ flex: 2, padding: '14px', borderRadius: '12px', background: 'var(--gold)', fontWeight: '800' }}>{activeAction === 'checkin' ? t.confirmCheckIn : t.checkOut}</button>
                  </div>
                </>
              )}
              <button onClick={cancelAntiCheat} style={{ marginTop: '16px', background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)' }}>{t.cancel}</button>
            </div>
          )}
          <canvas ref={canvasRef} style={{ display: 'none' }} />
        </div>
      )}

      {showConfirmOut && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div className="modal-full-mobile" style={{ background: 'white', borderRadius: '24px', padding: '32px', maxWidth: '340px', width: '100%', textAlign: 'center' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}><LogOut size={28} color="#dc2626" /></div>
            <h3>{t.confirmOut}</h3>
            <p>{t.confirmOutMsg}</p>
            <div style={{ background: '#fafcfb', borderRadius: '14px', padding: '16px', margin: '16px 0' }}>
              <p style={{ fontSize: '12px', color: 'var(--coffee-light)' }}>{t.workedTime}</p>
              <p style={{ fontSize: '32px', fontWeight: '900' }}>{workTimer}</p>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setShowConfirmOut(false)} style={{ flex: 1, padding: '14px', borderRadius: '12px', border: '1px solid #e8d5c4' }}>{t.cancel}</button>
              <button onClick={handleCheckOut} style={{ flex: 1, padding: '14px', borderRadius: '12px', background: '#ef4444', color: 'white', fontWeight: '800' }}>{t.continue}</button>
            </div>
          </div>
        </div>
      )}

      {selectedRecord && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div className="animate-slide-up glass modal-full-mobile" style={{ padding: '28px', borderRadius: '24px', maxWidth: '380px', width: '100%', position: 'relative' }}>
            <button onClick={() => setSelectedRecord(null)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer' }}><X size={20} /></button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: 'rgba(212,175,55,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><History size={24} color="var(--gold)" /></div>
              <div><h3 className="thai-fix" style={{ fontSize: '18px', fontWeight: '800' }}>{t.historyDetail}</h3><p style={{ fontSize: '13px' }}>{fmtDate(selectedRecord.check_in)}</p></div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ background: 'rgba(0,0,0,0.03)', padding: '12px', borderRadius: '12px' }}><p style={{ fontSize: '12px', color: 'var(--coffee-light)' }}>{t.checkIn}</p><p style={{ fontWeight: '800' }}>{fmtTime(selectedRecord.check_in)}</p></div>
                <div style={{ background: 'rgba(0,0,0,0.03)', padding: '12px', borderRadius: '12px' }}><p style={{ fontSize: '12px', color: 'var(--coffee-light)' }}>{t.checkOut}</p><p style={{ fontWeight: '800' }}>{selectedRecord.check_out ? fmtTime(selectedRecord.check_out) : '-'}</p></div>
              </div>
              {selectedRecord.work_hours && (
                <div style={{ background: 'var(--coffee-dark)', padding: '16px', borderRadius: '12px', textAlign: 'center' }}>
                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>{t.total}</p>
                  <p style={{ fontSize: '28px', fontWeight: '900', color: 'var(--gold)' }}>{formatHours(selectedRecord.work_hours)}</p>
                </div>
              )}
              {selectedRecord.latitude && (
                <div style={{ background: 'rgba(0,0,0,0.03)', padding: '14px', borderRadius: '12px' }}>
                  <p style={{ fontSize: '13px', fontWeight: '700' }}><MapPin size={14} /> Location</p>
                  <p style={{ fontSize: '12px' }}>{t.lat}: {selectedRecord.latitude.toFixed(6)}, {t.lng}: {selectedRecord.longitude?.toFixed(6)}</p>
                  {shopLat && shopLng && selectedRecord.longitude && (
                    <p style={{ fontSize: '12px', color: '#16a34a', fontWeight: '700' }}>📍 {t.distance}: {Math.round(haversineMeters(selectedRecord.latitude, selectedRecord.longitude, shopLat, shopLng))} m {t.fromShop}</p>
                  )}
                </div>
              )}
              {selectedRecord.image_url && (
                <div style={{ background: 'rgba(0,0,0,0.03)', padding: '14px', borderRadius: '12px' }}>
                  <p style={{ fontSize: '13px', fontWeight: '700' }}>📸 {t.photo}</p>
                  <img src={selectedRecord.image_url} alt="proof" style={{ width: '100%', borderRadius: '8px' }} />
                </div>
              )}
            </div>
            <button onClick={() => setSelectedRecord(null)} style={{ width: '100%', marginTop: '20px', padding: '14px', borderRadius: '12px', background: 'var(--coffee-dark)', color: 'white', fontWeight: '700' }}>{t.cancel}</button>
          </div>
        </div>
      )}

      {screen === 'main' && employee && antiCheatStep === 'idle' && (
        <div style={{ width: '100%', maxWidth: '440px', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
          <div style={{ background: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(16px)', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--coffee-medium), var(--gold))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', color: 'white' }}>{employee.name.charAt(0).toUpperCase()}</div>
              <div><p className="thai-fix" style={{ color: 'white', fontWeight: '800' }}>{employee.name}</p><p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>{employee.role}</p></div>
            </div>
            <div style={{ textAlign: 'right' }}><p style={{ color: 'white', fontWeight: '700', fontSize: '20px' }}>{currentTime}</p><p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px' }}>{currentDate}</p></div>
          </div>
          <div style={{ display: 'flex', background: 'rgba(0,0,0,0.2)', padding: '8px 12px', gap: '4px' }}>
            {([{ id: 'status', icon: Clock, label: t.status }, { id: 'history', icon: History, label: t.history }, { id: 'summary', icon: BarChart2, label: t.summary }] as const).map(({ id, icon: Icon, label }) => (
              <button key={id} onClick={() => setActiveTab(id)} style={{ flex: 1, padding: '8px', borderRadius: '10px', background: activeTab === id ? 'rgba(255,255,255,0.15)' : 'transparent', color: activeTab === id ? 'white' : 'rgba(255,255,255,0.4)', border: 'none', cursor: 'pointer' }}><Icon size={18} /> {label}</button>
            ))}
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
            {activeTab === 'status' && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '20px', padding: '20px', marginBottom: '14px' }}>
                  <div style={{ padding: '8px 20px', borderRadius: '24px', background: isWorking ? 'rgba(34,197,94,0.2)' : 'rgba(251,191,36,0.2)', display: 'inline-block', marginBottom: '16px' }}><span style={{ color: isWorking ? '#4ade80' : '#fbbf24', fontWeight: '800' }}>{isWorking ? t.working : t.notStarted}</span></div>
                  {isWorking && workTimer && <p style={{ color: 'var(--gold)', fontSize: '44px', fontWeight: '900' }}>{workTimer}</p>}
                </div>
                {!isWorking && !isDone && <button onClick={() => startAntiCheat('checkin')} style={{ width: '100%', padding: '20px', background: '#22c55e', borderRadius: '18px', color: 'white', fontSize: '20px', fontWeight: '800', border: 'none', cursor: 'pointer' }}><LogIn /> {t.checkIn}</button>}
                {isWorking && <button onClick={() => setShowConfirmOut(true)} style={{ width: '100%', padding: '20px', background: '#ef4444', borderRadius: '18px', color: 'white', fontSize: '20px', fontWeight: '800', border: 'none', cursor: 'pointer' }}><LogOut /> {t.checkOut}</button>}
                <button onClick={() => setScreen('pin')} style={{ width: '100%', marginTop: '12px', padding: '14px', background: 'rgba(255,255,255,0.05)', color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer' }}>{t.logout}</button>
              </div>
            )}
            {activeTab === 'history' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {history.map(rec => (
                  <div key={rec.id} onClick={() => setSelectedRecord(rec)} style={{ background: 'rgba(255,255,255,0.07)', borderRadius: '16px', padding: '16px', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', cursor: 'pointer' }}>
                    <div><p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>{fmtDate(rec.check_in)}</p><p style={{ color: 'white', fontWeight: '700' }}>{fmtTime(rec.check_in)} – {rec.check_out ? fmtTime(rec.check_out) : t.working}</p></div>
                    <div style={{ textAlign: 'right' }}>{rec.work_hours && <p style={{ color: 'var(--gold)', fontWeight: '900' }}>{rec.work_hours.toFixed(1)} {t.hrs}</p>}<ChevronRight size={14} color="rgba(255,255,255,0.2)" /></div>
                  </div>
                ))}
              </div>
            )}
            {activeTab === 'summary' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[ { label: t.today, value: summary?.today ?? 0, target: 8, color: '#4ade80' }, { label: t.thisWeek, value: summary?.weekly ?? 0, target: 40, color: '#60a5fa' }, { label: t.thisMonth, value: summary?.monthly ?? 0, target: 160, color: '#c084fc' } ].map(({ label, value, target, color }) => (
                  <div key={label} style={{ background: 'rgba(255,255,255,0.07)', borderRadius: '18px', padding: '20px' }}>
                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>{label}</p>
                    <p style={{ color: 'white', fontSize: '32px', fontWeight: '900' }}>{value.toFixed(1)}</p>
                    <div style={{ height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', marginTop: '8px' }}><div style={{ height: '8px', borderRadius: '4px', background: color, width: `${Math.min((value / target) * 100, 100)}%` }} /></div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
