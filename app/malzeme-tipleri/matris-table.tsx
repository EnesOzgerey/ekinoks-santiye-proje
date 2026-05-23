'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function MatrisTable({ belgeliMalzemeler, cinsler, silUreticiAction }: { belgeliMalzemeler: any[], cinsler: any[], silUreticiAction: (formData: FormData) => void }) {
  const [selectedCinsId, setSelectedCinsId] = useState<string>('');
  const [selectedBrand, setSelectedBrand] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  
  const [docLoading, setDocLoading] = useState(false);

  const uniqueBrands = Array.from(new Set(belgeliMalzemeler.map(item => item.company_name))).filter(Boolean).sort();

  // 1. AŞAMA: Filtreleme
  const filteredMaterials = belgeliMalzemeler.filter(item => {
    const currentStatus = item.status || 'Onay Bekliyor';
    const matchCins = selectedCinsId === '' || item.cins_id?.toString() === selectedCinsId;
    const matchBrand = selectedBrand === '' || item.company_name === selectedBrand;
    const matchStatus = selectedStatus === '' || currentStatus === selectedStatus;
    return matchCins && matchBrand && matchStatus;
  });

  // 2. AŞAMA: Malzeme Cinsine Göre Zeki Gruplama (RowSpan için)
  const groupedData: { cinsName: string, totalRowsForCins: number, items: any[] }[] = [];
  const uniqueCinsNames = Array.from(new Set(filteredMaterials.map(m => m.cins_name)));
  
  uniqueCinsNames.forEach(cinsName => {
    const itemsInCins = filteredMaterials.filter(m => m.cins_name === cinsName);
    let totalRowsForCins = 0;
    
    const processedItems = itemsInCins.map(item => {
      let certs: any[] = [];
      try { certs = JSON.parse(item.certificates || '[]'); } catch(e){}
      if (certs.length === 0) certs = [{}];
      totalRowsForCins += certs.length;
      return { ...item, parsedCerts: certs };
    });

    groupedData.push({ cinsName, totalRowsForCins, items: processedItems });
  });

  const handlePrint = () => window.print();

  const handleExportExcel = async () => {
    try {
        setDocLoading(true);
        const res = await fetch('/api/malzeme-onay-doc', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ materials: filteredMaterials }) 
        });

        if (res.ok) {
          const blob = await res.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `MOF_${new Date().toLocaleDateString('tr-TR').replace(/\./g, '_')}.xlsx`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          window.URL.revokeObjectURL(url);
        } else {
          alert('Dosya üretilirken hata oluştu.');
        }
    } catch (err) {
        alert('Sistem yerel dosya motoruna bağlanamadı.');
    } finally {
        setDocLoading(false);
    }
  };

  const bugun = new Date().toLocaleDateString('tr-TR');

  return (
    <div className="space-y-6">
      
      {/* FİLTRELEME PANELİ */}
      <div className="print:hidden p-5 bg-zinc-900 rounded-xl border border-zinc-800 shadow-sm flex flex-col lg:flex-row gap-5 items-end justify-between">
        <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-[10px] text-zinc-500 font-bold mb-1.5 uppercase tracking-wider">Malzeme Cinsi</label>
            <select value={selectedCinsId} onChange={(e) => setSelectedCinsId(e.target.value)} className="w-full px-3 py-2 border border-zinc-800 bg-zinc-950 rounded-lg text-sm text-zinc-200 focus:outline-none focus:border-zinc-600 transition-colors">
              <option value="">Tüm Cinsler / Malzemeler</option>
              {cinsler.map((cins) => <option key={cins.id} value={cins.id}>{cins.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] text-zinc-500 font-bold mb-1.5 uppercase tracking-wider">Belge Sahibi / Marka</label>
            <select value={selectedBrand} onChange={(e) => setSelectedBrand(e.target.value)} className="w-full px-3 py-2 border border-zinc-800 bg-zinc-950 rounded-lg text-sm text-zinc-200 focus:outline-none focus:border-zinc-600 transition-colors">
              <option value="">Tüm Markalar</option>
              {uniqueBrands.map((brand, idx) => <option key={idx} value={brand as string}>{brand}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] text-zinc-500 font-bold mb-1.5 uppercase tracking-wider">Onay Durumu</label>
            <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} className="w-full px-3 py-2 border border-zinc-800 bg-zinc-950 rounded-lg text-sm text-zinc-200 focus:outline-none focus:border-zinc-600 transition-colors">
              <option value="">Tüm Durumlar</option>
              <option value="Sunulmadı">📝 Sunulmayanlar</option>
              <option value="Onay Bekliyor">⏳ Onay Bekleyenler</option>
              <option value="Onaylandı">✅ Onaylananlar</option>
              <option value="Reddedildi">❌ Reddedilenler</option>
            </select>
          </div>
        </div>

        <div className="flex gap-3 w-full lg:w-auto shrink-0 mt-4 lg:mt-0">
          <button onClick={handleExportExcel} disabled={docLoading || filteredMaterials.length === 0} className="flex-1 lg:flex-none px-5 py-2 text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2 disabled:bg-zinc-800 disabled:text-zinc-500 disabled:opacity-50 cursor-pointer">
            {docLoading ? 'Hazırlanıyor...' : '📊 Excel İndir'}
          </button>
          <button onClick={handlePrint} disabled={filteredMaterials.length === 0} className="flex-1 lg:flex-none px-5 py-2 text-sm font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer border border-zinc-700">
            📄 Yazdır / PDF
          </button>
        </div>
      </div>

      <div className="hidden print:block space-y-4 border-b border-black pb-4 mb-6">
        <div className="flex justify-between items-center text-black">
          <h1 className="text-md font-bold uppercase">EKİNOKS MEKANİK TESİSAT SİSTEMLERİ</h1>
          <div className="text-xs font-mono">Tarih: {bugun}</div>
        </div>
      </div>

      {/* KLASİK VE GÜÇLÜ TABLO YAPISI (Gruplama RowSpan Özelliğiyle) */}
      <div className="bg-zinc-900 border border-zinc-800/60 rounded-xl overflow-hidden shadow-xl print:border-0 print:shadow-none print:bg-transparent">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse print:text-black">
            
            <thead className="bg-zinc-950/80 print:bg-transparent border-b border-zinc-800">
              <tr className="text-zinc-500 font-bold text-[10px] uppercase tracking-widest print:border-black print:text-black">
                <th className="py-4 pl-5 pr-3 w-[20%]">MALZEME CİNSİ</th>
                <th className="py-4 px-3 w-[20%]">BELGE SAHİBİ / MARKA</th>
                <th className="py-4 px-3 w-[10%]">DURUM</th>
                <th className="py-4 px-4 w-[20%]">STANDART</th>
                <th className="py-4 px-4 w-[12%]">BELGE NO</th>
                <th className="py-4 px-4 w-[13%]">GEÇERLİLİK</th>
                <th className="py-4 pr-5 pl-3 text-right print:hidden w-[5%]">İŞLEMLER</th>
              </tr>
            </thead>
            
            {groupedData.length === 0 ? (
              <tbody>
                <tr>
                  <td colSpan={7} className="text-sm text-zinc-500 py-20 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <span className="text-3xl mb-2">🔍</span>
                      <span className="font-medium">Seçtiğiniz filtrelere uygun kayıt bulunamadı.</span>
                      <button onClick={() => { setSelectedCinsId(''); setSelectedBrand(''); setSelectedStatus(''); }} className="text-blue-400 hover:text-blue-300 mt-2 underline cursor-pointer">
                        Filtreleri Temizle
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            ) : (
              <tbody>
                {groupedData.map((cinsGroup, cIdx) => {
                  
                  return cinsGroup.items.map((item, iIdx) => {
                    const currentStatus = item.status || 'Onay Bekliyor';

                    return item.parsedCerts.map((cert: any, certIdx: number) => {
                      
                      // Malzeme cinsi sadece grubun en ilk satırında render edilir ve tüm satırları kapsar
                      const isFirstOfCins = iIdx === 0 && certIdx === 0;
                      
                      // Marka ve Durum sadece firmanın ilk satırında render edilir
                      const isFirstOfBrand = certIdx === 0;
                      
                      // Grupları birbirinden ayırmak için son satıra biraz daha kalın çizgi atacağız
                      const isLastOfCins = iIdx === cinsGroup.items.length - 1 && certIdx === item.parsedCerts.length - 1;

                      return (
                        <tr key={`${item.id}-${certIdx}`} className={`hover:bg-zinc-800/30 transition-colors duration-200 print:border-gray-300 ${isLastOfCins ? 'border-b border-zinc-700/80' : 'border-b border-zinc-800/40'}`}>
                          
                          {/* 1. MALZEME CİNSİ (Tüm grubu kapsayan dev birleşik hücre) */}
                          {isFirstOfCins && (
                            <td rowSpan={cinsGroup.totalRowsForCins} className="py-4 pl-5 pr-3 font-medium text-zinc-200 border-r border-zinc-800/50 align-middle print:text-black print:border-gray-300">
                              {cinsGroup.cinsName}
                            </td>
                          )}

                          {/* 2. BELGE SAHİBİ / MARKA */}
                          {isFirstOfBrand && (
                            <td rowSpan={item.parsedCerts.length} className="py-4 px-3 text-zinc-100 font-semibold uppercase text-[11px] border-r border-zinc-800/50 align-middle print:text-black print:border-gray-300">
                              {item.company_name}
                            </td>
                          )}

                          {/* 3. ONAY DURUMU */}
                          {isFirstOfBrand && (
                            <td rowSpan={item.parsedCerts.length} className="py-4 px-3 border-r border-zinc-800/50 align-middle print:text-black print:border-gray-300">
                              <span className={`inline-block px-2.5 py-1 rounded border text-[10px] font-bold uppercase tracking-wider
                                ${currentStatus === 'Onaylandı' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 
                                  currentStatus === 'Reddedildi' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 
                                  currentStatus === 'Sunulmadı' ? 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20' : 
                                  'bg-amber-500/10 text-amber-500 border-amber-500/20'}
                              `}>
                                {currentStatus}
                              </span>
                            </td>
                          )}

                          {/* 4. STANDART (Zarif arka planlı bölge başlangıcı bg-black/20) */}
                          <td className="py-3 px-4 align-middle bg-black/20 border-r border-zinc-800/20 print:bg-transparent print:border-0 print:text-black">
                            <span className="text-sm text-zinc-300 font-medium">
                              {cert.standart && cert.standart !== '-' ? cert.standart : <span className="text-zinc-600">-</span>}
                            </span>
                          </td>

                          {/* 5. BELGE NO */}
                          <td className="py-3 px-4 align-middle bg-black/20 border-r border-zinc-800/20 print:bg-transparent print:border-0 print:text-black">
                            <span className="font-mono text-[11px] tracking-wider text-zinc-400">
                              {cert.belge_no || '-'}
                            </span>
                          </td>

                          {/* 6. GEÇERLİLİK VE KATALOG (Kesilmeyi önleyen whitespace-nowrap eklendi) */}
                          <td className="py-3 px-4 align-middle bg-black/20 border-r border-zinc-800/50 print:bg-transparent print:border-0 print:text-black">
                            <div className="flex items-center justify-between gap-3 whitespace-nowrap">
                              <span className="text-[12px] text-zinc-400 font-medium">
                                {cert.expiry_date || '-'}
                              </span>
                              {cert.catalog_path && (
                                <a href={cert.catalog_path} target="_blank" rel="noopener noreferrer" className="px-2.5 py-1 bg-zinc-800 border border-zinc-700 text-zinc-200 rounded-md text-[9px] uppercase font-bold hover:bg-zinc-700 hover:text-white transition-colors print:hidden shadow-sm shrink-0">
                                  Katalog
                                </a>
                              )}
                            </div>
                          </td>

                          {/* 7. İŞLEMLER */}
                          {isFirstOfBrand && (
                            <td rowSpan={item.parsedCerts.length} className="py-4 pr-5 pl-3 text-right align-middle print:hidden">
                              <div className="flex items-center justify-end gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                                
                                <div className="relative group/tooltip flex items-center">
                                  <Link href={`/malzeme-tipleri?edit=${item.id}`} className="p-2 bg-zinc-800/50 border border-zinc-700/50 hover:bg-zinc-700 hover:border-zinc-600 text-zinc-400 hover:text-white rounded-lg transition-all shadow-sm">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                                  </Link>
                                  <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-zinc-100 text-zinc-900 text-[10px] font-bold rounded opacity-0 group-hover/tooltip:opacity-100 transition-all pointer-events-none whitespace-nowrap shadow-lg z-10">Düzenle</span>
                                </div>

                                <div className="relative group/tooltip flex items-center">
                                  <form action={silUreticiAction}>
                                    <input type="hidden" name="id" value={item.id} />
                                    <button type="submit" className="p-2 bg-zinc-800/50 border border-zinc-700/50 hover:bg-red-500/10 hover:border-red-500/30 text-zinc-400 hover:text-red-500 rounded-lg transition-all shadow-sm cursor-pointer">
                                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                                    </button>
                                  </form>
                                  <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-red-500 text-white text-[10px] font-bold rounded opacity-0 group-hover/tooltip:opacity-100 transition-all pointer-events-none whitespace-nowrap shadow-lg z-10">Sil</span>
                                </div>

                              </div>
                            </td>
                          )}

                        </tr>
                      );
                    });
                  });
                })}
              </tbody>
            )}
          </table>
        </div>
      </div>

    </div>
  );
}