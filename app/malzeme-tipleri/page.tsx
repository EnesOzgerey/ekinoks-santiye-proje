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
    // Fazladan arka plan renkleri kaldırıldı, sadece içerik hizalaması bırakıldı
    <div className="p-6 max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500">
      
      <div className="print:hidden pb-4 border-b border-zinc-800/50 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-100 tracking-tight">Teknik Onay Matrisi</h1>
          <p className="text-sm text-zinc-500 mt-1">Şantiye malzeme standartları ve katalog tanımlamaları.</p>
        </div>
      </div>

      <UreticiForm cinsler={cinsler} editData={editData} />

      <div className="w-full">
        <MatrisTable belgeliMalzemeler={belgeliMalzemeler} cinsler={cinsler} silUreticiAction={silUretici} />
      </div>

    </div>
  );
}