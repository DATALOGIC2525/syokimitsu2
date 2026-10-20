import { NextResponse } from 'next/server';
import Papa from 'papaparse';
import { enforceApiSecurity, sanitizeText } from '@/lib/security';

export async function GET(req: Request) {
  // 1. ゼロトラストAPIセキュリティ検証（認証・レート制限）
  const guardResponse = await enforceApiSecurity(req, {
    bucketName: 'api_customers',
    maxRequestsPerMin: 20,
    requireCsrfCheck: false,
  });
  if (guardResponse) return guardResponse;

  // 2. スプレッドシートIDの検証（SSRF防止）
  const sheetId =
    process.env.CUSTOMER_SPREADSHEET_ID || '1bJjoseWQniJzagf4AwawYiD4zHXR3Rf8pBmnrrZyFOU';
  if (!/^[a-zA-Z0-9_-]{20,80}$/.test(sheetId)) {
    return NextResponse.json({ error: 'Invalid configuration' }, { status: 500 });
  }

  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=0`;

  try {
    // タイムアウト付きフェッチ（10秒で中断しサーバーリソース枯渇を防止）
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(url, {
      cache: 'no-store',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Upstream status: ${res.status}`);
    }
    const text = await res.text();

    const parsed = await new Promise<any[]>((resolve, reject) => {
      Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => resolve(results.data as any[]),
        error: (err: any) => reject(err),
      });
    });

    const data = parsed
      .slice(0, 5000) // 最大件数制限
      .map((row: any) => {
        const ownedSoftware: { name: string; count: string }[] = [];
        for (const key in row) {
          if (key.endsWith(']台数') && row[key] && String(row[key]).trim() !== '') {
            const match = key.match(/\[(.*?)\]/);
            const softName = match ? match[1] : key.replace('台数', '').trim();
            ownedSoftware.push({
              name: sanitizeText(softName, 100),
              count: sanitizeText(row[key], 30),
            });
          }
        }
        return {
          id: sanitizeText(row['ﾌｧｲﾙNo.'], 40),
          companyName: sanitizeText(row['ユーザー名'], 120),
          furigana: sanitizeText(row['ふりがな'], 120),
          postalCode: sanitizeText(row['郵便番号'], 20),
          address: sanitizeText(row['住所'], 200),
          tel: sanitizeText(row['TEL'], 30),
          ownedSoftware,
        };
      })
      .filter((row: any) => row.id && row.companyName);

    return NextResponse.json(
      { data },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, private',
        },
      }
    );
  } catch (error) {
    console.error('Customer API Error:', error);
    return NextResponse.json(
      { error: '顧客データの取得に失敗しました。' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
