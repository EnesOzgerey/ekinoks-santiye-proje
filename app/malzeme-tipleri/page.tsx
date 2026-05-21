// app/malzeme-tipleri/page.tsx
import db from '@/lib/db'; 
import { revalidatePath } from 'next/cache';
import UreticiForm from './uretici-form';
import MatrisTable from './matris-table'; // Yeni bileşeni dahil ediyoruz

async function ekleCins(formData: FormData) {
  'use server';
  const name = formData.get('cins_name') as string;
  if (!name) return;
  
  db.prepare('INSERT INTO malzeme_cinsleri (name) VALUES (?)').run(name);
  revalidatePath('/malzeme-tipleri');
}

async function silUretici(formData: FormData) {
  'use server';
  const id = formData.get('id') as string;
  if (!id) return;

  db.prepare('DELETE FROM malzeme_tipleri WHERE id = ?').run(id);
  revalidatePath('/malzeme-tipleri');
}

export default async function MalzemeTipleriPage() {
  const cinsler = db.prepare('SELECT * FROM malzeme_cinsleri ORDER BY name ASC').all() as any[];
  
  const belgeliMalzemeler = db.prepare(`
    SELECT t.*, c.name as cins_name
    FROM malzeme_tipleri t
    LEFT JOIN malzeme_cinsleri c ON t.cins_id = c.id
    ORDER BY c.name ASC, t.company_name ASC
  `).all() as any[];

  return (
    <>
      <div className="mb-8 print:hidden"> {/* Yazdırırken başlığı gizliyoruz */}
        <h2 className="text-2xl font-bold tracking-tight">Malzeme Teknik Onay Matrisi</h2>
        <p className="text-sm text-neutral-500 mt-1">Şantiyeye kabul edilecek malzeme cinslerini ve onaylı belgeleri yönetin.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        
        {/* SOL FORM SÜTUNLARI (YAZDIRIRKEN OTOMATİK GİZLENİR) */}
        <div className="space-y-6 lg:col-span-1 print:hidden">
          <div className="bg-white p-5 rounded-lg border border-neutral-200 shadow-sm">
            <h3 className="text-xs font-bold mb-3 text-neutral-400 uppercase tracking-wider">1. Malzeme Cinsi Tanımla</h3>
            <form action={ekleCins} className="space-y-3">
              <input
                type="text"
                name="cins_name"
                required
                placeholder="Örn: PVC Pis Su Borusu"
                className="w-full px-3 py-1.5 border border-neutral-200 rounded-md text-sm focus:outline-none focus:border-neutral-900 transition"
              />
              <button type="submit" className="w-full py-1.5 text-xs font-medium bg-neutral-100 hover:bg-neutral-200 text-neutral-900 rounded-md transition cursor-pointer">
                + Cins Ekle
              </button>
            </form>
          </div>

          <div className="bg-white p-5 rounded-lg border border-neutral-200 shadow-sm">
            <h3 className="text-xs font-bold mb-3 text-neutral-400 uppercase tracking-wider">2. Üretici / Belge Bağla</h3>
            <UreticiForm cinsler={cinsler} />
          </div>
        </div>

        {/* SAĞ AKILLI MATRİS TABLOSU (SAĞ 3 SÜTUN) */}
        <div className="lg:col-span-3 print:col-span-4"> {/* Baskıda tam genişlik kaplar */}
          <MatrisTable belgeliMalzemeler={belgeliMalzemeler} cinsler={cinsler} silUreticiAction={silUretici} />
        </div>

      </div>
    </>
  );
}