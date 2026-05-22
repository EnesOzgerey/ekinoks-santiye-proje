'use server';

import db from '@/lib/db';
import { revalidatePath } from 'next/cache';
import fs from 'fs';
import path from 'path';

// Ekleme ve Güncelleme İşlemini Tek Fonksiyonda Birleştirdik
export async function kaydetBelgeliUretici(formData: FormData) {
  const id = formData.get('id') as string; // Varsa düzenleme modudur
  const cins_name = formData.get('cins_name') as string;
  const company_name = formData.get('company_name') as string;

  const standarts = formData.getAll('standart') as string[];
  const belge_nos = formData.getAll('belge_no') as string[];
  const expiry_dates = formData.getAll('expiry_date') as string[];
  const catalogs = formData.getAll('catalog') as File[];
  const existing_catalogs = formData.getAll('existing_catalog_path') as string[];

  if (!cins_name || !company_name) {
    throw new Error('Malzeme cinsi ve marka adı zorunludur.');
  }

  // --- AKILLI CİNS YAKALAYICI ---
  let cins_id: number;
  const cinsNameTrimmed = cins_name.trim();
  const existingCins = db.prepare('SELECT id FROM malzeme_cinsleri WHERE LOWER(name) = LOWER(?)').get(cinsNameTrimmed) as { id: number } | undefined;

  if (existingCins) {
    cins_id = existingCins.id;
  } else {
    const insertCins = db.prepare('INSERT INTO malzeme_cinsleri (name) VALUES (?)');
    const info = insertCins.run(cinsNameTrimmed);
    cins_id = info.lastInsertRowid as number;
  }

  // --- SERTİFİKA VE DOSYA İŞLEME ---
  const certificates = [];

  for (let i = 0; i < standarts.length; i++) {
    let catalog_path = existing_catalogs[i] || null; // Eski dosya varsa koru
    const file = catalogs[i];

    // Yeni dosya yüklendiyse eskisinin üzerine yaz
    if (file && file.size > 0) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      
      const uploadDir = path.join(process.cwd(), 'public', 'catalogs');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      
      const filename = `${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
      const filePath = path.join(uploadDir, filename);
      await fs.promises.writeFile(filePath, buffer);
      catalog_path = `/catalogs/${filename}`;
    }

    if (standarts[i] || belge_nos[i] || catalog_path) {
      certificates.push({
        standart: standarts[i] || '-',
        belge_no: belge_nos[i] || '-',
        expiry_date: expiry_dates[i] || '-',
        catalog_path
      });
    }
  }

  if (certificates.length === 0) {
    certificates.push({ standart: '-', belge_no: '-', expiry_date: '-', catalog_path: null });
  }

  // --- VERİTABANINA YAZMA (INSERT VEYA UPDATE) ---
  if (id) {
    const update = db.prepare(`
      UPDATE malzeme_tipleri 
      SET cins_id = ?, company_name = ?, certificates = ?
      WHERE id = ?
    `);
    update.run(cins_id, company_name, JSON.stringify(certificates), id);
  } else {
    const insert = db.prepare(`
      INSERT INTO malzeme_tipleri (cins_id, company_name, certificates)
      VALUES (?, ?, ?)
    `);
    insert.run(cins_id, company_name, JSON.stringify(certificates));
  }

  revalidatePath('/malzeme-tipleri');
}

export async function silUretici(formData: FormData) {
  const id = formData.get('id') as string;
  if (!id) return;
  db.prepare('DELETE FROM malzeme_tipleri WHERE id = ?').run(id);
  revalidatePath('/malzeme-tipleri');
}