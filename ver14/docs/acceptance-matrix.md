# Acceptance matrix

| ID | 必須体験・要件 | 段階 | 実装 | 検証・証拠 | 状態 |
| --- | --- | --- | --- | --- | --- |
| TB-CORE-01 | 操舵が即時反応と慣性を両立する | M1 | `game/src/model.js` | 5/5 tests; 94.01秒Chrome実入力 | M1合格 |
| TB-CORE-02 | サージが救助拡大・流木破砕・充電判断を結ぶ | M1 | `activateSurge`, `resolveEntity` | model tests; `m1-surge`・`m1-rescue-route` | M1合格 |
| TB-CORE-03 | 最初の10秒に操舵、サージ、最初の成功がある | M1 | 4/7/10秒イベント | 状態注入なし7.68秒で最初の救助 | M1合格 |
| TB-PACE-01 | 90秒に成功、危機、構図転換、小山場がある | M1 | 4区間・94秒 | `m1-section-1..3`; `m1-browser-audit.json` | M1合格 |
| TB-ART-01 | 主役、SOS、危険、航跡が遠目で判別できる | M1/M2 | 固有艇、ロール、速度連動飛沫、三層外港、SOS旗の身振り、流木二分 | `m2-harbor-wake-idle`, `m2-harbor-survivor-gesture`, `m2-harbor-driftwood-break`; 2 viewport目視 | M2代表区間合格、後続区間未達 |
| TB-AUDIO-01 | 操作、救助、被害、区間を音で区別する | M1/M2 | `audio.js`短音＋連続エンジン・水音 | `m2-browser-audit.json`: cruise/surge/3区間/result | M2代表合格 |
| TB-SCALE-01 | 初見20〜30分、習熟16〜22分の5区間 | M3 | 製品規模契約 | 分離通し計測 | 未着手 |
| TB-VARIETY-01 | 5区間が空間・目的・操作・攻略で異なる | M3/M4 | 区間設計 | 区間名を隠した比較 | 未着手 |
| TB-BOSS-01 | 走路生成・壁走行・内部進入の最終ボス | M3/M4 | ボス約束 | 実プレイ・連続画面 | 未着手 |
| TB-REPLAY-01 | 救助・最短・ニアミスの3戦略が成立する | M4 | 得点・分岐 | 複数方針通し | 未着手 |
| TB-PRODUCT-01 | 設定、保存、ポーズ、失敗復帰、結果 | M2/M4 | 音量・動き軽減・キー変更、破損復旧、フォーカス安全停止、ポーズ・再試行・結果 | 8/8 tests; `m2-product-settings-audit.json`; `m2-product-audit.json`; 停止差0秒・入力解放・60.735秒平均16.663ms; 2 viewport; 94.01秒完走 | M2合格、M4横断監査待ち |
| TB-RELEASE-01 | クリーン配布物、hash、公開URL、旧版保持 | M5 | 未実装 | release/deployment監査 | 未着手 |
