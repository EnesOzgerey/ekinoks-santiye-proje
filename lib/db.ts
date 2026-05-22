import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dbPath = path.resolve(process.cwd(), 'santiye.db');
const db = new Database(dbPath);

const schemaPath = path.resolve(process.cwd(), 'schema.sql');
if (fs.existsSync(schemaPath)) {
    const schema = fs.readFileSync(schemaPath, 'utf8');
    db.exec(schema);
}

// 🚀 OTOMATİK ONARICI (AUTO-HEALING) SİSTEM
try {
    // Veritabanına "certificates sütunun var mı?" diye soruyoruz
    db.prepare('SELECT certificates FROM malzeme_tipleri LIMIT 1').get();
} catch (error) {
    console.log("Eski veritabanı tespit edildi! Otomatik onarım başlatılıyor...");
    
    // İlişki hatalarını önlemek için yabancı anahtarları geçici kapatıyoruz
    db.exec('PRAGMA foreign_keys = OFF;');
    
    // Eski sütunlara sahip olan hatalı tabloları zorla parçalıyoruz
    db.exec(`
        DROP TABLE IF EXISTS yapilanlar;
        DROP TABLE IF EXISTS malzemeler;
        DROP TABLE IF EXISTS malzeme_tipleri;
    `);
    
    // Yeni şemayı sıfırdan ve temiz bir şekilde tekrar kuruyoruz
    if (fs.existsSync(schemaPath)) {
        const schema = fs.readFileSync(schemaPath, 'utf8');
        db.exec(schema);
    }
    
    db.exec('PRAGMA foreign_keys = ON;');
    console.log("Veritabanı başarıyla yeni formata yükseltildi!");
}

export default db;