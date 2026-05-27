"use client";

import React, { useState } from 'react';
import { takeBackup, deleteBackup, restoreBackup, saveSettings } from './actions';

export default function YedeklemeClient({ initialData }: { initialData: any }) {
  const { backups, settings, hasChanges } = initialData;
  const [loading, setLoading] = useState(false);
  
  // Geri Yükleme Modalı State'leri
  const [restoreFile, setRestoreFile] = useState<string | null>(null);

  const handleTakeBackup = async () => {
    setLoading(true);
    try { await takeBackup('MANUAL'); } 
    catch (err: any) { alert(err.message); } 
    finally { setLoading(false); }
  };

  const handleIntervalChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    setLoading(true);
    try {
      const data = new FormData();
      data.append('interval', e.target.value);
      await saveSettings(data);
    } catch (err: any) { alert(err.message); }
    finally { setLoading(false); }
  };

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    const date = d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const time = d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    return { date, time };
  };

  return (
    <div className="max-w-[1200px] mx-auto p-6 bg-zinc-950 min-h-screen text-zinc-100">
      
      {/* ÜST BAR VE KONTROLLER */}
      <div className="mb-8 flex flex-col gap-4">
        <h1 className="text-xl font-bold tracking-tight">Veritabanı ve Sistem Yedekleri</h1>
        
        <div className="flex flex-wrap items-center justify-between gap-4 bg-zinc-900/40 p-3 rounded-xl border border-zinc-800/60 shadow-sm">
          
          <div className="flex items-center gap-3">
            <span className="text-sm text-zinc-400 font-medium">Otomatik Sistem Yedeği Periyodu:</span>
            <select 
              value={settings.interval} 
              onChange={handleIntervalChange}
              disabled={loading}
              className="bg-[#131316] border border-zinc-700 text-xs font-bold text-zinc-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 cursor-pointer transition-colors"
            >
              <option value="1_GUN">Günde 1</option>
              <option value="3_GUN">3 Günde 1</option>
              <option value="1_HAFTA">Haftada 1</option>
              <option value="2_HAFTA">2 Haftada 1</option>
              <option value="1_AY">Ayda Bir</option>
            </select>
          </div>

          <button 
            onClick={handleTakeBackup} 
            disabled={loading}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow-lg shadow-blue-900/20 transition-all disabled:opacity-50"
          >
            {loading ? '⏳ İşleniyor...' : '💾 Veritabanı Yedeği Al'}
          </button>
        </div>
      </div>

      {/* YEDEKLER TABLOSU */}
      <div className="bg-[#0f0f11] border border-zinc-800 rounded-xl overflow-hidden shadow-2xl">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-zinc-950 text-zinc-500 font-bold uppercase tracking-wider border-b border-zinc-800">
              <th className="p-4 w-[25%] text-center">TARİH & SAAT</th>
              <th className="p-4 w-[25%] text-center">YEDEK ETİKETİ</th>
              <th className="p-4 w-[20%] text-center">DOSYA BOYUTU</th>
              <th className="p-4 w-[30%] text-center">İŞLEMLER</th>
            </tr>
          </thead>
          <tbody>
            {backups.length === 0 ? (
              <tr><td colSpan={4} className="p-12 text-center text-zinc-500 italic">Sistemde henüz bir yedek bulunmuyor.</td></tr>
            ) : (
              backups.map((bkp: any) => {
                const isSystem = bkp.type === 'Sistem Yedeği';
                const { date, time } = formatDate(bkp.timestamp);

                return (
                  <tr key={bkp.filename} className="border-b border-zinc-800/40 hover:bg-zinc-900/40 transition-colors">
                    <td className="p-4 align-middle text-center">
                      <div className="font-bold text-zinc-200 text-sm">{date}</div>
                      <div className="text-zinc-500 font-mono mt-0.5">{time}</div>
                    </td>
                    <td className="p-4 align-middle text-center">
                      <span className={`px-3 py-1 rounded-full text-[11px] font-bold ${isSystem ? 'bg-indigo-950/50 text-indigo-400 border border-indigo-500/30' : 'bg-emerald-950/50 text-emerald-400 border border-emerald-500/30'}`}>
                        {bkp.type}
                      </span>
                    </td>
                    <td className="p-4 align-middle text-center text-zinc-400 font-mono">
                      {bkp.size}
                    </td>
                    <td className="p-4 align-middle text-center">
                      <div className="flex flex-row items-center justify-center gap-2">
                        <button 
                          onClick={() => setRestoreFile(bkp.filename)} 
                          disabled={loading}
                          className="text-blue-400 hover:text-white bg-blue-950/30 hover:bg-blue-600 border border-blue-900/50 px-3 py-1.5 rounded transition-colors font-bold w-24"
                        >
                          🔄 Yükle
                        </button>
                        <form action={deleteBackup}>
                          <input type="hidden" name="filename" value={bkp.filename} />
                          <button type="submit" disabled={loading} onClick={e => { if(!confirm('Silmek istediğinize emin misiniz?')) e.preventDefault() }} className="text-zinc-400 hover:text-red-400 bg-zinc-900 hover:bg-red-500/10 px-3 py-1.5 rounded border border-zinc-800 transition-colors font-bold w-16">
                            Sil
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* GERİ YÜKLEME UYARI MODALI */}
      {restoreFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl shadow-2xl max-w-lg w-full">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              ⚠️ Geri Yükleme Onayı
            </h2>
            
            {hasChanges ? (
              <div className="bg-amber-950/30 border border-amber-500/30 p-4 rounded-lg mb-6 text-amber-200/90 text-sm leading-relaxed">
                <strong>Dikkat:</strong> Mevcut veritabanında son alınan yedekten bu yana değişiklikler yapılmış! 
                <br/><br/>
                Eğer yedekleme yapmazsanız <span className="text-white font-bold underline decoration-amber-500">veritabanının şu anki durumu tamamen silinecek.</span> Lütfen devam etmeden önce mevcut durumu yedeklemek isteyip istemediğinizi seçin.
              </div>
            ) : (
              <p className="text-zinc-300 text-sm mb-6">
                Seçtiğiniz yedek dosyası mevcut veritabanının üzerine yazılacaktır. Devam etmek istiyor musunuz?
              </p>
            )}

            <form action={restoreBackup} onSubmit={() => setRestoreFile(null)} className="flex flex-col gap-3">
              <input type="hidden" name="filename" value={restoreFile} />
              
              {hasChanges ? (
                <>
                  <button type="submit" name="makeBackupFirst" value="true" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-colors">
                    💾 Önce Yedekle, Sonra Yükle (Güvenli)
                  </button>
                  <button type="submit" name="makeBackupFirst" value="false" className="w-full bg-red-950/50 hover:bg-red-600 text-red-400 hover:text-white border border-red-900/50 font-bold py-3 rounded-xl transition-colors">
                    🔥 Yedeklemeden Devam Et (Mevcut Durumu Sil)
                  </button>
                </>
              ) : (
                <button type="submit" name="makeBackupFirst" value="false" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-colors">
                  🔄 Yedeği Geri Yükle
                </button>
              )}
              
              <button type="button" onClick={() => setRestoreFile(null)} className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold py-3 rounded-xl transition-colors mt-2">
                İptal Et
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}