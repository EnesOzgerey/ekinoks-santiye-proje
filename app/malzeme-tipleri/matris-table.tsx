'use client';

import { useState } from 'react';

export default function MatrisTable({ belgeliMalzemeler, cinsler, silUreticiAction }: { belgeliMalzemeler: any[], cinsler: any[], silUreticiAction: (formData: FormData) => void }) {
  const [selectedCinsId, setSelectedCinsId] = useState<string>('');
  const [docLoading, setDocLoading] = useState(false);

  const filteredMaterials = belgeliMalzemeler.filter(item => {
    return selectedCinsId === '' || item.cins_id?.toString() === selectedCinsId;
  });

  const handleExportExcel = async () => {
    try {
        setDocLoading(true);

        // Orijinal Excel şablon kodunun bozulmaması için JSON veriyi düzleştirip gönderiyoruz
        const flattenedMaterials: any[] = [];
        filteredMaterials.forEach(item => {
          let certs: any[] = [];
          try { certs = JSON.parse(item.certificates || '[]'); } catch(e) {}
          if (certs.length === 0) certs = [{}];
          
          certs.forEach(cert => {
            flattenedMaterials.push({
              id: item.id,
              cins_id: item.cins_id,
              cins_name: item.cins_name,
              company_name: item.company_name,
              standart: cert.standart || '-',
              belge_no: cert.belge_no || '-',
              expiry_date: cert.expiry_date || '-'
            });
          });
        });

        const res = await fetch('/api/malzeme-onay-doc', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ materials: flattenedMaterials })
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
      <div className="print:hidden p-4 bg-white rounded-lg border border-neutral-200 shadow-sm flex flex-wrap gap-4 items-end justify-between">
        <div className="flex-1 min-w-[250px]">
          <label className="block text-xs font-medium text-neutral-500 mb-1">Malzeme Cinsine Göre Filtrele</label>
          <select
            value={selectedCinsId}
            onChange={(e) => setSelectedCinsId(e.target.value)}
            className="w-full px-3 py-1.5 border border-neutral-200 bg-white rounded-md text-sm focus:outline-none focus:border-neutral-900"
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
            className="px-4 py-1.5 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-md shadow-sm transition flex items-center gap-2 disabled:bg-neutral-300 cursor-pointer"
          >
            {docLoading ? 'Excel Üretiliyor...' : '📊 Excel Olarak İndir'}
          </button>
          <button
            onClick={() => window.print()}
            disabled={filteredMaterials.length === 0}
            className="px-4 py-1.5 text-sm font-semibold bg-neutral-900 hover:bg-neutral-800 text-white rounded-md shadow-sm transition flex items-center gap-2 disabled:bg-neutral-300 cursor-pointer"
          >
            📄 PDF / Baskı Al
          </button>
        </div>
      </div>

      <div className="hidden print:block space-y-4 border-b-2 border-neutral-950 pb-4 mb-6">
        <div className="flex justify-between items-center">
          <div><h1 className="text-md font-bold tracking-tight text-neutral-900 uppercase">EKİNOKS MEKANİK TESİSAT SİSTEMLERİ</h1></div>
          <div className="text-right font-mono text-xs text-neutral-700"><div>Tarih: {bugun}</div></div>
        </div>
        <div className="text-center py-2 bg-neutral-100 border border-neutral-300 rounded">
          <h2 className="text-md font-extrabold text-neutral-900 tracking-wider">MALZEME ÖNERİ VE ONAY FORMU (MOF)</h2>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-neutral-200 shadow-sm p-6 print:border-0 print:p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse print:text-xs">
            <thead>
              <tr className="border-b border-neutral-200 text-neutral-500 font-semibold print:text-neutral-900 print:border-b-2 print:border-neutral-950">
                <th className="pb-3 pr-2">MALZEME CİNSİ</th>
                <th className="pb-3 pr-2">BELGE SAHİBİ / MARKA</th>
                <th className="pb-3 pr-2">STANDART</th>
                <th className="pb-3 pr-2">BELGE NO</th>
                <th className="pb-3 pr-2">GEÇERLİLİK</th>
                <th className="pb-3 text-right print:hidden">İŞLEMLER</th>
              </tr>
            </thead>
            <tbody className="divide-neutral-100 print:divide-neutral-300">
              {filteredMaterials.map((item) => {
                let certs: any[] = [];
                try { certs = JSON.parse(item.certificates || '[]'); } catch(e) {}
                if (certs.length === 0) certs = [{}];

                return certs.map((cert, idx) => (
                  <tr key={`${item.id}-${idx}`} className={`hover:bg-neutral-50/50 ${idx === certs.length - 1 ? 'border-b-2 border-neutral-200' : 'border-b border-neutral-100'}`}>
                    {idx === 0 && (
                      <>
                        <td rowSpan={certs.length} className="py-3 pr-2 font-medium text-neutral-900 align-top">{item.cins_name}</td>
                        <td rowSpan={certs.length} className="py-3 pr-2 font-semibold text-neutral-950 uppercase text-xs align-top">{item.company_name}</td>
                      </>
                    )}
                    <td className="py-3 pr-2 text-neutral-700 align-top">{cert.standart || '-'}</td>
                    <td className="py-3 pr-2 font-mono text-neutral-600 align-top">{cert.belge_no || '-'}</td>
                    <td className="py-3 pr-2 text-neutral-500 align-top">
                      {cert.expiry_date || '-'}
                      {cert.catalog_path && (
                        <a href={cert.catalog_path} target="_blank" className="ml-2 px-1.5 py-0.5 bg-neutral-100 border border-neutral-200 text-neutral-600 hover:text-blue-600 rounded text-[10px] uppercase font-bold inline-block transition">Katalog</a>
                      )}
                    </td>
                    {idx === 0 && (
                      <td rowSpan={certs.length} className="py-3 text-right print:hidden whitespace-nowrap align-top">
                        <form action={silUreticiAction}>
                          <input type="hidden" name="id" value={item.id} />
                          <button type="submit" className="text-xs font-semibold text-red-500 hover:text-red-700 px-2 py-1 rounded cursor-pointer transition">Üreticiyi Sil</button>
                        </form>
                      </td>
                    )}
                  </tr>
                ));
              })}
            </tbody>
          </table>
          {filteredMaterials.length === 0 && (
            <p className="text-sm text-neutral-400 py-6 text-center">
              Henüz teknik onay matrisine veri eklenmemiş veya seçilen filtreye uygun veri yok.
            </p>
          )}
        </div>
      </div>

      <div className="hidden print:grid grid-cols-3 gap-6 pt-16 text-center text-xs font-semibold">
        <div><p className="text-neutral-500">HAZIRLAYAN (YÜKLENİCİ)</p><p className="mt-8 text-neutral-900">Ekinoks Mekanik A.Ş.</p></div>
        <div><p className="text-neutral-500">İNCELEYEN (MÜŞAVİR)</p><p className="mt-8 text-neutral-400">□ ONAYLANDI</p></div>
        <div><p className="text-neutral-500">ONAYLAYAN (İŞVEREN)</p><p className="mt-8 text-neutral-300">______</p></div>
      </div>
    </div>
  );
}