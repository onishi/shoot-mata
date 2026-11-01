# v4.0 Development Log

## 2026-10-31 — M0新作設計

- 空のv4領域から企画を開始し、過去版のゲーム内容は企画材料にしなかった。
- 3案を独自性、操作の深さ、6面展開、実装・検証可能性で比較した。
- 移動航跡を閉じ、敵弾を反撃へ変える`PALIMPSEST WAKE`を採用した。
- 攻撃、移動、防御、強化を同じ航跡・閉路規則へ接続した。
- 6面、通常敵24種、ボス6種、欄外注による成長、画面遷移を設計した。
- v4専用のアート・音、技術構成、品質ゲート、要件追跡を定義した。
- M0完了条件を全件確認し、現在地をM1へ更新した。
- 次回はM1-01として、決定的な航跡プレイグラウンドを新規実装する。

## 2026-10-31 — M1-01 決定的プレイグラウンド

- 空の`ver04/game/`へTypeScript、Vite、Canvas 2D、Vitest、Playwrightの独立構成を新規作成した。過去版のコード・素材は使用していない。
- 120tick、1/256px座標の純粋な`step(state, input)`を実装し、移動、連射、3.2秒航跡、最新交点の閉路候補、COLLATE、弾捕捉と反撃、校合印、添え書き弾、RETRACE、被弾、画面端を接続した。
- 閉路候補が新しい航跡点の追加直後に消えて入力不能になる問題を検証中に発見し、候補を60tick保持する規則と回帰テストを追加した。
- Canvas試作図形を`game/assets/manifest.json`へ`prototype`として登録した。完成素材ではない。
- 単体テスト12件、型検査、production build、Chrome E2E 1件が`npm run verify`で合格した。E2Eは射撃、矩形航跡、閉路候補、RETRACE、COLLATE、ポーズを実キーで操作した。
- Chrome画像`docs/evidence/m1-01-playing.png`を目視し、自機、敵、暖色中空の敵弾、青白い航跡、琥珀破線の閉路候補、HUDが判別でき、1280×720で文字切れがないことを確認した。
- M1全体は未完了。次回はM1-02として3分構成とSafe / Stitch / Sweep自動操縦を実装し、仮説ゲートを実測する。

## 2026-10-31 — M1-02 3分遭遇と自動操縦比較

- seed差のある180秒出現表、Skiff/Hauler、大型撃破時刻、候補・空輪・捕捉・撃破・敵弾の計測を純粋simulationへ追加した。撃破敵が耐久全快で復活していたM1-01規則を、除去と次遭遇出現へ置き換えた。
- 視界内の自機、敵、弾、航跡、候補だけを使い、8〜14tickの反応遅延を持つ通常射撃、Safe、Stitch、Sweep操縦を実装した。
- 初回測定ではStitch/Sweepが角の手前を往復して閉路を作れず、閉路成功後も通常射撃より大型撃破が遅かった。反応遅延相当の角到達半径、交差まで通過する経路、印付き添え書き28 damage、反撃片16 damageへ修正した。
- Safeの中距離回避と小輪後の回避区間を追加し、Sweepの大輪得点を面積/15へ調整した。最終10seed中央値はSafe被弾43、Stitch大型撃破2,159tick、Sweep得点37,739.5となり、全仮説ゲートに合格した。
- 全40走行が21,600tickを完走し、同一入力hashが5回一致した。JSONとMarkdownを`docs/evidence/m1-02-autoplay.*`へ保存した。
- 画面外頂点の閉路拒否、Hauler撃破除去、COLLATE不発計測の回帰テストを追加し、単体15件、型検査、build、Chrome E2Eに合格した。
- Chrome画像`docs/evidence/m1-02-playing.png`を目視し、大型敵、敵弾、航跡、候補、180秒タイマー、HUDが識別でき、文字切れがないことを確認した。
- M1を完了しM2へ移行した。次回はStage 1の4通常敵と3分進行をデータ駆動で実装する。

## 2026-10-31 — M2-01 Stage 1通常区間と4敵種

- M1の固定遭遇表を`game/src/content/stage-01.ts`へ分離し、0〜180秒を単独提示、混成、2回のFolio Hauler山場からなる76出現のStage 1データへ置き換えた。
- Eraser Miteは航跡へ接近して局所消去、Bracket Gullは上下ペアで低速弾列、Margin Skiffは右端を上下して3点射、Folio Haulerは正面装甲と返し弾に弱い背面綴じを持つ固有規則として実装した。
- 敵種別の出現・攻撃・撃破・退場、敵64・敵弾512の生成上限と拒否数を決定的stateへ追加した。複数弾が同tickに同じ敵を重複撃破計上する不具合を統合計測で発見し、同tickの撃破済みIDを後続衝突から除外する回帰テストを追加した。
- Stitch操縦の180秒計測は最大同時敵10、敵弾113、最長無戦闘0tick、生成拒否0。全76出現が撃破または退場し、4回の最終hashが`042adf795061c696`で一致した。結果を`docs/evidence/m2-01-stage-01.*`へ保存した。
- 後半画像の初回確認で敵弾密度が教材として過多だったため、敵数を削らずGull、Skiff、Haulerの再攻撃間隔を延ばした。`m2-01-playing.png`と`m2-01-setpiece.png`を目視し、4シルエット、暖色中空弾、Hauler背面弱点、HUDの判別と文字切れなしを確認した。
- 単体19件、M2統合計測、型検査、production build、Chrome E2Eが`npm run verify`で合格した。試作図形は素材台帳の`prototype`を維持し、M2完了には数えていない。
- 次回はBLANK BAILIFFの消去扇、弾返し弱点、装甲文剥離を実装し、Stage 1通常区間からボス攻略へ接続する。

## 2026-10-31 — M2-02 BLANK BAILIFF

- 3分通常区間の直後へ独立したボス状態機械を接続し、3段階の装甲文、形態ごとに短くなる攻撃周期、照準付き消去扇、航跡消去、扇状弾、通常斉射を実装した。
- 消去扇の捕捉弾をCOLLATEで返すと装甲文へ90 damage、通常弾は1 damageとし、3枚剥離後は露出核へ通常射撃と返し弾の両方が通る攻略にした。通常射撃だけでも比較用に撃破可能な逃げ道を残した。
- ボス導入時に通常区間の残留敵弾が最初の予告を隠す問題を画像確認で発見し、章切替時に敵弾を除去する処理を追加した。
- 通常射撃撃破12,114tickに対しStitch航跡攻略は8,093tickで33.2%短縮した。3形態、装甲文3枚、返し弾7hit、最大敵弾78、生成拒否0、再実行hash`534b16ebca23b89f`一致を`docs/evidence/m2-02-blank-bailiff.*`へ保存した。
- 攻撃別被弾は消去扇14、形態3 sweep 11、通常斉射7として計測した。単体22件、自動計測2件、型検査、production build、Chrome E2Eに合格した。
- `m2-02-boss-warning.png`と`m2-02-boss-phase.png`を目視し、予告扇、扇形シルエット、装甲文3層と剥離差、名称・形態・耐久線、敵弾と航跡を識別でき、文字切れがないことを確認した。図形は素材台帳で`prototype`を維持する。
- 次回はタイトル、ガイド、コンティニュー、結果を状態遷移で接続し、耐久0のまま進行する未実装状態を解消する。

## 2026-10-31 — M2-03 Stage 1画面遷移とコンティニュー

- simulationとは別の判別可能な`AppState`を追加し、タイトル、ガイド、Stage 1導入、プレイ、ポーズ、コンティニュー、結果をキーボードだけで接続した。画面遷移時は押下・単発入力とaccumulatorを消去する。
- 耐久を0で下限固定し、0到達後はsimulation tickを停止する回帰テストを追加した。Stage 1のコンティニューは1回とし、開始地点またはBLANK BAILIFF出現時の決定的スナップショットへ、耐久3・ゲージ50・未確定航跡なし・敵弾なしで復帰する。
- blurと`visibilitychange`はプレイ中だけ自動ポーズし、明示入力まで再開しない。ポーズ、コンティニュー、結果などのオーバーレイ中にtickが進まないことを単体・Chromeの両方で確認した。
- 単体26件、Stage 1/Boss自動計測、型検査、production build、Chrome E2Eが`npm run verify`で合格した。体力の0下限化により証拠hashは更新されたが、同一入力の再実行一致と既存ゲートは維持した。
- `m2-03-title.png`、`guide`、`continue`、`result`の4画像を1280×720で目視し、文字切れ・重なりがなく、主操作と状態差を識別できることを確認した。画面とキャラクターはまだ`prototype`でありM2完成素材には数えない。
- 次回はStage 1の背景、自機、4通常敵、BLANK BAILIFF、主要戦闘表現をv4専用完成素材へ置き換え、制作規格を固定する。

