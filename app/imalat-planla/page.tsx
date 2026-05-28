import { prisma } from "@/lib/prisma";
import { getPlanlamaAyarlari } from "./actions";
import PlanlaClient from './planla-client';

export const dynamic = 'force-dynamic';

export default async function ImalatPlanlaPage() {
  const ayarlar = await getPlanlamaAyarlari();
  
  const planlar = await prisma.imalatPlani.findMany({
    orderBy: { id: 'desc' }
  });

  const adamSaatVerileri = await prisma.adamSaatVerisi.findMany({
    orderBy: { malzeme_adi: 'asc' }
  });

  const depoMaddeler = await prisma.depoMalzeme.findMany({
    include: { tedarikciler: true }
  });

  // HATA ÇÖZÜMÜ VE OPTİMİZASYON: 
  // Tüm imalatları tek seferde tarihe göre sıralı çekiyoruz.
  const imalatlar = await prisma.gunluk_imalat.findMany({
    orderBy: { tarih: 'asc' }
  });

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
      ad: d.ad,
      cap: d.spesifikasyon, 
      kalan: Math.max(0, toplamTedarik - toplamKullanilan),
      birim: d.birim
    };
  });

  // Prisma Client hatasını aşmak için veritabanına tekrar sorgu atmak yerine, 
  // halihazırda çektiğimiz "imalatlar" verisini bellekte (memory) filtreliyoruz.
  const bagliImalatlar = imalatlar.filter((im: any) => im.plan_id != null);

  return (
    <PlanlaClient 
      ayarlar={ayarlar} 
      planlar={planlar} 
      adamSaatVerileri={adamSaatVerileri} 
      depoStokDurumu={depoStokDurumu}
      bagliImalatlar={bagliImalatlar}
    />
  );
}