"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { kaydetImalatPlani, silImalatPlani, kaydetPlanlamaAyarlari } from './actions';

const ZORLUK_DERECELERI = [
  { ad: "Çok Kolay (Zemin / Açık Alan)", carpan: 0.8 },
  { ad: "Standart (Normal Kat)", carpan: 1.0 },
  { ad: "Zorlu (Tavan Arası / Dar Şaft)", carpan: 1.25 },
  { ad: "Çok Zorlu (Yüksek İskele / Yoğun Tesisat)", carpan: 1.5 },
  { ad: "Ekstrem (Dış Cephe / Özel Ekipman)", carpan: 2.0 },
];

export default function PlanlaClient({ ayarlar, planlar, adamSaatVerileri, depoStokDurumu }: any) {
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  // Genel Ayarlar State
  const [genelAyar, setGenelAyar] = useState({
    gun: ayarlar.haftalik_mesai_gun.toString(),
    saat: ayarlar.gunluk_mesai_saat.toString()
  });

  // Form State
  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({
    is_adi: '', malzeme_secim: '', miktar: '',
    adam_sayisi: '', zorluk: 1.0, baslangic_tarihi: today,
    useCustomOverride: false, customGun: '', customSaat: ''
  });
  
  const [showAuto, setShowAuto] = useState(false);
  const [selectedAdamSaat, setSelectedAdamSaat] = useState<any>(null);

  // DEPO STOK KONTROLÜ
  const stokDurumu = useMemo(() => {
    if (!selectedAdamSaat) return null;
    const depoItem = depoStokDurumu.find((d:any) => d.ad === selectedAdamSaat.malzeme_adi && d.cap === selectedAdamSaat.cap);
    return depoItem ? depoItem.kalan : 0;
  }, [selectedAdamSaat, depoStokDurumu]);

  // HESAPLAMA MOTORU (Gerçek Zamanlı)
  const hesaplananDegerler = useMemo(() => {
    if (!selectedAdamSaat || !form.miktar || !form.adam_sayisi || !form.baslangic_tarihi) return null;

    const miktar = parseFloat(form.miktar);
    const ekip = parseInt(form.adam_sayisi, 10);
    if (isNaN(miktar) || isNaN(ekip) || ekip <= 0) return null;

    // Toplam Adam-Saat İhtiyacı: (Miktar * 1 Birim İçin Adam/Saat) * Zorluk Çarpanı
    const toplamSaat = (miktar * selectedAdamSaat.adam_saat) * form.zorluk;
    
    // İşin Reel Tamamlanma Süresi (Saat)
    const reelSaat = toplamSaat / ekip;

    // Mesai Parametreleri
    const gunlukSaat = form.useCustomOverride && form.customSaat ? parseFloat(form.customSaat) : parseFloat(genelAyar.saat);
    const haftalikGun = form.useCustomOverride && form.customGun ? parseInt(form.customGun, 10) : parseInt(genelAyar.gun, 10);

    // GÜN ATLAYARAK TAKVİM HESAPLAMA
    let kalanSaat = reelSaat;
    let currDate = new Date(form.baslangic_tarihi);
    let gunSayaci = 0; // Toplam fiili çalışılan gün

    while (kalanSaat > 0) {
      const dayOfWeek = currDate.getDay(); // 0: Pazar, 1: Pzt ... 6: Cmt
      let isWorkDay = true;
      if (haftalikGun === 6 && dayOfWeek === 0) isWorkDay = false; // Sadece Pazar tatil
      if (haftalikGun === 5 && (dayOfWeek === 0 || dayOfWeek === 6)) isWorkDay = false; // Cmt, Paz tatil

      if (isWorkDay) {
        kalanSaat -= gunlukSaat;
        gunSayaci++;
      }
      
      if (kalanSaat > 0) {
        currDate.setDate(currDate.getDate() + 1);
      }
    }

    return {
      toplamAdamSaat: toplamSaat.toFixed(1),
      fiiliGun: gunSayaci,
      bitisTarihi: currDate.toISOString().split('T')[0]
    };
  }, [form, selectedAdamSaat, genelAyar]);

  const handleSaveSettings = async () => {
    setLoading(true);
    const fd = new FormData();
    fd.append('haftalik_mesai_gun', genelAyar.gun);
    fd.append('gunluk_mesai_saat', genelAyar.saat);
    await kaydetPlanlamaAyarlari(fd);
    setShowSettings(false);
    setLoading(false);
  };

  const handleSavePlan = async () => {
    if (!form.is_adi || !selectedAdamSaat || !form.miktar || !form.adam_sayisi || !hesaplananDegerler) {
      return alert("Lütfen formdaki tüm zorunlu alanları doldurun.");
    }
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('is_adi', form.is_adi);
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
      setIsAdding(false);
      setForm({
        is_adi: '', malzeme_secim: '', miktar: '', adam_sayisi: '', zorluk: 1.0, baslangic_tarihi: today,
        useCustomOverride: false, customGun: '', customSaat: ''
      });
      setSelectedAdamSaat(null);
    } catch (e: any) { alert(e.message); } finally { setLoading(false); }
  };

  return (
    <div className="max-w-[1500px] mx-auto p-6 bg-zinc-950 min-h-screen text-zinc-100">
      
      {/* ÜST BAR VE AYARLAR */}
      <div className="mb-8 flex flex-col gap-4">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-100">İmalat ve İş Programı Planlama</h1>
        <div className="flex flex-wrap items-center gap-3 bg-[#131316] p-2.5 rounded-xl border border-zinc-800 shadow-xl relative z-40 w-fit">
          <button onClick={() => setShowSettings(!showSettings)} className="bg-[#18181b] border border-zinc-700 text-xs font-bold text-zinc-300 rounded-lg px-4 py-2.5 hover:border-blue-500 hover:text-blue-400 transition-colors">
            ⚙️ Genel Mesai Ayarları
          </button>
          <div className="w-px h-6 bg-zinc-800 mx-1"></div>
          <div className="text-[11px] font-medium text-zinc-500 px-2 font-mono">
             Varsayılan: <span className="text-zinc-300 font-bold">{genelAyar.gun} Gün / Hafta</span> • <span className="text-zinc-300 font-bold">{genelAyar.saat} Saat / Gün</span>
          </div>
        </div>

        {/* AYARLAR MODALI */}
        {showSettings && (
          <div className="bg-[#131316] border border-zinc-700 p-5 rounded-xl shadow-2xl max-w-sm">
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4">Şantiye Mesai Parametreleri</h3>
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-[10px] text-zinc-500 block mb-1">Haftalık Çalışma Günü</label>
                <select value={genelAyar.gun} onChange={e => setGenelAyar({...genelAyar, gun: e.target.value})} className="w-full bg-[#18181b] border border-zinc-700 rounded-lg p-2.5 text-xs text-white outline-none">
                  <option value="5">5 Gün (Pzt-Cum)</option>
                  <option value="6">6 Gün (Pzt-Cmt)</option>
                  <option value="7">7 Gün (Her Gün)</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] text-zinc-500 block mb-1">Günlük Net Mesai (Saat)</label>
                <input type="number" step="0.5" value={genelAyar.saat} onChange={e => setGenelAyar({...genelAyar, saat: e.target.value})} className="w-full bg-[#18181b] border border-zinc-700 rounded-lg p-2.5 text-xs text-white outline-none" />
              </div>
              <button onClick={handleSaveSettings} disabled={loading} className="mt-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg py-2.5 text-xs font-bold shadow-lg shadow-blue-900/20">Kaydet</button>
            </div>
          </div>
        )}
      </div>

      {/* PLAN LİSTESİ */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 mb-8">
        {planlar.length === 0 && !isAdding && (
          <div className="col-span-full p-12 text-center text-zinc-500 italic bg-[#0f0f11] rounded-2xl border border-zinc-800">
            Henüz planlanmış bir imalat bulunmuyor.
          </div>
        )}

        {planlar.map((plan: any) => (
          <div key={plan.id} className="bg-[#0f0f11] border border-zinc-800 rounded-2xl p-5 shadow-xl hover:border-zinc-700 transition-colors flex flex-col justify-between">
             <div>
               <div className="flex justify-between items-start mb-3">
                 <h2 className="text-lg font-bold text-zinc-100">{plan.is_adi}</h2>
                 <form action={silImalatPlani}><input type="hidden" name="id" value={plan.id} /><button className="text-zinc-600 hover:text-red-400" title="Sil">✕</button></form>
               </div>
               <div className="text-xs font-bold text-blue-400 mb-1">{plan.malzeme_adi} <span className="text-zinc-500 font-normal">({plan.cap})</span></div>
               
               <div className="grid grid-cols-2 gap-y-3 gap-x-2 mt-4">
                 <div><span className="text-[10px] text-zinc-500 block">Miktar</span><span className="font-mono text-sm text-zinc-300 font-bold">{plan.miktar} {plan.birim}</span></div>
                 <div><span className="text-[10px] text-zinc-500 block">Zorluk Sınıfı</span><span className="text-[11px] text-amber-400 font-bold">{plan.zorluk_ad}</span></div>
                 <div><span className="text-[10px] text-zinc-500 block">Ekip</span><span className="text-sm font-bold text-zinc-300">{plan.adam_sayisi} Kişi</span></div>
                 <div><span className="text-[10px] text-zinc-500 block">Toplam Efor</span><span className="font-mono text-xs text-zinc-400">{plan.toplam_adam_saat} A/S</span></div>
               </div>
             </div>
             
             <div className="mt-5 pt-4 border-t border-zinc-800/50 flex justify-between items-center bg-zinc-950/50 -mx-5 -mb-5 p-5 rounded-b-2xl">
               <div className="flex flex-col">
                 <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Başlangıç</span>
                 <span className="font-mono text-sm text-zinc-300">{plan.baslangic_tarihi.split('-').reverse().join('.')}</span>
               </div>
               <div className="text-zinc-600">→</div>
               <div className="flex flex-col text-right">
                 <span className="text-[10px] text-emerald-500 uppercase tracking-widest font-bold">Öngörülen Bitiş</span>
                 <span className="font-mono text-lg font-bold text-emerald-400">{plan.ongorulen_bitis.split('-').reverse().join('.')}</span>
               </div>
             </div>
          </div>
        ))}
      </div>

      {/* YENİ PLAN EKLEME FORMU */}
      {isAdding && (
        <div className="bg-[#131316] border-2 border-blue-500/50 rounded-2xl p-6 shadow-[0_0_30px_rgba(37,99,235,0.15)] relative mb-8 flex gap-8">
           
           {/* SOL: Girdi Formu */}
           <div className="flex-1 flex flex-col gap-5 border-r border-zinc-800/50 pr-8">
             <h3 className="text-sm font-bold text-blue-400 uppercase tracking-widest">Yeni İmalat Planı</h3>
             
             <div>
               <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold block mb-1.5">İş / Plan Adı</label>
               <input type="text" placeholder="Örn: 3. Kat Atıksu Kolon İnişi" value={form.is_adi} onChange={e => setForm({...form, is_adi: e.target.value})} className="w-full bg-[#18181b] border border-zinc-700 focus:border-blue-500 rounded-lg p-2.5 text-sm text-white outline-none transition-colors" />
             </div>

             <div className="relative">
               <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold block mb-1.5">Adam/Saat Veritabanından Malzeme Seç</label>
               <input 
                 type="text" placeholder="Arama yapın..." value={form.malzeme_secim} 
                 onChange={e => { setForm({...form, malzeme_secim: e.target.value}); setShowAuto(true); }}
                 onFocus={() => setShowAuto(true)} onBlur={() => setTimeout(() => setShowAuto(false), 200)}
                 className="w-full bg-[#18181b] border border-zinc-700 focus:border-blue-500 rounded-lg p-2.5 text-sm text-white outline-none transition-colors"
               />
               {showAuto && (
                  <ul className="absolute z-50 left-0 right-0 mt-1 bg-[#18181b] border border-zinc-700 rounded-lg shadow-2xl max-h-48 overflow-y-auto custom-scrollbar">
                    {adamSaatVerileri.filter((a:any) => `${a.malzeme_adi} ${a.cap}`.toLowerCase().includes(form.malzeme_secim.toLowerCase())).map((a:any, i:number) => {
                      // Depo Stok Kontrolü
                      const stok = depoStokDurumu.find((d:any) => d.ad === a.malzeme_adi && d.cap === a.cap)?.kalan || 0;
                      return (
                        <li 
                          key={i} 
                          onMouseDown={() => { 
                            setForm({...form, malzeme_secim: `${a.malzeme_adi} - ${a.cap}`, adam_sayisi: a.gerekli_adam.toString()}); 
                            setSelectedAdamSaat(a);
                            setShowAuto(false); 
                          }} 
                          className="px-4 py-2.5 text-zinc-300 hover:bg-zinc-800 cursor-pointer text-xs border-b border-zinc-800/50 flex justify-between items-center transition-colors"
                        >
                          <div><span className="font-bold">{a.malzeme_adi}</span> <span className="text-blue-400 font-mono">({a.cap})</span></div>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${stok > 0 ? 'bg-emerald-950/40 text-emerald-500 border border-emerald-900/50' : 'bg-zinc-900 text-zinc-600 border border-zinc-800'}`}>
                            {stok > 0 ? `🟢 Stok: ${stok}` : '⚪ Depoda Yok'}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
               )}
             </div>

             <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold block mb-1.5">Miktar {selectedAdamSaat ? `(${selectedAdamSaat.birim})` : ''}</label>
                  <input type="number" step="any" placeholder="0" value={form.miktar} onChange={e => setForm({...form, miktar: e.target.value})} className="w-full bg-[#18181b] border border-zinc-700 focus:border-blue-500 rounded-lg p-2.5 text-sm text-white outline-none transition-colors" />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold block mb-1.5">Atanan Ekip (Kişi)</label>
                  <input type="number" placeholder="Örn: 2" value={form.adam_sayisi} onChange={e => setForm({...form, adam_sayisi: e.target.value})} className="w-full bg-[#18181b] border border-zinc-700 focus:border-blue-500 rounded-lg p-2.5 text-sm text-white outline-none transition-colors" />
                </div>
             </div>

             <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold block mb-1.5">Konum / İş Zorluğu</label>
                  <select value={form.zorluk} onChange={e => setForm({...form, zorluk: parseFloat(e.target.value)})} className="w-full bg-[#18181b] border border-zinc-700 focus:border-blue-500 rounded-lg p-2.5 text-xs text-white outline-none transition-colors">
                    {ZORLUK_DERECELERI.map((z, i) => <option key={i} value={z.carpan}>{z.ad} ({z.carpan}x)</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold block mb-1.5">Başlangıç Tarihi</label>
                  <input type="date" value={form.baslangic_tarihi} onChange={e => setForm({...form, baslangic_tarihi: e.target.value})} className="w-full bg-[#18181b] border border-zinc-700 focus:border-blue-500 rounded-lg p-2 text-sm text-zinc-300 outline-none transition-colors [color-scheme:dark]" />
                </div>
             </div>
             
             {/* Özel Override Butonu */}
             <div>
                <button onClick={() => setForm({...form, useCustomOverride: !form.useCustomOverride})} className="text-[10px] text-zinc-500 hover:text-blue-400 font-bold underline underline-offset-2 transition-colors">
                  {form.useCustomOverride ? '▼ Özel Mesai Ayarını Kapat' : '▶ Bu İşe Özel Mesai Ayarla (Opsiyonel)'}
                </button>
                {form.useCustomOverride && (
                  <div className="mt-3 flex gap-3 p-3 bg-zinc-900/50 rounded-lg border border-zinc-800">
                    <input type="number" placeholder="Gün / Hafta" value={form.customGun} onChange={e => setForm({...form, customGun: e.target.value})} className="flex-1 bg-[#18181b] border border-zinc-700 rounded-md p-1.5 text-xs text-white outline-none" title="Haftalık Çalışma Günü"/>
                    <input type="number" step="0.5" placeholder="Saat / Gün" value={form.customSaat} onChange={e => setForm({...form, customSaat: e.target.value})} className="flex-1 bg-[#18181b] border border-zinc-700 rounded-md p-1.5 text-xs text-white outline-none" title="Günlük Mesai Saati"/>
                  </div>
                )}
             </div>
           </div>

           {/* SAĞ: Canlı Sonuç Ekranı */}
           <div className="w-[350px] flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-emerald-500 uppercase tracking-widest mb-6">Planlama Sonucu</h3>
                {hesaplananDegerler ? (
                  <div className="flex flex-col gap-6">
                    <div className="bg-emerald-950/20 border border-emerald-900/50 p-4 rounded-xl">
                      <div className="text-[10px] text-emerald-600 uppercase tracking-widest font-bold mb-1">Öngörülen Bitiş Tarihi</div>
                      <div className="text-3xl font-bold text-emerald-400 font-mono">{hesaplananDegerler.bitisTarihi.split('-').reverse().join('.')}</div>
                    </div>
                    <div className="flex justify-between items-end border-b border-zinc-800 pb-3">
                      <span className="text-xs text-zinc-500 font-bold">Fiili Çalışma Süresi</span>
                      <span className="text-lg text-zinc-300 font-mono font-bold">{hesaplananDegerler.fiiliGun} Gün</span>
                    </div>
                    <div className="flex justify-between items-end border-b border-zinc-800 pb-3">
                      <span className="text-xs text-zinc-500 font-bold">Toplam Efor</span>
                      <span className="text-lg text-amber-400 font-mono font-bold">{hesaplananDegerler.toplamAdamSaat} A/S</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-zinc-600 text-xs italic flex items-center justify-center h-48 bg-zinc-900/30 rounded-xl border border-zinc-800/50">
                    Sonucu görmek için formu doldurun...
                  </div>
                )}
              </div>
              
              <div className="flex gap-2 mt-6">
                <button onClick={() => setIsAdding(false)} className="bg-[#18181b] hover:bg-zinc-800 text-zinc-300 px-5 py-3 rounded-xl text-xs font-bold transition-colors">İptal</button>
                <button onClick={handleSavePlan} disabled={loading || !hesaplananDegerler} className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white rounded-xl text-xs font-bold tracking-widest transition-colors shadow-lg shadow-emerald-900/20">
                  {loading ? 'KAYDEDİLİYOR...' : 'PLANI ONAYLA'}
                </button>
              </div>
           </div>
        </div>
      )}

      {!isAdding && (
        <div className="mt-2 flex justify-center">
          <button onClick={() => setIsAdding(true)} className="flex items-center gap-2 px-8 py-3 bg-[#131316] hover:bg-[#18181b] border border-zinc-800 hover:border-blue-500/50 text-zinc-400 hover:text-blue-400 text-xs font-bold tracking-widest uppercase rounded-2xl transition-all shadow-lg hover:shadow-[0_0_20px_rgba(37,99,235,0.15)]">
            ➕ YENİ İMALAT PLANI OLUŞTUR
          </button>
        </div>
      )}

    </div>
  );
}