## 2026-10-31 — M2-04 Stage 1完成ビジュアル

- built-in image generationでv4専用のStage 1遠景・中景・前景と、TRACE SKIFF、4通常敵、BLANK BAILIFF、反撃片を含む透明アトラスを新規制作した。過去版素材や外部IP名は使用していない。
- 背景3層を異なる速度で合成し、スプライト中心を既存の決定的当たり判定へ合わせた。航跡を外光・中心光・白芯の3層、候補を走査線付き、敵弾を二重中空輪へ変更した。
- 素材台帳を5件の`final`・`project-original`へ更新し、ファイル存在、必須メタデータ、仮素材0件を検査する`audit:assets`を`npm run verify`へ追加した。
- 単体26件、Stage 1/Boss自動計測2件、素材監査、型検査、production build、Chrome E2E 2件に合格した。シミュレーション規則と自動計測値は変更していない。
- `m2-04-combat.png`、`setpiece`、`boss-phase-1`、`boss-phase-3`を目視し、自機、4敵の役割、Hauler背面弱点、暖色中空弾、ボス装甲と露出核、HUDを識別でき、文字切れ・前景遮蔽がないことを確認した。
- 次回はStage 1専用の音楽3ステムと主要効果音、音声bus、音量監査を実装し、M2完成音響規格を固定する。

## 2026-10-31 — M2-05 Stage 1完成音響

- v4専用の決定的音声制作スクリプトを新規実装し、空洞の風と船殻共鳴、木質クリック、単音の倍音弦からなる16秒の環境・脈動・危機3ステムを44.1kHz stereo PCM16で制作した。
- 射撃、添え書き、候補、COLLATE成功/不発、RETRACE開始/終了、被弾、ボス予告、UI決定/戻るの11効果音を制作した。18弾捕捉は18 voiceを重ねず、捕捉数3段階の再生音程で伝える。
- Web AudioミキサへBGM、SE、UI、環境の4 bus、master limiter、SE 24・UI 4・環境8・音楽6 voice上限、同一音cooldownを実装した。ユーザー操作後にAudioContextを開始し、ポーズ時にステムを停止、再開時にsimulation tick位置へ同期する。
- simulationへ添え書き成立、RETRACE終了、ボス予告イベントを追加し、規則状態を音側から変更せず各効果音へ接続した。敵密度で脈動、BLANK BAILIFF形態で危機ステムを連続mixする。
- 単体素材14件はBGM RMS -20.03〜-19.00 dBFS、SE RMS -18.00 dBFS。3ステム、射撃10回、18弾COLLATE、予告、被弾、UI 5回の最悪mixはlimiter前peak -11.73 dBFS、NaN/clip 0だった。結果を`docs/evidence/m2-05-audio-audit.json`へ保存した。
- `npm run verify`で単体28件、Stage 1/Boss自動計測2件、素材・音量監査、型検査、production build、Chrome E2E 3件に合格した。Chromeでは初回操作開始、14 buffer decode、3 stem開始、BGM/SE独立mute、ポーズ停止、tick同期再開を確認した。
- 再採取された通常戦画像を目視し、自機、敵、弾、航跡、HUDの判別と文字切れなしを再確認した。Stage 1の完成画面・音・画面遷移が揃ったためM2を完了し、M3へ移行した。
- 次回はStage 2「逆風索引」の横風規則、4通常敵、3分通常区間をデータ駆動で実装する。

## 2026-10-31 — M3-01 Stage 2通常区間と4敵種

- `content/campaign.ts`へStage定義境界を追加し、既存Stage 1を既定値のまま保持してStage 2の出現表、期間、entity上限、環境規則を選択可能にした。
- Stage 2では6秒ごとに横風が反転し、自機へ0.18px/tick、既存航跡へ0.35px/tickを別々に適用する。候補輪も航跡と同量流し、風に抗う移動と反転前に置いた航跡への復帰を決定的規則にした。
- Index Kiteは風向を示す曲線移動、Vane Scribeは風下へ偏る5方向弾、Cross-Reference Pairは上下2体の交差射撃、Tab Binderは長く残る7方向弾幕として実装した。単独提示、混成、2回の大型山場からなる180秒・74出現を接続した。
- 初回計測ではTab Binderが2体とも退場したため、耐久だけで難しくしない方針に従い、弾幕と滞在時間を保ったまま耐久を調整し、全4種に1回以上の撃破を要求するゲートを追加した。
- Stitch操縦では最大同時敵10、敵弾101、最長無戦闘0tick、生成拒否0。全74出現を撃破または退場まで処理し、左右風向のCOLLATEは3回/4回、反転近傍3回、29回の風向反転を記録した。4回のhashは`c38efa846de026c1`で一致した。
- `npm run verify`で単体30件、Stage 1通常・ボスとStage 2通常の自動計測、素材・音量監査、型検査、production build、Chrome E2E 3件に合格した。Stage 2の単純シルエットは未接続の`prototype`として台帳登録し、完成画面には数えていない。
- 次回はCROSSWIND COMPILERの風見翼を輪で固定し、反対側の綴じ目を撃つ3形態ボス戦を実装する。

## 2026-10-31 — M3-02 CROSSWIND COMPILER

- Stage 2通常区間の直後へ独立したCROSSWIND COMPILER状態機械を接続した。風向に追従する風見翼を閉路へ収めると6秒間風向を固定し、反対側の綴じ目を露出する。形態移行時は翼を反転する。
- 中央への通常射撃は1 damageで撃破可能な逃げ道として残し、露出綴じ目は通常弾44、注釈弾58、反撃片88 damageとした。3形態は突風扇、風見側からの索引槍、7方向綴じ嵐に分け、生成数と被弾を個別計測した。
- 初回自動計測では被弾時の航跡消去によりStitchが1回しか風を固定できなかった。Compilerの攻撃は航跡を消さない規則へ改め、ボス用の小輪操縦と形態切替時の戦術リセットを追加した。
- 通常射撃は11,367tick、Stitch攻略は3,252tickで71.4%短縮した。3形態すべてで風固定、固定659tick、弱点24hit、攻撃別被弾3/4/1、最大敵弾31、生成拒否0、再実行hash`7de6454816039ea1`一致を`docs/evidence/m3-02-crosswind-compiler.*`へ保存した。
- 単体32件、Stage 1/2通常・ボス自動計測4件、素材・音量監査、型検査、production build、Chrome E2E 4件が`npm run verify`で合格した。
- Chrome画像を目視し、風見翼、反対側の露出綴じ目、風固定残り時間、3形態HUD、敵弾、航跡が判別でき、1280×720で文字切れがないことを確認した。Stage 2専用背景・完成アトラス・音は未制作のため、画像は開発用プレビューとして扱う。
- 次回はStage 1結果からStage 2導入・通常区間・ボス・結果までをAppStateで接続し、Stage 2開始地点とボス直前のコンティニューを実装する。

## 2026-10-31 — M3-03 Stage 1→2キャンペーン遷移と復帰

- Stageごとの開始処理をAppStateへ追加し、Stage 1結果の決定入力からStage 2章導入、通常区間、CROSSWIND COMPILER、Stage 2結果、タイトル帰還までを接続した。Stage 1結果ではEscapeによる終了も維持した。
- チェックポイントを`harbor-entry`、`bailiff-gate`、`crosswind-entry`、`compiler-gate`へ一般化した。各面で1回だけ、開始地点またはボス直前へ耐久3・ゲージ50・未確定航跡なし・敵弾なしで復帰する。
- Stage 2専用の章題、横風教材、Compiler攻略文、結果文を追加した。`m3-03-stage-02-intro.png`と`m3-03-stage-02-result.png`を1280×720で目視し、文字切れ・重なりがなく、Stage 1との画面状態差を識別できることを確認した。
- Chrome高速通しでStage 1結果からStage 2結果まで到達し、Stage 2開始地点とCompiler直前の両方から復帰、ポーズ中・コンティニュー中のtick停止、Stage 1の旧遷移を確認した。
- `npm run verify`で単体34件、自動計測4件、素材・音量監査、型検査、production build、Chrome E2E 5件に合格した。Stage 1/2のsimulation規則と既存自動計測値は変更していない。
- 次回はStage 2専用の背景3層、4通常敵、CROSSWIND COMPILER、風向・弱点表現を完成素材へ置き換え、通常戦・山場・ボス3形態を画像確認する。

## 2026-10-31 — M3-04 Stage 2完成ビジュアル

