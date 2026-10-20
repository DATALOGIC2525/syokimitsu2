import { NextResponse } from 'next/server';
// @ts-ignore
import XlsxPopulate from 'xlsx-populate';
import path from 'path';
import {
  enforceApiSecurity,
  sanitizeForSpreadsheetCell,
  sanitizeSafeNumber,
} from '@/lib/security';

function formatCompanyName(name: string) {
  if (!name) return '';
  name = name.replace(/㈱/g, '株式会社');
  name = name.replace(/㈲/g, '有限会社');
  name = `${name}　`;
  if (name.includes('株式会社') || name.includes('有限会社')) {
    return name.trim();
  }
  return name.trim();
}

export async function POST(req: Request) {
  // 1. ゼロトラストAPIセキュリティ検証（認証・CSRF Origin検査・レート制限）
  const guardResponse = await enforceApiSecurity(req, {
    bucketName: 'api_export_estimate',
    maxRequestsPerMin: 20,
    requireCsrfCheck: true,
  });
  if (guardResponse) return guardResponse;

  try {
    // 2. ペイロードサイズ検証（巨大JSONによるメモリ枯渇DoS防止）
    const rawBody = await req.text();
    if (rawBody.length > 100_000) {
      return NextResponse.json(
        { error: 'リクエストデータが大きすぎます。' },
        { status: 413 }
      );
    }

    const {
      customerInfo = {},
      items = [],
      total,
      subtotal,
      tax,
      date,
      estimateMode = 'standard',
      customRemarks,
    } = JSON.parse(rawBody);

    const maxAllowedItems = estimateMode === 'dlcare' ? 14 : 16;
    if (!Array.isArray(items) || items.length > maxAllowedItems) {
      return NextResponse.json(
        {
          error: `Excelテンプレートの明細行数上限（${
            estimateMode === 'dlcare' ? 'DL Careモードは最大14行' : '通常モードは最大16行'
          }）を超えています（現在 ${Array.isArray(items) ? items.length : 0} 行）。`,
        },
        { status: 400 }
      );
    }

    const templatePath = path.join(process.cwd(), 'public', 'テンプレート.xlsx');

    // XlsxPopulate は元のファイル（画像、テキストボックス、WordArt等）を一切壊さずにセルのみを書き換えます
    const workbook = await XlsxPopulate.fromFileAsync(templatePath);
    const sheet = workbook.sheet(0);
    if (!sheet) {
      throw new Error('Sheet not found');
    }

    // 3. Excel数式インジェクション対策（sanitizeForSpreadsheetCell）を全セルに適用
    const safeCompany = sanitizeForSpreadsheetCell(
      formatCompanyName(customerInfo.companyName || ''),
      120
    );
    const safePostal = sanitizeForSpreadsheetCell(customerInfo.postalCode || '', 20);
    const safeAddress = sanitizeForSpreadsheetCell(customerInfo.address || '', 200);
    const safeDelivery = sanitizeForSpreadsheetCell(customerInfo.deliveryPlace || '', 100);
    const safeValidity = sanitizeForSpreadsheetCell(customerInfo.validity || '', 50);
    const safePayment = sanitizeForSpreadsheetCell(customerInfo.paymentTerms || '', 100);
    const safeDate = sanitizeForSpreadsheetCell(date || '', 40);
    const safeStaff = sanitizeForSpreadsheetCell(customerInfo.personInCharge || '', 50);

    sheet.cell('A3').value(`${safeCompany}　御中`);
    sheet.cell('A4').value(`住所　〒${safePostal}`);
    sheet.cell('A5').value(safeAddress);
    sheet.cell('B6').value(safeDelivery);
    sheet.cell('B7').value(safeValidity);
    sheet.cell('B9').value(safePayment);
    sheet.cell('F2').value(safeDate);
    sheet.cell('F13').value('担当：' + safeStaff);

    const safeTotal = sanitizeSafeNumber(total);
    const safeSubtotal = sanitizeSafeNumber(subtotal);
    const safeTax = sanitizeSafeNumber(tax);

    sheet.cell('B13').value(safeTotal);

    // 明細行（16〜31行目）を一旦クリア
    for (let rowNum = 31; rowNum >= 16; rowNum--) {
      sheet.cell(`A${rowNum}`).value(undefined);
      sheet.cell(`D${rowNum}`).value(undefined);
      sheet.cell(`E${rowNum}`).value(undefined);
      sheet.cell(`F${rowNum}`).value(undefined);
    }

    if (estimateMode === 'dlcare') {
      // 従来のDL Care保守内訳モード
      sheet.cell('A16').value('ソフトウェア保守サービス DL Care(年額）');
      sheet.cell('D16').value(1);
      sheet.cell('F16').value(undefined);
      sheet.cell('A17').value('【内訳（対象ソフトウェア）】');
      sheet.cell('F17').value(undefined);

      items.forEach((item: any, index: number) => {
        const rowNum = 18 + index;
        if (rowNum > 31) return;
        const isLastRow = index === items.length - 1;
        let rawName = String(item?.name || '');
        if (/^[┣┗]/.test(rawName)) {
          rawName = (isLastRow ? '┗' : '┣') + rawName.slice(1);
        }
        const safeName = sanitizeForSpreadsheetCell(rawName, 200);
        const safeRemarks = sanitizeForSpreadsheetCell(item?.remarks, 150);
        const displayName = safeRemarks ? `${safeName}（${safeRemarks}）` : safeName;
        sheet.cell(`A${rowNum}`).value(displayName);
        const itemPrice = sanitizeSafeNumber(item?.price);
        const itemUnitPrice =
          item?.unitPrice !== undefined
            ? sanitizeSafeNumber(item.unitPrice)
            : itemPrice;
        if (itemPrice !== 0) {
          sheet.cell(`E${rowNum}`).value(itemUnitPrice);
          sheet.cell(`F${rowNum}`).value(itemPrice);
        }
      });
    } else {
      // 通常見積モード（データロジック製品見積）
      items.forEach((item: any, index: number) => {
        const rowNum = 16 + index;
        if (rowNum > 31) return;
        const safeName = sanitizeForSpreadsheetCell(item?.name, 150);
        const safeRemarks = sanitizeForSpreadsheetCell(item?.remarks, 150);
        const displayName = safeRemarks ? `${safeName}（${safeRemarks}）` : safeName;
        sheet.cell(`A${rowNum}`).value(displayName);

        if (item?.quantity !== undefined && item?.quantity !== null && item?.quantity !== '') {
          const safeQty = sanitizeSafeNumber(item.quantity, 0, 100000);
          const safeUnit = sanitizeForSpreadsheetCell(item?.unit, 20);
          const qtyText = safeUnit ? `${safeQty}${safeUnit}` : safeQty;
          sheet.cell(`D${rowNum}`).value(qtyText);
        }

        const itemPrice = sanitizeSafeNumber(item?.price);
        const itemUnitPrice = sanitizeSafeNumber(item?.unitPrice);
        if (itemPrice !== 0 || itemUnitPrice !== 0) {
          if (itemUnitPrice !== 0) {
            sheet.cell(`E${rowNum}`).value(itemUnitPrice);
          }
          if (itemPrice !== 0) {
            sheet.cell(`F${rowNum}`).value(itemPrice);
          }
        }
      });
    }

    sheet.cell('F32').value(safeSubtotal);
    sheet.cell('F33').value(safeTax);
    sheet.cell('F34').value(safeTotal);

    // 備考欄の更新（指定がある場合）
    if (Array.isArray(customRemarks) && customRemarks.length > 0) {
      for (let r = 36; r <= 40; r++) {
        sheet.cell(`A${r}`).value(undefined);
      }
      customRemarks.slice(0, 5).forEach((line: string, idx: number) => {
        sheet.cell(`A${36 + idx}`).value(sanitizeForSpreadsheetCell(line, 250));
      });
    }

    const buffer = await workbook.outputAsync();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="estimate.xlsx"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate, private',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error: any) {
    console.error('Export Error:', error);
    return NextResponse.json(
      { error: 'Excel見積書の生成中にエラーが発生しました。' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
