// app/gunluk-imalat/page.tsx
import { prisma } from '@/lib/prisma';
import ImalatClient from './imalat-client';

export const dynamic = 'force-dynamic';

export default async function GunlukImalatPage() {
  // İmalat geçmişini çekiyoruz
  const imalatlar = await prisma.gunluk_imalat.findMany({
    orderBy: { id: 'desc' }
  });

  // 1. Sadece Malzeme Cinslerini (Kategorileri) ve altındaki markaları çek
  const cinsler = await prisma.malzemeCinsi.findMany({
    include: { markalar: true }
  });

  // 2. İstemciye (Client) sadece "Malzeme Adı" ve "Genel Onay Durumu" gönder
  const kayitliMalzemeler = cinsler.map(cins => {
    // Eğer bu cinse ait en az 1 tane bile 'ONAYLANDI' durumunda marka varsa,
    // sahada bu malzemenin kullanılmasına izin verilir.
    const isApproved = cins.markalar.some(m => m.durum === 'ONAYLANDI');
    
    return {
      ad: cins.name, // Artık markayı eklemiyoruz, sadece Cins adını gönderiyoruz
      durum: isApproved ? 'ONAYLANDI' : 'ONAY BEKLİYOR'
    };
  });

  return <ImalatClient imalatlar={imalatlar} kayitliMalzemeler={kayitliMalzemeler} />;
}