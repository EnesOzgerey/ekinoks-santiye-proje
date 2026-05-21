// src/app/page.tsx
import db from '@/lib/db';

export default async function Dashboard() {
  // Son yapılan 5 imalatı çekiyoruz
  let sonYapilanlar: any[] = [];
  try {
    sonYapilanlar = db.prepare(`
      SELECT y.*, i.name as job_name, i.job_group, i.unit_price_tl 
      FROM yapilanlar y
      JOIN isler i ON y.job_id = i.id
      ORDER BY y.id DESC LIMIT 5
    `).all() as any[];
  } catch (e) {
    sonYapilanlar = [];
  }

  // 🛠️ HATA ÇÖZÜMÜ: mt.name yerine c.name (Cins) ve t.company_name (Marka) ilişkilerini bağlıyoruz
  let sonMalzemeler: any[] = [];
  try {
    sonMalzemeler = db.prepare(`
      SELECT m.*, c.name as type_name, t.company_name as brand_name
      FROM malzemeler m
      LEFT JOIN malzeme_tipleri t ON m.material_type_id = t.id
      LEFT JOIN malzeme_cinsleri c ON t.cins_id = c.id
      ORDER BY m.id DESC LIMIT 5
    `).all() as any[];
  } catch (e) {
    sonMalzemeler = [];
  }

  // Finansal Özet Hesaplamaları
  const toplamMaliyetMetraj = sonYapilanlar.reduce((sum, item) => sum + (item.quantity_length * (item.unit_price_tl || 0)), 0);
  
  let depodakiMalzemeSayisi = 0;
  try {
    const res = db.prepare("SELECT COUNT(*) as count FROM malzemeler WHERE situation = 'Depoda'").get() as { count: number };
    depodakiMalzemeSayisi = res?.count || 0;
  } catch (e) {
    depodakiMalzemeSayisi = 0;
  }

  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Genel Bakış</h2>
          <p className="text-sm text-neutral-500 mt-1">Şantiyedeki son durum, imalat akışı ve depo hareketleri.</p>
        </div>
      </div>

      {/* ÖZET KARTLARI */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-white p-6 rounded-lg border border-neutral-200 shadow-sm">
          <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider">Son İmalat Hakediş Değeri</p>
          <p className="text-2xl font-bold mt-2 text-neutral-900">{toplamMaliyetMetraj.toLocaleString('tr-TR')} TL</p>
        </div>
        <div className="bg-white p-6 rounded-lg border border-neutral-200 shadow-sm">
          <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider">Stoktaki Malzeme Girişi</p>
          <p className="text-2xl font-bold mt-2 text-neutral-900">{depodakiMalzemeSayisi} Kalem</p>
        </div>
        <div className="bg-white p-6 rounded-lg border border-neutral-200 shadow-sm">
          <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider">Saha Durumu</p>
          <p className="text-2xl font-bold mt-2 text-green-600">Aktif Çalışma</p>
        </div>
      </div>

      {/* İKİ SÜTUNLU LİSTELEME PANELDEN */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        
        {/* SON İMALATLAR */}
        <div className="bg-white rounded-lg border border-neutral-200 shadow-sm p-6">
          <h3 className="text-sm font-semibold mb-4 text-neutral-500 uppercase tracking-wider">Son Yapılan İmalatlar</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-neutral-600">
              <thead>
                <tr className="border-b border-neutral-100 text-neutral-400 font-medium">
                  <th className="pb-3">İş Tanımı / Sistem</th>
                  <th className="pb-3 text-right">Metraj</th>
                  <th className="pb-3 text-center">Durum</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {sonYapilanlar.map((item) => (
                  <tr key={item.id} className="hover:bg-neutral-50/50">
                    <td className="py-3">
                      <span className="inline-block px-1.5 py-0.5 text-[9px] font-semibold bg-neutral-100 text-neutral-600 rounded mb-0.5">{item.job_group}</span>
                      <div className="font-medium text-neutral-950 text-xs">{item.job_name}</div>
                    </td>
                    <td className="py-3 text-right font-mono text-xs">{item.quantity_length} mt</td>
                    <td className="py-3 text-center">
                      <span className="px-2 py-0.5 text-[11px] rounded-full bg-neutral-50 text-neutral-700 font-medium">{item.situation === 'Tamamlandi' ? 'Tamamlandı' : 'Devam Ediyor'}</span>
                    </td>
                  </tr>
                ))}
                {sonYapilanlar.length === 0 && (
                  <tr><td colSpan={3} className="text-center py-4 text-xs text-neutral-400">Henüz imalat kaydı girilmemiş.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* SON GİREN MALZEMELER */}
        <div className="bg-white rounded-lg border border-neutral-200 shadow-sm p-6">
          <h3 className="text-sm font-semibold mb-4 text-neutral-500 uppercase tracking-wider">Son Giren Malzemeler</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-neutral-600">
              <thead>
                <tr className="border-b border-neutral-100 text-neutral-400 font-medium">
                  <th className="pb-3">Malzeme Cinsi</th>
                  <th className="pb-3">Onaylı Marka</th>
                  <th className="pb-3 text-center">Durum</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {sonMalzemeler.map((item) => (
                  <tr key={item.id} className="hover:bg-neutral-50/50">
                    <td className="py-3 font-medium text-neutral-950 text-xs">{item.type_name || 'Genel Cins'}</td>
                    <td className="py-3 text-xs">{item.brand_name || 'Onaylı Marka'}</td>
                    <td className="py-3 text-center">
                      <span className="px-2 py-0.5 text-[11px] rounded-full bg-green-50 text-green-700 font-medium">Depoda</span>
                    </td>
                  </tr>
                ))}
                {sonMalzemeler.length === 0 && (
                  <tr><td colSpan={3} className="text-center py-4 text-xs text-neutral-400">Henüz depoya giriş yapılmamış.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </>
  );
}