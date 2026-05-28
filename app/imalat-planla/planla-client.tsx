"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { kaydetImalatPlani, silImalatPlani, kaydetPlanlamaAyarlari } from './actions';
import MultiDatePicker from '../components/MultiDatePicker';

const ZORLUK_DERECELERI = [
  { ad: "Çok Kolay (Zemin / Açık Alan)", carpan: 0.8 },
  { ad: "Standart (Normal Kat)", carpan: 1.0 },
  { ad: "Zorlu (Tavan Arası / Şaft)", carpan: 1.25 },
  { ad: "Çok Zorlu (Yüksek / Yoğun)", carpan: 1.5 },
  { ad: "Ekstrem (Özel Ekipman)", carpan: 2.0 },
];

// --- İÇ İÇE FORM KARTI BİLEŞENİ ---
const PlanFormCard = ({ initialData, onCancel, adamSaatVerileri, depoStokDurumu, genelAyar }: any) => {
  const [loading, setLoading] = useState(false);
  const today = new Date().toISOString().split('T')[0];
  
  const [form, setForm] = useState({
    is_adi: initialData?.is_adi || '',
    is_konumu: initialData?.is_konumu || '',
    malzeme_secim: initialData ? `${initialData.malzeme_adi} - ${initialData.cap}` : '',
    miktar: initialData?.miktar?.toString() || '',
    adam_sayisi: initialData?.adam_sayisi?.toString() || '',
    zorluk: initialData?.zorluk_carpan || 1.0,
    baslangic_tarihi: initialData?.baslangic_tarihi || today,
    useCustomOverride: !!(initialData?.ozel_mesai_gun || initialData?.ozel_mesai_saat),
    customGun: initialData?.ozel_mesai_gun ? initialData.ozel_mesai_gun.toString() : '',
    customSaat: initialData?.ozel_mesai_saat ? initialData.ozel_mesai_saat.toString() : ''
  });

  const [showAuto, setShowAuto] = useState(false);
  const [selectedAdamSaat, setSelectedAdamSaat] = useState<any>(
    initialData ? adamSaatVerileri.find((a:any) => a.malzeme_adi === initialData.malzeme_adi && a.cap === initialData.cap) : null
  );

  const stok = selectedAdamSaat ? (depoStokDurumu.find((d:any) => d.ad === selectedAdamSaat.malzeme_adi && d.cap === selectedAdamSaat.cap)?.kalan || 0) : 0;

  const hesaplananDegerler = useMemo(() => {
    if (!selectedAdamSaat || !form.miktar || !form.adam_sayisi || !form.baslangic_tarihi) return null;

    const miktar = parseFloat(form.miktar);
    const ekip = parseInt(form.adam_sayisi, 10);
    if (isNaN(miktar) || isNaN(ekip) || ekip <= 0) return null;

    const toplamSaat = (miktar * selectedAdamSaat.adam_saat) * form.zorluk;
    const reelSaat = toplamSaat / ekip;

    const gunlukSaat = form.useCustomOverride && form.customSaat ? parseFloat(form.customSaat) : parseFloat(genelAyar.saat);
    const haftalikGun = form.useCustomOverride && form.customGun ? parseInt(form.customGun, 10) : parseInt(genelAyar.gun, 10);
    const tatillerListesi = genelAyar.tatiller || [];

    let kalanSaat = reelSaat;
    let currDate = new Date(form.baslangic_tarihi);
    let gunSayaci = 0; 

    while (kalanSaat > 0) {
      const dateStr = currDate.toISOString().split('T')[0];
      const dayOfWeek = currDate.getDay(); 
      let isWorkDay = true;
      
      if (haftalikGun === 6 && dayOfWeek === 0) isWorkDay = false; 
      if (haftalikGun === 5 && (dayOfWeek === 0 || dayOfWeek === 6)) isWorkDay = false; 
      if (tatillerListesi.includes(dateStr)) isWorkDay = false;

      if (isWorkDay) {
        kalanSaat -= gunlukSaat;
        gunSayaci++;
      }
      
      if (kalanSaat > 0) currDate.setDate(currDate.getDate() + 1);
    }

    return {
      toplamAdamSaat: toplamSaat.toFixed(1),
      fiiliGun: gunSayaci,
      bitisTarihi: currDate.toISOString().split('T')[0]
    };
  }, [form, selectedAdamSaat, genelAyar]);

  const handleSavePlan = async () => {
    if (!form.is_adi || !form.is_konumu || !selectedAdamSaat || !form.miktar || !form.adam_sayisi || !hesaplananDegerler) {
      return alert("Lütfen zorunlu alanları doldurun.");
    }
    setLoading(true);
    try {
      const fd = new FormData();
      if (initialData?.id) fd.append('id', initialData.id.toString());
      
      fd.append('is_adi', form.is_adi);
      fd.append('is_konumu', form.is_konumu);
      fd.append('malzeme_adi', selectedAdamSaat.malzeme_adi);
      fd.append('cap', selectedAdamSaat.cap);
      fd.append('miktar', form.miktar);
      fd.append('birim', selectedAdamSaat.birim);
      fd.append('adam_sayisi', form.adam_sayisi);
      fd.append('zorluk_carpan', form.zorluk.toString());
      fd.append('zorluk_ad', ZORLUK_DERECELERI.find(z => z.carpan === form.zorluk)?.ad || "Standart");
      fd.append('baslangic_tarihi', form.baslangic_tarihi);
      fd.append('ongorulen_bitis', hesaplananDegerler.bitisTarihi);
      fd.append('toplam_adam_saat', hesaplananDegerler.toplamAdamSaat);
      
      if (form.useCustomOverride && form.customGun) fd.append('ozel_mesai_gun', form.customGun);
      if (form.useCustomOverride && form.customSaat) fd.append('ozel_mesai_saat', form.customSaat);

      await kaydetImalatPlani(fd);
      onCancel(); 
    } catch (e: any) { alert(e.message); } finally { setLoading(false); }
  };

  return (
    <div className="bg-[#131316] border-2 border-blue-500/50 rounded-2xl p-5 shadow-[0_0_30px_rgba(37,99,235,0.15)] flex flex-col gap-4 relative z-10 transition-all min-h-[300px] w-full">
      <h3 className="text-xs font-bold text-blue-400 uppercase tracking-widest border-b border-zinc-800 pb-2">
        {initialData ? 'PLANI DÜZENLE' : 'YENİ İMALAT PLANI'}
      </h3>
      
      <div className="flex flex-col gap-3 flex-1">
        <div className="grid grid-cols-2 gap-3">
          <input type="text" placeholder="İş Adı (Örn: Kolon İnişi)" value={form.is_adi} onChange={e => setForm({...form, is_adi: e.target.value})} className="w-full bg-[#18181b] border border-zinc-700 focus:border-blue-500 rounded-lg p-2 text-xs text-white outline-none transition-colors" />
          <input type="text" placeholder="Konum (Örn: B Blok 3. Kat)" value={form.is_konumu} onChange={e => setForm({...form, is_konumu: e.target.value})} className="w-full bg-[#18181b] border border-zinc-700 focus:border-blue-500 rounded-lg p-2 text-xs text-white outline-none transition-colors" />
        </div>

        <div className="relative">
          <input 
            type="text" placeholder="Malzeme Arayın..." value={form.malzeme_secim} 
            onChange={e => { setForm({...form, malzeme_secim: e.target.value}); setShowAuto(true); }}
            onFocus={() => setShowAuto(true)} onBlur={() => setTimeout(() => setShowAuto(false), 200)}
            className="w-full bg-[#18181b] border border-zinc-700 focus:border-blue-500 rounded-lg p-2 text-xs text-white outline-none transition-colors"
          />
          {showAuto && (
             <ul className="absolute z-50 left-0 right-0 mt-1 bg-[#18181b] border border-zinc-700 rounded-lg shadow-2xl max-h-48 overflow-y-auto custom-scrollbar">
               {adamSaatVerileri.filter((a:any) => `${a.malzeme_adi} ${a.cap}`.toLowerCase().includes(form.malzeme_secim.toLowerCase())).map((a:any, i:number) => {
                 const currentStok = depoStokDurumu.find((d:any) => d.ad === a.malzeme_adi && d.cap === a.cap)?.kalan || 0;
                 return (
                   <li 
                     key={i} 
                     onMouseDown={() => { setForm({...form, malzeme_secim: `${a.malzeme_adi} - ${a.cap}`, adam_sayisi: a.gerekli_adam.toString()}); setSelectedAdamSaat(a); setShowAuto(false); }} 
                     className="px-3 py-2 text-zinc-300 hover:bg-zinc-800 cursor-pointer text-[11px] border-b border-zinc-800/50 flex justify-between items-center transition-colors"
                   >
                     <div className="truncate"><span className="font-bold">{a.malzeme_adi}</span> <span className="text-blue-400 font-mono">({a.cap})</span></div>
                     <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ml-2 whitespace-nowrap ${currentStok > 0 ? 'bg-emerald-950/40 text-emerald-500 border border-emerald-900/50' : 'bg-zinc-900 text-zinc-600 border border-zinc-800'}`}>
                       {currentStok > 0 ? `🟢 Stok: ${currentStok}` : '⚪ Yok'}
                     </span>
                   </li>
                 );
               })}
             </ul>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
           <input type="number" step="any" placeholder={`Miktar ${selectedAdamSaat ? `(${selectedAdamSaat.birim})` : ''}`} value={form.miktar} onChange={e => setForm({...form, miktar: e.target.value})} className="w-full bg-[#18181b] border border-zinc-700 focus:border-blue-500 rounded-lg p-2 text-xs text-white outline-none transition-colors" />
           <input type="number" placeholder="Atanan Ekip (Kişi)" value={form.adam_sayisi} onChange={e => setForm({...form, adam_sayisi: e.target.value})} className="w-full bg-[#18181b] border border-zinc-700 focus:border-blue-500 rounded-lg p-2 text-xs text-white outline-none transition-colors" />
        </div>

        <div className="grid grid-cols-2 gap-3">
           <select value={form.zorluk} onChange={e => setForm({...form, zorluk: parseFloat(e.target.value)})} className="w-full bg-[#18181b] border border-zinc-700 focus:border-blue-500 rounded-lg p-2 text-[11px] text-white outline-none transition-colors">
             {ZORLUK_DERECELERI.map((z, i) => <option key={i} value={z.carpan}>{z.ad}</option>)}
           </select>
           <input type="date" value={form.baslangic_tarihi} onChange={e => setForm({...form, baslangic_tarihi: e.target.value})} className="w-full bg-[#18181b] border border-zinc-700 focus:border-blue-500 rounded-lg p-1.5 text-xs text-zinc-300 outline-none transition-colors [color-scheme:dark]" />
        </div>

        <div className="mt-1">
           <button onClick={() => setForm({...form, useCustomOverride: !form.useCustomOverride})} className="text-[9px] text-zinc-500 hover:text-blue-400 font-bold underline underline-offset-2 transition-colors">
             {form.useCustomOverride ? '▼ Özel Mesai Kapat' : '▶ İşe Özel Mesai (Opsiyonel)'}
           </button>
           {form.useCustomOverride && (
             <div className="mt-2 flex gap-2 p-2 bg-zinc-900/50 rounded-lg border border-zinc-800">
               <input type="number" placeholder="Gün / Hf" value={form.customGun} onChange={e => setForm({...form, customGun: e.target.value})} className="flex-1 bg-[#18181b] border border-zinc-700 rounded-md p-1.5 text-[10px] text-white outline-none" title="Haftalık Çalışma Günü"/>
               <input type="number" step="0.5" placeholder="Saat / Gn" value={form.customSaat} onChange={e => setForm({...form, customSaat: e.target.value})} className="flex-1 bg-[#18181b] border border-zinc-700 rounded-md p-1.5 text-[10px] text-white outline-none" title="Günlük Mesai Saati"/>
             </div>
           )}
        </div>
      </div>

      {/* Canlı Hesaplama Sonucu */}
      <div className="border-t border-zinc-800 pt-3 mt-1 flex flex-col gap-3">
        {hesaplananDegerler ? (
          <div className="flex items-center justify-between bg-emerald-950/20 border border-emerald-900/50 p-2.5 rounded-xl">
             <div className="flex flex-col">
               <span className="text-[9px] text-emerald-600 uppercase tracking-widest font-bold">Öngörülen Bitiş</span>
               <span className="text-lg font-bold text-emerald-400 font-mono leading-none">{hesaplananDegerler.bitisTarihi.split('-').reverse().join('.')}</span>
             </div>
             <div className="flex flex-col items-end">
               <span className="text-[10px] text-zinc-400 font-bold">{hesaplananDegerler.fiiliGun} Gün</span>
               <span className="text-[10px] text-amber-400 font-bold">{hesaplananDegerler.toplamAdamSaat} A/S</span>
             </div>
          </div>
        ) : (
          <div className="text-zinc-600 text-[10px] italic flex items-center justify-center py-4 bg-zinc-900/30 rounded-xl border border-zinc-800/50">
            Hesaplama için formu doldurun...
          </div>
        )}

        <div className="flex gap-2">
          <button onClick={onCancel} className="bg-[#18181b] hover:bg-zinc-800 text-zinc-300 px-4 py-2 rounded-lg text-xs font-bold transition-colors">İptal</button>
          <button onClick={handleSavePlan} disabled={loading || !hesaplananDegerler} className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white rounded-lg text-xs font-bold tracking-widest transition-colors">
            {loading ? '...' : (initialData ? 'GÜNCELLE' : 'KAYDET')}
          </button>
        </div>
      </div>
    </div>
  );
};

// --- ANA SAYFA BİLEŞENİ ---
export default function PlanlaClient({ ayarlar, planlar, adamSaatVerileri, depoStokDurumu, bagliImalatlar }: any) {
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [expandedRowId, setExpandedRowId] = useState<number | null>(null);
  const [highlightId, setHighlightId] = useState<number | null>(null);

  const [genelAyar, setGenelAyar] = useState({
    gun: ayarlar.haftalik_mesai_gun.toString(),
    saat: ayarlar.gunluk_mesai_saat.toString(),
    tatiller: (() => { try { return JSON.parse(ayarlar.tatil_gunleri || "[]"); } catch { return []; } })()
  });

  // URL'deki "highlight" parametresini yakalayıp scroll ve parlama işlemi yapar
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const h = params.get('highlight');
    if (h) {
      setHighlightId(parseInt(h, 10));
      setTimeout(() => {
        const el = document.getElementById(`plan-card-${h}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    }
  }, []);

  const handleSaveSettings = async () => {
    setLoading(true);
    const fd = new FormData();
    fd.append('haftalik_mesai_gun', genelAyar.gun);
    fd.append('gunluk_mesai_saat', genelAyar.saat);
    fd.append('tatil_gunleri', JSON.stringify(genelAyar.tatiller));
    await kaydetPlanlamaAyarlari(fd);
    setShowSettings(false);
    setLoading(false);
  };

  return (
    <div className="max-w-[1500px] mx-auto p-6 bg-zinc-950 min-h-screen text-zinc-100">
      
      {/* ÜST BAR VE AYARLAR */}
      <div className="mb-8 flex flex-col gap-4">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-100">İmalat ve İş Programı Planlama</h1>
        <div className="flex flex-wrap items-center gap-3 bg-[#131316] p-2.5 rounded-xl border border-zinc-800 shadow-xl relative z-40 w-fit">
          <button onClick={() => setShowSettings(!showSettings)} className="bg-[#18181b] border border-zinc-700 text-xs font-bold text-zinc-300 rounded-lg px-4 py-2.5 hover:border-blue-500 hover:text-blue-400 transition-colors">
            ⚙️ Genel Mesai & Tatil Ayarları
          </button>
          <div className="w-px h-6 bg-zinc-800 mx-1"></div>
          <div className="text-[11px] font-medium text-zinc-500 px-2 font-mono flex items-center gap-3">
             <span><span className="text-zinc-300 font-bold">{genelAyar.gun}</span> Gün/Hf</span>
             <span><span className="text-zinc-300 font-bold">{genelAyar.saat}</span> Saat/Gn</span>
             <span><span className="text-amber-400 font-bold">{genelAyar.tatiller.length}</span> Tatil</span>
          </div>
        </div>

        {/* AYARLAR MODALI */}
        {showSettings && (
          <div className="bg-[#131316] border border-zinc-700 p-5 rounded-xl shadow-2xl max-w-sm absolute z-50 mt-14">
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4 flex justify-between">
              Mesai Parametreleri <button onClick={() => setShowSettings(false)} className="text-zinc-500 hover:text-white">✕</button>
            </h3>
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-zinc-500 block mb-1">Haftalık Gün</label>
                  <select value={genelAyar.gun} onChange={e => setGenelAyar({...genelAyar, gun: e.target.value})} className="w-full bg-[#18181b] border border-zinc-700 rounded-lg p-2 text-xs text-white outline-none">
                    <option value="5">5 Gün</option><option value="6">6 Gün</option><option value="7">7 Gün</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-zinc-500 block mb-1">Günlük Saat</label>
                  <input type="number" step="0.5" value={genelAyar.saat} onChange={e => setGenelAyar({...genelAyar, saat: e.target.value})} className="w-full bg-[#18181b] border border-zinc-700 rounded-lg p-2 text-xs text-white outline-none" />
                </div>
              </div>
              
              <div className="border-t border-zinc-800 pt-3">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-2">Resmi / Özel Tatiller (Mesai Dışı)</label>
                <div className="bg-[#18181b] border border-zinc-700 rounded-lg p-2">
                  <MultiDatePicker selectedDates={genelAyar.tatiller} onChange={(dates) => setGenelAyar({...genelAyar, tatiller: dates})} />
                </div>
                {genelAyar.tatiller.length > 0 && <button onClick={() => setGenelAyar({...genelAyar, tatiller: []})} className="mt-2 w-full text-center text-[10px] text-red-400 font-bold hover:bg-red-500/10 rounded-lg py-1.5 transition-colors">Tüm Tatilleri Temizle</button>}
              </div>

              <button onClick={handleSaveSettings} disabled={loading} className="mt-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg py-2.5 text-xs font-bold shadow-lg shadow-blue-900/20">Kaydet</button>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 mb-8 items-start">
        
        {/* BOŞ KART (YENİ EKLE BUTONU) */}
        {!isAdding && (
          <div 
             onClick={() => setIsAdding(true)} 
             className="bg-[#0f0f11] border-2 border-dashed border-zinc-800 hover:border-blue-500/50 rounded-2xl p-5 shadow-xl transition-colors flex flex-col items-center justify-center cursor-pointer min-h-[300px] text-zinc-600 hover:text-blue-400 group h-full"
          >
             <span className="text-5xl mb-3 group-hover:scale-110 transition-transform">➕</span>
             <span className="text-xs font-bold tracking-widest uppercase">Yeni Plan Oluştur</span>
          </div>
        )}

        {/* YENİ EKLEME FORMU KARTI */}
        {isAdding && (
          <PlanFormCard onCancel={() => setIsAdding(false)} adamSaatVerileri={adamSaatVerileri} depoStokDurumu={depoStokDurumu} genelAyar={genelAyar} />
        )}

        {/* LİSTELENEN PLAN KARTLARI */}
        {planlar.map((plan: any) => {
          if (editingId === plan.id) {
            return <PlanFormCard key={plan.id} initialData={plan} onCancel={() => setEditingId(null)} adamSaatVerileri={adamSaatVerileri} depoStokDurumu={depoStokDurumu} genelAyar={genelAyar} />;
          }

          // GERÇEKLEŞEN İMALAT HESAPLAMA
          const iliskiliImalatlar = bagliImalatlar.filter((im: any) => im.plan_id === plan.id);
          let gerceklesenMiktar = 0;
          iliskiliImalatlar.forEach((im: any) => {
            try {
              const mlz = JSON.parse(im.kullanilan_malzeme);
              mlz.forEach((m: any) => {
                if (m.ad === plan.malzeme_adi) {
                  gerceklesenMiktar += parseFloat(m.miktar) || 0;
                }
              });
            } catch(e) {}
          });

          const yuzdeGerceklesen = plan.miktar > 0 ? Math.min((gerceklesenMiktar / plan.miktar) * 100, 100) : 0;
          const isExpanded = expandedRowId === plan.id;
          const isHighlighted = highlightId === plan.id;

          // ZAMAN DURUMU HESAPLAMASI
          const today = new Date().getTime();
          const start = new Date(plan.baslangic_tarihi).getTime();
          const end = new Date(plan.ongorulen_bitis).getTime();
          
          let timeProgress = 0;
          if (today > end) timeProgress = 100;
          else if (today > start) timeProgress = ((today - start) / (end - start)) * 100;

          let durumEtiketi = "Başlamadı";
          let durumRenk = "text-zinc-400 bg-zinc-900 border-zinc-800";
          let borderClass = "border-zinc-800 hover:border-zinc-700 bg-[#0f0f11]";
          let shadowClass = "";

          if (isHighlighted) {
            borderClass = "border-blue-500 ring-4 ring-blue-500/20 bg-[#131316]";
            shadowClass = "shadow-[0_0_40px_rgba(37,99,235,0.4)]";
          } else if (gerceklesenMiktar >= plan.miktar) {
            durumEtiketi = "Tamamlandı";
            durumRenk = "text-emerald-400 bg-emerald-950/50 border-emerald-500/30";
            shadowClass = "shadow-[0_0_15px_rgba(16,185,129,0.1)]";
          } else if (today < start) {
            durumEtiketi = "Planlandı";
            durumRenk = "text-blue-400 bg-blue-950/50 border-blue-500/30";
          } else {
            if (yuzdeGerceklesen >= timeProgress - 10) { 
              durumEtiketi = "Zamanında İlerliyor";
              durumRenk = "text-emerald-400 bg-emerald-950/40 border-emerald-900/50";
            } else {
              durumEtiketi = "Planın Gerisinde";
              durumRenk = "text-red-400 bg-red-950/40 border-red-900/50";
              borderClass = "border-red-500/50 hover:border-red-400 bg-[#0f0f11]";
              shadowClass = "shadow-[0_0_15px_rgba(239,68,68,0.1)]";
            }
          }

          return (
            <div id={`plan-card-${plan.id}`} key={plan.id} className={`border rounded-2xl p-5 transition-all duration-500 flex flex-col justify-between min-h-[300px] w-full ${borderClass} ${shadowClass}`}>
               <div>
                 <div className="flex justify-between items-start mb-1">
                   <h2 className="text-lg font-bold text-zinc-100">{plan.is_adi}</h2>
                   <div className="flex gap-2 shrink-0 ml-2">
                     <button onClick={() => setEditingId(plan.id)} className="text-zinc-500 hover:text-blue-400 p-1.5 bg-[#18181b] hover:bg-zinc-800 rounded-lg border border-zinc-800 transition-colors" title="Düzenle">✏️</button>
                     <form action={silImalatPlani}>
                       <input type="hidden" name="id" value={plan.id} />
                       <button type="submit" onClick={(e) => { if(!confirm('Emin misiniz?')) e.preventDefault() }} className="text-zinc-500 hover:text-red-400 p-1.5 bg-[#18181b] hover:bg-zinc-800 rounded-lg border border-zinc-800 transition-colors" title="Sil">🗑️</button>
                     </form>
                   </div>
                 </div>
                 
                 <div className="flex items-center gap-2 mb-4">
                   <span className="text-[10px] text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800 flex items-center gap-1 truncate max-w-[200px]" title={plan.is_konumu}>📍 {plan.is_konumu || 'Belirtilmedi'}</span>
                   <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${durumRenk}`}>{durumEtiketi}</span>
                 </div>
                 
                 <div className="text-xs font-bold text-blue-400 mb-1 truncate">{plan.malzeme_adi} <span className="text-zinc-500 font-normal">({plan.cap})</span></div>
                 
                 <div className="grid grid-cols-2 gap-y-3 gap-x-2 mt-4">
                   <div><span className="text-[10px] text-zinc-500 block">Zorluk</span><span className="text-[11px] text-amber-400 font-bold truncate block">{plan.zorluk_ad}</span></div>
                   <div><span className="text-[10px] text-zinc-500 block">Efor</span><span className="font-mono text-xs text-zinc-400">{plan.toplam_adam_saat} A/S ({plan.adam_sayisi} Kişi)</span></div>
                 </div>

                 {/* İLERLEME ÇUBUĞU */}
                 <div className="mt-5">
                    <div className="flex justify-between items-end mb-1">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Sahada Gerçekleşen</span>
                      <div className="font-mono text-[11px] font-bold">
                        <span className="text-blue-400">{gerceklesenMiktar}</span>
                        <span className="text-zinc-500 mx-1">/</span>
                        <span className="text-zinc-300">{plan.miktar} {plan.birim}</span>
                      </div>
                    </div>
                    <div className="w-full bg-zinc-900 rounded-full h-2 overflow-hidden border border-zinc-800">
                      <div className={`h-full rounded-full transition-all duration-1000 ${gerceklesenMiktar >= plan.miktar ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${yuzdeGerceklesen}%` }}></div>
                    </div>
                 </div>
               </div>
               
               <div className="mt-5 pt-4 border-t border-zinc-800/50 flex justify-between items-center bg-zinc-950/50 -mx-5 -mb-5 p-5 rounded-b-2xl h-fit">
                 <div className="flex flex-col">
                   <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Başlangıç</span>
                   <span className="font-mono text-sm text-zinc-300">{plan.baslangic_tarihi.split('-').reverse().join('.')}</span>
                 </div>
                 
                 <button onClick={() => setExpandedRowId(isExpanded ? null : plan.id)} className="text-xs font-bold text-zinc-500 hover:text-blue-400 bg-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-800 transition-colors">
                   {isExpanded ? 'GİZLE ▲' : 'GEÇMİŞ ▼'}
                 </button>

                 <div className="flex flex-col text-right">
                   <span className="text-[10px] text-emerald-500 uppercase tracking-widest font-bold">Öngörülen Bitiş</span>
                   <span className="font-mono text-lg font-bold text-emerald-400 leading-none">{plan.ongorulen_bitis.split('-').reverse().join('.')}</span>
                 </div>
               </div>

               {/* GENİŞLETİLEBİLİR İMALAT GEÇMİŞİ AKORDEONU */}
               {isExpanded && (
                 <div className="mt-5 bg-[#18181b] border-t border-zinc-800/50 -mx-5 -mb-5 p-4 rounded-b-2xl max-h-[200px] overflow-y-auto custom-scrollbar shadow-inner">
                   {iliskiliImalatlar.length === 0 ? (
                     <div className="text-center text-[10px] text-zinc-500 italic py-4">Günlük İmalat Modülünden henüz bu plana ait veri girilmemiş.</div>
                   ) : (
                     <div className="flex flex-col gap-2">
                       {iliskiliImalatlar.map((im:any, idx:number) => {
                         let eklenen = 0;
                         try {
                           const mlz = JSON.parse(im.kullanilan_malzeme);
                           mlz.forEach((m: any) => { 
                             if (m.ad === plan.malzeme_adi) eklenen += parseFloat(m.miktar) || 0; 
                           });
                         } catch(e) {}

                         return (
                           <div key={idx} className="flex justify-between items-center bg-zinc-900/50 p-2.5 rounded-lg border border-zinc-800 hover:border-zinc-700 transition-colors">
                             <div className="flex flex-col">
                               <span className="text-xs font-bold text-zinc-300">{im.imalat_adi}</span>
                               <div className="text-[9px] font-mono text-zinc-500 flex gap-2">
                                 <span>{im.tarih.split('-').reverse().join('.')}</span>
                                 <span>• {im.imalat_yeri}</span>
                               </div>
                             </div>
                             <span className="font-mono text-xs font-bold text-blue-400 bg-blue-950/30 px-2 py-1 rounded border border-blue-900/50">
                               +{eklenen} {plan.birim}
                             </span>
                           </div>
                         );
                       })}
                     </div>
                   )}
                 </div>
               )}

            </div>
          );
        })}
      </div>

    </div>
  );
}