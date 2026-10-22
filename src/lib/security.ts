import { NextResponse } from 'next/server';
import { auth } from '@/auth';

/**
 * IP・エンドポイント別のインメモリ・レートリミッター（スライディングウィンドウ方式）
 * ブルートフォース攻撃・DoS・大量データスクレイピングを防止します。
 */
type RateRecord = {
  timestamps: number[];
};

const rateLimitStore = new Map<string, RateRecord>();
const CLEANUP_INTERVAL_MS = 60 * 1000;
let lastCleanup = Date.now();

function cleanupRateLimitStore(windowMs: number) {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  for (const [key, record] of rateLimitStore.entries()) {
    const valid = record.timestamps.filter((t) => now - t < windowMs);
    if (valid.length === 0) {
      rateLimitStore.delete(key);
    } else {
      record.timestamps = valid;
    }
  }
}

export function getClientIp(req: Request): string {
  // Cloudflare経由の場合は改ざん不可能な cf-connecting-ip を最優先で取得
  const cfIp = req.headers.get('cf-connecting-ip');
  if (cfIp) {
    return cfIp.trim();
  }
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = req.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }
  return '127.0.0.1';
}

export function checkRateLimit(
  req: Request,
  bucketName: string,
  maxRequests: number = 30,
  windowMs: number = 60 * 1000
): { allowed: boolean; retryAfterSec: number; remaining: number } {
  cleanupRateLimitStore(windowMs);
  const ip = getClientIp(req);
  const key = `${bucketName}:${ip}`;
  const now = Date.now();

  const record = rateLimitStore.get(key) || { timestamps: [] };
  record.timestamps = record.timestamps.filter((t) => now - t < windowMs);

  if (record.timestamps.length >= maxRequests) {
    const oldest = record.timestamps[0];
    const retryAfterSec = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
    rateLimitStore.set(key, record);
    return { allowed: false, retryAfterSec, remaining: 0 };
  }

  record.timestamps.push(now);
  rateLimitStore.set(key, record);
  return {
    allowed: true,
    retryAfterSec: 0,
    remaining: Math.max(0, maxRequests - record.timestamps.length),
  };
}

/**
 * CSRF対策：POSTリクエスト等の Origin / Referer ヘッダーが自サイトと一致するか検証します。
 */
export function verifySameOrigin(req: Request): boolean {
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
  if (!host) return false;

  const origin = req.headers.get('origin');
  if (origin) {
    try {
      const originUrl = new URL(origin);
      return originUrl.host === host;
    } catch {
      return false;
    }
  }

  const referer = req.headers.get('referer');
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      return refererUrl.host === host;
    } catch {
      return false;
    }
  }

  // Origin も Referer も存在しないクロスサイトPOSTは拒否
  return false;
}

/**
 * サーバーサイドAPI認証・CSRF・レート制限の一括ガード（Zero-Trust API Guard）
 * ミドルウェアバイパス攻撃（CVE-2025-29927等）に対抗するため、各APIルート内部でも必ず呼び出します。
 */
export async function enforceApiSecurity(
  req: Request,
  options: {
    bucketName: string;
    maxRequestsPerMin?: number;
    requireCsrfCheck?: boolean;
  }
): Promise<NextResponse | null> {
  // 1. レート制限チェック
  const rate = checkRateLimit(req, options.bucketName, options.maxRequestsPerMin ?? 30, 60 * 1000);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: 'リクエスト回数が上限を超えました。しばらく待ってから再試行してください。' },
      {
        status: 429,
        headers: {
          'Retry-After': String(rate.retryAfterSec),
          'Cache-Control': 'no-store',
        },
      }
    );
  }

  // 2. 変更・生成系リクエスト（POST等）のCSRF Origin検証
  if (options.requireCsrfCheck && req.method !== 'GET' && req.method !== 'HEAD') {
    if (!verifySameOrigin(req)) {
      return NextResponse.json(
        { error: '不正な送信元（Origin）からのリクエストが遮断されました。' },
        { status: 403, headers: { 'Cache-Control': 'no-store' } }
      );
    }
  }

  // 3. セッション認証の検証（Zero-Trust）
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json(
        { error: '認証が必要です。再度ログインしてください。' },
        { status: 401, headers: { 'Cache-Control': 'no-store' } }
      );
    }
  } catch {
    return NextResponse.json(
      { error: '認証セッションの検証に失敗しました。' },
      { status: 401, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  return null;
}

/**
 * 制御文字・危険な文字を除去し、最大文字数を制限するサニタイズ関数
 */
export function sanitizeText(input: unknown, maxLength: number = 200): string {
  if (typeof input !== 'string') {
    if (input === null || input === undefined) return '';
    return String(input).slice(0, maxLength);
  }
  // NULLバイトや不要な制御文字（改行・タブ以外）を除去
  return input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim().slice(0, maxLength);
}

/**
 * Excel / CSV 数式インジェクション（Formula Injection）防止関数
 * セルの先頭が '=', '+', '-', '@', '\t', '\r' で始まる場合、悪意あるコマンド実行を防ぐために無害化します。
 */
export function sanitizeForSpreadsheetCell(input: unknown, maxLength: number = 250): string {
  const cleaned = sanitizeText(input, maxLength);
  if (!cleaned) return '';
  if (/^[=+\-@\t\r]/.test(cleaned)) {
    return `'${cleaned}`;
  }
  return cleaned;
}

/**
 * 安全な数値バリデーション（NaNや極端なオーバーフロー値を防止）
 */
export function sanitizeSafeNumber(
  input: unknown,
  min: number = -1_000_000_000,
  max: number = 1_000_000_000
): number {
  const num = Number(input);
  if (!Number.isFinite(num)) return 0;
  return Math.min(max, Math.max(min, Math.trunc(num)));
}
