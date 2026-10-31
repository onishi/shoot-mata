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
