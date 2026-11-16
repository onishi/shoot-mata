# Acceptance matrix

| ID | 必須体験・要件 | 段階 | 実装 | 検証・証拠 | 状態 |
| --- | --- | --- | --- | --- | --- |
| TB-CORE-01 | 操舵が即時反応と慣性を両立する | M1 | `game/src/model.js` | 5/5 tests; 94.01秒Chrome実入力 | M1合格 |
| TB-CORE-02 | サージが救助拡大・流木破砕・充電判断を結ぶ | M1 | `activateSurge`, `resolveEntity` | model tests; `m1-surge`・`m1-rescue-route` | M1合格 |
| TB-CORE-03 | 最初の10秒に操舵、サージ、最初の成功がある | M1 | 4/7/10秒イベント | 状態注入なし7.68秒で最初の救助 | M1合格 |
| TB-PACE-01 | 90秒に成功、危機、構図転換、小山場がある | M1 | 4区間・94秒 | `m1-section-1..3`; `m1-browser-audit.json` | M1合格 |
| TB-ART-01 | 主役、SOS、危険、航跡が遠目で判別できる | M1/M2 | 固有艇、ロール、速度連動飛沫、三層外港、SOS旗、流木二分、店舗峡谷、地下施設、倒壊岸壁、救助フェリー、高潮防壁と壁走行 | `m2-harbor-*`, `m3-street-street-*`, `m3-underflow-underflow-*`, `m3-convoy-convoy-*`, `m3-stormwall-stormwall-*` | 5区間代表画面合格 |
| TB-AUDIO-01 | 操作、救助、被害、区間を音で区別する | M1/M2 | `audio.js`短音＋連続エンジン・水音 | `m2-browser-audit.json`: cruise/surge/3区間/result | M2代表合格 |
| TB-SCALE-01 | 初見20〜30分、習熟16〜22分の5区間 | M3 | 製品規模契約 | 分離通し計測 | 未着手 |
| TB-VARIETY-01 | 5区間が空間・目的・操作・攻略で異なる | M3/M4 | 外港の広い全回収、狭いS字と排他的救助、上下層を往復する地下、潮位護送、左右壁サージと上下門操作へ転換 | `m3-street-browser-audit.json`; `m3-underflow-browser-audit.json`; `m3-convoy-browser-audit.json`; `m3-stormwall-browser-audit.json` | 5/5区間の短縮縦切り実装、製品尺未達 |
| TB-STREET-01 | 浸水商業区がS字走路、交差流、救助ルート選択を同じ操作へ結ぶ | M3 | `routeProfile`, `routeSurvivor`, 投影水路・店舗峡谷・流向HUD | 10/10 tests; Chrome 94.013秒・34イベント・船体3・救助11・2分岐、`m3-street-street-bend`, `m3-street-street-choice` | M3合格 |
| TB-UNDERFLOW-01 | 地下放水路が潜水・浮上、上下障害、救助可能層を一つの深度判断へ結ぶ | M3 | `depth`/`depthV`, `lowCeiling`, `intake`, `tunnelSurvivor`, 深度HUD・水膜・気泡・深度連動音 | 13/13 tests; Chrome 94.013秒・36イベント・船体3・救助13・深層/表層各救助・最大深度1・再浮上true、`m3-underflow-underflow-dive`, `m3-underflow-underflow-surface` | M3合格 |
| TB-CONVOY-01 | 倒壊コンテナ港が崩落予告、潮位切替、フェリー護送を一つの判断へ結ぶ | M3 | `tideLevel`, `escortX`, `containerFall`, フェリー耐久、低潮・高潮HUD、倒壊港景観 | 15/15 tests; Chrome 94.013秒・船体3・フェリー3・5/5崩落・潮位切替5回、`m3-convoy-convoy-low`, `m3-convoy-convoy-high` | M3合格 |
| TB-STORMWALL-01 | 高潮防壁が上昇する水面、左右壁走行、上下門操作を一つの複合判断へ結ぶ | M3 | `stormLevel`, `wallRideSide`, `wallGate`, 防壁景観、門・高潮HUD | 17/17 tests; Chrome 121.001秒・船体3・41イベント・左右壁捕捉・5/5門、`m3-stormwall-stormwall-left/right` | M3短縮区間合格 |
| TB-BOSS-01 | 走路生成・壁走行・内部進入の最終ボス | M3/M4 | ボス約束 | 実プレイ・連続画面 | 未着手 |
| TB-REPLAY-01 | 救助・最短・ニアミスの3戦略が成立する | M4 | 得点・分岐 | 複数方針通し | 未着手 |
| TB-PRODUCT-01 | 設定、保存、ポーズ、失敗復帰、結果 | M2/M4 | 音量・動き軽減・キー変更、破損復旧、フォーカス安全停止、ポーズ・再試行・結果 | 8/8 tests; `m2-product-settings-audit.json`; `m2-product-audit.json`; 停止差0秒・入力解放・60.735秒平均16.663ms; 2 viewport; 94.01秒完走 | M2合格、M4横断監査待ち |
| TB-RELEASE-01 | クリーン配布物、hash、公開URL、旧版保持 | M5 | 未実装 | release/deployment監査 | 未着手 |
