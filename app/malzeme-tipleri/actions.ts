'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

/**
 * Malzeme türünü kaydeder veya günceller (Upsert mantığı)
 */
export async function kaydetMalzeme(formData: FormData) {
  const idStr = formData.get('id');
  const cins = formData.get('cins') as string;
  const standart = formData.get('standart') as string;
  const birim = formData.get('birim') as string;

  if (!cins || !standart || !birim) {
    throw new Error('Lütfen tüm zorunlu alanları doldurun.');
  }

  if (idStr) {
    // 1. DURUM: ID varsa mevcut kaydı güncelle (Inline Düzenleme)
    const id = parseInt(idStr, 10);
    await prisma.malzeme.update({
      where: { id },
      data: {
        cins,
        standart,
        birim,
      },
    });
  } else {
    // 2. DURUM: ID yoksa yeni kayıt oluştur (Inline Ekleme)
    await prisma.malzeme.create({
      data: {
        cins,
        standart,
        birim,
      },
    });
  }

  // Arayüzdeki tablonun anlık olarak güncellenmesi için önbelleği temizle
  revalidatePath('/malzeme-tipleri');
}

/**
 * Belirtilen malzemeyi veritabanından siler
 */
export async function silMalzeme(formData: FormData) {
  const idStr = formData.get('id');
  
  if (!idStr) {
    throw new Error('Silinecek kayda ait ID bulunamadı.');
  }

  const id = parseInt(idStr, 10);

  await prisma.malzeme.delete({
    where: { id },
  });

  // Arayüzdeki tablonun anlık olarak güncellenmesi için önbelleği temizle
  revalidatePath('/malzeme-tipleri');
}