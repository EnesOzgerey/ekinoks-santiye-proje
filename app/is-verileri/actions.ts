"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function kaydetAdamSaat(formData: FormData) {
  const malzeme_adi = formData.get("malzeme_adi") as string;
  const cap = formData.get("cap") as string;
  const birim = formData.get("birim") as string;
  const gerekli_adam = parseInt(formData.get("gerekli_adam") as string, 10);
  const adam_saat = parseFloat(formData.get("adam_saat") as string);

  if (!malzeme_adi || !cap || !birim || isNaN(gerekli_adam) || isNaN(adam_saat)) {
    throw new Error("Lütfen ekip ve süre alanlarını eksiksiz doldurun.");
  }

  // UPSERT: Varsa Güncelle, Yoksa Yeni Oluştur (Kusursuz Kart Mantığı)
  await prisma.adamSaatVerisi.upsert({
    where: {
      malzeme_adi_cap: { malzeme_adi, cap }
    },
    update: {
      gerekli_adam,
      adam_saat,
      birim
    },
    create: {
      malzeme_adi,
      cap,
      birim,
      gerekli_adam,
      adam_saat
    }
  });

  revalidatePath('/is-verileri');
}

export async function silAdamSaat(formData: FormData) {
  const idStr = formData.get("id") as string;
  if (!idStr) return;
  const id = parseInt(idStr, 10);
  
  await prisma.adamSaatVerisi.delete({ where: { id } });
  revalidatePath('/is-verileri');
}

export async function topluAdamSaatYukle() {
  const ornekVeriler = [
    { malzeme_adi: "PPRC Borular (Sıcak/Soğuk Su)", cap: "Ø20 mm", birim: "m", gerekli_adam: 2, adam_saat: 0.12 },
    { malzeme_adi: "PPRC Borular (Sıcak/Soğuk Su)", cap: "Ø50 mm", birim: "m", gerekli_adam: 2, adam_saat: 0.20 },
    { malzeme_adi: "PPRC Borular (Sıcak/Soğuk Su)", cap: "Ø110 mm", birim: "m", gerekli_adam: 3, adam_saat: 0.45 },
    { malzeme_adi: "PVC-U Borular (Atık Su)", cap: "Ø50 mm", birim: "m", gerekli_adam: 2, adam_saat: 0.15 },
    { malzeme_adi: "PVC-U Borular (Atık Su)", cap: "Ø110 mm", birim: "m", gerekli_adam: 2, adam_saat: 0.25 },
    { malzeme_adi: "PVC-U Borular (Atık Su)", cap: "Ø200 mm", birim: "m", gerekli_adam: 3, adam_saat: 0.50 },
    { malzeme_adi: "Siyah Çelik Borular", cap: "DN25 (1\")", birim: "m", gerekli_adam: 2, adam_saat: 0.40 },
    { malzeme_adi: "Siyah Çelik Borular", cap: "DN100 (4\")", birim: "m", gerekli_adam: 3, adam_saat: 0.90 },
    { malzeme_adi: "Siyah Çelik Borular", cap: "DN200 (8\")", birim: "m", gerekli_adam: 4, adam_saat: 1.80 },
    { malzeme_adi: "Küresel Vanalar", cap: "DN25 (1\")", birim: "adet", gerekli_adam: 1, adam_saat: 0.50 },
    { malzeme_adi: "Kelebek Vanalar", cap: "DN100", birim: "adet", gerekli_adam: 2, adam_saat: 1.20 },
    { malzeme_adi: "Kelebek Vanalar", cap: "DN200", birim: "adet", gerekli_adam: 3, adam_saat: 2.50 },
    { malzeme_adi: "Sprinkler Başlıkları", cap: "1/2\" NPT", birim: "adet", gerekli_adam: 2, adam_saat: 0.30 },
    { malzeme_adi: "Elastomerik Kauçuk Köpüğü (Boru Tipi)", cap: "Ø28 mm Boru İçin", birim: "m", gerekli_adam: 1, adam_saat: 0.08 },
    { malzeme_adi: "Elastomerik Kauçuk Köpüğü (Boru Tipi)", cap: "Ø114 mm Boru İçin", birim: "m", gerekli_adam: 2, adam_saat: 0.20 }
  ];

  for (const veri of ornekVeriler) {
    const existing = await prisma.adamSaatVerisi.findUnique({
      where: {
        malzeme_adi_cap: {
          malzeme_adi: veri.malzeme_adi,
          cap: veri.cap
        }
      }
    });

    if (!existing) {
      await prisma.adamSaatVerisi.create({ data: veri });
    }
  }

  revalidatePath('/is-verileri');
}