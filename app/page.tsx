import Link from "next/link";

export default function Home() {
  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500">
      
      <div>
        <h1 className="text-3xl font-semibold text-zinc-100 tracking-tight">Ana Panel</h1>
        <p className="text-sm text-zinc-500 mt-1">Ekinoks Mekanik Tesisat Sistemleri - Şantiye Genel Durumu</p>
      </div>

      {/* İSTATİSTİK KARTLARI */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: "Onaylı Malzeme Cinsi", val: "12", desc: "Teknik matriste kayıtlı" },
          { title: "Depo Girişi", val: "45", desc: "Son 7 gün içinde" },
          { title: "Tamamlanan İş", val: "1.240 mt", desc: "Boru montajı" },
          { title: "Saha Ekibi", val: "18", desc: "Aktif çalışan personel" }
        ].map((stat, i) => (
          <div key={i} className="p-5 bg-zinc-900 border border-zinc-800/80 rounded-xl hover:bg-zinc-800/50 transition-colors">
            <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider">{stat.title}</h3>
            <p className="text-2xl font-semibold text-zinc-100 mt-2">{stat.val}</p>
            <p className="text-xs text-zinc-500 mt-1">{stat.desc}</p>
          </div>
        ))}
      </div>

      {/* HIZLI ERİŞİM KISAYOLLARI */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 bg-zinc-900 border border-zinc-800/80 rounded-xl">
          <h2 className="text-sm font-semibold text-zinc-200 mb-4">Hızlı İşlemler</h2>
          <div className="space-y-3">
            <Link href="/malzeme-tipleri" className="flex items-center justify-between p-3 rounded-lg border border-zinc-800 hover:border-zinc-600 bg-zinc-950/50 transition-all group">
              <div>
                <p className="text-sm font-medium text-zinc-300 group-hover:text-zinc-100">Yeni Üretici / Belge Tanımla</p>
                <p className="text-xs text-zinc-500">Teknik onay matrisine yeni veri girin.</p>
              </div>
              <span className="text-zinc-600 group-hover:text-zinc-300">→</span>
            </Link>
            <div className="flex items-center justify-between p-3 rounded-lg border border-zinc-800 bg-zinc-950/30 opacity-50 cursor-not-allowed">
              <div>
                <p className="text-sm font-medium text-zinc-400">Yeni İrsaliye / Malzeme Girişi</p>
                <p className="text-xs text-zinc-500">Yapım aşamasında...</p>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border border-zinc-800 bg-zinc-950/30 opacity-50 cursor-not-allowed">
              <div>
                <p className="text-sm font-medium text-zinc-400">Günlük İmalat Raporu Gir</p>
                <p className="text-xs text-zinc-500">Yapım aşamasında...</p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 bg-zinc-900 border border-zinc-800/80 rounded-xl flex flex-col items-center justify-center text-center space-y-3">
          <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center text-2xl mb-2">🏗️</div>
          <h3 className="text-sm font-medium text-zinc-300">Sistem Hazırlanıyor</h3>
          <p className="text-xs text-zinc-500 max-w-[250px]">
            Malzemeler, iş tanımları ve günlük raporlama modülleri için altyapı çalışmaları devam etmektedir.
          </p>
        </div>
      </div>

    </div>
  );
}