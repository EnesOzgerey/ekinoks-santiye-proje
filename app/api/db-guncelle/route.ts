import db from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Mevcut tabloya varsayılan değeri 'Onay Bekliyor' olan yeni bir sütun ekler
    db.prepare(`ALTER TABLE malzeme_tipleri ADD COLUMN status TEXT DEFAULT 'Onay Bekliyor'`).run();
    return NextResponse.json({ message: 'Harika! Veritabanına DURUM sütunu başarıyla eklendi.' });
  } catch (error: any) {
    if (error.message.includes('duplicate column name')) {
      return NextResponse.json({ message: 'Sütun zaten eklenmiş, her şey yolunda.' });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}