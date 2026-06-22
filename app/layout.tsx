import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Play4Purpose - Golf for Good',
  description: 'Play golf, support charities, win prizes. Monthly prize draw platform for golfers.'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-text font-sans antialiased">
        {children}
      </body>
    </html>
  )
}
