'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { 
  Users, Search, UserPlus, CreditCard, 
  History, Edit3, Save, X, Plus, Minus,
  Star, Coffee, Phone, PhoneCall
} from 'lucide-react'
import { useLanguage } from '@/context/LanguageContext'
import { translations } from '@/lib/translations'
import { Member } from '@/lib/supabase'

export default function ManagerMembers() {
  const { lang } = useLanguage()
  const t = translations[lang].members
  
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)
  
  // Form State
  const [formData, setFormData] = useState({ name: '', phone: '', points: 0, line_id: '' })
  const [saving, setSaving] = useState(false)

  const [potentialMembers, setPotentialMembers] = useState<any[]>([])
  const [loadingPotential, setLoadingPotential] = useState(false)

  const fetchMembers = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/members')
      const data = await res.json()
      if (!data.error) setMembers(data.members || [])
    } finally {
      setLoading(false)
    }
  }

  const fetchPotentialMembers = async () => {
    setLoadingPotential(true)
    try {
      // Fetch unique line IDs from orders that aren't formal members
      const res = await fetch('/api/orders?limit=1000')
      const data = await res.json()
      if (data.orders) {
        const lineGroups: Record<string, { count: number, name: string }> = {}
        const memberLineIds = new Set(members.map(m => m.line_id).filter(Boolean))

        data.orders.forEach((o: any) => {
          if (o.customer_line_id && !memberLineIds.has(o.customer_line_id)) {
            if (!lineGroups[o.customer_line_id]) {
              lineGroups[o.customer_line_id] = { count: 0, name: o.customer_name }
            }
            lineGroups[o.customer_line_id].count++
          }
        })

        const potentials = Object.entries(lineGroups)
          .map(([id, stats]) => ({ id, ...stats }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10)
        
        setPotentialMembers(potentials)
      }
    } finally {
      setLoadingPotential(false)
    }
  }

  useEffect(() => {
    fetchMembers()
  }, [])

  useEffect(() => {
    if (members.length > 0) fetchPotentialMembers()
  }, [members])

  const filteredMembers = useMemo(() => {
    const q = search.toLowerCase()
    return members.filter(m => 
      m.name.toLowerCase().includes(q) || 
      m.phone.includes(q)
    )
  }, [members, search])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const endpoint = selectedMember ? `/api/members/${selectedMember.id}` : '/api/members'
      const method = selectedMember ? 'PUT' : 'POST'
      
      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      
      if (res.ok) {
        setShowAddModal(false)
        setSelectedMember(null)
        setFormData({ name: '', phone: '', points: 0, line_id: '' })
        fetchMembers()
      }
    } finally {
      setSaving(false)
    }
  }

  const openEdit = (m: Member) => {
    setSelectedMember(m)
    setFormData({ name: m.name, phone: m.phone, points: m.points, line_id: m.line_id || '' })
    setShowAddModal(true)
  }

  const registerGuest = (guest: any) => {
    setSelectedMember(null)
    setFormData({ name: guest.name, phone: '', points: 0, line_id: guest.id })
    setShowAddModal(true)
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Search & Actions Bar */}
      <div style={{ 
        display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap',
        background: 'white', padding: '16px', borderRadius: '16px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.03)'
      }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
          <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--coffee-light)' }} />
          <input 
            type="text" 
            placeholder={t.searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ 
              width: '100%', padding: '12px 12px 12px 42px', borderRadius: '12px',
              border: '1px solid #e8d5c4', outline: 'none', fontSize: '14px'
            }}
          />
        </div>

        <button 
          onClick={() => { setSelectedMember(null); setFormData({ name: '', phone: '', points: 0, line_id: '' }); setShowAddModal(true); }}
          style={{ 
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '12px 20px', borderRadius: '12px', border: 'none',
            background: 'var(--gold)', color: 'var(--coffee-dark)', fontWeight: '800',
            fontSize: '14px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(212,175,55,0.2)'
          }}
        >
          <UserPlus size={18} /> {t.addMember}
        </button>
      </div>

      {/* Potential Members Grid */}
      {potentialMembers.length > 0 && (
        <div style={{ marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
            <Star color="var(--gold)" fill="var(--gold)" size={20} />
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--coffee-dark)', margin: 0 }}>{t.potentialMembers}</h3>
              <p style={{ fontSize: '12px', color: 'var(--coffee-light)', margin: 0 }}>{t.potentialDesc}</p>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {potentialMembers.map(guest => (
              <div key={guest.id} className="card animate-pop-in" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(to right, #ffffff, #fffdfa)', border: '1px solid #f0e8df' }}>
                <div>
                  <p style={{ fontWeight: '800', fontSize: '15px', color: 'var(--coffee-dark)', marginBottom: '2px' }}>{guest.name}</p>
                  <p style={{ fontSize: '12px', color: 'var(--coffee-light)' }}>{t.times} (LINE): <span style={{ fontWeight: '700', color: 'var(--gold-dark)' }}>{guest.count}</span></p>
                </div>
                <button 
                  onClick={() => registerGuest(guest)}
                  style={{ padding: '8px 12px', borderRadius: '10px', background: 'var(--coffee-dark)', color: 'white', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '700' }}>
                  {t.registerBtn}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Members List */}
      <div className="card" style={{ padding: '0', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #f0e8df', background: '#faf7f4' }}>
              <th style={{ padding: '16px', fontSize: '13px', color: 'var(--coffee-light)' }}>{t.colName}</th>
              <th style={{ padding: '16px', fontSize: '13px', color: 'var(--coffee-light)' }}>{t.colPhone}</th>
              <th style={{ padding: '16px', fontSize: '13px', color: 'var(--coffee-light)', textAlign: 'center' }}>{t.colPoints}</th>
              <th style={{ padding: '16px', fontSize: '13px', color: 'var(--coffee-light)', textAlign: 'right' }}>{t.colSpent}</th>
              <th style={{ padding: '16px', fontSize: '13px', color: 'var(--coffee-light)' }}>{t.colLastVisit}</th>
              <th style={{ padding: '16px', fontSize: '13px', color: 'var(--coffee-light)', textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ padding: '60px', textAlign: 'center' }}>
                  <div className="animate-spin" style={{ display: 'inline-block' }}><Coffee size={32} color="var(--coffee-light)" /></div>
                </td>
              </tr>
            ) : filteredMembers.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '60px', textAlign: 'center', color: 'var(--coffee-light)' }}>{t.noMembers}</td>
              </tr>
            ) : filteredMembers.map((member) => (
              <tr key={member.id} style={{ borderBottom: '1px solid #f0e8df' }} className="hover-row">
                <td style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#fdf6f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>👤</div>
                    <div style={{ fontWeight: '700', color: 'var(--coffee-dark)' }}>{member.name}</div>
                  </div>
                </td>
                <td style={{ padding: '16px', fontSize: '14px', color: 'var(--coffee-medium)', fontWeight: '600' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Phone size={14} color="var(--coffee-light)" />
                    {member.phone}
                  </div>
                </td>
                <td style={{ padding: '16px', textAlign: 'center' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(212,175,55,0.1)', color: 'var(--gold-dark)', padding: '4px 10px', borderRadius: '20px', fontWeight: '800', fontSize: '14px' }}>
                    <Star size={14} fill="currentColor" />
                    {member.points.toLocaleString()}
                  </div>
                </td>
                <td style={{ padding: '16px', textAlign: 'right', fontWeight: '800' }}>
                  ฿{member.total_spent.toLocaleString()}
                </td>
                <td style={{ padding: '16px', fontSize: '12px', color: 'var(--coffee-light)' }}>
                  {member.last_visited ? new Date(member.last_visited).toLocaleDateString('th-TH') : '-'}
                </td>
                <td style={{ padding: '16px', textAlign: 'center' }}>
                  <button 
                    onClick={() => openEdit(member)}
                    style={{ background: 'none', border: 'none', color: 'var(--coffee-medium)', cursor: 'pointer', padding: '4px' }}
                  >
                    <Edit3 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="animate-slide-up" style={{ background: 'white', borderRadius: '24px', padding: '32px', width: '100%', maxWidth: '400px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 className="thai-fix" style={{ fontSize: '20px', fontWeight: '800' }}>{selectedMember ? t.edit : t.addMember}</h2>
              <button onClick={() => setShowAddModal(false)} style={{ background: '#f3f4f6', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '6px', color: 'var(--coffee-medium)' }}>{t.colName}</label>
                <input 
                  type="text" required value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  style={modalInputStyle}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '6px', color: 'var(--coffee-medium)' }}>{t.colPhone}</label>
                <input 
                  type="text" required value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  style={modalInputStyle}
                />
              </div>
              {formData.line_id && (
                <div style={{ opacity: 0.8 }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '4px', color: 'var(--coffee-light)' }}>LINE ID (Linked)</label>
                  <input 
                    type="text" readOnly value={formData.line_id}
                    style={{ ...modalInputStyle, background: '#f5f5f5', fontSize: '13px', color: '#888' }}
                  />
                </div>
              )}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '6px', color: 'var(--coffee-medium)' }}>{t.colPoints}</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <input 
                    type="number" value={formData.points}
                    onChange={e => setFormData({ ...formData, points: parseInt(e.target.value) || 0 })}
                    style={{ ...modalInputStyle, flex: 1 }}
                  />
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button type="button" onClick={() => setFormData({...formData, points: Math.max(0, formData.points - 10)})} style={pointBtnStyle}><Minus size={14}/></button>
                    <button type="button" onClick={() => setFormData({...formData, points: formData.points + 10})} style={pointBtnStyle}><Plus size={14}/></button>
                  </div>
                </div>
              </div>

              <button 
                type="submit" disabled={saving}
                style={{ 
                  marginTop: '12px', padding: '14px', borderRadius: '16px', border: 'none',
                  background: 'var(--coffee-dark)', color: 'white', fontWeight: '800', fontSize: '15px',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'
                }}
              >
                {saving ? <div className="animate-spin"><Coffee size={20}/></div> : <><Save size={20}/> {translations[lang].common.save}</>}
              </button>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .hover-row:hover {
          background-color: #faf7f4;
        }
      `}</style>
    </div>
  )
}

const modalInputStyle = {
  width: '100%', padding: '12px 14px', borderRadius: '12px', border: '1px solid #e8d5c4',
  fontSize: '15px', outline: 'none', background: '#fafafa'
}

const pointBtnStyle = {
  width: '32px', height: '32px', borderRadius: '8px', border: '1px solid #e8d5c4',
  background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
  cursor: 'pointer', color: 'var(--coffee-medium)'
}
