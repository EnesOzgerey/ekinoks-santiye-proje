"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getPlanlamaAyarlari() {
  let ayar = await prisma.planlamaAyarlari.findUnique({ where: { id: 1 } });
  if (!ayar) {
    ayar = await prisma.planlamaAyarlari.create({
      data: { id: 1, haftalik_mesai_gun: 6, gunluk_mesai_saat: 9.0 }
    });
  }
  return ayar;
}

export async function kaydetPlanlamaAyarlari(formData: FormData) {
  const gun = parseInt(formData.get("haftalik_mesai_gun") as string, 10);
  const saat = parseFloat(formData.get("gunluk_mesai_saat") as string);

  await prisma.planlamaAyarlari.upsert({
    where: { id: 1 },
    update: { haftalik_mesai_gun: gun, gunluk_mesai_saat: saat },
    create: { id: 1, haftalik_mesai_gun: gun, gunluk_mesai_saat: saat }
  });
  revalidatePath('/imalat-planla');
}

export async function kaydetImalatPlani(formData: FormData) {
  const data = {
    is_adi: formData.get("is_adi") as string,
    malzeme_adi: formData.get("malzeme_adi") as string,
    cap: formData.get("cap") as string,
    miktar: parseFloat(formData.get("miktar") as string),
    birim: formData.get("birim") as string,
    adam_sayisi: parseInt(formData.get("adam_sayisi") as string, 10),
    zorluk_carpan: parseFloat(formData.get("zorluk_carpan") as string),
    zorluk_ad: formData.get("zorluk_ad") as string,
    baslangic_tarihi: formData.get("baslangic_tarihi") as string,
    ongorulen_bitis: formData.get("ongorulen_bitis") as string,
    toplam_adam_saat: parseFloat(formData.get("toplam_adam_saat") as string),
    ozel_mesai_gun: formData.get("ozel_mesai_gun") ? parseInt(formData.get("ozel_mesai_gun") as string, 10) : null,
    ozel_mesai_saat: formData.get("ozel_mesai_saat") ? parseFloat(formData.get("ozel_mesai_saat") as string) : null,
  };

  await prisma.imalatPlani.create({ data });
  revalidatePath('/imalat-planla');
}

export async function silImalatPlani(formData: FormData) {
  const id = parseInt(formData.get("id") as string, 10);
  await prisma.imalatPlani.delete({ where: { id } });
  revalidatePath('/imalat-planla');
}