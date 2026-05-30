// app/api/malzeme-onay-doc/route.ts
import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs';

export async function POST(request: Request) {
  try {
    const { materials } = await request.json();

    if (!materials || materials.length === 0) {
      return NextResponse.json({ error: 'Filtrelenmiş malzeme bulunamadı.' }, { status: 400 });
    }

    const templatePath = path.join(process.cwd(), 'public', 'sablon.xlsx');
    
    if (!fs.existsSync(templatePath)) {
      return NextResponse.json({ error: 'sablon.xlsx dosyası public klasöründe bulunamadı!' }, { status: 404 });
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(templatePath);
    const worksheet = workbook.worksheets[0]; 

    // 1. GRUPLAMA ALGORİTMASI
    const groupedData: any[] = [];
    let totalDataRows = 0;

    materials.forEach((item: any) => {
      if (item.markalar && Array.isArray(item.markalar)) {
        let cName = (item.name || '-').trim();
        cName = cName.replace(/-/g, '\u2011').replace(/ \(/g, '\u00A0('); 
        
        let cinsGroup = groupedData.find((g: any) => g.cins === cName);
        if (!cinsGroup) {
          cinsGroup = { cins: cName, companies: [], totalRows: 0 };
          groupedData.push(cinsGroup);
        }

        item.markalar.forEach((marka: any) => {
           let mName = (marka.name || '-').trim();
           let companyGroup = cinsGroup.companies.find((c: any) => c.marka === mName);
           if (!companyGroup) {
             companyGroup = { marka: mName, certs: [] };
             cinsGroup.companies.push(companyGroup);
           }

           let certs = marka.standartlar || [];
           if (certs.length === 0) certs = [{}];

           certs.forEach((cert: any) => {
             companyGroup.certs.push({
               standart: cert.standart_adi || cert.standart || '-',
               belge_no: cert.belge_no || '-',
               expiry_date: cert.gecerlilik || cert.expiry_date || '-'
             });
             cinsGroup.totalRows += 1; 
             totalDataRows += 1; 
           });
        });
      } else {
        let cName = (item.cins_name || '-').trim();
        cName = cName.replace(/-/g, '\u2011').replace(/ \(/g, '\u00A0('); 
        const mName = (item.company_name || '-').trim();

        let cinsGroup = groupedData.find((g: any) => g.cins === cName);
        if (!cinsGroup) {
          cinsGroup = { cins: cName, companies: [], totalRows: 0 };
          groupedData.push(cinsGroup);
        }

        let companyGroup = cinsGroup.companies.find((c: any) => c.marka === mName);
        if (!companyGroup) {
          companyGroup = { marka: mName, certs: [] };
          cinsGroup.companies.push(companyGroup);
        }

        let certs: any[] = [];
        try { certs = JSON.parse(item.certificates || '[]'); } catch(e) { certs = [{}]; }
        if (certs.length === 0) certs = [{}];

        certs.forEach((cert: any) => {
          companyGroup.certs.push({
            standart: cert.standart || '-',
            belge_no: cert.belge_no || '-',
            expiry_date: cert.expiry_date || '-'
          });
          cinsGroup.totalRows += 1; 
          totalDataRows += 1; 
        });
      }
    });

    // 2. ŞABLON KORUMA (Yükseklikler ve Birleştirmeler)
    const originalHeights: Record<number, number> = {};
    for (let i = 1; i <= 100; i++) {
        originalHeights[i] = worksheet.getRow(i).height;
    }

    const originalMerges: any[] = [];
    if ((worksheet as any)._merges) {
        for (const key in (worksheet as any)._merges) {
            originalMerges.push((worksheet as any)._merges[key].model);
        }
        (worksheet as any)._merges = {}; 
    }

    // 3. SATIR EKLEME
    const offset = totalDataRows > 1 ? totalDataRows - 1 : 0;
    
    worksheet.spliceRows(16, 1); 
    const rowsToInsert = offset + 1; 
    worksheet.spliceRows(16, 0, ...Array(rowsToInsert).fill([]));
    
    const templateRow = worksheet.getRow(15);
    for (let i = 1; i <= offset; i++) {
        const newRow = worksheet.getRow(15 + i);
        templateRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            newRow.getCell(colNumber).style = cell.style;
        });
    }

    // 4. ŞABLON YÜKSEKLİKLERİNİ RESTORE ET
    for (let r = 15; r <= 15 + offset; r++) {
        worksheet.getRow(r).height = originalHeights[15] || 35;
    }
    worksheet.getRow(16 + offset).height = originalHeights[16] || 15; 
    
    for (let i = 17; i <= 100; i++) {
        worksheet.getRow(i + offset).height = originalHeights[i];
    }

    // 5. BİRLEŞTİRMELERİ RESTORE ET
    originalMerges.forEach(m => {
        if (m.top < 15) {
            worksheet.mergeCells(m.top, m.left, m.bottom, m.right);
        } else if (m.top >= 17) {
            worksheet.mergeCells(m.top + offset, m.left, m.bottom + offset, m.right);
        }
    });

    // 6. VERİ YAZMA VE DİNAMİK HÜCRE BOYAMA (Tablo İçi)
    let currentRow = 15; 
    let siraNo = 1;
    const mergesToExecute: string[] = []; 
    const masterCellsToFix: any[] = []; 

    groupedData.forEach((cinsGroup) => {
      const cinsStartRow = currentRow;
      const cinsEndRow = cinsStartRow + cinsGroup.totalRows - 1;

      cinsGroup.companies.forEach((compGroup: any) => {
        const compStartRow = currentRow;
        const compEndRow = compStartRow + compGroup.certs.length - 1;

        compGroup.certs.forEach((cert: any) => {
          const row = worksheet.getRow(currentRow);

          row.getCell('C').value = currentRow === cinsStartRow ? siraNo : null;
          row.getCell('D').value = currentRow === cinsStartRow ? cinsGroup.cins : null;
          row.getCell('E').value = currentRow === compStartRow ? compGroup.marka : null;

          row.getCell('F').value = cert.standart;
          row.getCell('G').value = cert.belge_no;
          row.getCell('H').value = cert.expiry_date;

          const isFirstRowOfTable = currentRow === 15;
          const isLastRowOfCins = currentRow === cinsEndRow;

          ['C', 'D', 'E', 'F', 'G', 'H'].forEach(col => {
            const cell = row.getCell(col);
            
            cell.border = {
              top: { style: isFirstRowOfTable ? 'medium' : 'thin', color: { argb: 'FF000000' } },
              bottom: { style: isLastRowOfCins ? 'medium' : 'thin', color: { argb: 'FF000000' } },
              left: { style: col === 'C' ? 'medium' : 'thin', color: { argb: 'FF000000' } },
              right: { style: col === 'H' ? 'medium' : 'thin', color: { argb: 'FF000000' } }
            };

            cell.font = { name: 'Arial', size: 11, bold: (col === 'C' || col === 'D') };
            cell.alignment = { 
              vertical: 'middle', 
              horizontal: ['C', 'D', 'F', 'G', 'H'].includes(col) ? 'center' : 'left', 
              wrapText: true 
            };
          });

          currentRow++;
        });

        if (compEndRow > compStartRow) {
          mergesToExecute.push(`E${compStartRow}:E${compEndRow}`);
        }
        masterCellsToFix.push({ address: `E${compStartRow}`, isFirstTable: compStartRow === 15, isLastCins: compEndRow === cinsEndRow, col: 'E' });
      });

      if (cinsEndRow > cinsStartRow) {
        mergesToExecute.push(`C${cinsStartRow}:C${cinsEndRow}`);
        mergesToExecute.push(`D${cinsStartRow}:D${cinsEndRow}`);
      }
      
      masterCellsToFix.push({ address: `C${cinsStartRow}`, isFirstTable: cinsStartRow === 15, isLastCins: true, col: 'C' });
      masterCellsToFix.push({ address: `D${cinsStartRow}`, isFirstTable: cinsStartRow === 15, isLastCins: true, col: 'D' });

      siraNo++; 
    });

    mergesToExecute.forEach(range => {
      try { worksheet.mergeCells(range); } catch (e) { }
    });

    masterCellsToFix.forEach(info => {
      const cell = worksheet.getCell(info.address);
      cell.border = {
        top: { style: info.isFirstTable ? 'medium' : 'thin', color: { argb: 'FF000000' } },
        bottom: { style: info.isLastCins ? 'medium' : 'thin', color: { argb: 'FF000000' } },
        left: { style: info.col === 'C' ? 'medium' : 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } }
      };
    });

    // 7. TABLO DIŞ KENARLIKLARI 
    const lastDataRow = 15 + offset;
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber >= 15 && rowNumber <= lastDataRow) {
        const cellC = row.getCell('C');
        cellC.border = { ...(cellC.border || {}), left: { style: 'medium', color: { argb: 'FF000000' } } };

        const cellH = row.getCell('H');
        cellH.border = { ...(cellH.border || {}), right: { style: 'medium', color: { argb: 'FF000000' } } };
      }
    });

    const bottomRow = worksheet.getRow(lastDataRow);
    ['C', 'D', 'E', 'F', 'G', 'H'].forEach(col => {
       const cell = bottomRow.getCell(col);
       cell.border = { ...(cell.border || {}), bottom: { style: 'medium', color: { argb: 'FF000000' } } };
    });

    // --- NOKTA ATIŞI KENARLIK MOTORU ---
    const updateBorder = (rowNum: number, col: string, borderUpdates: any) => {
      const cell = worksheet.getRow(rowNum).getCell(col);
      const currentBorder = cell.border || {};
      const newBorder: any = { ...currentBorder };
      for (const edge in borderUpdates) {
        if (borderUpdates[edge] === null) {
          delete newBorder[edge];
        } else {
          newBorder[edge] = borderUpdates[edge];
        }
      }
      cell.border = newBorder;
    };

    const thickBorder = { style: 'medium', color: { argb: 'FF000000' } };
    const thinBorder = { style: 'thin', color: { argb: 'FF000000' } };

    // --- ÜST KISIM (HEADER) KENARLIKLARI ---
    // 4, 5, 6, 8 ve 13. satırlarda C sütunu sağ kalın kenarlık
    [4, 5, 6, 8, 13].forEach(rowNum => {
      updateBorder(rowNum, 'C', { right: thickBorder });
      updateBorder(rowNum, 'D', { left: thickBorder }); // Mühürleme
    });

    // 9, 10, 11 ve 12. satırlarda E sütunu sağ kalın kenarlık
    [9, 10, 11, 12].forEach(rowNum => {
      updateBorder(rowNum, 'E', { right: thickBorder });
      updateBorder(rowNum, 'F', { left: thickBorder }); // Mühürleme
    });


    // --- ALT KISIM (FOOTER) KENARLIKLARI ---
    // 1. satır (16 + offset) - Tampon boşluk satırı (H sütunundaki sağ kenarlık iptal edildi)
    updateBorder(16 + offset, 'C', { left: null });
    updateBorder(16 + offset, 'F', { right: null });
    updateBorder(16 + offset, 'H', { right: null });

    // 2. satır (17 + offset)
    updateBorder(17 + offset, 'F', { right: thickBorder });

    // 3. satır (18 + offset)
    updateBorder(18 + offset, 'C', { right: thinBorder });
    updateBorder(18 + offset, 'D', { right: thinBorder });
    updateBorder(18 + offset, 'E', { right: thinBorder });

    // 4. satır (19 + offset)
    updateBorder(19 + offset, 'F', { right: thickBorder });

    // 5. satır (20 + offset)
    updateBorder(20 + offset, 'F', { right: thickBorder });

    // 7. satır (22 + offset)
    updateBorder(22 + offset, 'C', { right: thickBorder });
    updateBorder(22 + offset, 'E', { right: thickBorder }); 

    // 8. satır (23 + offset)
    updateBorder(23 + offset, 'F', { right: thickBorder });

    // 9. satır (24 + offset)
    updateBorder(24 + offset, 'F', { right: thickBorder });

    // 11. satır (26 + offset)
    updateBorder(26 + offset, 'F', { right: thickBorder });

    // 8. 📅 OTOMATİK TARİH GÜNCELLEMESİ
    workbook.calcProperties.fullCalcOnLoad = true;
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    const formattedDateString = `___${dd}__ / __${mm}__ / ${yyyy}`;
    const dateRegex = /___\d{2}__\s*\/\s*__\d{2}__\s*\/\s*\d{4}/g;

    worksheet.eachRow((row) => {
      row.eachCell((cell) => {
        if (typeof cell.value === 'string') {
          if (dateRegex.test(cell.value)) cell.value = cell.value.replace(dateRegex, formattedDateString);
        } 
        else if (cell.value && typeof cell.value === 'object' && 'richText' in cell.value) {
          let hasChange = false;
          const newRichText = (cell.value as any).richText.map((rt: any) => {
            if (dateRegex.test(rt.text)) {
              hasChange = true;
              return { ...rt, text: rt.text.replace(dateRegex, formattedDateString) };
            }
            return rt;
          });
          if (hasChange) cell.value = { richText: newRichText };
        } 
        else if (cell.value && typeof cell.value === 'object' && ('formula' in cell.value || 'sharedFormula' in cell.value)) {
          const formulaStr = String((cell.value as any).formula || '').toUpperCase();
          const resultValue = (cell.value as any).result;

          if (/^[A-Z]{1,2}\d{1,3}$/.test(formulaStr) || formulaStr.includes('19') || resultValue === 0) {
            cell.value = formattedDateString;
          } else {
            const formulaValue = cell.value as any;
            cell.value = { formula: formulaValue.formula, sharedFormula: formulaValue.sharedFormula };
          }
        }
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename=Malzeme_Oneri_ve_Onay_Formu.xlsx`,
      },
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}