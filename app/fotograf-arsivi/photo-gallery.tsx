'use client'; // Bu sayede useState ve onClick fonksiyonlarını güvenle kullanabiliriz

import { useState } from 'react';

interface Photo {
  id: number;
  job_id: number;
  job_name: string;
  upload_date: string;
  description: string;
  file_path: string;
}

interface Job {
  id: number;
  name: string;
}

export default function PhotoGallery({ photos, jobs }: { photos: Photo[]; jobs: Job[] }) {
  // Filtreleme State'leri
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  
  // Büyütülen Fotoğraf State'i (Lightbox)
  const [activePhoto, setActivePhoto] = useState<Photo | null>(null);

  // Filtreleme Mantığı
  const filteredPhotos = photos.filter((photo) => {
    const matchesJob = selectedJobId === '' || photo.job_id.toString() === selectedJobId;
    const matchesDate = selectedDate === '' || photo.upload_date.startsWith(selectedDate);
    return matchesJob && matchesDate;
  });

  return (
    <div className="space-y-6">
      
      {/* MİNİMALİST FİLTRELEME BARBARI */}
      <div className="p-4 bg-white rounded-lg border border-neutral-200 shadow-sm flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-medium text-neutral-500 mb-1">İşe Göre Filtrele</label>
          <select
            value={selectedJobId}
            onChange={(e) => setSelectedJobId(e.target.value)}
            className="w-full px-3 py-1.5 border border-neutral-200 bg-white rounded-md text-sm focus:outline-none focus:border-neutral-900"
          >
            <option value="">Tüm İşler</option>
            {jobs.map((job) => (
              <option key={job.id} value={job.id}>{job.name}</option>
            ))}
          </select>
        </div>

        <div className="w-48">
          <label className="block text-xs font-medium text-neutral-500 mb-1">Tarihe Göre Filtrele</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full px-3 py-1.5 border border-neutral-200 rounded-md text-sm focus:outline-none focus:border-neutral-900"
          />
        </div>

        {(selectedJobId || selectedDate) && (
          <button
            onClick={() => { setSelectedJobId(''); setSelectedDate(''); }}
            className="text-xs font-medium text-neutral-500 hover:text-neutral-900 underline pb-2"
          >
            Filtreleri Temizle
          </button>
        )}
      </div>

      {/* FOTOĞRAF GRID LİSTESİ */}
      {filteredPhotos.length === 0 ? (
        <p className="text-sm text-neutral-400 py-8 text-center bg-white rounded-lg border border-neutral-200">Aranan kriterlere uygun fotoğraf bulunamadı.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredPhotos.map((photo) => (
            <div key={photo.id} className="bg-white rounded-lg border border-neutral-200 shadow-sm overflow-hidden group flex flex-col justify-between">
              
              {/* Fotoğraf Alanı (Tıklayınca Büyür) */}
              <div className="relative aspect-[4/3] bg-neutral-100 cursor-zoom-in overflow-hidden" onClick={() => setActivePhoto(photo)}>
                <img
                  src={photo.file_path}
                  alt={photo.description}
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                />
              </div>

              {/* Bilgi Alanı */}
              <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                <div>
                  <span className="inline-block px-2 py-0.5 text-[11px] font-medium bg-neutral-100 text-neutral-800 rounded">
                    {photo.job_name}
                  </span>
                  <p className="text-xs text-neutral-400 font-mono mt-1">{photo.upload_date}</p>
                  {photo.description && (
                    <p className="text-sm text-neutral-600 mt-2 line-clamp-2 whitespace-pre-line">{photo.description}</p>
                  )}
                </div>

                {/* İndirme Butonu */}
                <div className="pt-3 border-t border-neutral-100 flex justify-end">
                  <a
                    href={photo.file_path}
                    download={`santiye-${photo.id}.jpg`}
                    className="text-xs font-semibold text-neutral-600 hover:text-neutral-900 flex items-center gap-1 transition"
                  >
                    📥 İndir
                  </a>
                </div>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* LIGHTBOX MODAL (FOTOĞRAFA TIKLAYINCA AÇILAN BÜYÜK EKRAN) */}
      {activePhoto && (
        <div 
          className="fixed inset-0 bg-black/80 z-50 flex flex-col items-center justify-center p-4 cursor-zoom-out animate-fade-in"
          onClick={() => setActivePhoto(null)}
        >
          <div className="max-w-4xl max-h-[80vh] relative" onClick={(e) => e.stopPropagation()}>
            <img src={activePhoto.file_path} alt="" className="max-w-full max-h-[85vh] rounded shadow-2xl object-contain" />
            <button 
              className="absolute -top-10 right-0 text-white hover:text-neutral-300 text-sm font-medium"
              onClick={() => setActivePhoto(null)}
            >
              ✕ Kapat
            </button>
          </div>
          
          <div className="mt-4 text-center text-white max-w-xl" onClick={(e) => e.stopPropagation()}>
            <h4 className="text-md font-semibold">{activePhoto.job_name}</h4>
            <p className="text-xs text-neutral-400 font-mono mt-0.5">{activePhoto.upload_date}</p>
            <p className="text-sm text-neutral-300 mt-2 bg-black/40 px-4 py-2 rounded">{activePhoto.description || 'Açıklama yok.'}</p>
          </div>
        </div>
      )}

    </div>
  );
}