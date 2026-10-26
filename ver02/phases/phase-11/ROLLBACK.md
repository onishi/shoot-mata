# Phase 11 ロールバック手順

## 復旧対象

v02公開直前の正常版はv1.0.0、固定commit `9abf0248aa5b8e97749a2e2c380d9ad3e3b69b28`である。現行repositoryの`ver01/`は参照用アーカイブだが、復旧workflowは履歴上のこのcommitを直接checkoutし、当時の`phase-11-01/dist`を再buildする。

## 公開前dry-run

`.github/workflows/pages.yml`の`rollback-v01`分岐と固定commit、build command、artifact pathを自動テストで検査する。公開前に固定commit上の`phase-11-01`で`npm ci`、`npm test`、`npm run playtest`、`npm run build`が成立することを確認する。dry-runではPages deploy jobを実行しない。

## 本番復旧

1. `Deploy shoot-mata production` workflowを手動起動する。
2. `release`に`rollback-v01`、`confirmation`にも`rollback-v01`を入力する。
3. workflowが固定commitをcheckoutし、test・playtest・buildを通してからPages artifactを配信することを確認する。
4. `https://onishi.github.io/shoot-mata/`のv1.0.0入口、主要asset、開始・ポーズ・結果・再挑戦を確認する。
5. 障害内容、workflow run、復旧時刻、確認結果をPhase 11 reviewと開発ログへ記録する。

reset、force push、履歴書換えは行わない。GitHub Pagesの環境またはActions自体が停止している場合は新規配信を重ねず、直前に配信済みの静的artifactを維持し、復旧後に同じ手順を再開する。
