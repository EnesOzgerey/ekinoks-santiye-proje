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

    // 1. KUSURSUZ HİBRİT GRUPLAMA ALGORİTMASI 
    // (Hem eski düz JSON'u hem de yeni Prisma iç içe hiyerarşisini anlar)
    const groupedData: any[] = [];
    let totalDataRows = 0;

    materials.forEach((item: any) => {
      // DURUM A: Yeni Prisma Hiyerarşik Yapısı (cins -> markalar -> standartlar)
      if (item.markalar && Array.isArray(item.markalar)) {
        let cName = (item.name || '-').trim();
        cName = cName.replace(/-/g, '\u2011').replace(/ \(/g, '\u00A0('); 
        let cinsGroup = { cins: cName, companies: [] as any[], totalRows: 0 };
        groupedData.push(cinsGroup);

        item.markalar.forEach((marka: any) => {
           let mName = (marka.name || '-').trim();
           let companyGroup = { marka: mName, certs: [] as any[] };
           cinsGroup.companies.push(companyGroup);

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
      } 
      // DURUM B: Eski Düz (Flat) JSON Yapısı
      else {
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

    // 2. SATIR ENJEKSİYONU (15'ten İtibaren)
    if (totalDataRows > 0) {
      worksheet.spliceRows(15, 0, ...Array(totalDataRows).fill([]));
    }

    // 3. GELİŞTİRİLMİŞ SİHİRLİ SİLİCİ (Sorunu çözen yer burası)
    // Şablon aşağı itilirken uzayan ve yeni verilerimizle çarpışan tüm "Hayalet Birleştirmeleri" yok eder.
    if ((worksheet as any)._merges) {
      const cleanMerges: any = {};
      for (const key in (worksheet as any)._merges) {
        const m = (worksheet as any)._merges[key];
        
        // 15'ten önceki üst başlık (Header) birleştirmeleri KORUNUR
        const isHeader = m.bottom < 15;
        
        // Orijinalde 17'den başlayan alt kısım (Footer) birleştirmeleri KORUNUR
        // (totalDataRows kadar aşağı itildikleri için yeni konumları 17 + totalDataRows oldu)
        const isFooter = m.top >= 17 + totalDataRows;

        // Header veya Footer değilse, bu bir hayalet veridir; SİL!
        if (isHeader || isFooter) {
          cleanMerges[key] = m;
        }
      }
      (worksheet as any)._merges = cleanMerges;
    }

    // 4. VERİ YAZMA VE DİNAMİK HÜCRE BOYAMA
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
          row.height = 35; 

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

    // 5. BİRLEŞTİRMELERİ ATEŞLE
    mergesToExecute.forEach(range => {
      try { worksheet.mergeCells(range); } catch (e) { console.warn(`Merge engeli: ${range}`); }
    });

    // 6. MASTER HÜCRELERİ MÜHÜRLE
    masterCellsToFix.forEach(info => {
      const cell = worksheet.getCell(info.address);
      cell.border = {
        top: { style: info.isFirstTable ? 'medium' : 'thin', color: { argb: 'FF000000' } },
        bottom: { style: info.isLastCins ? 'medium' : 'thin', color: { argb: 'FF000000' } },
        left: { style: info.col === 'C' ? 'medium' : 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } }
      };
    });

    // 7. FORMÜL KORUMASI
    workbook.calcProperties.fullCalcOnLoad = true;
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber >= 15 + totalDataRows) {
        row.eachCell((cell) => {
          if (cell.value && typeof cell.value === 'object' && 'formula' in cell.value) {
            const formulaValue = cell.value as any;
            cell.value = {
              formula: formulaValue.formula,
              sharedFormula: formulaValue.sharedFormula
            };
          }
        });
      }
    });

    // 8. 📅 OTOMATİK TARİH GÜNCELLEMESİ VE '0' HATASI ÇÖZÜMÜ
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    const formattedDateString = `___${dd}__ / __${mm}__ / ${yyyy}`;

    const dateRegex = /___\d{2}__\s*\/\s*__\d{2}__\s*\/\s*\d{4}/g;

    worksheet.eachRow((row) => {
      row.eachCell((cell) => {
        if (typeof cell.value === 'string') {
          if (dateRegex.test(cell.value)) {
            cell.value = cell.value.replace(dateRegex, formattedDateString);
          }
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
          if (hasChange) {
            cell.value = { richText: newRichText };
          }
        }
        else if (cell.value && typeof cell.value === 'object' && ('formula' in cell.value || 'sharedFormula' in cell.value)) {
          const formulaStr = String((cell.value as any).formula || '').toUpperCase();
          const resultValue = (cell.value as any).result;

          if (/^[A-Z]{1,2}\d{1,3}$/.test(formulaStr) || formulaStr.includes('19') || resultValue === 0) {
            cell.value = formattedDateString;
          }
        }
      });
    });

    // 9. 🎨 ALT ŞABLON KENARLIK RESTORASYONU
    const offset = totalDataRows;
    
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber >= 15 && rowNumber < 15 + offset) {
        const cellC = row.getCell('C');
        cellC.border = { ...(cellC.border || {}), left: { style: 'medium', color: { argb: 'FF000000' } } };

        const cellH = row.getCell('H');
        cellH.border = { ...(cellH.border || {}), right: { style: 'medium', color: { argb: 'FF000000' } } };
      }
    });

    const maxRowLimit = 50 + offset; 
    
    for (let r = 15 + offset; r <= maxRowLimit; r++) {
      const row = worksheet.getRow(r);
      const originalRow = r - offset; 

      ['I', 'J', 'K', 'L', 'M'].forEach(col => {
        row.getCell(col).border = {};
      });

      if (originalRow > 26) {
        ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].forEach(col => {
          row.getCell(col).border = {};
        });
        continue; 
      }
      
      const bCell = row.getCell('B');
      const cCell = row.getCell('C');
      const dCell = row.getCell('D');
      const eCell = row.getCell('E');
      const fCell = row.getCell('F');
      const gCell = row.getCell('G');
      const hCell = row.getCell('H');

      if (originalRow === 15 || originalRow === 16) {
        ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].forEach(col => {
          row.getCell(col).border = {};
        });
        continue; 
      }

      if (originalRow >= 17 && originalRow <= 24) {
        
        cCell.border = { ...(cCell.border || {}), left: { style: 'medium', color: { argb: 'FF000000' } } };
        hCell.border = { ...(hCell.border || {}), right: { style: 'medium', color: { argb: 'FF000000' } } };
        eCell.border = { ...(eCell.border || {}), right: { style: 'thin', color: { argb: 'FF000000' } } };
        
        if (![17, 18, 19, 20].includes(originalRow)) {
          fCell.border = { ...(fCell.border || {}), left: { style: 'thin', color: { argb: 'FF000000' } } };
        }

        if (gCell.border) { 
          const gClean = { ...gCell.border }; 
          delete (gClean as any).left; 
          delete (gClean as any).right; 
          gCell.border = gClean; 
        }

        if (originalRow === 17) {
          fCell.border = {
            right: { style: 'medium', color: { argb: 'FF000000' } },
            top: { style: 'medium', color: { argb: 'FF000000' } },
            left: { style: 'thin', color: { argb: 'FF000000' } },
            bottom: { style: 'thin', color: { argb: 'FF000000' } }
          };
        }

        if (originalRow === 18) {
          fCell.border = {
            top: { style: 'thin', color: { argb: 'FF000000' } },
            left: { style: 'thin', color: { argb: 'FF000000' } }
          };
          gCell.border = {
            top: { style: 'thin', color: { argb: 'FF000000' } }
          };
        }

        if (originalRow === 19) {
          fCell.border = {
            left: { style: 'thin', color: { argb: 'FF000000' } },
            bottom: { style: 'thin', color: { argb: 'FF000000' } },
            right: { style: 'medium', color: { argb: 'FF000000' } }
          };
        }

        if (originalRow === 20) {
          fCell.border = {
            right: { style: 'medium', color: { argb: 'FF000000' } },
            left: { style: 'thin', color: { argb: 'FF000000' } },
            top: { style: 'thin', color: { argb: 'FF000000' } },
            bottom: { style: 'thin', color: { argb: 'FF000000' } }
          };
        }

        if (originalRow === 21) {
          cCell.border = { 
            ...(cCell.border || {}), 
            left: { style: 'medium', color: { argb: 'FF000000' } }
          };
          delete (cCell.border as any).right;
          
          if (dCell.border) {
             delete (dCell.border as any).left;
          }

          dCell.border = {
            ...(dCell.border || {}),
            bottom: { style: 'thin', color: { argb: 'FF000000' } }
          };

          fCell.border = { 
            ...(fCell.border || {}), 
            right: { style: 'medium', color: { argb: 'FF000000' } } 
          };
        }

        if (originalRow === 22) {
          cCell.border = {
            right: { style: 'medium', color: { argb: 'FF000000' } },
            left: { style: 'medium', color: { argb: 'FF000000' } },
            bottom: { style: 'medium', color: { argb: 'FF000000' } },
            top: { style: 'thin', color: { argb: 'FF000000' } }
          };
        }

        if (originalRow >= 22 && originalRow <= 24) {
          fCell.border = { ...(fCell.border || {}), right: { style: 'medium', color: { argb: 'FF000000' } } };
        }
      }

      if (originalRow === 25) {
        const prevC = worksheet.getRow(r - 1).getCell('C');
        if (prevC.border) {
          const prevBorder = { ...prevC.border };
          delete (prevBorder as any).bottom;
          prevC.border = prevBorder;
        }

        bCell.border = { ...(bCell.border || {}), right: { style: 'medium', color: { argb: 'FF000000' } } };

        cCell.border = { left: { style: 'medium', color: { argb: 'FF000000' } }, right: { style: 'thin', color: { argb: 'FF000000' } }, bottom: { style: 'thin', color: { argb: 'FF000000' } } };
        dCell.border = { left: { style: 'thin', color: { argb: 'FF000000' } }, right: { style: 'thin', color: { argb: 'FF000000' } }, bottom: { style: 'thin', color: { argb: 'FF000000' } } };
        eCell.border = { left: { style: 'thin', color: { argb: 'FF000000' } }, right: { style: 'thin', color: { argb: 'FF000000' } }, bottom: { style: 'thin', color: { argb: 'FF000000' } } };
        fCell.border = { left: { style: 'thin', color: { argb: 'FF000000' } }, right: { style: 'medium', color: { argb: 'FF000000' } }, bottom: { style: 'thin', color: { argb: 'FF000000' } } };
        hCell.border = { ...(hCell.border || {}), right: { style: 'medium', color: { argb: 'FF000000' } } };
      }

      if (originalRow === 26) {
        fCell.border = { right: { style: 'medium', color: { argb: 'FF000000' } }, bottom: { style: 'medium', color: { argb: 'FF000000' } }, left: { style: 'thin', color: { argb: 'FF000000' } }, top: { style: 'thin', color: { argb: 'FF000000' } } };
        cCell.border = { ...(cCell.border || {}), left: { style: 'medium', color: { argb: 'FF000000' } } };
        hCell.border = { ...(hCell.border || {}), right: { style: 'medium', color: { argb: 'FF000000' } } };
      }
    }

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