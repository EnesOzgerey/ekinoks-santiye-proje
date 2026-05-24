// app/malzeme-tipleri/page.tsx
import MalzemeClient from './malzeme-client'; // <-- Dosya adını senin klasöründeki gibi 'malzemeler-client' yaptık
import { prisma } from '@/lib/prisma'; // Kendi prisma yoluna göre ayarla

export const dynamic = 'force-dynamic';

export default async function MalzemelerPage() {
  
  // Veritabanından mevcut malzemeleri çekiyoruz
  const veriler = await prisma.malzeme.findMany({
    orderBy: { cins: 'asc' }
  });
  
  return (
    <MalzemeClient malzemeler={veriler} />
  );
}