import db from '@/lib/db'; 
import UreticiForm from './uretici-form';
import MatrisTable from './matris-table'; 
import { silUretici } from './actions';

export default async function MalzemeTipleriPage({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  const params = await searchParams;
  const editId = params?.edit;

  const cinsler = db.prepare('SELECT * FROM malzeme_cinsleri ORDER BY name ASC').all() as any[];
  const belgeliMalzemeler = db.prepare(`
    SELECT t.*, c.name as cins_name
    FROM malzeme_tipleri t
    LEFT JOIN malzeme_cinsleri c ON t.cins_id = c.id
    ORDER BY c.name ASC, t.company_name ASC
  `).all() as any[];

  const editData = editId ? belgeliMalzemeler.find(m => m.id.toString() === editId) : null;

  return (
    // Ana içerik alanı sarmalayıcısı (p-6 max-w-[1600px] mx-auto)
    <div className="p-6 max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500">
      
      {/* BAŞLIK VE ALT METİN (RENKLER GÜNCELLENDİ) */}
      <div className="print:hidden pb-4 border-b border-zinc-800/50 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-100 tracking-tight">Teknik Onay Matrisi</h1>
          <p className="text-sm text-zinc-500 mt-1">Şantiye malzeme standartları ve katalog tanımlamaları.</p>
        </div>
      </div>

      {/* FORM ALANI */}
      <UreticiForm cinsler={cinsler} editData={editData} />

      {/* KARANLIK MATRİS TABLOSU (Aşağıda güncelleyeceğiz) */}
      <div className="w-full">
        <MatrisTable belgeliMalzemeler={belgeliMalzemeler} cinsler={cinsler} silUreticiAction={silUretici} />
      </div>

    </div>
  );
}