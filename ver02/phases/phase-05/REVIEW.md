# Phase 05 review — 技術基盤

判定: 完了（2026-10-22）

## ゲート判定

4ステージと製品フローを追加できる単一の実行基盤、決定的シミュレーション、ブラウザ境界、静的build、機械検査を接続した。Phase 05の成果物は仮区間を使う技術基盤であり、完成ステージ、完成製品、主観品質の合格ではない。

- 固定60 tick、停止復帰、flow、FIFOコア、戦闘、stage schema、入力、音声、保存、CanvasをDOM非依存の規則と薄いbrowser adapterへ分離した。
- タイトル、初回説明、stage intro、戦闘、ポーズ、確認、結果、ゲームオーバー、同seed再挑戦を一つのbrowser entryへ接続した。
- `npm run verify` でunit、integration、決定的通し、build再現性、容量、asset、外部URLを一括検査できる。
- TECH-04検証表はChrome、Edge、Firefox、Safari、iOS Safari実機、Android Chrome実機を必須行とし、未確認や証拠不足をpassにできない。

## 自動検証

全78テスト、静的build 35 files・13,733,784 bytes、外部URL 0、high以上の既知脆弱性0、差分検査に合格した。Chrome 155 / macOS 26.6.2のcacheなしlocalhostでは34 resources、encoded 13,727,049 bytes、load 187ms、119.7fps、50ms超frame 0、最大16.7ms、simulation drop 0、overflow 0、console warning/error 0だった。

ポーズ復帰の再検証で、非戦闘時間をframe間隔へ含めてfpsとlong frameを誤記録する不具合を検出した。非戦闘中に計測基準を切り、復帰後の最初のframeから再開するよう修正し、1.2秒停止を挟む回帰テストと実ブラウザ再確認を行った。

一時サーバーのアクセス記録では、consoleに出ない暗黙の `/favicon.ico` 404も検出した。配信済みの自作赤コア画像をfaviconへ明示指定し、entrypointからbuild対象assetを参照する回帰テストを追加した。

## 未確認と後続作業

- EdgeとFirefoxは検証機に未導入、SafariはUI操作権限を利用できず未確認。iOS実機とAndroid実機は未接続。Androidエミュレータは実機証拠へ数えない。
- 5分以上のsoak、低性能端末、ネットワーク条件、完成4面の負荷はPhase 09まで未確認。
- 仮敵、仮boss、仮音、仮区間は完成素材へ数えない。Phase 06で第1面の全経路を完成品質へ置換する。
- 楽しさ、操作感、聴感、美しさは評価しておらず、機械検査を代替証拠にしない。

## 次フェーズへの入力

Phase 06では軌道残骸帯を開始からboss、結果、再挑戦までのバーティカルスライスとして完成させる。最初に製品要件とasset台帳から第1面の必須制作単位、仮ID、受け入れシナリオを固定し、背景だけでなく敵3種、固有仕掛け、boss、3武器×3段階、音、VFX、UIを同じ実行基盤へ接続する。
