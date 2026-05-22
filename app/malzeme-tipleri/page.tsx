import db from '@/lib/db'; 
import UreticiForm from './uretici-form';
import MatrisTable from './matris-table'; 
import { silUretici } from './actions';

// Next.js 15'te searchParams bir Promise'dir, tipini buna göre tanımlıyoruz
export default async function MalzemeTipleriPage({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  
  // URL parametresini await ile güvenli bir şekilde çözüyoruz
  const params = await searchParams;
  const editId = params?.edit;

  const cinsler = db.prepare('SELECT * FROM malzeme_cinsleri ORDER BY name ASC').all() as any[];
  
  const belgeliMalzemeler = db.prepare(`
    SELECT t.*, c.name as cins_name
    FROM malzeme_tipleri t
    LEFT JOIN malzeme_cinsleri c ON t.cins_id = c.id
    ORDER BY c.name ASC, t.company_name ASC
  `).all() as any[];

  // Gelen ID'ye göre düzenlenecek veriyi seçiyoruz
  const editData = editId ? belgeliMalzemeler.find(m => m.id.toString() === editId) : null;

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      
      <div className="print:hidden pb-4 border-b border-neutral-200 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-extrabold text-neutral-900 tracking-tight">Teknik Onay Matrisi</h1>
          <p className="text-sm text-neutral-500 mt-1">Şantiyede kullanılacak malzemelerin standart, belge ve katalog tanımlamaları.</p>
        </div>
      </div>

      {/* AÇILIR KAPANIR FORM ALANI */}
      <UreticiForm cinsler={cinsler} editData={editData} />

      {/* TAM GENİŞLİK MATRİS TABLOSU */}
      <div className="w-full">
        <MatrisTable belgeliMalzemeler={belgeliMalzemeler} cinsler={cinsler} silUreticiAction={silUretici} />
      </div>

    </div>
  );
}