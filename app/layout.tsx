// src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Şantiye Takip Sistemi",
  description: "Minimalist Şantiye Yönetim Paneli",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body className="antialiased bg-neutral-50 font-sans text-neutral-900">
        
        {/* TÜM SİSTEMİ KAPSAYAN ANA ESNEK YAPI */}
        <div className="flex h-screen overflow-hidden">
          
          {/* SABİT SOL MENÜ (SIDEBAR) - ARTIK TEK BİR YERDE */}
          <aside className="w-64 border-r border-neutral-200 bg-white p-6 flex flex-col justify-between shrink-0">
            <div>
              <div className="mb-8">
                <h1 className="text-lg font-bold tracking-tight text-neutral-900">ŞANTİYE TAKİP</h1>
                <p className="text-xs text-neutral-400 mt-1">v1.0.0 Prototip</p>
              </div>
              
              <nav className="space-y-1">
                <Link href="/" className="flex items-center px-3 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 hover:text-neutral-950 rounded-md transition">
                  Genel Bakış
                </Link>
                <Link href="/yapilan-imalatlar" className="flex items-center px-3 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 hover:text-neutral-950 rounded-md transition">
                  Yapılan İmalatlar
                </Link>
                <Link href="/is-tanimlari" className="flex items-center px-3 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 hover:text-neutral-950 rounded-md transition">
                  İş Tanımları (mt/TL)
                </Link>
                <Link href="/malzeme-deposu" className="flex items-center px-3 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 hover:text-neutral-950 rounded-md transition">
                  Malzeme Deposu
                </Link>
                <Link href="/malzeme-tipleri" className="flex items-center px-3 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 hover:text-neutral-950 rounded-md transition">
                  Malzeme Tipleri
                </Link>
                <Link href="/fotograf-arsivi" className="flex items-center px-3 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 hover:text-neutral-950 rounded-md transition">
                  Fotoğraf Arşivi
                </Link>
              </nav>
            </div>
            <div className="border-t border-neutral-100 pt-4 text-xs text-neutral-400">
              Giriş: Yerel Oturum
            </div>
          </aside>

          {/* DİNAMİK DEĞİŞEN SAĞ İÇERİK ALANI */}
          <main className="flex-1 overflow-y-auto p-10">
            {children}
          </main>

        </div>

      </body>
    </html>
  );
}