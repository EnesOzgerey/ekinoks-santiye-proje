'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function MatrisTable({ belgeliMalzemeler, cinsler, silUreticiAction }: { belgeliMalzemeler: any[], cinsler: any[], silUreticiAction: (formData: FormData) => void }) {
  const [selectedCinsId, setSelectedCinsId] = useState<string>('');
  const [docLoading, setDocLoading] = useState(false);

  const filteredMaterials = belgeliMalzemeler.filter(item => {
    return selectedCinsId === '' || item.cins_id?.toString() === selectedCinsId;
  });

  const handlePrint = () => {
    window.print();
  };

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
        a.download = `Malzeme_Oneri_ve_Onay_Formu_${new Date().toLocaleDateString('tr-TR').replace(/\./g, '_')}.xlsx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        } else {
        const data = await res.json();
        alert('Dosya üretilirken hata oluştu: ' + data.error);
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
      
      {/* KONTROL PANELİ */}
      <div className="print:hidden p-4 bg-white rounded-lg border border-neutral-200 shadow-sm flex flex-wrap gap-4 items-end justify-between">
        <div className="flex-1 min-w-[250px]">
          <label className="block text-xs font-medium text-neutral-500 mb-1">Malzeme Cinsine Göre Filtrele</label>
          <select
            value={selectedCinsId}
            onChange={(e) => setSelectedCinsId(e.target.value)}
            className="w-full px-3 py-1.5 border border-neutral-200 bg-white rounded-md text-sm focus:outline-none focus:border-neutral-900 transition-colors"
          >
            <option value="">Tüm Cinsler / Malzemeler</option>
            {cinsler.map((cins) => (
              <option key={cins.id} value={cins.id}>{cins.name}</option>
            ))}
          </select>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleExportExcel}
            disabled={docLoading || filteredMaterials.length === 0}
            className="px-4 py-1.5 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-md shadow-sm transition-colors flex items-center gap-2 disabled:bg-neutral-300 cursor-pointer"
          >
            {docLoading ? 'Excel Üretiliyor...' : '📊 Excel Olarak İndir'}
          </button>

          <button
            onClick={handlePrint}
            disabled={filteredMaterials.length === 0}
            className="px-4 py-1.5 text-sm font-semibold bg-neutral-900 hover:bg-neutral-800 text-white rounded-md shadow-sm transition-colors flex items-center gap-2 disabled:bg-neutral-300 cursor-pointer"
          >
            📄 PDF / Baskı Al
          </button>
        </div>
      </div>

      {/* YAZDIRMA BAŞLIĞI */}
      <div className="hidden print:block space-y-4 border-b-2 border-neutral-950 pb-4 mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-md font-bold tracking-tight text-neutral-900 uppercase">EKİNOKS MEKANİK TESİSAT SİSTEMLERİ</h1>
          </div>
          <div className="text-right font-mono text-xs text-neutral-700">
            <div>Tarih: {bugun}</div>
          </div>
        </div>
        <div className="text-center py-2 bg-neutral-100 border border-neutral-300 rounded">
          <h2 className="text-md font-extrabold text-neutral-900 tracking-wider">MALZEME ÖNERİ VE ONAY FORMU (MOF)</h2>
        </div>
      </div>

      {/* AKILLI MATRİS TABLOSU */}
      <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden print:border-0 print:shadow-none print:rounded-none">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-neutral-50/80">
              <tr className="border-b-2 border-neutral-200 text-neutral-500 font-bold text-[11px] uppercase tracking-wider print:text-neutral-900 print:border-neutral-950">
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
                  <td colSpan={6} className="text-sm text-neutral-400 py-10 text-center">
                    Henüz teknik onay matrisine veri eklenmemiş veya seçilen filtreye uygun veri yok.
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
                  <tbody key={item.id} className="group hover:bg-blue-50/40 transition-colors duration-200 border-b-2 border-neutral-100 last:border-b-0 print:border-b-2 print:border-neutral-300">
                    {certs.map((cert, idx) => {
                      const isFirst = idx === 0;
                      const isLast = idx === certs.length - 1;

                      return (
                        <tr key={`${item.id}-${idx}`} className={`${!isLast ? 'border-b border-neutral-100/70 border-dashed' : ''} print:border-b-0`}>
                          
                          {/* SADECE İLK SATIRDA GÖSTERİLECEK BİRLEŞİK HÜCRELER */}
                          {isFirst && (
                            <>
                              <td rowSpan={certs.length} className="py-4 pl-5 pr-3 font-medium text-neutral-900 border-r border-neutral-100 align-middle print:border-r-2 print:border-neutral-300">
                                {item.cins_name}
                              </td>
                              <td rowSpan={certs.length} className="py-4 px-3 font-bold text-neutral-800 uppercase text-[11px] border-r border-neutral-100 align-middle print:border-r-2 print:border-neutral-300">
                                {item.company_name}
                              </td>
                            </>
                          )}
                          
                          {/* HER BİR STANDART İÇİN TEKRAR EDEN HÜCRELER */}
                          <td className="py-3 px-3 text-sm text-neutral-700 font-medium align-middle">
                            {cert.standart || '-'}
                          </td>
                          <td className="py-3 px-3 text-sm font-mono text-neutral-600 align-middle">
                            {cert.belge_no || '-'}
                          </td>
                          <td className="py-3 px-3 text-sm text-neutral-500 align-middle">
                            <div className="flex items-center gap-3">
                              <span>{cert.expiry_date || '-'}</span>
                              {cert.catalog_path && (
                                <a href={cert.catalog_path} target="_blank" rel="noopener noreferrer" className="px-2 py-0.5 bg-white border border-neutral-200 text-neutral-600 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50 rounded-md text-[10px] uppercase font-bold transition-all shadow-sm print:hidden">
                                  Katalog
                                </a>
                              )}
                            </div>
                          </td>

                          {/* İŞLEMLER BUTONU DA SADECE İLK SATIRDA GÖZÜKSÜN */}
                          {isFirst && (
                            <td rowSpan={certs.length} className="py-4 pr-5 pl-3 text-right align-middle print:hidden border-l border-neutral-100">
                              <div className="flex items-center justify-end gap-2">
                                {/* DÜZENLE BUTONU */}
                                <Link 
                                  href={`/malzeme-tipleri?edit=${item.id}`} 
                                  className="text-xs font-semibold text-blue-600 hover:text-white hover:bg-blue-600 px-3 py-1.5 rounded-md transition-all border border-transparent hover:border-blue-600 cursor-pointer inline-block"
                                >
                                  Düzenle
                                </Link>

                                {/* SİL BUTONU */}
                                <form action={silUreticiAction}>
                                  <input type="hidden" name="id" value={item.id} />
                                  <button type="submit" className="text-xs font-semibold text-red-500 hover:text-white hover:bg-red-500 px-3 py-1.5 rounded-md transition-all border border-transparent hover:border-red-500 cursor-pointer">
                                    Sil
                                  </button>
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

      {/* YAZDIRMA İMZA ALANI */}
      <div className="hidden print:grid grid-cols-3 gap-6 pt-16 text-center text-xs font-semibold">
        <div><p className="text-neutral-500">HAZIRLAYAN (YÜKLENİCİ)</p><p className="mt-8 text-neutral-900">Ekinoks Mekanik A.Ş.</p></div>
        <div><p className="text-neutral-500">İNCELEYEN (MÜŞAVİR)</p><p className="mt-8 text-neutral-400">□ ONAYLANDI</p></div>
        <div><p className="text-neutral-500">ONAYLAYAN (İŞVEREN)</p><p className="mt-8 text-neutral-300">______</p></div>
      </div>
    </div>
  );
}