'use client';

import { useState } from 'react';
import Link from 'next/link';

const IS_GRUPLARI = [
  "Yangın Söndürme Sistemi",
  "Havalandırma Sistemi",
  "Sıhhi Tesisat Pis Su ve Temiz Su Sistemi",
  "Klima Drenaj Borulama",
  "Radye İçi Temel Borulama"
];

export default function ImalatTable({ yapilanlar, editId, silAction }: { yapilanlar: any[], editId: string | undefined, silAction: (formData: FormData) => void }) {
  const [filterGroup, setFilterGroup] = useState<string>('');
  const [filterDate, setFilterDate] = useState<string>('');

  // 🎯 İSTEDİĞİN AKILLI FİLTRELEME MANTIĞI BURASI
  const filteredItems = yapilanlar.filter((item) => {
    const matchesGroup = filterGroup === '' || item.job_group === filterGroup;
    
    let matchesDate = true;
    if (filterDate !== '') {
      const start = item.start_date || '';
      const end = item.end_date || '';
      
      // Seçilen gün, işin başlangıç tarihinden büyük/eşit VE bitiş tarihinden küçük/eşit olmalı
      matchesDate = filterDate >= start && filterDate <= end;
    }
    
    return matchesGroup && matchesDate;
  });

  return (
    <div className="space-y-4">
      
      {/* FİLTRELEME BARBARI */}
      <div className="p-4 bg-white rounded-lg border border-neutral-200 shadow-sm flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-medium text-neutral-500 mb-1">İş Grubuna Göre Filtrele</label>
          <select value={filterGroup} onChange={(e) => setFilterGroup(e.target.value)} className="w-full px-3 py-1.5 border border-neutral-200 bg-white rounded-md text-sm focus:outline-none focus:border-neutral-900">
            <option value="">Tüm Gruplar</option>
            {IS_GRUPLARI.map((grup) => <option key={grup} value={grup}>{grup}</option>)}
          </select>
        </div>

        <div className="w-48">
          <label className="block text-xs font-medium text-neutral-500 mb-1">Güne Göre Filtrele (O Gün Aktif Olanlar)</label>
          <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="w-full px-3 py-1.5 border border-neutral-200 rounded-md text-sm focus:outline-none focus:border-neutral-900" />
        </div>

        {(filterGroup || filterDate) && (
          <button onClick={() => { setFilterGroup(''); setFilterDate(''); }} className="text-xs font-medium text-neutral-500 hover:text-neutral-900 underline pb-2">Temizle</button>
        )}
      </div>

      {/* TABLO LİSTESİ */}
      <div className="bg-white rounded-lg border border-neutral-200 shadow-sm p-6">
        <h3 className="text-sm font-semibold mb-4 text-neutral-500 uppercase tracking-wider">Saha İmalat Geçmişi ({filteredItems.length})</h3>
        
        {filteredItems.length === 0 ? (
          <p className="text-sm text-neutral-400 py-4 text-center">Seçilen kriterlere veya tarihe denk gelen bir imalat bulunmuyor.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-neutral-600">
              <thead>
                <tr className="border-b border-neutral-100 text-neutral-400 font-medium">
                  <th className="pb-3">Yapılan İş ve Lokasyon</th>
                  <th className="pb-3">Uygulama Süreci</th>
                  <th className="pb-3">Kullanılan Malzeme</th>
                  <th className="pb-3 text-right">Metraj</th>
                  <th className="pb-3 text-right">Hakediş Bedeli</th>
                  <th className="pb-3 text-center">Durum</th>
                  <th className="pb-3 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filteredItems.map((item) => (
                  <tr key={item.id} className={`hover:bg-neutral-50/50 ${editId === item.id.toString() ? 'bg-neutral-100/70' : ''}`}>
                    <td className="py-3">
                      <div className="font-medium text-neutral-950">{item.job_name || <span className="text-red-500 italic">Silinmiş İş Tanımı</span>}</div>
                      <div className="text-[11px] text-neutral-400 font-medium mt-0.5">
                        {item.job_group} {item.project_name ? `• ${item.project_name}` : ''}
                      </div>
                    </td>
                    
                    {/* BAŞLANGIÇ VE BİTİŞ TARİHLERİ SÜTUNU (YENİ) */}
                    <td className="py-3 text-xs font-mono text-neutral-500 whitespace-nowrap">
                      <div>Baş: {item.start_date}</div>
                      <div>Bit: {item.end_date}</div>
                    </td>

                    <td className="py-3 text-xs text-neutral-600">
                      {item.mat_type_name ? (
                        <div>
                          <span className="font-medium text-neutral-800">{item.mat_type_name}</span>
                          <span className="block text-neutral-400 text-[11px]">{item.mat_brand || 'Markasız'}</span>
                        </div>
                      ) : (
                        <span className="text-neutral-400 italic">Sadece İşçilik</span>
                      )}
                    </td>
                    <td className="py-3 text-right font-mono text-neutral-900">{item.quantity_length} mt</td>
                    <td className="py-3 text-right font-mono font-medium text-neutral-950">
                      {item.hesaplanan_maliyet ? `${item.hesaplanan_maliyet.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL` : '0,00 TL'}
                    </td>
                    <td className="py-3 text-center">
                      <span className={`inline-block px-2 py-0.5 text-xs rounded-full font-medium ${
                        item.situation === 'Tamamlandi' ? 'bg-neutral-100 text-neutral-800' : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {item.situation === 'Tamamlandi' ? 'Tamamlandı' : 'Devam Ediyor'}
                      </span>
                    </td>
                    <td className="py-3 text-right space-x-2 whitespace-nowrap">
                      <Link href={`/yapilan-imalatlar?edit=${item.id}`} className="text-xs font-semibold text-neutral-600 hover:text-neutral-900 transition px-2 py-1 rounded hover:bg-neutral-100">Düzenle</Link>
                      <form action={silAction} className="inline-block">
                        <input type="hidden" name="id" value={item.id} />
                        <button type="submit" className="text-xs font-semibold text-red-500 hover:text-red-700 transition px-2 py-1 rounded hover:bg-red-50">Sil</button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}