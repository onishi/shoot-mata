# 05 テスト戦略

状態: Phase 05完了（2026-10-22）

## 原則

テストは製品要件IDへ対応付け、再現に必要なseed、入力、画面条件、build IDを記録する。自動テストは規則、到達性、欠落、性能退行の証拠に使うが、楽しさ、操作感、聴感、美しさの確認済み証拠にはしない。

## 層

| 層 | 対象 | 主な要件 | 実行方法 |
| --- | --- | --- | --- |
| unit | 時間、状態遷移、FIFO、衝突、score、保存schema、stage schema | TECH-01〜03、CORE-02〜05、PROG-03〜05 | Node test runner |
| integration | 入力、音声、保存、visibility、fullscreen、Canvas表示モデル | LOOP-04、UX-07、INP-01〜03、A11Y-01〜04、AV-06 | fake browser ports + browser操作 |
| full-run | seed固定の開始→固有区間→boss→result→遷移 | LOOP-01〜06、STG-01〜06、TECH-03 | 決定的な自動入力 |
| visual | 重要HUD、操作領域、overflow、アセット欠落、設定差 | UX-03〜06、AV-01〜04 | 4 viewportの画像と静的監査 |
| runtime | fps、停止、メモリ、console、network、容量、load | TECH-04〜08、REL-02〜03 | 実ブラウザ計測 |

Phase 05の一括検証は `npm run verify`、依存監査は `npm run audit:deps` で実行する。静的buildのmanifest再現性、容量、許可形式、外部URLはNodeで検査し、生成した `dist/` をローカルHTTP配信して初回resource、外部origin、load event、fps、50ms超frame、最大frame、simulation drop、JS heap、consoleをChromeで採取する。

Phase 09の長時間回帰は `?qa=campaign&runs=10&monitorMs=300000&renderPasses=4` を使い、playing中の実時間だけを5分積算する。60秒warmup後の30秒間隔sampleからheap・resource・DOM増加を算出し、少なくとも5 campaign、同seed一致、進行停止なしを同じ証拠へ保存する。ブラウザ操作による負荷条件と物理低性能端末の実績は別欄で管理する。

## 固定時間刻みの基準

- 同じ2秒を30Hz、60Hz、144Hzのframe列で与え、update回数とsimulation timeが一致する。
- 10秒のdeltaでも1描画のupdateは8回以下で、超過時間を計測値として残す。
- hidden中はupdate 0回、復帰最初のframeも0回とし、次の通常frameから再開する。
- 補間率は0以上1未満で、描画頻度だけを変えてもゲーム規則の結果を変えない。

## 異常系

保存取得・parse・書込み失敗、AudioContext作成・resume・decode失敗、fullscreen拒否、asset 404、pointer cancel、focus喪失、visibility復帰を明示的に注入する。例外を握りつぶすだけでなく、無音・初期値・通常表示など定義済みの縮退先と警告表示を検査する。

## ブラウザと画面

開発中の各UIスライスはChromeで1440×900、390×844、320×844、844×390を確認する。Phase 05ゲートでは現行安定版Chrome、Edge、Firefox、Safariと、利用可能なiOS Safari・Android Chrome相当の実績表を作る。未確認環境を合格扱いにしない。

2026-10-22時点の静的成果物runtime監査はChromeだけで完了している。結果は `phases/phase-05/browser-compatibility.json` に固定し、passには主要フロー、ポーズ復帰、overflow、console、欠落resource、外部originの全項目を要求する。Edge、Firefox、Safari、実iOS、実Androidは未確認であり、合格数には数えない。検証表とfail-closedな記録方式の成立をPhase 05の完了証拠とし、対象環境の製品合格はPhase 09・10まで持ち越す。

## 証拠

自動結果、スクリーンショット、console、network、performance計測、ブラウザversionをPhase reviewから参照可能な場所へ保存する。テスト用仮素材や自動完走を製品アセット・人間の主観評価と混同しない。
