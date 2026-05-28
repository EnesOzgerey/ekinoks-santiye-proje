import { prisma } from "@/lib/prisma";
import IsVerileriClient from './is-verileri-client';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export default async function IsVerileriPage() {
  // Sistemde kayıtlı olan Adam/Saat verilerini çek
  const veriler = await prisma.adamSaatVerisi.findMany({
    orderBy: { malzeme_adi: 'asc' }
  });

  // Kütüphane JSON dosyasını okuyup çek
  let kutuphaneData: any[] = [];
  try {
    const libPath = path.join(process.cwd(), 'data', 'mekanik_kutuphane.json');
    if (fs.existsSync(libPath)) {
      const raw = fs.readFileSync(libPath, 'utf8');
      const db = JSON.parse(raw);
      db.mekanik_tesisat_kutuphanesi.kategoriler.forEach((kat: any) => {
        kat.alt_kategoriler.forEach((alt: any) => {
          kutuphaneData.push(alt); 
        });
      });
    }
  } catch (e) {
    console.error("Kütüphane okuma hatası:", e);
  }

  return <IsVerileriClient initialData={veriler} kutuphaneData={kutuphaneData} />;
}