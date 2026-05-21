// src/lib/db.ts
import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.resolve(process.cwd(), 'santiye.db');
const db = new Database(dbPath);

// 🛠️ ESKİ TABLO ÇAKIŞMALARINI ENGELLEYEN AKILLI KONTROL
try {
  // Eğer eski tablo varsa company_name kolonu olmayacaktır ve bu sorgu hata fırlatacaktır
  db.prepare('SELECT company_name FROM malzeme_tipleri LIMIT 1').get();
} catch (e) {
  // Hata fırlatıldıysa eski yapı kalmıştır, temiz bir kurulum için bağımlı tüm eski tabloları sıfırlıyoruz
  db.exec(`
    DROP TABLE IF EXISTS yapilanlar;
    DROP TABLE IF EXISTS malzemeler;
    DROP TABLE IF EXISTS malzeme_tipleri;
    DROP TABLE IF EXISTS malzeme_cinsleri;
  `);
  console.log("⚠️ Eski veritabanı yapısı temizlendi, yeni matris şeması kuruluyor...");
}

// 🚀 YENİ VE TAM UYUMLU TEKNİK ONAY MATRİSİ ŞEMASI
db.exec(`
  -- 1. Malzeme Cinsleri (Örn: PVC Pis Su Borusu)
  CREATE TABLE IF NOT EXISTS malzeme_cinsleri (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL
  );

  -- 2. Malzeme Tipleri / Onaylı Üretici ve Belgeler
  CREATE TABLE IF NOT EXISTS malzeme_tipleri (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cins_id INTEGER,
    company_name TEXT NOT NULL,
    standart TEXT,
    belge_no TEXT,
    expiry_date TEXT,
    catalog_path TEXT,
    catalog_name TEXT,
    FOREIGN KEY (cins_id) REFERENCES malzeme_cinsleri(id) ON DELETE CASCADE
  );

  -- 3. İş Tanımları
  CREATE TABLE IF NOT EXISTS isler (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    job_group TEXT NOT NULL,
    unit_price_tl REAL,
    person_min INTEGER,
    report_template TEXT
  );

  -- 4. Malzeme Deposu (Girişler)
  CREATE TABLE IF NOT EXISTS malzemeler (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    material_type_id INTEGER,
    brand TEXT,
    certificate TEXT,
    situation TEXT,
    arrival_date TEXT,
    FOREIGN KEY (material_type_id) REFERENCES malzeme_tipleri(id) ON DELETE CASCADE
  );

  -- 5. Yapılan İmalatlar (Saha Günlüğü)
  CREATE TABLE IF NOT EXISTS yapilanlar (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id INTEGER,
    material_id INTEGER,
    quantity_length REAL,
    situation TEXT,
    project_name TEXT,
    start_date TEXT,
    end_date TEXT,
    FOREIGN KEY (job_id) REFERENCES isler(id) ON DELETE CASCADE
  );
`);

// İşler tablosunda job_group kontrolü (Geriye dönük uyumluluk)
try {
  db.prepare('SELECT job_group FROM isler LIMIT 1').get();
} catch (error) {
  db.exec("ALTER TABLE isler ADD COLUMN job_group TEXT NOT NULL DEFAULT 'Diğer';");
}

export default db;