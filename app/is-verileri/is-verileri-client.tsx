"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { kaydetAdamSaat } from './actions';

// HER BİR MALZEME GRUBUNU (ANA KART) YÖNETEN BİLEŞEN
const MaterialGroupCard = ({ item }: { item: any }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Record<string, { gerekli_adam: string, adam_saat: string }>>({});

  // DB'den gelen verileri yerel state'e aktar
  useEffect(() => {
    const newForm: any = {};
    item.items.forEach((i: any) => {
      newForm[i.cap] = {
        gerekli_adam: i.dbRecord ? i.dbRecord.gerekli_adam.toString() : '',
        adam_saat: i.dbRecord ? i.dbRecord.adam_saat.toString() : ''
      };
    });
    setFormData(newForm);
  }, [item.items]);

  const handleInputChange = (cap: string, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [cap]: { ...prev[cap], [field]: value }
    }));
  };

  // Kartın içinde herhangi bir satırda kaydedilmemiş "geçerli" bir değişiklik var mı?
  const hasChanges = useMemo(() => {
    return item.items.some((i: any) => {
      const current = formData[i.cap];
      if (!current) return false;
      const origAdam = i.dbRecord ? i.dbRecord.gerekli_adam.toString() : '';
      const origSaat = i.dbRecord ? i.dbRecord.adam_saat.toString() : '';
      
      // Sadece her iki alan da doluysa ve orijinalden farklıysa "değişiklik var" sayılır
      if (current.gerekli_adam && current.adam_saat) {
        return current.gerekli_adam !== origAdam || current.adam_saat !== origSaat;
      }
      return false;
    });
  }, [formData, item.items]);

  const handleBulkSave = async () => {
    setLoading(true);
    try {
      const promises: any[] = [];
      
      // Sadece değişen ve eksiksiz doldurulan satırları bul ve DB'ye yolla
      item.items.forEach((i: any) => {
        const current = formData[i.cap];
        if (current && current.gerekli_adam && current.adam_saat) {
          const origAdam = i.dbRecord ? i.dbRecord.gerekli_adam.toString() : '';
          const origSaat = i.dbRecord ? i.dbRecord.adam_saat.toString() : '';
          
          if (current.gerekli_adam !== origAdam || current.adam_saat !== origSaat) {
            const fd = new FormData();
            fd.append('malzeme_adi', item.malzeme_adi);
            fd.append('cap', i.cap);
            fd.append('birim', item.birim);
            fd.append('gerekli_adam', current.gerekli_adam);
            fd.append('adam_saat', current.adam_saat);
            promises.push(kaydetAdamSaat(fd));
          }
        }
      });

      if (promises.length > 0) {
        await Promise.all(promises);
      }
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  const progressPercent = item.total > 0 ? (item.completed / item.total) * 100 : 0;
  const isFullyCompleted = item.completed === item.total;

  return (
    <div className={`bg-[#0f0f11] border rounded-2xl transition-all duration-300 overflow-hidden shadow-xl ${isExpanded ? (isFullyCompleted ? 'border-emerald-500/50 shadow-emerald-900/10' : 'border-blue-500/50 shadow-blue-900/10') : 'border-zinc-800 hover:border-zinc-700'}`}>
      
      {/* KART BAŞLIĞI (Tıklanabilir) */}
      <div onClick={() => setIsExpanded(!isExpanded)} className="flex items-center justify-between p-5 cursor-pointer hover:bg-[#131316] transition-colors group">
        <div className="flex items-center gap-4">
          <span className={`text-zinc-500 text-sm transition-transform duration-300 ${isExpanded ? 'rotate-90 text-blue-400' : 'group-hover:text-blue-400'}`}>▶</span>
          <div className="flex flex-col">
            <h2 className="text-lg font-bold text-zinc-100 group-hover:text-blue-300 transition-colors">{item.malzeme_adi}</h2>
            <div className="text-[10px] font-bold text-zinc-500 mt-0.5">Birim: <span className="text-zinc-300">{item.birim}</span></div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end gap-1.5 w-32">
            <div className="flex justify-between w-full text-[10px] font-bold font-mono">
              <span className={isFullyCompleted ? 'text-emerald-400' : 'text-zinc-400'}>{item.completed} / {item.total} Çap Girildi</span>
              <span className="text-zinc-500">{Math.round(progressPercent)}%</span>
            </div>
            <div className="w-full bg-zinc-900 rounded-full h-1.5 overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-500 ${isFullyCompleted ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${progressPercent}%` }}></div>
            </div>
          </div>
          <div className={`w-3 h-3 rounded-full shadow-lg ${isFullyCompleted ? 'bg-emerald-500 shadow-emerald-500/50' : (item.completed > 0 ? 'bg-amber-500 shadow-amber-500/50' : 'bg-zinc-700')}`}></div>
        </div>
      </div>

      {/* KART İÇERİĞİ (Genişletildiğinde Açılır) */}
      {isExpanded && (
        <div className="bg-[#131316] border-t border-zinc-800/50 p-6 shadow-inner cursor-default">
          
          {/* Tablo Başlıkları */}
          <div className="grid grid-cols-12 gap-4 pb-3 border-b border-zinc-800 text-[10px] text-zinc-500 uppercase tracking-widest font-bold items-center mb-3">
            <div className="col-span-4 pl-2">Çap / Ölçü</div>
            <div className="col-span-3 text-center">Gerekli Ekip</div>
            <div className="col-span-3 text-center">Adam-Saat <span className="normal-case tracking-normal text-zinc-600">(/ {item.birim})</span></div>
            <div className="col-span-2 text-center">Durum</div>
          </div>

          {/* Çap Satırları */}
          <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
            {item.items.map((i: any, index: number) => {
              const rowData = formData[i.cap] || { gerekli_adam: '', adam_saat: '' };
              const origAdam = i.dbRecord ? i.dbRecord.gerekli_adam.toString() : '';
              const origSaat = i.dbRecord ? i.dbRecord.adam_saat.toString() : '';
              const isRowChanged = (rowData.gerekli_adam && rowData.adam_saat) && (rowData.gerekli_adam !== origAdam || rowData.adam_saat !== origSaat);
              const isRowSaved = !!i.dbRecord;

              return (
                <div key={index} className={`grid grid-cols-12 gap-4 items-center p-2 rounded-lg border transition-colors ${isRowChanged ? 'border-amber-500/30 bg-amber-950/10' : 'border-zinc-800/50 bg-[#18181b] hover:border-zinc-700'}`}>
                  
                  <div className="col-span-4 font-mono text-sm font-bold text-blue-300 pl-2">
                    {i.cap}
                  </div>
                  
                  <div className="col-span-3">
                    <input 
                      type="number" placeholder="Kişi" 
                      value={rowData.gerekli_adam} onChange={e => handleInputChange(i.cap, 'gerekli_adam', e.target.value)} 
                      className="w-full max-w-[100px] mx-auto block bg-zinc-950 border border-zinc-700 focus:border-amber-500 rounded-md p-2 text-xs font-bold text-amber-400 outline-none text-center transition-colors"
                    />
                  </div>

                  <div className="col-span-3">
                    <input 
                      type="number" step="any" placeholder="Süre" 
                      value={rowData.adam_saat} onChange={e => handleInputChange(i.cap, 'adam_saat', e.target.value)} 
                      className="w-full max-w-[100px] mx-auto block bg-zinc-950 border border-zinc-700 focus:border-blue-500 rounded-md p-2 text-xs font-bold text-white outline-none text-center transition-colors"
                    />
                  </div>

                  <div className="col-span-2 flex justify-center">
                    {isRowChanged ? (
                      <span className="text-[10px] font-bold text-amber-400 bg-amber-950/40 px-2 py-1 rounded border border-amber-900/50">Bekliyor</span>
                    ) : isRowSaved ? (
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/40 px-2 py-1 rounded border border-emerald-900/50">Kayıtlı</span>
                    ) : (
                      <span className="text-[10px] font-bold text-zinc-500 bg-zinc-900 px-2 py-1 rounded border border-zinc-800">Eksik</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Alt Kısım - Toplu Kayıt Butonu */}
          <div className="mt-4 pt-4 border-t border-zinc-800/50 flex justify-end">
            <button 
              onClick={handleBulkSave} 
              disabled={loading || !hasChanges} 
              className={`px-8 py-2.5 rounded-xl text-xs font-bold tracking-widest transition-all ${
                hasChanges 
                  ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20' 
                  : 'bg-zinc-900 text-zinc-600 cursor-not-allowed border border-zinc-800'
              }`}
            >
              {loading ? 'KAYDEDİLİYOR...' : 'DEĞİŞİKLİKLERİ KAYDET'}
            </button>
          </div>

        </div>
      )}
    </div>
  );
};


// ANA SAYFA BİLEŞENİ
export default function IsVerileriClient({ initialData, kutuphaneData = [] }: { initialData: any[], kutuphaneData: any[] }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDurum, setFilterDurum] = useState("ALL");

  // Kütüphaneden gelen verileri "Malzeme Bazlı" grupluyoruz
  const groupedMaterials = useMemo(() => {
    const map = new Map();
    
    kutuphaneData.forEach(mat => {
      let caps: string[] = [];
      if (mat.caplar_mm) caps = mat.caplar_mm.map((c:any) => `Ø${c} mm`);
      else if (mat.caplar_dn) caps = mat.caplar_dn;
      else if (mat.kalinlik_mm) caps = mat.kalinlik_mm.map((c:any) => `${c} mm Kalınlık`);
      else if (mat.olculer) caps = mat.olculer;

      if (caps.length > 0) {
        const items = caps.map(cap => {
          const dbRecord = initialData.find(d => d.malzeme_adi === mat.ad && d.cap === cap);
          return { cap, dbRecord };
        });

        map.set(mat.ad, {
          malzeme_adi: mat.ad,
          birim: mat.olcu_birimi || 'adet',
          items: items,
          total: items.length,
          completed: items.filter(i => i.dbRecord).length
        });
      }
    });
    
    return Array.from(map.values());
  }, [kutuphaneData, initialData]);

  // Arama ve Filtreleme Motoru
  const filteredList = useMemo(() => {
    return groupedMaterials.filter(item => {
      const matchSearch = item.malzeme_adi.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchStatus = filterDurum === "ALL" 
        ? true 
        : filterDurum === "MISSING" ? item.completed < item.total 
        : filterDurum === "COMPLETED" ? item.completed === item.total : true;

      return matchSearch && matchStatus;
    });
  }, [groupedMaterials, searchTerm, filterDurum]);

  return (
    <div className="max-w-[1200px] mx-auto p-6 bg-zinc-950 min-h-screen text-zinc-100">
      
      {/* STANDART ÜST BAR VE TOOLBAR */}
      <div className="mb-8 flex flex-col gap-4">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-100">İş Verileri (Adam-Saat & Ekip Planlama)</h1>
        
        <div className="flex flex-wrap items-center gap-3 bg-[#131316] p-2.5 rounded-xl border border-zinc-800 shadow-xl relative z-40 w-fit">
          <div className="relative">
            <input 
              type="text" 
              placeholder="Ana Malzeme Ara..." 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
              className="bg-[#18181b] border border-zinc-700 text-xs rounded-lg pl-8 pr-3 py-2.5 text-zinc-300 focus:outline-none focus:border-blue-500 w-64 transition-colors"
            />
            <span className="absolute left-3 top-2.5 text-zinc-500 text-sm">🔍</span>
          </div>
          
          <select 
            value={filterDurum} 
            onChange={e => setFilterDurum(e.target.value)} 
            className="bg-[#18181b] border border-zinc-700 text-xs font-bold text-zinc-400 rounded-lg px-3 py-2.5 focus:outline-none focus:border-blue-500 cursor-pointer transition-colors"
          >
            <option value="ALL">Tüm Malzemeler</option>
            <option value="MISSING">🔴 Eksik Çapları Olanlar</option>
            <option value="COMPLETED">🟢 Tamamen Girilmiş Olanlar</option>
          </select>
        </div>
      </div>

      {/* DİNAMİK MALZEME KARTLARI (AKORDEON LİSTESİ) */}
      <div className="flex flex-col gap-4">
        {filteredList.map((item, index) => (
          <MaterialGroupCard key={index} item={item} />
        ))}

        {filteredList.length === 0 && (
          <div className="p-12 text-center text-zinc-500 italic bg-[#0f0f11] rounded-2xl border border-zinc-800 mt-2">
            Aradığınız kriterlere uygun malzeme bulunamadı.
          </div>
        )}
      </div>

    </div>
  );
}