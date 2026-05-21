'use client';

import { useState } from 'react';
import { ekleBelgeliUretici } from './actions';

export default function UreticiForm({ cinsler }: { cinsler: any[] }) {
  const [loading, setLoading] = useState(false);
  const [certs, setCerts] = useState([{ id: Date.now() }]);

  const addCertBlock = () => {
    setCerts([...certs, { id: Date.now() }]);
  };

  const removeCertBlock = (id: number) => {
    if (certs.length > 1) {
      setCerts(certs.filter((c) => c.id !== id));
    }
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget; 
    const formData = new FormData(form);
    
    try {
      setLoading(true);
      await ekleBelgeliUretici(formData);
      form.reset(); 
      setCerts([{ id: Date.now() }]); 
    } catch (err: any) {
      alert('İşlem Hatası: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-3 p-3 bg-neutral-50 rounded border border-neutral-100">
        <div>
          <label className="block text-[11px] text-neutral-500 font-bold mb-0.5">MALZEME CİNSİ *</label>
          <select name="cins_id" required defaultValue="" className="w-full px-3 py-1.5 border border-neutral-200 bg-white rounded-md text-sm focus:outline-none focus:border-neutral-900">
            <option value="" disabled>Seçiniz...</option>
            {cinsler.map((cins) => (
              <option key={cins.id} value={cins.id}>{cins.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] text-neutral-500 font-bold mb-0.5">BELGE SAHİBİ / MARKA *</label>
          <input type="text" name="company_name" required placeholder="Örn: KALDE KLİMA A.Ş." className="w-full px-3 py-1.5 border border-neutral-200 rounded-md text-sm focus:outline-none focus:border-neutral-900" />
        </div>
      </div>

      <div className="space-y-3">
        <label className="block text-xs text-neutral-900 font-bold uppercase border-b pb-1">Standartlar ve Belgeler</label>
        
        {certs.map((cert) => (
          <div key={cert.id} className="relative p-3 bg-white border border-neutral-200 rounded-md shadow-sm space-y-3">
            {certs.length > 1 && (
              <button 
                type="button" 
                onClick={() => removeCertBlock(cert.id)} 
                className="absolute -top-2 -right-2 bg-red-100 text-red-600 hover:bg-red-600 hover:text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold transition"
              >
                ×
              </button>
            )}
            
            <div>
              <label className="block text-[10px] text-neutral-400 font-semibold mb-0.5 uppercase">Standart</label>
              <input type="text" name="standart" placeholder="Örn: TS EN 1329-1" className="w-full px-2 py-1.5 border border-neutral-200 rounded text-sm focus:outline-none" />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] text-neutral-400 font-semibold mb-0.5 uppercase">Belge No</label>
                <input type="text" name="belge_no" placeholder="009649-TSE" className="w-full px-2 py-1.5 border border-neutral-200 rounded text-sm" />
              </div>
              <div>
                <label className="block text-[10px] text-neutral-400 font-semibold mb-0.5 uppercase">Geçerlilik</label>
                <input type="date" name="expiry_date" className="w-full px-2 py-1.5 border border-neutral-200 rounded text-sm" />
              </div>
            </div>

            <div>
              <label className="block text-[10px] text-neutral-400 font-semibold mb-0.5 uppercase">Teknik Katalog</label>
              <input type="file" name="catalog" accept=".pdf,image/*" className="w-full text-[11px] text-neutral-500 cursor-pointer file:mr-2 file:py-1 file:px-2 file:border-0 file:rounded file:bg-neutral-100 file:text-neutral-700 hover:file:bg-neutral-200" />
            </div>
          </div>
        ))}

        <button 
          type="button" 
          onClick={addCertBlock}
          className="w-full py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded border-dashed transition cursor-pointer"
        >
          + Yeni Standart/Belge Ekle
        </button>
      </div>

      <button 
        type="submit" 
        disabled={loading}
        className="w-full py-2.5 text-sm font-semibold bg-neutral-900 hover:bg-neutral-800 text-white rounded-md shadow transition disabled:bg-neutral-400 cursor-pointer"
      >
        {loading ? 'Sisteme İşleniyor...' : 'Belgeli Üreticiyi Kaydet'}
      </button>
    </form>
  );
}