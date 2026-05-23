'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function MatrisTable({ belgeliMalzemeler, cinsler, silUreticiAction }: { belgeliMalzemeler: any[], cinsler: any[], silUreticiAction: (formData: FormData) => void }) {
  // 1. FİLTRE DURUMLARI (STATES)
  const [selectedCinsId, setSelectedCinsId] = useState<string>('');
  const [selectedBrand, setSelectedBrand] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  
  const [docLoading, setDocLoading] = useState(false);

  // 2. TEKRARSIZ (UNIQUE) MARKA LİSTESİNİ OLUŞTUR
  // Mevcut verilerin içindeki markaları alıp, aynı olanları eliyor ve alfabetik sıralıyoruz
  const uniqueBrands = Array.from(new Set(belgeliMalzemeler.map(item => item.company_name))).filter(Boolean).sort();

  // 3. ÇOKLU FİLTRELEME MANTIĞI
  const filteredMaterials = belgeliMalzemeler.filter(item => {
    const currentStatus = item.status || 'Onay Bekliyor';
    
    const matchCins = selectedCinsId === '' || item.cins_id?.toString() === selectedCinsId;
    const matchBrand = selectedBrand === '' || item.company_name === selectedBrand;
    const matchStatus = selectedStatus === '' || currentStatus === selectedStatus;
    
    // Üç koşulun da aynı anda sağlandığı verileri döndür
    return matchCins && matchBrand && matchStatus;
  });

  const handlePrint = () => window.print();

  const handleExportExcel = async () => {
    try {
        setDocLoading(true);
        const res = await fetch('/api/malzeme-onay-doc', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ materials: filteredMaterials }) // Artık 3 katmanlı süzülmüş veri gidiyor
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
      
      {/* KARANLIK FİLTRELEME VE BUTONLAR PANELİ */}
      <div className="print:hidden p-5 bg-zinc-900 rounded-xl border border-zinc-800 shadow-sm flex flex-col lg:flex-row gap-5 items-end justify-between">
        
        {/* ÜÇLÜ FİLTRE IZGARASI */}
        <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* 1. Malzeme Cinsi Filtresi */}
          <div>
            <label className="block text-[10px] text-zinc-500 font-bold mb-1.5 uppercase tracking-wider">Malzeme Cinsi</label>
            <select
              value={selectedCinsId}
              onChange={(e) => setSelectedCinsId(e.target.value)}
              className="w-full px-3 py-2 border border-zinc-800 bg-zinc-950 rounded-lg text-sm text-zinc-200 focus:outline-none focus:border-zinc-600 transition-colors"
            >
              <option value="">Tüm Cinsler / Malzemeler</option>
              {cinsler.map((cins) => (
                <option key={cins.id} value={cins.id}>{cins.name}</option>
              ))}
            </select>
          </div>

          {/* 2. Marka Filtresi */}
          <div>
            <label className="block text-[10px] text-zinc-500 font-bold mb-1.5 uppercase tracking-wider">Belge Sahibi / Marka</label>
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="w-full px-3 py-2 border border-zinc-800 bg-zinc-950 rounded-lg text-sm text-zinc-200 focus:outline-none focus:border-zinc-600 transition-colors"
            >
              <option value="">Tüm Markalar</option>
              {uniqueBrands.map((brand, idx) => (
                <option key={idx} value={brand as string}>{brand}</option>
              ))}
            </select>
          </div>

          {/* 3. Durum Filtresi */}
          <div>
            <label className="block text-[10px] text-zinc-500 font-bold mb-1.5 uppercase tracking-wider">Onay Durumu</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 border border-zinc-800 bg-zinc-950 rounded-lg text-sm text-zinc-200 focus:outline-none focus:border-zinc-600 transition-colors"
            >
              <option value="">Tüm Durumlar</option>
              <option value="Onay Bekliyor">⏳ Onay Bekleyenler</option>
              <option value="Onaylandı">✅ Onaylananlar</option>
              <option value="Reddedildi">❌ Reddedilenler</option>
            </select>
          </div>

        </div>

        {/* DIŞA AKTAR BUTONLARI */}
        <div className="flex gap-3 w-full lg:w-auto shrink-0 mt-4 lg:mt-0">
          <button
            onClick={handleExportExcel}
            disabled={docLoading || filteredMaterials.length === 0}
            className="flex-1 lg:flex-none px-5 py-2 text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2 disabled:bg-zinc-800 disabled:text-zinc-500 disabled:opacity-50 cursor-pointer"
          >
            {docLoading ? 'Hazırlanıyor...' : '📊 Excel İndir'}
          </button>

          <button
            onClick={handlePrint}
            disabled={filteredMaterials.length === 0}
            className="flex-1 lg:flex-none px-5 py-2 text-sm font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer border border-zinc-700"
          >
            📄 Yazdır / PDF
          </button>
        </div>
      </div>

      {/* YAZDIRMA BAŞLIĞI */}
      <div className="hidden print:block space-y-4 border-b border-black pb-4 mb-6">
        <div className="flex justify-between items-center text-black">
          <h1 className="text-md font-bold uppercase">EKİNOKS MEKANİK TESİSAT SİSTEMLERİ</h1>
          <div className="text-xs font-mono">Tarih: {bugun}</div>
        </div>
      </div>

      {/* MİNİMALİST KARANLIK MATRİS TABLOSU */}
      <div className="bg-zinc-900 border border-zinc-800/60 rounded-xl overflow-hidden print:border-0 print:bg-white shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse print:text-black">
            <thead className="bg-zinc-950/80 print:bg-transparent border-b border-zinc-800">
              <tr className="text-zinc-500 font-bold text-[10px] uppercase tracking-widest print:border-black print:text-black">
                <th className="py-4 pl-5 pr-3 w-[20%]">MALZEME CİNSİ</th>
                <th className="py-4 px-3 w-[20%]">BELGE SAHİBİ / MARKA</th>
                <th className="py-4 px-3 w-[12%]">DURUM</th>
                <th className="py-4 px-3">STANDART</th>
                <th className="py-4 px-3">BELGE NO</th>
                <th className="py-4 px-3">GEÇERLİLİK</th>
                <th className="py-4 pr-5 pl-3 text-right print:hidden">İŞLEMLER</th>
              </tr>
            </thead>
            
            {filteredMaterials.length === 0 ? (
              <tbody>
                <tr>
                  <td colSpan={7} className="text-sm text-zinc-500 py-20 text-center flex flex-col items-center gap-2">
                    <span className="text-3xl mb-2">🔍</span>
                    <span className="font-medium">Seçtiğiniz filtrelere uygun kayıt bulunamadı.</span>
                    <button onClick={() => { setSelectedCinsId(''); setSelectedBrand(''); setSelectedStatus(''); }} className="text-blue-400 hover:text-blue-300 mt-2 underline cursor-pointer">
                      Filtreleri Temizle
                    </button>
                  </td>
                </tr>
              </tbody>
            ) : (
              filteredMaterials.map((item) => {
                let certs: any[] = [];
                try { certs = JSON.parse(item.certificates || '[]'); } catch(e) {}
                if (certs.length === 0) certs = [{}];

                const currentStatus = item.status || 'Onay Bekliyor';

                return (
                  <tbody key={item.id} className="group hover:bg-zinc-800/40 transition-colors duration-200 border-b border-zinc-800/80 last:border-b-0 print:border-b print:border-gray-300">
                    {certs.map((cert, idx) => {
                      const isFirst = idx === 0;
                      const isLast = idx === certs.length - 1;

                      return (
                        <tr key={`${item.id}-${idx}`} className={`${!isLast ? 'border-b border-zinc-800/50 print:border-gray-300' : ''} print:border-b-0`}>
                          
                          {isFirst && (
                            <>
                              <td rowSpan={certs.length} className="py-4 pl-5 pr-3 font-medium text-zinc-200 border-r border-zinc-800/50 align-middle print:text-black print:border-gray-300">
                                {item.cins_name}
                              </td>
                              <td rowSpan={certs.length} className="py-4 px-3 text-zinc-100 font-semibold uppercase text-[11px] border-r border-zinc-800/50 align-middle print:text-black print:border-gray-300">
                                {item.company_name}
                              </td>
                              
                              <td rowSpan={certs.length} className="py-4 px-3 border-r border-zinc-800/50 align-middle print:text-black print:border-gray-300">
                                <span className={`inline-block px-2.5 py-1 rounded border text-[10px] font-bold uppercase tracking-wider
                                  ${currentStatus === 'Onaylandı' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 
                                    currentStatus === 'Reddedildi' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 
                                    'bg-amber-500/10 text-amber-500 border-amber-500/20'}
                                `}>
                                  {currentStatus}
                                </span>
                              </td>
                            </>
                          )}
                          
                          <td className="py-3 px-3 text-sm text-zinc-300 font-medium align-middle print:text-black">{cert.standart || '-'}</td>
                          <td className="py-3 px-3 text-sm font-mono text-xs text-zinc-400 align-middle print:text-black">{cert.belge_no || '-'}</td>
                          <td className="py-3 px-3 text-sm text-zinc-500 align-middle print:text-black">
                            <div className="flex flex-col items-start gap-1">
                              <span>{cert.expiry_date || '-'}</span>
                              {cert.catalog_path && (
                                <a href={cert.catalog_path} target="_blank" rel="noopener noreferrer" className="px-2 py-0.5 bg-zinc-800 border border-zinc-700 text-zinc-300 rounded text-[10px] uppercase font-bold hover:bg-zinc-700 hover:text-zinc-100 transition-colors print:hidden shadow-sm">
                                  Katalog
                                </a>
                              )}
                            </div>
                          </td>

                          {isFirst && (
                            <td rowSpan={certs.length} className="py-4 pr-5 pl-3 text-right align-middle print:hidden border-l border-zinc-800/50">
                              <div className="flex flex-col items-end gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                                <Link href={`/malzeme-tipleri?edit=${item.id}`} className="text-xs font-medium text-zinc-400 hover:text-white border border-zinc-700 bg-zinc-800 px-3 py-1 rounded transition-colors shadow-sm">Düzenle</Link>
                                <form action={silUreticiAction}>
                                  <input type="hidden" name="id" value={item.id} />
                                  <button type="submit" className="text-xs font-medium text-red-500/80 hover:text-red-400 cursor-pointer px-3 py-1">Sil</button>
                                </form>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                );
              })
            )}
          </table>
        </div>
      </div>
    </div>
  );
}