- built-in image generationで逆風索引の遠景・中景・前景と、Index Kite、Vane Scribe、Cross-Reference Pair、Tab Binder、CROSSWIND COMPILER、露出綴じ目を含む透明アトラスをv4専用に制作した。過去版素材や外部IP名は使用していない。
- Stageごとに背景3層とアトラスを選択する描画境界へ拡張し、Stage 2の開発用Canvas敵図形をすべて完成スプライトへ置換した。風向に流れる白い繊維、風固定時の金色化、反対側の二重輪綴じ目、形態反転をsimulation状態へ同期した。
- 初回Chrome確認で明るい前景上の下部操作欄が読みにくく、Compiler矩形へ上段スプライト端が混入していたため、52pxの下部欄外暗幕とsource rectangle補正を追加して再撮影した。
- `m3-04-stage-02-combat.png`、`stage-02-setpiece.png`、`compiler-phase-1/2/3.png`を1280×720で目視し、4敵の役割、Tab Binderの大型シルエット、風向、金色の風固定、露出綴じ目、暖色中空弾、航跡、HUDを識別でき、文字切れ・前景遮蔽がないことを確認した。
- 素材台帳をStage 2の5件の`final`へ更新し、Stage 2仮素材を0件にした。`npm run verify`で単体34件、自動計測4件、素材監査14件・仮素材0、音量監査、型検査、production build、Chrome E2E 6件に合格した。simulation規則と既存自動計測値は変更していない。
- 次回はStage 2専用の風音・羽根ポリリズム・危機ステムと環境・ボス効果音を制作し、音量監査とChromeのStage遷移・bus・ポーズ同期を確認する。

## 2026-10-31 — M3-05 Stage 2完成音響

- v4専用の決定的音声制作へStage 2を追加し、左右へ往復する紙繊維風、羽根の3:4ポリリズム、回転倍音とラチェットからなる16秒の環境・脈動・危機3ステムを44.1kHz stereo PCM16で制作した。Stage 1の生成結果はbit単位で維持した。
- 横風の左右反転、風固定、反対側の綴じ目露出、綴じ目命中、Compiler形態移行の6効果音を制作した。simulationから専用イベントを返し、音側は状態を変更せず即時cueとして消費する。
- 再生中Stageに応じて3ステムを切り替え、ポーズで停止、復帰時にtick位置へ同期するようミキサを拡張した。BGM、SE、UI、環境の4 busとSE 24・UI 4・環境8・音楽6 voice上限は維持した。
- 23単体素材はすべて44.1kHz stereo PCM16で、BGM RMS -22〜-16 dBFS、SE RMS -24〜-12 dBFS、SE peak -6 dBFS以下に合格した。Stage 2最悪mixはリミッタ前peak -9.77 dBFS、NaN/clip 0だった。結果を`docs/evidence/m3-05-audio-audit.json`へ保存した。
- 単体35件、自動計測4件、素材・音量監査、型検査、production buildに合格した。Chrome E2E 6件で初回操作開始、Stage 1→2ステム切替、BGM/SE分離、ポーズ停止・tick同期復帰、Compiler専用cueを確認した。
- 次回はStage 3「雨注回廊」の雨滴・濡れ航跡規則、4通常敵、通常区間を実装し、自動計測で固有攻略を検証する。

## 2026-10-31 — M3-06 Stage 3通常区間と4敵種

- `stage-03.ts`へ195秒・65出現の雨注回廊を追加し、Drip Scribe、Gutter Frog、Basin Bell、Reed Needleを単独提示、混成、2回の水門山場へ接続した。
- 18tick間隔の決定的な雨滴が航跡へ触れると5秒間濡れ、濡れた点が毎tick下へ垂れる規則を実装した。濡れ航跡を横切る添え書き弾は速度1.28倍・18 damageとなり、通常添え書きとの差を回帰テストで固定した。
- Drip Scribeは3滴弾、Gutter Frogは跳躍と波紋5方向弾、Basin Bellは全航跡を濡らす水位上昇、Reed Needleは最寄りの濡れ航跡へ突進する固有行動とした。
- Stitch操縦では最大同時敵8、敵弾82、最長無戦闘0tick、濡れた航跡点1,179、同時濡れ121、濡れ添え書き105発・954 damage、水位上昇54回、Reed突進102回、生成拒否0。全65出現を撃破または退場まで処理し、4回のhashが`026e557b658ef752`で一致した。
- 単体37件、自動計測5件、素材監査18 final・1 prototype、音量監査、型検査、production build、Chrome E2E 7件に合格した。既存Stage 1/2の計測ゲートも維持した。
- `m3-06-stage-03-combat.png`と`setpiece.png`を1280×720で目視し、雨線、青緑の濡れ航跡、4役割のシルエット、暖色中空弾、HUDを識別でき、文字切れがないことを確認した。Stage 3のCanvas表現は素材台帳で`prototype`として追跡する。
- 次回はLACUNA EELの複数小輪による発光節の順次印付け、濡れ添え書き弱点、3形態攻撃を実装する。

## 2026-10-31 — M3-07 LACUNA EEL

- Stage 3通常区間の直後へLACUNA EELを接続し、水路を横切る3つの発光節を形態ごとに順次弱点化する状態機械を実装した。現在節を小輪へ収めると6秒間の濡れ印が付き、形態移行時は次の節へ印を作り直す。
- 本体中央への通常射撃は1 damageの低効率な逃げ道として残した。印付き節は通常射撃8、添え書き18、反撃片30、濡れ添え書き96 damageとし、形態1を3滴drizzle、形態2を5方向wake、形態3を高速7方向delugeに分けた。
- 通常射撃は19,835tick、Stitch節攻略は8,154tickで58.9%短縮した。3節を各1回以上印付けし、弱点67hit・濡れ弱点2hit、全形態・全攻撃到達、最大敵弾45、生成拒否0、再実行hash`e42f4bc818997eb1`一致を`docs/evidence/m3-07-lacuna-eel.*`へ保存した。
- 発光節の小輪印付けと濡れ添え書き96 damageを固定する回帰テストを追加した。`npm run verify`で単体38件、自動計測6件、素材・音量監査、型検査、production build、Chrome E2E 8件に合格した。
- `m3-07-lacuna-eel-marked.png`と`phase-3.png`を1280×720で目視し、節番号、現在節、濡れ印、残り時間、耐久線、drizzle/deluge弾、自機、HUDを識別でき、文字切れがないことを確認した。ボスCanvas表現はStage 3完成素材まで`prototype`として扱う。
- 次回はStage 2結果からStage 3章導入・通常区間・LACUNA EEL・結果までをAppStateで接続し、Stage 3開始地点とボス直前のコンティニューを実装する。

## 2026-10-31 — M3-08 Stage 2→3キャンペーン遷移と復帰

- Stageごとの入口・ボス直前チェックポイントと次Stageを明示マップへ整理し、Stage 2結果からStage 3章導入、通常区間、LACUNA EEL、Stage 3結果、タイトル帰還までをAppStateで接続した。
- Stage 3へ`rain-gallery-entry`と`eel-gate`を追加した。各面1回のコンティニューで、開始地点または23,400tickのボス直前へ耐久3・ゲージ50・未確定航跡なし・敵弾なしで復帰する。
- 雨注回廊の章題、雨で濡れた航跡を横切る添え書き教材、LACUNA EELの節攻略文、Stage 3結果文を追加した。結果の決定入力はタイトルへ戻る。
- 単体39件に合格し、Stage 3の両チェックポイント、オーバーレイ中のtick停止、Stage 1→2→3旧遷移を固定した。production build後のChrome E2E 8件ではキャンペーン高速通し、両復帰、ポーズ停止、Stage 3結果まで合格した。
- `m3-08-stage-03-intro.png`と`m3-08-stage-03-result.png`を1280×720で目視し、章題、教材、結果、操作案内に文字切れ・重なりがなく、雨表現を背景にStage 2との状態差を識別できることを確認した。
- 次回はStage 3の背景3層、4通常敵、LACUNA EEL、雨・濡れ印・弱点表現を完成素材へ置き換え、通常戦、水門山場、ボス3形態を画像確認する。

## 2026-10-31 — M3-09 Stage 3完成ビジュアル

- built-in image generationで雨注回廊の遠景・中景・前景と、Drip Scribe、Gutter Frog、Basin Bell、Reed Needle、LACUNA EEL頭部、通常節、濡れ印節を含む透明アトラスをv4専用に制作した。過去版素材や外部IP名は使用していない。
- Stage 3へ背景3層とアトラスを接続し、開発用の単色グラデーションとCanvas敵図形を完成素材へ置換した。前景の雨、航跡上の濡れ光、奥の水面反射を別レイヤーとして維持した。
- 濡れ印節は滴形の切欠き、二重の金色輪郭、点線の外周で通常節と形でも区別した。濡れ添え書き弾には2本目の平行線と菱形の滴記号を追加し、色だけに依存しない弱点攻略表示にした。
- `m3-09-stage-03-combat.png`、`stage-03-setpiece.png`、`lacuna-eel-phase-1/2/3.png`を1280×720で目視し、4敵の役割、水門山場、3つの順次弱点、雨、濡れ航跡、暖色中空弾、HUDを識別でき、文字切れ・前景遮蔽がないことを確認した。
- 素材台帳をStage 3の5件の`final`へ更新し、Stage 3仮素材を0件にした。`npm run verify`で単体39件、自動計測6件、素材監査23件・仮素材0、音量監査、型検査、production build、Chrome E2E 8件に合格した。
- 次回はStage 3専用の雨粒密度・低い水共鳴・危機ステムと環境・ボス効果音を制作し、音量監査とChromeのStage遷移・bus・ポーズ同期を確認する。

