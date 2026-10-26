# Phase 12 operations runbook

## 監視

`production-monitor.yml`を毎日と手動起動で実行し、固定RCの再現build、運用台帳、本番manifestと全配信ファイル、high以上の依存脆弱性を検査する。Actionsの失敗を障害候補とし、ネットワーク一時障害か公開物の差異かを再実行1回で切り分ける。2回目も失敗した場合はissueへ時刻、run URL、失敗command、期待build ID、観測値を記録する。

## 重大度と初動

| 重大度 | 条件 | 初動 |
| --- | --- | --- |
| P0 | 配信不能、意図しない外部通信、データ破壊、公開物の改ざん疑い | 新規公開を止め、証拠を保存し、固定v1.0.0へのrollbackを判断する |
| P1 | 主要フロー進行不能、複数対応ブラウザで再現、重大な依存脆弱性 | 24時間以内に再現・影響範囲・暫定策を記録し、修正版またはrollbackを選ぶ |
| P2 | 単一環境の互換性・性能問題、回避可能な機能不良 | 再現条件と対象buildを固定し、次回修正版へ優先投入する |
| P3 | 表示改善、調整、新機能候補 | 月次triageで採否と優先順位を更新する |

監視失敗だけで製品障害と断定しない。逆に、再実行成功だけで公開物差異の記録を消さない。

## ロールバック

P0、または修正版を安全に検収できないP1では、`../phase-11/ROLLBACK.md`に従い、手動workflowの`rollback-v01`を確認文字列付きで実行する。履歴書換えやforce pushは行わない。実行前に現在のdeployment、manifest hash、失敗証拠を保存し、実行後に公開URL、主要フロー、versionを再確認する。

## 修正版の更新

修正は新しいbuild IDとversionを付け、元の固定RCを上書きしない。変更に対応する回帰テスト、`npm run verify`、対象ブラウザの主要フロー、本番artifact監査を通し、release notes、rollback対象、運用台帳を同時に更新してから手動公開する。

依存更新はlockfile差分、release notes、Node/npm要件を確認し、high以上0件と全体verifyを必須にする。自動的なmajor updateや自動deployは行わない。

## 互換性と性能

Chrome、Edge、Firefoxの更新後、または不具合報告時は固定公開buildでkeyboard／Pointer Events、1568×956・390×844・844×390、4面からcredits、console、resource、overflowを再確認する。Safari、iOS／Android実機、4 GiB以下の物理低性能実機は利用可能になった場合だけ同じbuildで追加測定し、推定結果で未実測を閉じない。

## 権利条件

四半期ごと、または利用条件変更の通知時に、画像生成の利用条件、生成物の非一意性・非侵害未保証、音声の外部sample 0件、`THIRD_PARTY_NOTICES.html`との一致を確認する。法的助言や非侵害保証へ状態を変更しない。条件変更が配布を許容しない可能性を持つ場合はP1として新規公開を止める。

初回定期確認は2026-10-26に実施した。Terms of Useの公開日・発効日は2026-01-01、Service Termsの更新日は2026-10-16でPhase 10記録と一致した。画像32点、音声29点、第三者素材0点、配布通知との一致を再照合し、重要な差異なしとした。Outputの非一意性・非侵害未保証は解消せず、次回確認日は2027-01-26とする。構造化証拠は`operations.json`の`rightsReviews`を正本とする。

## 改善要望のtriage

不具合、改善、新機能を混同せず、再現条件または利用者価値、対象build、優先度、状態、次の判断条件を記録する。P0/P1は障害手順へ、P2は次回修正版へ、P3は月次triageへ送る。READMEの必須要件を改善候補へ降格しない。

初回triageは2026-10-26に実施した。GitHub Issuesはopen 0件・closed 0件で、既存バックログR-001〜R-003はすべて評価済み・製品必須外のまま維持した。新たに予定へ入れる障害、改善、新機能は0件で、次回triage日は2026-11-26とする。構造化証拠は`operations.json`の`improvementTriages`を正本とする。
