# Acceptance matrix

製品規模契約と完成ゲートを安定IDで追跡する。`npm run verify`は`ver12/game/`で実行する。

| ID | 必須成果 | 担当段階 | 実装・証拠 | 再実行可能な検証 | 状態 |
| --- | --- | --- | --- | --- | --- |
| CORE-01 | 移動、極性反転、3種同時操作、衝突、収容 | M1 | `src/model.js`、`m1-first-field.png` | `npm run verify` | 合格 |
| CORE-02 | 失敗後の室再挑戦とポーズ復帰 | M1 | `reduce`、E2E test 1 | `npm run verify` | 合格 |
| PROG-01 | 複数室のデータ定義と通常操作による進行 | M2 | `LEVELS`、E2E tests 2–4、`m2-three-chambers-won.png` | `npm run verify` | 3室合格 |
| MECH-02 | 固定鉄塊で不要な種だけを止める | M2 | `LEVELS[1].blocks`、`m2-iron-brake.png` | `npm run test -- --test-name-pattern='iron'` | 合格 |
| MECH-03 | 軸極が指定軸の種だけを止め、鍛冶師を通す | M2 | `LEVELS[2].poles`、`m2-polar-veil.png` | `npm run test -- --test-name-pattern='polar veil'` | 合格 |
| PROD-01 | 3室、段階導入、設定、進行保存 | M2 | 3室と段階導入は実装済み。設定・保存は未実装 | `npm run verify`に追加予定 | 一部合格 |
| CONT-01 | 6室、4段階以上の規則発展、最終炉と終演 | M3 | 未実装 | 通しE2Eを追加予定 | 未達 |
| DEPTH-01 | 複数の有効手順、巻き戻し、再挑戦価値 | M4 | 未実装 | 方針別自動通しを追加予定 | 未達 |
| ART-01 | 全室の背景、種、UI、磁場、効果音が完成方針で統一 | M4 | M1–M2 Canvas描画と合成音 | 全主要画面目視・音量監査予定 | 一部合格 |
| ACCESS-01 | キーボード、動き軽減、音量、動的名称、2 viewport | M2–M4 | キーボードと動的名称のみ | E2E・目視・設定保存監査予定 | 一部合格 |
| QA-01 | 単体、統合、通し、性能、保存破損、配布物監査 | M4–M5 | 単体11/11、E2E 4/4、build合格 | `npm run verify`、追加監査予定 | 一部合格 |
| RELEASE-01 | 配布物hash、公開URL、旧版保持、rollback | M5 | 未実施 | 公開候補で記録予定 | 未達 |
| CRIT-01 | 2回以上の独立批評と改善 | M5 | 未実施 | baseline・非退行比較予定 | 未達 |
| RETRO-01 | 基準比較、M6振り返り、ルート方針評価 | M6 | 未実施 | `05-major-retrospective.md` | 未達 |
