'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { kaydetImalat, silImalat } from './actions';
import MultiDatePicker from '../components/MultiDatePicker';

export default function ImalatClient({ imalatlar, kayitliMalzemeler = [], planlar = [] }: { imalatlar: any[], kayitliMalzemeler: any[], planlar: any[] }) {
  const router = useRouter(); 
  const [loading, setLoading] = useState(false);
  const [docLoading, setDocLoading] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);

  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());

  const [activePhotos, setActivePhotos] = useState<string[] | null>(null);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [expandedRowId, setExpandedRowId] = useState<number | null>(null);

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const today = new Date().toISOString().split('T')[0];

  const emptyMalzeme = { ad: '', spesifikasyon: '', miktar: '', birim: '', metraj: '' };
  
  const [formState, setFormState] = useState<{
    imalat_adi: string; plan_id: number | null; tarih: string; imalat_yeri: string; calisan_sayisi: number; malzemeler: typeof emptyMalzeme[]; photos: File[]; existing_photos: string[];
  }>({
    imalat_adi: '', plan_id: null, tarih: today, imalat_yeri: '', calisan_sayisi: 0, malzemeler: [{ ...emptyMalzeme }], photos: [], existing_photos: []
  });

  const [activeAutoIndex, setActiveAutoIndex] = useState<number | null>(null);
  const [focusedListIndex, setFocusedListIndex] = useState<number>(-1);
  const [showPlanAuto, setShowPlanAuto] = useState(false);

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

  const planStatuses = useMemo(() => {
    const statuses: Record<number, { gerceklesen: number, total: number, yuzde: number }> = {};
    planlar.forEach((p: any) => {
      let gerceklesen = 0;
      imalatlar.forEach((im: any) => {
        if (im.plan_id === p.id) {
          try {
            const mlz = JSON.parse(im.kullanilan_malzeme);
            mlz.forEach((m:any) => {
              if (m.ad === p.malzeme_adi) gerceklesen += parseFloat(m.miktar) || 0;
            });
          } catch(e) {}
        }
      });
      statuses[p.id] = {
        gerceklesen,
        total: p.miktar,
        yuzde: p.miktar > 0 ? Math.min((gerceklesen / p.miktar) * 100, 100) : 0
      };
    });
    return statuses;
  }, [planlar, imalatlar]);

  const toggleSelection = (id: number) => {
    const newSet = new Set(selectedRows);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedRows(newSet);
  };

  const isAllVisibleSelected = filteredImalatlar.length > 0 && filteredImalatlar.every(i => selectedRows.has(i.id));
  
  const toggleSelectAllVisible = () => {
    const newSet = new Set(selectedRows);
    if (isAllVisibleSelected) filteredImalatlar.forEach(i => newSet.delete(i.id));
    else filteredImalatlar.forEach(i => newSet.add(i.id));
    setSelectedRows(newSet);
  };

  const handleExportExcel = async () => {
    try {
      setDocLoading(true);
      const dataToExport = selectedRows.size > 0 
        ? filteredImalatlar.filter(i => selectedRows.has(i.id))
        : filteredImalatlar;

      const res = await fetch('/api/imalat-excel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imalatlar: dataToExport }) 
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
    setFormState({ imalat_adi: '', plan_id: null, tarih: today, imalat_yeri: '', calisan_sayisi: 0, malzemeler: [{ ...emptyMalzeme }], photos: [], existing_photos: [] });
  };

  const openEditMode = (item: any) => {
    setIsAdding(false); setEditingId(item.id);
    let ePhotos = [];
    try { ePhotos = JSON.parse(item.photos || '[]'); } catch { ePhotos = []; }
    
    let parsedMalzemeler = [];
    try {
      const parsed = JSON.parse(item.kullanilan_malzeme);
      parsedMalzemeler = Array.isArray(parsed) ? parsed.map(m => ({
        ad: m.ad || '', spesifikasyon: m.spesifikasyon || '', miktar: m.miktar || '', birim: m.birim || '', metraj: m.metraj || '' 
      })) : [{ ad: item.kullanilan_malzeme || '', spesifikasyon: '', miktar: '', birim: '', metraj: item.metraj || '' }];
    } catch {
      parsedMalzemeler = [{ ad: item.kullanilan_malzeme || '', spesifikasyon: '', miktar: '', birim: '', metraj: item.metraj || '' }];
    }
    if (parsedMalzemeler.length === 0) parsedMalzemeler = [{ ...emptyMalzeme }];

    setFormState({
      imalat_adi: item.imalat_adi, plan_id: item.plan_id || null, tarih: item.tarih || today, imalat_yeri: item.imalat_yeri || '', calisan_sayisi: item.calisan_sayisi || 0,
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
    
    const invalidMaterial = validMalzemeler.find(m => !kayitliMalzemeler.some(k => k.ad === m.ad && (k.spesifikasyon || '') === (m.spesifikasyon || '')));
    if (invalidMaterial) {
      return alert(`⚠️ DİKKAT: Seçtiğiniz "${invalidMaterial.ad}" depo kayıtlarında bulunamadı.\nLütfen sadece depoda tanımlı malzemeleri seçin.`);
    }
    
    setLoading(true);
    try {
      const data = new FormData();
      if (editingId) data.append('id', editingId.toString());
      if (formState.plan_id) data.append('plan_id', formState.plan_id.toString());
      
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
      router.refresh(); 
      
    } catch (error: any) { alert('Kayıt Hatası: ' + error.message); } 
    finally { setLoading(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Bu imalatı silmek istediğinize emin misiniz?')) return;
    setLoading(true);
    try {
      const data = new FormData();
      data.append('id', id.toString());
      await silImalat(data);
      router.refresh(); 
    } catch (error: any) { alert('Silme Hatası: ' + error.message); } finally { setLoading(false); }
  };

  const openLightbox = (photos: string[], index: number) => { setActivePhotos(photos); setViewerIndex(index); };
  const nextPhoto = (e: React.MouseEvent) => { e.stopPropagation(); if (activePhotos && viewerIndex !== null) setViewerIndex((prev) => (prev! < activePhotos.length - 1 ? prev! + 1 : 0)); };
  const prevPhoto = (e: React.MouseEvent) => { e.stopPropagation(); if (activePhotos && viewerIndex !== null) setViewerIndex((prev) => (prev! > 0 ? prev! - 1 : activePhotos.length - 1)); };
  const closeViewer = (e: React.MouseEvent) => { e.stopPropagation(); setActivePhotos(null); setViewerIndex(null); };

  const renderInputRows = (isNew: boolean) => {
    return formState.malzemeler.map((malz, index) => {
      
      const currentList = kayitliMalzemeler.filter(c => `${c.ad} ${c.spesifikasyon || ''}`.toLowerCase().includes(malz.ad.toLowerCase()));
      const isMaterialValid = malz.ad === '' || kayitliMalzemeler.some(k => k.ad === malz.ad && (k.spesifikasyon || '') === malz.spesifikasyon);

      const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'ArrowDown') { e.preventDefault(); setFocusedListIndex(prev => Math.min(prev + 1, currentList.length - 1)); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); setFocusedListIndex(prev => Math.max(prev - 1, 0)); }
        else if (e.key === 'Enter') {
          e.preventDefault();
          if (focusedListIndex >= 0 && currentList[focusedListIndex]) {
            const selected = currentList[focusedListIndex];
            const newMalz = [...formState.malzemeler];
            newMalz[index] = { ...newMalz[index], ad: selected.ad, spesifikasyon: selected.spesifikasyon || '', birim: selected.birim };
            setFormState({ ...formState, malzemeler: newMalz });
            setActiveAutoIndex(null);
          }
        }
      };

      return (
        <tr key={`form-${index}`} className={`bg-[#131316] ${index === 0 ? 'border-t-2 border-blue-500/50' : 'border-t border-zinc-800/40 shadow-[inset_0_0_20px_rgba(37,99,235,0.05)]'}`}>
          {index === 0 && (
            <td className="p-4 align-middle text-center border-r border-zinc-800/30 relative" rowSpan={formState.malzemeler.length}>
              <div className="flex flex-col items-center gap-2 relative">
                <input 
                  type="text" 
                  placeholder="Planlı İş Ara veya İsim Yaz..." 
                  value={formState.imalat_adi} 
                  onChange={e => { setFormState({...formState, imalat_adi: e.target.value, plan_id: null}); setShowPlanAuto(true); }}
                  onFocus={() => setShowPlanAuto(true)} 
                  onBlur={() => setTimeout(() => setShowPlanAuto(false), 200)}
                  className="w-full bg-[#18181b] border border-zinc-700 focus:border-blue-500 rounded-lg p-2 text-xs text-white outline-none text-center transition-colors relative z-10"
                />
                
                {formState.plan_id && (
                  <div className="mt-1 text-[9px] flex items-center justify-center gap-1 text-emerald-400 bg-emerald-950/30 px-2 py-1 rounded border border-emerald-900/50">
                    <span>🔗 Plana Bağlı</span>
                    <button type="button" onClick={() => setFormState({...formState, plan_id: null})} className="ml-1 text-zinc-500 hover:text-red-400" title="Bağlantıyı Kopar">✕</button>
                  </div>
                )}

                {showPlanAuto && formState.imalat_adi && (
                  <ul className="absolute z-50 top-10 left-0 right-0 mt-1 bg-[#18181b] border border-zinc-700 rounded-lg shadow-2xl max-h-48 overflow-y-auto custom-scrollbar text-left text-xs">
                    {planlar.filter(p => p.is_adi.toLowerCase().includes(formState.imalat_adi.toLowerCase())).map((p, i) => (
                      <li 
                        key={i} 
                        onMouseDown={() => {
                          setFormState({
                            ...formState, 
                            imalat_adi: p.is_adi, 
                            plan_id: p.id, 
                            imalat_yeri: p.is_konumu || '',
                            calisan_sayisi: p.adam_sayisi || 0,
                            malzemeler: [{ ad: p.malzeme_adi, spesifikasyon: p.cap, miktar: '', birim: p.birim, metraj: '' }]
                          });
                          setShowPlanAuto(false);
                        }}
                        className="px-3 py-2.5 text-zinc-300 hover:bg-blue-600 hover:text-white cursor-pointer border-b border-zinc-800/50 transition-colors flex flex-col"
                      >
                        <span className="font-bold">{p.is_adi}</span>
                        <span className="text-[10px] text-zinc-500 flex items-center gap-1">📍 {p.is_konumu}</span>
                      </li>
                    ))}
                    {planlar.filter(p => p.is_adi.toLowerCase().includes(formState.imalat_adi.toLowerCase())).length === 0 && (
                      <li className="px-3 py-2 text-zinc-500 italic text-[10px]">
                        Eşleşen plan bulunamadı. Plansız (serbest) olarak kaydedilecek.
                      </li>
                    )}
                  </ul>
                )}

                <input type="date" value={formState.tarih} onChange={e => setFormState({...formState, tarih: e.target.value})} className="w-full bg-[#18181b] border border-zinc-700 focus:border-blue-500 rounded-lg p-2 text-xs text-zinc-400 outline-none text-center transition-colors [color-scheme:dark] mt-1"/>
              </div>
            </td>
          )}

          <td className="p-4 align-middle text-center border-r border-zinc-800/30 relative">
            <input 
              type="text" placeholder="Depodan Malzeme Ara..." value={malz.ad} 
              onChange={e => { handleMalzemeChange(index, 'ad', e.target.value); setActiveAutoIndex(index); setFocusedListIndex(-1); }}
              onFocus={() => setActiveAutoIndex(index)} 
              onBlur={() => setTimeout(() => setActiveAutoIndex(null), 200)}
              onKeyDown={handleKeyDown}
              className={`w-full bg-[#18181b] border ${isMaterialValid ? 'border-zinc-700 focus:border-blue-500' : 'border-red-500 focus:border-red-500 text-red-300'} rounded-lg p-2 text-xs text-white outline-none text-center transition-colors relative z-10`}
            />
            {malz.spesifikasyon && <div className="text-[10px] text-zinc-400 mt-1.5">{malz.spesifikasyon}</div>}

            {activeAutoIndex === index && malz.ad && currentList.length > 0 && (
              <ul className="absolute z-50 left-4 right-4 mt-1 bg-[#18181b] border border-zinc-700 rounded-lg shadow-2xl max-h-48 overflow-y-auto custom-scrollbar text-left">
                {currentList.map((c, i) => (
                  <li 
                    key={i} 
                    onMouseDown={() => { 
                      const newMalz = [...formState.malzemeler];
                      newMalz[index] = { ...newMalz[index], ad: c.ad, spesifikasyon: c.spesifikasyon || '', birim: c.birim };
                      setFormState({ ...formState, malzemeler: newMalz });
                      setActiveAutoIndex(null); 
                    }}
                    className={`px-3 py-2 text-xs cursor-pointer flex flex-col gap-1 border-b border-zinc-800/50 transition-colors ${i === focusedListIndex ? 'bg-blue-600 text-white' : 'text-zinc-300 hover:bg-zinc-800'}`}
                  >
                    <div className="flex justify-between items-center w-full">
                      <span className="truncate pr-2 font-bold">{c.ad}</span>
                      <span className="text-[9px] font-bold text-zinc-400 bg-zinc-900 px-1.5 py-0.5 rounded shrink-0 border border-zinc-700">{c.birim}</span>
                    </div>
                    {c.spesifikasyon && <span className="text-[10px] text-zinc-500 truncate">{c.spesifikasyon}</span>}
                  </li>
                ))}
              </ul>
            )}
            {activeAutoIndex === index && malz.ad && currentList.length === 0 && (
              <div className="absolute z-50 left-4 right-4 mt-1 bg-[#18181b] border border-red-500/50 rounded-lg p-3 text-xs text-red-400 font-bold shadow-2xl">
                Depoda bulunamadı!
              </div>
            )}
          </td>

          <td className="p-4 align-middle text-center border-r border-zinc-800/30">
            <div className="flex justify-center items-center gap-1.5">
              <input 
                type="number" step="any" placeholder="Miktar" value={malz.miktar} 
                onChange={e => handleMalzemeChange(index, 'miktar', e.target.value)} 
                className="w-[70px] bg-[#18181b] border border-zinc-700 focus:border-blue-500 rounded-lg p-2 text-xs text-white outline-none text-center transition-colors"
              />
              <div className="w-[65px] bg-[#131316] border border-zinc-800 rounded-lg p-2 text-xs font-bold text-zinc-500 flex items-center justify-center cursor-not-allowed select-none transition-colors" title="Birim depodan otomatik çekilir">
                {malz.ad && malz.birim ? malz.birim : '-'}
              </div>
              <div className="flex items-center gap-1 ml-1">
                {formState.malzemeler.length > 1 && <button onClick={() => removeMalzeme(index)} type="button" className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors">🗑️</button>}
                {index === formState.malzemeler.length - 1 && <button onClick={addMalzeme} type="button" className="p-1.5 text-zinc-500 hover:text-blue-400 hover:bg-blue-500/10 rounded transition-colors">➕</button>}
              </div>
            </div>
          </td>

          {index === 0 && (
            <>
              <td className="p-4 align-middle text-center border-r border-zinc-800/30" rowSpan={formState.malzemeler.length}>
                <input type="text" placeholder="İmalat Yeri" value={formState.imalat_yeri} onChange={e => setFormState({...formState, imalat_yeri: e.target.value})} className="w-full bg-[#18181b] border border-zinc-700 focus:border-blue-500 rounded-lg p-2 text-xs text-white outline-none text-center transition-colors"/>
              </td>
              <td className="p-4 align-middle text-center border-r border-zinc-800/30" rowSpan={formState.malzemeler.length}>
                <input type="number" placeholder="Ekip" value={formState.calisan_sayisi || ''} onChange={e => setFormState({...formState, calisan_sayisi: parseInt(e.target.value) || 0})} className="w-full bg-[#18181b] border border-zinc-700 focus:border-blue-500 rounded-lg p-2 text-xs text-white outline-none text-center transition-colors"/>
              </td>
              <td className="p-4 align-middle text-center border-r border-zinc-800/30" rowSpan={formState.malzemeler.length}>
                <div className="flex flex-col items-center gap-2 h-full">
                  <div className="flex items-center gap-2">
                    <label className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded-md text-[10px] font-bold cursor-pointer transition-colors border border-zinc-700 flex items-center gap-1">
                      📸 Seç
                      <input type="file" multiple accept="image/*" className="hidden" onChange={e => {
                        if (e.target.files) setFormState({...formState, photos: [...formState.photos, ...Array.from(e.target.files)]})
                      }}/>
                    </label>
                    <span className="text-[10px] text-zinc-500 font-medium">{formState.photos.length} yeni</span>
                  </div>
                  <div className="flex flex-wrap justify-center gap-1.5 mt-1 overflow-y-auto max-h-[50px] custom-scrollbar">
                     {formState.existing_photos.map((p, idx) => (
                       <div key={`old-${idx}`} className="relative group w-8 h-8 rounded border border-zinc-700 overflow-hidden">
                         <img src={p} alt="eski" className="w-full h-full object-cover" />
                         <button onClick={() => setFormState({...formState, existing_photos: formState.existing_photos.filter(ep => ep !== p)})} className="absolute inset-0 bg-red-500/80 text-white font-bold text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">X</button>
                       </div>
                     ))}
                     {formState.photos.map((f, idx) => (
                       <div key={`new-${idx}`} className="relative group w-8 h-8 rounded border border-blue-500 overflow-hidden">
                         <img src={URL.createObjectURL(f)} alt="yeni" className="w-full h-full object-cover" />
                         <button onClick={() => setFormState({...formState, photos: formState.photos.filter((_, i) => i !== idx)})} className="absolute inset-0 bg-red-500/80 text-white font-bold text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">X</button>
                       </div>
                     ))}
                  </div>
                </div>
              </td>
              <td className="p-4 align-middle text-center" rowSpan={formState.malzemeler.length}>
                <div className="flex flex-col gap-2 items-center justify-center h-full w-full">
                  <button onClick={handleSave} disabled={loading || formState.malzemeler.some(m => m.ad.trim() !== '' && !kayitliMalzemeler.some(k => k.ad === m.ad && (k.spesifikasyon || '') === m.spesifikasyon))} className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed py-2.5 rounded-lg text-[11px] text-white font-bold tracking-wider transition-colors shadow-lg">
                    {loading ? '...' : 'KAYDET'}
                  </button>
                  <button onClick={handleCancel} className="w-full bg-zinc-800 hover:bg-zinc-700 py-2.5 rounded-lg text-[11px] text-zinc-300 font-bold tracking-wider transition-colors">İPTAL</button>
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
      
      {/* STANDART ÜST BAR VE TOOLBAR */}
      <div className="mb-6 flex flex-col gap-4 print:hidden">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-100">Günlük Saha İmalat Paneli</h1>
        <div className="flex flex-wrap items-center gap-3 bg-[#131316] p-2.5 rounded-xl border border-zinc-800 shadow-xl relative z-40 w-fit">
          <div className="relative">
            <input type="text" placeholder="Ara (İmalat, Malzeme, Yer)..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="bg-[#18181b] border border-zinc-700 text-xs rounded-lg pl-8 pr-3 py-2.5 text-zinc-300 focus:outline-none focus:border-blue-500 w-64 transition-colors"/>
            <span className="absolute left-3 top-2.5 text-zinc-500 text-sm">🔍</span>
          </div>

          <div className="relative">
            <button onClick={() => setShowDatePicker(!showDatePicker)} className={`bg-[#18181b] border text-xs font-bold rounded-lg px-4 py-2.5 flex items-center gap-2 transition-colors ${selectedDates.length > 0 ? 'border-blue-500 text-blue-400' : 'border-zinc-700 text-zinc-400 hover:border-zinc-500'}`}>
              📅 {selectedDates.length > 0 ? `${selectedDates.length} Gün Seçildi` : 'Tarih Filtresi'}
            </button>
            {showDatePicker && (
              <div className="absolute top-full mt-2 left-0 bg-[#131316] border border-zinc-800 p-4 rounded-xl shadow-2xl z-50 min-w-[300px]">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Takvimden Gün Seçin</span>
                  <button onClick={() => setShowDatePicker(false)} className="text-zinc-500 hover:text-white">✕</button>
                </div>
                <MultiDatePicker selectedDates={selectedDates} onChange={setSelectedDates} />
                {selectedDates.length > 0 && <button onClick={() => setSelectedDates([])} className="mt-4 w-full text-center text-[10px] text-red-400 font-bold hover:bg-red-500/10 rounded-lg py-2 transition-colors">Seçimleri Temizle</button>}
              </div>
            )}
          </div>
          <div className="w-px h-6 bg-zinc-800 mx-1"></div>
          
          <button onClick={handleExportExcel} disabled={docLoading || (filteredImalatlar.length === 0 && selectedRows.size === 0)} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-lg text-xs font-bold shadow-lg shadow-emerald-900/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
            {docLoading ? '⏳ Hazırlanıyor...' : selectedRows.size > 0 ? `📊 Seçilenleri İndir (${selectedRows.size})` : '📊 Tümünü İndir'}
          </button>
          
          {filteredImalatlar.length > 0 && (
            <button onClick={toggleSelectAllVisible} className="text-xs font-bold text-blue-400 hover:text-blue-300 underline decoration-blue-900 underline-offset-4 ml-2 transition-colors">
              {isAllVisibleSelected ? 'Tüm Seçimleri Bırak' : 'Tümünü Seç'}
            </button>
          )}
        </div>
      </div>

      {/* STANDART TABLO YAPISI */}
      <div className="bg-[#0f0f11] border border-zinc-800 rounded-2xl overflow-visible shadow-2xl print:border-0 print:shadow-none">
        <table className="w-full text-left text-xs border-collapse min-w-[1000px] print:text-black relative">
          <thead>
            <tr className="bg-[#131316] text-zinc-500 font-bold uppercase tracking-widest border-b border-zinc-800 print:bg-transparent print:border-black print:text-black">
              <th className="p-4 w-[20%] text-center rounded-tl-2xl print:rounded-none">İMALAT ADI & TARİH</th>
              <th className="p-4 w-[25%] text-center">KULLANILAN MALZEME</th>
              <th className="p-4 w-[15%] text-center">MİKTAR</th>
              <th className="p-4 w-[15%] text-center">YER / LOKASYON</th>
              <th className="p-4 w-[5%] text-center">EKİP</th>
              <th className="p-4 w-[12%] text-center print:hidden">FOTOĞRAFLAR</th>
              <th className="p-4 w-[8%] text-center rounded-tr-2xl print:hidden print:rounded-none">İŞLEMLER</th>
            </tr>
          </thead>
          <tbody onMouseLeave={() => setHoveredRow(null)}>
            
            {filteredImalatlar.length === 0 && !isAdding && <tr><td colSpan={7} className="p-12 text-center text-zinc-500 italic">Kayıt bulunamadı.</td></tr>}

            {filteredImalatlar.map((item) => {
              if (editingId === item.id) return <React.Fragment key={`edit-${item.id}`}>{renderInputRows(false)}</React.Fragment>;

              let parsedMalzemeler = [];
              try {
                const parsed = JSON.parse(item.kullanilan_malzeme);
                parsedMalzemeler = Array.isArray(parsed) ? parsed : [{ ad: item.kullanilan_malzeme || '', spesifikasyon: '', miktar: '', birim: 'adet', metraj: item.metraj || '' }];
              } catch {
                parsedMalzemeler = [{ ad: item.kullanilan_malzeme || '', spesifikasyon: '', miktar: '', birim: 'adet', metraj: item.metraj || '' }];
              }
              if (parsedMalzemeler.length === 0) parsedMalzemeler = [{ ...emptyMalzeme }];

              let parsedPhotos: string[] = [];
              try { parsedPhotos = JSON.parse(item.photos || '[]'); } catch(e) {}
              
              const displayDate = item.tarih ? item.tarih.split('-').reverse().join('.') : '-';
              const isExpanded = expandedRowId === item.id;
              const visiblePhotos = isExpanded ? parsedPhotos : parsedPhotos.slice(0, 3);
              const isHovered = hoveredRow === item.id;

              const isSelected = selectedRows.has(item.id);
              const bgClass = isSelected ? (isHovered ? 'bg-blue-900/30' : 'bg-blue-900/20') : (isHovered ? 'bg-zinc-800/40' : '');

              return parsedMalzemeler.map((malz, sIndex) => {
                const depoBilgisi = kayitliMalzemeler.find((k:any) => k.ad === malz.ad && (k.spesifikasyon || '') === (malz.spesifikasyon || ''));

                return (
                  <tr 
                    key={`read-${item.id}-${sIndex}`} 
                    onMouseEnter={() => setHoveredRow(item.id)}
                    onClick={() => toggleSelection(item.id)}
                    className={`border-b border-zinc-800/40 transition-colors cursor-pointer ${bgClass} print:border-gray-300`}
                  >
                    {sIndex === 0 && (
                      <td className="p-4 align-middle text-center border-r border-zinc-800/30 group relative" rowSpan={parsedMalzemeler.length}>
                        <div className="flex flex-col items-center justify-center">
                          <div className="font-bold text-zinc-200 text-sm mb-1.5">{item.imalat_adi}</div>
                          <div className="flex gap-2 items-center justify-center">
                            <div className="text-[10px] font-mono text-zinc-500 bg-zinc-950 border border-zinc-800 inline-block px-2 py-0.5 rounded-md">{displayDate}</div>
                            {item.plan_id ? (
                              <button 
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  router.push(`/imalat-planla?highlight=${item.plan_id}`); 
                                }} 
                                className="text-[9px] text-blue-400 bg-blue-950/30 border border-blue-900/50 hover:bg-blue-900/80 hover:text-white px-1.5 py-0.5 rounded-md cursor-pointer transition-colors" 
                                title="İmalat Planı Detayına Git"
                              >
                                📋 Planlı
                              </button>
                            ) : (
                              <span className="text-[9px] text-zinc-600 italic border border-transparent">Plansız</span>
                            )}
                          </div>
                        </div>

                        {/* PLAN İLERLEMESİ BİLGİ KUTUCUĞU (TOOLTIP) */}
                        {item.plan_id && planlar.find(p => p.id === item.plan_id) && (
                          <div className="absolute left-1/2 -translate-x-1/2 bottom-[80%] mb-3 w-60 bg-[#131316] border border-zinc-700 p-4 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none z-[100]">
                            {(() => {
                              const pInfo = planlar.find(p => p.id === item.plan_id);
                              const pStat = planStatuses[pInfo.id];
                              return (
                                <div className="flex flex-col gap-2 text-left">
                                  <div className="text-[10px] text-blue-400 font-bold uppercase tracking-widest border-b border-zinc-800 pb-1.5">Plan İlerlemesi</div>
                                  <div className="text-xs text-zinc-200 font-bold leading-tight">{pInfo.is_adi}</div>
                                  <div className="grid grid-cols-2 gap-2 mt-1">
                                    <div className="flex flex-col bg-zinc-900/50 p-1.5 rounded border border-zinc-800">
                                      <span className="text-[9px] text-zinc-500 uppercase tracking-widest">Hedef</span>
                                      <span className="text-[11px] text-zinc-300 font-mono font-bold">{pInfo.miktar} {pInfo.birim}</span>
                                    </div>
                                    <div className="flex flex-col bg-emerald-950/20 p-1.5 rounded border border-emerald-900/30">
                                      <span className="text-[9px] text-emerald-600 uppercase tracking-widest">Gerçekleşen</span>
                                      <span className="text-[11px] text-emerald-400 font-mono font-bold">{pStat?.gerceklesen} {pInfo.birim}</span>
                                    </div>
                                  </div>
                                  <div className="w-full bg-zinc-900 rounded-full h-1.5 mt-1 border border-zinc-800 overflow-hidden">
                                    <div className="bg-emerald-500 h-full rounded-full transition-all" style={{width: `${pStat?.yuzde}%`}}></div>
                                  </div>
                                  <div className="text-[9px] text-zinc-500 mt-1 flex justify-between items-center font-mono">
                                    <span>Bitiş: {pInfo.ongorulen_bitis.split('-').reverse().join('.')}</span>
                                    <span className="text-[11px] text-emerald-400 font-bold bg-emerald-950/40 px-1.5 rounded border border-emerald-900/50">
                                      {pStat?.yuzde.toFixed(0)}%
                                    </span>
                                  </div>
                                </div>
                              );
                            })()}
                            {/* Konum Belirleyici Ok */}
                            <div className="absolute left-1/2 -bottom-1.5 -translate-x-1/2 w-3 h-3 bg-[#131316] border-b border-r border-zinc-700 transform rotate-45"></div>
                          </div>
                        )}
                      </td>
                    )}
                    
                    <td className="p-4 align-middle text-center text-zinc-300 border-r border-zinc-800/30 group relative">
                      <div className="font-medium cursor-default">{malz.ad || <span className="text-zinc-600 italic">Belirtilmedi</span>}</div>
                      {malz.spesifikasyon && <div className="text-[10px] font-mono text-zinc-500 mt-1 cursor-default">{malz.spesifikasyon}</div>}

                      {/* MALZEME DURUMU BİLGİ KUTUCUĞU (SADECE DEPO BİLGİSİ VARSA GÖSTERİR) */}
                      {malz.ad && depoBilgisi && (
                        <div className="absolute left-1/2 -translate-x-1/2 bottom-[80%] mb-3 w-56 bg-[#131316] border border-zinc-700 p-4 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none z-[100]">
                          <div className="flex flex-col gap-1.5 text-left">
                            <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest border-b border-zinc-800 pb-1.5 mb-1">Depo Bilgisi</div>
                            <div className="text-xs text-zinc-200 font-bold leading-tight">{malz.ad}</div>
                            {malz.spesifikasyon && <div className="text-[9px] font-mono text-zinc-400 break-words">{malz.spesifikasyon}</div>}
                            
                            <div className="flex justify-between items-center mt-2 pt-2 border-t border-zinc-800/50">
                               <span className="text-[9px] text-zinc-500 uppercase tracking-wider">Kalan Stok</span>
                               <span className="text-[11px] font-mono font-bold text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-900/50">{depoBilgisi.kalan} {depoBilgisi.birim || malz.birim}</span>
                            </div>
                          </div>
                          {/* Konum Belirleyici Ok */}
                          <div className="absolute left-1/2 -bottom-1.5 -translate-x-1/2 w-3 h-3 bg-[#131316] border-b border-r border-zinc-700 transform rotate-45"></div>
                        </div>
                      )}
                    </td>
                    
                    <td className="p-4 align-middle text-center text-blue-400 font-mono text-sm font-bold border-r border-zinc-800/30">
                      {malz.miktar ? `${malz.miktar} ${malz.birim}` : (malz.metraj || '-')}
                    </td>
                    
                    {sIndex === 0 && (
                      <>
                        <td className="p-4 align-middle text-center text-zinc-300 border-r border-zinc-800/30" rowSpan={parsedMalzemeler.length}>
                          {item.imalat_yeri ? <span className="inline-block px-3 py-1 bg-zinc-900 border border-zinc-800 rounded-md text-[11px] font-bold tracking-wide">{item.imalat_yeri}</span> : '-'}
                        </td>
                        <td className="p-4 align-middle text-center border-r border-zinc-800/30" rowSpan={parsedMalzemeler.length}>
                          {item.calisan_sayisi > 0 ? <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-zinc-900 text-blue-400 font-bold border border-zinc-700">{item.calisan_sayisi}</span> : '-'}
                        </td>
                        <td className="p-4 align-middle text-center border-r border-zinc-800/30 print:hidden" rowSpan={parsedMalzemeler.length}>
                          {parsedPhotos.length > 0 ? (
                            <div className="flex items-center justify-center gap-1.5">
                              <div className={`flex justify-center gap-1.5 ${isExpanded ? 'flex-wrap' : 'flex-nowrap'}`}>
                                {visiblePhotos.map((p, idx) => (
                                  <div key={idx} onClick={(e) => { e.stopPropagation(); openLightbox(parsedPhotos, idx); }} className="w-8 h-8 rounded border border-zinc-700 overflow-hidden cursor-pointer hover:border-blue-500 transition-all shrink-0 bg-zinc-950">
                                    <img src={p} alt={`foto-${idx}`} className="w-full h-full object-cover hover:scale-110 transition-transform" />
                                  </div>
                                ))}
                              </div>
                              {parsedPhotos.length > 3 && (
                                <button onClick={(e) => { e.stopPropagation(); setExpandedRowId(isExpanded ? null : item.id); }} className="p-1.5 text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-700 rounded-md shrink-0 cursor-pointer text-[10px] font-bold transition-colors">
                                  {isExpanded ? "▲" : `+${parsedPhotos.length - 3}`}
                                </button>
                              )}
                            </div>
                          ) : <span className="text-zinc-600 text-[10px] font-medium italic">Fotoğraf Yok</span>}
                        </td>
                        <td className="p-4 align-middle text-center print:hidden" rowSpan={parsedMalzemeler.length}>
                          <div className="flex flex-row justify-center items-center gap-2">
                            <button onClick={(e) => { e.stopPropagation(); openEditMode(item); }} className="text-zinc-400 hover:text-blue-400 bg-zinc-900 hover:bg-blue-500/10 px-2.5 py-1.5 rounded transition-colors" title="Düzenle">✏️</button>
                            <form action={silImalat}>
                              <input type="hidden" name="id" value={item.id} />
                              <button type="submit" onClick={(e) => { e.stopPropagation(); if(!confirm('Emin misiniz?')) e.preventDefault(); }} className="text-zinc-400 hover:text-red-400 bg-zinc-900 hover:bg-red-500/10 px-2.5 py-1.5 rounded transition-colors" title="Sil">🗑️</button>
                            </form>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                );
              });
            })}

            {isAdding && renderInputRows(true)}
          </tbody>
        </table>
      </div>

      {!isAdding && !editingId && (
        <div className="mt-8 flex justify-center print:hidden">
          <button onClick={openAddMode} className="flex items-center gap-2 px-8 py-3 bg-[#131316] hover:bg-[#18181b] border border-zinc-800 hover:border-blue-500/50 text-zinc-400 hover:text-blue-400 text-xs font-bold tracking-widest uppercase rounded-2xl transition-all shadow-lg hover:shadow-[0_0_20px_rgba(37,99,235,0.15)]">
            ➕ YENİ SAHA İMALATI GİR
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