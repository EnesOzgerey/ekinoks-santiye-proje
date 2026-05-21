// src/app/is-tanimlari/page.tsx
import db from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import Link from 'next/link';

// Sabit İş Grupları Listesi
const IS_GRUPLARI = [
  "Yangın Söndürme Sistemi",
  "Havalandırma Sistemi",
  "Sıhhi Tesisat Pis Su ve Temiz Su Sistemi",
  "Klima Drenaj Borulama",
  "Radye İçi Temel Borulama"
];

// 1. İŞ TANIMI EKLEME İŞLEMİ (SERVER ACTION)
async function ekleIsTanimi(formData: FormData) {
  'use server';
  const name = formData.get('name') as string;
  const job_group = formData.get('job_group') as string;
  const unit_price_tl = formData.get('unit_price_tl') as string;
  const person_min = formData.get('person_min') as string;
  const report_template = formData.get('report_template') as string;

  if (!name || !job_group) return;

  const insert = db.prepare(`
    INSERT INTO isler (name, job_group, unit_price_tl, person_min, report_template) 
    VALUES (?, ?, ?, ?, ?)
  `);
  insert.run(
    name, 
    job_group, 
    unit_price_tl ? parseFloat(unit_price_tl) : 0, 
    person_min ? parseInt(person_min) : 0, 
    report_template
  );

  revalidatePath('/is-tanimlari');
}

// 2. İŞ TANIMI GÜNCELLEME İŞLEMİ (SERVER ACTION)
async function guncelleIsTanimi(formData: FormData) {
  'use server';
  const id = formData.get('id') as string;
  const name = formData.get('name') as string;
  const job_group = formData.get('job_group') as string;
  const unit_price_tl = formData.get('unit_price_tl') as string;
  const person_min = formData.get('person_min') as string;
  const report_template = formData.get('report_template') as string;

  if (!id || !name || !job_group) return;

  const update = db.prepare(`
    UPDATE isler 
    SET name = ?, job_group = ?, unit_price_tl = ?, person_min = ?, report_template = ? 
    WHERE id = ?
  `);
  update.run(
    name, 
    job_group, 
    unit_price_tl ? parseFloat(unit_price_tl) : 0, 
    person_min ? parseInt(person_min) : 0, 
    report_template, 
    id
  );

  revalidatePath('/is-tanimlari');
  redirect('/is-tanimlari');
}

// 3. İŞ TANIMI SİLME İŞLEMİ (SERVER ACTION)
async function silIsTanimi(formData: FormData) {
  'use server';
  const id = formData.get('id') as string;

  if (!id) return;

  const deleteStmt = db.prepare('DELETE FROM isler WHERE id = ?');
  deleteStmt.run(id);

  revalidatePath('/is-tanimlari');
}