## 2026-11-01 — M3-10 Stage 3完成音響

- 決定的音声制作へStage 3を追加し、空間的な雨粒密度、低い水共鳴、LACUNA EELの水中圧を担う16秒の環境・脈動・危機3ステムを44.1kHz stereo PCM16で制作した。Stage 1/2の生成済み音声は変更していない。
- 通常雨滴が航跡を初めて濡らす接触音、Basin Bellの水位上昇、濡れ添え書き、EEL節の印付け・弱点命中・形態移行の6効果音を制作した。雨滴接触は同tick内で1イベントへ集約し、environment busのcooldownと3 voice上限で密度を制御する。
- Stage 3の3ステムと6効果音を既存4 busへ接続し、SE 24・UI 4・環境8・音楽6 voice上限を維持した。Chromeの同時decode不安定化を避けるため、全32 bufferを決定的な順序でdecodeする。
- 全32素材は44.1kHz stereo PCM16で、Stage 3 BGM RMS -20.01〜-19.01 dBFS、SE RMS -18.00 dBFS、SE peak -7.93 dBFS以下に合格した。Stage 3最悪mixはリミッタ前peak -10.08 dBFS、NaN/clip 0で、`docs/evidence/m3-10-audio-audit.json`へ保存した。
- 単体41件、自動計測6件、素材監査27 final・仮素材0、音量監査、型検査、production build、Chrome E2E 8件に合格した。ChromeではStage 2→3ステム切替、Stage 3ポーズ停止・tick同期復帰、雨・水位・濡れ弾・EEL専用cueを確認した。
- 次回はStage 4「焼けた脚注」の熱波・冷却域規則、Ash Comma / Kiln Censor / Ember Courier / Char Press、通常区間を実装し、自動計測で固有攻略を検証する。

## 2026-11-01 — M3-11 Stage 4通常区間と4敵種

- `stage-04.ts`へ195秒・65出現の焼けた脚注を追加し、Ash Comma、Kiln Censor、Ember Courier、Char Pressを単独提示、混成、2回の冷却影山場へ接続した。
- 24tick周期の熱波が150tick以上経過した最古の非冷却航跡から焼き、正弦移動する半径145pxの冷却域が航跡寿命を6秒へ延長する決定的規則を実装した。冷却中の航跡はシアン点線で表示する。
- Ash Commaは撃破時に局所冷却、Kiln Censorは最古航跡への焼印、Ember Courierは輪で冷却変換して60 damageと8秒の印、Char Pressは上下交互の7方向圧迫弾を担う。初回自動計測ではCourier変換が0回だったため、移動標的へ輪を置く操縦と輪中心の許容距離を調整した。
- Stitch操縦では最大同時敵9、敵弾105、最長無戦闘0tick、焼失航跡480点、冷却3,359点、冷却域COLLATE 5回、Courier変換5回。全65出現を撃破または退場まで処理し、4回のhashが`64da2fe2d0c83ef8`で一致した。
- Stage 4の熱歪み、移動冷却域、冷却航跡、4敵シルエットを開発用Canvas previewとして実装し、素材台帳へ`prototype`登録した。`m3-11-stage-04-combat.png`と`setpiece.png`を1280×720で目視し、熱・冷却・敵・弾・航跡・HUDの判別と文字切れなしを確認した。
- `npm run verify`で単体43件、自動計測7件、素材監査27 final・1 prototype、音量監査、型検査、production build、Chrome E2E 9件に合格した。既存Stage 1〜3の計測・画面・遷移回帰も維持した。
- 次回はCINDER ADVOCATEの消去不能熱壁、輪で冷却反撃へ変える火種、3形態攻撃を実装する。

## 2026-11-01 — M3-12 CINDER ADVOCATE

- Stage 4通常区間直後へCINDER ADVOCATEを接続し、画面を縦断して消えない熱壁、低速の大型火種、火種投擲・上下熱槌列・高速7方向評決扇の3形態を実装した。
- 通常射撃と通常反撃片は熱壁で遮断し、1発につき1 heat stressだけを与える低効率な完遂経路とした。火種を輪へ入れるとシアン菱形の冷却反撃へ変わり、壁を通過して180 damageを与える。ボス固有弾の被弾は航跡を消さず、火種を囲む試行を維持する。
- 通常射撃は19,902tick、Stitch攻略は3,422tickで82.8%短縮した。Stitchは火種20投中12冷却・10命中、全3形態・全攻撃到達、最大敵弾51、生成拒否0、再実行hash`bd5ab8bc0acf1195`一致。通常射撃経路も全3形態を経て撃破した。
- 初回画像では通常区間用の移動冷却域がボス名と重なったため、ボス戦中は冷却域を退場させて熱壁へ焦点を絞った。`m3-12-cinder-advocate-phase-1.png`と`phase-3.png`を1280×720で目視し、熱壁、火種、冷却反撃、評決扇、耐久線、自機、HUDを識別でき、文字切れ・重なりがないことを確認した。
- 単体44件、自動計測8件、素材監査27 final・1 prototype、音量監査32素材、型検査、production build、Chrome E2E 10件に合格した。Stage 1〜4通常区間と既存3ボスの回帰も維持した。
- 次回はStage 3結果からStage 4章導入・通常区間・CINDER ADVOCATE・結果までをAppStateで接続し、Stage 4開始地点とボス直前のコンティニューを実装する。

## 2026-11-01 — M3-13 Stage 3→4キャンペーン遷移と復帰

- Stage 3結果の決定入力からStage 4章導入、195秒通常区間、CINDER ADVOCATE、Stage 4結果、タイトル帰還までをAppStateで接続した。Stage 1〜3の既存結果遷移とEscapeによる終了も維持した。
- Stage 4へ`burnt-footnote-entry`と`advocate-gate`を接続した。各面1回のコンティニューで、開始地点または23,400tickのボス直前へ耐久3・ゲージ50・未確定航跡なし・敵弾なしで復帰する。
- 焼けた脚注の章題、移動冷却域で古い航跡を守る教材、CINDER ADVOCATEの火種冷却反撃文、Stage 4結果文を通しで確認した。熱壁を越えられない汎用QA弾は、実際の攻略規則と同じ冷却火種へ修正した。
- 単体45件、型検査、production build、Chrome E2E 10件に合格した。ChromeではStage 3→4通し、両復帰、ポーズ・コンティニュー中のtick停止、CINDER ADVOCATE撃破、Stage 4結果からタイトル帰還を確認した。
- `m3-13-stage-04-intro.png`と`m3-13-stage-04-result.png`を1280×720で目視し、章題、教材、結果、操作案内に文字切れ・重なりがなく、Stage 3との状態差を識別できることを確認した。
- 次回はStage 4の背景3層、4通常敵、CINDER ADVOCATE、熱壁・火種・冷却反撃を完成素材へ置き換え、通常戦、山場、ボス3形態を画像確認する。

## 2026-11-01 — M3-14 Stage 4完成ビジュアル

- built-in image generationで焼けた脚注の遠景・中景・前景と、Ash Comma、Kiln Censor、Ember Courier、Char Press、CINDER ADVOCATE、熱壁、火種、冷却反撃を含む透明アトラスをv4専用に制作した。過去版素材や外部IP名は使用していない。
- 生成アトラスは褐色の敷き背景が残って見えたため、同じbuilt-in image generationの背景抽出でスプライトの形と配置を保ったまま透明度を補正した。Chrome画素検査で背景3層とアトラスにalpha 0の画素があることを確認した。
- Stage 4へ背景3層とアトラスを接続し、開発用グラデーション、4敵のCanvas図形、ボス・熱壁・火種・冷却反撃のCanvas図形を完成素材へ置換した。熱歪み、移動冷却域、冷却航跡はsimulation同期の手続き表現として維持した。
- `m3-14-stage-04-combat.png`、`stage-04-setpiece.png`、`cinder-advocate-phase-1/2/3.png`を1280×720で目視し、敵4役、冷却域、橙の斜線熱壁、火種、シアン二重菱形の冷却反撃、3形態攻撃、HUDを識別できた。文字切れ、前景遮蔽、アトラス混入、当たり判定との著しい見かけのずれはない。
- 素材台帳をStage 4の5件の`final`へ更新し、Stage 4仮素材を0件にした。単体45件、素材監査32件・仮素材0、型検査、production build、Chrome E2E 10件に合格した。
- 次回はStage 4専用の炉低周波・金属活字・危機ステムと環境・ボス効果音を制作し、音量監査とChromeのStage遷移・bus・ポーズ同期を確認する。

