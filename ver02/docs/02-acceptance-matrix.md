# 02 受け入れマトリクス

状態: Phase 02完了・実装前ベースライン（2026-10-19）

`02-product-requirements.md` の全必須IDを追跡する。状態は `未着手 / 実装中 / 実装済み未検証 / 合格 / 不合格 / ブロック` のいずれかとする。2026-10-21のユーザー指示により人間の主観評価は進行ゲートに使わない。自動テストだけで主観品質を合格にせず、未評価と明記したうえで、証拠欄にはテスト名、画面、動画、計測、台帳などの実在する場所を記す。

| ID | 実装 | 最終検証 | 合格条件・証拠 | 状態 |
| --- | --- | --- | --- | --- |
| EXP-01 | P03, P06 | P09, P10 | P03全729列の状態変化・代償集計、P06以降の経路別シミュレーション。主観的な判断の面白さは未評価 | 実装中 |
| EXP-02 | P03, P07 | P09, P10 | P03武器機能テスト、P07の敵種・区間別撃破時間と被弾余地の決定的比較 | 実装中 |
| EXP-03 | P05, P08 | P09, P10 | simulation snapshotへ敗北理由、被弾直前コア列、喪失コア・残機を保持し、敵弾・接触・全固有危険・時間切れ別の原因と再試行ヒントをGAME OVERへ表示。`failure-review.test.mjs`、`stage-simulation.test.mjs`、Chrome `?qa=failure-review`でtick 939の敵弾敗北、無武装列、残機1→0、再挑戦を確認。320×844、390×844、844×390でoverflow 0、console warning/error 0 | 実装済み未検証 |
| EXP-04 | P07 | P09, P10 | 4ステージの固有要素を通しプレイ、画像・動画で比較 | 未着手 |
| EXP-05 | P04, P07 | P10 | P04代表シーン、音7点、制作規則と自作音権利台帳を整備。P07全製品素材の一貫性と権利を再検証 | 実装中 |
| LOOP-01 | P05, P07 | P08, P10 | 製品入口へ4面キャンペーン、各結果からの次面遷移、面別固定seed、エンディング、総合結果、クレジットを接続。実コンテンツ4面の統合テストとChrome `?qa=campaign`で開始→4面→ending→creditsを連続完走し、240Hz QA clockで総合score 54,140を確認 | 実装中 |
| LOOP-02 | P07 | P08, P10 | `phase08-loop-flow.test.mjs`で実4面それぞれの単独開始→敵弾敗北→attempt 2→クリア→attempt 3同seedクリア一致→ステージ選択復帰を連続検査。Chrome通常入口の解放済み第4面で開始→無操作敗北→再挑戦だけを表示し、単独プレイに実行不能なコンティニューが出ないことを確認 | 実装済み未検証 |
| LOOP-03 | P03, P06 | P09, P10 | `phases/phase-03/prototype/objective-audit.mjs`、ゲーム内統合テスト | 実装中 |
| LOOP-04 | P05 | P08, P10 | `flow-machine.test.mjs`、`game-session.test.mjs`、`phase08-loop-flow.test.mjs`でポーズ・復帰、実第4面の再開始確認取消／確定、タイトル離脱確定を検査。Chrome通常入口の第4面でポーズ→再開始確認→取消→復帰を操作し、進行喪失が確認後だけ起きることを確認 | 実装済み未検証 |
| LOOP-05 | P07 | P08, P10 | 4面別結果を重複なく集計し、固有エンディング、総合score内訳、クレジット、タイトル帰還を実装。Nodeの実4面連続通しとChromeで`QA PASS / 4 STAGES / ENDING + CREDITS`を確認 | 実装中 |
| LOOP-06 | P05, P07 | P08, P10 | 第1〜4面のChrome自動入力各2クリアとsnapshot一致に加え、`phase08-loop-flow.test.mjs`で実4面の敗北／再挑戦とキャンペーン2回限定コンティニューを検査。Chrome `?qa=failure-review`で残数2→1→0、0回時のボタン消去、再挑戦継続を確認。320×844、390×844、844×390でoverflow 0、操作高44px、console warning/error 0 | 実装済み未検証 |
| CORE-01 | P03, P04 | P09, P10 | P03試作の落下中コア・HUD・凡例で3色を外形・内部記号でも区別。`prototype/tests/model.test.mjs`、3画面画像。P04分離素材の48×48グレースケール検査は `docs/04-asset-inventory.md`。ゲーム内完成アートで再検証 | 実装中 |
| CORE-02 | P03 | P03, P10 | `prototype/tests/model.test.mjs`、`prototype/objective-audit.mjs` の全729列 | 実装中 |
| CORE-03 | P03, P07 | P07, P10 | P03試作に加え、製品戦闘で3系統×3段階の弾数・貫通・追尾、Lv別弾形状・発射音、自機上の菱形・十字・円と点灯数を自動検査。Chromeの第1面通しでLANCE Lv1とSEEKER Lv2を実表示。全区間の最終確認は後続 | 実装中 |
| CORE-04 | P03, P07 | P09, P10 | P03全729列の混色・代償判定、P07の構成別戦闘シミュレーション | 実装中 |
| CORE-05 | P03, P05 | P08, P10 | 被弾時の最古コア喪失、空時の残機喪失、青補助無敵、ゲームオーバーに加え、全コア喪失後の標準範囲回収と`UNARMED Lv0`表示を検査。ミス・コンティニューと完成HUDは後続 | 実装中 |
| CORE-06 | P04, P06 | P09, P10 | P04代表HUDに加え、製品自機へ無武装、3主武器×3Lv、混色補助、被弾後無敵を非色形状で接続。10構成の描画一意性、動き軽減、高コントラストを自動検査し、Chrome 390×844・844×390で確認 | 実装中 |
| CORE-07 | P07 | P08, P10 | 重み付き抽選後に各色の連続欠落を最大10ドロップへ制約。`core-supply-audit.test.mjs`と`phases/phase-07/core-supply-audit.json`で4面×16,384 seed、計65,536列・192,675,840 stage tickを検査し、各色最低2回以上、最大供給間隔1,540 tick以下、違反0。固定seedの4面通しとcampaign結果が不変 | 実装済み未検証 |
| WPN-01 | P03, P07 | P07, P10 | P06製品戦闘で赤Lv1〜3の威力・貫通、Lv別菱形、専用音を検査。実ブラウザでLv1弾を確認 | 実装中 |
| WPN-02 | P03, P07 | P07, P10 | P06製品戦闘で青Lv1〜3の3/5/7発広射線、Lv別山形、専用音を検査。全区間の画面確認は後続 | 実装中 |
| WPN-03 | P03, P07 | P07, P10 | P06製品戦闘で黄Lv1〜3の1/2/3発追尾、Lv別円形、専用音を検査。全区間の画面確認は後続 | 実装中 |
| WPN-04 | P03, P07 | P09, P10 | `weapon-situation-audit.json`と回帰テストで、同じLv3構成・seed・固定位置・連射入力を比較。単体高耐久は赤75tick、近接5機群は青47tick、遮蔽死角は黄63tickで優位が逆転し、再実行一致 | 実装済み未検証 |
| STG-01 | P06 | P06, P10 | `stage-01-orbital-wreck.test.mjs`とChrome `?qa=stage01`で、通常戦、圧縮回廊、3段階boss、結果、同seed再挑戦を完走。390×844・844×390でoverflow 0、console warning/error 0 | 実装済み未検証 |
| STG-02 | P07 | P07, P10 | 完成背景3層・敵3種・boss、上下気流・開閉遮蔽・帯電域、3段階boss、通常2層/Boss 3音層を接続。Chrome `?qa=stage02`で2完走・score 9525・snapshot一致、通常入口から選択・出撃、3 viewportを確認。個別アニメーションと主観品質は後続 | 実装中 |
| STG-03 | P07 | P07, P10 | 完成背景3層、再生群体・寄生砲台・捕食体、射撃開口・増殖源・収縮通路、成長3段階boss、通常2層/Boss 3音層を製品入口へ接続。`stage-03-living-ark.test.mjs`とChrome `?qa=stage03`で2完走・tick 3577・score 11950・snapshot一致、3 viewport、キーボード/Pointer Eventsのポーズを確認。個別アニメーションと主観品質は後続 | 実装中 |
| STG-04 | P07 | P07, P10 | 完成背景3層、耐熱装甲・突進機・全方向砲台、周期熱波・退避域・可変安全圏、3形態boss、通常2層/Boss 3音層を製品入口へ接続。`stage-04-stellar-furnace.test.mjs`とChrome `?qa=stage04`で2完走・tick 3512・score 17360・snapshot一致、通常入口から選択・出撃、3 viewport、キーボード/Pointer Eventsのポーズを確認。個別アニメーションと主観品質は後続 | 実装中 |
| STG-05 | P06, P07 | P07, P10 | 第1面は敵3種・圧縮回廊・3段階bossをデータと決定的通しへ実装。専用boss音・全演出と残り3面は継続 | 実装中 |
| STG-06 | P07 | P09, P10 | `stage-difficulty-audit.json`で敵数22→24→30→32、総耐久360→404→486→623、累積mechanic 7→16→25→34を確認。3 seed×4面の12完走でclear/boss tick、被弾、コア・残機喪失を再実行一致。自動入力は人の主観難度評価ではない | 実装済み未検証 |
| PROG-01 | P05, P07 | P08, P10 | 初期状態、説明済み、実4面クリアごとの段階解放、全4面クリア後の別repository/application復元、解放済み第4面選択を統合テストで確認。Chromeの4面連続通し後と通常URL再読込後も4面を選択可能 | 実装済み未検証 |
| PROG-02 | P05, P09 | P09, P10 | 標準・アシストの保存値を検査。戦闘パラメーター反映と両設定の完走は後続 | 実装中 |
| PROG-03 | P05, P07 | P08, P10 | 実4面の敵、コア、連続撃破、無被弾の内訳を決定的通し、保存値、結果画面で照合。Chrome campaign総合結果も4内訳を表示。製品バランスの最終評価は後続 | 実装済み未検証 |
| PROG-04 | P05 | P08, P10 | 実4面の面・難度別best、内訳、コア列を同一storageへ保存し、別repository/applicationから復元。製品の結果画面とステージ選択へ現在難度のbestを表示し、Chrome再読込後も4面のbest 10860/9525/19845/17360を確認 | 実装済み未検証 |
| PROG-05 | P05 | P08, P10 | version 1、v0移行、破損退避、未来version、storage取得・読込・書込失敗、確認付き初期化を自動検査。実第1面の書込拒否注入でもclear/bestをメモリ内維持し結果へ到達。警告UIと正常保存のChrome再読込を確認 | 実装済み未検証 |
| PROG-06 | P07 | P09, P10 | 初見観察、被弾位置分布、予告レビュー | 未着手 |
| UX-01 | P05, P07 | P08, P10 | タイトル、初回説明、stage select、stage intro、HUD、ポーズ、確認、結果、ゲームオーバー、再挑戦、ending、総合結果、creditsを製品入口へ接続。Chromeでキーボード／Pointer Eventsの4面campaignを各12,316戦闘frameで完走し、creditsまで確認。設定は戦闘中の製品UIから変更・復元を確認 | 実装済み未検証 |
| UX-02 | P05, P06 | P09, P10 | 初回説明をブラウザ入口へ接続しChromeでEnter導線を確認。段階説明、再表示、初見観察は後続 | 実装中 |
| UX-03 | P04, P06 | P09, P10 | P04代表HUDは11.58〜11.65%を3画面で確認。P05 Canvasへscore、残機、3コア、武器、boss meterを同一表示モデルから描画。P06ゲーム本体で再検証 | 実装中 |
| UX-04 | P04, P07 | P09, P10 | P04実PNGをグレースケール・3種色覚シミュレーションで検査し、コア間37.02/255以上、自機・敵25.24/255以上、非色シグネチャ重複0。`reference-scene/visual-audit.test.mjs`。P07全素材で再検証 | 実装中 |
| UX-05 | P05, P06 | P08, P10 | 16:9 Canvas、safe-area、縦長・横長CSSを実装。Chrome 1440×900、390×844、320×844、844×390の戦闘・GAME OVER・creditsで横溢れ0、横長の縦溢れ0。実端末は後続 | 実装済み未検証 |
| UX-06 | P05, P06 | P08, P10 | 縦長Canvas下と横長overlayへmove/fire/pause領域を実装。Chrome 390×844と320×844で高さ96px、844×390で高さ76px、overflow 0。実端末完走は後続 | 実装済み未検証 |
| UX-07 | P05 | P08, P10 | 明示ボタン、`aria-pressed`、専用live statusを実装。許可・解除・拒否・非対応を`fullscreen-controller.test.mjs`で検査し、Chrome自動化環境の拒否時に説明を保持して通常表示継続。実ブラウザの許可経路は環境制約により自動テスト証拠のみ | 実装済み未検証 |
| INP-01 | P05 | P08, P10 | 標準キー、保持、押下edge、repeat、既定動作抑止、ボタンEnter二重発火防止を自動検査。Chrome `?qa=campaign&input=keyboard`で1,132 key events、戦闘12,316 frames、4面→ending→credits、score 54,140を完走。通常入口でTab／Shift+Tab／Enter、Canvas focus、P pauseも確認 | 実装済み未検証 |
| INP-02 | P05 | P08, P10 | move＋fireのmulti-touch、pointerup/cancel/capture喪失、blur、破棄を自動検査。Chrome `?qa=campaign&input=touch`で4,086 Pointer Events、戦闘12,316 frames、4面→ending→creditsを完走。実タッチ端末は後続 | 実装済み未検証 |
| INP-03 | P04, P05 | P09, P10 | P04表示設定は50×44px以上。P05で役割付きゲーム領域だけがpointer既定動作を抑止することを検査。実端末のスクロール競合は後続 | 実装中 |
| INP-04 | P07 | P08, P10 | `automatic-input-replay.test.mjs`でkeydown/upとPointer Eventsを製品adapterへ通す両経路が同一score 49,620で完走。Chromeの240Hz QA clockでも両経路が同一score 54,140、戦闘12,316 frames、4面→ending→credits、console warning/error 0で完走。実タッチ端末はP09・P10で確認 | 実装済み未検証 |
| A11Y-01 | P05 | P08, P10 | BGM/SFX別音量・ミュートのschema、保存復元、独立gainへの即時反映を自動検査。ChromeでBGM 0.45、SFX 0.65、動き軽減、高コントラストを変更し、再読込後の値・表示復元と主操作focusを確認 | 実装済み未検証 |
| A11Y-02 | P04, P05 | P09, P10 | 命中・被弾・撃破・回収VFXに加え、自機の主武器・Lv・混色補助・無武装・無敵表示が動き軽減時も静止形状を保持する自動検査に合格。全製品演出は後続 | 実装中 |
| A11Y-03 | P04, P07 | P09, P10 | P04 HUD記号、12px文字、高コントラスト表示を監査。P07全素材で再検証 | 実装中 |
| A11Y-04 | P05, P07 | P08, P10 | `menu-accessibility.test.mjs`でモーダル背面のTab除外、主操作フォーカス、文脈付きラベルを検査。ChromeでTab／Shift+TabとEnterを使い、タイトル→ステージ選択→導入→戦闘、3pxフォーカス輪郭、Canvasへのフォーカス移動、console warning/error 0を確認 | 実装済み未検証 |
| AV-01 | P04, P06, P07 | P07, P10 | 製品画像32点と音声29点をruntime manifest、配信定義、原本、生成証拠へ全量照合。`product-asset-gate.test.mjs`が製品経路のplaceholder / planned / draftを拒否し、4面campaignと3 viewportで欠落0を確認。主観品質は未評価 | 実装中 |
| AV-02 | P04, P06, P07 | P07, P10 | simulation由来の自機移動・射撃、全通常敵のbehavior別移動・登場・攻撃・被弾、boss登場・攻撃・被弾・形態変化、撃破VFX、コア出現・回収・排出、クリア表示をCanvasへ接続。状態別の非色輪郭と動き軽減を自動検査し、Chrome第4面2完走でクリア表示を確認。全状態の動画照合は後続 | 実装中 |
| AV-03 | P04, P06, P07 | P07, P10 | 全4面の遠景・中景・前景を独立速度で製品Canvasへ合成。4面別2完走とcampaign完走、1568×1012・390×844・844×390で画像欠落とoverflow 0を確認。主観的な奥行き品質は未評価 | 実装中 |
| AV-04 | P04, P06, P07 | P09, P10 | 3武器のLv別弾形状、命中・被弾・撃破・回収VFX、自機の3主武器×3Lv・混色補助・無武装・無敵表示をCanvasへ統合。色に依存しない形状、10構成の一意性、動き軽減時の残存を自動検査 | 実装中 |
| AV-05 | P04, P06, P07 | P07, P10 | 自作共有音9点と第1〜4面各5点を台帳化・波形検査。通常2層／boss 3層、導入・クリア通知に加え、タイトル／メニュー、結果、エンディングの3 BGMを画面遷移へ接続。`game-application.test.mjs`で読込後再同期とending→credits継続を検査し、Chrome campaignは音声警告0で完走。聴感は未評価 | 実装中 |
| AV-06 | P05 | P08, P10 | 音声異常系をunit検査し、Chrome `?qa=campaign&runs=3&audio=silent`でAudioContext作成失敗を注入。無音警告を保持したまま3 campaign・12面→creditsを完走し、console warning/error 0。正常時の音源取得も既存browser検査で確認 | 実装済み未検証 |
| AV-07 | P04, P07 | P10 | 全画像32点は原本・完全prompt・配信WebP・最適化監査、全音声29点は生成式・用途・SHA-256・外部サンプル0を全量照合。2026-10-24の公式利用条件確認、非一意性・非侵害未保証の残存リスク、`THIRD_PARTY_NOTICES.html`を記録。P10で再確認 | 実装中 |
| TECH-01 | P05 | P08, P10 | `fixed-step.test.mjs`で30/60/144Hz、長delta、非表示復帰を決定的検査。Chromeの実4面3 campaignで固定更新を継続し、5秒性能窓119.4fps、50ms超frame 0、最大24.0ms、simulation drop 0ms。`alpha-runtime-evidence.json` | 実装済み未検証 |
| TECH-02 | P05, P07 | P07, P10 | `stage-schema.test.mjs`で背景、敵、drop、区間、wave、仕掛け、boss phase、音、遷移のschema・参照・登録behaviorを検査。`stage-schedule.test.mjs`でデータ差替えとseed再現を検査。完成4面のデータと条件分岐レビューはP07 | 実装中 |
| TECH-03 | P05, P07 | P08, P10 | 決定的simulation、第1〜4面のChrome各2完走・snapshot一致に加え、`automatic-playthrough.test.mjs`とChrome `?qa=campaign&runs=3&audio=silent`で同じ製品経路を3 campaign・12面→ending→creditsまで完走し、面別固定seedの結果一致、失敗0、console warning/error 0。`alpha-runtime-evidence.json` | 実装済み未検証 |
| TECH-04 | P05 | P09, P10 | `phases/phase-05/browser-compatibility.json` に必須6対象とversion・結果を記録しschema検査。Chrome 155 / macOS 26.6.2は合格。Edge、Firefox、Safari、iOS実機、Android実機は未確認のまま明示し、P09で再検証 | 実装中 |
| TECH-05 | P05, P09 | P09, P10 | Phase 05固定場面をChromeで5秒超計測し120.0fps、50ms超frame 0、最大10.4ms、simulation drop 0ms。低性能対象端末と長時間計測はP09 | 実装中 |
| TECH-06 | P05, P08 | P08, P10 | 全61配信assetとruntime参照を全量照合。Phase 05試作定義を製品buildから除外し、静的なplaceholder / planned / draft・外部URL 0を監査。Chromeの実4面3 campaignで63 resource、外部origin 0、console warning/error 0、欠落による停止0。3 viewportと接続喪失相当は別Phase 08証拠で確認。`alpha-runtime-evidence.json` | 実装済み未検証 |
| TECH-07 | P05, P09 | P09, P10 | Phase 08 build `phase08-alpha-runtime-20261024` は98 files・10,495,871 bytes/16 MiB。Chrome初回は63 resource、encoded 5,148,913 bytes、transfer 5,167,813 bytes、load event 202ms。5秒性能窓は119.4fps、50ms超frame 0、最大24.0ms、simulation drop 0ms。P09で低性能・長時間性能を再計測 | 実装中 |
| TECH-08 | P05 | P10 | lockfile、runtime/dev依存0、`npm audit --omit=dev --audit-level=high`で既知脆弱性0。最終候補で再監査 | 実装中 |
| REL-01 | P04, P07 | P10 | 2026-10-24に全画像・音声の出典、prompt／生成式、SHA-256、権利状態を再照合。OpenAI公式利用条件、非一意性・非侵害未保証、外部音源0、依存0を配布HTMLへ記録。P10で条件変更と成果物を再確認 | 実装中 |
| REL-02 | P05 | P10 | 保存境界は同一origin storageだけを使用し個人情報処理を持たない。静的buildは外部URL 0、Chrome campaignは外部通信なしで完走。通知の規約所在は非リンク文字列で示す | 実装中 |
| REL-03 | P05 | P08, P10 | storageだけで実4面bestを復元し、書込失敗時も実第1面のclear/bestをメモリ継続。Chromeで配信サーバー停止後も読み込み済み第4面を開始し、音源欠落警告から無音継続、復帰・再読込後の4面best不変を確認 | 実装済み未検証 |
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
