"use server";

import fs from 'fs';
import path from 'path';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';

const BACKUP_DIR = path.join(process.cwd(), 'backups');
const DB_PATH = path.join(process.cwd(), 'prisma', 'dev.db');
const SETTINGS_PATH = path.join(BACKUP_DIR, 'settings.json');

// Klasör ve Ayar Dosyası Kontrolü
function ensureDirs() {
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
  if (!fs.existsSync(SETTINGS_PATH)) {
    fs.writeFileSync(SETTINGS_PATH, JSON.stringify({ interval: '1_HAFTA', lastAutoBackup: 0 }));
  }
}

// Otomatik Yedekleme Denetleyicisi (Sessizce çalışır)
function checkAndTriggerAutoBackup() {
  try {
    const settings = JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf-8'));
    const now = Date.now();
    const intervals: Record<string, number> = {
      '1_GUN': 24 * 60 * 60 * 1000,
      '3_GUN': 3 * 24 * 60 * 60 * 1000,
      '1_HAFTA': 7 * 24 * 60 * 60 * 1000,
      '2_HAFTA': 14 * 24 * 60 * 60 * 1000,
      '1_AY': 30 * 24 * 60 * 60 * 1000,
    };
    
    const selectedInterval = intervals[settings.interval] || intervals['1_HAFTA'];

    if (now - settings.lastAutoBackup >= selectedInterval) {
      if (fs.existsSync(DB_PATH)) {
        const filename = `yedek_${now}_SISTEM.db`;
        fs.copyFileSync(DB_PATH, path.join(BACKUP_DIR, filename));
        settings.lastAutoBackup = now;
        fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings));
      }
    }
  } catch (e) {
    console.error("Otomatik yedekleme hatası:", e);
  }
}

export async function getBackupsData() {
  ensureDirs();
  checkAndTriggerAutoBackup(); // Sayfa her yüklendiğinde periyodu kontrol eder ve gerekirse yedek alır

  const files = fs.readdirSync(BACKUP_DIR).filter(f => f.endsWith('.db'));
  const backups = files.map(file => {
    const stats = fs.statSync(path.join(BACKUP_DIR, file));
    const [_, timestampStr, typeStr] = file.replace('.db', '').split('_');
    const timestamp = parseInt(timestampStr) || stats.birthtimeMs;
    const isSystem = typeStr === 'SISTEM';

    return {
      filename: file,
      timestamp: timestamp,
      type: isSystem ? 'Sistem Yedeği' : 'Kullanıcı Yedeği',
      size: (stats.size / (1024 * 1024)).toFixed(2) + ' MB',
    };
  }).sort((a, b) => b.timestamp - a.timestamp);

  const settings = JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf-8'));

  // Akıllı Kontrol: Son yedekten bu yana veritabanında değişiklik yapılmış mı?
  let hasChanges = false;
  if (fs.existsSync(DB_PATH)) {
    const dbStats = fs.statSync(DB_PATH);
    if (backups.length > 0) {
      const lastBackupTime = backups[0].timestamp;
      // Eğer DB dosyası son yedekten sonra güncellendiyse uyarıyı tetikle (10 saniye tolerans)
      if (dbStats.mtimeMs > lastBackupTime + 10000) {
        hasChanges = true;
      }
    } else {
      hasChanges = true; 
    }
  }

  return { backups, settings, hasChanges };
}

export async function takeBackup(type: 'MANUAL' | 'SISTEM' = 'MANUAL') {
  ensureDirs();
  if (!fs.existsSync(DB_PATH)) throw new Error("Aktif veritabanı bulunamadı!");

  const timestamp = Date.now();
  const filename = `yedek_${timestamp}_${type}.db`;
  fs.copyFileSync(DB_PATH, path.join(BACKUP_DIR, filename));

  if (type === 'SISTEM') {
    const settings = JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf-8'));
    settings.lastAutoBackup = timestamp;
    fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings));
  }

  revalidatePath('/yedekleme');
  return filename;
}

export async function restoreBackup(formData: FormData) {
  const filename = formData.get("filename") as string;
  const makeBackupFirst = formData.get("makeBackupFirst") === "true";

  ensureDirs();
  const targetBackup = path.join(BACKUP_DIR, filename);
  
  if (!fs.existsSync(targetBackup)) throw new Error("Yedek dosyası bulunamadı!");

  if (makeBackupFirst) {
    await takeBackup('MANUAL');
  }

  // Güvenlik: Önce veritabanı bağlantısını kesiyoruz, sonra dosyayı eziyoruz
  await prisma.$disconnect();
  fs.copyFileSync(targetBackup, DB_PATH);
  
  revalidatePath('/yedekleme');
}

export async function deleteBackup(formData: FormData) {
  const filename = formData.get("filename") as string;
  const target = path.join(BACKUP_DIR, filename);
  if (fs.existsSync(target)) fs.unlinkSync(target);
  revalidatePath('/yedekleme');
}

export async function saveSettings(formData: FormData) {
  const interval = formData.get("interval") as string;
  ensureDirs();
  const settings = JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf-8'));
  settings.interval = interval;
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings));
  revalidatePath('/yedekleme');
}