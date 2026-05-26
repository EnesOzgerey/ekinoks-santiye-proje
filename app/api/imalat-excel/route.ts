import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs';

export async function POST(request: Request) {
  try {
    const { imalatlar } = await request.json();

    if (!imalatlar || imalatlar.length === 0) {
      return NextResponse.json({ error: 'Dışa aktarılacak veri bulunamadı.' }, { status: 400 });
    }

    // 1. ŞABLON DOSYASINI OKU
    const templatePath = path.join(process.cwd(), 'public', 'santiye_defteri_sablon.xlsx');
    
    if (!fs.existsSync(templatePath)) {
      return NextResponse.json({ error: 'santiye_defteri_sablon.xlsx dosyası bulunamadı!' }, { status: 404 });
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(templatePath);
    const templateSheet = workbook.worksheets[0];
    
    if (!templateSheet) {
        throw new Error("Şablon sayfası okunamadı.");
    }

    // ÇIKTININ ALINDIĞI GÜNÜN TARİH VE GÜN BİLGİSİ
    const bugun = new Date();
    const gun = String(bugun.getDate()).padStart(2, '0');
    const ay = String(bugun.getMonth() + 1).padStart(2, '0');
    const yil = bugun.getFullYear();
    const cıktiTarihi = `${gun}.${ay}.${yil}`; // DD.MM.YYYY formatı

    const gunler = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
    const cıktiGunAdi = gunler[bugun.getDay()];

    // 2. VERİLERİ TARİHLERE GÖRE GRUPLA
    const groupedData: Record<string, any[]> = {};
    imalatlar.forEach((item: any) => {
      let dateKey = 'Tarihsiz';
      if (item.tarih) {
        // YYYY-MM-DD formatını DD.MM.YYYY'ye çeviriyoruz
        const parts = item.tarih.split('-');
        if (parts.length === 3) dateKey = `${parts[2]}.${parts[1]}.${parts[0]}`;
      }
      dateKey = dateKey.replace(/[\\/*?:\[\]]/g, '_').substring(0, 31);
      
      if (!groupedData[dateKey]) groupedData[dateKey] = [];
      groupedData[dateKey].push(item);
    });

    const sortedDates = Object.keys(groupedData).sort();

    // Şablonun sınırlarını ve özelliklerini hafızaya al
    const templateMerges = templateSheet.model ? [...(templateSheet.model.merges || [])] : [];
    const templateImages = templateSheet.getImages() || [];
    const maxRows = Math.max(templateSheet.rowCount, 120); 
    const maxCols = Math.max(templateSheet.columnCount, 20);

    // 3. GÜNLERİ VEYA SAYFALARI İŞLE
    for (let i = 0; i < sortedDates.length; i++) {
      const date = sortedDates[i];
      const items = groupedData[date];
      let sheet;

      // İlk gün için mevcut şablon sayfasını kullan, sonraki her gün için yeni sekme klonla
      if (i === 0) {
        sheet = templateSheet;
        sheet.name = date;
      } else {
        sheet = workbook.addWorksheet(date);
        
        sheet.properties = templateSheet.properties;
        sheet.pageSetup = templateSheet.pageSetup;
        
        // Sütun genişliklerini aktar
        for (let c = 1; c <= maxCols; c++) {
          const tCol = templateSheet.getColumn(c);
          const nCol = sheet.getColumn(c);
          if (tCol.width) nCol.width = tCol.width;
          if (tCol.hidden) nCol.hidden = tCol.hidden;
        }

        // BAĞIMSIZ STİL KOPYALAMA DÖNGÜSÜ (Borders/Hücre Çakışmasını Önler)
        for (let r = 1; r <= maxRows; r++) {
          const tRow = templateSheet.getRow(r);
          const nRow = sheet.getRow(r);
          
          if (tRow.height) nRow.height = tRow.height;
          if (tRow.hidden) nRow.hidden = tRow.hidden;

          for (let c = 1; c <= maxCols; c++) {
            const tCell = tRow.getCell(c);
            const nCell = nRow.getCell(c);
            
            nCell.value = tCell.value;
            
            // Referans çakışmasını engellemek için tüm alt nesneleri izole ederek kopyalıyoruz
            if (tCell.style) {
              nCell.style = {
                ...tCell.style,
                font: tCell.font ? { ...tCell.font } : undefined,
                fill: tCell.fill ? { ...tCell.fill } : undefined,
                alignment: tCell.alignment ? { ...tCell.alignment } : undefined,
                numFormat: tCell.numFormat,
                border: tCell.border ? {
                  top: tCell.border.top ? { ...tCell.border.top } : undefined,
                  left: tCell.border.left ? { ...tCell.border.left } : undefined,
                  bottom: tCell.border.bottom ? { ...tCell.border.bottom } : undefined,
                  right: tCell.border.right ? { ...tCell.border.right } : undefined,
                  diagonal: tCell.border.diagonal ? { ...tCell.border.diagonal } : undefined
                } : undefined
              };
            }
          }
        }

        // Hücre birleştirmelerini aktar
        templateMerges.forEach((m: string) => {
          try { sheet.mergeCells(m); } catch (e) {}
        });

        // Görselleri aktar
        templateImages.forEach((img) => {
          try { sheet.addImage(Number(img.imageId), img.range); } catch (e) {}
        });
      }

      // Şablonun orijinal görünüm yapısını dondur
      sheet.views = templateSheet.views;

      // 4. SABİT HÜCRELERE ÇIKTI TARİHİ VE GÜN BİLGİSİNİ YAZ
      sheet.getCell('B69').value = cıktiTarihi;
      sheet.getCell('G69').value = cıktiTarihi;
      sheet.getCell('K14').value = cıktiTarihi;
      sheet.getCell('K15').value = cıktiGunAdi;

      // 5. GÜNLÜK İMALAT VERİLERİNİ 49. SATIRDAN İTİBAREN YAZ
      let startRow = 49;
      items.forEach((item, index) => {
        const rowNum = startRow + index;
        const row = sheet.getRow(rowNum);
        
        // Çoklu iş kalemlerinde 49. satırın stilini/kenarlıklarını aşağıya tam klonla
        if (index > 0) {
            const baseRow = sheet.getRow(startRow);
            row.height = baseRow.height;
            
            for (let c = 1; c <= maxCols; c++) {
              const baseCell = baseRow.getCell(c);
              const targetCell = row.getCell(c);
              
              if (baseCell.style) {
                targetCell.style = {
                  ...baseCell.style,
                  font: baseCell.font ? { ...baseCell.font } : undefined,
                  fill: baseCell.fill ? { ...baseCell.fill } : undefined,
                  alignment: baseCell.alignment ? { ...baseCell.alignment } : undefined,
                  numFormat: baseCell.numFormat,
                  border: baseCell.border ? {
                    top: baseCell.border.top ? { ...baseCell.border.top } : undefined,
                    left: baseCell.border.left ? { ...baseCell.border.left } : undefined,
                    bottom: baseCell.border.bottom ? { ...baseCell.border.bottom } : undefined,
                    right: baseCell.border.right ? { ...baseCell.border.right } : undefined
                  } : undefined
                };
              }
            }

            // 49. satırdaki merge (hücre birleştirme) kurallarını alt satırlara çoğalt
            templateMerges.forEach((m) => {
              const match = m.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/);
              if (match) {
                const sCol = match[1], sRow = parseInt(match[2]);
                const eCol = match[3], eRow = parseInt(match[4]);
                if (sRow === startRow && eRow === startRow) {
                  try { sheet.mergeCells(`${sCol}${rowNum}:${eCol}${rowNum}`); } catch (e) {}
                }
              }
            });
        }

        // Verileri şablon hücrelerine mühürle (Malzeme ve metraj iptal edildi, sadece imalat_adi)
        row.getCell(2).value = item.imalat_yeri || '-';
        row.getCell(3).value = item.imalat_adi || '-';
        row.getCell(10).value = 'Ekinoks';
        row.getCell(11).value = item.calisan_sayisi || 0;
      });
    }

    // 6. DOSYAYI OLUŞTUR VE TARAYICIYA GÖNDER
    const buffer = await workbook.xlsx.writeBuffer();
    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="Santiye_Defteri.xlsx"',
      },
    });

  } catch (error: any) {
    console.error('Excel İşlem Hatası:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}