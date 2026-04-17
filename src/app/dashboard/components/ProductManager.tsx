'use client'

import React, { useState, useEffect } from 'react'
import { 
  Plus, Search, Edit3, Trash2, CheckCircle2, 
  XSquare, Coffee, Tag, DollarSign, Image as ImageIcon,
  Save, X, Loader2
} from 'lucide-react'
import { useSettings } from '@/context/SettingsContext'
import { useLanguage } from '@/context/LanguageContext'
import { translations } from '@/lib/translations'

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
  const { lang } = useLanguage()
  const t = translations[lang].productManager
  const currency = settings.pos.currency
  
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('ALL')
  const [availFilter, setAvailFilter] = useState('ALL') // 'ALL' | 'available' | 'out'
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  // UI States
  const [isEditing, setIsEditing] = useState(false)
  const [isManagingCats, setIsManagingCats] = useState(false)
  const [currentProduct, setCurrentProduct] = useState<Partial<Product> | null>(null)
  const [currentCat, setCurrentCat] = useState<Partial<Category> | null>(null)
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
      return alert(t.fillRequired)
    }
    setSubmitting(true)
    try {
       // Clean joined data before upsert
       const { categories: _, ...cleanData } = currentProduct as any
       const res = await fetch('/api/menu', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ action: 'upsert', table: 'products', data: cleanData })
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
    if (!confirm(t.confirmDel)) return
    await fetch('/api/menu', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', table: 'products', data: { id } })
    })
    await loadData()
  }

  const handleSaveCat = async () => {
    if (!currentCat || !currentCat.label || !currentCat.label_th) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'upsert', 
          table: 'categories', 
          data: { ...currentCat, sort_order: currentCat.sort_order || categories.length } 
        })
      })
      if (res.ok) {
        setCurrentCat(null)
        await loadData()
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteCat = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category? Products in this category might not show up.')) return
    await fetch('/api/menu', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', table: 'categories', data: { id } })
    })
    await loadData()
  }

  const filtered = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
                         p.name_th.includes(search)
    const matchesCat = categoryFilter === 'ALL' || p.category_id === categoryFilter
    const matchesAvail = availFilter === 'ALL' || (availFilter === 'available' ? p.available : !p.available)
    return matchesSearch && matchesCat && matchesAvail
  })

  const toggleAvailability = async (p: Product) => {
    try {
      // Remove joined data (categories object) before updating
      const { categories: _, ...cleanData } = p as any
      const res = await fetch('/api/menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'upsert', 
          table: 'products', 
          data: { ...cleanData, available: !p.available } 
        })
      })
      if (res.ok) await loadData()
    } catch (err) {
      console.error('Toggle error:', err)
    }
  }

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Header & Controls */}
      <div className="header-content" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 className="thai-fix" style={{ fontSize: '22px', fontWeight: '900', color: 'var(--coffee-dark)' }}>{t.menuTitle}</h2>
          <p className="thai-fix" style={{ color: 'var(--coffee-light)', fontSize: '14px' }}>{t.menuDesc}</p>
        </div>
        <div className="header-actions" style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => setIsManagingCats(true)} style={btnSecondaryStyle}>
            <Tag size={18} /> {lang === 'th' ? 'หมวดหมู่' : 'Cats'}
          </button>
          <button onClick={() => handleEdit()} style={btnAddStyle}>
            <Plus size={18} /> {t.addBtn}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
          <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} size={18} />
          <input 
            type="text" placeholder={t.searchHolder} value={search} onChange={e => setSearch(e.target.value)}
            style={{ ...inputStyle, paddingLeft: '40px' }}
          />
        </div>
        
        {/* Availability Filter */}
        <select value={availFilter} onChange={e => setAvailFilter(e.target.value)} style={selectStyle}>
          <option value="ALL">{lang === 'th' ? 'สถานะทั้งหมด' : 'All Status'}</option>
          <option value="available">{t.available}</option>
          <option value="out">{t.outStock}</option>
        </select>

        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} style={selectStyle}>
          <option value="ALL">{t.allCat}</option>
          {categories.filter((c: Category) => c.id !== 'all').map((c: Category) => <option key={c.id} value={c.id}>{c.emoji} {lang === 'en' ? c.label : c.label_th}</option>)}
        </select>

        {/* View Toggle */}
        <div style={{ display: 'flex', background: '#f3f4f6', padding: '4px', borderRadius: '10px', gap: '4px' }}>
          <button 
            onClick={() => setViewMode('grid')} 
            style={{ ...toggleBtnStyle, background: viewMode === 'grid' ? 'white' : 'transparent', boxShadow: viewMode === 'grid' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none' }}
          >
             Grid
          </button>
          <button 
            onClick={() => setViewMode('list')} 
            style={{ ...toggleBtnStyle, background: viewMode === 'list' ? 'white' : 'transparent', boxShadow: viewMode === 'list' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none' }}
          >
             List
          </button>
        </div>

        <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--coffee-light)' }}>
          {filtered.length} {t.itemsFound}
        </div>
      </div>

      {/* Product List */}
      {viewMode === 'grid' ? (
        <div className="card-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
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
                <div 
                  onClick={() => toggleAvailability(p)}
                  style={{ ...badgeStyle(p.available), cursor: 'pointer', border: 'none' }}
                  title={p.available ? 'Click to mark as Out of Stock' : 'Click to mark as Available'}
                >
                  {p.available ? t.available : t.outStock}
                </div>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h4 className="thai-fix" style={{ fontWeight: '800', fontSize: '16px', color: 'var(--coffee-dark)' }}>{p.name}</h4>
                  <p className="thai-fix" style={{ fontSize: '13px', color: 'var(--coffee-light)', margin: '2px 0 8px' }}>{p.name_th}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={catTagStyle}>
                      {categories.find(c => c.id === p.category_id)?.emoji} {lang === 'en' ? categories.find(c => c.id === p.category_id)?.label : categories.find(c => c.id === p.category_id)?.label_th}
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
      ) : (
        /* List View */
        <div style={{ background: 'white', border: '1px solid #f0e8df', borderRadius: '16px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: '#fafcfb', borderBottom: '2px solid #f0e8df' }}>
              <tr>
                <th style={thStyle}>{t.imgUrl}</th>
                <th style={thStyle}>{t.nameEn}</th>
                <th style={thStyle}>{t.cat}</th>
                <th style={thStyle}>{t.price}</th>
                <th style={thStyle}>{t.isAvail}</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p: Product) => (
                <tr key={p.id} style={{ borderBottom: '1px solid #f0e8df' }}>
                  <td style={{ padding: '12px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '8px', overflow: 'hidden', background: '#f3f4f6' }}>
                      {p.image ? <img src={p.image} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <ImageIcon size={20} style={{ margin: '10px' }} />}
                    </div>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <p style={{ fontWeight: '700', color: 'var(--coffee-dark)' }}>{p.name}</p>
                    <p style={{ fontSize: '12px', color: 'var(--coffee-light)' }}>{p.name_th}</p>
                  </td>
                  <td style={{ padding: '12px' }}>
                     <span style={catTagStyle}>
                        {categories.find(c => c.id === p.category_id)?.emoji} {lang === 'en' ? categories.find(c => c.id === p.category_id)?.label : categories.find(c => c.id === p.category_id)?.label_th}
                     </span>
                  </td>
                  <td style={{ padding: '12px', fontWeight: '800', color: 'var(--gold)' }}>{currency}{p.price}</td>
                  <td style={{ padding: '12px' }}>
                    <button 
                      onClick={() => toggleAvailability(p)}
                      style={{ 
                        padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '800', cursor: 'pointer',
                        background: p.available ? '#d1fae5' : '#fee2e2', color: p.available ? '#059669' : '#dc2626', border: 'none'
                      }}>
                      {p.available ? t.available : t.outStock}
                    </button>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => handleEdit(p)} style={iconBtnStyle('edit')}><Edit3 size={14} /></button>
                      <button onClick={() => handleDelete(p.id)} style={iconBtnStyle('delete')}><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {filtered.length === 0 && (
         <div style={{ padding: '80px', textAlign: 'center', background: 'white', borderRadius: '20px', border: '2px dashed #f0e8df' }}>
           <Coffee size={48} color="#d1d5db" style={{ marginBottom: '16px' }} />
           <p style={{ color: 'var(--coffee-light)', fontWeight: '600' }}>{t.noProducts}</p>
         </div>
      )}

      {/* Managing Categories Modal */}
      {isManagingCats && (
        <div style={modalOverlay}>
          <div className="modal-full-mobile" style={{ ...modalContent, maxWidth: '500px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: '900' }}>{lang === 'th' ? 'จัดการหมวดหมู่' : 'Manage Categories'}</h3>
              <button onClick={() => setIsManagingCats(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X /></button>
            </div>

            {/* List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px', maxHeight: '300px', overflowY: 'auto' }}>
              {categories.filter((c: any) => c.id !== 'all').map((c: any) => (
                <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: '#f9fafb', borderRadius: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '20px' }}>{c.emoji}</span>
                    <div>
                      <p style={{ fontWeight: '700', fontSize: '14px' }}>{c.label}</p>
                      <p style={{ fontSize: '12px', color: '#6b7280' }}>{c.label_th}</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button onClick={() => setCurrentCat(c)} style={iconBtnStyle('edit')}><Edit3 size={14} /></button>
                    <button onClick={() => handleDeleteCat(c.id)} style={iconBtnStyle('delete')}><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add/Edit Form */}
            <div style={{ borderTop: '2px dashed #f0e8df', paddingTop: '24px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: '800', marginBottom: '16px' }}>{currentCat?.id ? 'Edit Category' : 'Add New Category'}</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <Field label="Label EN" value={currentCat?.label} onChange={(v: string) => setCurrentCat({ ...currentCat, label: v })} />
                  <Field label="Label TH" value={currentCat?.label_th} onChange={(v: string) => setCurrentCat({ ...currentCat, label_th: v })} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px' }}>
                   <Field label="Emoji" value={currentCat?.emoji} onChange={(v: string) => setCurrentCat({ ...currentCat, emoji: v })} placeholder="🥤" />
                   <Field label="Order" type="number" value={currentCat?.sort_order} onChange={(v: string) => setCurrentCat({ ...currentCat, sort_order: parseInt(v) })} />
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                   <button onClick={handleSaveCat} disabled={submitting} style={btnSaveMain}>
                      {submitting ? <Loader2 className="spin" size={16} /> : <Save size={16} />} {lang === 'th' ? 'บันทึก' : 'Save'}
                   </button>
                   {currentCat && <button onClick={() => setCurrentCat(null)} style={btnCancel}>Cancel</button>}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Editor Modal */}
      {isEditing && (
        <div style={modalOverlay}>
          <div className="modal-full-mobile" style={modalContent}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: '900' }}>
                {currentProduct?.id ? t.editTitle : t.addTitle}
              </h3>
              <button onClick={() => setIsEditing(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <Field label={t.nameEn} value={currentProduct?.name} onChange={(v: string) => setCurrentProduct({...currentProduct!, name: v})} />
                <Field label={t.nameTh} value={currentProduct?.name_th} onChange={(v: string) => setCurrentProduct({...currentProduct!, name_th: v})} />
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                   <label style={labelStyle}>{t.cat}</label>
                   <select 
                    value={currentProduct?.category_id} onChange={e => setCurrentProduct({...currentProduct!, category_id: e.target.value})} 
                    style={selectStyle}
                   >
                     {categories.filter((c: any) => c.id !== 'all').map((c: any) => <option key={c.id} value={c.id}>{c.emoji} {lang === 'en' ? c.label : c.label_th}</option>)}
                   </select>
                </div>
                <Field label={`${t.price} (${currency})`} type="number" value={currentProduct?.price} onChange={(v: string) => setCurrentProduct({...currentProduct!, price: parseFloat(v)})} />
              </div>

              <Field label={t.imgUrl} value={currentProduct?.image} onChange={(v: string) => setCurrentProduct({...currentProduct!, image: v})} placeholder="https://..." />

              <div style={{ display: 'flex', gap: '24px', padding: '16px', background: '#f9fafb', borderRadius: '12px' }}>
                 <ToggleField label={t.isAvail} active={!!currentProduct?.available} onToggle={(v: boolean) => setCurrentProduct({...currentProduct!, available: v})} />
                 <ToggleField label={t.sweetOptions} active={!!currentProduct?.sweetness_options} onToggle={(v: boolean) => setCurrentProduct({...currentProduct!, sweetness_options: v})} />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                <button onClick={handleSave} disabled={submitting} style={btnSaveMain}>
                  {submitting ? <Loader2 className="spin" size={18} /> : <Save size={18} />} {t.saveChanges}
                </button>
                <button onClick={() => setIsEditing(false)} style={btnCancel}>{t.cancel}</button>
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
  transition: 'transform 0.2s', cursor: 'default',
  display: 'flex', flexDirection: 'column' as const
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

const btnSecondaryStyle = {
  padding: '12px 20px', background: '#f3f4f6', color: 'var(--coffee-dark)',
  borderRadius: '12px', border: '1px solid #e5e7eb', fontWeight: '700', cursor: 'pointer',
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

const toggleBtnStyle = {
  padding: '6px 16px', borderRadius: '7px', fontSize: '12px', fontWeight: '800',
  color: 'var(--coffee-dark)', cursor: 'pointer', border: 'none', transition: 'all 0.2s'
}

const thStyle = {
  padding: '12px', textAlign: 'left' as const, fontSize: '12px', 
  fontWeight: '800', color: 'var(--coffee-light)', textTransform: 'uppercase' as const, letterSpacing: '0.5px'
}
