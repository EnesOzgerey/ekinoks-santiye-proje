import MalzemeClient from './malzeme-client';

// Prisma dosyan neredeyse orayı işaret etmelisin. 
// Örneğin bazı projelerde '@/utils/db' veya '@/lib/db' olabilir.
import { prisma } from '@/lib/prisma'; 

export const dynamic = 'force-dynamic';

export default async function MalzemelerPage() {
  
  // EĞER VERİTABANINDAKİ TABLONUN ADI "Malzemeler" veya "MalzemeTipleri" ise,
  // aşağıdaki "prisma.malzeme" kısmını "prisma.malzemeler" olarak değiştirmelisin!
  const veriler = await prisma.malzeme.findMany({
    orderBy: { cins: 'asc' }
  });
  
  return (
    <MalzemeClient malzemeler={veriler} />
  );
}