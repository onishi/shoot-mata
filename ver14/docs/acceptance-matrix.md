# Acceptance matrix

| ID | 必須体験・要件 | 段階 | 実装 | 検証・証拠 | 状態 |
| --- | --- | --- | --- | --- | --- |
| TB-CORE-01 | 操舵が即時反応と慣性を両立する | M1 | `game/src/model.js` | 5/5 tests; 94.01秒Chrome実入力 | M1合格 |
| TB-CORE-02 | サージが救助拡大・流木破砕・充電判断を結ぶ | M1 | `activateSurge`, `resolveEntity` | model tests; `m1-surge`・`m1-rescue-route` | M1合格 |
| TB-CORE-03 | 最初の10秒に操舵、サージ、最初の成功がある | M1 | 4/7/10秒イベント | 状態注入なし7.68秒で最初の救助 | M1合格 |
| TB-PACE-01 | 90秒に成功、危機、構図転換、小山場がある | M1 | 4区間・94秒 | `m1-section-1..3`; `m1-browser-audit.json` | M1合格 |
| TB-ART-01 | 主役、SOS、危険、航跡が遠目で判別できる | M1/M2 | 固有艇、ロール、速度連動飛沫、三層外港、SOS旗、流木二分、店舗峡谷、地下施設、倒壊岸壁、救助フェリー、高潮防壁、巨大船外殻と内部排水路 | `m2-harbor-*`, `m3-street-street-*`, `m3-underflow-underflow-*`, `m3-convoy-convoy-*`, `m3-boss-chain-boss-*` | M3全区間・ボス代表画面合格 |
| TB-AUDIO-01 | 操作、救助、被害、区間を音で区別する | M1/M2 | `audio.js`短音＋連続エンジン・水音 | `m2-browser-audit.json`: cruise/surge/3区間/result | M2代表合格 |
| TB-SCALE-01 | 初見20〜30分、習熟16〜22分の5区間＋ボス | M3/M4 | 5区間各180秒＋構造攻略ボス120秒 | `m3-boss-chain-browser-audit.json`: 習熟方針1020.009秒 | 習熟17分合格、外部初見実測はM4未確認 |
| TB-VARIETY-01 | 5区間とボスが空間・目的・操作・攻略で異なる | M3/M4 | 外港の人数優先と破砕分岐、選択が地形へ波及する商業区、排水弁で後続上下層を変える地下、積載・隊形回復・潮位航路を結ぶ護送、壁走行・設備分岐・フェリー収容、巨大船外殻から内部への構造転換 | `m3-boss-chain-browser-audit.json`; 全区間・ボスの動作中画面 | M3本編合格、M4比較批評待ち |
| TB-HARBOR-01 | 外港が基本救助から人数優先と破砕／迂回の資源判断へ段階発展する | M3 | `prioritySurvivor`, `forkBreak`, `forkGate`, 選択履歴・専用HUD | 19/19 tests; Chrome 276.006秒・71イベント・船体3・優先救助4/4・破砕3/3、`m3-harbor-harbor-priority/fork` | M3製品尺合格 |
| TB-STREET-01 | 浸水商業区がS字、交差流、救助選択と後続地形を二段階で結ぶ | M3 | 選択依存`routeProfile`, 条件付き障害、`routeSurvivor`, 経路履歴HUD | 21/21 tests; Chrome 431.016秒・100イベント・船体3・救助34・MARKET→CLINIC、`m3-street-chain-street-bend/choice` | M3製品尺合格 |
| TB-UNDERFLOW-01 | 地下放水路が潜水・浮上、排水弁、上下障害、救助可能層を連鎖させる | M3 | `depth`/`depthV`, `tunnelValve`, 選択依存水路・水位・条件付き障害と救助、深度HUD・水膜・気泡・深度連動音 | 23/23 tests; Chrome 586.016秒・127イベント・船体3・弁2/2・深層/表層救助・最大深度1・再浮上true、`m3-underflow-chain-underflow-valve/dive/surface` | M3製品尺合格 |
| TB-CONVOY-01 | 倒壊コンテナ港が崩落予告、潮位切替、積載、隊形回復、複数航路を一つの護送判断へ結ぶ | M3 | `tideLevel`, `escortLoad`, `escortRallyTime`, `convoyPickup`, `convoyFork`, 選択依存水路・障害、積載・航路HUD | 25/25 tests; Chrome 747.003秒・船体3・フェリー3・積載9・救助桟橋2/2・航路2/2・崩落11/11・潮位切替11回、`m3-convoy-chain-convoy-low/high/load/route` | M3製品尺合格 |
| TB-STORMWALL-01 | 高潮防壁が上昇水面、左右壁走行、上下門、設備選択、フェリー収容を一つの複合判断へ結ぶ | M3 | `stormLevel`, `wallRideSide`, `wallGate`, `stormFork`, `stormShelter`, 選択依存水路・門、防壁景観、高潮・設備HUD | 27/27 tests; Chrome 900.001秒・船体/フェリー3・左右壁・12/12門・設備2/2・安全区画true、`m3-stormwall-chain-stormwall-left/right/system/basin` | M3製品尺合格 |
| TB-BOSS-01 | 走路生成・壁走行・内部進入の最終ボス | M3/M4 | アンカー2、船腹装甲3、上下排水2、サージコア、専用走路・背景・HUD | 30/30 tests; `m3-boss-chain-browser-audit.json`: 1020.009秒、162/162、船体3、2/2・3/3・2/2・撃破; `m3-boss-chain-boss-*` | M3構造攻略合格、M4演出批評待ち |
| TB-REPLAY-01 | 救助・最短・ニアミスの3戦略が成立する | M4 | 既存の救助・分岐にWAKE SKIM連鎖、5倍上限500点基準、サージ回復、被弾切断、専用画面・音を追加 | 32/32 tests; `m4-strategy-audit.json`: 救助48・無傷・696,450点、直行16・無傷・112,400点、ニアミス11名・SKIM 10・船体/フェリー1・125,550点、全完走1020.017秒; `m4-reward-wake-skim-audit.json`: 11.266秒・船体3・SKIM 1・500点; `m4-reward-wake-skim-1280x720.png` | M4進行中、救助と危険得点方針は分離。全方針固定17分で時間短縮戦略は未成立 |
| TB-PRODUCT-01 | 設定、保存、ポーズ、失敗復帰、結果 | M2/M4 | 音量・動き軽減・キー変更、破損復旧、フォーカス安全停止、ポーズ・再試行・結果 | 8/8 tests; `m2-product-settings-audit.json`; `m2-product-audit.json`; 停止差0秒・入力解放・60.735秒平均16.663ms; 2 viewport; 94.01秒完走 | M2合格、M4横断監査待ち |
| TB-RELEASE-01 | クリーン配布物、hash、公開URL、旧版保持 | M5 | 未実装 | release/deployment監査 | 未着手 |
