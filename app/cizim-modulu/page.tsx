"use client"; // BÜTÜN MESELE BURADA! Bu sayfanın tarayıcıda çalışacağını belirtiyoruz.

import dynamic from 'next/dynamic';

// Next.js bazen klasör adından index dosyasını otomatik bulamayabilir.
// Bu yüzden sonuna açıkça /index (veya dosyanın tam adını) ekliyoruz.
// Eğer Next.js kurulumunda "@" alias'ı seçtiysen yolu "@/modules/DrawingModule/index" olarak da yazabilirsin.
const DrawingModule = dynamic(() => import('../../modules/DrawingModule/index'), {
  ssr: false, 
  loading: () => <div style={{ padding: '20px', color: '#fff', background: '#333', height: '100vh' }}>3D Çizim Modülü Yükleniyor...</div>
});

export default function CizimModuluSayfasi() {
  return (
    <div style={{ height: '100vh', width: '100vw', margin: 0, padding: 0 }}>
      <DrawingModule />
    </div>
  );
}