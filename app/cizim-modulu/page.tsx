"use client";

import dynamic from 'next/dynamic';

const DrawingModule = dynamic(() => import('../../src/modules/DrawingModule/index'), {
  ssr: false, 
  loading: () => (
    <div className="flex items-center justify-center h-full w-full bg-slate-900 text-slate-400 rounded-lg">
      3D Çizim Modülü Yükleniyor...
    </div>
  )
});

export default function CizimModuluSayfasi() {
  return (
    // ÇÖZÜM BURADA: 
    // h-screen ile ekranı tam kaplatıyoruz.
    // pt-[80px] (Padding Top) ile üst menünün (TopNav) kapladığı alan kadar içeriği aşağı itiyoruz.
    // overflow-hidden ile çift scrollbar çıkmasını engelliyoruz.
    <div className="w-full h-screen pt-[80px] pb-4 px-4 flex flex-col overflow-hidden bg-black/90">
      <DrawingModule />
    </div>
  );
}