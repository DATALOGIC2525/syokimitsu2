import { auth } from '@/auth';
import { NextResponse } from 'next/server';

export default auth((req) => {
  try {
    const { pathname } = req.nextUrl;

    // ログインページとNextAuthの認証エンドポイントのみ未認証アクセスを許可
    if (pathname.startsWith('/login') || pathname.startsWith('/api/auth')) {
      return NextResponse.next();
    }

    // 未認証の場合の遮断処理（Fail-Closed）
    if (!req.auth || !req.auth.user) {
      // APIエンドポイントへの不正アクセスは401 JSONで即座に拒否
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { error: 'Unauthorized: 認証が必要です。' },
          { status: 401, headers: { 'Cache-Control': 'no-store' } }
        );
      }

      // 画面へのアクセスはログイン画面へリダイレクト
      const signInUrl = new URL('/login', req.nextUrl.origin);
      return NextResponse.redirect(signInUrl);
    }

    const response = NextResponse.next();
    // 機密データ画面が共用PCのブラウザキャッシュに残らないよう保護
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    return response;
  } catch (err) {
    // 【重要】エラー発生時も素通し（Fail-Open）せず、必ず遮断（Fail-Closed）する
    console.error('Security Middleware Error:', err);
    if (req?.nextUrl?.pathname?.startsWith('/api/')) {
      return NextResponse.json({ error: 'Authentication check failed' }, { status: 401 });
    }
    const fallbackUrl = new URL('/login', req.nextUrl.origin);
    return NextResponse.redirect(fallbackUrl);
  }
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
