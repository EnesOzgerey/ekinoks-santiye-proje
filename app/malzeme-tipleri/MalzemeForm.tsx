"use client";

import { useState } from "react";

export default function MalzemeForm() {
  const [cins, setCins] = useState("");
  const [birim, setBirim] = useState("");
  const [uretici, setUretici] = useState("");
  const [durum, setDurum] = useState("");
  
  // Çoklu satır mantığını yöneten state
  const [standartlar, setStandartlar] = useState([{ ozellik: "" }]);

  const standartEkle = () => {
    setStandartlar([...standartlar, { ozellik: "" }]);
  };

  const standartSil = (index: number) => {
    const yeniStandartlar = [...standartlar];
    yeniStandartlar.splice(index, 1);
    setStandartlar(yeniStandartlar);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Burada API'ye veya Server Action'a gönderme işlemi yapılacak
    // Hazırlanan veri şuna benzeyecek: { cins, birim, uretici, durum, standartlar }
    console.log("Kaydedilecek Veriler:", { cins, birim, uretici, durum, standartlar });
  };

  return (
    <div className="bg-[#1e222d] border border-gray-800 rounded-lg p-6 mb-8 shadow-lg text-sm text-gray-300">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        
        {/* Üst Satır: Eski Kaybolan Ana Bilgiler */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="flex flex-col">
            <label className="mb-1 text-xs font-semibold text-gray-400 uppercase">Malzeme Cinsi</label>
            <input 
              type="text" 
              placeholder="Örn: Siyah Çelik Boru" 
              value={cins}
              onChange={(e) => setCins(e.target.value)}
              className="bg-[#14171f] border border-gray-700 rounded p-2 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="flex flex-col">
            <label className="mb-1 text-xs font-semibold text-gray-400 uppercase">Birim</label>
            <input 
              type="text" 
              placeholder="Örn: mt, Adet" 
              value={birim}
              onChange={(e) => setBirim(e.target.value)}
              className="bg-[#14171f] border border-gray-700 rounded p-2 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="flex flex-col">
            <label className="mb-1 text-xs font-semibold text-gray-400 uppercase">Üretici</label>
            <input 
              type="text" 
              placeholder="Örn: Borusan, Duyar" 
              value={uretici}
              onChange={(e) => setUretici(e.target.value)}
              className="bg-[#14171f] border border-gray-700 rounded p-2 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="flex flex-col">
            <label className="mb-1 text-xs font-semibold text-gray-400 uppercase">Durum</label>
            <input 
              type="text" 
              placeholder="Örn: Sipariş Verildi, Şantiyede" 
              value={durum}
              onChange={(e) => setDurum(e.target.value)}
              className="bg-[#14171f] border border-gray-700 rounded p-2 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Alt Satır: Artı Butonuyla Açılan Dinamik Standartlar */}
        <div className="mt-4 border-t border-gray-700 pt-4">
          <label className="mb-2 block text-xs font-semibold text-gray-400 uppercase">Standartlar / Özellikler</label>
          <div className="flex flex-col gap-2">
            {standartlar.map((standart, index) => (
              <div key={index} className="flex gap-2 items-center">
                <input 
                  type="text" 
                  placeholder="Örn: DN50, PN16 veya TS EN 10255" 
                  value={standart.ozellik}
                  onChange={(e) => {
                    const yeni = [...standartlar];
                    yeni[index].ozellik = e.target.value;
                    setStandartlar(yeni);
                  }}
                  className="bg-[#14171f] border border-gray-700 rounded p-2 flex-grow focus:outline-none focus:border-blue-500"
                />
                {/* Yalnızca birden fazla satır varsa Sil butonu görünür */}
                {standartlar.length > 1 && (
                  <button 
                    type="button" 
                    onClick={() => standartSil(index)} 
                    className="bg-red-900/40 text-red-400 hover:bg-red-900/60 border border-red-800/50 px-4 py-2 rounded transition-colors font-medium"
                  >
                    Sil
                  </button>
                )}
              </div>
            ))}
            <button 
              type="button" 
              onClick={standartEkle} 
              className="self-start mt-2 bg-blue-900/30 text-blue-400 hover:bg-blue-900/50 px-4 py-2 rounded border border-blue-800/50 transition-colors text-sm font-medium"
            >
              + Yeni Standart Ekle
            </button>
          </div>
        </div>

        {/* Butonlar */}
        <div className="flex justify-end gap-3 mt-4">
          <button type="button" className="bg-transparent border border-gray-600 text-gray-300 px-6 py-2 rounded hover:bg-gray-700 transition-colors font-medium">
            İptal
          </button>
          <button type="submit" className="bg-[#2563eb] hover:bg-blue-600 text-white px-6 py-2 rounded font-medium transition-colors shadow-sm">
            Kaydet
          </button>
        </div>
      </form>
    </div>
  );
}   