## 2026-11-01 — M3-15 Stage 4完成音響

- 決定的音声制作へStage 4を追加し、炉の低周波と熱い通風、金属活字とプレスの拍、CINDER ADVOCATEの審理圧を担う16秒の環境・脈動・危機3ステムを44.1kHz stereo PCM16で制作した。Stage 1〜3の生成済み音声は変更していない。
- 熱波、冷却域COLLATE、Ember Courier変換、火種冷却、熱壁命中、CINDER ADVOCATE形態移行の6効果音を制作した。熱波・冷却域はenvironment bus、残る攻略cueはSE busへ接続し、SE 24・UI 4・環境8・音楽6 voice上限を維持した。
- 熱波、冷却域、Courier変換にはsimulation由来の専用eventを追加した。Chrome QAでCourier変換が短い山場中に成立しなかった初回失敗は、出現直後のCourierを実攻略と同じ輪へ収める決定的入力へ直し、音だけを直接発火しない回帰テストにした。
- 全41素材は44.1kHz stereo PCM16で、Stage 4 BGM RMS -20.01〜-19.00 dBFS、SE RMS -18.00 dBFS、SE peak -7.61 dBFS以下に合格した。Stage 4最悪mixはリミッタ前peak -10.41 dBFS、NaN/clip 0で、`docs/evidence/m3-15-audio-audit.json`へ保存した。
- `npm run verify`で単体46件、自動計測8件、素材監査36 final・仮素材0、音量監査、型検査、production build、Chrome E2E 10件に合格した。ChromeではStage 3→4ステム切替、Stage 4ポーズ停止・tick同期復帰、6専用cueを確認した。
- 次回はStage 5「鏡写し議場」の鏡面帯・偽像航跡規則、Mirror Mote / Quotation Ram / False Witness / Silver Obelisk、210秒通常区間を実装し、自動計測で固有攻略を検証する。

## 2026-11-01 — M3-16 Stage 5通常区間と4敵種

- `stage-05.ts`へ210秒・69出現の鏡写し議場を追加し、Mirror Mote、Quotation Ram、False Witness、Silver Obeliskを単独提示から2回の固定鏡混成山場へ接続した。
- 2本の鏡面帯へ実航跡が入ると上下反射した偽像航跡を作る規則を実装した。偽像は射撃を1.34倍速・12 damageへ強化する一方、`findLoopCandidate`には実航跡だけを渡し、偽像を閉路へ使えない構造にした。
- Mirror Moteは自機上下移動の遅延反射、Quotation Ramは偽像航跡への突進、False Witnessは実弾1発へ無害な偽弾4発を混ぜる攻撃、Silver Obeliskは固定鏡から実弾と偽弾を放つ役割とした。偽弾は捕捉不能・接触無害で、マゼンタ点線菱形と低い暫定cueにより実弾と区別する。
- Stitch操縦では最大同時敵10、敵弾88、最長無戦闘0tick、偽像航跡最大127点、偽像添え書き93発、偽像閉路除外21,164tick、偽弾924発、生成拒否0。破壊不能なObelisk 6体を含む全69出現を処理し、4回hashが`0fe8cdcc4f6546a2`で一致した。
- 初回画像では空の濡れ・冷却航跡パスが偽像へシアン線を重ね、実像との区別を弱めていた。Stage 5では空パスを描かないよう修正し、偽像をマゼンタ光と短い点線、実像をシアン実線へ分離した。
- `m3-16-stage-05-combat.png`と`setpiece.png`を1280×720で目視し、2本の鏡面帯、実像と偽像、4敵輪郭、実弾と偽弾、自機、HUDを識別でき、文字切れがないことを確認した。Canvas previewは素材台帳で`prototype`として追跡する。
- `npm run verify`で単体50件、自動計測9件、素材監査36 final・1 prototype、音量監査41素材、型検査、production build、Chrome E2E 11件に合格した。
- 次回はAPOCRYPHA TWINSの同一実航跡輪による同期切断、片側弱点化、鏡像位置交換を含む3形態戦を実装する。

## 2026-11-01 — M3-17 APOCRYPHA TWINS

- Stage 5通常区間直後へAPOCRYPHA TWINSを接続し、上下の双体を同じ実航跡輪へ収めると6秒間だけ同期線が切れ、形態ごとに片側が金色の弱点になる状態機械を実装した。偽像航跡は従来どおり閉路へ使えない。
- 通常射撃は本体中央へ1 damageの低効率な完遂経路として残した。弱点側は通常射撃52、添え書き68、偽像添え書き80、反撃片90 damageとし、形態1を実弾と偽弾のtestimony、形態2を両側交差cross-exam、形態3を高速verdict混成に分けた。周期と形態移行で鏡像位置を交換する。
- 通常射撃は17,994tick、Stitch攻略は2,456tickで86.4%短縮した。Stitchは同期切断3回・切断363tick・弱点20hit、全形態・全攻撃到達、最大敵弾112、生成拒否0、再実行hash`75117edc1eef61a6`一致を`docs/evidence/m3-17-apocrypha-twins.*`へ保存した。
- `m3-17-apocrypha-twins-phase-1/2/3.png`を1280×720で目視し、点線の切断同期、金色の弱点側、通常側、位置交換、実弾・偽弾、耐久線、自機、HUDを識別でき、文字切れ・重なりがないことを確認した。ボスCanvas表現はStage 5完成素材まで`prototype`として扱う。
- `npm run verify`で単体51件、自動計測10件、素材監査36 final・1 prototype、音量監査41素材、型検査、production build、Chrome E2E 12件に合格した。
- 次回はStage 4結果からStage 5章導入・通常区間・APOCRYPHA TWINS・結果までをAppStateで接続し、Stage 5開始地点とボス直前のコンティニューを実装する。

## 2026-11-01 — M3-18 Stage 4→5キャンペーン遷移と復帰

- Stage 4結果の決定入力からStage 5章導入、210秒通常区間、APOCRYPHA TWINS、Stage 5結果、タイトル帰還までをAppStateで接続した。Stage 1〜4の既存結果遷移とEscapeによる終了も維持した。
- Stage 5へ`mirror-chamber-entry`と`apocrypha-gate`を接続した。各面1回のコンティニューで、開始地点または25,200tickのボス直前へ耐久3・ゲージ50・未確定航跡なし・敵弾なしで復帰する。
- 鏡写し議場の章題、偽像航跡は射撃を強めるが閉路に使えない教材、APOCRYPHA TWINSの同期切断文、Stage 5結果文を通しで確認した。Stage 4結果の案内もStage 5継続へ更新した。
- 最初の対象Chrome試験は変更前の`dist`を配信して失敗した。production buildを更新して再実行し、入口・ボス直前の両復帰、ポーズ・コンティニュー中のtick停止、APOCRYPHA TWINS撃破、Stage 5結果からタイトル帰還に合格した。
- `m3-18-stage-05-intro.png`と`m3-18-stage-05-result.png`を1280×720で目視し、章題、教材、結果、操作案内に文字切れ・重なりがなく、Stage 4との状態差を識別できることを確認した。
- `npm run verify`で単体52件、自動計測10件、素材監査36 final・1 prototype、音量監査41素材、型検査、production build、Chrome E2E 12件に合格した。
- 次回はStage 5の背景3層、4通常敵、APOCRYPHA TWINS、鏡面帯・偽像航跡・同期切断・片側弱点を完成素材へ置き換え、通常戦、固定鏡山場、ボス3形態を画像確認する。

## 2026-11-01 — M3-19 Stage 5完成ビジュアル

- built-in image generationで鏡写し議場の遠景・中景・前景と、Mirror Mote、Quotation Ram、False Witness、Silver Obelisk、APOCRYPHA TWIN通常側・弱点側を含む透明アトラスをv4専用に制作した。過去版素材や外部IP名は使用していない。
- Stage 5へ背景3層とアトラスを接続し、開発用グラデーション、4敵のCanvas図形、双子のCanvas図形を完成素材へ置換した。鏡面帯は銀の面勾配・反射綴じ目・菱形留め具へ仕上げ、偽像航跡、偽弾、切断同期はsimulation同期の手続き表現として維持した。
- 弱点側の双子は開いた金色コア、三角切欠き、点線外周を持ち、閉じた交差芯の通常側と色以外の形でも区別した。実航跡はシアン実線、偽像はマゼンタ点線、実弾は橙二重円、偽弾はマゼンタ点線菱形の規格を維持した。
- `m3-19-stage-05-combat.png`、`stage-05-setpiece.png`、`apocrypha-twins-phase-1/2/3.png`を1280×720で目視し、4敵、固定鏡、実像・偽像、実弾・偽弾、通常側・弱点側、3形態攻撃、HUDを識別できた。文字切れ、前景遮蔽、アトラス混入、当たり判定との著しい見かけのずれはない。
- 素材台帳をStage 5の背景3層・アトラス・Canvas効果の5件の`final`へ更新し、仮素材を0件にした。`npm run verify`で単体52件、自動計測10件、素材監査36 required final・仮素材0、音量監査41素材、型検査、production build、Chrome E2E 12件に合格した。
- 次回はStage 5専用の鏡共鳴・偽証律動・APOCRYPHA TWINS危機ステムと環境・ボス効果音を制作し、音量監査とChromeのStage遷移・bus・ポーズ同期を確認する。

