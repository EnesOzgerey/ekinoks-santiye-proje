'use server';

import db from '@/lib/db';
import { revalidatePath } from 'next/cache';
import fs from 'fs';
import path from 'path';

export async function kaydetImalat(formData: FormData) {
  const id = formData.get('id') as string; // Düzenleme modu için ID
  const imalat_adi = formData.get('imalat_adi') as string;
  const tarih = formData.get('tarih') as string; // YENİ: Tarih
  const kullanilan_malzeme = formData.get('kullanilan_malzeme') as string;
  const imalat_yeri = formData.get('imalat_yeri') as string;
  const metraj = formData.get('metraj') as string;
  const calisan_sayisi = parseInt(formData.get('calisan_sayisi') as string) || 0;
  
  const existing_photos = formData.getAll('existing_photos') as string[]; // Düzenlerken silinmeyen eski fotoğraflar
  const photos = formData.getAll('photos') as File[];
  const photoPaths: string[] = [];

  if (!imalat_adi) throw new Error('İmalat (İş Kalemi) adı zorunludur!');

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

  // Eski ve yeni fotoğrafları birleştir
  const finalPhotos = [...existing_photos, ...photoPaths];

  if (id) {
    // GÜNCELLEME İŞLEMİ (UPDATE)
    const update = db.prepare(`
      UPDATE gunluk_imalat 
      SET imalat_adi = ?, tarih = ?, kullanilan_malzeme = ?, imalat_yeri = ?, metraj = ?, calisan_sayisi = ?, photos = ?
      WHERE id = ?
    `);
    update.run(imalat_adi, tarih, kullanilan_malzeme, imalat_yeri, metraj, calisan_sayisi, JSON.stringify(finalPhotos), id);
  } else {
    // YENİ KAYIT İŞLEMİ (INSERT)
    const insert = db.prepare(`
      INSERT INTO gunluk_imalat (imalat_adi, tarih, kullanilan_malzeme, imalat_yeri, metraj, calisan_sayisi, photos)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    insert.run(imalat_adi, tarih, kullanilan_malzeme, imalat_yeri, metraj, calisan_sayisi, JSON.stringify(finalPhotos));
  }
  
  revalidatePath('/gunluk-imalat');
}

export async function silImalat(formData: FormData) {
  const id = formData.get('id') as string;
  if (!id) return;
  db.prepare('DELETE FROM gunluk_imalat WHERE id = ?').run(id);
  revalidatePath('/gunluk-imalat');
}