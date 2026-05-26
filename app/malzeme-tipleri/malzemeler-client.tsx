"use client";

import React, { useState, useMemo } from 'react';
import { yeniMalzemeEkle, guncelleMarka, guncelleMalzemeCinsi, silMarka, silStandart } from './actions';

export default function MalzemelerClient({ initialData }: { initialData: any[] }) {
  const [loading, setLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  
  const [hCins, setHCins] = useState<number | null>(null);
  const [hMarka, setHMarka] = useState<number | null>(null);
  const [hStd, setHStd] = useState<number | null>(null);

  const uniqueCinsList = useMemo(() => Array.from(new Set(initialData.map(c => c.name))), [initialData]);
  const [showAutocomplete, setShowAutocomplete] = useState(false);

  const [isAddingRoot, setIsAddingRoot] = useState(false);
  const [editingMarkaId, setEditingMarkaId] = useState<number | null>(null);
  
  const [editingCinsId, setEditingCinsId] = useState<number | null>(null);
  const [editCinsName, setEditCinsName] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [filterDurum, setFilterDurum] = useState("TÜMÜ");

  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

  const toggleMarkaSelection = (id: string) => {
    const newSet = new Set(selectedRows);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedRows(newSet);
  };

  const toggleCinsSelection = (cins: any) => {
    const newSet = new Set(selectedRows);
    const allSelected = cins.markalar.every((m: any) => newSet.has(`marka-${m.id}`));
    
    if (allSelected) {
      cins.markalar.forEach((m: any) => newSet.delete(`marka-${m.id}`));
    } else {
      cins.markalar.forEach((m: any) => newSet.add(`marka-${m.id}`));
    }
    setSelectedRows(newSet);
  };

  const emptyStandart = { standartAdi: '', belgeNo: '', gecerlilik: '' };
  
  const [formState, setFormState] = useState<{
    cinsName: string; markaName: string; durum: string; katalogDosya: File | null; standartlar: typeof emptyStandart[]
  }>({ 
    cinsName: '', markaName: '', durum: 'SUNULDU', katalogDosya: null, standartlar: [{ ...emptyStandart }] 
  });

  const getStatusStyle = (durum: string) => {
    switch (durum) {
      case 'ONAYLANDI': return 'bg-emerald-950/50 text-emerald-400 border border-emerald-500/30';
      case 'ONAY BEKLİYOR': return 'bg-amber-950/50 text-amber-400 border border-amber-500/30';
      case 'REDDEDİLDİ': return 'bg-red-950/50 text-red-400 border border-red-500/30';
      default: return 'bg-blue-950/30 text-blue-400 border border-blue-500/30';
    }
  };

  const filteredData = useMemo(() => {
    if (!initialData) return [];
    return initialData.map(cins => {
      const matchCins = cins.name.toLowerCase().includes(searchTerm.toLowerCase());
      const filteredMarkalar = cins.markalar.map((marka: any) => {
        const matchMarka = marka.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchDurum = filterDurum === "TÜMÜ" || marka.durum === filterDurum;
        const filteredStandartlar = marka.standartlar.filter((std: any) => 
          (std.standart_adi && std.standart_adi.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (std.belge_no && std.belge_no.toLowerCase().includes(searchTerm.toLowerCase()))
        );
        if (!matchDurum) return null;
        if (searchTerm === "" || matchCins || matchMarka || filteredStandartlar.length > 0) {
           return { ...marka, standartlar: (searchTerm === "" || matchCins || matchMarka) ? marka.standartlar : filteredStandartlar };
        }
        return null;
      }).filter(Boolean);
      if (filteredMarkalar.length > 0) return { ...cins, markalar: filteredMarkalar };
      return null;
    }).filter(Boolean);
  }, [initialData, searchTerm, filterDurum]);

  const visibleRowKeys = useMemo(() => {
    const keys: string[] = [];
    filteredData.forEach(cins => {
      cins.markalar.forEach((marka: any) => {
        keys.push(`marka-${marka.id}`);
      });
    });
    return keys;
  }, [filteredData]);

  const isAllVisibleSelected = visibleRowKeys.length > 0 && visibleRowKeys.every(k => selectedRows.has(k));

  const toggleSelectAllVisible = () => {
    const newSet = new Set(selectedRows);
    if (isAllVisibleSelected) {
      visibleRowKeys.forEach(k => newSet.delete(k)); 
    } else {
      visibleRowKeys.forEach(k => newSet.add(k)); 
    }
    setSelectedRows(newSet);
  };

  const handleDownloadExcel = async () => {
    try {
      setIsDownloading(true);

      const dataToExport = selectedRows.size > 0 ? 
        initialData.map(cins => {
          const newMarkalar = cins.markalar.filter((m: any) => selectedRows.has(`marka-${m.id}`));
          return newMarkalar.length > 0 ? { ...cins, markalar: newMarkalar } : null;
        }).filter(Boolean) 
      : filteredData;

      const res = await fetch('/api/malzeme-onay-doc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ materials: dataToExport })
      });
      if (!res.ok) throw new Error('İndirme sırasında bir hata oluştu');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Malzeme_Oneri_ve_Onay_Formu.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error: any) { alert("Hata: " + error.message); } 
    finally { setIsDownloading(false); }
  };

  const openAddMode = () => {
    setEditingMarkaId(null); setIsAddingRoot(true);
    setFormState({ cinsName: '', markaName: '', durum: 'SUNULDU', katalogDosya: null, standartlar: [{ ...emptyStandart }] });
  };

  const openEditMode = (marka: any) => {
    setIsAddingRoot(false); setEditingMarkaId(marka.id);
    setFormState({
      cinsName: '', markaName: marka.name, durum: marka.durum || 'SUNULDU', katalogDosya: null,
      standartlar: marka.standartlar.length > 0 ? marka.standartlar.map((s:any) => ({ standartAdi: s.standart_adi, belgeNo: s.belge_no || '', gecerlilik: s.gecerlilik || '' })) : [{ ...emptyStandart }]
    });
  };

  const handleCancel = () => { setIsAddingRoot(false); setEditingMarkaId(null); };

  const handleStandartChange = (index: number, field: string, value: string) => {
    const newStds = [...formState.standartlar];
    newStds[index] = { ...newStds[index], [field]: value };
    setFormState({ ...formState, standartlar: newStds });
  };

  const addStandart = () => setFormState({ ...formState, standartlar: [...formState.standartlar, { ...emptyStandart }] });
  const removeStandart = (index: number) => setFormState({ ...formState, standartlar: formState.standartlar.filter((_, i) => i !== index) });

  const handleSave = async () => {
    setLoading(true);
    try {
      const data = new FormData();
      data.append('markaName', formState.markaName);
      data.append('durum', formState.durum);
      if (formState.katalogDosya) data.append('katalogDosya', formState.katalogDosya);
      data.append('standartlarJSON', JSON.stringify(formState.standartlar));
      
      if (editingMarkaId) {
        data.append('markaId', editingMarkaId.toString());
        await guncelleMarka(data);
      } else {
        data.append('cinsName', formState.cinsName);
        await yeniMalzemeEkle(data);
      }
      handleCancel();
    } catch (err: any) { alert(err.message); }
    finally { setLoading(false); }
  };

  const handleCinsSave = async (id: number) => {
    setLoading(true);
    try { await guncelleMalzemeCinsi(id, editCinsName); setEditingCinsId(null); } 
    catch (err: any) { alert(err.message); } finally { setLoading(false); }
  };

  const getCleanFileName = (pathOrName: string) => pathOrName.split('_--').pop();

  return (
    <div className="max-w-[1400px] mx-auto p-6 bg-zinc-950 min-h-screen text-zinc-100">
      
      <div className="mb-6 flex flex-col gap-4">
        <h1 className="text-xl font-bold tracking-tight pr-48">Malzeme Onay ve Belge Takip Paneli</h1>
        <div className="flex flex-wrap items-center gap-3 bg-zinc-900/40 p-2 rounded-lg border border-zinc-800/60 w-fit shadow-sm">
          <div className="relative">
            <input type="text" placeholder="Ara (Kategori, Marka, Belge No)..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="bg-[#131316] border border-zinc-800 text-xs rounded-md pl-8 pr-3 py-2 text-zinc-300 focus:outline-none focus:border-blue-500 w-64 transition-colors"/>
            <span className="absolute left-2.5 top-2 text-zinc-600 text-sm">🔍</span>
          </div>
          <select value={filterDurum} onChange={e => setFilterDurum(e.target.value)} className="bg-[#131316] border border-zinc-800 text-xs font-bold text-zinc-400 rounded-md px-3 py-2 focus:outline-none focus:border-blue-500 cursor-pointer transition-colors">
            <option value="TÜMÜ">Tüm Durumlar</option>
            <option value="SUNULDU">Sunuldu</option>
            <option value="ONAY BEKLİYOR">Onay Bekliyor</option>
            <option value="ONAYLANDI">Onaylandı</option>
            <option value="REDDEDİLDİ">Reddedildi</option>
          </select>
          <div className="w-px h-5 bg-zinc-700/50 mx-1"></div>
          
          <button onClick={handleDownloadExcel} disabled={isDownloading || (filteredData.length === 0 && selectedRows.size === 0)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-md text-xs font-bold shadow-md shadow-blue-900/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
            {isDownloading ? '⏳ Hazırlanıyor...' : selectedRows.size > 0 ? `📥 Seçilenleri Aktar (${selectedRows.size})` : '📥 Tümünü Aktar'}
          </button>
          
          {/* TÜMÜNÜ SEÇ / TEMİZLE BUTONLARI */}
          {filteredData.length > 0 && (
            <button onClick={toggleSelectAllVisible} className="text-xs text-blue-400 hover:text-blue-300 underline decoration-blue-900 underline-offset-4 ml-2 transition-colors">
              {isAllVisibleSelected ? 'Tüm Seçimleri Bırak' : 'Tümünü Seç'}
            </button>
          )}
          {selectedRows.size > 0 && !isAllVisibleSelected && (
            <button onClick={() => setSelectedRows(new Set())} className="text-xs text-zinc-500 hover:text-zinc-300 underline decoration-zinc-700 underline-offset-4 ml-2 transition-colors">
              Seçimleri Temizle
            </button>
          )}
        </div>
      </div>

      <div className="bg-[#0f0f11] border border-zinc-800 rounded-xl overflow-visible shadow-2xl">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            {/* Checkbox kaldırıldığı için genişlikler kusursuzca 100%'e tamamlandı */}
            <tr className="bg-zinc-950 text-zinc-500 font-bold uppercase tracking-wider border-b border-zinc-800">
              <th className="p-3 w-[20%] text-center">MALZEME CİNSİ</th>
              <th className="p-3 w-[22%] text-center">BELGE SAHİBİ / MARKA</th>
              <th className="p-3 w-[10%] text-center">DURUM</th>
              <th className="p-3 w-[20%] text-center">STANDART</th>
              <th className="p-3 w-[10%] text-center">BELGE NO</th>
              <th className="p-3 w-[10%] text-center">GEÇERLİLİK</th>
              <th className="p-3 w-[8%] text-center">İŞLEMLER</th>
            </tr>
          </thead>
          <tbody onMouseLeave={() => { setHCins(null); setHMarka(null); setHStd(null); }}>
            
            {filteredData.map((cins) => {
              const cinsRowSpan = cins.markalar.reduce((sum: number, marka: any) => {
                if (editingMarkaId === marka.id) return sum + formState.standartlar.length;
                return sum + (marka.standartlar.length > 0 ? marka.standartlar.length : 1);
              }, 0);

              return (
                <React.Fragment key={cins.id}>
                  {cins.markalar.map((marka: any, mIndex: number) => {
                    const isEditingThisMarka = editingMarkaId === marka.id;
                    const stands = isEditingThisMarka ? formState.standartlar : (marka.standartlar.length > 0 ? marka.standartlar : [{ id: 'empty' }]);
                    const rowSpanCount = stands.length;

                    const rowKey = `marka-${marka.id}`;
                    const isSelected = selectedRows.has(rowKey);
                    const bgRowClass = isSelected ? (hMarka === marka.id ? 'bg-blue-900/30' : 'bg-blue-900/20') : (hMarka === marka.id ? 'bg-zinc-800/40' : '');

                    return (
                      <React.Fragment key={marka.id}>
                        {stands.map((std: any, sIndex: number) => {
                          
                          const renderCinsTd = mIndex === 0 && sIndex === 0;
                          const isAllCinsSelected = cins.markalar.length > 0 && cins.markalar.every((m: any) => selectedRows.has(`marka-${m.id}`));
                          const cinsTdBg = isAllCinsSelected ? (hCins === cins.id ? 'bg-blue-900/40' : 'bg-blue-900/30') : (hCins === cins.id ? 'bg-zinc-900/60' : 'bg-zinc-950/30');

                          const cinsTd = renderCinsTd ? (
                            <td 
                              rowSpan={cinsRowSpan} 
                              onClick={() => toggleCinsSelection(cins)}
                              onMouseEnter={() => { setHCins(cins.id); setHMarka(null); setHStd(null); }}
                              title="Kategorideki Tüm Markaları Seç/Bırak"
                              className={`p-3 text-blue-400 font-bold align-middle text-center border-r border-zinc-800/30 transition-colors relative group cursor-pointer ${cinsTdBg}`}
                            >
                              {editingCinsId === cins.id ? (
                                <div className="flex flex-col gap-2 items-center" onClick={e => e.stopPropagation()}>
                                  <input value={editCinsName} onChange={e => setEditCinsName(e.target.value)} className="w-full bg-[#18181b] border border-zinc-700 text-white rounded p-1.5 text-center text-xs outline-none focus:border-blue-500" autoFocus/>
                                  <div className="flex gap-1.5 mt-1">
                                    <button onClick={() => setEditingCinsId(null)} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1 rounded text-[10px] transition-colors">İptal</button>
                                    <button onClick={() => handleCinsSave(cins.id)} disabled={loading} className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded text-[10px] font-bold transition-colors">Kaydet</button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <div className="px-4 select-none">{cins.name}</div>
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); setEditingCinsId(cins.id); setEditCinsName(cins.name); }} 
                                    className={`absolute top-3 right-3 text-zinc-500 hover:text-blue-400 transition-opacity bg-zinc-900 hover:bg-blue-500/10 p-1.5 rounded ${hCins === cins.id ? 'opacity-100' : 'opacity-0'}`} 
                                    title="Kategoriyi Düzenle"
                                  >
                                    ✏️
                                  </button>
                                </>
                              )}
                            </td>
                          ) : null;

                          if (isEditingThisMarka) {
                            return (
                              <tr key={`edit-${sIndex}`} className={`bg-[#131316] ${sIndex === 0 ? 'border-t-2 border-blue-500/50' : 'border-t border-zinc-800/40'}`}>
                                {cinsTd}
                                {sIndex === 0 && (
                                  <>
                                    <td className="p-3 align-middle text-center border-r border-zinc-800/30" rowSpan={rowSpanCount}>
                                      <input type="text" placeholder="Firma / Marka Adı" value={formState.markaName} onChange={e => setFormState({...formState, markaName: e.target.value})} className="w-full bg-[#18181b] border border-zinc-700 focus:border-blue-500 rounded p-1.5 text-xs text-white outline-none text-center mb-2"/>
                                      <div className="flex items-center justify-center gap-2">
                                        <label className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-2 py-1 rounded text-[10px] cursor-pointer transition-colors border border-zinc-700">
                                          📂 Belge Seç
                                          <input type="file" className="hidden" onChange={e => setFormState({...formState, katalogDosya: e.target.files?.[0] || null})} />
                                        </label>
                                        <span className="text-[10px] text-zinc-500 truncate w-24" title={formState.katalogDosya ? formState.katalogDosya.name : (marka.katalog_url || 'Değiştirilmedi')}>
                                          {formState.katalogDosya ? formState.katalogDosya.name : (marka.katalog_url ? getCleanFileName(marka.katalog_url) : 'Değiştirilmedi')}
                                        </span>
                                      </div>
                                    </td>
                                    <td className="p-3 align-middle text-center border-r border-zinc-800/30" rowSpan={rowSpanCount}>
                                      <select value={formState.durum} onChange={e => setFormState({...formState, durum: e.target.value})} className="w-full bg-[#18181b] border border-zinc-700 focus:border-blue-500 rounded p-1.5 text-[11px] font-bold text-zinc-300 outline-none text-center">
                                        <option value="SUNULDU">Sunuldu</option>
                                        <option value="ONAY BEKLİYOR">Onay Bekliyor</option>
                                        <option value="ONAYLANDI">Onaylandı</option>
                                        <option value="REDDEDİLDİ">Reddedildi</option>
                                      </select>
                                    </td>
                                  </>
                                )}
                                
                                <td className="p-3 align-middle"><input type="text" placeholder="Standart / Sertifika" value={std.standartAdi} onChange={e => handleStandartChange(sIndex, 'standartAdi', e.target.value)} className="w-full bg-[#18181b] border border-zinc-700 focus:border-blue-500 rounded p-1.5 text-xs text-white outline-none text-center"/></td>
                                <td className="p-3 align-middle"><input type="text" placeholder="Belge No" value={std.belgeNo} onChange={e => handleStandartChange(sIndex, 'belgeNo', e.target.value)} className="w-full bg-[#18181b] border border-zinc-700 focus:border-blue-500 rounded p-1.5 text-xs text-white outline-none text-center"/></td>
                                <td className="p-3 align-middle"><input type="date" value={std.gecerlilik} onChange={e => handleStandartChange(sIndex, 'gecerlilik', e.target.value)} className="w-full bg-[#18181b] border border-zinc-700 focus:border-blue-500 rounded p-1.5 text-xs text-zinc-400 outline-none text-center [color-scheme:dark]"/></td>
                                
                                <td className="p-3 text-center align-middle">
                                  <div className="flex flex-row items-center justify-end gap-1.5 w-[140px] mx-auto h-full">
                                    <div className="flex flex-row items-center justify-end gap-1.5 flex-1">
                                      {formState.standartlar.length > 1 && <button onClick={() => removeStandart(sIndex)} type="button" className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors" title="Satırı Sil">🗑️</button>}
                                      {sIndex === formState.standartlar.length - 1 && <button onClick={addStandart} type="button" className="p-1.5 text-zinc-500 hover:text-blue-400 hover:bg-blue-500/10 rounded transition-colors" title="Yeni Ekle">➕</button>}
                                    </div>
                                    {sIndex === 0 ? (
                                      <div className="flex flex-row gap-1.5 border-l border-zinc-700 pl-2">
                                        <button onClick={handleCancel} className="bg-zinc-800 hover:bg-zinc-700 px-2 py-1.5 rounded text-[10px] text-zinc-300 font-bold transition-colors w-[45px]">İptal</button>
                                        <button onClick={handleSave} disabled={loading} className="bg-blue-600 hover:bg-blue-500 px-2 py-1.5 rounded text-[10px] text-white font-bold transition-colors w-[45px]">Kaydet</button>
                                      </div>
                                    ) : <div className="border-l border-transparent pl-2 w-[96px]"></div>}
                                  </div>
                                </td>
                              </tr>
                            );
                          }

                          const stdBg = hStd === std.id ? (isSelected ? 'bg-blue-800/40' : 'bg-zinc-800/60') : 'bg-transparent';

                          return (
                            <tr key={std.id || `empty-${marka.id}`} className={`border-b border-zinc-800/40 transition-colors ${bgRowClass}`}>
                              {cinsTd}
                              {sIndex === 0 && (
                                <>
                                  <td 
                                    rowSpan={rowSpanCount} 
                                    onClick={() => toggleMarkaSelection(rowKey)}
                                    onMouseEnter={() => { setHCins(cins.id); setHMarka(marka.id); setHStd(null); }}
                                    title="Markayı Seç/Bırak"
                                    className={`p-3 align-middle text-center border-r border-zinc-800/30 transition-colors cursor-pointer ${bgRowClass}`}
                                  >
                                    <div className="font-bold text-zinc-200 select-none">{marka.name}</div>
                                  </td>
                                  <td 
                                    rowSpan={rowSpanCount} 
                                    className={`p-3 align-middle text-center border-r border-zinc-800/30 transition-colors ${bgRowClass}`}
                                  >
                                    <span className={`px-2.5 py-1 rounded text-[10px] font-bold whitespace-nowrap inline-block text-center ${getStatusStyle(marka.durum)}`}>{marka.durum}</span>
                                  </td>
                                </>
                              )}

                              <td 
                                onMouseEnter={() => { setHCins(cins.id); setHMarka(marka.id); setHStd(std.id); }}
                                className={`p-3 align-middle text-center text-zinc-300 font-medium transition-colors ${stdBg}`}
                              >
                                {std.standart_adi || <span className="text-zinc-600 italic">Belge yok</span>}
                              </td>
                              <td 
                                onMouseEnter={() => { setHCins(cins.id); setHMarka(marka.id); setHStd(std.id); }}
                                className={`p-3 align-middle text-center text-zinc-400 font-mono transition-colors ${stdBg}`}
                              >
                                {std.belge_no || '-'}
                              </td>
                              <td 
                                onMouseEnter={() => { setHCins(cins.id); setHMarka(marka.id); setHStd(std.id); }}
                                className={`p-3 align-middle text-center text-zinc-400 transition-colors ${stdBg}`}
                              >
                                {std.gecerlilik || '-'}
                              </td>
                              
                              {/* KUSURSUZ İŞLEMLER HİZALAMASI (FIXED WIDTH GRID) */}
                              {sIndex === 0 && (
                                <td 
                                  rowSpan={rowSpanCount}
                                  className={`p-3 align-middle text-center transition-colors ${bgRowClass}`}
                                >
                                  <div className="flex flex-row items-center justify-end gap-1.5 w-[145px] mx-auto">
                                    <div className="w-[75px] flex justify-end">
                                      {marka.katalog_url && (
                                        <a 
                                          onClick={e => e.stopPropagation()} 
                                          href={marka.katalog_url.startsWith('/') ? marka.katalog_url : `/kataloglar/${marka.katalog_url}`}
                                          download 
                                          target="_blank" 
                                          rel="noopener noreferrer"
                                          className="text-zinc-400 hover:text-blue-400 bg-zinc-900 hover:bg-blue-500/10 px-2 py-1.5 rounded transition-colors text-[10px] font-bold flex items-center justify-center gap-1 w-full border border-zinc-800" 
                                          title="Kataloğu İndir"
                                        >
                                          📥 Katalog
                                        </a>
                                      )}
                                    </div>
                                    <div className="w-[30px]">
                                      <button onClick={(e) => { e.stopPropagation(); openEditMode(marka); }} className="text-zinc-400 hover:text-blue-400 bg-zinc-900 hover:bg-blue-500/10 w-full py-1.5 rounded transition-colors border border-zinc-800" title="Düzenle">✏️</button>
                                    </div>
                                    <div className="w-[30px]">
                                      <form action={silMarka} className="w-full">
                                        <input type="hidden" name="id" value={marka.id} />
                                        <button type="submit" onClick={(e) => { e.stopPropagation(); if(!confirm('Bu firmayı silmek istediğinize emin misiniz?')) e.preventDefault() }} className="text-zinc-400 hover:text-red-400 bg-zinc-900 hover:bg-red-500/10 w-full py-1.5 rounded transition-colors border border-zinc-800" title="Sil">🗑️</button>
                                      </form>
                                    </div>
                                  </div>
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}
                </React.Fragment>
              );
            })}

            {isAddingRoot && formState.standartlar.map((std, index) => (
              <tr key={`add-${index}`} className={`bg-[#131316] ${index === 0 ? 'border-t-2 border-blue-500/50' : 'border-t border-zinc-800/40'}`}>
                {index === 0 && (
                  <>
                    <td className="p-3 align-middle border-r border-zinc-800/30 relative" rowSpan={formState.standartlar.length}>
                      <input 
                        type="text" placeholder="Malzeme Cinsi" value={formState.cinsName} 
                        onChange={e => { setFormState({...formState, cinsName: e.target.value}); setShowAutocomplete(true); }}
                        onFocus={() => setShowAutocomplete(true)} onBlur={() => setTimeout(() => setShowAutocomplete(false), 200)}
                        className="w-full bg-[#18181b] border border-zinc-700 focus:border-blue-500 rounded p-1.5 text-xs text-white outline-none text-center"
                      />
                      {showAutocomplete && formState.cinsName && (
                        <ul className="absolute z-50 left-3 right-3 mt-1 bg-zinc-800 border border-zinc-700 rounded shadow-xl max-h-40 overflow-y-auto">
                          {uniqueCinsList.filter(c => c.toLowerCase().includes(formState.cinsName.toLowerCase())).map((c, i) => (
                            <li key={i} onMouseDown={() => { setFormState({...formState, cinsName: c}); setShowAutocomplete(false); }} className="px-3 py-2 text-zinc-300 hover:bg-blue-600 hover:text-white cursor-pointer text-xs text-left">{c}</li>
                          ))}
                        </ul>
                      )}
                    </td>
                    <td className="p-3 align-middle text-center border-r border-zinc-800/30" rowSpan={formState.standartlar.length}>
                      <input type="text" placeholder="Firma / Marka Adı" value={formState.markaName} onChange={e => setFormState({...formState, markaName: e.target.value})} className="w-full bg-[#18181b] border border-zinc-700 focus:border-blue-500 rounded p-1.5 text-xs text-white outline-none text-center mb-2"/>
                      <div className="flex items-center justify-center gap-2">
                        <label className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-2 py-1 rounded text-[10px] cursor-pointer transition-colors border border-zinc-700">
                          📂 Belge Seç
                          <input type="file" className="hidden" onChange={e => setFormState({...formState, katalogDosya: e.target.files?.[0] || null})} />
                        </label>
                        <span className="text-[10px] text-zinc-500 truncate w-24" title={formState.katalogDosya?.name || ''}>
                          {formState.katalogDosya?.name || 'Belge seçilmedi'}
                        </span>
                      </div>
                    </td>
                    <td className="p-3 align-middle text-center border-r border-zinc-800/30" rowSpan={formState.standartlar.length}>
                      <select value={formState.durum} onChange={e => setFormState({...formState, durum: e.target.value})} className="w-full bg-[#18181b] border border-zinc-700 focus:border-blue-500 rounded p-1.5 text-[11px] font-bold text-zinc-300 outline-none text-center">
                        <option value="SUNULDU">Sunuldu</option>
                        <option value="ONAY BEKLİYOR">Onay Bekliyor</option>
                        <option value="ONAYLANDI">Onaylandı</option>
                        <option value="REDDEDİLDİ">Reddedildi</option>
                      </select>
                    </td>
                  </>
                )}
                <td className="p-3 align-middle"><input type="text" placeholder="Standart / Sertifika" value={std.standartAdi} onChange={e => handleStandartChange(index, 'standartAdi', e.target.value)} className="w-full bg-[#18181b] border border-zinc-700 focus:border-blue-500 rounded p-1.5 text-xs text-white outline-none text-center"/></td>
                <td className="p-3 align-middle"><input type="text" placeholder="Belge No" value={std.belgeNo} onChange={e => handleStandartChange(index, 'belgeNo', e.target.value)} className="w-full bg-[#18181b] border border-zinc-700 focus:border-blue-500 rounded p-1.5 text-xs text-white outline-none text-center"/></td>
                <td className="p-3 align-middle"><input type="date" value={std.gecerlilik} onChange={e => handleStandartChange(index, 'gecerlilik', e.target.value)} className="w-full bg-[#18181b] border border-zinc-700 focus:border-blue-500 rounded p-1.5 text-xs text-zinc-400 outline-none text-center [color-scheme:dark]"/></td>
                <td className="p-3 align-middle text-center">
                  <div className="flex flex-row items-center justify-end gap-1.5 w-[140px] mx-auto h-full">
                    <div className="flex flex-row items-center justify-end gap-1.5 flex-1">
                      {formState.standartlar.length > 1 && <button onClick={() => removeStandart(index)} type="button" className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors" title="Satırı Sil">🗑️</button>}
                      {index === formState.standartlar.length - 1 && <button onClick={addStandart} type="button" className="p-1.5 text-zinc-500 hover:text-blue-400 hover:bg-blue-500/10 rounded transition-colors" title="Yeni Ekle">➕</button>}
                    </div>
                    {index === 0 ? (
                      <div className="flex flex-row gap-1.5 border-l border-zinc-700 pl-2">
                        <button onClick={handleCancel} className="bg-zinc-800 hover:bg-zinc-700 px-2 py-1.5 rounded text-[10px] text-zinc-300 font-bold transition-colors w-[45px]">İptal</button>
                        <button onClick={handleSave} disabled={loading} className="bg-blue-600 hover:bg-blue-500 px-2 py-1.5 rounded text-[10px] text-white font-bold transition-colors w-[45px]">Kaydet</button>
                      </div>
                    ) : <div className="border-l border-transparent pl-2 w-[96px]"></div>}
                  </div>
                </td>
              </tr>
            ))}

            {filteredData.length === 0 && !isAddingRoot && (
               <tr>
                 <td colSpan={7} className="p-8 text-center text-zinc-500 italic">Aradığınız kriterlere uygun sonuç bulunamadı.</td>
               </tr>
            )}

          </tbody>
        </table>
      </div>

      {!isAddingRoot && !editingMarkaId && (
        <div className="mt-6 flex justify-center">
          <button onClick={openAddMode} className="flex items-center gap-2 px-6 py-2.5 bg-[#18181b] hover:bg-zinc-800 border border-zinc-700 hover:border-blue-500/40 text-zinc-300 hover:text-blue-400 text-sm font-bold rounded-full transition-all shadow-xl">
            ➕ Yeni Malzeme / Marka Ekle
          </button>
        </div>
      )}
    </div>
  );
}