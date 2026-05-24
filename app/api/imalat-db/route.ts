import db from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    db.prepare(`
      CREATE TABLE IF NOT EXISTS gunluk_imalat (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        imalat_adi TEXT NOT NULL,
        kullanilan_malzeme TEXT,
        imalat_yeri TEXT,
        metraj TEXT,
        calisan_sayisi INTEGER,
        photos TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run();
    return NextResponse.json({ message: 'Harika! gunluk_imalat tablosu başarıyla oluşturuldu.' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}