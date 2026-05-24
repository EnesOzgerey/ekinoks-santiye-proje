import db from '@/lib/db';
import ImalatClient from './imalat-client';

// Bu sayfanın her zaman en güncel veriyi çekmesini garanti edelim
export const dynamic = 'force-dynamic';

export default function GunlukImalatPage() {
  // Kayıtları en yeniden en eskiye (ID DESC) göre çekiyoruz
  const imalatlar = db.prepare('SELECT * FROM gunluk_imalat ORDER BY id DESC').all();

  return <ImalatClient imalatlar={imalatlar} />;
}