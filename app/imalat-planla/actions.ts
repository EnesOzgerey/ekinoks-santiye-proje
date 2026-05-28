"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getPlanlamaAyarlari() {
  let ayar = await prisma.planlamaAyarlari.findUnique({ where: { id: 1 } });
  if (!ayar) {
    ayar = await prisma.planlamaAyarlari.create({
      data: { id: 1, haftalik_mesai_gun: 6, gunluk_mesai_saat: 9.0, tatil_gunleri: "[]" }
    });
  }
  return ayar;
}

export async function kaydetPlanlamaAyarlari(formData: FormData) {
  const gun = parseInt(formData.get("haftalik_mesai_gun") as string, 10);
  const saat = parseFloat(formData.get("gunluk_mesai_saat") as string);
  const tatiller = formData.get("tatil_gunleri") as string || "[]";

  await prisma.planlamaAyarlari.upsert({
    where: { id: 1 },
    update: { haftalik_mesai_gun: gun, gunluk_mesai_saat: saat, tatil_gunleri: tatiller },
    create: { id: 1, haftalik_mesai_gun: gun, gunluk_mesai_saat: saat, tatil_gunleri: tatiller }
  });
  revalidatePath('/imalat-planla');
}

export async function kaydetImalatPlani(formData: FormData) {
  const idStr = formData.get("id") as string | null;
  const isEditing = idStr && idStr !== "null" && idStr !== "undefined" && idStr.trim() !== "";
  
  // HATA ÇÖZÜMÜ: NaN (Not a Number) sorunlarını %100 engelleyen güvenli ayrıştırıcılar
  const parseOptInt = (val: string | null) => {
    if (!val || val === "null" || val === "undefined" || val.trim() === "") return null;
    const num = parseInt(val, 10);
    return isNaN(num) ? null : num;
  };

  const parseOptFloat = (val: string | null) => {
    if (!val || val === "null" || val === "undefined" || val.trim() === "") return null;
    const num = parseFloat(val);
    return isNaN(num) ? null : num;
  };

  // Zorunlu alanları güvenli bir şekilde sayıya çeviriyoruz (Hatalıysa 0 kabul edilir)
  const miktar = parseFloat(formData.get("miktar") as string);
  const adam_sayisi = parseInt(formData.get("adam_sayisi") as string, 10);
  const zorluk_carpan = parseFloat(formData.get("zorluk_carpan") as string);
  const toplam_adam_saat = parseFloat(formData.get("toplam_adam_saat") as string);

  const data = {
    is_adi: formData.get("is_adi") as string || "",
    is_konumu: formData.get("is_konumu") as string || "",
    malzeme_adi: formData.get("malzeme_adi") as string || "",
    cap: formData.get("cap") as string || "",
    miktar: isNaN(miktar) ? 0 : miktar,
    birim: formData.get("birim") as string || "",
    adam_sayisi: isNaN(adam_sayisi) ? 0 : adam_sayisi,
    zorluk_carpan: isNaN(zorluk_carpan) ? 1.0 : zorluk_carpan,
    zorluk_ad: formData.get("zorluk_ad") as string || "Standart",
    baslangic_tarihi: formData.get("baslangic_tarihi") as string || "",
    ongorulen_bitis: formData.get("ongorulen_bitis") as string || "",
    toplam_adam_saat: isNaN(toplam_adam_saat) ? 0 : toplam_adam_saat,
    ozel_mesai_gun: parseOptInt(formData.get("ozel_mesai_gun") as string | null),
    ozel_mesai_saat: parseOptFloat(formData.get("ozel_mesai_saat") as string | null),
  };

  if (isEditing) {
    await prisma.imalatPlani.update({
      where: { id: parseInt(idStr as string, 10) },
      data
    });
  } else {
    await prisma.imalatPlani.create({ data });
  }
  
  revalidatePath('/imalat-planla');
}

export async function silImalatPlani(formData: FormData) {
  const id = parseInt(formData.get("id") as string, 10);
  
  // Güvenlik Ağı: Plan silindiğinde, bağlı günlük imalatların bağlantısını koparır (veritabanının çökmesini engeller)
  await prisma.gunluk_imalat.updateMany({
    where: { plan_id: id },
    data: { plan_id: null }
  });

  await prisma.imalatPlani.delete({ where: { id } });
  revalidatePath('/imalat-planla');
}