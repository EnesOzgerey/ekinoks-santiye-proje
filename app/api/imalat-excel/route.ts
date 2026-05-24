// app/api/imalat-excel/route.ts
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

    const templatePath = path.join(process.cwd(), 'public', 'santiye_defteri_sablon.xlsx');
    
    if (!fs.existsSync(templatePath)) {
      return NextResponse.json({ error: 'santiye_defteri_sablon.xlsx dosyası public klasöründe bulunamadı!' }, { status: 404 });
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(templatePath);
    const templateSheet = workbook.worksheets[0];

    // Verileri Tarihlerine Göre Grupla
    const groupedData: Record<string, any[]> = {};
    
    imalatlar.forEach((item: any) => {
      let dateKey = 'Tarihsiz';
      if (item.tarih && typeof item.tarih === 'string') {
        const parts = item.tarih.split('-');
        if (parts.length === 3) {
          dateKey = `${parts[2]}.${parts[1]}.${parts[0]}`; // DD.MM.YYYY Formatı
        } else {
          dateKey = item.tarih;
        }
      }

      dateKey = dateKey.replace(/[\\/*?:\[\]]/g, '_').substring(0, 31);

      if (!groupedData[dateKey]) {
        groupedData[dateKey] = [];
      }
      groupedData[dateKey].push(item);
    });

    const sortedDates = Object.keys(groupedData).sort();

    // Şablonun merge kurallarını ve medya (görsel/logo) katmanını önceden hafızaya alalım
    const templateMerges = (templateSheet as any).model.merges || [];
    const templateImages = templateSheet.getImages() || [];

    for (const date of sortedDates) {
      const newSheet = workbook.addWorksheet(date);

      // 1. SÜTUN GENİŞLİKLERİNİ VE GİZLİLİK DURUMLARINI KOPYALA
      const maxColumns = Math.max(templateSheet.columnCount, 26);
      for (let i = 1; i <= maxColumns; i++) {
        const tCol = templateSheet.getColumn(i);
        const nCol = newSheet.getColumn(i);
        if (tCol.width) nCol.width = tCol.width;
        if (tCol.hidden) nCol.hidden = tCol.hidden;
      }

      // 2. SATIRLARI VE HÜCRELERİ STİLLERİYLE BİRLİKTE DERİN KOPYALA (DEEP CLONE)
      const maxTemplateRow = Math.max(templateSheet.rowCount, 120); // Tüm şablon yapısını garantiye almak için
      
      for (let r = 1; r <= maxTemplateRow; r++) {
        const tRow = templateSheet.getRow(r);
        const nRow = newSheet.getRow(r);
        
        if (tRow.height) nRow.height = tRow.height;
        if (tRow.hidden) nRow.hidden = tRow.hidden;

        tRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          const newCell = nRow.getCell(colNumber);
          newCell.value = cell.value;
          
          // ExcelJS referans hatasını çözmek için biçimlendirmeleri JSON üzerinden klonluyoruz
          if (cell.font) newCell.font = JSON.parse(JSON.stringify(cell.font));
          if (cell.fill) newCell.fill = JSON.parse(JSON.stringify(cell.fill));
          if (cell.border) newCell.border = JSON.parse(JSON.stringify(cell.border));
          if (cell.alignment) newCell.alignment = JSON.parse(JSON.stringify(cell.alignment));
          if (cell.numFormat) newCell.numFormat = cell.numFormat;
        });
      }

      // 3. HÜCRE BİRLEŞTİRMELERİNİ (MERGE) AKTAR
      templateMerges.forEach((m: string) => {
        try { newSheet.mergeCells(m); } catch (e) {}
      });

      // 4. BAŞLIKTAKİ LOGO VE SAHA GÖRSELLERİNİ KOPYALA
      templateImages.forEach((img) => {
        try {
          const imgObj = workbook.getImage(Number(img.imageId));
          if (imgObj) {
            const newImgId = workbook.addImage({
              buffer: imgObj.buffer as Buffer,
              extension: imgObj.extension,
            });
            newSheet.addImage(newImgId, img.range);
          }
        } catch (e) {
          console.warn('Şablon görseli kopyalanamadı:', e);
        }
      });

      // 5. İMALAT VERİLERİNİ 49. SATIRDAN İTİBAREN ENJEKTE ET
      const items = groupedData[date];
      const startRow = 49;

      items.forEach((item, index) => {
        const currentRowNum = startRow + index;
        const currentRow = newSheet.getRow(currentRowNum);

        // Aynı gün birden fazla imalat varsa, 49. satırın formatını alt satırlara da klonla
        if (index > 0) {
          const baseRow = newSheet.getRow(startRow);
          currentRow.height = baseRow.height;
          
          baseRow.eachCell({ includeEmpty: true }, (cell, colNum) => {
            const newCell = currentRow.getCell(colNum);
            if (cell.font) newCell.font = JSON.parse(JSON.stringify(cell.font));
            if (cell.fill) newCell.fill = JSON.parse(JSON.stringify(cell.fill));
            if (cell.border) newCell.border = JSON.parse(JSON.stringify(cell.border));
            if (cell.alignment) newCell.alignment = JSON.parse(JSON.stringify(cell.alignment));
          });

          // 49. satırın yatay birleştirme (merge) kurallarını alt satırlara uyarla
          templateMerges.forEach((m: string) => {
            const match = m.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/);
            if (match) {
              const sCol = match[1], sRow = parseInt(match[2]);
              const eCol = match[3], eRow = parseInt(match[4]);
              
              if (sRow === startRow && eRow === startRow) {
                try { newSheet.mergeCells(`${sCol}${currentRowNum}:${eCol}${currentRowNum}`); } catch (e) {}
              }
            }
          });
        }

        // Verileri şablon düzenine göre hücrelere mühürle
        currentRow.getCell('B').value = item.imalat_yeri || '-';
        currentRow.getCell('C').value = item.imalat_adi || '-';
        currentRow.getCell('J').value = 'EKİNOKS MEKANİK';
        currentRow.getCell('K').value = item.calisan_sayisi || 0;
      });
    }

    // Çıktı dosyasında ham şablon sekmesinin kalmaması için orijinal sayfayı kaldırıyoruz
    workbook.removeWorksheet(templateSheet.id);

    const buffer = await workbook.xlsx.writeBuffer();

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="Gunluk_Santiye_Defteri.xlsx"',
      },
    });

  } catch (error: any) {
    console.error('Şablon Tasarım Hatası:', error);
    return NextResponse.json({ error: 'Excel şablonu işlenirken hata oluştu: ' + error.message }, { status: 500 });
  }
}