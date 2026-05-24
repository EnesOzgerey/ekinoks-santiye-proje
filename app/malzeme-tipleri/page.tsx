import { prisma } from "@/lib/prisma"; // Kendi prisma tanımlaman nasılsa o yolu kullan
import MalzemeForm from "./MalzemeForm"; // Az önce yazdığımız Client bileşenini çağırıyoruz

export default async function MalzemelerPage() {
  const veriler = await prisma.malzeme.findMany({
    orderBy: {
      cins: "asc" // Veritabanına 'cins' eklendiği için artık hata vermeyecek
    },
    include: {
      standartlar: true // Malzemeleri çekerken altındaki özellikleri de çağırıyoruz
    }
  });

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-white">Malzeme Tipleri</h1>
      
      {/* 1. Kısım: Yukarıdaki mükemmel dinamik form */}
      <MalzemeForm />

      {/* 2. Kısım: Çektiğin verilerin (tablonun) listelendiği alan */}
      <div className="bg-[#1e222d] border border-gray-800 rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4 text-gray-300">Kayıtlı Malzemeler</h2>
        {/* Eski kodlarındaki tablo (.map dönerek listelediğin kısım) buraya gelecek */}
      </div>
    </div>
  );
}