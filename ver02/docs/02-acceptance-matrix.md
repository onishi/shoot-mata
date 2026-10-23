# 02 受け入れマトリクス

状態: Phase 02完了・実装前ベースライン（2026-10-19）

`02-product-requirements.md` の全必須IDを追跡する。状態は `未着手 / 実装中 / 実装済み未検証 / 合格 / 不合格 / ブロック` のいずれかとする。2026-10-21のユーザー指示により人間の主観評価は進行ゲートに使わない。自動テストだけで主観品質を合格にせず、未評価と明記したうえで、証拠欄にはテスト名、画面、動画、計測、台帳などの実在する場所を記す。

| ID | 実装 | 最終検証 | 合格条件・証拠 | 状態 |
| --- | --- | --- | --- | --- |
| EXP-01 | P03, P06 | P09, P10 | P03全729列の状態変化・代償集計、P06以降の経路別シミュレーション。主観的な判断の面白さは未評価 | 実装中 |
| EXP-02 | P03, P07 | P09, P10 | P03武器機能テスト、P07の敵種・区間別撃破時間と被弾余地の決定的比較 | 実装中 |
| EXP-03 | P05, P08 | P09, P10 | 被弾理由と直前コア列を表示し、再挑戦導線を操作確認 | 未着手 |
| EXP-04 | P07 | P09, P10 | 4ステージの固有要素を通しプレイ、画像・動画で比較 | 未着手 |
| EXP-05 | P04, P07 | P10 | P04代表シーン、音7点、制作規則と自作音権利台帳を整備。P07全製品素材の一貫性と権利を再検証 | 実装中 |
| LOOP-01 | P05, P07 | P08, P10 | 製品入口へ4面キャンペーン、各結果からの次面遷移、面別固定seed、エンディング、総合結果、クレジットを接続。実コンテンツ4面の統合テストとChrome `?qa=campaign`で開始→4面→ending→creditsを連続完走し、240Hz QA clockで総合score 54,140を確認 | 実装中 |
| LOOP-02 | P07 | P08, P10 | 4ステージ各々の開始→結果→再挑戦テスト | 未着手 |
| LOOP-03 | P03, P06 | P09, P10 | `phases/phase-03/prototype/objective-audit.mjs`、ゲーム内統合テスト | 実装中 |
| LOOP-04 | P05 | P08, P10 | `flow-machine.test.mjs`と`game-session.test.mjs`でポーズ・復帰・再開始／離脱確認を検査。ChromeでPointer Eventsのポーズ、再開始確認取消、復帰を操作 | 実装中 |
| LOOP-05 | P07 | P08, P10 | 4面別結果を重複なく集計し、固有エンディング、総合score内訳、クレジット、タイトル帰還を実装。Nodeの実4面連続通しとChromeで`QA PASS / 4 STAGES / ENDING + CREDITS`を確認 | 実装中 |
| LOOP-06 | P05, P07 | P08, P10 | Chrome自動入力で第1〜3面を各2回クリア。第3面はtick 3577・score 11950、結果→attempt 2、最終snapshot一致。第4面は後続 | 実装中 |
| CORE-01 | P03, P04 | P09, P10 | P03試作の落下中コア・HUD・凡例で3色を外形・内部記号でも区別。`prototype/tests/model.test.mjs`、3画面画像。P04分離素材の48×48グレースケール検査は `docs/04-asset-inventory.md`。ゲーム内完成アートで再検証 | 実装中 |
| CORE-02 | P03 | P03, P10 | `prototype/tests/model.test.mjs`、`prototype/objective-audit.mjs` の全729列 | 実装中 |
| CORE-03 | P03, P07 | P07, P10 | P03試作に加え、製品戦闘で3系統×3段階の弾数・貫通・追尾、Lv別弾形状・発射音、自機上の菱形・十字・円と点灯数を自動検査。Chromeの第1面通しでLANCE Lv1とSEEKER Lv2を実表示。全区間の最終確認は後続 | 実装中 |
| CORE-04 | P03, P07 | P09, P10 | P03全729列の混色・代償判定、P07の構成別戦闘シミュレーション | 実装中 |
| CORE-05 | P03, P05 | P08, P10 | 被弾時の最古コア喪失、空時の残機喪失、青補助無敵、ゲームオーバーに加え、全コア喪失後の標準範囲回収と`UNARMED Lv0`表示を検査。ミス・コンティニューと完成HUDは後続 | 実装中 |
| CORE-06 | P04, P06 | P09, P10 | P04代表HUDに加え、製品自機へ無武装、3主武器×3Lv、混色補助、被弾後無敵を非色形状で接続。10構成の描画一意性、動き軽減、高コントラストを自動検査し、Chrome 390×844・844×390で確認 | 実装中 |
| CORE-07 | P07 | P08, P10 | 各面のドロップ列検査、必要色枯渇の長時間シミュレーション | 未着手 |
| WPN-01 | P03, P07 | P07, P10 | P06製品戦闘で赤Lv1〜3の威力・貫通、Lv別菱形、専用音を検査。実ブラウザでLv1弾を確認 | 実装中 |
| WPN-02 | P03, P07 | P07, P10 | P06製品戦闘で青Lv1〜3の3/5/7発広射線、Lv別山形、専用音を検査。全区間の画面確認は後続 | 実装中 |
| WPN-03 | P03, P07 | P07, P10 | P06製品戦闘で黄Lv1〜3の1/2/3発追尾、Lv別円形、専用音を検査。全区間の画面確認は後続 | 実装中 |
| WPN-04 | P03, P07 | P09, P10 | `stage-simulation.test.mjs`でHP40敵・HP200 bossの9構成撃破tickを固定比較。群れ・遮蔽別の逆転検証は後続 | 実装中 |
| STG-01 | P06 | P06, P10 | `stage-01-orbital-wreck.test.mjs`とChrome `?qa=stage01`で、通常戦、圧縮回廊、3段階boss、結果、同seed再挑戦を完走。390×844・844×390でoverflow 0、console warning/error 0 | 実装済み未検証 |
| STG-02 | P07 | P07, P10 | 完成背景3層・敵3種・boss、上下気流・開閉遮蔽・帯電域、3段階boss、通常2層/Boss 3音層を接続。Chrome `?qa=stage02`で2完走・score 9525・snapshot一致、通常入口から選択・出撃、3 viewportを確認。個別アニメーションと主観品質は後続 | 実装中 |
| STG-03 | P07 | P07, P10 | 完成背景3層、再生群体・寄生砲台・捕食体、射撃開口・増殖源・収縮通路、成長3段階boss、通常2層/Boss 3音層を製品入口へ接続。`stage-03-living-ark.test.mjs`とChrome `?qa=stage03`で2完走・tick 3577・score 11950・snapshot一致、3 viewport、キーボード/Pointer Eventsのポーズを確認。個別アニメーションと主観品質は後続 | 実装中 |
| STG-04 | P07 | P07, P10 | 完成背景3層、耐熱装甲・突進機・全方向砲台、周期熱波・退避域・可変安全圏、3形態boss、通常2層/Boss 3音層を製品入口へ接続。`stage-04-stellar-furnace.test.mjs`とChrome `?qa=stage04`で2完走・tick 3512・score 17360・snapshot一致、通常入口から選択・出撃、3 viewport、キーボード/Pointer Eventsのポーズを確認。個別アニメーションと主観品質は後続 | 実装中 |
| STG-05 | P06, P07 | P07, P10 | 第1面は敵3種・圧縮回廊・3段階bossをデータと決定的通しへ実装。専用boss音・全演出と残り3面は継続 | 実装中 |
| STG-06 | P07 | P09, P10 | 全面の難度曲線計測と複数完走記録 | 未着手 |
| PROG-01 | P05, P07 | P08, P10 | 初期状態、説明済み、実4面クリアごとの段階解放、全4面クリア後の再起動、解放済み第4面選択をapplication統合テストで確認。Chromeの4面連続通しでも各結果を経て次面へ遷移 | 実装中 |
| PROG-02 | P05, P09 | P09, P10 | 標準・アシストの保存値を検査。戦闘パラメーター反映と両設定の完走は後続 | 実装中 |
| PROG-03 | P05, P07 | P08, P10 | Phase 05戦闘状態に敵、コア、連続撃破、無被弾の内訳を実装し決定的通しで照合。結果画面と製品バランスは後続 | 実装中 |
| PROG-04 | P05 | P08, P10 | 面・難度別best、内訳、コア列の分離・保存復元に加え、applicationで仮区間クリアを一度だけbestへ保存する統合検査に合格。4面の実ブラウザ復元は後続 | 実装中 |
| PROG-05 | P05 | P08, P10 | version 1、v0移行、破損退避、未来version、storage取得・読込・書込失敗、確認付き初期化を自動検査。警告UIを接続し、正常保存のChrome再読込を確認。実ブラウザの拒否注入は未確認 | 実装中 |
| PROG-06 | P07 | P09, P10 | 初見観察、被弾位置分布、予告レビュー | 未着手 |
| UX-01 | P05, P07 | P08, P10 | タイトル、初回説明、stage select、stage intro、HUD、ポーズ、確認、結果、ゲームオーバー、再挑戦、ending、総合結果、creditsを製品入口へ接続。ChromeのPC・390×844・844×390でcredits表示とoverflow 0を確認。設定専用画面は後続 | 実装中 |
| UX-02 | P05, P06 | P09, P10 | 初回説明をブラウザ入口へ接続しChromeでEnter導線を確認。段階説明、再表示、初見観察は後続 | 実装中 |
| UX-03 | P04, P06 | P09, P10 | P04代表HUDは11.58〜11.65%を3画面で確認。P05 Canvasへscore、残機、3コア、武器、boss meterを同一表示モデルから描画。P06ゲーム本体で再検証 | 実装中 |
| UX-04 | P04, P07 | P09, P10 | P04実PNGをグレースケール・3種色覚シミュレーションで検査し、コア間37.02/255以上、自機・敵25.24/255以上、非色シグネチャ重複0。`reference-scene/visual-audit.test.mjs`。P07全素材で再検証 | 実装中 |
| UX-05 | P05, P06 | P08, P10 | P05に16:9 Canvas、safe-area、縦長・横長CSSを実装。P06のゲームオーバーと再挑戦をChrome 1568×1012、390×844、844×390で再確認し、横溢れ0、横長の縦溢れ0。実端末は後続 | 実装中 |
| UX-06 | P05, P06 | P08, P10 | 縦長Canvas下と横長overlayへ44px以上のmove/fire/pause領域を実装。4 viewportで表示確認、実端末完走は後続 | 実装中 |
| UX-07 | P05 | P08, P10 | 明示ボタンと非対応・拒否時の通常表示継続を実装。許可・拒否・非対応の実ブラウザ統合テストは未確認 | 実装中 |
| INP-01 | P05 | P08, P10 | 標準キー、保持、押下edge、repeat、既定動作抑止、ボタンEnter二重発火防止を自動検査。Chrome `?qa=campaign&input=keyboard`で1,132 key eventsを製品adapterへ通し、戦闘12,316 frames、4面→ending→credits、score 54,140を完走 | 実装中 |
| INP-02 | P05 | P08, P10 | move＋fireのmulti-touch、pointerup/cancel/capture喪失、blur、破棄を自動検査。Chrome `?qa=campaign&input=touch`で4,086 Pointer Eventsを製品adapterへ通し、4面→ending→creditsを完走。実タッチ端末は後続 | 実装中 |
| INP-03 | P04, P05 | P09, P10 | P04表示設定は50×44px以上。P05で役割付きゲーム領域だけがpointer既定動作を抑止することを検査。実端末のスクロール競合は後続 | 実装中 |
| INP-04 | P07 | P08, P10 | `automatic-input-replay.test.mjs`でkeydown/upとPointer Eventsを製品adapterへ通す両経路が同一score 49,620で完走。Chromeの240Hz QA clockでも両経路が同一score 54,140、戦闘12,316 frames、4面→ending→credits、console warning/error 0で完走。実タッチ端末はP09・P10で確認 | 実装済み未検証 |
| A11Y-01 | P05 | P08, P10 | BGM/SFX別音量・ミュートのschema、保存復元、独立gainへの即時反映を自動検査。ChromeでBGM音量とSFXミュートを変更し、再読込後の復元を確認 | 実装中 |
| A11Y-02 | P04, P05 | P09, P10 | 命中・被弾・撃破・回収VFXに加え、自機の主武器・Lv・混色補助・無武装・無敵表示が動き軽減時も静止形状を保持する自動検査に合格。全製品演出は後続 | 実装中 |
| A11Y-03 | P04, P07 | P09, P10 | P04 HUD記号、12px文字、高コントラスト表示を監査。P07全素材で再検証 | 実装中 |
| A11Y-04 | P05 | P08, P10 | メニューのTab順、フォーカス、ラベル監査 | 未着手 |
| AV-01 | P04, P06, P07 | P07, P10 | 製品画像32点と音声29点をruntime manifest、配信定義、原本、生成証拠へ全量照合。`product-asset-gate.test.mjs`が製品経路のplaceholder / planned / draftを拒否し、4面campaignと3 viewportで欠落0を確認。主観品質は未評価 | 実装中 |
| AV-02 | P04, P06, P07 | P07, P10 | simulation由来の自機移動・射撃、全通常敵のbehavior別移動・登場・攻撃・被弾、boss登場・攻撃・被弾・形態変化、撃破VFX、コア出現・回収・排出、クリア表示をCanvasへ接続。状態別の非色輪郭と動き軽減を自動検査し、Chrome第4面2完走でクリア表示を確認。全状態の動画照合は後続 | 実装中 |
| AV-03 | P04, P06, P07 | P07, P10 | 全4面の遠景・中景・前景を独立速度で製品Canvasへ合成。4面別2完走とcampaign完走、1568×1012・390×844・844×390で画像欠落とoverflow 0を確認。主観的な奥行き品質は未評価 | 実装中 |
| AV-04 | P04, P06, P07 | P09, P10 | 3武器のLv別弾形状、命中・被弾・撃破・回収VFX、自機の3主武器×3Lv・混色補助・無武装・無敵表示をCanvasへ統合。色に依存しない形状、10構成の一意性、動き軽減時の残存を自動検査 | 実装中 |
| AV-05 | P04, P06, P07 | P07, P10 | 自作共有音9点と第1〜4面各5点を台帳化・波形検査。通常2層／boss 3層、導入・クリア通知に加え、タイトル／メニュー、結果、エンディングの3 BGMを画面遷移へ接続。`game-application.test.mjs`で読込後再同期とending→credits継続を検査し、Chrome campaignは音声警告0で完走。聴感は未評価 | 実装中 |
| AV-06 | P05 | P08, P10 | 音声異常系と無音完走をunit検査。Chromeの操作起点で代表7音源と第2面5音源をすべてHTTP 200で取得し、警告0、console warning/error 0を確認 | 実装中 |
| AV-07 | P04, P07 | P10 | 全画像32点は原本・完全prompt・配信WebP・最適化監査、全音声29点は生成式・用途・SHA-256・外部サンプル0を全量照合。2026-10-24の公式利用条件確認、非一意性・非侵害未保証の残存リスク、`THIRD_PARTY_NOTICES.html`を記録。P10で再確認 | 実装中 |
| TECH-01 | P05 | P08, P10 | `game/tests/core/fixed-step.test.mjs`で30/60/144Hz、長delta、非表示復帰を決定的検査。ブラウザ統合と製品負荷で再検証 | 実装中 |
| TECH-02 | P05, P07 | P07, P10 | `stage-schema.test.mjs`で背景、敵、drop、区間、wave、仕掛け、boss phase、音、遷移のschema・参照・登録behaviorを検査。`stage-schedule.test.mjs`でデータ差替えとseed再現を検査。完成4面のデータと条件分岐レビューはP07 | 実装中 |
| TECH-03 | P05, P07 | P08, P10 | 決定的simulation、第1〜4面のChrome各2完走・snapshot一致に加え、同じapplication/session経路と面別固定seedで実4面を連続完走。Chrome `?qa=campaign`でも4面→ending→credits、console warning/error 0を確認 | 実装中 |
| TECH-04 | P05 | P09, P10 | `phases/phase-05/browser-compatibility.json` に必須6対象とversion・結果を記録しschema検査。Chrome 155 / macOS 26.6.2は合格。Edge、Firefox、Safari、iOS実機、Android実機は未確認のまま明示し、P09で再検証 | 実装中 |
| TECH-05 | P05, P09 | P09, P10 | Phase 05固定場面をChromeで5秒超計測し120.0fps、50ms超frame 0、最大10.4ms、simulation drop 0ms。低性能対象端末と長時間計測はP09 | 実装中 |
| TECH-06 | P05, P08 | P08, P10 | 全61配信assetとruntime参照を全量照合。Phase 05試作定義を製品buildから除外し、静的なplaceholder / planned / draft・外部URL 0を監査。Chromeの全4面campaignでconsole warning/error 0、3 viewport overflow 0。オフライン実行は後続 | 実装中 |
| TECH-07 | P05, P09 | P09, P10 | Phase 07 build `phase07-content-gate-20261024` は91 files・10,466,391 bytes/16 MiB。第1面2,163,618、第2面2,283,252、第3面2,311,164、第4面2,253,830 bytes/各2.25 MiB、共有1,257,020 bytes/7 MiB。背景PSNR 30.140 dB以上、alpha差0、actor・コア復号差0。P09で初回転送、低性能・長時間性能を再計測 | 実装中 |
| TECH-08 | P05 | P10 | lockfile、runtime/dev依存0、`npm audit --omit=dev --audit-level=high`で既知脆弱性0。最終候補で再監査 | 実装中 |
| REL-01 | P04, P07 | P10 | 2026-10-24に全画像・音声の出典、prompt／生成式、SHA-256、権利状態を再照合。OpenAI公式利用条件、非一意性・非侵害未保証、外部音源0、依存0を配布HTMLへ記録。P10で条件変更と成果物を再確認 | 実装中 |
| REL-02 | P05 | P10 | 保存境界は同一origin storageだけを使用し個人情報処理を持たない。静的buildは外部URL 0、Chrome campaignは外部通信なしで完走。通知の規約所在は非リンク文字列で示す | 実装中 |
| REL-03 | P05 | P08, P10 | storageだけで復元する自動テストと書込失敗時のメモリ継続を検査。実ブラウザの通信切断確認は後続 | 実装中 |
| REL-04 | P10, P11 | P11 | version、変更点、既知問題、build ID、通知の本番照合 | 未着手 |
| REL-05 | P11 | P11 | Phase 10 build IDとの一致、公開URLの4面スモーク | 未着手 |
| REL-06 | P11, P12 | P11, P12 | ロールバック演習と運用ログ・優先順位表 | 未着手 |

