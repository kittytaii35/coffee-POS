'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import liff from '@line/liff'
import { Loader2 } from 'lucide-react'

export default function LiffPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const initLiff = async () => {
      try {
        const liffId = process.env.NEXT_PUBLIC_LIFF_ID
        if (!liffId || liffId === 'your_liff_id') {
          setError('LIFF ID is not configured. Please check your .env.local')
          return
        }

        await liff.init({ liffId })
        
        if (!liff.isLoggedIn()) {
          liff.login()
          return
        }

        const profile = await liff.getProfile()
        const userId = profile.userId
        const displayName = profile.displayName

        // Redirect to ordering page with LINE info
        router.replace(`/order?line_user_id=${userId}&customer_name=${encodeURIComponent(displayName)}`)
      } catch (err: any) {
        console.error('LIFF Init Error:', err)
        setError(err.message || 'Failed to initialize LIFF')
      }
    }

    initLiff()
  }, [router])

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(160deg, var(--coffee-dark) 0%, var(--coffee-brown) 100%)',
      padding: '24px',
      color: 'white',
      textAlign: 'center'
    }}>
      {!error ? (
        <>
          <Loader2 className="spin" size={48} color="var(--gold)" style={{ marginBottom: '20px' }} />
          <h2 style={{ fontSize: '24px', fontWeight: '800' }}>Initializing LINE OA...</h2>
          <p style={{ color: 'rgba(255,255,255,0.6)', marginTop: '8px' }}>Authenticating your profile</p>
        </>
      ) : (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '24px', borderRadius: '16px', border: '1px solid #ef4444' }}>
          <h2 style={{ color: '#ef4444', marginBottom: '8px' }}>Error</h2>
          <p>{error}</p>
          <button 
            onClick={() => window.location.reload()}
            style={{ marginTop: '16px', padding: '8px 16px', borderRadius: '8px', background: 'white', color: 'var(--coffee-dark)', border: 'none', fontWeight: '700' }}
          >
            Retry
          </button>
        </div>
      )}
    </div>
  )
}