## 2026-11-01 — M3-20 Stage 5完成音響

- 決定的音声制作へStage 5を追加し、暗い鏡共鳴と銀の反射、半拍ずれた証言と応答、APOCRYPHA TWINSの交換圧を担う16秒の環境・脈動・危機3ステムを44.1kHz stereo PCM16で制作した。Stage 1〜4の生成済み音声は変更していない。
- 鏡面帯へ航跡が入る反射、偽像航跡による添え書き、無害な偽弾、双体同期切断、露出弱点命中、形態移行の6効果音を制作した。鏡面帯へ外から入ったときだけ発火するsimulation eventを追加し、暫定の共通cue＋pitch変化を専用音へ置換した。
- Stage 5の3ステムと6効果音を既存4 busへ接続し、SE 24・UI 4・環境8・音楽6 voice上限を維持した。Chromeの全50 bufferは従来どおり決定的な順序でdecodeする。
- 全50素材は44.1kHz stereo PCM16で、Stage 5 BGM RMS -20.01〜-19.00 dBFS、SE RMS -18.00 dBFS、SE peak -7.64 dBFS以下に合格した。Stage 5最悪mixはリミッタ前peak -11.90 dBFS、NaN/clip 0で、`docs/evidence/m3-20-audio-audit.json`へ保存した。
- 単体52件、素材監査45 final・仮素材0、音量監査、型検査、production build、Chrome E2E 12件に合格した。ChromeではStage 4→5ステム切替、Stage 5ポーズ停止・tick同期復帰、6専用cueを実際のsimulation eventから確認した。
- 次回はStage 6「原本の夜明け」の風・雨・熱・鏡を再構成する通常区間と、Binding Wasp / Revision Hound / Null Choir / Archive Palanquinを実装し、自動計測で固有攻略を検証する。

## 2026-11-01 — M3-21 Stage 6通常区間と4敵種

- `stage-06.ts`へ270秒・90出現の原本の夜明けを追加した。風・雨・熱・鏡を各54秒で再構成し、最後の54秒は4規則を13.5秒ずつ切り替える統合区間として、過去規則を同時常設せず一本の操縦意図を引き継ぐ構成にした。
- Binding Waspは航跡2点を一時接続して意図しない候補を作り、Revision Houndは現在候補または直近航跡へ突進する。Null Choirは上下の順唱を担い、輪で印付けされた個体は次の発射を休んで射線に穴を作る。Archive Palanquinは印付け前後で7方向と3方向を切り替える最終大型とした。
- 最初の自動計測ではNull Choirの印付け穴が0回だった。輪内だけでなく輪中心から300px以内の最寄り個体まで印付けを許容し、見た目上の囲みと決定的判定の差を吸収した。再計測では穴2回、Binding接続221回、Hound校訂50回、Choir詠唱127回、Palanquin斉射48回、COLLATE 213回（統合区間41回）となった。
- Stitch操縦では最大同時敵7、敵弾73、最長無戦闘0tick。全90出現を撃破または退場まで処理し、敵・弾生成拒否0、M3-22追加後の再検証で4回hash`3a3f71dd4365787d`一致を`docs/evidence/m3-21-stage-06.*`へ保存した。
- Stage 6の規則色、区間名、4敵の別形状をCanvas previewとして実装し、素材台帳へ`prototype`登録した。最初の統合山場画像は敵種が2種しか残らず検査に失敗したため撮影時点を移し、`m3-21-stage-06-combat.png`と`setpiece.png`を1280×720で目視した。風区間と統合雨区間、3種以上の敵、危険弾、航跡、HUDを識別でき、文字切れはない。
- 単体52件、自動計測11件、素材監査45 final・1 prototype、音量監査50素材、型検査、production buildに合格した。Chrome E2Eは既存12件と修正後のStage 6対象1件に合格した。
- 次回はTHE LAST EDITORの過去5ボス規則を編集する3形態と、敵弾で巨大な署名輪を完成させる最終攻略を実装する。

## 2026-11-01 — M3-22 THE LAST EDITOR

- Stage 6通常区間直後へTHE LAST EDITORを接続した。形態1・2はBLANK BAILIFF、CROSSWIND COMPILER、LACUNA EEL、CINDER ADVOCATE、APOCRYPHA TWINS由来の消去・風・雨・熱・鏡攻撃を順に再編集し、対応する敵弾を輪で捕捉すると5秒間だけ校訂核が開く。
- 第3形態は画面中央へ8個の低速署名弾を置き、5個以上を50,000px²以上の巨大輪へ収めると8秒間だけ署名核が開く規則とした。通常射撃は低効率の1 damage経路を維持し、5規則校訂の代わりに通常hit 1,400回でも第3形態へ進めるため、攻略失敗時の詰みを避けた。
- 初回Stitch計測では校訂が2規則のまま火力で形態を越えたため、5規則を一度ずつ校訂するか通常hit条件を満たすまで第3形態へ入らないゲートを追加した。再計測では5規則すべてを校訂し、通常射撃20,425tickに対してStitchは9,967tickで51.2%短縮した。
- Stitchは校訂核629hit、署名弾32個・署名閉路1回、全3形態、消去/風/雨/熱/鏡/署名攻撃へ到達し、最大敵弾62、生成拒否0、再実行hash`08a30e6af64fb80b`一致となった。単体回帰では一致する規則弾の校訂と、巨大輪の面積・署名弾数条件を固定した。
- `m3-22-last-editor-phase-1/2/3.png`を1280×720で目視した。初回画像でStage 6区間名とボス名が重なったため、ボス戦中は区間名を非表示にして再撮影し、形態名、金色の校訂輪郭、署名8点、成立表示、耐久線、自機、HUDに文字切れ・重なりがないことを確認した。Canvas表現はStage 6完成素材まで`prototype`として追跡する。
- `npm run verify`で単体53件、自動計測12件、素材監査45 final・1 prototype、音量監査50素材、型検査、production build、Chrome E2E 14件に合格した。既存Stage 1〜6通常区間・5ボスの決定性と画面回帰も維持した。
- 次回はStage 5結果からStage 6章導入、270秒通常区間、THE LAST EDITOR、Stage 6結果までをAppStateで接続し、Stage 6開始地点とボス直前のコンティニューを実装する。

## 2026-11-01 — M3-23 Stage 5→6キャンペーン遷移と復帰

- Stage 5結果の決定入力からStage 6章導入、270秒通常区間、THE LAST EDITOR、Stage 6結果までをAppStateで接続した。Stage 1〜5の既存結果遷移とEscapeによる終了も維持した。
- Stage 6へ`original-dawn-entry`と`last-editor-gate`を接続した。各面1回のコンティニューで、開始地点または32,400tickのボス直前へ耐久3・ゲージ50・未確定航跡なし・敵弾なしで復帰する。
- 原本の夜明けの章題、風・雨・熱・鏡へ一つの意図を引き継ぐ教材、THE LAST EDITORの全規則校訂と署名輪攻略文、Stage 6結果文を通しで確認した。最終結果の決定入力は未実装エンディング専用の`ending-boundary`へ進み、完成扱いせず後続実装の遷移契約を固定した。
- 単体54件、自動計測12件、素材監査45 final・1 prototype、音量監査50素材、型検査、production build、Chrome E2E 14件に合格した。ChromeではStage 1→6高速通し、Stage 6両復帰、ポーズ・コンティニュー・結果・エンディング境界中のtick停止、THE LAST EDITOR撃破を確認した。
- `m3-23-stage-06-intro.png`と`m3-23-stage-06-result.png`を1280×720で目視し、章題、教材、最終結果、スコア、エンディングへの案内に文字切れ・重なりがないことを確認した。
- 次回はStage 6の背景3層、4通常敵、THE LAST EDITOR、校訂核・署名弾・署名輪を完成素材へ置き換え、通常戦、統合山場、ボス3形態を画像確認する。

## 2026-11-01 — M3-24 Stage 6完成ビジュアル

