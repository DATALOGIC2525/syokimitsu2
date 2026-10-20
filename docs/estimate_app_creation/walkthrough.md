# ショキミツ システム管理マニュアル

## システム概要

| 項目 | 内容 |
|------|------|
| アプリ名 | ショキミツ（DLCare見積もり作成ツール） |
| 本番URL | Vercelのダッシュボードで確認 |
| GitHubリポジトリ | https://github.com/DATALOGIC2525/syokimitsu2525 |
| フレームワーク | Next.js 16 (App Router) + TypeScript |
| デプロイ先 | Vercel（Hobbyプラン） |

---

## ログイン・認証

- **方式**：Googleアカウント（OAuth 2.0）
- **許可ドメイン**：`datalogic.co.jp`（この設定は Vercel 環境変数 `ALLOWED_EMAIL_DOMAIN` で変更可能）
- `@datalogic.co.jp` のGoogleアカウントであれば誰でもログイン可能

---

## データの管理場所

### A：Googleスプレッドシート（顧客情報）
- **URL**: https://docs.google.com/spreadsheets/d/1bJjoseWQniJzagf4AwawYiD4zHXR3Rf8pBmnrrZyFOU
- ここを更新すると、ショキミツの顧客検索・所持ソフトメモに反映される（最大5分遅延）
- 会社名の「㈱」「㈲」は自動で「株式会社」「有限会社」に変換される

### B：ブラウザ内（製品マスタ）
- 「⚙️ 製品マスタ設定」ボタンから変更可能
- ブラウザのLocalStorageに保存されるため、**ブラウザを変えると設定が引き継がれない**
- 製品マスタは各端末で個別に設定が必要

### C：Excelテンプレート
- `public/テンプレート.xlsx` がテンプレートファイル
- テンプレートを変更したい場合はこのファイルを置き換えてGitHubにプッシュする

---

## コードの更新・デプロイ手順

コードを変更したい場合：

```powershell
# 1. ファイルを編集後、プロジェクトフォルダで実行
cd D:\ソフト開発\syokimitsu

# 2. 変更をGitにコミット
git add .
git commit -m "変更内容のメモ"

# 3. GitHubにプッシュ（Vercelが自動的に再デプロイ）
git push
```

> プッシュするだけでVercelが自動的に新しいバージョンをデプロイします。

---

## 自動計算ロジック

| 製品種別 | 計算方式 | 備考 |
|---------|---------|------|
| REAL4 Type1〜5 | 段階価格（Tiered） | 1台:12万、2台:15万、3台:18万、4台:21万、**5台以上:24万で固定** |
| NCあなあけ・その他 | 固定価格（Flat） | 台数を増やしても価格は変わらない |
| Arris | 金額非表示 | 「金額非表示」フラグONのため、金額が0円として計算・非表示 |

---

## Vercel 環境変数

| 変数名 | 用途 |
|-------|------|
| `AUTH_GOOGLE_ID` | Google OAuthクライアントID |
| `AUTH_GOOGLE_SECRET` | Google OAuthシークレット |
| `AUTH_SECRET` | NextAuthセッション暗号化キー（変更不要） |
| `ALLOWED_EMAIL_DOMAIN` | ログイン許可ドメイン（例：`datalogic.co.jp`） |
| `NEXTAUTH_URL` | 本番URL |

> **環境変数を変更した場合は Vercel で「Redeploy」が必要**

---

## Google Cloud Console 管理

- **URL**: https://console.cloud.google.com
- プロジェクト名：syokimitsu（または作成時の名前）
- OAuthクライアントのリダイレクトURIは Vercel の URL に合わせること

> Vercelの本番URLが変わった場合は、Google Cloud ConsoleのリダイレクトURIも更新が必要

---

## よくあるトラブルと対処法

| 症状 | 原因 | 対処 |
|------|------|------|
| ログインできない | ドメインが違う or 環境変数が間違い | Vercel環境変数を確認・再Redeploy |
| 顧客情報が反映されない | Googleスプレッドシートのキャッシュ遅延 | 数分待って再検索 |
| Excel出力でロゴが消える | テンプレートファイルの破損 | `public/テンプレート.xlsx` を正しいものに置き換え |
| 自動計算が動かない | 製品マスタとの紐付けが外れている | 製品セレクトをマスタから再選択 |
| 価格が変わらない | 「自動」チェックがOFFになっている | 明細行の「自動」チェックボックスをONにする |

---

## ローカル開発環境の起動

```powershell
cd D:\ソフト開発\syokimitsu
npm run dev
# → http://localhost:3000 でアクセス可能
```

ローカルでGoogleログインを使う場合は `.env.local` に環境変数が必要（`.env.local.example` を参照）。

---

## バックアップ

バックアップは `D:\ソフト開発\syokimitsu_backup_20260324` に保存済み。
コードの履歴はGitHubで管理されているため、過去のバージョンへの戻しも可能。
