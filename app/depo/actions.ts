"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getDepoData() {
  const depoMalzemeler = await prisma.depoMalzeme.findMany({
    include: { tedarikciler: true },
    orderBy: { id: 'desc' }
  });

  const onayliCinsler = await prisma.malzemeCinsi.findMany({
    include: { markalar: true }
  });

  const imalatlar = await prisma.gunluk_imalat.findMany({
    orderBy: { tarih: 'desc' }
  });

  const enrichedData = depoMalzemeler.map(depoItem => {
    
    let onayDurumu = "KAYITSIZ";
    
    // DÜZELTME: Sadece kendi ismine değil, kütüphane referansına (kutuphane_ad) göre de eşleştirme yapıyoruz.
    const foundCinsler = onayliCinsler.filter(c => 
      (c.kutuphane_ad || c.name).toLowerCase() === depoItem.ad.toLowerCase()
    );
    
    if (foundCinsler.length > 0) {
      // Bulunan markaların içinde 1 tane bile onaylı varsa sistem onaylı kabul eder
      const hasApproved = foundCinsler.some(c => c.markalar.some(m => m.durum === 'ONAYLANDI'));
      const hasPending = foundCinsler.some(c => c.markalar.some(m => m.durum === 'ONAY_BEKLIYOR'));
      onayDurumu = hasApproved ? "ONAYLI" : (hasPending ? "ONAY_BEKLIYOR" : "KAYITSIZ");
    }

    const kullanimGecmisi: any[] = [];
    let toplamKullanilan = 0;

    imalatlar.forEach(imalat => {
      try {
        const malzemelerJSON = JSON.parse(imalat.kullanilan_malzeme);
        const parsedList = Array.isArray(malzemelerJSON) ? malzemelerJSON : [];
        
        parsedList.forEach(m => {
          const matchAd = m.ad && m.ad.toLowerCase() === depoItem.ad.toLowerCase();
          const matchSpesifikasyon = (m.spesifikasyon || '').toLowerCase() === (depoItem.spesifikasyon || '').toLowerCase();

          if (matchAd && matchSpesifikasyon) {
            const miktarVal = parseFloat(m.miktar) || 0;
            toplamKullanilan += miktarVal;
            kullanimGecmisi.push({
              tarih: imalat.tarih,
              imalat_adi: imalat.imalat_adi,
              lokasyon: imalat.imalat_yeri,
              miktar: miktarVal,
              birim: m.birim || depoItem.birim
            });
          }
        });
      } catch (e) {}
    });

    const toplamTedarik = depoItem.tedarikciler.reduce((sum, t) => sum + t.miktar, 0);

    return {
      ...depoItem,
      onayDurumu,
      toplamTedarik,
      toplamKullanilan,
      kalanMiktar: toplamTedarik - toplamKullanilan,
      kullanimGecmisi
    };
  });

  return enrichedData;
}

export async function ekleDepoMalzeme(formData: FormData) {
  const ad = formData.get("ad") as string;
  const spesifikasyon = formData.get("spesifikasyon") as string; 
  const gereken_miktar = parseFloat(formData.get("gereken_miktar") as string) || 0;
  const birim = formData.get("birim") as string || "adet";

  if (!ad) throw new Error("Malzeme adı zorunludur.");

  await prisma.depoMalzeme.create({
    data: { ad, spesifikasyon, gereken_miktar, birim }
  });
  revalidatePath('/depo');
}

// YENİ: DÜZENLEME MOTORU
export async function guncelleDepoMalzeme(formData: FormData) {
  const id = parseInt(formData.get("id") as string, 10);
  const ad = formData.get("ad") as string;
  const spesifikasyon = formData.get("spesifikasyon") as string; 
  const gereken_miktar = parseFloat(formData.get("gereken_miktar") as string) || 0;
  const birim = formData.get("birim") as string || "adet";

  if (!id || !ad) throw new Error("Malzeme kimliği ve adı zorunludur.");

  await prisma.depoMalzeme.update({
    where: { id },
    data: { ad, spesifikasyon, gereken_miktar, birim }
  });
  revalidatePath('/depo');
}

export async function silDepoMalzeme(formData: FormData) {
  const id = parseInt(formData.get("id") as string, 10);
  if (id) await prisma.depoMalzeme.delete({ where: { id } });
  revalidatePath('/depo');
}

export async function ekleTedarikci(formData: FormData) {
  const depo_malzeme_id = parseInt(formData.get("depo_malzeme_id") as string, 10);
  const firma_adi = formData.get("firma_adi") as string;
  const miktar = parseFloat(formData.get("miktar") as string) || 0;

  if (!firma_adi || miktar <= 0) throw new Error("Firma adı ve geçerli miktar giriniz.");

  await prisma.tedarikci.create({
    data: { depo_malzeme_id, firma_adi, miktar }
  });
  revalidatePath('/depo');
}

export async function silTedarikci(formData: FormData) {
  const id = parseInt(formData.get("id") as string, 10);
  if (id) await prisma.tedarikci.delete({ where: { id } });
  revalidatePath('/depo');
}