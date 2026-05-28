import { prisma } from "@/lib/prisma";
import ImalatClient from './imalat-client';

export const dynamic = 'force-dynamic';

export default async function GunlukImalatPage() {
  const imalatlar = await prisma.gunluk_imalat.findMany({
    orderBy: { tarih: 'desc' }
  });

  const depoMaddeler = await prisma.depoMalzeme.findMany({
    include: { tedarikciler: true }
  });
  
  const planlar = await prisma.imalatPlani.findMany({
    orderBy: { id: 'desc' }
  });

  // YENİ: Kalan stok hesaplanarak Client'a gönderiliyor
  const depoStokDurumu = depoMaddeler.map(d => {
    let toplamTedarik = d.tedarikciler.reduce((sum, t) => sum + t.miktar, 0);
    let toplamKullanilan = 0;
    imalatlar.forEach(im => {
      try {
        const mlz = JSON.parse(im.kullanilan_malzeme);
        mlz.forEach((m:any) => {
          if (m.ad === d.ad && (m.spesifikasyon || '') === (d.spesifikasyon || '')) {
            toplamKullanilan += parseFloat(m.miktar) || 0;
          }
        });
      } catch(e) {}
    });
    return {
      ...d,
      kalan: Math.max(0, toplamTedarik - toplamKullanilan),
    };
  });

  return <ImalatClient imalatlar={imalatlar} kayitliMalzemeler={depoStokDurumu} planlar={planlar} />;
}