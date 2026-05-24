import type { Metadata } from 'next'
import { Inter } from 'next/font/google' // Veya projende hangi fontu kullanıyorsan
import './globals.css'
import TopNav from './components/TopNav'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Şantiye Yönetim Sistemi',
  description: 'Ekinoks Mekanik',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="tr" className="dark">
      <body className={`${inter.className} bg-zinc-950 text-zinc-200 min-h-screen antialiased`}>
        
        {/* YENİ SAĞ ÜST YUVARLAK İKONLU MENÜ */}
        <TopNav />

        {/* pt-20 (Üst boşluk) TAMAMEN KALDIRILDI. */}
        {/* Sayfalar kendi iç (padding) boşluklarını kullanacak ve sol üstten başlayacak. */}
        <main className="w-full min-h-screen pb-10">
          {children}
        </main>

      </body>
    </html>
  )
}