'use client'

import React, { useState, useEffect } from 'react'
import { 
  Plus, Search, Edit3, Trash2, CheckCircle2, 
  XSquare, Coffee, Tag, DollarSign, Image as ImageIcon,
  Save, X, Loader2
} from 'lucide-react'
import { useSettings } from '@/context/SettingsContext'

interface Product {
  id: string
  product_id: string
  name: string
  name_th: string
  price: number
  category_id: string
  available: boolean
  sweetness_options: boolean
  toppings: string[]
  image?: string
}

interface Category {
  id: string
  label: string
  label_th: string
  emoji: string
  sort_order: number
}

export default function ProductManager() {
  const { settings } = useSettings()
  const currency = settings.pos.currency
  
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('ALL')

  // UI States
  const [isEditing, setIsEditing] = useState(false)
  const [currentProduct, setCurrentProduct] = useState<Partial<Product> | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const loadData = async () => {
    try {
      const res = await fetch('/api/menu')
      const data = await res.json()
      if (!data.error) {
        setProducts(data.products || [])
        setCategories(data.categories || [])
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleEdit = (prod?: Product) => {
    setCurrentProduct(prod ? { ...prod } : {
      name: '', name_th: '', price: 0, category_id: categories[0]?.id || '',
      available: true, sweetness_options: true, toppings: []
    })
    setIsEditing(true)
  }

  const handleSave = async () => {
    if (!currentProduct || !currentProduct.name || !currentProduct.price) {
      return alert('Please fill in Name and Price')
    }
    setSubmitting(true)
    try {
       const res = await fetch('/api/menu', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ action: 'upsert', table: 'products', data: currentProduct })
       })
       if (res.ok) {
         setIsEditing(false)
         await loadData()
       }
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return
    await fetch('/api/menu', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', table: 'products', data: { id } })
    })
    await loadData()
  }

  const filtered = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
                         p.name_th.includes(search)
    const matchesCat = categoryFilter === 'ALL' || p.category_id === categoryFilter
    return matchesSearch && matchesCat
  })

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading Products...</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Header & Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: '900', color: 'var(--coffee-dark)' }}>Menu Management</h2>
          <p style={{ color: 'var(--coffee-light)', fontSize: '14px' }}>Add, edit, or manage your coffee shop offerings.</p>
        </div>
        <button onClick={() => handleEdit()} style={btnAddStyle}>
          <Plus size={18} /> Add New Product
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
          <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} size={18} />
          <input 
            type="text" placeholder="Search menu..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ ...inputStyle, paddingLeft: '40px' }}
          />
        </div>
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} style={selectStyle}>
          <option value="ALL">All Categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>)}
        </select>
        <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--coffee-light)' }}>
          {filtered.length} items found
        </div>
      </div>

      {/* Product List */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
        {filtered.map(p => (
          <div key={p.id} style={cardStyle}>
            <div style={{ position: 'relative', height: '140px', background: '#f9fafb', borderRadius: '12px', overflow: 'hidden', marginBottom: '16px' }}>
              {p.image ? (
                <img src={p.image} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d1d5db' }}>
                  <ImageIcon size={40} />
                </div>
              )}
              <div style={{ position: 'absolute', top: '10px', right: '10px', display: 'flex', gap: '6px' }}>
                <button onClick={() => handleEdit(p)} style={iconBtnStyle('edit')}><Edit3 size={14} /></button>
                <button onClick={() => handleDelete(p.id)} style={iconBtnStyle('delete')}><Trash2 size={14} /></button>
              </div>
              <div style={badgeStyle(p.available)}>
                {p.available ? 'AVAILABLE' : 'OUT OF STOCK'}
              </div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h4 style={{ fontWeight: '800', fontSize: '16px', color: 'var(--coffee-dark)' }}>{p.name}</h4>
                <p style={{ fontSize: '13px', color: 'var(--coffee-light)', margin: '2px 0 8px' }}>{p.name_th}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={catTagStyle}>
                    {categories.find(c => c.id === p.category_id)?.emoji} {categories.find(c => c.id === p.category_id)?.label}
                  </span>
                </div>
              </div>
              <div style={{ fontSize: '20px', fontWeight: '900', color: 'var(--gold)' }}>
                 {currency}{p.price.toLocaleString()}
              </div>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
         <div style={{ padding: '80px', textAlign: 'center', background: 'white', borderRadius: '20px', border: '2px dashed #f0e8df' }}>
           <Coffee size={48} color="#d1d5db" style={{ marginBottom: '16px' }} />
           <p style={{ color: 'var(--coffee-light)', fontWeight: '600' }}>No products match your search.</p>
         </div>
      )}

      {/* Editor Modal */}
      {isEditing && (
        <div style={modalOverlay}>
          <div style={modalContent}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: '900' }}>
                {currentProduct?.id ? 'Edit Product' : 'Add New Product'}
              </h3>
              <button onClick={() => setIsEditing(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <Field label="Name (EN)" value={currentProduct?.name} onChange={(v: string) => setCurrentProduct({...currentProduct!, name: v})} />
                <Field label="Name (TH)" value={currentProduct?.name_th} onChange={(v: string) => setCurrentProduct({...currentProduct!, name_th: v})} />
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                   <label style={labelStyle}>Category</label>
                   <select 
                    value={currentProduct?.category_id} onChange={e => setCurrentProduct({...currentProduct!, category_id: e.target.value})} 
                    style={selectStyle}
                   >
                     {categories.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>)}
                   </select>
                </div>
                <Field label={`Price (${currency})`} type="number" value={currentProduct?.price} onChange={(v: string) => setCurrentProduct({...currentProduct!, price: parseFloat(v)})} />
              </div>

              <Field label="Image URL (Public Link)" value={currentProduct?.image} onChange={(v: string) => setCurrentProduct({...currentProduct!, image: v})} placeholder="https://..." />

              <div style={{ display: 'flex', gap: '24px', padding: '16px', background: '#f9fafb', borderRadius: '12px' }}>
                 <ToggleField label="Available" active={!!currentProduct?.available} onToggle={(v: boolean) => setCurrentProduct({...currentProduct!, available: v})} />
                 <ToggleField label="Sweetness Options" active={!!currentProduct?.sweetness_options} onToggle={(v: boolean) => setCurrentProduct({...currentProduct!, sweetness_options: v})} />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                <button onClick={handleSave} disabled={submitting} style={btnSaveMain}>
                  {submitting ? <Loader2 className="spin" size={18} /> : <Save size={18} />} Save Changes
                </button>
                <button onClick={() => setIsEditing(false)} style={btnCancel}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

// ─── Sub-components ───

function Field({ label, value, onChange, type = 'text', placeholder }: any) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <label style={labelStyle}>{label}</label>
      <input 
        type={type} value={value || ''} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} style={inputStyle}
      />
    </div>
  )
}

