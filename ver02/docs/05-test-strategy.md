# 05 テスト戦略

状態: Phase 05進行中（2026-10-21）

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

## 固定時間刻みの基準

- 同じ2秒を30Hz、60Hz、144Hzのframe列で与え、update回数とsimulation timeが一致する。
- 10秒のdeltaでも1描画のupdateは8回以下で、超過時間を計測値として残す。
- hidden中はupdate 0回、復帰最初のframeも0回とし、次の通常frameから再開する。
- 補間率は0以上1未満で、描画頻度だけを変えてもゲーム規則の結果を変えない。

## 異常系

保存取得・parse・書込み失敗、AudioContext作成・resume・decode失敗、fullscreen拒否、asset 404、pointer cancel、focus喪失、visibility復帰を明示的に注入する。例外を握りつぶすだけでなく、無音・初期値・通常表示など定義済みの縮退先と警告表示を検査する。

## ブラウザと画面

開発中の各UIスライスはChromeで1440×900、390×844、320×844、844×390を確認する。Phase 05ゲートでは現行安定版Chrome、Edge、Firefox、Safariと、利用可能なiOS Safari・Android Chrome相当の実績表を作る。未確認環境を合格扱いにしない。

## 証拠

自動結果、スクリーンショット、console、network、performance計測、ブラウザversionをPhase reviewから参照可能な場所へ保存する。テスト用仮素材や自動完走を製品アセット・人間の主観評価と混同しない。
