# Phase 11 review — 公開

状態: 合格（2026-10-26）

## 公開結果

- version: `2.0.0`
- build ID: `phase10-rc1-20261024`
- production commit: `12bc335fda0e56f089ed4869fbcb755d8d47ddef`
- workflow run: `40263130154`
- deployment ID: `7323254407`
- published at: `2026-10-26T03:15:54Z`

Actionsのbuildとdeployは成功した。初回run `40262742358`はdeploy前のfresh checkout検証で停止しており、本番を置換していない。再実行だけを本番deploymentとして記録する。

## 固定RC同一性

`npm run audit:production`で本番のraw manifest SHA-256 `3c25733152691eadf21eaa5919a538c29919b5451a6d7045cf8420dde012e7ab`、build ID、100 files、10,526,479 bytesをPhase 10 RCへ照合した。manifestが列挙する全100ファイルもbyte数とSHA-256が一致し、差異は0件だった。

公開後監査CLIの初回実行はstrict JSON parserの旧import名により成果物取得前に停止した。実在する`parseJsonWithUniqueKeys`へ訂正し、全ローカル検証と本番監査を再実行した。配信artifactに変更はない。

## 本番ブラウザsmoke

Google Chrome 156.0.8078.48で次を確認した。

| 入力 | viewport | 結果 |
| --- | --- | --- |
| keyboard | 1568×956 | 4面→ending→credits合格 |
| keyboard | 390×844 | 4面→ending→credits合格 |
| keyboard | 844×390 | 4面→ending→credits合格 |
| Pointer Events | 1568×956 | 4面→ending→credits合格 |
| Pointer Events | 390×844 | 4面→ending→credits合格 |
| Pointer Events | 844×390 | 4面→ending→credits合格 |

全6 campaignでoverflow 0、63 resource、失敗resource 0、外部origin 0、console warning/error 0だった。通常入口では出撃後にpause画面へ遷移し、同じ進行へ復帰することも確認した。

## リリース記録と復旧

`RELEASE_NOTES.md`のversion、build ID、変更点、既知リスク、権利通知、データ取扱いは固定RCと本番内容に一致する。固定v1.0.0 commit `9abf0248aa5b8e97749a2e2c380d9ad3e3b69b28`を一時ディレクトリへ展開し、`npm ci`、33テスト、決定的playtest、production buildを完了した。本番へのrollback deployは実行せず、履歴書換えも行っていない。

## 判定と残存リスク

REL-04〜06は証拠付きで合格し、Phase 11を完了する。Safari desktop、iOS／Android実機、搭載memory 4 GiB以下の物理低性能実機は未実測である。自動入力と決定的検査は楽しさ、操作感、聴感、美しさを測定しない。これらは合格済みとはせず、Phase 12の運用リスクとして継続する。