// ANA SAYFA BİLEŞENİ
export default async function IsTanimlariPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const params = await searchParams;
  const editId = params.edit;

  // Tüm iş tanımlarını gruptan başlayarak sıralı çekiyoruz
  const isler = db.prepare('SELECT * FROM isler ORDER BY job_group ASC, name ASC').all() as any[];

  // Düzenleme modundaysak ilgili iş tanımını buluyoruz
  const duzenlenecekIs = editId 
    ? db.prepare('SELECT * FROM isler WHERE id = ?').get(editId) as any
    : null;

  return (
    <>
      {/* ÜST BAŞLIK ALANI */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold tracking-tight">İş Tanımları</h2>
        <p className="text-sm text-neutral-500 mt-1">Sahada yapılacak imalat türlerini, üst gruplarını ve birim fiyatlarını yönetin.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* DİNAMİK FORM (EKLEME VEYA DÜZENLEME) */}
        <div className="bg-white p-6 rounded-lg border border-neutral-200 shadow-sm h-fit">
          <h3 className="text-sm font-semibold mb-4 text-neutral-500 uppercase tracking-wider">
            {duzenlenecekIs ? 'İş Tanımını Düzenle' : 'Yeni İş Tanımı Ekle'}
          </h3>
          
          <form action={duzenlenecekIs ? guncelleIsTanimi : ekleIsTanimi} className="space-y-4">
            {duzenlenecekIs && <input type="hidden" name="id" value={duzenlenecekIs.id} />}

            {/* ÜST BAŞLIK / SİSTEM GRUBU SEÇİMİ */}
            <div>
              <label htmlFor="job_group" className="block text-xs font-medium text-neutral-500 mb-1">Sistem / Üst Başlık *</label>
              <select
                id="job_group"
                name="job_group"
                required
                defaultValue={duzenlenecekIs ? duzenlenecekIs.job_group : ''}
                className="w-full px-3 py-2 border border-neutral-200 bg-white rounded-md text-sm shadow-sm focus:outline-none focus:border-neutral-900 transition"
              >
                <option value="" disabled>Grup seçiniz...</option>
                {IS_GRUPLARI.map((grup) => (
                  <option key={grup} value={grup}>{grup}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="name" className="block text-xs font-medium text-neutral-500 mb-1">İş / İmalat Adı *</label>
              <input
                type="text"
                id="name"
                name="name"
                required
                defaultValue={duzenlenecekIs ? duzenlenecekIs.name : ''}
                placeholder="Örn: 2'' Siyah Çelik Boru Montajı"
                className="w-full px-3 py-2 border border-neutral-200 rounded-md text-sm shadow-sm focus:outline-none focus:border-neutral-900 transition"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="unit_price_tl" className="block text-xs font-medium text-neutral-500 mb-1">Birim Fiyat (mt/TL)</label>
                <input
                  type="number"
                  step="0.01"
                  id="unit_price_tl"
                  name="unit_price_tl"
                  defaultValue={duzenlenecekIs ? duzenlenecekIs.unit_price_tl : ''}
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-neutral-200 rounded-md text-sm shadow-sm focus:outline-none focus:border-neutral-900 transition"
                />
              </div>

              <div>
                <label htmlFor="person_min" className="block text-xs font-medium text-neutral-500 mb-1">Norm (Adam/Dk)</label>
                <input
                  type="number"
                  id="person_min"
                  name="person_min"
                  defaultValue={duzenlenecekIs ? duzenlenecekIs.person_min : ''}
                  placeholder="Örn: 45"
                  className="w-full px-3 py-2 border border-neutral-200 rounded-md text-sm shadow-sm focus:outline-none focus:border-neutral-900 transition"
                />
              </div>
            </div>

            <div>
              <label htmlFor="report_template" className="block text-xs font-medium text-neutral-500 mb-1">Rapor Notu / Açıklama Şablonu</label>
              <textarea
                id="report_template"
                name="report_template"
                rows={3}
                defaultValue={duzenlenecekIs ? duzenlenecekIs.report_template : ''}
                placeholder="Günlük raporda otomatik çıkması istenen standart notlar..."
                className="w-full px-3 py-2 border border-neutral-200 rounded-md text-sm shadow-sm focus:outline-none focus:border-neutral-900 transition resize-none"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                className="flex-1 px-4 py-2 text-sm font-medium bg-neutral-900 hover:bg-neutral-800 text-white rounded-md shadow-sm transition"
              >
                {duzenlenecekIs ? 'Değişiklikleri Kaydet' : 'İş Tanımını Kaydet'}
              </button>
              
              {duzenlenecekIs && (
                <Link
                  href="/is-tanimlari"
                  className="px-4 py-2 text-sm font-medium border border-neutral-200 bg-white hover:bg-neutral-50 rounded-md shadow-sm transition text-center"
                >
                  Vazgeç
                </Link>
              )}
            </div>
          </form>
        </div>

        {/* TANIMLI İŞLER LİSTESİ */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-neutral-200 shadow-sm p-6">
          <h3 className="text-sm font-semibold mb-4 text-neutral-500 uppercase tracking-wider">Tanımlı İşler ({isler.length})</h3>
          
          {isler.length === 0 ? (
            <p className="text-sm text-neutral-400 py-4 text-center">Henüz tanımlanmış bir iş bulunmuyor.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-neutral-600">
                <thead>
                  <tr className="border-b border-neutral-100 text-neutral-400 font-medium">
                    <th className="pb-3">Grup ve İş Adı</th>
                    <th className="pb-3 text-right">Birim Fiyat</th>
                    <th className="pb-3 text-right">Norm (Adam/Dk)</th>
                    <th className="pb-3 text-right">İşlemler</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {isler.map((is) => (
                    <tr key={is.id} className={`hover:bg-neutral-50/50 ${editId === is.id.toString() ? 'bg-neutral-100/70' : ''}`}>
                      <td className="py-3">
                        {/* Üst Başlık / Grup İsmi Rozeti */}
                        <span className="inline-block px-2 py-0.5 text-[10px] font-semibold bg-neutral-100 text-neutral-700 rounded mb-1">
                          {is.job_group}
                        </span>
                        <div className="font-medium text-neutral-950">{is.name}</div>
                        {is.report_template && (
                          <div className="text-xs text-neutral-400 mt-0.5 italic max-w-xs truncate">{is.report_template}</div>
                        )}
                      </td>
                      <td className="py-3 text-right font-mono text-neutral-900">
                        {is.unit_price_tl ? `${is.unit_price_tl.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL` : '-'}
                      </td>
                      <td className="py-3 text-right text-neutral-600">
                        {is.person_min ? `${is.person_min} dk` : '-'}
                      </td>
                      <td className="py-3 text-right space-x-2 whitespace-nowrap">
                        <Link
                          href={`/is-tanimlari?edit=${is.id}`}
                          className="text-xs font-semibold text-neutral-600 hover:text-neutral-900 transition px-2 py-1 rounded hover:bg-neutral-100"
                        >
                          Düzenle
                        </Link>
                        <form action={silIsTanimi} className="inline-block">
                            <input type="hidden" name="id" value={is.id} />
                            <button 
                                type="submit" 
                                className="text-xs font-semibold text-red-500 hover:text-red-700 transition px-2 py-1 rounded hover:bg-red-50"
                            >
                                Sil
                            </button>
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