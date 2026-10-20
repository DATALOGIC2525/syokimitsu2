import type { NextConfig } from 'next';

const securityHeaders = [
  // XSS（クロスサイトスクリプティング）・不正スクリプト実行の防止
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https:",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self' https://accounts.google.com",
      "object-src 'none'",
    ].join('; '),
  },
  // クリックジャッキング攻撃（iframe埋め込み）の完全遮断
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  // MIMEタイプ・スニッフィング攻撃の防止
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  // リファラーからの機密URLパラメータ漏洩の防止
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  // カメラ・マイク・位置情報・USB等の不要なブラウザAPI権限を完全遮断
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
  },
  // HTTPS通信の強制（HSTS：中間者攻撃防止）
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  // DNSプリフェッチによる情報漏洩防止
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'off',
  },
  // クロスオリジン分離保護
  {
    key: 'Cross-Origin-Opener-Policy',
    value: 'same-origin',
  },
];

const nextConfig: NextConfig = {
  // X-Powered-By: Next.js ヘッダーを非表示にしてサーバー構成情報の漏洩を防止
  poweredByHeader: false,
  // 本番ビルド時のブラウザ向けソースマップ出力を無効化し、ソースコード解析を防止
  productionBrowserSourceMaps: false,
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
