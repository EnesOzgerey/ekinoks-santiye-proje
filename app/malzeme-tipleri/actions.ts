"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import fs from 'fs';
import path from 'path';

// Yardımcı Fonksiyon: Dosyayı fiziksel olarak sunucuya kaydeder
async function saveKatalogDosyasi(katalogDosya: File | null): Promise<string | null> {
  if (!katalogDosya || katalogDosya.size === 0) return null;

  const bytes = await katalogDosya.arrayBuffer();
  const buffer = Buffer.from(bytes);
  
  const uploadDir = path.join(process.cwd(), 'public', 'kataloglar');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  
  const safeName = katalogDosya.name.replace(/\s+/g, '_');
  const filename = `${Date.now()}_--${safeName}`;
  const filePath = path.join(uploadDir, filename);
  
  await fs.promises.writeFile(filePath, buffer);
  return `/kataloglar/${filename}`;
}

export async function yeniMalzemeEkle(formData: FormData) {
  const cinsName = (formData.get("cinsName") as string).trim();
  const kutuphaneAd = (formData.get("kutuphaneAd") as string)?.trim() || null;
  const markaName = (formData.get("markaName") as string).trim();
  
  const durum = (formData.get("durum") as string) || "SUNULMADI"; 
  
  const katalogDosya = formData.get("katalogDosya") as File | null;
  const katalogPath = await saveKatalogDosyasi(katalogDosya); 
  
  const standartlarJSON = formData.get("standartlarJSON") as string;
  const standartlar = JSON.parse(standartlarJSON);

  if (!cinsName || !markaName) throw new Error("Lütfen Kategori ve Marka alanlarını doldurun.");

  const cins = await prisma.malzemeCinsi.upsert({
    where: { name: cinsName },
    update: kutuphaneAd ? { kutuphane_ad: kutuphaneAd } : {},
    create: { 
      name: cinsName,
      kutuphane_ad: kutuphaneAd
    },
  });

  const marka = await prisma.marka.create({
    data: {
      cins_id: cins.id,
      name: markaName,
      durum: durum,
      katalog_url: katalogPath,
    }
  });

  const gecerliStandartlar = standartlar.filter((s: any) => s.standartAdi.trim() !== "");
  if (gecerliStandartlar.length > 0) {
    await Promise.all(
      gecerliStandartlar.map((std: any) =>
        prisma.standart.create({
          data: {
            marka_id: marka.id,
            standart_adi: std.standartAdi.trim(),
            belge_no: std.belgeNo.trim(),
            gecerlilik: std.gecerlilik.trim(),
          }
        })
      )
    );
  }

  revalidatePath("/malzeme-tipleri");
}

export async function guncelleMarka(formData: FormData) {
  const markaId = parseInt(formData.get("markaId") as string, 10);
  const markaName = (formData.get("markaName") as string).trim();
  
  const durum = (formData.get("durum") as string) || "SUNULMADI";
  
  const katalogDosya = formData.get("katalogDosya") as File | null;
  const katalogPath = await saveKatalogDosyasi(katalogDosya); 
  
  const standartlarJSON = formData.get("standartlarJSON") as string;
  const standartlar = JSON.parse(standartlarJSON);

  if (!markaId || !markaName) throw new Error("Eksik veri.");

  const updateData: any = { name: markaName, durum: durum };
  if (katalogPath) updateData.katalog_url = katalogPath;

  await prisma.marka.update({ where: { id: markaId }, data: updateData });
  await prisma.standart.deleteMany({ where: { marka_id: markaId } });

  const gecerliStandartlar = standartlar.filter((s: any) => s.standartAdi.trim() !== "");
  if (gecerliStandartlar.length > 0) {
    await Promise.all(
      gecerliStandartlar.map((std: any) =>
        prisma.standart.create({
          data: {
            marka_id: markaId,
            standart_adi: std.standartAdi.trim(),
            belge_no: std.belgeNo.trim(),
            gecerlilik: std.gecerlilik.trim(),
          }
        })
      )
    );
  }

  revalidatePath("/malzeme-tipleri");
}

// YENİ: Edit modundan gelen Kütüphane Adını da (varsa) kaydediyoruz
export async function guncelleMalzemeCinsi(id: number, newName: string, kutuphaneAd: string | null = null) {
  if (!newName.trim()) throw new Error("Kategori adı boş olamaz.");
  await prisma.malzemeCinsi.update({
    where: { id },
    data: { 
      name: newName.trim(),
      kutuphane_ad: kutuphaneAd
    }
  });
  revalidatePath("/malzeme-tipleri");
}

export async function silMarka(formData: FormData) {
  const idStr = formData.get("id") as string;
  if (!idStr) return;
  
  const id = parseInt(idStr, 10);

  const marka = await prisma.marka.findUnique({ where: { id } });
  
  if (marka) {
    await prisma.marka.delete({ where: { id } });
    const kalanMarkalar = await prisma.marka.count({ where: { cins_id: marka.cins_id } });
    if (kalanMarkalar === 0) {
      await prisma.malzemeCinsi.delete({ where: { id: marka.cins_id } });
    }
  }
  revalidatePath("/malzeme-tipleri");
}

export async function silStandart(id: number) {
  await prisma.standart.delete({ where: { id } });
  revalidatePath("/malzeme-tipleri");
}