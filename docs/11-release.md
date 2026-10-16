# フェーズ11 公開記録

公開対象：`phase-11-01/`。公開予定URL：<https://onishi.github.io/shoot-mata/>。

## 公開構成

- GitHub PagesのGitHub Actions方式を使用する。
- `.github/workflows/pages.yml` が `phase-11-01/` をNode.js 24でビルドし、`dist/` だけをPages artifactとして公開する。
- Viteの `base: './'` により、`/shoot-mata/` 以下でもHTML、CSS、JavaScript、faviconを相対参照する。
- ゲーム固有のサーバー、アカウント、データベース、解析、Cookie、永続保存、外部APIは使用しない。

## 公開前チェック

- [x] `phase-11-01` の型チェック・テスト・方針比較・ビルドが成功
- [x] OGP、favicon、description、canonical URL、共有導線を確認
- [ ] GitHub PagesをGitHub Actions方式で有効化
- [ ] Pagesのbuild・deployジョブが成功
- [ ] 公開URLでHTML、CSS、JavaScript、OGP画像、favicon、第三者通知が200応答
- [ ] PC・縦長・横長で開始、切替、バースト、ポーズ、結果、再挑戦を確認
- [ ] ブラウザのコンソールエラーと意図しない外部通信がない

## 更新手順

1. `phase-11-01/` で `npm ci`、`npm run typecheck`、`npm test`、`npm run playtest`、`npm run build` を実行する。
2. 変更をmainへpushする。
3. `Deploy GitHub Pages` workflowのbuildとdeployが成功したことを確認する。
4. 公開URLで主要フローとアセット応答を確認する。
5. 固定名のOGPやfaviconを変更する場合は、CDNや共有サービスのキャッシュを避けるためファイル名も更新する。JavaScriptとCSSはViteの内容ハッシュで更新される。

## ロールバック

公開後に重大な問題が見つかった場合は、問題を含む公開コミットを `git revert` してmainへpushする。Pages workflowが直前のリリース可能なソースを再ビルド・再配信した後、公開URLのアセットと主要フローを再確認する。履歴を書き換えるresetやforce pushは使わない。

## データ取扱い

ゲーム本体は閲覧・プレイ情報を保存または外部送信しない。Web Share APIはプレイヤーがSHAREを押した場合だけOSの共有画面を開き、非対応環境では公開URLを端末のクリップボードへ書き込む。共有先への送信はプレイヤー自身の操作で確定する。

ホスティングはGitHub Pagesであり、配信に伴うIPアドレス等の処理は[GitHub Privacy Statement](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement)に従う。ゲームからGitHubの配信ログへ追加情報を送る処理はない。

## v1.0.0 リリースノート

- 約3分のSTAGE 01、軽量機・耐久機・ボスを収録。
- WIDE／FOCUS切替、エネルギー回収、バースト、スコア、残機を実装。
- キーボードとタッチ、縦長・横長表示、ポーズ、音声ON/OFF、結果・再挑戦に対応。
- OGP、favicon、共有導線、第三者ライセンス通知を含む静的な公開版。

## 未確認事項・制約

公開前のため、本番URLとGitHub Pages固有の応答は未確認。物理端末の操作感、実ノッチ、表示完了までの遅延、主観的な聴感・楽しさ、押下中の実タブ切替はフェーズ10までと同じく測定していない。