## README逆引き

| READMEの完成条件 | 対応ID |
| --- | --- |
| 4つ以上の固有ステージを開始から結果まで | LOOP-02, STG-01〜06 |
| 固有背景、仕掛け、敵編成、ボス | EXP-04, STG-01〜05, AV-03 |
| 3武器系統×3段階、意味ある選択 | EXP-01〜03, CORE-01〜07, WPN-01〜04 |
| 完成アートとアニメーション | AV-01〜04, AV-07 |
| タイトルからエンディング・再挑戦 | LOOP-01〜06, UX-01 |
| キーボード、タッチ、PC、縦長、横長 | UX-05〜07, INP-01〜04 |
| 難易度、視認性、音、演出、性能 | PROG-02, PROG-06, UX-04, A11Y-01〜03, AV-04〜06, TECH-04〜07 |
| 重大不具合0、権利、データ、依存 | TECH-06, TECH-08, REL-01〜03 |
| 本番公開とロールバック | REL-04〜06 |

## ゲート運用

- Phase 03: CORE-02〜04とWPN-01〜04は試作比較の証拠を持つまで合格にしない。
- Phase 04: AV項目の代表素材がゲーム内でfinal基準を示すまでPhase 05へ進めない。
- Phase 06: STG-01を製品品質で検証し、残り3面の制作量を再見積もりする。
- Phase 07: STG-01〜06、CORE-03〜07、WPN-01〜04、AV-01〜05が未達ならPhase 08へ進めない。
- Phase 10: 全行が合格でなければ最終検収を完了しない。「対象外」への変更にはREADMEに従いユーザー承認を要する。
- Phase 11: REL-04〜06の本番証拠が揃うまで公開完了としない。
