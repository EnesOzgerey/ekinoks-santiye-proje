// src/app/malzeme-deposu/page.tsx
import db from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import Link from 'next/link';

async function ekleMalzeme(formData: FormData) {
  'use server';
  const material_type_id = formData.get('material_type_id') as string;
  const brand = formData.get('brand') as string;
  const certificate = formData.get('certificate') as string;
  const situation = formData.get('situation') as string;
  const arrival_date = new Date().toISOString().split('T')[0];

  if (!material_type_id) return;

  const insert = db.prepare(`
    INSERT INTO malzemeler (material_type_id, brand, certificate, situation, arrival_date) 
    VALUES (?, ?, ?, ?, ?)
  `);
  insert.run(material_type_id, brand, certificate, situation, arrival_date);

  revalidatePath('/malzeme-deposu');
}

async function silMalzeme(formData: FormData) {
  'use server';
  const id = formData.get('id') as string;
  if (!id) return;

  db.prepare('DELETE FROM malzemeler WHERE id = ?').run(id);
  revalidatePath('/malzeme-deposu');
}

export default async function MalzemeDeposuPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const params = await searchParams;
  const editId = params.edit;

  // Cins ve Markayı birleştirerek Dropdown alanını besliyoruz
  const malzemeTipleri = db.prepare(`
    SELECT t.id, (c.name || ' - ' || t.company_name) as name 
    FROM malzeme_tipleri t
    JOIN malzeme_cinsleri c ON t.cins_id = c.id
    ORDER BY c.name ASC, t.company_name ASC
  `).all() as any[];

  // Depodaki girişleri yeni matris mimarisine göre çekiyoruz
  const malzemeler = db.prepare(`
    SELECT m.*, c.name as cins_name, t.company_name as brand_name, t.belge_no
    FROM malzemeler m
    LEFT JOIN malzeme_tipleri t ON m.material_type_id = t.id
    LEFT JOIN malzeme_cinsleri c ON t.cins_id = c.id
    ORDER BY m.id DESC
  `).all() as any[];

  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Malzeme Deposu</h2>
          <p className="text-sm text-neutral-500 mt-1">Onaylı teknik matrise göre sahaya malzeme kabulü ve stok yönetimi.</p>
        </div>
        <Link 
          href="/malzeme-tipleri" 
          className="px-4 py-2 text-sm font-medium border border-neutral-200 bg-white hover:bg-neutral-50 rounded-md shadow-sm transition flex items-center gap-2"
        >
          ⚙ Teknik Onay Matrisini Yönet
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        
        {/* MALZEME GİRİŞ FORMU */}
        <div className="bg-white p-6 rounded-lg border border-neutral-200 shadow-sm h-fit">
          <h3 className="text-sm font-semibold mb-4 text-neutral-500 uppercase tracking-wider">Yeni Malzeme Girişi</h3>
          <form action={ekleMalzeme} className="space-y-4">
            <div>
              <label htmlFor="material_type_id" className="block text-xs font-medium text-neutral-500 mb-1">Onaylı Malzeme / Marka *</label>
              <select id="material_type_id" name="material_type_id" required defaultValue="" className="w-full px-3 py-2 border border-neutral-200 bg-white rounded-md text-sm focus:outline-none focus:border-neutral-900 transition">
                <option value="" disabled>Onaylı referans seçiniz...</option>
                {malzemeTipleri.map((tip) => (
                  <option key={tip.id} value={tip.id}>{tip.name}</option>
                ))}
              </select>
              {malzemeTipleri.length === 0 && (
                <p className="text-xs text-amber-600 mt-1">⚠️ Önce "Teknik Onay Matrisi" sayfasından cins ve üretici tanımlamalısınız.</p>
              )}
            </div>

            <div>
              <label htmlFor="brand" className="block text-xs font-medium text-neutral-500 mb-1">Teslim Alınan Detay Marka / Tedarikçi</label>
              <input type="text" id="brand" name="brand" placeholder="Örn: Kalde / Merkez Depo" className="w-full px-3 py-2 border border-neutral-200 rounded-md text-sm focus:outline-none focus:border-neutral-900 transition" />
            </div>

            <div>
              <label htmlFor="certificate" className="block text-xs font-medium text-neutral-500 mb-1">Sevk İrsaliyesi No</label>
              <input type="text" id="certificate" name="certificate" placeholder="Örn: IRS-2026-001" className="w-full px-3 py-2 border border-neutral-200 rounded-md text-sm focus:outline-none focus:border-neutral-900 transition" />
            </div>

            <div>
              <label htmlFor="situation" className="block text-xs font-medium text-neutral-500 mb-1">Depo Durumu</label>
              <select id="situation" name="situation" defaultValue="Depoda" className="w-full px-3 py-2 border border-neutral-200 bg-white rounded-md text-sm focus:outline-none focus:border-neutral-900 transition">
                <option value="Depoda">Depoda (Kullanıma Hazır)</option>
                <option value="Kullanildi">Sahaya Çıktı / İmalatta</option>
                <option value="Hasarli">Hasarlı / Fire</option>
              </select>
            </div>

            <button type="submit" className="w-full px-4 py-2 text-sm font-medium bg-neutral-900 hover:bg-neutral-800 text-white rounded-md shadow-sm transition">
              Malzemeyi Depoya Kabul Et
            </button>
          </form>
        </div>

        {/* STOK / DEPO LİSTESİ */}
        <div className="lg:col-span-3 bg-white rounded-lg border border-neutral-200 shadow-sm p-6">
          <h3 className="text-sm font-semibold mb-4 text-neutral-500 uppercase tracking-wider">Depo Stok Hareketleri ({malzemeler.length})</h3>
          {malzemeler.length === 0 ? (
            <p className="text-sm text-neutral-400 py-4 text-center">Henüz depoya malzeme girişi yapılmamış.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-neutral-600">
                <thead>
                  <tr className="border-b border-neutral-100 text-neutral-400 font-medium">
                    <th className="pb-3">Onaylı Malzeme Cinsi</th>
                    <th className="pb-3">Üretici / Marka</th>
                    <th className="pb-3">TSE Belge No</th>
                    <th className="pb-3">İrsaliye</th>
                    <th className="pb-3 text-center">Durum</th>
                    <th className="pb-3 text-right">İşlem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {malzemeler.map((malzeme) => (
                    <tr key={malzeme.id} className="hover:bg-neutral-50/50">
                      <td className="py-3 font-medium text-neutral-950">{malzeme.cins_name || <span className="text-red-500 italic">Tanımsız Cins</span>}</td>
                      <td className="py-3 text-neutral-700">
                        <div>{malzeme.brand_name}</div>
                        <span className="text-[10px] text-neutral-400 block">{malzeme.brand ? `Detay: ${malzeme.brand}` : ''}</span>
                      </td>
                      <td className="py-3 font-mono text-xs text-neutral-500">{malzeme.belge_no || '-'}</td>
                      <td className="py-3 font-mono text-xs text-neutral-500">{malzeme.certificate || '-'}</td>
                      <td className="py-3 text-center">
                        <span className={`inline-block px-2 py-0.5 text-xs rounded-full font-medium ${
                          malzeme.situation === 'Depoda' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-neutral-100 text-neutral-700'
                        }`}>
                          {malzeme.situation === 'Depoda' ? 'Depoda' : 'Sahada'}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <form action={silMalzeme}>
                          <input type="hidden" name="id" value={malzeme.id} />
                          <button type="submit" className="text-xs font-semibold text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50">Sil</button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </>
  );
}