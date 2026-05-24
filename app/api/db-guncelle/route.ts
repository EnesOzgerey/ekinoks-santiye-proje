import db from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const bugun = new Date().toISOString().split('T')[0];
    // Mevcut tabloya varsayılan değeri BUGÜN olan yeni bir sütun ekler
    db.prepare(`ALTER TABLE gunluk_imalat ADD COLUMN tarih TEXT DEFAULT '${bugun}'`).run();
    return NextResponse.json({ message: 'Harika! Veritabanına TARİH sütunu başarıyla eklendi.' });
  } catch (error: any) {
    if (error.message.includes('duplicate column name')) {
      return NextResponse.json({ message: 'Sütun zaten eklenmiş, her şey yolunda.' });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}