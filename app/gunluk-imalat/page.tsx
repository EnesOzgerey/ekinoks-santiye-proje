import { prisma } from '@/lib/prisma';
import ImalatClient from './imalat-client';

export const dynamic = 'force-dynamic';

export default async function GunlukImalatPage() {
  const imalatlar = await prisma.gunluk_imalat.findMany({
    orderBy: { id: 'desc' }
  });

  // YENİ: spesifikasyon da eklendi!
  const depoMalzemeleri = await prisma.depoMalzeme.findMany({
    select: { ad: true, spesifikasyon: true, birim: true },
    orderBy: { ad: 'asc' }
  });

  return <ImalatClient imalatlar={imalatlar} kayitliMalzemeler={depoMalzemeleri} />;
}