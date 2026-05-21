-- 1. Malzeme Cinsleri (Kategori)
CREATE TABLE IF NOT EXISTS malzeme_cinsleri (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL
);

-- 2. Malzeme Tipleri (Üretici ve Sertifikalar JSON olarak)
CREATE TABLE IF NOT EXISTS malzeme_tipleri (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cins_id INTEGER,
    company_name TEXT NOT NULL,
    certificates TEXT, -- Standart, belge_no ve tarihleri dizi (array) olarak tutacak JSON alanı
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

-- 4. İş Tanımları (mt/TL ve Adam/dakika normları)
CREATE TABLE IF NOT EXISTS isler (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    job_group TEXT NOT NULL, 
    unit_price_tl REAL,
    person_min INTEGER,
    report_template TEXT
);

-- 5. Yapılan İşler (Günlük aktivite logu)
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