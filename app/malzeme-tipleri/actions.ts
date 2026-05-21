'use server';
import db from '@/lib/db';
import { revalidatePath } from 'next/cache';
import fs from 'fs';
import path from 'path';

export async function ekleBelgeliUretici(formData: FormData) {
  const cins_id = formData.get('cins_id') as string;
  const company_name = formData.get('company_name') as string;
  
  // Dizi halindeki çoklu standartları yakalıyoruz
  const standarts = formData.getAll('standart') as string[];
  const belge_nos = formData.getAll('belge_no') as string[];
  const expiry_dates = formData.getAll('expiry_date') as string[];

  const certificates = standarts.map((_, i) => ({
    standart: standarts[i] || '-',
    belge_no: belge_nos[i] || '-',
    expiry_date: expiry_dates[i] || '-'
  }));

  db.prepare(`
    INSERT INTO malzeme_tipleri (cins_id, company_name, certificates)
    VALUES (?, ?, ?)
  `).run(cins_id, company_name, JSON.stringify(certificates));

  revalidatePath('/malzeme-tipleri');
}