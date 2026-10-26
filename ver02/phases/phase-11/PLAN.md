# Phase 11 plan — 公開

状態: 完了（2026-10-26）

## 目的

Phase 10で合格した固定release candidate `phase10-rc1-20261024`だけを既存のGitHub Pages本番へ公開し、公開物の同一性、主要フロー、メタデータ、権利通知、データ取扱い、復旧可能性を確認する。

## 対象

- 本番URL: `https://onishi.github.io/shoot-mata/`
- v02入口: `https://onishi.github.io/shoot-mata/game/public/`
- 公開対象: `ver02/game/dist/`（100 files、10,526,479 bytes）
- build ID: `phase10-rc1-20261024`
- 製品version: `2.0.0`
- REL-04〜06の本番証拠、リリースノート、ロールバック手順

## 非対象

- 固定RCのゲームコード、素材、設定、manifestの変更
- 分析、Cookie、外部API、サーバー保存の追加
- Safari desktop、iOS／Android実機、物理低性能実機を確認済みとすること
- 未測定の楽しさ、操作感、聴感、美しさを確認済みとすること

## 作業単位

1. [x] 手動確認付きPages workflow、version付きリリースノート、固定v01復旧経路を用意する。
2. [x] 本番のmanifestと全100ファイルをSHA-256で固定RCへ照合する監査を用意する。
3. [x] 公開対象、URL、復旧手順を確認してからv02 workflowを手動実行する。
4. [x] Actionsのbuild/deploy成功と公開URLの全ファイル同一性を確認する。
5. [x] Chrome系でkeyboard／Pointer Eventsの4面campaign、PC／縦長／横長、pause／復帰、ending／creditsを確認する。
6. [x] version、変更点、既知問題、build ID、権利通知、データ取扱いを本番とrelease記録で照合する。
7. [x] ロールバックをdry-runし、Phase 11 review、受け入れマトリクス、開発ログを更新する。

## 完了条件

- `release.json`が本番deployment、workflow run、commit、公開日時、全ファイル監査、ブラウザsmokeを追跡する。
- 公開manifestのraw SHA-256、build ID、file count、total bytesと全配信ファイルのSHA-256がPhase 10 RCに一致する。
- 公開URLで4面campaignの主要フローを完走し、console error、欠落resource、意図しない外部originが0件である。
- `RELEASE_NOTES.md`のversion、変更点、既知リスク、build ID、権利・データ取扱いが公開物と矛盾しない。
- `ROLLBACK.md`の固定v01経路を同一workflowの公開前buildで検証し、履歴を書き換えず復旧できる。
- REL-04〜06に証拠を紐付ける。未実測環境と主観品質は残存リスクのまま保持する。

## 確認方法

公開前に`ver02/game`で`npm run verify`を実行する。公開後は`npm run audit:production`で本番全ファイルを照合し、実ブラウザで`?qa=campaign&input=keyboard`と`?qa=campaign&input=touch`をPC、390×844、844×390で確認する。GitHub Actionsのrun URL、deployment ID、公開commit、ブラウザversion、console／network結果を`release.json`へ記録する。

外部公開はREADMEの作業ルールに従い、対象と手順を明示してから手動起動する。workflowはpushでは起動しない。

2026-10-26の初回手動run `40262742358` はdeploy前に停止した。fresh checkoutにはgitignore済み`dist/`がなく、`verify`がbuildより先に成果物監査testを実行して`build-manifest.json`を読めなかったことが原因である。`verify`をbuild→test→各監査の順へ修正し、公開物が置換されていないことを確認してから同じrelease入力で再実行する。

再実行run `40263130154` はcommit `12bc335fda0e56f089ed4869fbcb755d8d47ddef`でbuild・deployとも成功した。公開後の`audit:production`初回実行ではCLI入口がstrict JSON parserの旧名をimportして停止したため、実在する`parseJsonWithUniqueKeys`へ訂正して再監査する。Pages配信処理そのものへの影響はない。

訂正後の本番監査はmanifestと全100ファイル、10,526,479 bytesのSHA-256一致に合格した。Chrome 156.0.8078.48でkeyboard／Pointer Eventsを1568×956、390×844、844×390の各viewportから4面、ending、creditsまで計6 campaign完走し、pause／復帰、overflow、resource、外部origin、consoleも確認した。固定v1.0.0は一時ディレクトリ上で33テスト、playtest、production buildに合格し、本番へは配信していない。詳細は`release.json`と`REVIEW.md`に記録する。
