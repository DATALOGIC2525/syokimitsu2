# タスクリスト：PDFレイアウト崩れの解消（標準印刷への回帰）

- `[x]` `page.tsx` から `html2canvas`, `jspdf` 関連のコードと状態変数を削除する
- `[x]` `handlePrint` 関数の中身を `window.print()` のみに戻す
- `[x]` `printSection` の不要なスタイルと `ref` を削除する
- `[x]` `package.json` から不要になったライブラリ (`html2canvas`, `jspdf`) をアンインストールする
- `[x]` 動作検証
