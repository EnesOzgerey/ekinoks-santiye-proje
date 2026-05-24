import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Ekinoks Mekanik | Şantiye Takip",
  description: "Şantiye malzeme ve iş takip sistemi",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className="dark">
      {/* RENK VE TEMA AYARLARINI DOĞRUDAN BODY'YE VERDİK */}
      <body className={`${inter.className} bg-zinc-950 text-zinc-200 antialiased selection:bg-zinc-800`}>
        
        <div className="flex min-h-screen">
          
          {/* SOL MENÜ (SIDEBAR) */}
          <aside className="hidden md:flex flex-col w-64 bg-zinc-900 border-r border-zinc-800/80 fixed h-full z-10 print:hidden">
            <div className="p-6 border-b border-zinc-800/80">
              <h1 className="text-lg font-bold text-zinc-100 tracking-tight">EKİNOKS<span className="text-zinc-500 font-medium">SİSTEM</span></h1>
              <p className="text-[10px] text-zinc-500 font-mono mt-1 uppercase tracking-widest">Şantiye Yönetimi</p>
            </div>
            
            <nav className="flex-1 p-4 space-y-1.5">
              <Link href="/" className="flex items-center px-4 py-2.5 text-sm font-medium rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50 transition-colors">
                Ana Panel
              </Link>
              <Link href="/malzeme-tipleri" className="flex items-center px-4 py-2.5 text-sm font-medium rounded-lg text-zinc-200 bg-zinc-800/50 border border-zinc-700/50 transition-colors">
                Teknik Onay Matrisi
              </Link>
              <Link href="#" className="flex items-center px-4 py-2.5 text-sm font-medium rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50 transition-colors">
                Depo / Malzemeler
              </Link>
              <Link href="#" className="flex items-center px-4 py-2.5 text-sm font-medium rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50 transition-colors">
                İş Kalemleri (Norm)
              </Link>
              <Link href="/gunluk-imalat" className="flex items-center px-4 py-2.5 text-sm font-medium rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50 transition-colors">
                Günlük İmalat
              </Link>
            </nav>

            <div className="p-4 border-t border-zinc-800/80">
              <div className="flex items-center gap-3 px-2">
                <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-400">AÖ</div>
                <div>
                  <p className="text-xs font-medium text-zinc-300">Ahmet Enes Özgerey</p>
                  <p className="text-[10px] text-zinc-500">Saha Mühendisi</p>
                </div>
              </div>
            </div>
          </aside>

          {/* ANA İÇERİK ALANI */}
          <main className="flex-1 md:ml-64 w-full">
            {/* Mobil Header (Sadece mobilde görünür) */}
            <div className="md:hidden flex items-center justify-between p-4 bg-zinc-900 border-b border-zinc-800 print:hidden">
              <h1 className="text-sm font-bold text-zinc-100">EKİNOKS</h1>
              <span className="text-xs text-zinc-500 border border-zinc-700 px-2 py-1 rounded">Menü</span>
            </div>
            
            {children}
          </main>
        </div>

      </body>
    </html>
  );
}