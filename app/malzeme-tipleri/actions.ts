'use server';

import db from '@/lib/db';
import { revalidatePath } from 'next/cache';
import fs from 'fs';
import path from 'path';

export async function ekleCins(formData: FormData) {
  const name = formData.get('cins_name') as string;
  if (!name) return;
  
  db.prepare('INSERT INTO malzeme_cinsleri (name) VALUES (?)').run(name);
  revalidatePath('/malzeme-tipleri');
}

export async function ekleBelgeliUretici(formData: FormData) {
  const cins_id = formData.get('cins_id') as string;
  const company_name = formData.get('company_name') as string;

  // Formdaki tüm dinamik standart, belge no, geçerlilik tarihi ve katalog girdilerini dizi olarak yakala
  const standarts = formData.getAll('standart') as string[];
  const belge_nos = formData.getAll('belge_no') as string[];
  const expiry_dates = formData.getAll('expiry_date') as string[];
  const catalogs = formData.getAll('catalog') as File[];

  if (!cins_id || !company_name) {
    throw new Error('Malzeme cinsi ve marka/firma adı zorunludur.');
  }

  const certificates = [];

  for (let i = 0; i < standarts.length; i++) {
    let catalog_path = null;
    let catalog_name = null;
    const file = catalogs[i];

    if (file && file.size > 0) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      
      const uploadDir = path.join(process.cwd(), 'public', 'catalogs');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      
      catalog_name = file.name;
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
        catalog_path,
        catalog_name
      });
    }
  }

  if (certificates.length === 0) {
    certificates.push({ standart: '-', belge_no: '-', expiry_date: '-', catalog_path: null });
  }

  const insert = db.prepare(`
    INSERT INTO malzeme_tipleri (cins_id, company_name, certificates)
    VALUES (?, ?, ?)
  `);
  
  insert.run(cins_id, company_name, JSON.stringify(certificates));
  revalidatePath('/malzeme-tipleri');
}

export async function silUretici(formData: FormData) {
  const id = formData.get('id') as string;
  if (!id) return;

  db.prepare('DELETE FROM malzeme_tipleri WHERE id = ?').run(id);
  revalidatePath('/malzeme-tipleri');
}