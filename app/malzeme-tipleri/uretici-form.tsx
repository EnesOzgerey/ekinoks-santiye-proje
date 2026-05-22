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

  // --- DÜZENLEME MODU KONTROLÜ ---
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
      // Yönlendirme YAPMADAN formu sessizce sıfırla
      setIsOpen(false);
      setCinsName('');
      setCompanyName('');
      setCerts([{ id: Date.now() }]);
    }
  }, [editData]);

  // Arama filtresi
  useEffect(() => {
    if (cinsName.trim() === '') {
      setFilteredCinsler([]);
      setActiveIndex(-1);
    } else {
      setFilteredCinsler(cinsler.filter(c => c.name.toLowerCase().includes(cinsName.toLowerCase())));
      setActiveIndex(-1);
    }
  }, [cinsName, cinsler]);

  // Dışarı tıklama kontrolü
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
    router.push('/malzeme-tipleri'); // URL'yi temizle
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    try {
      setLoading(true);
      await kaydetBelgeliUretici(formData);
      handleReset(); // İşlem bitince formu kapat ve URL'yi temizle
    } catch (err: any) {
      alert('İşlem Hatası: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mb-6 print:hidden">
      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)}
          className="w-full md:w-auto px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white text-sm font-semibold rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>➕</span> Yeni Üretici / Belge Ekle
        </button>
      )}

      {isOpen && (
        <div className="bg-white rounded-xl border border-neutral-200 shadow-xl overflow-hidden transition-all duration-300 ease-in-out mt-2">
          <div className="bg-neutral-50 px-5 py-4 border-b border-neutral-200 flex justify-between items-center">
            <h3 className="font-bold text-neutral-800">
              {editData ? '✏️ Üreticiyi Düzenle' : '➕ Yeni Üretici Ekle'}
            </h3>
            <button onClick={handleReset} className="text-neutral-400 hover:text-neutral-600 text-xl font-bold leading-none cursor-pointer">&times;</button>
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-6">
            {editData && <input type="hidden" name="id" value={editData.id} />}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div ref={wrapperRef} className="relative">
                <label className="block text-xs text-neutral-500 font-bold mb-1.5 uppercase tracking-wide">Malzeme Cinsi *</label>
                <input 
                  type="text" name="cins_name" required autoComplete="off"
                  value={cinsName}
                  onChange={(e) => { setCinsName(e.target.value); setShowSuggestions(true); }}
                  onFocus={() => setShowSuggestions(true)}
                  onKeyDown={handleKeyDown}
                  placeholder="Seçebilir veya yeni yazabilirsiniz" 
                  className="w-full px-4 py-2.5 border border-neutral-200 bg-neutral-50/50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" 
                />
                {showSuggestions && filteredCinsler.length > 0 && (
                  <ul className="absolute z-20 w-full mt-1 bg-white border border-neutral-200 rounded-lg shadow-xl max-h-48 overflow-auto">
                    {filteredCinsler.map((cins, index) => (
                      <li key={cins.id} onMouseEnter={() => setActiveIndex(index)} onClick={() => { setCinsName(cins.name); setShowSuggestions(false); }} className={`px-4 py-2.5 text-sm cursor-pointer transition-colors ${index === activeIndex ? 'bg-blue-50 text-blue-700' : 'text-neutral-700 hover:bg-neutral-50'}`}>{cins.name}</li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <label className="block text-xs text-neutral-500 font-bold mb-1.5 uppercase tracking-wide">Belge Sahibi / Marka *</label>
                <input 
                  type="text" name="company_name" required value={companyName} onChange={e => setCompanyName(e.target.value)}
                  placeholder="Örn: KALDE KLİMA A.Ş." 
                  className="w-full px-4 py-2.5 border border-neutral-200 bg-neutral-50/50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" 
                />
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-neutral-100">
              <label className="block text-sm text-neutral-800 font-bold">Standartlar ve Belgeler</label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {certs.map((cert) => (
                  <div key={cert.id} className="relative p-4 bg-neutral-50 border border-neutral-200 rounded-xl space-y-3 shadow-sm group">
                    {certs.length > 1 && (
                      <button type="button" onClick={() => setCerts(certs.filter((c) => c.id !== cert.id))} className="absolute -top-2 -right-2 bg-white border border-red-200 text-red-500 hover:bg-red-500 hover:text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold shadow-sm transition-colors cursor-pointer opacity-0 group-hover:opacity-100">&times;</button>
                    )}
                    
                    <input type="hidden" name="existing_catalog_path" value={cert.catalog_path || ''} />

                    <div>
                      <label className="block text-[10px] text-neutral-500 font-bold mb-1 uppercase">Standart</label>
                      <input type="text" name="standart" defaultValue={cert.standart !== '-' ? cert.standart : ''} placeholder="Örn: TS EN 1329-1" className="w-full px-3 py-2 border border-neutral-200 rounded text-sm focus:outline-none focus:border-neutral-400" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] text-neutral-500 font-bold mb-1 uppercase">Belge No</label>
                        <input type="text" name="belge_no" defaultValue={cert.belge_no !== '-' ? cert.belge_no : ''} placeholder="009649-TSE" className="w-full px-3 py-2 border border-neutral-200 rounded text-sm focus:outline-none focus:border-neutral-400" />
                      </div>
                      <div>
                        <label className="block text-[10px] text-neutral-500 font-bold mb-1 uppercase">Geçerlilik</label>
                        <input type="date" name="expiry_date" defaultValue={cert.expiry_date !== '-' ? cert.expiry_date : ''} className="w-full px-3 py-2 border border-neutral-200 rounded text-sm focus:outline-none focus:border-neutral-400 text-neutral-700" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] text-neutral-500 font-bold mb-1 uppercase">
                        {cert.catalog_path ? 'Yeni Katalog Yükle (Eskisi Var)' : 'Teknik Katalog Yükle'}
                      </label>
                      <input type="file" name="catalog" accept=".pdf,image/*" className="w-full text-xs text-neutral-500 cursor-pointer file:mr-3 file:py-1.5 file:px-3 file:border-0 file:rounded-md file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-colors" />
                    </div>
                  </div>
                ))}
                
                <button type="button" onClick={() => setCerts([...certs, { id: Date.now() }])} className="min-h-[150px] p-4 text-sm font-semibold text-blue-600 bg-white hover:bg-blue-50 border-2 border-blue-100 rounded-xl border-dashed transition-colors flex flex-col items-center justify-center gap-2 cursor-pointer">
                  <span className="text-2xl leading-none">+</span>
                  <span>Yeni Standart Ekle</span>
                </button>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button type="button" onClick={handleReset} className="px-5 py-2.5 text-sm font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors cursor-pointer">İptal</button>
              <button type="submit" disabled={loading} className="flex-1 py-2.5 text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-70 cursor-pointer">
                {loading ? 'İşleniyor...' : (editData ? 'Güncellemeyi Kaydet' : 'Sisteme Kaydet')}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}