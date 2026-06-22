import './globals.css'

export const metadata = {
  title: 'Play4Purpose',
  description: 'Play4Purpose MVP'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-background text-white">
        {children}
      </body>
    </html>
  )
}
