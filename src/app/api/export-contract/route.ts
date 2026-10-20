import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import PizZip from 'pizzip';
import {
  enforceApiSecurity,
  sanitizeSafeNumber,
  sanitizeText,
} from '@/lib/security';

function escapeXml(str: string) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function POST(req: Request) {
  // 1. ゼロトラストAPIセキュリティ検証（認証・CSRF Origin検査・レート制限）
  const guardResponse = await enforceApiSecurity(req, {
    bucketName: 'api_export_contract',
    maxRequestsPerMin: 20,
    requireCsrfCheck: true,
  });
  if (guardResponse) return guardResponse;

  try {
    // 2. ペイロードサイズ検証（巨大JSONによるDoS攻撃防止）
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
      contractYear,
      contractMonth,
      contractAmount,
      specialNotes = '',
      real4Count,
    } = JSON.parse(rawBody);

    if (!Array.isArray(items) || items.length > 50) {
      return NextResponse.json(
        { error: '明細データ形式が不正です。' },
        { status: 400 }
      );
    }

    const originalPath = path.join(process.cwd(), 'ソフトウエア保守契約書 _原本.docx');
    const content = fs.readFileSync(originalPath);

    const zip = new PizZip(content);
    let xmlContent = zip.file('word/document.xml')!.asText();

    // 1. 契約期間（数値バリデーション＋XMLエスケープ）
    const now = new Date();
    const safeYear = sanitizeSafeNumber(contractYear || now.getFullYear(), 2000, 2100);
    const safeMonth = sanitizeSafeNumber(contractMonth || now.getMonth() + 1, 1, 12);
    const startYearStr = escapeXml(String(safeYear));
    const startMonthStr = escapeXml(String(safeMonth));

    xmlContent = xmlContent.replace('<w:t>2026</w:t>', `<w:t>${startYearStr}</w:t>`);
    xmlContent = xmlContent.replace('<w:t>3</w:t>', `<w:t>${startMonthStr}</w:t>`);

    // 2. 契約金額（XMLエスケープ）
    let amountValStr = '0';
    if (typeof contractAmount === 'number') {
      amountValStr = sanitizeSafeNumber(contractAmount, 0, 1_000_000_000).toLocaleString();
    } else if (typeof contractAmount === 'string') {
      amountValStr = sanitizeText(contractAmount, 30).replace(/[^\d,]/g, '') || '0';
    }
    xmlContent = xmlContent.replace(
      '<w:t>120,000</w:t>',
      `<w:t>${escapeXml(amountValStr)}</w:t>`
    );

    // 3. 特約事項 (Row 6)（XMLインジェクション防止のため全行を厳格にエスケープ）
    const safeSpecialNotes = sanitizeText(specialNotes, 2000);
    if (safeSpecialNotes) {
      const lines = safeSpecialNotes
        .split('\n')
        .map((l: string) => l.trim())
        .filter((l: string) => l.length > 0)
        .slice(0, 15);
      const paragraphsXml = lines
        .map(
          (line: string) =>
            `<w:p><w:pPr><w:widowControl/><w:jc w:val="left"/><w:rPr><w:rFonts w:asciiTheme="minorEastAsia" w:eastAsiaTheme="minorEastAsia" w:hAnsiTheme="minorEastAsia" w:cs="ＭＳ Ｐゴシック"/><w:color w:val="000000"/><w:kern w:val="0"/><w:sz w:val="20"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:asciiTheme="minorEastAsia" w:eastAsiaTheme="minorEastAsia" w:hAnsiTheme="minorEastAsia" w:cs="ＭＳ Ｐゴシック"/><w:color w:val="000000"/><w:kern w:val="0"/><w:sz w:val="20"/></w:rPr><w:t xml:space="preserve">${escapeXml(line)}</w:t></w:r></w:p>`
        )
        .join('');

      xmlContent = xmlContent.replace(
        /(<w:tr[\s\S]*?特約事項[\s\S]*?<w:tc><w:tcPr>[\s\S]*?<\/w:tcPr>)([\s\S]*?)(<\/w:tc>)/,
        (match, tcPr, oldBody, tcEnd) => {
          const cleanTcPr = tcPr.replace(/<w:noWrap\/>/g, '');
          return `${cleanTcPr}${paragraphsXml}${tcEnd}`;
        }
      );
    }

    // 4. REAL4 数量 & マーク
    let real4CountNum = '1';
    let isReal4Present = false;

    const normalizeStr = (s: string) =>
      sanitizeText(s, 200)
        .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfeE0))
        .toUpperCase();

    if (real4Count !== undefined && real4Count !== null && Number(real4Count) > 0) {
      isReal4Present = true;
      real4CountNum = String(sanitizeSafeNumber(real4Count, 1, 9999));
    } else {
      const real4Item = items.find((it: any) => {
        const name = typeof it === 'string' ? it : it?.name || '';
        const clean = normalizeStr(name);
        return clean.includes('REAL');
      });

      if (real4Item) {
        isReal4Present = true;
        const itemName = typeof real4Item === 'string' ? real4Item : real4Item?.name || '';
        const normalizedItemName = normalizeStr(itemName);
        let match = normalizedItemName.match(/(\d+)\s*台/);
        if (match) {
          real4CountNum = match[1];
        } else {
          match = normalizedItemName.match(/(\d+)/);
          if (match) {
            real4CountNum = match[1];
          }
        }
      }
    }

    const safeReal4CountXml = escapeXml(real4CountNum.replace(/[^\d]/g, '') || '1');

    if (isReal4Present) {
      xmlContent = xmlContent.replace(
        /(<w:tr[\s\S]*?REAL4[\s\S]*?<w:t>■<\/w:t>[\s\S]*?<w:t>)1(<\/w:t>)/,
        `$1${safeReal4CountXml}$2`
      );
    } else {
      xmlContent = xmlContent.replace(
        /(<w:tr[\s\S]*?REAL4[\s\S]*?<w:t>)■(<\/w:t>[\s\S]*?<w:t>)1(<\/w:t>)/,
        `$1□$2―$3`
      );
    }

    // 5. その他 6 ソフトの ■ マーク設定
    const itemNames: string[] = items.map((it: any) =>
      sanitizeText(typeof it === 'string' ? it : it?.name || '', 200)
    );

    const isMitsumori = itemNames.some((name) => {
      const clean = name.replace(/[\s\u3000]+/g, '').toUpperCase();
      if (clean.includes('OA') || clean.includes('原価管理')) return false;
      return clean.includes('見積積算') || clean.includes('最適取合');
    });

    const isOA = itemNames.some((name) => {
      const clean = name.replace(/[\s\u3000]+/g, '').toUpperCase();
      return clean.includes('OA') || clean.includes('原価管理');
    });

    const isNC = itemNames.some((name) => {
      const clean = name.replace(/[\s\u3000]+/g, '').toUpperCase();
      return clean.includes('NC') || clean.includes('あなあけ');
    });

    const isArris = itemNames.some((name) => {
      const clean = name.replace(/[\s\u3000]+/g, '').toUpperCase();
      return clean.includes('ARRIS');
    });

    const isShukkaku = itemNames.some((name) => {
      const clean = name.replace(/[\s\u3000]+/g, '').toUpperCase();
      return clean.includes('出荷');
    });

    const isWeld = itemNames.some((name) => {
      const clean = name.replace(/[\s\u3000]+/g, '').toUpperCase();
      return clean.includes('溶接') || clean.includes('ロボット');
    });

    function setSoftwareSymbol(xml: string, keyword: string, isChecked: boolean) {
      const symbol = isChecked ? '■' : '□';
      const rowRegex = new RegExp(`(<w:tr[\\s\\S]*?${keyword}[\\s\\S]*?<w:t>)□(<\\/w:t>)`);
      return xml.replace(rowRegex, `$1${symbol}$2`);
    }

    xmlContent = setSoftwareSymbol(xmlContent, '見積積算', isMitsumori);
    xmlContent = setSoftwareSymbol(xmlContent, 'OAシステム', isOA);
    xmlContent = setSoftwareSymbol(xmlContent, 'あな', isNC);
    xmlContent = setSoftwareSymbol(xmlContent, 'Arris', isArris);
    xmlContent = setSoftwareSymbol(xmlContent, '出荷計画', isShukkaku);
    xmlContent = setSoftwareSymbol(xmlContent, '溶接', isWeld);

    zip.file('word/document.xml', xmlContent);

    const buf = zip.generate({
      type: 'nodebuffer',
      compression: 'DEFLATE',
    });

    let company = sanitizeText(customerInfo.companyName || '〇〇', 80).replace(
      /[\\/:*?"<>|]/g,
      '_'
    );
    if (!company.endsWith('様')) {
      company = `${company}様`;
    }
    const fileName = `DL Care契約書_${company}_${startYearStr}年${startMonthStr}月.docx`;
    const encodedFileName = encodeURIComponent(fileName);

    return new NextResponse(new Uint8Array(buf), {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${encodedFileName}"; filename*=UTF-8''${encodedFileName}`,
        'Cache-Control': 'no-store, no-cache, must-revalidate, private',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error: any) {
    console.error('Contract Export Error:', error);
    return NextResponse.json(
      { error: 'Word契約書の生成中にエラーが発生しました。' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
