'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'

type Language = 'th' | 'en'

interface LanguageContextType {
  lang: Language
  setLang: (lang: Language) => void
  toggleLang: () => void
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>('th')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // Load saved lang from localStorage
    const saved = localStorage.getItem('app_lang') as Language
    if (saved === 'th' || saved === 'en') {
      setLangState(saved)
    }
    setMounted(true)
  }, [])

  const setLang = (newLang: Language) => {
    setLangState(newLang)
    localStorage.setItem('app_lang', newLang)
  }

  const toggleLang = () => {
    setLang(lang === 'en' ? 'th' : 'en')
  }

  // Prevent hydration mismatch by still providing context with default 'th'
  return (
    <LanguageContext.Provider value={{ lang, setLang, toggleLang }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}
