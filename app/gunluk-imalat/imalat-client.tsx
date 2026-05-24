'use client';

import { useState, useRef, useEffect } from 'react';
import { kaydetImalat, silImalat } from './actions';
import MultiDatePicker from '../components/MultiDatePicker';

export default function ImalatClient({ imalatlar }: { imalatlar: any[] }) {
  // --- FİLTRE VE EXCEL DURUM YÖNETİMİ ---
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [docLoading, setDocLoading] = useState(false);

  // Seçili tarihlere göre filtrele
  const filteredImalatlar = imalatlar.filter((item) => {
    if (selectedDates.length === 0) return true;
    return selectedDates.includes(item.tarih);
  });

  // --- FOTOĞRAF GÖRÜNTÜLEYİCİ VE SATIR GENİŞLETME ---
  const [activePhotos, setActivePhotos] = useState<string[] | null>(null);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [expandedRowId, setExpandedRowId] = useState<number | null>(null); // Sadece 1 satırın fotoğrafları açılsın diye
  
  // --- FORM VE DÜZENLEME DURUMU ---
  const [loading, setLoading] = useState(false);
  const [editData, setEditData] = useState<any>(null);
  const [existingPhotos, setExistingPhotos] = useState<string[]>([]);
  const formRef = useRef<HTMLFormElement>(null);

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (!editData && formRef.current) {
      formRef.current.reset();
      setExistingPhotos([]);
    }
  }, [editData]);

  const handleEdit = (item: any) => {
    setEditData(item);
    try { setExistingPhotos(JSON.parse(item.photos || '[]')); } catch { setExistingPhotos([]); }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancel = () => setEditData(null);
  
  const removeExistingPhoto = (photoToRemove: string) => {
    setExistingPhotos(existingPhotos.filter(p => p !== photoToRemove));
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    try {
      await kaydetImalat(formData);
      setEditData(null);
    } catch (error: any) {
      alert('Kayıt Hatası: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  // EXCEL DIŞA AKTARMA FONKSİYONU
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

  // Doğrudan tıklanan fotoğrafı tam ekran (lightbox) açma
  const openLightbox = (photos: string[], index: number) => {
    setActivePhotos(photos);
    setViewerIndex(index);
  };
  
  const nextPhoto = (e: React.MouseEvent) => { e.stopPropagation(); if (activePhotos && viewerIndex !== null) setViewerIndex((prev) => (prev! < activePhotos.length - 1 ? prev! + 1 : 0)); };
  const prevPhoto = (e: React.MouseEvent) => { e.stopPropagation(); if (activePhotos && viewerIndex !== null) setViewerIndex((prev) => (prev! > 0 ? prev! - 1 : activePhotos.length - 1)); };
  const closeViewer = (e: React.MouseEvent) => { e.stopPropagation(); setActivePhotos(null); setViewerIndex(null); };

  return (
    <div className="max-w-[1500px] mx-auto p-6 space-y-8 print:p-0">
      
      {/* --- ÜST BÖLÜM: FORM (SOL) VE EXCEL PANELİ (SAĞ) YAN YANA --- */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start print:hidden">
        
        {/* SOL: 1. İMALAT GİRİŞ VE DÜZENLEME FORMU (2/3 Genişlik) */}
        <div className={`xl:col-span-2 border rounded-xl overflow-hidden shadow-lg transition-colors ${editData ? 'bg-zinc-900 border-blue-500/50 shadow-blue-500/10' : 'bg-zinc-900 border-zinc-800'}`}>
          <div className={`px-6 py-4 border-b flex justify-between items-center ${editData ? 'bg-blue-950/20 border-blue-900/30' : 'bg-zinc-950/50 border-zinc-800'}`}>
            <h2 className="text-lg font-bold text-zinc-100">
              {editData ? 'İmalat Kaydını Düzenle' : 'Yeni İmalat Girişi'}
            </h2>
            {editData && (
               <button onClick={handleCancel} className="text-sm text-zinc-400 hover:text-white underline cursor-pointer">İptal Et</button>
            )}
          </div>
          
          <form ref={formRef} onSubmit={handleSubmit} className="p-6">
            {editData && <input type="hidden" name="id" value={editData.id} />}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-[10px] text-zinc-400 font-bold mb-2 uppercase tracking-wider">İmalat (İş Kalemi) *</label>
                <input type="text" name="imalat_adi" defaultValue={editData?.imalat_adi} required placeholder="Örn: Havalandırma Kanal Montajı" className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-200 focus:outline-none focus:border-zinc-600" />
              </div>
              <div>
                <label className="block text-[10px] text-zinc-400 font-bold mb-2 uppercase tracking-wider">Tarih *</label>
                <input type="date" name="tarih" defaultValue={editData?.tarih || today} required className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-200 focus:outline-none focus:border-zinc-600 [color-scheme:dark]" />
              </div>
              <div>
                <label className="block text-[10px] text-zinc-400 font-bold mb-2 uppercase tracking-wider">Çalışan Sayısı</label>
                <input type="number" name="calisan_sayisi" defaultValue={editData?.calisan_sayisi} min="0" placeholder="Örn: 3" className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-200 focus:outline-none focus:border-zinc-600" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-[10px] text-zinc-400 font-bold mb-2 uppercase tracking-wider">Kullanılan Malzeme</label>
                <input type="text" name="kullanilan_malzeme" defaultValue={editData?.kullanilan_malzeme} placeholder="Örn: 0.8mm Galvaniz Sac" className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-200 focus:outline-none focus:border-zinc-600" />
              </div>
              <div>
                <label className="block text-[10px] text-zinc-400 font-bold mb-2 uppercase tracking-wider">İmalatın Yapıldığı Yer</label>
                <input type="text" name="imalat_yeri" defaultValue={editData?.imalat_yeri} placeholder="Örn: A Blok Zemin Kat" className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-200 focus:outline-none focus:border-zinc-600" />
              </div>
              <div>
                <label className="block text-[10px] text-zinc-400 font-bold mb-2 uppercase tracking-wider">Adet / Metraj</label>
                <input type="text" name="metraj" defaultValue={editData?.metraj} placeholder="Örn: 45 m2" className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-200 focus:outline-none focus:border-zinc-600" />
              </div>
              
              <div className="md:col-span-2 border-t border-zinc-800/50 pt-4 mt-2">
                <label className="block text-[10px] text-zinc-400 font-bold mb-2 uppercase tracking-wider">
                  {editData ? 'Yeni Fotoğraflar Ekle (İsteğe Bağlı)' : 'Fotoğraflar (Çoklu Seçilebilir)'}
                </label>
                <input type="file" name="photos" multiple accept="image/*" className="w-full text-xs text-zinc-400 file:mr-3 file:py-2 file:px-4 file:border-0 file:rounded-lg file:font-semibold file:bg-zinc-800 file:text-zinc-200 hover:file:bg-zinc-700 cursor-pointer transition-colors" />
                
                {editData && existingPhotos.length > 0 && (
                  <div className="mt-4 p-4 bg-zinc-950/50 border border-zinc-800 rounded-lg">
                    <p className="text-xs text-zinc-500 mb-3 font-medium">Sisteme Yüklü Fotoğraflar (Silmek için resmin üzerindeki X'e basın):</p>
                    <div className="flex flex-wrap gap-3">
                      {existingPhotos.map((p, idx) => (
                        <div key={idx} className="relative group rounded-md overflow-hidden border border-zinc-700">
                          <img src={p} alt="eski" className="w-16 h-16 object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                          <button type="button" onClick={() => removeExistingPhoto(p)} className="absolute inset-0 bg-red-500/80 flex items-center justify-center text-white font-bold opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">X</button>
                          <input type="hidden" name="existing_photos" value={p} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              {editData && (
                <button type="button" onClick={handleCancel} className="px-6 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-bold rounded-lg transition-colors cursor-pointer">Vazgeç</button>
              )}
              <button type="submit" disabled={loading} className={`px-6 py-2.5 text-sm font-bold rounded-lg shadow-lg transition-colors disabled:opacity-50 cursor-pointer ${editData ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-zinc-100 hover:bg-white text-zinc-950'}`}>
                {loading ? 'İşleniyor...' : (editData ? 'Güncellemeyi Kaydet' : 'Sisteme Kaydet')}
              </button>
            </div>
          </form>
        </div>

        {/* SAĞ: 2. EXCEL FİLTRE VE ÇIKTI PANELİ (1/3 Genişlik) */}
        <div className="xl:col-span-1 bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-lg flex flex-col h-full min-h-[400px]">
          <div className="border-b border-zinc-800 pb-4 mb-5 flex items-center justify-between">
            <h3 className="font-bold text-zinc-100">Excel Dışa Aktar</h3>
            <span className="text-xs font-mono text-zinc-500 bg-zinc-950 px-2 py-1 rounded border border-zinc-800">
              {filteredImalatlar.length} Kayıt
            </span>
          </div>

          <div className="flex justify-center mb-6">
             <div className="w-full">
                <MultiDatePicker selectedDates={selectedDates} onChange={setSelectedDates} />
             </div>
          </div>

          <div className="flex-1 flex flex-col min-h-[80px]">
            <label className="block text-[10px] text-zinc-500 font-bold mb-2 uppercase tracking-wider">
              {selectedDates.length > 0 ? 'Seçilen Günler' : 'Tüm Kayıtlar Aktarılacak'}
            </label>
            <div className="flex-1 bg-zinc-950/50 border border-zinc-800/80 p-3 rounded-lg flex content-start flex-wrap gap-2 overflow-y-auto max-h-[120px]">
              {selectedDates.length === 0 && (
                <span className="text-sm text-zinc-500 italic">Takvimden gün seçerek filtreleyebilirsiniz...</span>
              )}
              {selectedDates.map(date => {
                const displayDate = date.split('-').reverse().join('.');
                return (
                  <span key={date} className="px-2.5 py-1 bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded text-xs font-semibold flex items-center gap-1.5 h-fit">
                    {displayDate} 
                    <button onClick={() => setSelectedDates(selectedDates.filter(d => d !== date))} className="text-blue-500 hover:text-white transition-colors cursor-pointer text-sm leading-none">&times;</button>
                  </span>
                )
              })}
            </div>
            {selectedDates.length > 0 && (
              <div className="flex justify-end mt-2">
                 <button onClick={() => setSelectedDates([])} className="text-[11px] text-zinc-500 hover:text-zinc-300 underline cursor-pointer">Seçimleri Temizle</button>
              </div>
            )}
          </div>

          <div className="pt-4 mt-auto">
            <button
              onClick={handleExportExcel}
              disabled={docLoading || filteredImalatlar.length === 0}
              className="w-full py-3.5 text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-[0_0_15px_rgba(5,150,105,0.2)] transition-colors flex items-center justify-center gap-2 disabled:bg-zinc-800 disabled:text-zinc-500 disabled:opacity-50 disabled:shadow-none cursor-pointer"
            >
              {docLoading ? 'Hazırlanıyor...' : '📊 Raporu İndir'}
            </button>
          </div>
        </div>
      </div>

      {/* --- ALT BÖLÜM: 3. GÜNLÜK İMALAT TABLOSU --- */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-xl print:border-0 print:shadow-none">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse min-w-[1100px] print:text-black">
            <thead>
              <tr className="bg-zinc-950 text-zinc-500 font-bold text-[10px] uppercase tracking-widest border-b border-zinc-800 print:bg-transparent print:border-black print:text-black">
                <th className="py-4 px-5 w-[20%]">İMALAT</th>
                <th className="py-4 px-3 w-[10%]">TARİH</th>
                <th className="py-4 px-3 w-[20%]">KULLANILAN MALZEME</th>
                <th className="py-4 px-3 w-[12%]">YER</th>
                <th className="py-4 px-3 w-[10%]">METRAJ</th>
                <th className="py-4 px-3 w-[8%] text-center">EKİP</th>
                <th className="py-4 px-3 w-[12%] print:hidden">FOTOĞRAFLAR</th>
                <th className="py-4 px-5 w-[8%] text-right print:hidden">İŞLEMLER</th>
              </tr>
            </thead>
            <tbody>
              {filteredImalatlar.length === 0 ? (
                 <tr>
                   <td colSpan={8} className="py-16 text-center text-zinc-500 font-medium">Bu kriterlere uygun imalat bulunamadı.</td>
                 </tr>
              ) : (
                filteredImalatlar.map((item) => {
                  let parsedPhotos: string[] = [];
                  try { parsedPhotos = JSON.parse(item.photos || '[]'); } catch(e) {}
                  
                  const displayDate = item.tarih ? item.tarih.split('-').reverse().join('.') : '-';
                  const isExpanded = expandedRowId === item.id;
                  
                  // Satır kapalıysa en fazla 3 fotoğraf göster, açıksa hepsini göster
                  const visiblePhotos = isExpanded ? parsedPhotos : parsedPhotos.slice(0, 3);
                  const hasMorePhotos = parsedPhotos.length > 3;

                  return (
                    <tr key={item.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors print:border-gray-300">
                      <td className="py-4 px-5 font-semibold text-zinc-200 align-middle print:text-black">{item.imalat_adi}</td>
                      <td className="py-4 px-3 text-zinc-400 align-middle font-mono text-[11px] print:text-black">{displayDate}</td>
                      <td className="py-4 px-3 text-zinc-400 align-middle text-[12px] print:text-black">{item.kullanilan_malzeme || '-'}</td>
                      <td className="py-4 px-3 text-zinc-300 align-middle print:text-black">
                        {item.imalat_yeri ? <span className="inline-block px-2.5 py-1 bg-zinc-800 border border-zinc-700 rounded text-[11px] font-medium print:border-0 print:p-0 print:bg-transparent">{item.imalat_yeri}</span> : '-'}
                      </td>
                      <td className="py-4 px-3 text-zinc-300 align-middle font-mono text-xs print:text-black">{item.metraj || '-'}</td>
                      <td className="py-4 px-3 text-center align-middle print:text-black">
                        {item.calisan_sayisi > 0 ? <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-zinc-800 text-zinc-300 font-bold text-xs border border-zinc-700 print:border-0 print:bg-transparent print:p-0">{item.calisan_sayisi}</span> : '-'}
                      </td>
                      
                      {/* YENİ NESİL AKORDEON FOTOĞRAF HÜCRESİ */}
                      {/* YENİ NESİL AKORDEON FOTOĞRAF HÜCRESİ */}
                        <td className="py-4 px-3 align-middle print:hidden">
                        {parsedPhotos.length > 0 ? (
                            <div className="flex items-start gap-2">
                            
                            {/* Kapalıyken tek satır (flex-nowrap), açıkken çoklu satır (flex-wrap) */}
                            <div className={`flex gap-1.5 flex-1 ${isExpanded ? 'flex-wrap' : 'flex-nowrap'}`}>
                                {visiblePhotos.map((p, idx) => (
                                <div 
                                    key={idx} 
                                    onClick={() => openLightbox(parsedPhotos, idx)}
                                    className="w-9 h-9 rounded-md overflow-hidden border border-zinc-700 cursor-pointer hover:border-blue-500 hover:shadow-[0_0_8px_rgba(59,130,246,0.5)] transition-all shrink-0 bg-zinc-950"
                                >
                                    <img src={p} alt={`foto-${idx}`} className="w-full h-full object-cover hover:scale-110 transition-transform" />
                                </div>
                                ))}
                            </div>
                            
                            {/* Genişletme/Daraltma Oku (Sadece 3'ten fazla resim varsa) */}
                            {hasMorePhotos && (
                                <button 
                                onClick={() => setExpandedRowId(isExpanded ? null : item.id)}
                                className="p-1 mt-0.5 text-zinc-400 hover:text-white bg-zinc-800/50 hover:bg-zinc-700 border border-zinc-700/50 rounded transition-colors shrink-0 cursor-pointer shadow-sm"
                                title={isExpanded ? "Daralt" : "Tümünü Gör"}
                                >
                                {isExpanded ? (
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"/></svg>
                                ) : (
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                                )}
                                </button>
                            )}
                            </div>
                        ) : (
                            <span className="text-zinc-600 text-[11px] font-medium italic">Yok</span>
                        )}
                        </td>

                      <td className="py-4 px-5 text-right align-middle print:hidden">
                        <div className="flex justify-end gap-2 opacity-50 hover:opacity-100 transition-opacity">
                          <div className="relative group/tooltip flex items-center">
                            <button onClick={() => handleEdit(item)} className="p-2 bg-zinc-800/50 border border-zinc-700/50 hover:bg-blue-500/10 hover:border-blue-500/30 text-zinc-400 hover:text-blue-400 rounded-lg transition-all shadow-sm cursor-pointer">
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                            </button>
                            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-zinc-100 text-zinc-900 text-[10px] font-bold rounded opacity-0 group-hover/tooltip:opacity-100 transition-all pointer-events-none whitespace-nowrap shadow-lg z-10">Düzenle</span>
                          </div>
                          <div className="relative group/tooltip flex items-center">
                            <form action={silImalat}>
                              <input type="hidden" name="id" value={item.id} />
                              <button type="submit" className="p-2 bg-zinc-800/50 border border-zinc-700/50 hover:bg-red-500/10 hover:border-red-500/30 text-zinc-400 hover:text-red-500 rounded-lg transition-all shadow-sm cursor-pointer">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                              </button>
                            </form>
                            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-red-500 text-white text-[10px] font-bold rounded opacity-0 group-hover/tooltip:opacity-100 transition-all pointer-events-none whitespace-nowrap shadow-lg z-10">Sil</span>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- TAM EKRAN FOTOĞRAF GÖRÜNTÜLEYİCİ (LIGHTBOX) --- */}
      {activePhotos && viewerIndex !== null && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 backdrop-blur-md" onClick={closeViewer}>
          <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-10 bg-gradient-to-b from-black/60 to-transparent pointer-events-none">
            <span className="text-zinc-400 font-medium text-sm tracking-widest bg-black/40 px-3 py-1 rounded-full pointer-events-auto">
              {viewerIndex + 1} / {activePhotos.length}
            </span>
            <button onClick={closeViewer} className="text-white hover:text-red-400 text-4xl leading-none pointer-events-auto drop-shadow-lg cursor-pointer">&times;</button>
          </div>
          {activePhotos.length > 1 && (
             <button onClick={prevPhoto} className="absolute left-4 p-4 text-white hover:text-blue-400 hover:bg-white/5 rounded-full transition-all drop-shadow-2xl z-10 cursor-pointer">
               <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
             </button>
          )}
          <img src={activePhotos[viewerIndex]} alt="Büyük Görünüm" className="max-w-full max-h-[90vh] object-contain shadow-2xl rounded-sm" onClick={(e) => e.stopPropagation()} />
          {activePhotos.length > 1 && (
             <button onClick={nextPhoto} className="absolute right-4 p-4 text-white hover:text-blue-400 hover:bg-white/5 rounded-full transition-all drop-shadow-2xl z-10 cursor-pointer">
               <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
             </button>
          )}
        </div>
      )}

    </div>
  );
}