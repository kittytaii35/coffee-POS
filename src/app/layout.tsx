import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { SettingsProvider } from '@/context/SettingsContext'

import { LanguageProvider } from '@/context/LanguageContext'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Queen Coffee - POS',
  description: 'Coffee shop ordering and POS system',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <LanguageProvider>
          <SettingsProvider>
            {children}
          </SettingsProvider>
        </LanguageProvider>
      </body>
    </html>
  )
}