function ToggleField({ label, active, onToggle }: any) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <div 
        onClick={() => onToggle(!active)}
        style={{
          width: '36px', height: '18px', borderRadius: '9px',
          background: active ? '#22c55e' : '#d1d5db',
          position: 'relative', cursor: 'pointer', transition: 'all 0.2s'
        }}
      >
        <div style={{
          position: 'absolute', top: '2px', left: active ? '20px' : '2px',
          width: '14px', height: '14px', borderRadius: '50%', background: 'white', transition: 'all 0.2s'
        }} />
      </div>
      <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--coffee-dark)' }}>{label}</span>
    </div>
  )
}

// ─── Styles ───

const cardStyle = {
  background: 'white', borderRadius: '20px', padding: '16px',
  border: '1px solid #f0e8df', boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
  transition: 'transform 0.2s', cursor: 'default'
}

const catTagStyle = {
  padding: '4px 8px', background: '#f5f5f5', borderRadius: '6px',
  fontSize: '11px', fontWeight: '700', color: '#6b7280'
}

const badgeStyle = (avail: boolean) => ({
  position: 'absolute' as const, bottom: '10px', left: '10px',
  padding: '4px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '900',
  background: avail ? 'rgba(34,197,94,0.9)' : 'rgba(239,68,68,0.9)',
  color: 'white', backdropFilter: 'blur(4px)'
})

const iconBtnStyle = (type: 'edit' | 'delete') => ({
  width: '28px', height: '28px', borderRadius: '8px', 
  background: type === 'edit' ? 'white' : 'rgba(239,68,68,0.1)',
  color: type === 'edit' ? 'var(--coffee-dark)' : '#ef4444',
  border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
})

const btnAddStyle = {
  padding: '12px 20px', background: 'var(--coffee-dark)', color: 'white',
  borderRadius: '12px', border: 'none', fontWeight: '700', cursor: 'pointer',
  display: 'flex', alignItems: 'center', gap: '8px'
}

const inputStyle = {
  padding: '10px 14px', borderRadius: '10px', border: '1px solid #e5e7eb',
  fontSize: '14px', width: '100%', outline: 'none'
}

const selectStyle = {
  padding: '10px 14px', borderRadius: '10px', border: '1px solid #e5e7eb',
  fontSize: '14px', outline: 'none', background: 'white'
}

const labelStyle = { fontSize: '13px', fontWeight: '700', color: 'var(--coffee-medium)' }

const modalOverlay = {
  position: 'fixed' as const, top: 0, left: 0, right: 0, bottom: 0,
  background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
}

const modalContent = {
  background: 'white', borderRadius: '24px', padding: '32px', width: '100%', maxWidth: '600px',
  boxShadow: '0 20px 50px rgba(0,0,0,0.2)'
}

const btnSaveMain = {
  flex: 2, padding: '12px', background: 'var(--coffee-dark)', color: 'white',
  borderRadius: '12px', border: 'none', fontWeight: '700', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
}

const btnCancel = {
  flex: 1, padding: '12px', background: '#f3f4f6', color: '#6b7280',
  borderRadius: '12px', border: 'none', fontWeight: '700', cursor: 'pointer'
}
