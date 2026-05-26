// app/malzeme-tipleri/page.tsx
import MalzemelerClient from './malzemeler-client';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function MalzemeTipleriPage() {
  // İlişkisel şemaya göre tüm hiyerarşiyi tek seferde çekiyoruz
  const malzemeCinsleri = await prisma.malzemeCinsi.findMany({
    include: {
      markalar: {
        include: {
          standartlar: true
        }
      }
    },
    orderBy: { name: 'asc' }
  });

  return <MalzemelerClient initialData={malzemeCinsleri} />;
}