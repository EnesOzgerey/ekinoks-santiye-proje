'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function MatrisTable({ belgeliMalzemeler, cinsler, silUreticiAction }: { belgeliMalzemeler: any[], cinsler: any[], silUreticiAction: (formData: FormData) => void }) {
  const [selectedCinsId, setSelectedCinsId] = useState<string>('');
  const [docLoading, setDocLoading] = useState(false);

  const filteredMaterials = belgeliMalzemeler.filter(item => {
    return selectedCinsId === '' || item.cins_id?.toString() === selectedCinsId;
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
      
      {/* KARANLIK FİLTRELEME VE BUTONLAR PANELİ */}
      <div className="print:hidden p-4 bg-zinc-900 rounded-lg border border-zinc-800 flex flex-wrap gap-4 items-end justify-between shadow-sm">
        <div className="flex-1 min-w-[250px]">
          <label className="block text-xs font-medium text-zinc-500 mb-1">Malzeme Cinsine Göre Filtrele</label>
          <select
            value={selectedCinsId}
            onChange={(e) => setSelectedCinsId(e.target.value)}
            className="w-full px-3 py-1.5 border border-zinc-800 bg-zinc-950 rounded-md text-sm text-zinc-200 focus:outline-none focus:border-zinc-600 transition-colors"
          >
            <option value="">Tüm Cinsler / Malzemeler</option>
            {cinsler.map((cins) => (
              <option key={cins.id} value={cins.id}>{cins.name}</option>
            ))}
          </select>
        </div>

        <div className="flex gap-2">
          {/* EXCEL BUTONU */}
          <button
            onClick={handleExportExcel}
            disabled={docLoading || filteredMaterials.length === 0}
            className="px-4 py-1.5 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-md shadow-sm transition-colors flex items-center gap-2 disabled:bg-zinc-700 disabled:opacity-50 cursor-pointer"
          >
            {docLoading ? 'Hazırlanıyor...' : '📊 Excel Olarak İndir'}
          </button>

          {/* PDF BUTONU */}
          <button
            onClick={handlePrint}
            disabled={filteredMaterials.length === 0}
            className="px-4 py-1.5 text-sm font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-md shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer border border-zinc-700"
          >
            📄 PDF / Baskı Al
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
      <div className="bg-zinc-900 border border-zinc-800/60 rounded-xl overflow-hidden print:border-0 print:bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse print:text-black">
            <thead className="bg-zinc-950/50 print:bg-transparent">
              <tr className="border-b border-zinc-800 text-zinc-500 font-medium text-xs uppercase tracking-wider print:border-black print:text-black">
                <th className="py-4 pl-5 pr-3 w-1/4">MALZEME CİNSİ</th>
                <th className="py-4 px-3 w-1/4">BELGE SAHİBİ / MARKA</th>
                <th className="py-4 px-3">STANDART</th>
                <th className="py-4 px-3">BELGE NO</th>
                <th className="py-4 px-3">GEÇERLİLİK</th>
                <th className="py-4 pr-5 pl-3 text-right print:hidden">İŞLEMLER</th>
              </tr>
            </thead>
            
            {filteredMaterials.length === 0 ? (
              <tbody>
                <tr>
                  <td colSpan={6} className="text-sm text-zinc-600 py-16 text-center font-medium">
                    Veri bulunamadı.
                  </td>
                </tr>
              </tbody>
            ) : (
              // HER BİR ÜRETİCİYİ KENDİ TBODY GRUBUNA ALIYORUZ
              filteredMaterials.map((item) => {
                let certs: any[] = [];
                try { certs = JSON.parse(item.certificates || '[]'); } catch(e) {}
                if (certs.length === 0) certs = [{}];

                return (
                  <tbody key={item.id} className="group hover:bg-zinc-800/30 transition-colors duration-200 border-b border-zinc-800 last:border-b-0 print:border-b print:border-gray-300">
                    {certs.map((cert, idx) => {
                      const isFirst = idx === 0;
                      const isLast = idx === certs.length - 1;

                      // Grup içi satırlara net ayrım için düz çizgi ve opaklık artışı
                      return (
                        <tr key={`${item.id}-${idx}`} className={`${!isLast ? 'border-b border-zinc-800/80 print:border-gray-300' : ''} print:border-b-0`}>
                          
                          {/* SADECE İLK SATIRDA GÖSTERİLECEK BİRLEŞİK HÜCRELER */}
                          {isFirst && (
                            <>
                              {/* 🚀 Dikey ortalama için align-middle eklendi */}
                              <td rowSpan={certs.length} className="py-4 pl-5 pr-3 font-medium text-zinc-200 border-r border-zinc-800/50 align-middle print:text-black print:border-gray-300">
                                {item.cins_name}
                              </td>
                              {/* 🚀 Dikey ortalama için align-middle eklendi */}
                              <td rowSpan={certs.length} className="py-4 px-3 text-zinc-100 font-semibold uppercase text-[11px] border-r border-zinc-800/50 align-middle print:text-black print:border-gray-300">
                                {item.company_name}
                              </td>
                            </>
                          )}
                          
                          {/* HER BİR STANDART İÇİN TEKRAR EDEN HÜCRELER */}
                          {/* 🚀 Genel uyum için bunlara da align-middle eklendi */}
                          <td className="py-3 px-3 text-sm text-zinc-300 font-medium align-middle print:text-black">
                            {cert.standart || '-'}
                          </td>
                          <td className="py-3 px-3 text-sm font-mono text-xs text-zinc-400 align-middle print:text-black">
                            {cert.belge_no || '-'}
                          </td>
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

                          {/* İŞLEMLER BUTONU DA SADECE İLK SATIRDA GÖZÜKSÜN */}
                          {isFirst && (
                            // 🚀 Dikey ortalama için align-middle eklendi
                            <td rowSpan={certs.length} className="py-4 pr-5 pl-3 text-right align-middle print:hidden border-l border-neutral-800/50">
                              <div className="flex flex-col items-end gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                                <Link href={`/malzeme-tipleri?edit=${item.id}`} className="text-xs text-zinc-400 hover:text-zinc-100">Düzenle</Link>
                                <form action={silUreticiAction}>
                                  <input type="hidden" name="id" value={item.id} />
                                  <button type="submit" className="text-xs text-red-500/80 hover:text-red-400 cursor-pointer">Sil</button>
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