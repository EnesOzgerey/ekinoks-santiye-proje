"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import fs from 'fs';
import path from 'path';

export async function kaydetImalat(formData: FormData) {
  const idStr = formData.get('id') as string | null;
  const planIdStr = formData.get('plan_id') as string | null;
  
  const imalat_adi = formData.get('imalat_adi') as string;
  const tarih = formData.get('tarih') as string;
  const imalat_yeri = formData.get('imalat_yeri') as string;
  const calisan_sayisi = parseInt(formData.get('calisan_sayisi') as string, 10) || 0;
  const kullanilan_malzeme = formData.get('kullanilan_malzeme') as string;
  const metraj = formData.get('metraj') as string;
  
  const plan_id = planIdStr && planIdStr !== 'null' && planIdStr.trim() !== '' ? parseInt(planIdStr, 10) : null;

  const data: any = {
    imalat_adi,
    tarih,
    imalat_yeri,
    calisan_sayisi,
    kullanilan_malzeme,
    metraj,
    plan_id
  };

  // Fotoğraf Yükleme Mantığı (Eski kodunuzla aynı)
  const photos = formData.getAll('photos') as File[];
  const existingPhotos = formData.getAll('existing_photos') as string[];
  const uploadDir = path.join(process.cwd(), 'public', 'uploads');
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

  const newPhotoUrls: string[] = [];
  for (const file of photos) {
    if (file.size > 0) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
      const filePath = path.join(uploadDir, fileName);
      fs.writeFileSync(filePath, buffer);
      newPhotoUrls.push(`/uploads/${fileName}`);
    }
  }
  
  data.photos = JSON.stringify([...existingPhotos, ...newPhotoUrls]);

  if (idStr) {
    await prisma.gunluk_imalat.update({
      where: { id: parseInt(idStr, 10) },
      data
    });
  } else {
    await prisma.gunluk_imalat.create({ data });
  }

  revalidatePath('/gunluk-imalat');
}

export async function silImalat(formData: FormData) {
  const id = parseInt(formData.get('id') as string, 10);
  await prisma.gunluk_imalat.delete({ where: { id } });
  revalidatePath('/gunluk-imalat');
}