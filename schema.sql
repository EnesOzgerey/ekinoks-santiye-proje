-- 1. Malzeme Cinsleri (Kategori)
CREATE TABLE IF NOT EXISTS malzeme_cinsleri (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL
);

-- 2. Malzeme Tipleri (Üretici ve JSON Sertifikalar)
CREATE TABLE IF NOT EXISTS malzeme_tipleri (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cins_id INTEGER,
    company_name TEXT NOT NULL,
    certificates TEXT,
    FOREIGN KEY (cins_id) REFERENCES malzeme_cinsleri(id)
);

-- 3. Malzemeler (Şantiyeye giren fiziki ürünler)
CREATE TABLE IF NOT EXISTS malzemeler (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    material_type_id INTEGER,
    brand TEXT,
    certificate TEXT,
    situation TEXT CHECK(situation IN ('Depoda', 'Kullanildi', 'Hasarli')),
    arrival_date TEXT DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (material_type_id) REFERENCES malzeme_tipleri(id)
);

-- 4. İş Tanımları
CREATE TABLE IF NOT EXISTS isler (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    job_group TEXT NOT NULL, 
    unit_price_tl REAL,
    person_min INTEGER,
    report_template TEXT
);

-- 5. Yapılan İşler
CREATE TABLE IF NOT EXISTS yapilanlar (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id INTEGER,
    material_id INTEGER,
    quantity_length REAL,
    situation TEXT CHECK(situation IN ('Tamamlandi', 'Devam Ediyor')),
    project_name TEXT,
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (job_id) REFERENCES isler(id),
    FOREIGN KEY (material_id) REFERENCES malzemeler(id)
);