import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import AppShell from '../components/Layout/AppShell'

const inter = Inter({ subsets: ['latin'], display: 'swap' })

export const metadata: Metadata = {
  title: 'Play4Purpose - Golf for Good',
  description: 'Play golf, support charities, win prizes. Monthly prize draw platform for golfers.'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen antialiased`}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  )
}
