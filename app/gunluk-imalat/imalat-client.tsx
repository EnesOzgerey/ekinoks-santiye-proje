'use client';

import React, { useState, useMemo } from 'react';
import { kaydetImalat, silImalat } from './actions';
import MultiDatePicker from '../components/MultiDatePicker';

export default function ImalatClient({ imalatlar, kayitliMalzemeler = [] }: { imalatlar: any[], kayitliMalzemeler: any[] }) {
  const [loading, setLoading] = useState(false);
  const [docLoading, setDocLoading] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);

  const [activePhotos, setActivePhotos] = useState<string[] | null>(null);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [expandedRowId, setExpandedRowId] = useState<number | null>(null);

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const today = new Date().toISOString().split('T')[0];

  const emptyMalzeme = { ad: '', metraj: '' };
  
  const [formState, setFormState] = useState<{
    imalat_adi: string; tarih: string; imalat_yeri: string; calisan_sayisi: number; malzemeler: typeof emptyMalzeme[]; photos: File[]; existing_photos: string[];
  }>({
    imalat_adi: '', tarih: today, imalat_yeri: '', calisan_sayisi: 0, malzemeler: [{ ...emptyMalzeme }], photos: [], existing_photos: []
  });

  const [activeAutoIndex, setActiveAutoIndex] = useState<number | null>(null);
  const [focusedListIndex, setFocusedListIndex] = useState<number>(-1);

  const filteredImalatlar = useMemo(() => {
    return imalatlar.filter((item) => {
      const sTerm = searchTerm.toLowerCase();
      const matchSearch = 
        (item.imalat_adi || '').toLowerCase().includes(sTerm) ||
        (item.kullanilan_malzeme || '').toLowerCase().includes(sTerm) ||
        (item.imalat_yeri || '').toLowerCase().includes(sTerm);
      
      const matchDate = selectedDates.length === 0 || selectedDates.includes(item.tarih);
      return matchSearch && matchDate;
    });
  }, [imalatlar, searchTerm, selectedDates]);

  const handleExportExcel = async () => {
    try {
      setDocLoading(true);
      const res = await fetch('/api/imalat-excel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imalatlar: filteredImalatlar }) 
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const raporTarihi = new Date().toLocaleDateString('tr-TR').replace(/\./g, '_');
        a.download = `Saha_Imalat_Raporu_${raporTarihi}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (err) { alert('Hata oluştu.'); } finally { setDocLoading(false); }
  };

  const openAddMode = () => {
    setEditingId(null); setIsAdding(true);
    setFormState({ imalat_adi: '', tarih: today, imalat_yeri: '', calisan_sayisi: 0, malzemeler: [{ ...emptyMalzeme }], photos: [], existing_photos: [] });
  };

  const openEditMode = (item: any) => {
    setIsAdding(false); setEditingId(item.id);
    let ePhotos = [];
    try { ePhotos = JSON.parse(item.photos || '[]'); } catch { ePhotos = []; }
    
    let parsedMalzemeler = [];
    try {
      const parsed = JSON.parse(item.kullanilan_malzeme);
      parsedMalzemeler = Array.isArray(parsed) ? parsed : [{ ad: item.kullanilan_malzeme || '', metraj: item.metraj || '' }];
    } catch {
      parsedMalzemeler = [{ ad: item.kullanilan_malzeme || '', metraj: item.metraj || '' }];
    }
    if (parsedMalzemeler.length === 0) parsedMalzemeler = [{ ...emptyMalzeme }];

    setFormState({
      imalat_adi: item.imalat_adi, tarih: item.tarih || today, imalat_yeri: item.imalat_yeri || '', calisan_sayisi: item.calisan_sayisi || 0,
      malzemeler: parsedMalzemeler, photos: [], existing_photos: ePhotos
    });
  };

  const handleCancel = () => { setIsAdding(false); setEditingId(null); setActiveAutoIndex(null); };

  const handleMalzemeChange = (index: number, field: string, value: string) => {
    const newMalz = [...formState.malzemeler];
    newMalz[index] = { ...newMalz[index], [field]: value };
    setFormState({ ...formState, malzemeler: newMalz });
  };

  const addMalzeme = () => setFormState({ ...formState, malzemeler: [...formState.malzemeler, { ...emptyMalzeme }] });
  const removeMalzeme = (index: number) => setFormState({ ...formState, malzemeler: formState.malzemeler.filter((_, i) => i !== index) });

  const handleSave = async () => {
    if (!formState.imalat_adi) return alert("İmalat adı zorunludur!");
    
    const validMalzemeler = formState.malzemeler.filter(m => m.ad.trim() !== '');
    const unapproved = validMalzemeler.find(m => {
      const found = kayitliMalzemeler.find(k => k.ad === m.ad);
      return found && found.durum !== 'ONAYLANDI';
    });

    if (unapproved) {
      if (!window.confirm(`⚠️ DİKKAT: Seçtiğiniz "${unapproved.ad}" adlı malzeme henüz ONAYLANMAMIŞ durumdadır.\n\nBuna rağmen imalata eklemek istediğinize emin misiniz?`)) {
        return; 
      }
    }
    
    setLoading(true);
    try {
      const data = new FormData();
      if (editingId) data.append('id', editingId.toString());
      data.append('imalat_adi', formState.imalat_adi);
      data.append('tarih', formState.tarih);
      data.append('imalat_yeri', formState.imalat_yeri);
      data.append('calisan_sayisi', formState.calisan_sayisi.toString());
      data.append('kullanilan_malzeme', JSON.stringify(validMalzemeler));
      data.append('metraj', ''); 
      
      formState.photos.forEach(f => data.append('photos', f));
      formState.existing_photos.forEach(p => data.append('existing_photos', p));

      await kaydetImalat(data);
      handleCancel();
    } catch (error: any) { alert('Kayıt Hatası: ' + error.message); } 
    finally { setLoading(false); }
  };

  const openLightbox = (photos: string[], index: number) => { setActivePhotos(photos); setViewerIndex(index); };
  const nextPhoto = (e: React.MouseEvent) => { e.stopPropagation(); if (activePhotos && viewerIndex !== null) setViewerIndex((prev) => (prev! < activePhotos.length - 1 ? prev! + 1 : 0)); };
  const prevPhoto = (e: React.MouseEvent) => { e.stopPropagation(); if (activePhotos && viewerIndex !== null) setViewerIndex((prev) => (prev! > 0 ? prev! - 1 : activePhotos.length - 1)); };
  const closeViewer = (e: React.MouseEvent) => { e.stopPropagation(); setActivePhotos(null); setViewerIndex(null); };

  // DÜZENLEME SATIRLARI
  const renderInputRows = (isNew: boolean) => {
    return formState.malzemeler.map((malz, index) => {
      
      const currentList = kayitliMalzemeler.filter(c => c.ad.toLowerCase().includes(malz.ad.toLowerCase()));

      const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'ArrowDown') { e.preventDefault(); setFocusedListIndex(prev => Math.min(prev + 1, currentList.length - 1)); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); setFocusedListIndex(prev => Math.max(prev - 1, 0)); }
        else if (e.key === 'Enter') {
          e.preventDefault();
          if (focusedListIndex >= 0 && currentList[focusedListIndex]) {
            handleMalzemeChange(index, 'ad', currentList[focusedListIndex].ad);
            setActiveAutoIndex(null);
          }
        }
      };

      return (
        <tr key={`form-${index}`} className={`bg-[#131316] ${index === 0 ? 'border-t-2 border-blue-500/50' : 'border-t border-zinc-800/40 shadow-[inset_0_0_20px_rgba(37,99,235,0.05)]'}`}>
          
          {index === 0 && (
            <td className="p-3 align-middle text-center border-r border-zinc-800/30" rowSpan={formState.malzemeler.length}>
              <div className="flex flex-col items-center gap-2">
                <input type="text" placeholder="İmalat / İş Kalemi *" value={formState.imalat_adi} onChange={e => setFormState({...formState, imalat_adi: e.target.value})} className="w-full bg-[#18181b] border border-zinc-700 focus:border-blue-500 rounded p-1.5 text-xs text-white outline-none text-center"/>
                <input type="date" value={formState.tarih} onChange={e => setFormState({...formState, tarih: e.target.value})} className="w-full bg-[#18181b] border border-zinc-700 focus:border-blue-500 rounded p-1.5 text-xs text-zinc-400 outline-none text-center [color-scheme:dark]"/>
              </div>
            </td>
          )}

          <td className="p-3 align-middle text-center border-r border-zinc-800/30 relative">
            <input 
              type="text" placeholder="Kullanılan Malzeme (Ara)" value={malz.ad} 
              onChange={e => { handleMalzemeChange(index, 'ad', e.target.value); setActiveAutoIndex(index); setFocusedListIndex(-1); }}
              onFocus={() => setActiveAutoIndex(index)} 
              onBlur={() => setTimeout(() => setActiveAutoIndex(null), 200)}
              onKeyDown={handleKeyDown}
              className="w-full bg-[#18181b] border border-zinc-700 focus:border-blue-500 rounded p-1.5 text-xs text-white outline-none text-center"
            />
            {activeAutoIndex === index && malz.ad && currentList.length > 0 && (
              <ul className="absolute z-50 left-3 right-3 mt-1 bg-zinc-800 border border-zinc-700 rounded shadow-2xl max-h-40 overflow-y-auto text-left">
                {currentList.map((c, i) => (
                  <li 
                    key={i} 
                    onMouseDown={() => { handleMalzemeChange(index, 'ad', c.ad); setActiveAutoIndex(null); }}
                    className={`px-3 py-2 text-xs cursor-pointer flex justify-between ${i === focusedListIndex ? 'bg-blue-600 text-white' : 'text-zinc-300 hover:bg-zinc-700'}`}
                  >
                    <span className="truncate pr-2">{c.ad}</span>
                    {c.durum !== 'ONAYLANDI' && <span className="text-amber-500 font-bold shrink-0">[{c.durum}]</span>}
                  </li>
                ))}
              </ul>
            )}
          </td>

          <td className="p-3 align-middle text-center border-r border-zinc-800/30">
            <div className="flex justify-center items-center gap-2">
              <input type="text" placeholder="Adet / Metraj" value={malz.metraj} onChange={e => handleMalzemeChange(index, 'metraj', e.target.value)} className="w-24 bg-[#18181b] border border-zinc-700 focus:border-blue-500 rounded p-1.5 text-xs text-white outline-none text-center"/>
              <div className="flex items-center gap-1">
                {formState.malzemeler.length > 1 && <button onClick={() => removeMalzeme(index)} type="button" className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors">🗑️</button>}
                {index === formState.malzemeler.length - 1 && <button onClick={addMalzeme} type="button" className="p-1.5 text-zinc-500 hover:text-blue-400 hover:bg-blue-500/10 rounded transition-colors">➕</button>}
              </div>
            </div>
          </td>

          {index === 0 && (
            <>
              <td className="p-3 align-middle text-center border-r border-zinc-800/30" rowSpan={formState.malzemeler.length}>
                <input type="text" placeholder="İmalat Yeri" value={formState.imalat_yeri} onChange={e => setFormState({...formState, imalat_yeri: e.target.value})} className="w-full bg-[#18181b] border border-zinc-700 focus:border-blue-500 rounded p-1.5 text-xs text-white outline-none text-center"/>
              </td>
              <td className="p-3 align-middle text-center border-r border-zinc-800/30" rowSpan={formState.malzemeler.length}>
                <input type="number" placeholder="Ekip" value={formState.calisan_sayisi || ''} onChange={e => setFormState({...formState, calisan_sayisi: parseInt(e.target.value) || 0})} className="w-full bg-[#18181b] border border-zinc-700 focus:border-blue-500 rounded p-1.5 text-xs text-white outline-none text-center"/>
              </td>
              <td className="p-3 align-middle text-center border-r border-zinc-800/30" rowSpan={formState.malzemeler.length}>
                <div className="flex flex-col items-center gap-2 h-full">
                  <div className="flex items-center gap-2">
                    <label className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-2 py-1 rounded text-[10px] font-bold cursor-pointer transition-colors border border-zinc-700 flex items-center gap-1">
                      📸 Seç
                      <input type="file" multiple accept="image/*" className="hidden" onChange={e => {
                        if (e.target.files) setFormState({...formState, photos: [...formState.photos, ...Array.from(e.target.files)]})
                      }}/>
                    </label>
                    <span className="text-[10px] text-zinc-500">{formState.photos.length} yeni</span>
                  </div>
                  <div className="flex flex-wrap justify-center gap-1 mt-1 overflow-y-auto max-h-[50px] custom-scrollbar">
                     {formState.existing_photos.map((p, idx) => (
                       <div key={`old-${idx}`} className="relative group w-7 h-7 rounded overflow-hidden border border-zinc-700">
                         <img src={p} alt="eski" className="w-full h-full object-cover" />
                         <button onClick={() => setFormState({...formState, existing_photos: formState.existing_photos.filter(ep => ep !== p)})} className="absolute inset-0 bg-red-500/80 text-white font-bold text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">X</button>
                       </div>
                     ))}
                     {formState.photos.map((f, idx) => (
                       <div key={`new-${idx}`} className="relative group w-7 h-7 rounded overflow-hidden border border-blue-500">
                         <img src={URL.createObjectURL(f)} alt="yeni" className="w-full h-full object-cover" />
                         <button onClick={() => setFormState({...formState, photos: formState.photos.filter((_, i) => i !== idx)})} className="absolute inset-0 bg-red-500/80 text-white font-bold text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">X</button>
                       </div>
                     ))}
                  </div>
                </div>
              </td>
              <td className="p-3 align-middle text-center" rowSpan={formState.malzemeler.length}>
                <div className="flex flex-row gap-1.5 items-center justify-center h-full">
                  <button onClick={handleCancel} className="bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded text-[10px] text-zinc-300 font-bold transition-colors">İptal</button>
                  <button onClick={handleSave} disabled={loading} className="bg-blue-600 hover:bg-blue-500 px-3 py-1.5 rounded text-[10px] text-white font-bold transition-colors">{loading ? '...' : 'Kaydet'}</button>
                </div>
              </td>
            </>
          )}
        </tr>
      );
    });
  };

  return (
    <div className="max-w-[1500px] mx-auto p-6 bg-zinc-950 min-h-screen text-zinc-100 print:bg-white print:text-black print:p-0">
      
      {/* ÜST BAR VE TOOLBAR */}
      <div className="mb-6 flex flex-col gap-4 print:hidden">
        <h1 className="text-xl font-bold tracking-tight">Günlük Saha İmalat Paneli</h1>
        <div className="flex flex-wrap items-center gap-3 bg-zinc-900/40 p-2 rounded-lg border border-zinc-800/60 w-fit shadow-sm relative z-40">
          <div className="relative">
            <input type="text" placeholder="Ara (İmalat, Malzeme, Yer)..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="bg-[#131316] border border-zinc-800 text-xs rounded-md pl-8 pr-3 py-2 text-zinc-300 focus:outline-none focus:border-blue-500 w-64"/>
            <span className="absolute left-2.5 top-2 text-zinc-600 text-sm">🔍</span>
          </div>

          <div className="relative">
            <button onClick={() => setShowDatePicker(!showDatePicker)} className={`bg-[#131316] border text-xs font-bold rounded-md px-4 py-2 flex items-center gap-2 transition-colors ${selectedDates.length > 0 ? 'border-blue-500/50 text-blue-400' : 'border-zinc-800 text-zinc-400 hover:border-zinc-600'}`}>
              📅 {selectedDates.length > 0 ? `${selectedDates.length} Gün Seçildi` : 'Tarih Filtresi'}
            </button>
            {showDatePicker && (
              <div className="absolute top-full mt-2 left-0 bg-[#131316] border border-zinc-800 p-3 rounded-xl shadow-2xl z-50 min-w-[300px]">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-bold text-zinc-400">Takvimden Gün Seçin</span>
                  <button onClick={() => setShowDatePicker(false)} className="text-zinc-500 hover:text-white">✕</button>
                </div>
                <MultiDatePicker selectedDates={selectedDates} onChange={setSelectedDates} />
                {selectedDates.length > 0 && <button onClick={() => setSelectedDates([])} className="mt-3 w-full text-center text-[10px] text-zinc-500 hover:text-red-400 underline py-1">Temizle</button>}
              </div>
            )}
          </div>
          <div className="w-px h-5 bg-zinc-700/50 mx-1"></div>
          <button onClick={handleExportExcel} disabled={docLoading || filteredImalatlar.length === 0} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-md text-xs font-bold shadow-md shadow-emerald-900/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
            {docLoading ? '⏳ Hazırlanıyor...' : '📊 Excel Raporu İndir'}
          </button>
        </div>
      </div>

      {/* ANA TABLO */}
      <div className="bg-[#0f0f11] border border-zinc-800 rounded-xl overflow-visible shadow-2xl print:border-0 print:shadow-none">
        <table className="w-full text-left text-xs border-collapse min-w-[1000px] print:text-black">
          <thead>
            <tr className="bg-zinc-950 text-zinc-500 font-bold uppercase tracking-wider border-b border-zinc-800 print:bg-transparent print:border-black print:text-black">
              <th className="p-3 w-[20%] text-center">İMALAT ADI & TARİH</th>
              <th className="p-3 w-[25%] text-center">KULLANILAN MALZEME</th>
              <th className="p-3 w-[12%] text-center">METRAJ</th>
              <th className="p-3 w-[15%] text-center">YER / LOKASYON</th>
              <th className="p-3 w-[5%] text-center">EKİP</th>
              <th className="p-3 w-[13%] text-center print:hidden">FOTOĞRAFLAR</th>
              <th className="p-3 w-[10%] text-center print:hidden">İŞLEMLER</th>
            </tr>
          </thead>
          <tbody onMouseLeave={() => setHoveredRow(null)}>
            
            {filteredImalatlar.length === 0 && !isAdding && <tr><td colSpan={7} className="p-12 text-center text-zinc-500 italic">Kayıt bulunamadı.</td></tr>}

            {filteredImalatlar.map((item) => {
              if (editingId === item.id) return <React.Fragment key={`edit-${item.id}`}>{renderInputRows(false)}</React.Fragment>;

              let parsedMalzemeler = [];
              try {
                const parsed = JSON.parse(item.kullanilan_malzeme);
                parsedMalzemeler = Array.isArray(parsed) ? parsed : [{ ad: item.kullanilan_malzeme || '', metraj: item.metraj || '' }];
              } catch {
                parsedMalzemeler = [{ ad: item.kullanilan_malzeme || '', metraj: item.metraj || '' }];
              }
              if (parsedMalzemeler.length === 0) parsedMalzemeler = [{ ...emptyMalzeme }];

              let parsedPhotos: string[] = [];
              try { parsedPhotos = JSON.parse(item.photos || '[]'); } catch(e) {}
              
              const displayDate = item.tarih ? item.tarih.split('-').reverse().join('.') : '-';
              const isExpanded = expandedRowId === item.id;
              const visiblePhotos = isExpanded ? parsedPhotos : parsedPhotos.slice(0, 3);
              const isHovered = hoveredRow === item.id;

              return parsedMalzemeler.map((malz, sIndex) => (
                <tr 
                  key={`read-${item.id}-${sIndex}`} 
                  onMouseEnter={() => setHoveredRow(item.id)}
                  className={`border-b border-zinc-800/40 transition-colors ${isHovered ? 'bg-zinc-800/40' : ''} print:border-gray-300`}
                >
                  {sIndex === 0 && (
                    <td className="p-3 align-middle text-center border-r border-zinc-800/30" rowSpan={parsedMalzemeler.length}>
                      <div className="flex flex-col items-center justify-center">
                        <div className="font-bold text-zinc-200 text-sm mb-1">{item.imalat_adi}</div>
                        <div className="text-[10px] font-mono text-zinc-500 bg-zinc-950 border border-zinc-800 inline-block px-1.5 py-0.5 rounded">{displayDate}</div>
                      </div>
                    </td>
                  )}
                  
                  <td className="p-3 align-middle text-center text-zinc-300 font-medium border-r border-zinc-800/30">
                    {malz.ad || <span className="text-zinc-600 italic">Belirtilmedi</span>}
                  </td>
                  
                  <td className="p-3 align-middle text-center text-zinc-300 font-mono font-bold border-r border-zinc-800/30">
                    {malz.metraj || '-'}
                  </td>
                  
                  {sIndex === 0 && (
                    <>
                      <td className="p-3 align-middle text-center text-zinc-300 border-r border-zinc-800/30" rowSpan={parsedMalzemeler.length}>
                        {item.imalat_yeri ? <span className="inline-block px-2.5 py-1 bg-zinc-900 border border-zinc-800 rounded-md text-[11px] font-bold">{item.imalat_yeri}</span> : '-'}
                      </td>
                      <td className="p-3 align-middle text-center border-r border-zinc-800/30" rowSpan={parsedMalzemeler.length}>
                        {item.calisan_sayisi > 0 ? <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-zinc-900 text-blue-400 font-bold text-xs border border-zinc-800">{item.calisan_sayisi}</span> : '-'}
                      </td>
                      <td className="p-3 align-middle text-center border-r border-zinc-800/30 print:hidden" rowSpan={parsedMalzemeler.length}>
                        {parsedPhotos.length > 0 ? (
                          <div className="flex items-center justify-center gap-1.5">
                            <div className={`flex justify-center gap-1.5 ${isExpanded ? 'flex-wrap' : 'flex-nowrap'}`}>
                              {visiblePhotos.map((p, idx) => (
                                <div key={idx} onClick={() => openLightbox(parsedPhotos, idx)} className="w-8 h-8 rounded overflow-hidden border border-zinc-700 cursor-pointer hover:border-blue-500 transition-all shrink-0 bg-zinc-950">
                                  <img src={p} alt={`foto-${idx}`} className="w-full h-full object-cover hover:scale-110 transition-transform" />
                                </div>
                              ))}
                            </div>
                            {parsedPhotos.length > 3 && (
                              <button onClick={() => setExpandedRowId(isExpanded ? null : item.id)} className="p-1 text-zinc-500 hover:text-white bg-zinc-900 border border-zinc-800 rounded shrink-0 cursor-pointer text-[10px] font-bold">
                                {isExpanded ? "▲" : `+${parsedPhotos.length - 3}`}
                              </button>
                            )}
                          </div>
                        ) : <span className="text-zinc-600 text-[10px] font-medium italic">Fotoğraf Yok</span>}
                      </td>
                      <td className="p-3 align-middle text-center print:hidden" rowSpan={parsedMalzemeler.length}>
                        <div className="flex flex-row justify-center items-center gap-2">
                          <button onClick={() => openEditMode(item)} className="text-zinc-400 hover:text-blue-400 bg-zinc-900 hover:bg-blue-500/10 px-2.5 py-1.5 rounded transition-colors" title="Düzenle">✏️</button>
                          <form action={silImalat}>
                            <input type="hidden" name="id" value={item.id} />
                            <button type="submit" onClick={(e) => { if(!confirm('Emin misiniz?')) e.preventDefault() }} className="text-zinc-400 hover:text-red-400 bg-zinc-900 hover:bg-red-500/10 px-2.5 py-1.5 rounded transition-colors" title="Sil">🗑️</button>
                          </form>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ));
            })}

            {isAdding && renderInputRows(true)}
          </tbody>
        </table>
      </div>

      {!isAdding && !editingId && (
        <div className="mt-6 flex justify-center print:hidden">
          <button onClick={openAddMode} className="flex items-center gap-2 px-6 py-2.5 bg-[#18181b] hover:bg-zinc-800 border border-zinc-700 hover:border-blue-500/40 text-zinc-300 hover:text-blue-400 text-sm font-bold rounded-full transition-all shadow-xl">
            ➕ Yeni Saha İmalatı Ekle
          </button>
        </div>
      )}

      {/* LIGHTBOX */}
      {activePhotos && viewerIndex !== null && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 backdrop-blur-md" onClick={closeViewer}>
          <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-10 bg-gradient-to-b from-black/60 to-transparent pointer-events-none">
            <span className="text-zinc-400 font-bold text-sm tracking-widest bg-black/60 px-4 py-1.5 rounded-full pointer-events-auto border border-zinc-800">{viewerIndex + 1} / {activePhotos.length}</span>
            <button onClick={closeViewer} className="text-white hover:text-red-400 text-4xl leading-none pointer-events-auto cursor-pointer">&times;</button>
          </div>
          {activePhotos.length > 1 && <button onClick={prevPhoto} className="absolute left-4 p-4 text-white hover:text-blue-400 bg-black/50 hover:bg-zinc-800 rounded-full transition-all cursor-pointer border border-zinc-700"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6"/></svg></button>}
          <img src={activePhotos[viewerIndex]} alt="Büyük Görünüm" className="max-w-full max-h-[90vh] object-contain shadow-2xl rounded-lg border border-zinc-800" onClick={(e) => e.stopPropagation()} />
          {activePhotos.length > 1 && <button onClick={nextPhoto} className="absolute right-4 p-4 text-white hover:text-blue-400 bg-black/50 hover:bg-zinc-800 rounded-full transition-all cursor-pointer border border-zinc-700"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6"/></svg></button>}
        </div>
      )}

    </div>
  );
}