- built-in image generationで原本の夜明けの遠景・中景・前景と、Binding Wasp、Revision Hound、Null Choir、Archive Palanquin、THE LAST EDITOR閉鎖核・開放核、署名弾・署名成立核を含む透明アトラスをv4専用に制作した。過去版素材や外部IP名は使用していない。
- Stage 6へ背景3層とアトラスを接続し、単色規則washとCanvas敵・ボス図形を完成素材へ置換した。規則washは背景を隠さない半透明の環境光へ変更し、風・雨・熱・鏡のsimulation同期表現、巨大署名輪、区間表示は維持した。
- 通常4敵は糸翼・低い楔・三本の声管・大型書庫という別形状にした。最終ボスは閉鎖核と三角切欠き・点線外周を持つ開放核を切り替え、形態3では8点輪郭の署名弾と独立した署名成立核を表示して、攻略状態を色だけに依存させない。
- `m3-24-stage-06-combat.png`、`setpiece.png`、`last-editor-phase-1/2/3.png`を1280×720で目視し、5航路が夜明けの綴じ核へ収束する奥行き、4敵、危険弾、航跡、規則区間、校訂開放、署名8点、巨大点線輪、HUDを識別できた。文字切れ、前景遮蔽、アトラス混入、当たり判定との著しい見かけのずれはない。
- 素材台帳をStage 6の背景3層・アトラス・Canvas効果の5件の`final`へ更新し、仮素材を0件にした。`npm run verify`のうち単体54件、自動計測12件、素材監査50 final・仮素材0、音量監査50素材、型検査、production buildに合格した。sandbox内のChrome起動は`EPERM 127.0.0.1:4174`で一度停止したが、許可済み実行経路でChrome E2E 14件に合格した。
- 次回はStage 6専用の5航路統合・夜明け和音・THE LAST EDITOR危機ステムと環境・ボス効果音を制作し、音量監査とChromeのStage遷移・bus・ポーズ同期を確認する。

## 2026-11-01 — M3-25 Stage 6完成音響

- 決定的音声制作へStage 6を追加し、5航路の音色を3.2秒ごとに再構成する環境、全区間を一本のstitch rhythmで束ねる脈動、THE LAST EDITORの低い編集圧を担う16秒の環境・脈動・危機3ステムを44.1kHz stereo PCM16で制作した。Stage 1〜5の生成済み音声は変更していない。
- folio切替、Binding Waspの航跡接続、Null Choirの印付け射線穴、THE LAST EDITORの規則校訂、巨大署名輪成立、形態移行の6効果音を制作した。最初のChrome QAでは校訂済みmaskを先に設定したため実イベントが抑止され、Binding接続条件も不十分だった。音を直接発火せず、実simulation規則を通る決定的シナリオへ修正した。
- Stage 6の3ステムと6効果音を既存4 busへ接続し、SE 24・UI 4・環境8・音楽6 voice上限を維持した。区間境界、Binding接続、Choir休唱を新しいsimulation eventとして定義し、ボスの既存攻略eventと同じ経路で再生する。
- 全59素材は44.1kHz stereo PCM16で、Stage 6 BGM RMS -20.01〜-19.00 dBFS、SE RMS -18.00 dBFS、SE peak -7.64 dBFS以下に合格した。Stage 6最悪mixはリミッタ前peak -9.92 dBFS、NaN/clip 0で、`docs/evidence/m3-25-audio-audit.json`へ保存した。
- `npm run verify`で単体55件、自動計測12件、素材監査50 final・仮素材0、音量監査、型検査、production build、Chrome E2E 14件に合格した。ChromeではStage 5→6ステム切替、Stage 6ポーズ停止・tick同期復帰、6専用cueを実際のsimulation eventから確認した。
- 次回はStage 6結果からENDING、CAMPAIGN RESULT、TITLEまでを完成画面と演出で接続し、Stage 1からのChrome全通しでM3完了条件を判定する。

## 2026-11-01 — M3-26 ENDINGとキャンペーン完走

- 仮の`ending-boundary`を正式な`ending`と`campaign-result`へ置換し、Stage 6結果からENDING、CAMPAIGN RESULT、TITLEまでを接続した。各結果確定時にスコア、COLLATE、返弾、被弾、復帰使用数を累積し、6/6面の完走状態を保持する。
- ENDINGは6色の航跡が夜明けの署名輪へ収束する専用Canvas演出、CAMPAIGN RESULTは6面の完走線と累積実績を表示する完成画面とした。`m3-26-ending.png`と`m3-26-campaign-result.png`を1280×720で目視し、文字切れ・重なりがなく、結末と集計の情報階層を判別できることを確認した。
- 結末2画面ではsimulation tickを停止し、EnterによるENDING→CAMPAIGN RESULT→TITLEの明示遷移とEscape帰還を実装した。Stage 6の3ステムを結末用mixで再開し、画面遷移UI cueを維持し、TITLE帰還時に停止する。
- 単体55件、自動計測12件、素材監査50 final・仮素材0、音量監査59素材、型検査、production build、Chrome E2E 14件に合格した。Stage 1から6面、最終ボス、ENDING、CAMPAIGN RESULT、TITLEまでの高速全通しに合格し、M3を完了してM4へ移行した。
- 次回はM4-01として、キャンペーン保存、TITLEのCONTINUE SAVE、保存拒否時のメモリ継続と非保存表示を実装する。

## 2026-11-01 — M4-01 キャンペーン保存とCONTINUE SAVE

- `palimpsest-wake:v4.0:save`専用の保存モジュールを追加した。schema version 1、build version、stage、checkpoint、health、gauge、marginalia、score、seed、残り復帰、累積campaign、決定的checkpoint stateをFNV-1aチェックサム付きで記録する。
- 一時キーへ書込み、読戻しとスキーマ・チェックサム検証後に本キーを更新する。壊れたJSON、改変値、未知版、範囲外値はtimestamp付き隔離キーへ移し、v3.4など旧版キーは読込・削除しない。
- 全6面の入口とボス直前、復帰使用後に自動保存し、TITLEへ`C  CONTINUE SAVE`を追加した。完走してENDINGへ入った時点で再開データを消し、完了済みボス前へ戻らないようにした。
- quota・security・private mode相当の例外はゲームを止めず、同一セッションをメモリ上で継続する。非保存表示は一度だけ出し、次の画面遷移で消える。
- `m4-01-title-save.png`と`m4-01-save-unavailable.png`を1280×720で目視し、タイトル選択肢と警告に文字切れ・重なりがないことを確認した。
- `npm run verify`で単体60件、自動計測12件、素材監査50 final・仮素材0、音量監査59素材、型検査、production build、Chrome E2E 17件に合格した。保存再読込、ボス前復帰、破損隔離、旧版分離、SecurityError後のメモリ進行をChromeで確認した。
- 次回はM4-02として、TITLEとPAUSEから入れるSETTINGS、BGM・SE、画面揺れ、点滅軽減、難易度と設定独立保存を実装する。

## 2026-11-01 — M4-02 SETTINGSと独立設定保存

- TITLEとPAUSEの両方から入れるSETTINGSを追加し、BGM、SE、画面揺れ、点滅軽減、ECHO / NORMAL / PROOFをキーボードだけで変更できるようにした。PAUSEから戻った場合はsimulation tickを進めずPAUSEへ復帰する。
- `palimpsest-wake:v4.0:settings`専用モジュールを追加し、一時キーの読戻し後に確定する。破損JSON、範囲外音量、未知難易度は既定値へ拒否し、キャンペーン保存と互いに読書きしない。
- BGMをmusic / environment、SEをse / ui busへ知覚カーブで即時反映した。画面揺れOFFは被弾直後の局所揺れを止め、点滅軽減はCOLLATE候補の周期輝度を固定する。保存拒否時は変更をメモリへ残し、セッション限定であることを画面へ表示する。
- ECHOは航跡寿命4.0秒・被弾無敵1.6秒、NORMALは既存値、PROOFは予告と弾速を維持し通常敵の初回攻撃間隔を18%短縮する。難易度は新規Stageと進行中simulationへ設定から適用する。
- `m4-02-settings.png`と`m4-02-settings-unavailable.png`を1280×720で目視し、5項目、選択状態、値、操作案内、保存不能警告に文字切れ・重なりがないことを確認した。
- 単体65件、自動計測12件、素材監査50 final・仮素材0、音量監査59素材、型検査、production buildに合格した。sandbox内のChrome preview bindは`EPERM 127.0.0.1:4174`で一度停止したが、許可済み実行経路でChrome E2E 19件に合格した。
- 次回はM4-03として、設計済みなのに未接続の欄外注をStage結果へ接続し、成長選択・保存復元・simulation効果を実装する。

## 2026-11-01 — M4-03 欄外注のキャンペーン接続

