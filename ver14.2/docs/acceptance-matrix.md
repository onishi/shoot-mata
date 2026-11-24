# Acceptance matrix

| ID | 必須体験・要件 | 段階 | 実装 | 検証・証拠 | 状態 |
| --- | --- | --- | --- | --- | --- |
| TB-CORE-01 | 操舵が即時反応と慣性を両立する | M1 | `game/src/model.js` | 5/5 tests; 94.01秒Chrome実入力 | M1合格 |
| TB-CORE-02 | サージが救助拡大・流木破砕・充電判断を結ぶ | M1 | `activateSurge`, `resolveEntity` | model tests; `m1-surge`・`m1-rescue-route` | M1合格 |
| TB-CORE-03 | 最初の10秒に操舵、サージ、最初の成功がある | M1 | 4/7/10秒イベント | 状態注入なし7.68秒で最初の救助 | M1合格 |
| TB-HANDLING-01 | 操舵入力の荷重が艇・走路・飛沫・水音へ即時かつ同方向に返る | M5 | `motionFeedback`、艇ロール、走路バンク、速度連動流線、荷重側飛沫、ステレオ水音 | 39/39 tests; `m5-handling-handling-audit.json`; 中立・左右・サージ旋回1280×720; 左右のvelocity/pan/bank/roll符号一致、surge `rush 2.247`・船体3 | M5第1回改善合格 |
| TB-CUT-01 | FLOOD CUT取得が計時だけでなく速度・空間・音の短い転換として感じられる | M5 | 4.5秒`cutRushTime`、イベント接近1.58倍、透視線、残秒、水音帯域1.42倍、拍間隔0.62倍 | 40/40 tests; `m5-cut-rush-shortcut-audit.json`: 190.576秒・残4.450秒・水音1391.6Hz・`cutRush=true`; `m5-cut-rush-flood-cut-1280x720.png`; 4方針で直行4 CUT・16:00 | M5第2回改善合格 |
| TB-PACE-01 | 90秒に成功、危機、構図転換、小山場がある | M1 | 4区間・94秒 | `m1-section-1..3`; `m1-browser-audit.json` | M1合格 |
| TB-ONBOARD-01 | 初見が危険方向を読み、被弾後に操作を続けて立て直せる | M4 | 序盤90秒の動的危険方向・段階操作提示、安全ゲートの1点修復、専用画面効果 | 34/34 tests; `m4-strategy-audit.json`: 初見相当88.217秒→192.017秒・修復2回; `m4-training-training-audit.json`: 実キー19.275秒・船体2→3; `m4-training-danger-cue/hull-patch-1280x720.png`, `m4-training-hull-patch-640x360.png` | M4局所合格。最初の180秒区間を越えたが外部初見は未確認 |
| TB-ART-01 | 主役、SOS、危険、航跡が遠目で判別できる | M1/M2 | 固有艇、ロール、速度連動飛沫、三層外港、SOS旗、流木二分、店舗峡谷、地下施設、倒壊岸壁、救助フェリー、高潮防壁、巨大船外殻と内部排水路 | `m2-harbor-*`, `m3-street-street-*`, `m3-underflow-underflow-*`, `m3-convoy-convoy-*`, `m3-boss-chain-boss-*` | M3全区間・ボス代表画面合格 |
| TB-AUDIO-01 | 操作、救助、被害、区間を音で区別する | M1/M2/M4 | 操作短音、連続エンジン・水音に加え、6空間固有のテンポ・拍・波形・水音帯域・低音ドローン・転換ジングル | 37/37 tests; `m4-audio-browser-audit.json`: 1020.000秒・6 profile・tempo 0.205〜0.46・water 420〜1880Hz・drone 33〜73Hz・転換1〜6・結果3連続層停止 | M4全編音響差合格 |
| TB-SCALE-01 | 初見20〜30分、習熟16〜22分の5区間＋ボス | M3/M4 | 5区間各180秒＋構造攻略ボス120秒 | `m3-boss-chain-browser-audit.json`: 習熟方針1020.009秒 | 習熟17分合格、外部初見実測は未確認のままM5へ継続 |
| TB-VARIETY-01 | 5区間とボスが空間・目的・操作・攻略で異なる | M3/M4 | 外港の人数優先と破砕分岐、選択が地形へ波及する商業区、排水弁で後続上下層を変える地下、積載・隊形回復・潮位航路を結ぶ護送、壁走行・設備分岐・フェリー収容、巨大船外殻から内部への構造転換 | `m3-boss-chain-browser-audit.json`; `m4-audio-browser-audit.json`; 全区間・ボスの動作中画面 | M4空間・目的・操作・攻略・音響差合格 |
| TB-HARBOR-01 | 外港が基本救助から人数優先と破砕／迂回の資源判断へ段階発展する | M3 | `prioritySurvivor`, `forkBreak`, `forkGate`, 選択履歴・専用HUD | 19/19 tests; Chrome 276.006秒・71イベント・船体3・優先救助4/4・破砕3/3、`m3-harbor-harbor-priority/fork` | M3製品尺合格 |
| TB-STREET-01 | 浸水商業区がS字、交差流、救助選択と後続地形を二段階で結ぶ | M3 | 選択依存`routeProfile`, 条件付き障害、`routeSurvivor`, 経路履歴HUD | 21/21 tests; Chrome 431.016秒・100イベント・船体3・救助34・MARKET→CLINIC、`m3-street-chain-street-bend/choice` | M3製品尺合格 |
| TB-UNDERFLOW-01 | 地下放水路が潜水・浮上、排水弁、上下障害、救助可能層を連鎖させる | M3 | `depth`/`depthV`, `tunnelValve`, 選択依存水路・水位・条件付き障害と救助、深度HUD・水膜・気泡・深度連動音 | 23/23 tests; Chrome 586.016秒・127イベント・船体3・弁2/2・深層/表層救助・最大深度1・再浮上true、`m3-underflow-chain-underflow-valve/dive/surface` | M3製品尺合格 |
| TB-CONVOY-01 | 倒壊コンテナ港が崩落予告、潮位切替、積載、隊形回復、複数航路を一つの護送判断へ結ぶ | M3 | `tideLevel`, `escortLoad`, `escortRallyTime`, `convoyPickup`, `convoyFork`, 選択依存水路・障害、積載・航路HUD | 25/25 tests; Chrome 747.003秒・船体3・フェリー3・積載9・救助桟橋2/2・航路2/2・崩落11/11・潮位切替11回、`m3-convoy-chain-convoy-low/high/load/route` | M3製品尺合格 |
| TB-STORMWALL-01 | 高潮防壁が上昇水面、左右壁走行、上下門、設備選択、フェリー収容を一つの複合判断へ結ぶ | M3 | `stormLevel`, `wallRideSide`, `wallGate`, `stormFork`, `stormShelter`, 選択依存水路・門、防壁景観、高潮・設備HUD | 27/27 tests; Chrome 900.001秒・船体/フェリー3・左右壁・12/12門・設備2/2・安全区画true、`m3-stormwall-chain-stormwall-left/right/system/basin` | M3製品尺合格 |
| TB-BOSS-01 | 走路生成・壁走行・内部進入と、破砕から脱出まで動く最終決着 | M3/M4 | アンカー2、船腹装甲3、上下排水2、サージコア、専用走路・背景・HUD、外殻破断・圧力解放・沈降・2艇脱出 | 35/35 tests; `m4-collapse-final-browser-audit.json`: 1020.009秒、162/162、船体3、2/2・3/3・2/2・撃破、決着7.466秒・4段階; `m4-collapse-final-boss-*` | M4構造攻略・決着演出合格 |
| TB-REPLAY-01 | 救助・最短・ニアミスの3戦略が成立する | M4 | 既存の救助・分岐にWAKE SKIM連鎖と4つのFLOOD CUT、公式ルート時間、専用画面・音を追加 | 38/38 tests; `m4-strategy-audit.json`: 救助17:00・48名・無傷・696,450点、直行16:00・16名・4 CUT・無傷・112,400点、WAKE SKIM 16:30・11名・10回・船体/フェリー1・125,550点; `m4-shortcut-shortcut-audit.json`: 実キーARCADE 12秒; `m4-shortcut-flood-cut-1280x720.png` | M4三戦略分離合格。壁時間は各17分であることをM5の体感批評へ引き継ぐ |
| TB-PRODUCT-01 | 設定、保存、ポーズ、失敗復帰、結果 | M2/M4/M5 | 音量・動き軽減・キー変更、破損復旧、フォーカス安全停止、ポーズ・再試行・結果 | 40/40 tests; `m5-cut-product-audit.json`: 停止差0.0166秒・入力/連続音停止・60.752秒・3,644 frames・平均16.672ms・最大34ms | M5第2回横断合格 |
| TB-RELEASE-01 | クリーン配布物、hash、公開URL、旧版保持 | M5 | clean build、Pages packaging、release metadata、deployment verifier | `m5-release-manifest.json`: 7ファイル108,246 bytes; `npm run verify:release`: 17経路・14 hash応答・v13.2保持; `m5-release-local-audit.json`: Chrome開始・停止・復帰・60.334秒 | ローカルRelease Candidate合格、公開監査待ち |
