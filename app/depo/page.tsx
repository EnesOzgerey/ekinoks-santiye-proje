import { prisma } from "@/lib/prisma";
import { getDepoData } from './actions';
import DepoClient from './depo-client';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export default async function DepoPage() {
  const data = await getDepoData();
  
  // 1. Kütüphane JSON dosyasını okuyup TÜM DETAYLARIYLA çekiyoruz
  let kutuphaneData: any[] = [];
  try {
    const libPath = path.join(process.cwd(), 'data', 'mekanik_kutuphane.json');
    if (fs.existsSync(libPath)) {
      const raw = fs.readFileSync(libPath, 'utf8');
      const db = JSON.parse(raw);
      db.mekanik_tesisat_kutuphanesi.kategoriler.forEach((kat: any) => {
        kat.alt_kategoriler.forEach((alt: any) => {
          kutuphaneData.push(alt); // Objeyi komple yolluyoruz ki varyasyon ve çapları bilelim
        });
      });
    }
  } catch (e) {
    console.error("Kütüphane okuma hatası:", e);
  }

  // 2. Sistemdeki malzemelerin onay durumlarını çekiyoruz
  const cinsler = await prisma.malzemeCinsi.findMany({
    include: { markalar: true }
  });

  const kayitliDurumlar = cinsler.map(c => {
    const isApproved = c.markalar.some(m => m.durum === 'ONAYLANDI');
    return {
      ad: c.kutuphane_ad || c.name, // Kütüphane referansı varsa onu baz al
      durum: isApproved ? 'ONAYLI' : (c.markalar.length > 0 ? 'ONAY_BEKLIYOR' : 'KAYITSIZ')
    };
  });

  return <DepoClient initialData={data} kutuphaneData={kutuphaneData} kayitliDurumlar={kayitliDurumlar} />;
}