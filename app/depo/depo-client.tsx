"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ekleDepoMalzeme, guncelleDepoMalzeme, silDepoMalzeme, ekleTedarikci, silTedarikci } from './actions';

export default function DepoClient({ initialData, kutuphaneData = [], kayitliDurumlar = [] }: { initialData: any[], kutuphaneData: any[], kayitliDurumlar: any[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Form verilerini tek bir merkezde topladık (Ekleme ve Düzenleme için ortak)
  const [newMalz, setNewMalz] = useState({ 
    ad: '', varyasyon: '', basinc: '', cap: '', gereken_miktar: '', birim: 'adet' 
  });
  const [showCinsAuto, setShowCinsAuto] = useState(false); 

  const activeLibItem = kutuphaneData.find(k => k.ad === newMalz.ad);
  const isValidCins = !!activeLibItem; 

  // Onay Durumunu Bul (Daha isabetli eşleştirme)
  const ilgiliDurumlar = kayitliDurumlar.filter(k => (k.ad || '').toLowerCase() === newMalz.ad.toLowerCase());
  let seciliDurum = 'KAYITSIZ';
  if (ilgiliDurumlar.length > 0) {
    const isApproved = ilgiliDurumlar.some(k => k.durum === 'ONAYLI');
    const isPending = ilgiliDurumlar.some(k => k.durum === 'ONAY_BEKLIYOR');
    seciliDurum = isApproved ? 'ONAYLI' : (isPending ? 'ONAY_BEKLIYOR' : 'KAYITSIZ');
  }

  const [newTedarikci, setNewTedarikci] = useState({ firma_adi: '', miktar: '' });

  const filteredData = initialData.filter(item => 
    item.ad.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (item.spesifikasyon && item.spesifikasyon.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleSaveMalzeme = async () => {
    if (!isValidCins) return alert("Lütfen master kütüphaneden kayıtlı bir malzeme seçin!");
    if (!newMalz.gereken_miktar) return alert("Lütfen gereken miktarı girin!");
    
    const spesifikasyon = [newMalz.varyasyon, newMalz.basinc, newMalz.cap].filter(Boolean).join(' - ');

    setLoading(true);
    try {
      const data = new FormData();
      if (editingId) data.append('id', editingId.toString());
      data.append('ad', newMalz.ad);
      data.append('spesifikasyon', spesifikasyon);
      data.append('gereken_miktar', newMalz.gereken_miktar);
      data.append('birim', newMalz.birim); // Birim artık güvenli şekilde formdan geliyor
      
      if (editingId) {
        await guncelleDepoMalzeme(data);
      } else {
        await ekleDepoMalzeme(data);
      }

      setIsAdding(false);
      setEditingId(null);
      setNewMalz({ ad: '', varyasyon: '', basinc: '', cap: '', gereken_miktar: '', birim: 'adet' });
      router.refresh();
    } catch (e: any) { alert(e.message); } finally { setLoading(false); }
  };

  const openEditMode = (item: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setIsAdding(false);
    setEditingId(item.id);
    setExpandedId(null);
    
    let v = '', b = '', c = '';
    const libItem = kutuphaneData.find(k => k.ad === item.ad);
    
    if (libItem && item.spesifikasyon) {
       const parts = item.spesifikasyon.split(' - ');
       parts.forEach((p: string) => {
          if (libItem.varyasyonlar?.includes(p)) v = p;
          else if (libItem.siniflar_ve_dayanimlar?.includes(p)) b = p;
          else c = p; 
       });
    }

    setNewMalz({
      ad: item.ad,
      varyasyon: v,
      basinc: b,
      cap: c,
      gereken_miktar: item.gereken_miktar.toString(),
      birim: item.birim
    });
  };

  const handleAddTedarikci = async (depoId: number) => {
    if (!newTedarikci.firma_adi || !newTedarikci.miktar) return;
    setLoading(true);
    try {
      const data = new FormData();
      data.append('depo_malzeme_id', depoId.toString());
      data.append('firma_adi', newTedarikci.firma_adi);
      data.append('miktar', newTedarikci.miktar);
      await ekleTedarikci(data);
      setNewTedarikci({ firma_adi: '', miktar: '' });
      router.refresh();
    } catch (e: any) { alert(e.message); } finally { setLoading(false); }
  };

  const handleSilMalzeme = async (id: number) => {
    if (!confirm("Bu malzemeyi ve tüm tedarikçi kayıtlarını silmek istediğinize emin misiniz?")) return;
    setLoading(true);
    const data = new FormData(); data.append('id', id.toString());
    await silDepoMalzeme(data);
    router.refresh();
    setLoading(false);
  };

  const handleSilTedarikci = async (id: number) => {
    setLoading(true);
    const data = new FormData(); data.append('id', id.toString());
    await silTedarikci(data);
    router.refresh();
    setLoading(false);
  };

  const toggleExpand = (id: number) => {
    setExpandedId(expandedId === id ? null : id);
    setNewTedarikci({ firma_adi: '', miktar: '' }); 
  };

  const getStatusDot = (status: string) => {
    switch (status) {
      case 'ONAYLI': return <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" title="Sistemde Onaylı"></div>;
      case 'ONAY_BEKLIYOR': return <div className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]" title="Onay Bekliyor"></div>;
      default: return <div className="w-2.5 h-2.5 rounded-full bg-zinc-600" title="Kayıtsız Malzeme"></div>;
    }
  };

  const getCapOptions = () => {
    if (!activeLibItem) return null;
    if (activeLibItem.caplar_mm) return activeLibItem.caplar_mm.map((c:any) => `Ø${c} mm`);
    if (activeLibItem.caplar_dn) return activeLibItem.caplar_dn;
    if (activeLibItem.kalinlik_mm) return activeLibItem.kalinlik_mm.map((c:any) => `${c} mm Kalınlık`);
    if (activeLibItem.sicaklik_dereceleri_C) return activeLibItem.sicaklik_dereceleri_C.map((c:any) => `${c}°C`);
    if (activeLibItem.olculer) return activeLibItem.olculer;
    return null;
  };
  const capOptions = getCapOptions();

  // YENİ: Ortak Form Render Fonksiyonu (Ekleme ve Düzenleme Aynı Kalıbı Kullanır)
  const renderMalzemeFormu = () => (
    <div className="bg-[#131316] border-2 border-blue-500/50 rounded-2xl p-5 flex flex-col gap-5 shadow-[0_0_30px_rgba(37,99,235,0.15)] relative z-10 w-full mb-2 transition-all">
       <div className="flex items-center gap-4">
         <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse shrink-0 shadow-[0_0_10px_rgba(37,99,235,0.8)]"></div>
         
         <div className="relative flex-1">
            <input 
              type="text" 
              placeholder="Mekanik Kütüphaneden Malzeme Seçin..." 
              value={newMalz.ad} 
              onChange={e => { setNewMalz({...newMalz, ad: e.target.value}); setShowCinsAuto(true); }}
              onFocus={() => setShowCinsAuto(true)} 
              onBlur={() => setTimeout(() => setShowCinsAuto(false), 200)}
              className={`w-full bg-[#18181b] border ${newMalz.ad && !isValidCins ? 'border-red-500 focus:border-red-500 text-red-300' : 'border-zinc-700 focus:border-blue-500 text-white'} rounded-lg p-2.5 text-sm outline-none transition-colors`} 
              autoFocus
            />
            {showCinsAuto && (
              <ul className="absolute z-50 left-0 right-0 mt-1 bg-[#18181b] border border-zinc-700 rounded-lg shadow-2xl max-h-48 overflow-y-auto custom-scrollbar text-left">
                {kutuphaneData.filter(k => k.ad.toLowerCase().includes(newMalz.ad.toLowerCase())).map((c, i) => (
                  <li 
                    key={i} 
                    onMouseDown={() => { 
                      setNewMalz({...newMalz, ad: c.ad, birim: c.olcu_birimi || 'adet', varyasyon: '', basinc: '', cap: ''}); 
                      setShowCinsAuto(false); 
                    }} 
                    className="px-4 py-2.5 text-blue-200 hover:bg-blue-600 hover:text-white cursor-pointer text-xs border-b border-zinc-800/50 flex justify-between items-center transition-colors"
                  >
                    <span className="font-bold">{c.ad}</span>
                    <span className="text-[10px] font-bold bg-zinc-900 px-2 py-0.5 rounded text-zinc-400">{c.olcu_birimi}</span>
                  </li>
                ))}
                {newMalz.ad && kutuphaneData.filter(k => k.ad.toLowerCase().includes(newMalz.ad.toLowerCase())).length === 0 && (
                  <li className="px-4 py-3 text-red-400 text-xs font-bold italic cursor-not-allowed">Kütüphanede böyle bir ana malzeme bulunamadı.</li>
                )}
              </ul>
            )}
         </div>

         {isValidCins && (
            <div className={`flex items-center gap-1.5 px-4 py-2.5 rounded-lg border text-[11px] font-bold ${
              seciliDurum === 'ONAYLI' ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/50' :
              seciliDurum === 'ONAY_BEKLIYOR' ? 'bg-amber-950/40 text-amber-400 border-amber-800/50' :
              'bg-slate-900/60 text-slate-400 border-slate-700/50'
            }`}>
              {getStatusDot(seciliDurum)}
              {seciliDurum === 'ONAYLI' ? 'Onaylı' : seciliDurum === 'ONAY_BEKLIYOR' ? 'Onay Bekliyor' : 'Sunulmadı'}
            </div>
         )}

         <input type="number" placeholder="Gereken Miktar" value={newMalz.gereken_miktar} onChange={e => setNewMalz({...newMalz, gereken_miktar: e.target.value})} className="w-32 bg-[#18181b] border border-zinc-700 focus:border-blue-500 rounded-lg p-2.5 text-sm text-white outline-none text-center transition-colors"/>
         
         {/* YENİ: DIŞARIDAN GİRİŞİ TAMAMEN KAPALI BİRİM KUTUSU */}
         <div className="w-24 bg-[#18181b] border border-zinc-800 rounded-lg p-2.5 text-sm font-bold text-zinc-500 flex items-center justify-center cursor-not-allowed select-none transition-colors" title="Birim kütüphaneden otomatik çekilir">
            {newMalz.birim || '-'}
         </div>
       </div>

       <div className="flex items-center gap-3 pl-6 border-l-2 border-zinc-800 ml-1.5">
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mr-2">Spesifikasyon:</span>
          
          <select 
            value={newMalz.varyasyon} onChange={e => setNewMalz({...newMalz, varyasyon: e.target.value})} disabled={!isValidCins || !activeLibItem?.varyasyonlar}
            className="flex-1 bg-[#18181b] border border-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed focus:border-blue-500 rounded-lg p-2 text-xs text-white outline-none cursor-pointer transition-colors"
          >
            <option value="">Varyasyon Seçin...</option>
            {activeLibItem?.varyasyonlar?.map((v: string) => <option key={v} value={v}>{v}</option>)}
          </select>

          <select 
            value={newMalz.basinc} onChange={e => setNewMalz({...newMalz, basinc: e.target.value})} disabled={!isValidCins || !activeLibItem?.siniflar_ve_dayanimlar}
            className="w-56 bg-[#18181b] border border-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed focus:border-blue-500 rounded-lg p-2 text-xs text-white outline-none cursor-pointer transition-colors"
          >
            <option value="">Sınıf / Dayanım (PN, SN vb.)</option>
            {activeLibItem?.siniflar_ve_dayanimlar?.map((p: string) => <option key={p} value={p}>{p}</option>)}
          </select>

          <select 
            value={newMalz.cap} onChange={e => setNewMalz({...newMalz, cap: e.target.value})} disabled={!isValidCins || !capOptions}
            className="w-48 bg-[#18181b] border border-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed focus:border-blue-500 rounded-lg p-2 text-xs text-white outline-none cursor-pointer transition-colors"
          >
            <option value="">Çap / Ölçü</option>
            {capOptions?.map((c: string) => <option key={c} value={c}>{c}</option>)}
          </select>
       </div>
       
       <div className="flex justify-end gap-3 border-t border-zinc-800/50 pt-4 mt-2">
          <button onClick={() => { setIsAdding(false); setEditingId(null); }} className="bg-[#18181b] hover:bg-zinc-800 text-zinc-300 px-6 py-2.5 rounded-lg text-xs font-bold transition-colors">İptal</button>
          <button onClick={handleSaveMalzeme} disabled={loading || !isValidCins} className="bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed text-white px-8 py-2.5 rounded-lg text-xs font-bold tracking-wider transition-colors shadow-lg shadow-blue-900/20">
            {loading ? 'Kaydediliyor...' : (editingId ? 'GÜNCELLE' : 'DEPOYA KAYDET')}
          </button>
       </div>
    </div>
  );

  return (
    <div className="max-w-[1500px] mx-auto p-6 bg-zinc-950 min-h-screen text-zinc-100">
      
      <div className="mb-6 flex flex-col gap-4">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-100">Depo ve Stok Yönetimi</h1>
        <div className="flex flex-wrap items-center gap-3 bg-[#131316] p-2.5 rounded-xl border border-zinc-800 shadow-xl relative z-40 w-fit">
          <div className="relative">
            <input type="text" placeholder="Malzeme veya Çap Ara..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="bg-[#18181b] border border-zinc-700 text-xs rounded-lg pl-8 pr-3 py-2.5 text-zinc-300 focus:outline-none focus:border-blue-500 w-64 transition-colors"/>
            <span className="absolute left-3 top-2.5 text-zinc-500 text-sm">🔍</span>
          </div>
          <div className="w-px h-6 bg-zinc-800 mx-1"></div>
          <div className="flex items-center gap-4 text-[11px] font-bold text-zinc-400 px-2">
            <span className="flex items-center gap-1.5">{getStatusDot('ONAYLI')} Onaylı</span>
            <span className="flex items-center gap-1.5">{getStatusDot('ONAY_BEKLIYOR')} Onay Bekliyor</span>
            <span className="flex items-center gap-1.5">{getStatusDot('KAYITSIZ')} Kayıtsız</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-[#131316] border border-zinc-800 rounded-2xl text-[11px] font-bold text-zinc-500 uppercase tracking-widest shadow-lg">
          <div className="col-span-3">MALZEME CİNSİ & DETAY</div>
          <div className="col-span-2 text-center">GEREKEN</div>
          <div className="col-span-3 text-center">TEDARİK DURUMU</div>
          <div className="col-span-3 text-center">STOK / KALAN</div>
          <div className="col-span-1 text-right">DETAY</div>
        </div>

        {filteredData.length === 0 && !isAdding && (
          <div className="p-12 text-center text-zinc-500 italic bg-[#0f0f11] rounded-2xl border border-zinc-800">
            Stokta malzeme bulunmuyor.
          </div>
        )}

        {filteredData.map(item => {
          if (editingId === item.id) return <React.Fragment key={`edit-${item.id}`}>{renderMalzemeFormu()}</React.Fragment>;

          const isExpanded = expandedId === item.id;
          const progressPercent = item.gereken_miktar > 0 ? Math.min((item.toplamTedarik / item.gereken_miktar) * 100, 100) : 0;
          const isStockLow = item.kalanMiktar <= 0;

          return (
            <div key={item.id} className={`bg-[#0f0f11] border rounded-2xl transition-all duration-300 overflow-hidden ${isExpanded ? 'border-blue-500/50 shadow-lg shadow-blue-900/10' : 'border-zinc-800 hover:border-zinc-700'}`}>
              
              <div onClick={() => toggleExpand(item.id)} className="grid grid-cols-12 gap-4 px-6 py-5 items-center cursor-pointer hover:bg-[#131316] transition-colors">
                
                <div className="col-span-3 flex flex-col justify-center">
                  <div className="flex items-center gap-3">
                    {getStatusDot(item.onayDurumu)}
                    <span className="font-bold text-zinc-200 text-sm truncate">{item.ad}</span>
                  </div>
                  {item.spesifikasyon && (
                    <span className="text-[10px] font-mono text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800 w-fit ml-[22px] mt-1.5 truncate">
                      {item.spesifikasyon}
                    </span>
                  )}
                </div>
                
                <div className="col-span-2 text-center font-mono font-bold text-blue-400 text-sm">
                  {item.gereken_miktar} <span className="text-zinc-500 text-xs font-medium ml-1">{item.birim}</span>
                </div>
                
                <div className="col-span-3 flex flex-col justify-center px-4">
                  <div className="flex justify-between text-[11px] mb-1 font-mono">
                    <span className="text-blue-400 font-bold">{item.toplamTedarik} {item.birim}</span>
                    <span className="text-zinc-500">{Math.round(progressPercent)}%</span>
                  </div>
                  <div className="w-full bg-zinc-900 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-blue-500 h-full rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }}></div>
                  </div>
                </div>

                <div className="col-span-3 flex items-center justify-center gap-5 text-center">
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] text-zinc-500 mb-0.5">Kullanılan</span>
                    <span className="font-mono text-zinc-300 font-bold">{item.toplamKullanilan}</span>
                  </div>
                  <div className="h-6 w-px bg-zinc-800"></div>
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] text-zinc-500 mb-0.5">Kalan Stok</span>
                    <span className={`font-mono font-bold text-sm ${isStockLow ? 'text-red-400' : 'text-emerald-400'}`}>
                      {item.kalanMiktar}
                    </span>
                  </div>
                </div>

                <div className="col-span-1 text-right flex items-center justify-end gap-2">
                  <button onClick={(e) => openEditMode(item, e)} className="text-zinc-500 hover:text-blue-400 p-2 bg-[#131316] rounded-lg border border-zinc-800 transition-colors">✏️</button>
                  <button onClick={(e) => { e.stopPropagation(); handleSilMalzeme(item.id); }} className="text-zinc-500 hover:text-red-400 p-2 bg-[#131316] rounded-lg border border-zinc-800 transition-colors">🗑️</button>
                  <span className={`text-zinc-500 text-lg ml-2 transition-transform duration-300 ${isExpanded ? 'rotate-180 text-blue-400' : ''}`}>▼</span>
                </div>
              </div>

              {isExpanded && (
                <div className="bg-[#131316] border-t border-zinc-800/50 p-6 grid grid-cols-2 gap-8 shadow-inner cursor-default">
                  
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                      <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">🏭 Tedarikçi Firmalar</h3>
                      <span className="text-[10px] bg-blue-900/30 text-blue-400 px-2 py-0.5 rounded-full border border-blue-800/50">{item.tedarikciler.length} Firma</span>
                    </div>
                    
                    <div className="flex flex-col gap-2 max-h-[250px] overflow-y-auto custom-scrollbar pr-2">
                      {item.tedarikciler.length === 0 && <span className="text-[11px] text-zinc-600 italic">Henüz tedarikçi eklenmemiş.</span>}
                      {item.tedarikciler.map((t: any) => (
                        <div key={t.id} className="flex justify-between items-center bg-[#18181b] border border-zinc-800 p-3 rounded-lg hover:border-zinc-700 transition-colors">
                          <span className="text-xs font-bold text-zinc-300">{t.firma_adi}</span>
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-xs text-blue-400 font-bold bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800">{t.miktar} {item.birim}</span>
                            <button onClick={() => handleSilTedarikci(t.id)} disabled={loading} className="text-zinc-600 hover:text-red-400 text-xs">✕</button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-2 bg-zinc-950 border border-zinc-800 p-3 rounded-xl flex items-center gap-3">
                      <input type="text" placeholder="Firma Adı" value={newTedarikci.firma_adi} onChange={e => setNewTedarikci({...newTedarikci, firma_adi: e.target.value})} className="flex-1 bg-[#18181b] border border-zinc-700 focus:border-blue-500 rounded-lg p-2 text-xs text-white outline-none transition-colors"/>
                      <input type="number" placeholder="Miktar" value={newTedarikci.miktar} onChange={e => setNewTedarikci({...newTedarikci, miktar: e.target.value})} className="w-24 bg-[#18181b] border border-zinc-700 focus:border-blue-500 rounded-lg p-2 text-xs text-white outline-none text-center transition-colors"/>
                      <button onClick={() => handleAddTedarikci(item.id)} disabled={loading || !newTedarikci.firma_adi || !newTedarikci.miktar} className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors">Ekle</button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-4">
                     <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                      <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">📉 Sahada Kullanım Geçmişi</h3>
                      <span className="text-[10px] bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded-full border border-zinc-700">Otomatik Çekilir</span>
                    </div>

                    <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2 relative">
                      {item.kullanimGecmisi.length === 0 ? (
                         <div className="text-[11px] text-zinc-600 italic flex items-center h-full justify-center py-10">Günlük İmalat formunda henüz bu malzeme kullanılmamış.</div>
                      ) : (
                        <div className="relative border-l border-zinc-800 ml-2 pl-4 py-2 flex flex-col gap-4">
                          {item.kullanimGecmisi.map((kg: any, idx: number) => (
                            <div key={idx} className="relative">
                              <div className="absolute -left-[21px] top-1.5 w-2 h-2 bg-zinc-700 rounded-full border-2 border-[#131316]"></div>
                              <div className="bg-[#18181b] border border-zinc-800/60 p-3 rounded-lg flex justify-between items-start">
                                <div className="flex flex-col gap-1">
                                  <div className="text-[10px] text-zinc-500 font-mono">{kg.tarih ? kg.tarih.split('-').reverse().join('.') : '-'}</div>
                                  <div className="text-xs font-bold text-zinc-300">{kg.imalat_adi}</div>
                                  <div className="text-[10px] text-zinc-400 flex items-center gap-1">📍 {kg.lokasyon || 'Belirtilmedi'}</div>
                                </div>
                                <div className="font-mono text-xs font-bold text-amber-400 bg-amber-950/30 px-2 py-1 rounded border border-amber-900/50">
                                  - {kg.miktar} {kg.birim}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              )}
            </div>
          );
        })}

        {isAdding && renderMalzemeFormu()}

      </div>

      {!isAdding && !editingId && (
        <div className="mt-8 flex justify-center">
          <button onClick={() => setIsAdding(true)} className="flex items-center gap-2 px-8 py-3 bg-[#131316] hover:bg-[#18181b] border border-zinc-800 hover:border-blue-500/50 text-zinc-400 hover:text-blue-400 text-xs font-bold tracking-widest uppercase rounded-2xl transition-all shadow-lg hover:shadow-[0_0_20px_rgba(37,99,235,0.15)]">
            ➕ YENİ DEPO KALEMİ AÇ
          </button>
        </div>
      )}

    </div>
  );
}