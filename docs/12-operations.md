# フェーズ12 運用記録

対象：<https://onishi.github.io/shoot-mata/>。ゲーム内解析や利用者識別を追加せず、公開状態と保守対象だけを点検する。

## 12-01 運用基準

`phase12/check-production.mjs` は次を確認する。

- ルートHTML、内容ハッシュ付きJavaScript・CSS、favicon、OGP、第三者通知が200応答する。
- HTMLに公開版v1.0.0、title、canonical URLが含まれる。
- 実行用アセットがGitHub Pagesと同一オリジンにあり、意図しない外部配信を参照しない。
- HTML 64KiB、JavaScript 250KiB、CSS 100KiB、favicon 32KiB、OGP 1.5MiB、第三者通知512KiBの上限を超えない。
- 各取得時間を記録する。共有ホスティングとネットワークに左右されるため、応答時間そのものは失敗条件にしない。

GitHub Actionsの `Production smoke check` は毎週月曜00:17 UTC（日本時間09:17）と手動実行で確認する。失敗時は対象URLを手元で再実行し、GitHub Pagesの状態、直前のデプロイ、同じコミットのGame checksを確認する。再現する場合は不具合としてバックログへ追加し、`docs/11-release.md` の手順で修正またはロールバックする。

```sh
node phase12/check-production.mjs
```

別環境の確認には `SHOOT_MATA_URL` を使える。末尾のスラッシュを含むベースURLを指定する。

## 2026-10-18 基準値

- ルートHTML：200、3,721 bytes、TTFB 0.280秒、全体0.280秒（単発の東京環境からの測定であり、実利用者のCore Web Vitalsではない）。
- 本番ビルド：JavaScript約20KiB、CSS約8KiB、OGP約1.0MiB、配布物全体約1.2MiB。OGPと第三者通知は初期画面の描画依存ではない。
- 公開画面のアクセシビリティ構造：main、見出し、名前付きのSHARE・SOUND・STARTボタン、ゲーム画面の説明を確認した。
- 専用のChrome performance trace機能が利用できないため、LCP、CLS、INPは未測定。現在の初期JavaScript・CSSは小さく、HTTP基準値にも異常がないため、このスライスでは最適化を行わない。
- `npm audit --omit=optional`：既知の脆弱性0件。
- 更新候補：Vite 7.3.6→7.3.7は同一メジャーのパッチ。Vite 8.3.4とTypeScript 7.0.2はメジャー更新のため、公開監視とは分けて互換性を検証する。

## データ取扱い

定期チェックは公開ファイルだけをGitHub Actionsから取得する。プレイヤーの端末、操作、IPアドレス、識別子、リトライ、離脱は収集しない。GitHub ActionsとGitHub Pages自体の処理はGitHubの運用・プライバシー条件に従う。
