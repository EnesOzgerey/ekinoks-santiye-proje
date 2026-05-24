'use client';

import React, { useState, useRef } from 'react';
import { kaydetMalzeme, silMalzeme } from './actions';

export default function MalzemeClient({ malzemeler }: { malzemeler: any[] }) {
  // --- SATIR İÇİ (INLINE) DÜZENLEME VE EKLEME DURUMLARI ---
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ cins: '', standart: '', birim: '' });
  const [loading, setLoading] = useState(false);

  // --- OTOMATİK TAMAMLAMA (AUTOCOMPLETE) ---
  const uniqueCinsList = Array.from(new Set(malzemeler.map(m => m.cins).filter(Boolean)));
  const [showCinsSuggestions, setShowCinsSuggestions] = useState(false);

  // --- VERİLERİ CİNSE GÖRE GRUPLAMA (Kategori Başlıkları İçin) ---
  const groupedMalzemeler = malzemeler.reduce((acc: any, item: any) => {
    const cins = item.cins || 'Kategorisiz';
    if (!acc[cins]) acc[cins] = [];
    acc[cins].push(item);
    return acc;
  }, {});

  // İşlem Fonksiyonları
  const handleEditClick = (item: any) => {
    setAdding(false);
    setEditingId(item.id);
    setFormData({ cins: item.cins, standart: item.standart, birim: item.birim });
  };

  const handleAddClick = () => {
    setEditingId(null);
    setAdding(true);
    setFormData({ cins: '', standart: '', birim: '' });
  };

  const handleCancel = () => {
    setAdding(false);
    setEditingId(null);
  };

  // Tekli veya Çoklu Kaydetme Algoritması
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.cins || !formData.standart || !formData.birim) {
      alert("Lütfen tüm alanları doldurun.");
      return;
    }
    
    setLoading(true);

    try {
      if (editingId) {
        // MEVCUT SATIRI GÜNCELLE
        const data = new FormData();
        data.append('id', editingId.toString());
        data.append('cins', formData.cins);
        data.append('standart', formData.standart);
        data.append('birim', formData.birim);
        await kaydetMalzeme(data);
      } else {
        // YENİ EKLE (Virgülle ayrılmış "Çoklu Standart Ekleme" Desteği)
        const standartlar = formData.standart.split(',').map(s => s.trim()).filter(Boolean);
        
        await Promise.all(standartlar.map(async (std) => {
          const data = new FormData();
          data.append('cins', formData.cins);
          data.append('standart', std);
          data.append('birim', formData.birim);
          return kaydetMalzeme(data);
        }));
      }

      setAdding(false);
      setEditingId(null);
    } catch (error: any) {
      alert('Kayıt Hatası: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Inline Girdi Satırı Bileşeni (Hem Ekleme hem Düzenleme için ortak)
  const renderInlineForm = (isNew: boolean) => (
    <tr className={`bg-blue-900/10 border-y border-blue-500/30 shadow-[inset_0_0_20px_rgba(37,99,235,0.05)] transition-all`}>
      <td className="py-2.5 px-4 align-top">
        <div className="relative">
          <input
            type="text"
            placeholder="Malzeme Cinsi"
            value={formData.cins}
            onChange={(e) => {
              setFormData({ ...formData, cins: e.target.value });
              setShowCinsSuggestions(true);
            }}
            onFocus={() => setShowCinsSuggestions(true)}
            onBlur={() => setTimeout(() => setShowCinsSuggestions(false), 150)}
            className="w-full bg-zinc-950 border border-blue-500/50 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/50 transition-all"
            required
          />
          {showCinsSuggestions && formData.cins && uniqueCinsList.filter(c => c.toLowerCase().includes(formData.cins.toLowerCase())).length > 0 && (
            <ul className="absolute z-50 w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl max-h-48 overflow-y-auto overflow-x-hidden">
              {uniqueCinsList
                .filter(c => c.toLowerCase().includes(formData.cins.toLowerCase()))
                .map((c, i) => (
                  <li
                    key={i}
                    onMouseDown={() => { // onClick yerine onMouseDown, blur çakışmasını önler
                      setFormData({ ...formData, cins: c });
                      setShowCinsSuggestions(false);
                    }}
                    className="px-4 py-2.5 text-sm text-zinc-300 hover:bg-blue-600 hover:text-white cursor-pointer transition-colors border-b border-zinc-700/50 last:border-0"
                  >
                    {c}
                  </li>
                ))}
            </ul>
          )}
        </div>
      </td>
      <td className="py-2.5 px-4 align-top">
        <input
          type="text"
          placeholder={isNew ? "Örn: DN50, DN65 (Çoklu ekleme için virgül koyun)" : "Standart / Özellik"}
          value={formData.standart}
          onChange={(e) => setFormData({ ...formData, standart: e.target.value })}
          className="w-full bg-zinc-950 border border-blue-500/50 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/50 transition-all placeholder:text-zinc-600"
          required
        />
        {isNew && <span className="block mt-1 text-[10px] text-zinc-500">Aynı cinse birden fazla standart girmek için aralarına virgül koyabilirsiniz.</span>}
      </td>
      <td className="py-2.5 px-4 align-top">
        <input
          type="text"
          placeholder="Örn: mt, Adet"
          value={formData.birim}
          onChange={(e) => setFormData({ ...formData, birim: e.target.value })}
          className="w-full bg-zinc-950 border border-blue-500/50 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/50 transition-all"
          required
        />
      </td>
      <td className="py-2.5 px-4 align-top text-right">
        <div className="flex justify-end gap-2 mt-1">
          <button
            type="button"
            onClick={handleCancel}
            className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-lg text-xs font-bold transition-colors cursor-pointer border border-zinc-700"
          >
            İptal
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || !formData.cins || !formData.standart || !formData.birim}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold shadow-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? 'İşleniyor...' : 'Kaydet'}
          </button>
        </div>
      </td>
    </tr>
  );

  return (
    <div className="max-w-[1200px] mx-auto p-6">
      
      {/* Üst Başlık ve İstatistik (Opsiyonel ferahlık için) */}
      <div className="mb-6 flex justify-between items-end border-b border-zinc-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Malzeme Tipleri</h1>
          <p className="text-sm text-zinc-500 mt-1">Şantiyede kullanılan standart malzemeleri ve birimlerini yönetin.</p>
        </div>
        <div className="text-xs font-mono bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-lg text-zinc-400">
          Toplam <strong className="text-white">{malzemeler.length}</strong> Kalem
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-zinc-950 text-zinc-500 font-bold text-[10px] uppercase tracking-widest border-b border-zinc-800">
                <th className="py-4 px-6 w-[30%]">MALZEME CİNSİ</th>
                <th className="py-4 px-4 w-[40%]">STANDART / ÖZELLİK</th>
                <th className="py-4 px-4 w-[15%]">BİRİM</th>
                <th className="py-4 px-6 w-[15%] text-right">İŞLEMLER</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(groupedMalzemeler).map(([cins, items]: [string, any]) => (
                <React.Fragment key={cins}>
                  
                  {/* Grup Başlığı Satırı */}
                  <tr className="bg-zinc-950/50 border-b border-zinc-800/80">
                    <td colSpan={4} className="py-2.5 px-6">
                      <span className="inline-flex items-center gap-2 px-2.5 py-1 bg-zinc-800/50 border border-zinc-700/50 rounded-md text-xs font-bold text-blue-400">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                        {cins}
                      </span>
                    </td>
                  </tr>

                  {/* O Cinse Ait Standartlar */}
                  {items.map((item: any) => (
                    editingId === item.id ? (
                      <React.Fragment key={item.id}>
                        {renderInlineForm(false)}
                      </React.Fragment>
                    ) : (
                      <tr key={item.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/40 transition-colors group">
                        <td className="py-3.5 px-6 text-zinc-500 font-medium">
                          <span className="pl-4 border-l-2 border-zinc-700 group-hover:border-blue-500 transition-colors">
                            {item.cins}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-zinc-200 font-semibold">{item.standart}</td>
                        <td className="py-3.5 px-4 text-zinc-400">
                          <span className="bg-zinc-950 border border-zinc-800 px-2 py-0.5 rounded text-xs">{item.birim}</span>
                        </td>
                        <td className="py-3.5 px-6 text-right">
                          <div className="flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleEditClick(item)} className="p-1.5 text-zinc-500 hover:text-blue-400 hover:bg-blue-500/10 rounded transition-all cursor-pointer" title="Düzenle">
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                            </button>
                            <form action={silMalzeme} className="inline">
                              <input type="hidden" name="id" value={item.id} />
                              <button type="submit" className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-all cursor-pointer" title="Sil">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                              </button>
                            </form>
                          </div>
                        </td>
                      </tr>
                    )
                  ))}
                </React.Fragment>
              ))}

              {/* YENİ GİRDİ SATIRI (Tablonun en altında açılır) */}
              {adding && renderInlineForm(true)}

            </tbody>
          </table>
        </div>
      </div>

      {/* TABLO ALTINDAKİ SİHİRLİ (+) BUTONU */}
      {!adding && (
        <div className="mt-4 flex justify-center">
          <button
            onClick={handleAddClick}
            className="flex items-center gap-2 px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-blue-500/50 text-zinc-300 hover:text-blue-400 font-bold rounded-full transition-all shadow-lg hover:shadow-[0_0_20px_rgba(37,99,235,0.15)] cursor-pointer"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
            Yeni Malzeme Ekle
          </button>
        </div>
      )}

    </div>
  );
}