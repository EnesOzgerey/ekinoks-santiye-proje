'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import fs from 'fs';
import path from 'path';

export async function kaydetImalat(formData: FormData) {
  const idStr = formData.get('id') as string | null;
  const imalat_adi = formData.get('imalat_adi') as string;
  const tarih = formData.get('tarih') as string;
  const kullanilan_malzeme = formData.get('kullanilan_malzeme') as string;
  const imalat_yeri = formData.get('imalat_yeri') as string;
  const metraj = formData.get('metraj') as string;
  const calisan_sayisi = parseInt(formData.get('calisan_sayisi') as string) || 0;
  
  const existing_photos = formData.getAll('existing_photos') as string[];
  const photos = formData.getAll('photos') as File[];
  const photoPaths: string[] = [];

  if (!imalat_adi) throw new Error('İmalat (İş Kalemi) adı zorunludur!');

  // Klasör kontrolü
  const uploadDir = path.join(process.cwd(), 'public', 'imalat_photos');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  // Yeni yüklenen fotoğrafları kaydet
  for (const file of photos) {
    if (file && file.size > 0) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}-${file.name.replace(/\s+/g, '_')}`;
      const filePath = path.join(uploadDir, filename);
      await fs.promises.writeFile(filePath, buffer);
      photoPaths.push(`/imalat_photos/${filename}`);
    }
  }

  // Eski ve yeni fotoğrafları birleştirip JSON string'e çeviriyoruz
  const finalPhotos = [...existing_photos, ...photoPaths];
  const photosJSON = JSON.stringify(finalPhotos);

  if (idStr) {
    // DÜZENLEME (UPDATE) MANTIĞI - PRISMA
    const id = parseInt(idStr, 10);
    await prisma.gunluk_imalat.update({
      where: { id },
      data: {
        imalat_adi,
        tarih,
        kullanilan_malzeme,
        imalat_yeri,
        metraj,
        calisan_sayisi,
        photos: photosJSON
      }
    });
  } else {
    // YENİ KAYIT (INSERT) MANTIĞI - PRISMA
    await prisma.gunluk_imalat.create({
      data: {
        imalat_adi,
        tarih,
        kullanilan_malzeme,
        imalat_yeri,
        metraj,
        calisan_sayisi,
        photos: photosJSON
      }
    });
  }
  
  revalidatePath('/gunluk-imalat');
}

export async function silImalat(formData: FormData) {
  const idStr = formData.get('id') as string | null;
  if (!idStr) return;
  
  const id = parseInt(idStr, 10);
  
  // SİLME İŞLEMİ - PRISMA
  await prisma.gunluk_imalat.delete({
    where: { id }
  });
  
  revalidatePath('/gunluk-imalat');
}