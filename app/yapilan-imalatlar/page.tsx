// src/app/yapilan-imalatlar/page.tsx
import db from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import ImalatTable from './imalat-table';

async function ekleYapilanImalat(formData: FormData) {
  'use server';
  const job_id = formData.get('job_id') as string;
  const material_id = formData.get('material_id') as string;
  const quantity_length = formData.get('quantity_length') as string;
  const situation = formData.get('situation') as string;
  const project_name = formData.get('project_name') as string;
  const start_date = formData.get('start_date') as string;
  const end_date = formData.get('end_date') as string;

  if (!job_id || !quantity_length || !start_date || !end_date) return;

  const insert = db.prepare(`
    INSERT INTO yapilanlar (job_id, material_id, quantity_length, situation, project_name, start_date, end_date) 
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  insert.run(job_id, material_id === "" ? null : material_id, parseFloat(quantity_length), situation, project_name, start_date, end_date);

  revalidatePath('/yapilan-imalatlar');
}

async function silYapilanImalat(formData: FormData) {
  'use server';
  const id = formData.get('id') as string;
  if (!id) return;

  db.prepare('DELETE FROM yapilanlar WHERE id = ?').run(id);
  revalidatePath('/yapilan-imalatlar');
}

export default async function YapilanImalatlarPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const params = await searchParams;
  const editId = params.edit;

  const isTanimlari = db.prepare('SELECT id, name FROM isler ORDER BY name ASC').all() as any[];
  
  // Sorgu Hatası Düzeltildi: ORDER BY eklendi
  const depoMalzemeleri = db.prepare(`
    SELECT m.id, mt.name as type_name, m.brand
    FROM malzemeler m
    JOIN malzeme_tipleri mt ON m.material_type_id = mt.id
    ORDER BY m.id DESC
  `).all() as any[];

  const yapilanlar = db.prepare(`
    SELECT 
      y.*, 
      i.name as job_name, 
      i.job_group, 
      i.unit_price_tl,
      (y.quantity_length * i.unit_price_tl) as hesaplanan_maliyet,
      mt.name as mat_type_name,
      m.brand as mat_brand
    FROM yapilanlar y
    LEFT JOIN isler i ON y.job_id = i.id
    LEFT JOIN malzemeler m ON y.material_id = m.id
    LEFT JOIN malzeme_tipleri mt ON m.material_type_id = mt.id
    ORDER BY y.id DESC
  `).all() as any[];

  return (
    <>
      <div className="mb-8">
        <h2 className="text-2xl font-bold tracking-tight">Yapılan İmalatlar</h2>
        <p className="text-sm text-neutral-500 mt-1">Sahada gerçekleşen metrajları ve süreçleri kaydedin.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        <div className="bg-white p-6 rounded-lg border border-neutral-200 shadow-sm h-fit">
          <h3 className="text-sm font-semibold mb-4 text-neutral-500 uppercase tracking-wider">Yeni İmalat Girişi</h3>
          <form action={ekleYapilanImalat} className="space-y-4">
            <div>
              <label htmlFor="job_id" className="block text-xs font-medium text-neutral-500 mb-1">Yapılan İş *</label>
              <select id="job_id" name="job_id" required defaultValue="" className="w-full px-3 py-2 border border-neutral-200 bg-white rounded-md text-sm focus:outline-none focus:border-neutral-900">
                <option value="" disabled>İş seçiniz...</option>
                {isTanimlari.map((is) => <option key={is.id} value={is.id}>{is.name}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="start_date" className="block text-xs font-medium text-neutral-500 mb-1">Başlangıç *</label>
                <input type="date" id="start_date" name="start_date" required defaultValue={new Date().toISOString().split('T')[0]} className="w-full px-3 py-2 border border-neutral-200 rounded-md text-sm focus:outline-none" />
              </div>
              <div>
                <label htmlFor="end_date" className="block text-xs font-medium text-neutral-500 mb-1">Bitiş *</label>
                <input type="date" id="end_date" name="end_date" required defaultValue={new Date().toISOString().split('T')[0]} className="w-full px-3 py-2 border border-neutral-200 rounded-md text-sm focus:outline-none" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="quantity_length" className="block text-xs font-medium text-neutral-500 mb-1">Metraj *</label>
                <input type="number" step="0.01" id="quantity_length" name="quantity_length" required placeholder="0.00" className="w-full px-3 py-2 border border-neutral-200 rounded-md text-sm focus:outline-none" />
              </div>
              <div>
                <label htmlFor="project_name" className="block text-xs font-medium text-neutral-500 mb-1">Lokasyon</label>
                <input type="text" id="project_name" name="project_name" placeholder="Örn: A Blok" className="w-full px-3 py-2 border border-neutral-200 rounded-md text-sm focus:outline-none" />
              </div>
            </div>

            <button type="submit" className="w-full px-4 py-2 text-sm font-medium bg-neutral-900 text-white rounded-md transition">Kaydet</button>
          </form>
        </div>

        <div className="lg:col-span-3">
          <ImalatTable yapilanlar={yapilanlar} editId={editId} silAction={silYapilanImalat} />
        </div>
      </div>
    </>
  );
}