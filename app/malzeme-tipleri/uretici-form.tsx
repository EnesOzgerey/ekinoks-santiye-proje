'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { kaydetBelgeliUretici } from './actions';

export default function UreticiForm({ cinsler, editData }: { cinsler: any[], editData?: any }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [cinsName, setCinsName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [certs, setCerts] = useState<any[]>([{ id: Date.now() }]);
  
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredCinsler, setFilteredCinsler] = useState<any[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editData) {
      setIsOpen(true);
      setCinsName(editData.cins_name || '');
      setCompanyName(editData.company_name || '');
      try {
        const parsed = JSON.parse(editData.certificates || '[]');
        if (parsed.length > 0) {
          setCerts(parsed.map((c: any, i: number) => ({ ...c, id: Date.now() + i })));
        } else {
          setCerts([{ id: Date.now() }]);
        }
      } catch {
        setCerts([{ id: Date.now() }]);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setIsOpen(false);
      setCinsName('');
      setCompanyName('');
      setCerts([{ id: Date.now() }]);
    }
  }, [editData]);

  useEffect(() => {
    if (cinsName.trim() === '') {
      setFilteredCinsler([]);
      setActiveIndex(-1);
    } else {
      setFilteredCinsler(cinsler.filter(c => c.name.toLowerCase().includes(cinsName.toLowerCase())));
      setActiveIndex(-1);
    }
  }, [cinsName, cinsler]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || filteredCinsler.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex(p => p < filteredCinsler.length - 1 ? p + 1 : p); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex(p => p > 0 ? p - 1 : -1); }
    else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault(); 
      setCinsName(filteredCinsler[activeIndex].name);
      setShowSuggestions(false);
    }
  };

  const handleReset = () => {
    setCinsName('');
    setCompanyName('');
    setCerts([{ id: Date.now() }]);
    setIsOpen(false);
    router.push('/malzeme-tipleri'); 
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    try {
      setLoading(true);
      await kaydetBelgeliUretici(formData);
      handleReset(); 
    } catch (err: any) {
      alert('İşlem Hatası: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="print:hidden">
      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)}
          className="px-5 py-2.5 text-sm font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded-lg transition-colors flex items-center gap-2 border border-zinc-700 shadow-sm cursor-pointer"
        >
          <span className="text-lg leading-none mb-0.5">+</span> Yeni Üretici / Belge Ekle
        </button>
      )}

      {isOpen && (
        <div className="bg-zinc-900 border border-zinc-800/80 rounded-xl overflow-hidden mt-4 shadow-2xl">
          <div className="px-6 py-4 border-b border-zinc-800/80 flex justify-between items-center bg-zinc-950/30">
            <h3 className="font-semibold text-zinc-100">
              {editData ? 'Üreticiyi Düzenle' : 'Yeni Üretici Ekle'}
            </h3>
            <button onClick={handleReset} className="text-zinc-500 hover:text-zinc-300 text-2xl leading-none transition-colors cursor-pointer">&times;</button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {editData && <input type="hidden" name="id" value={editData.id} />}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div ref={wrapperRef} className="relative">
                <label className="block text-[10px] text-zinc-400 font-bold mb-2 uppercase tracking-wider">Malzeme Cinsi *</label>
                <input 
                  type="text" name="cins_name" required autoComplete="off"
                  value={cinsName}
                  onChange={(e) => { setCinsName(e.target.value); setShowSuggestions(true); }}
                  onFocus={() => setShowSuggestions(true)}
                  onKeyDown={handleKeyDown}
                  placeholder="Seçebilir veya yeni yazabilirsiniz..." 
                  className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-200 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 transition-all placeholder:text-zinc-600" 
                />
                {showSuggestions && filteredCinsler.length > 0 && (
                  <ul className="absolute z-20 w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl max-h-48 overflow-auto py-1">
                    {filteredCinsler.map((cins, index) => (
                      <li key={cins.id} onMouseEnter={() => setActiveIndex(index)} onClick={() => { setCinsName(cins.name); setShowSuggestions(false); }} className={`px-4 py-2 text-sm cursor-pointer transition-colors ${index === activeIndex ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-300 hover:bg-zinc-700 hover:text-zinc-100'}`}>{cins.name}</li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <label className="block text-[10px] text-zinc-400 font-bold mb-2 uppercase tracking-wider">Belge Sahibi / Marka *</label>
                <input 
                  type="text" name="company_name" required value={companyName} onChange={e => setCompanyName(e.target.value)}
                  placeholder="Örn: KALDE KLİMA A.Ş." 
                  className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-200 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 transition-all placeholder:text-zinc-600" 
                />
              </div>

              {editData && (
                <div className="md:col-span-2 pt-4 border-t border-zinc-800/50 mt-2">
                  <label className="block text-[10px] text-zinc-400 font-bold mb-2 uppercase tracking-wider">Onay Durumu</label>
                  <select 
                    name="status" 
                    defaultValue={editData.status || 'Onay Bekliyor'} 
                    className="w-full md:w-1/2 px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-200 focus:outline-none focus:border-zinc-600 transition-all cursor-pointer"
                  >
                    <option value="Sunulmadı">📝 Sunulmadı</option>
                    <option value="Onay Bekliyor">⏳ Onay Bekliyor</option>
                    <option value="Onaylandı">✅ Onaylandı</option>
                    <option value="Reddedildi">❌ Reddedildi</option>
                  </select>
                </div>
              )}
            </div>

            <div className="space-y-4 pt-4 border-t border-zinc-800/50">
              <label className="block text-sm text-zinc-300 font-semibold">Standartlar ve Belgeler</label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {certs.map((cert) => (
                  <div key={cert.id} className="relative p-5 bg-zinc-950 border border-zinc-800 rounded-xl space-y-4 group hover:border-zinc-700 transition-colors">
                    {certs.length > 1 && (
                      <button type="button" onClick={() => setCerts(certs.filter((c) => c.id !== cert.id))} className="absolute top-3 right-3 text-zinc-600 hover:text-red-500 text-lg leading-none opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">&times;</button>
                    )}
                    
                    <input type="hidden" name="existing_catalog_path" value={cert.catalog_path || ''} />

                    <div>
                      <label className="block text-[10px] text-zinc-500 font-bold mb-1.5 uppercase tracking-wider">Standart</label>
                      <input type="text" name="standart" defaultValue={cert.standart !== '-' ? cert.standart : ''} placeholder="Örn: TS EN 1329-1" className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-md text-sm text-zinc-300 focus:outline-none focus:border-zinc-600 placeholder:text-zinc-700" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] text-zinc-500 font-bold mb-1.5 uppercase tracking-wider">Belge No</label>
                        <input type="text" name="belge_no" defaultValue={cert.belge_no !== '-' ? cert.belge_no : ''} placeholder="009649-TSE" className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-md text-sm text-zinc-300 focus:outline-none focus:border-zinc-600 placeholder:text-zinc-700" />
                      </div>
                      <div>
                        <label className="block text-[10px] text-zinc-500 font-bold mb-1.5 uppercase tracking-wider">Geçerlilik</label>
                        <input type="date" name="expiry_date" defaultValue={cert.expiry_date !== '-' ? cert.expiry_date : ''} className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-md text-sm text-zinc-400 focus:outline-none focus:border-zinc-600 [color-scheme:dark]" />
                      </div>
                    </div>
                    <div className="pt-1">
                      <label className="block text-[10px] text-zinc-500 font-bold mb-2 uppercase tracking-wider">
                        {cert.catalog_path ? 'YENİ KATALOG (Eskisi Mevcut)' : 'TEKNİK KATALOG YÜKLE'}
                      </label>
                      <input type="file" name="catalog" accept=".pdf,image/*" className="w-full text-xs text-zinc-400 file:mr-3 file:py-1.5 file:px-3 file:border-0 file:rounded-md file:font-medium file:bg-zinc-800 file:text-zinc-200 hover:file:bg-zinc-700 cursor-pointer transition-colors" />
                    </div>
                  </div>
                ))}
                
                <button type="button" onClick={() => setCerts([...certs, { id: Date.now() }])} className="min-h-[200px] p-4 text-sm font-medium text-zinc-500 hover:text-zinc-300 bg-zinc-950/50 hover:bg-zinc-900 border border-zinc-800 rounded-xl border-dashed hover:border-zinc-600 transition-colors flex flex-col items-center justify-center gap-3 cursor-pointer">
                  <span className="text-2xl font-light leading-none">+</span>
                  <span>Yeni Standart Ekle</span>
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-zinc-800/50">
              <button type="button" onClick={handleReset} className="px-6 py-2.5 text-sm font-medium text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer">İptal</button>
              <button type="submit" disabled={loading} className="px-8 py-2.5 text-sm font-bold bg-zinc-100 hover:bg-white text-zinc-950 rounded-lg shadow-lg transition-all disabled:opacity-50 cursor-pointer">
                {loading ? 'İşleniyor...' : (editData ? 'Güncellemeyi Kaydet' : 'Sisteme Kaydet')}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}