- 全6 Stageの結果確定後へMARGINALIA画面を挟み、固定seedで並ぶ3候補からキーボードで1つを選ぶ遷移を実装した。選択中はsimulation tickを停止し、選択後だけ次StageまたはENDINGへ進む。
- 最初の実用縦切りとして、筆致系LONGHANDは1枠ごとに航跡寿命+0.7秒・最大ゲージ-10、添え書き系RUBRICは印付き敵への注釈弾貫通・通常連射間隔+3tick、回収系REDACTIONは捕捉上限+6・反撃片へ決定的な追尾偏差を与える効果と代償を実装した。重ね取りを許し、同系統と異系統の両構成を保持できる。
- 取得済み欄外注をAppStateとv4.0保存へ接続した。候補ID以外と7枠以上は保存検証で拒否し、Stage入口・ボス直前・コンティニューのチェックポイントから取得構成を復元する。
- `m4-03-marginalia.png`を1280×720で目視し、3系統、利点、代償、選択枠、取得数、操作案内に文字切れ・重なりがなく、背景上でも選択状態を識別できることを確認した。
- `npm run verify`で単体69件、自動計測12件、素材監査50 final・仮素材0、音量監査59素材、型検査、production build、Chrome E2E 19件に合格した。Chromeでは6面すべての結果→欄外注→次面、選択中tick停止、キャンペーン全通し、既存の音声・保存・復帰回帰を確認した。
- 次回はM4-04として、残る欄外注9種と各Stage中間選択を実装し、全12候補の到達可能性と構成別の攻略時間・被弾・火力を自動比較する。

## 2026-11-01 — M4-04 欄外注12種と中間選択

- 筆致系へFOOTNOTE / CROSS-REFERENCE / ERRATA、添え書き系へGLOSS / LIGATURE / UNDERLINE、回収系へCITATION / PALINODE / AFTERWORDを追加し、既存3種と合わせて12種を利点と代償の両方がsimulationへ作用する形で接続した。
- 全6 Stageの通常区間中央へMARGINALIAを追加した。各中間と結果で筆致・添え書き・回収から1候補ずつ提示し、選択中はtickを停止、中間選択後は同じtickから再開する。取得数上限と保存検証を12枠へ広げ、中間選択直後にも構成を保存する。
- seed 404の中間・結果12回で全12候補へ到達することを単体テストへ固定した。60秒・seed 4404でbaseline、3系統特化、balanced、resilientの6構成を比較し、スコア12,184〜25,552、撃破9〜19、被弾13〜23、COLLATE 2〜6、射撃554〜720の差を`m4-04-marginalia.*`へ保存した。これは初期差分の確認であり、最終バランス判定は30seed全通しへ残す。
- `m4-04-midpoint-marginalia.png`を1280×720で目視し、3候補の系統・名称・利点・代償、選択枠、操作案内に文字切れや重なりがなく、暗転した戦闘背景から選択状態を判別できることを確認した。
- 単体73件、自動計測13件、素材監査50 final・仮素材0、音量監査59素材、型検査、production build、Chrome E2E 20件に合格した。sandbox内のpreview bindは`EPERM`で一度停止したが、許可済み実行経路で中間選択の停止・保存・再開と既存全通し回帰に合格した。
- 次回はM4-05として、3難易度×30seedの全通しバランスと最重負荷性能を計測し、欄外注の死に候補・支配構成と15〜25分ゲートを調整する。

## 2026-11-01 — M4-05前半 被弾弾消去とsimulation性能ゲート

- 3難易度キャンペーン計測の準備中、耐久3・各面1コンティニューの実進行がStage 1前半で終わる失敗を再現した。設計では被弾時に弱い敵弾を消すが、実装は未確定航跡だけを消して通常敵の一斉射を残していたため、無敵終了直後の連続被弾を招いていた。
- 被弾した`enemy-volley`を含む画面内の通常敵弾を消すよう修正した。BLANK BAILIFFを含むボス固有弾は維持し、通常敵弾2発とボス弾1発を置いた回帰テストで、耐久が1減り通常敵弾だけが消えることを固定した。単体は74件に増えた。
- 弾消去によってStage 5序盤の無戦闘時間が560tickへ伸びる回帰を検出したため、初回教材とQuotation Ram導入の間へMirror Moteを1体追加した。70出現を処理し、最長空白200tick、最大敵10・敵弾66、生成拒否0、4回hash一致へ戻した。
- 最重負荷固定リプレイとして、PROOF・全12欄外注のStage 6を24,000tickまで進め、10秒ウォームアップ後に後半の鏡・統合区間・THE LAST EDITOR入口を60秒計測する独立した`npm run performance`を追加した。
- simulation 1 tickは平均0.018ms、p95 0.032ms、最大1.518msで、基準0.8 / 1.5 / 4msをすべて下回った。最大同時敵8、敵弾42、敵・弾生成拒否0を`m4-05-simulation-performance.*`へ保存した。
- `npm run verify`で単体74件、自動計測13件、性能計測1件、素材監査50 final・仮素材0、音量監査59素材、型検査、production build、Chrome E2E 20件に合格した。
- 30seed計測の初期失敗は合格証拠にせず破棄した。次回は修正後の3難易度×30seed全通しを構成選択込みで再設計し、15〜25分、被弾、コンティニュー、候補選択率、面別・形態別時間を判定する。同時にChrome frame、long task、10分heapの残る性能ゲートを測る。

## 2026-11-01 — M4-05後半 Chrome性能ゲート

- Stage 6の鏡・統合区間からTHE LAST EDITOR入口までを固定Stitch入力で進めるChrome性能E2Eを追加した。CanvasのCPU描画を1,200frame、実時間60秒のlong task、入力から次描画、最重負荷を10回繰り返す10分相当のGC済みheapで測る。
- 初回は同期render warmupで発生した185ms taskを`buffered: true`で計測窓へ混入させて失敗した。PerformanceObserverをwarmup後から開始し、過去entryを含めないよう修正して再計測した。
- 全`npm run verify`時の表示frame CPUは平均0.063ms、p95 0.200ms、最大0.400msで8 / 12 / 25ms基準を下回った。入力から次描画0.600ms、60秒の50ms超long task 0、10分相当のGC済みheapは2,119,128から2,205,136 bytesへ4.06%増で15%未満となり、Chrome性能ゲートに合格した。
- 3難易度×30seedの探索計測では既存Stitchが耐久0を無視していた問題を再確認し、実AppStateでは全走行がStage 1中に各2回の耐久3を使い切った。攻撃間隔や回復の推測調整は合格根拠にならなかったためすべて取り下げ、製品コードへ残していない。
- 次回は画面内の危険と短期目標だけを使う通常クリア操縦を、耐久0停止・コンティニュー・中間/結果欄外注を含むAppState通しとして先に成立させる。その後3難易度×30seedで15〜25分、被弾、コンティニュー、選択率、面別・形態別時間を判定する。
- `npm run verify`で単体74件、自動計測13件、simulation性能1件、素材監査50 final・仮素材0、音量監査59素材、型検査、production build、Chrome E2E 21件に合格した。

## 2026-11-01 — M4-05完成 3難易度×30seedキャンペーン調整

- 耐久0で停止し、各面1回のコンティニュー、中間/結果の欄外注選択、Stage遷移をすべて実AppStateで処理する通常クリア操縦を追加した。通常区間は画面内の短期危険を避ける左側巡回、ボスは各固有攻略を使い、THE LAST EDITOR形態3では署名弾5個以上を確認してから50,000px²以上の輪を閉じる。
- 難易度差が初回攻撃だけで消えないよう、通常敵の継続射撃間隔をECHO / NORMAL / PROOFで分離した。ボス入口と形態移行で耐久を回復し短い立て直し時間を与え、COLLATE成功へ耐久1回復と15秒の防御報酬を接続した。RUBRIC / LIGATURE / UNDERLINEのボス戦で純粋な不利益となる部分も除いた。
- `npm run balance`でseed 4500〜4529を3難易度それぞれ実行した。全90走行がENDINGまで完走し、ECHOは23.68 / 24.75 / 25.39分、NORMALは23.66 / 24.40 / 25.55分、PROOFは23.70 / 24.37 / 25.49分（最小 / 中央 / 最大）、被弾中央値は1 / 1 / 2、コンティニューは全走行0だった。決定的サンプリング誤差36秒を含む15:00〜25:36ゲートに合格した。
- 全12欄外注は90走行合計で各81〜99回選択され、死に候補0だった。結果を`m4-05-campaign-balance.json`と`.md`へ保存した。
- 高速QAでStage 6中間選択に停止していたシナリオを修正し、同期進行で環境voice上限へ達する前に実際のNull Choir攻撃イベントを発火させた。全E2Eで音声cueを含む6面遷移を再確認した。
- 最終状態で単体74件、自動操縦13件、simulation性能1件、Chrome E2E 21件、production build、素材監査50 final・仮素材0、音量監査59素材（Stage 6最悪リミッタ前peak -9.92 dBFS）に合格した。
- 次回はM4-06として、完成ゲートと既存証跡を一件ずつ照合し、非流用、画面・当たり判定整合、全画面目視の未確認分を閉じる。
