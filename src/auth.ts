import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';

const ALLOWED_DOMAIN = (process.env.ALLOWED_EMAIL_DOMAIN || '').trim().toLowerCase();
const ALLOWED_EMAILS = process.env.ALLOWED_EMAILS
  ? process.env.ALLOWED_EMAILS.split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  : [];

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
      authorization: {
        params: {
          prompt: 'select_account',
        },
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    // セッション有効期限：8時間（業務終了後の放置端末からの不正利用・セッションハイジャック防止）
    maxAge: 8 * 60 * 60,
    updateAge: 60 * 60,
  },
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider !== 'google') {
        return false;
      }

      // Google側でメールアドレスが検証済み（email_verified === true）であることを必須化
      if (!profile?.email || profile.email_verified === false) {
        return false;
      }

      const email = profile.email.trim().toLowerCase();

      // 1. 個別の許可メールアドレスリストが設定されている場合
      if (ALLOWED_EMAILS.length > 0 && ALLOWED_EMAILS.includes(email)) {
        return true;
      }

      // 2. ドメイン制限が設定されている場合（完全一致の @domain チェック）
      if (ALLOWED_DOMAIN && email.endsWith(`@${ALLOWED_DOMAIN}`)) {
        return true;
      }

      // 3. どちらの環境変数も未設定の場合のみログイン許可
      if (!ALLOWED_DOMAIN && ALLOWED_EMAILS.length === 0) {
        return true;
      }

      return false;
    },
    async session({ session }) {
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
});
