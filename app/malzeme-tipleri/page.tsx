import { prisma } from "@/lib/prisma";
import MalzemelerClient from './malzemeler-client';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export default async function MalzemelerPage() {
  const veriler = await prisma.malzemeCinsi.findMany({
    include: {
      markalar: { include: { standartlar: true } }
    },
    orderBy: { id: 'desc' }
  });

  // Kütüphane JSON dosyasını okuyup Autocomplete için SADECE ANA İSİMLERİ (Varyasyonsuz) çekiyoruz
  let kutuphaneList: string[] = [];
  try {
    const libPath = path.join(process.cwd(), 'data', 'mekanik_kutuphane.json');
    if (fs.existsSync(libPath)) {
      const raw = fs.readFileSync(libPath, 'utf8');
      const db = JSON.parse(raw);
      
      db.mekanik_tesisat_kutuphanesi.kategoriler.forEach((kat: any) => {
        kat.alt_kategoriler.forEach((alt: any) => {
          // Varyasyon döngüsünü tamamen iptal ettik.
          // Sadece ana malzeme adını alıyoruz ve listede mükerrer kayıt olmasını engelliyoruz.
          if (!kutuphaneList.includes(alt.ad)) {
            kutuphaneList.push(alt.ad); // Örn: Sadece "PPRC Borular (Sıcak/Soğuk Su)"
          }
        });
      });
    }
  } catch (e) {
    console.error("Kütüphane okuma hatası:", e);
  }

  return <MalzemelerClient initialData={veriler} kutuphaneList={kutuphaneList} />;
}