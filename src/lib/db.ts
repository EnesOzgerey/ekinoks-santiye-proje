// src/lib/db.ts
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Veritabanı dosyasının konumunu belirliyoruz (Projenin kök dizininde santiye.db olacak)
const dbPath = path.resolve(process.cwd(), 'santiye.db');
const db = new Database(dbPath);

// Eğer veritabanı yeni oluşturuluyorsa, schema.sql dosyasını çalıştır
const schemaPath = path.resolve(process.cwd(), 'schema.sql');
if (fs.existsSync(schemaPath)) {
    const schema = fs.readFileSync(schemaPath, 'utf8');
    db.exec(schema);
}

export default db;