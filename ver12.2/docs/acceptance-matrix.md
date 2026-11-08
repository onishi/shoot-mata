# Acceptance matrix

製品規模契約と完成ゲートを安定IDで追跡する。`npm run verify`は`ver12.2/game/`で実行する。

| ID | 必須成果 | 担当段階 | 実装・証拠 | 再実行可能な検証 | 状態 |
| --- | --- | --- | --- | --- | --- |
| CORE-01 | 移動、極性反転、3種同時操作、衝突、収容 | M1 | `src/model.js`、`m1-first-field.png` | `npm run verify` | 合格 |
| CORE-02 | 失敗後の室再挑戦とポーズ復帰 | M1 | `reduce`、E2E test 1 | `npm run verify` | 合格 |
| PROG-01 | 複数室のデータ定義と通常操作による進行 | M2–M3 | `LEVELS`、6室通しE2E、`m3-ending.png` | `npm run verify` | 6室合格 |
| MECH-02 | 固定鉄塊で不要な種だけを止める | M2 | `LEVELS[1].blocks`、`m2-iron-brake.png` | `npm run test -- --test-name-pattern='iron'` | 合格 |
| MECH-03 | 軸極が指定軸の種だけを止め、鍛冶師を通す | M2 | `LEVELS[2].poles`、`m2-polar-veil.png` | `npm run test -- --test-name-pattern='polar veil'` | 合格 |
| MECH-04 | 極性種が対応する磁場だけに反応する | M3 | `LEVELS[3].shards[].respondsTo`、`m3-cold-lodestone.png` | `npm run test -- --test-name-pattern='marked seed|cold lodestone'` | 合格 |
| MECH-05 | 極性種、固定鉄塊、軸極を同じ室で組み合わせる | M3 | `LEVELS[4]`、`m3-tempered-relay.png` | `npm run test -- --test-name-pattern='tempered relay'` | 合格 |
| MECH-06 | PULL限定種とPUSH限定種を鉄塊・軸極の最終炉で再構成する | M3 | `LEVELS[5]`、`m3-crown-crucible.png` | `npm run test -- --test-name-pattern='crown crucible'` | 合格 |
| PROD-01 | 3室、段階導入、設定、進行保存 | M2 | `LEVELS`、`preferences.js`、E2E tests 2–4・6–7、`m2-settings.png` | `npm run verify` | 合格 |
| CONT-01 | 6室、4段階以上の規則発展、最終炉と終演 | M3 | 6室、7反転最終炉、`THE CROWN IS FORGED`終演、6室通しE2E | `npm run verify` | 合格 |
| ARCADE-01 | 4:3主画面とレバー＋1ボタン相当の主操作 | M3 | 960×720 Canvas、上下筐体帯、方向＋Space、`m4-first-field-640x480.png` | `npm run verify`、640×480 E2E | 合格 |
| ARCADE-02 | アトラクト、コイン、開始、プレイ、失敗／結果、ランキングの筐体フロー | M4 | 6.5秒デモ→C/5投入→START→ゲームオーバー／コンティニューまたは6室→成績→イニシャル→上位5件→復帰。`m4-attract-demo.png`、`m4-gameover.png`、`m4-ranking.png` | Chrome E2E tests 1・4・12、`npm run verify` | 合格 |
| ARCADE-03 | 最初の10秒・30秒、1クレジット時間、得点、コンティニュー、再挑戦 | M4–M5 | 10秒内反転、30秒内第1室クリア、得点HUD、室別FORGE HEAT、追加クレジットで同室再開。v12.1は次極性と全種の一手結果を反転前に予告。既知解は安全102.750秒、TEMPER 123.150秒で3〜6分未達。固定ルートなし探索は863.600秒、96操作、UNDO 6回で初見相当8〜15分枠に合格 | Chrome E2E preview test・tests 2〜5、`npm run audit:campaign`、`npm run audit:discovery`、`m5-preview-first-field.png` | 一部合格（人間初見は未確認） |
| DEPTH-01 | 複数の有効手順、巻き戻し、再挑戦価値 | M4–M5 | 全6室に安全／TEMPER方針。安全25反転53,750点、TEMPER 34反転76,250点。室ごとに1回のU。得点とコンティニューから3職人位を評価し、全TEMPER・ノーコンティニューはCROWN MASTER専用終演へ到達。`m4-undo-spent.png`、`m5-masterwork-ending.png` | `npm run test -- --test-name-pattern='temper|undo|forge rank'`、Chrome E2E、`npm run audit:campaign` | 合格 |
| ART-01 | 全室の背景、種、UI、磁場、効果音が完成方針で統一 | M4 | 6室Canvas描画、内向き／外向き印、点灯TEMPER SIGIL、4:3筐体帯、4秒16拍FM風BGM、状態別ジングル | `npm run verify`、理論ピーク0.2907未満、0%ミュート・復帰E2E | 合格 |
| ACCESS-01 | キーボード、動き軽減、音量、動的名称、2 viewport | M2–M4 | キーボード設定UI、静止描画、音量係数、動的名称、1280×720と640×480のE2E画像 | `npm run verify` | 合格 |
| QA-01 | 単体、統合、通し、性能、保存破損、配布物監査 | M4–M5 | 単体30件、E2E 15件、設定・ランキング保存破損復帰、既知2方針＋固定ルートなし探索、180フレーム平均16.666ms・25ms超0・Long Task 0。実PCM全13音+BGMはクリップ0。v12.2配布物3ファイル35,647 bytesのhashを記録 | `npm run verify`、`npm run audit:campaign`、`npm run audit:discovery`、`npm run audit:audio`、`npm run audit:release` | ローカルRelease Candidate合格 |
| RELEASE-01 | 配布物hash、公開URL、旧版保持、rollback | M5 | v12.2クリーン配布物3ファイル35,647 bytes。commit `301aff7`をトップと`/v12.2/`へ公開し、`/v5/`・v4系・v3系を保持。run `42470411157`と開発環境の独立監査で11経路、metadata、2 asset MIMEに合格。deployment `7634490486`。rollbackはworkflow履歴の直前正常deployment再実行 | `m5-release-manifest.json`、`m5-release-runtime-audit.json`、`node scripts/verify-deployment.mjs https://onishi.github.io/shoot-mata/ 301aff7c4c213045894c301dc6519a344f3181b1` | 合格 |
| CRIT-01 | 2回以上の独立批評と改善 | M5 | 第1回: 共通計算の一手予告。第2回: 得点方針を3職人位、最高位専用終演・音へ接続。両回で既存方針・性能を維持 | `05-v12.0-review.md`、`06-v12.1-review.md`、`m5-preview-first-field.png`、`m5-masterwork-ending.png`、全監査 | 2/2合格 |
| RETRO-01 | 基準比較、M6振り返り、ルート方針評価 | M6 | 未実施 | `05-major-retrospective.md` | 未達 |
