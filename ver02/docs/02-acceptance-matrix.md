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
| CORE-01 | P03, P04 | P09, P10 | 製品4面×4表示profileで赤`I`・青`+`・黄`◎`、完成コアasset、自機上の菱形・十字・円を照合。`visual-state-audit.json`、Chrome 3 viewport | 実装済み未検証 |
| CORE-02 | P03 | P03, P10 | `prototype/tests/model.test.mjs`、`prototype/objective-audit.mjs` の全729列 | 実装中 |
| CORE-03 | P03, P07 | P07, P10 | 3系統×3段階の機能、音、投射物と自機上の非色形状を検査。`visual-state-audit.json`で4面×4表示profile、各10構成の描画署名が全て一意 | 実装済み未検証 |
| CORE-04 | P03, P07 | P09, P10 | P03全729列の混色・代償判定、構成別戦闘比較に加え、混色補助とFIFO排出を4面×4表示profileで描画監査 | 実装済み未検証 |
| CORE-05 | P03, P05 | P08, P10 | 被弾時の最古コア喪失、空時の残機喪失、青補助無敵、ゲームオーバーに加え、全コア喪失後の標準範囲回収と`UNARMED Lv0`表示を検査。ミス・コンティニューと完成HUDは後続 | 実装中 |
| CORE-06 | P04, P06 | P09, P10 | 製品自機の無武装、3主武器×3Lv、混色補助、無敵を非色形状で接続。4面×4表示profile×10構成の描画一意性、Chrome 3 viewportを確認 | 実装済み未検証 |
| CORE-07 | P07 | P08, P10 | 重み付き抽選後に各色の連続欠落を最大10ドロップへ制約。`core-supply-audit.test.mjs`と`phases/phase-07/core-supply-audit.json`で4面×16,384 seed、計65,536列・192,675,840 stage tickを検査し、各色最低2回以上、最大供給間隔1,540 tick以下、違反0。固定seedの4面通しとcampaign結果が不変 | 実装済み未検証 |
| WPN-01 | P03, P07 | P07, P10 | 赤Lv1〜3の威力・貫通、Lv別菱形、専用音を検査し、4面×4表示profileでLv別描画を照合 | 実装済み未検証 |
| WPN-02 | P03, P07 | P07, P10 | 青Lv1〜3の3/5/7発広射線、Lv別山形、専用音を検査し、4面×4表示profileでLv別描画を照合 | 実装済み未検証 |
| WPN-03 | P03, P07 | P07, P10 | 黄Lv1〜3の1/2/3発追尾、Lv別円形、専用音を検査し、4面×4表示profileでLv別描画を照合 | 実装済み未検証 |
| WPN-04 | P03, P07 | P09, P10 | `weapon-situation-audit.json`と回帰テストで、同じLv3構成・seed・固定位置・連射入力を比較。単体高耐久は赤75tick、近接5機群は青47tick、遮蔽死角は黄63tickで優位が逆転し、再実行一致 | 実装済み未検証 |
| STG-01 | P06 | P06, P10 | `stage-01-orbital-wreck.test.mjs`とChrome `?qa=stage01`で、通常戦、圧縮回廊、3段階boss、結果、同seed再挑戦を完走。390×844・844×390でoverflow 0、console warning/error 0 | 実装済み未検証 |
| STG-02 | P07 | P07, P10 | 完成背景3層・敵3種・boss、上下気流・開閉遮蔽・帯電域、3段階boss、通常2層/Boss 3音層を接続。Chrome `?qa=stage02`で2完走・score 9525・snapshot一致、通常入口から選択・出撃、3 viewportを確認。個別アニメーションと主観品質は後続 | 実装中 |
| STG-03 | P07 | P07, P10 | 完成背景3層、再生群体・寄生砲台・捕食体、射撃開口・増殖源・収縮通路、成長3段階boss、通常2層/Boss 3音層を製品入口へ接続。`stage-03-living-ark.test.mjs`とChrome `?qa=stage03`で2完走・tick 3577・score 11950・snapshot一致、3 viewport、キーボード/Pointer Eventsのポーズを確認。個別アニメーションと主観品質は後続 | 実装中 |
| STG-04 | P07 | P07, P10 | 完成背景3層、耐熱装甲・突進機・全方向砲台、周期熱波・退避域・可変安全圏、3形態boss、通常2層/Boss 3音層を製品入口へ接続。`stage-04-stellar-furnace.test.mjs`とChrome `?qa=stage04`で2完走・tick 3512・score 17360・snapshot一致、通常入口から選択・出撃、3 viewport、キーボード/Pointer Eventsのポーズを確認。個別アニメーションと主観品質は後続 | 実装中 |
| STG-05 | P06, P07 | P07, P10 | 第1面は敵3種・圧縮回廊・3段階bossをデータと決定的通しへ実装。専用boss音・全演出と残り3面は継続 | 実装中 |
| STG-06 | P07 | P09, P10 | `stage-difficulty-audit.json`で敵数22→24→30→32、総耐久360→404→486→623、累積mechanic 7→16→25→34を確認。`learning-curve-audit.json`で敵・危険の導入間隔90tick以上、同時導入最大2、最終面の3武器使用と3 run 22交換を確認。3 seed×4面の12完走を再実行一致。自動入力は人の主観難度評価ではない | 実装済み未検証 |
| PROG-01 | P05, P07 | P08, P10 | 初期状態、説明済み、実4面クリアごとの段階解放、全4面クリア後の別repository/application復元、解放済み第4面選択を統合テストで確認。Chromeの4面連続通し後と通常URL再読込後も4面を選択可能 | 実装済み未検証 |
| PROG-02 | P05, P09 | P09, P10 | アシストは敵弾速度75%、被弾後無敵150%、開始時4残機・赤コア2個、回収範囲125%を出撃runへ固定し、罰する表現なしで製品UIから選択する。標準／アシスト双方の実4面campaign完走、難度別best、出撃中設定変更時の保存先固定を回帰検査。Chromeでタイトル切替、開始状態、アシスト4面→credits、1568×956・390×844・844×390のoverflow 0、console warning/error 0を確認 | 実装済み未検証 |
| PROG-03 | P05, P07 | P08, P10 | 実4面の敵、コア、連続撃破、無被弾の内訳を決定的通し、保存値、結果画面で照合。Chrome campaign総合結果も4内訳を表示。製品バランスの最終評価は後続 | 実装済み未検証 |
| PROG-04 | P05 | P08, P10 | 実4面の面・難度別best、内訳、コア列を同一storageへ保存し、別repository/applicationから復元。製品の結果画面とステージ選択へ現在難度のbestを表示し、Chrome再読込後も4面のbest 10860/9525/19845/17360を確認 | 実装済み未検証 |
| PROG-05 | P05 | P08, P10 | version 1、v0移行、破損退避、未来version、storage取得・読込・書込失敗、確認付き初期化を自動検査。実第1面の書込拒否注入でもclear/bestをメモリ内維持し結果へ到達。警告UIと正常保存のChrome再読込を確認 | 実装済み未検証 |
| PROG-06 | P07 | P09, P10 | 全10種のstage hazardへ90tick先行する非色記号・名称の予告を追加し、読み上げ要約へ接続。`learning-curve-audit.json`で4面×3 seed、全30予告、面・区間・上下3帯の被弾分布を再現。第4面の最大集中は区間48%、縦帯56%。Chromeで周期熱波／退避域の先行表示を通常・390×844・844×390、高コントラスト・動き軽減で確認。人間の初見驚きは未評価 | 実装済み未検証 |
| UX-01 | P05, P07 | P08, P10 | タイトル、初回説明、stage select、stage intro、HUD、ポーズ、確認、結果、ゲームオーバー、再挑戦、ending、総合結果、creditsを製品入口へ接続。Chromeでキーボード／Pointer Eventsの4面campaignを各12,316戦闘frameで完走し、creditsまで確認。設定は戦闘中の製品UIから変更・復元を確認 | 実装済み未検証 |
| UX-02 | P05, P06 | P09, P10 | 初回説明を移動・射撃・3枠FIFOの3段階へ分離し、4個目の最古コア押し出しを説明。タイトルの「遊び方」から進行を変えず再表示可能。flow回帰とChromeで確認 | 実装済み未検証 |
| UX-03 | P04, P06 | P09, P10 | score、残機、3コア、武器、boss meterを同一表示モデルから描画し、4面×4表示profileとChrome 3 viewportで維持 | 実装済み未検証 |
| UX-04 | P04, P07 | P09, P10 | P04画素監査のグレースケール・3種色覚差と非色シグネチャに加え、製品4面の全重要状態を高コントラスト・非色形状のCanvas命令で監査。主観視認性は未評価 | 実装済み未検証 |
| UX-05 | P05, P06 | P08, P10 | 16:9 Canvas、safe-area、縦長・横長CSSを実装。Chrome 1440×900、390×844、320×844、844×390の戦闘・GAME OVER・creditsで横溢れ0、横長の縦溢れ0。実端末は後続 | 実装済み未検証 |
| UX-06 | P05, P06 | P08, P10 | 縦長Canvas下と横長overlayへmove/fire/pause領域を実装。Chrome 390×844と320×844で高さ96px、844×390で高さ76px、overflow 0。実端末完走は後続 | 実装済み未検証 |
| UX-07 | P05 | P08, P10 | 明示ボタン、`aria-pressed`、専用live statusを実装。許可・解除・拒否・非対応を`fullscreen-controller.test.mjs`で検査し、Chrome自動化環境の拒否時に説明を保持して通常表示継続。実ブラウザの許可経路は環境制約により自動テスト証拠のみ | 実装済み未検証 |
| INP-01 | P05 | P08, P10 | 標準キー、保持、押下edge、repeat、既定動作抑止、ボタンEnter二重発火防止を自動検査。Chrome `?qa=campaign&input=keyboard`で1,132 key events、戦闘12,316 frames、4面→ending→credits、score 54,140を完走。通常入口でTab／Shift+Tab／Enter、Canvas focus、P pauseも確認 | 実装済み未検証 |
| INP-02 | P05 | P08, P10 | move＋fireのmulti-touch、pointerup/cancel/capture喪失、blur、破棄を自動検査。Chrome `?qa=campaign&input=touch`で4,086 Pointer Events、戦闘12,316 frames、4面→ending→creditsを完走。実タッチ端末は後続 | 実装済み未検証 |
| INP-03 | P04, P05 | P09, P10 | P04表示設定は50×44px以上。P05で役割付きゲーム領域だけがpointer既定動作を抑止することを検査。実端末のスクロール競合は後続 | 実装中 |
| INP-04 | P07 | P08, P10 | `automatic-input-replay.test.mjs`でkeydown/upとPointer Eventsを製品adapterへ通す両経路が同一score 49,620で完走。Chromeの240Hz QA clockでも両経路が同一score 54,140、戦闘12,316 frames、4面→ending→credits、console warning/error 0で完走。実タッチ端末はP09・P10で確認 | 実装済み未検証 |
| A11Y-01 | P05 | P08, P09, P10 | BGM/SFX別音量・ミュートのschema、保存復元、独立gainへの即時反映を自動検査。ChromeでBGM 0.45、SFX 0.65の復元を確認。P09の4 profile監査で独立gainと個別muteを再検証 | 実装済み未検証 |
| A11Y-02 | P04, P05 | P09, P10 | 動き軽減に加え、保存のみだった明滅軽減を製品UIと描画へ接続。4面の全重要VFXが軽減時も静止形状を保持し、リアクターの約5回/秒の輝度変化を停止 | 実装済み未検証 |
| A11Y-03 | P04, P07 | P09, P10 | 3コア記号、危険記号・名称、HUD、高コントラストを4面×4表示profileで監査。Chrome 3 viewportでoverflow 0 | 実装済み未検証 |
| A11Y-04 | P05, P07 | P08, P10 | `menu-accessibility.test.mjs`でモーダル背面のTab除外、主操作フォーカス、文脈付きラベルを検査。ChromeでTab／Shift+TabとEnterを使い、タイトル→ステージ選択→導入→戦闘、3pxフォーカス輪郭、Canvasへのフォーカス移動、console warning/error 0を確認 | 実装済み未検証 |
| AV-01 | P04, P06, P07 | P07, P10 | 製品画像32点と音声29点をruntime manifest、配信定義、原本、生成証拠へ全量照合。`product-asset-gate.test.mjs`が製品経路のplaceholder / planned / draftを拒否し、P10の`release-artifact-audit.json`が固定RCの61点と通知を再照合。主観品質は未評価 | 実装済み未検証 |
| AV-02 | P04, P06, P07 | P07, P10 | 自機、全通常敵、boss、コアの移動・登場・攻撃・被弾・形態変化と5 VFX、危険予告、クリアを4面×4表示profileでCanvas描画監査。主観品質は未評価 | 実装済み未検証 |
| AV-03 | P04, P06, P07 | P07, P10 | 全4面の遠景・中景・前景を独立速度で合成し、動き軽減で全offset 0、通常時は3層維持。4面通しと3 viewportも確認。主観的な奥行き品質は未評価 | 実装済み未検証 |
| AV-04 | P04, P06, P07 | P09, P10 | 9種のLv別弾、5 VFX、自機10構成・混色補助・無敵を4面×4表示profileで監査。色に依存しない形状、160描画の署名衝突0 | 実装済み未検証 |
| AV-05 | P04, P06, P07 | P07, P09, P10 | 自作共有音9点と第1〜4面各5点を台帳化・波形検査。通常2層／boss 3層、導入・クリア通知と画面別3 BGMを接続。P09で共通2層を止めず危機層だけを現在位相へ追加し、全4面を6分相当進めて位相差0 sample、boss合成ピーク−11.352dBFS以下を確認。Chromeで全29音源HTTP 200・音声警告0。聴感は未評価 | 実装済み未検証 |
| AV-06 | P05 | P08, P09, P10 | 音声異常系をunit検査し、Chrome `?qa=campaign&runs=3&audio=silent`でAudioContext作成失敗を注入。P09で危機層欠落時に通常2層を維持して進行することを全4面で検査。無音警告を保持した12面完走と正常時の全29音源取得を確認 | 実装済み未検証 |
| AV-07 | P04, P07 | P10 | 全画像32点は原本・完全prompt・配信WebP・最適化監査、全音声29点は生成式・用途・SHA-256・外部サンプル0を全量照合。P10で2026-01-01発効Terms of Useと2026-10-16更新Service Terms、非一意性・非侵害未保証の残存リスク、固定RCの`THIRD_PARTY_NOTICES.html`を再確認。`release-artifact-audit.json` | 実装済み未検証 |
| TECH-01 | P05 | P08, P10 | `fixed-step.test.mjs`で30/60/144Hz、長delta、非表示復帰を決定的検査。Chromeの実4面3 campaignで固定更新を継続し、5秒性能窓119.4fps、50ms超frame 0、最大24.0ms、simulation drop 0ms。`alpha-runtime-evidence.json` | 実装済み未検証 |
| TECH-02 | P05, P07 | P07, P10 | `stage-schema.test.mjs`で背景、敵、drop、区間、wave、仕掛け、boss phase、音、遷移のschema・参照・登録behaviorを検査。`stage-schedule.test.mjs`でデータ差替えとseed再現を検査。完成4面のデータと条件分岐レビューはP07 | 実装中 |
| TECH-03 | P05, P07 | P08, P10 | 決定的simulation、第1〜4面のChrome各2完走・snapshot一致に加え、`automatic-playthrough.test.mjs`とChrome `?qa=campaign&runs=3&audio=silent`で同じ製品経路を3 campaign・12面→ending→creditsまで完走し、面別固定seedの結果一致、失敗0、console warning/error 0。`alpha-runtime-evidence.json` | 実装済み未検証 |
| TECH-04 | P05 | P09, P10 | `phases/phase-09/browser-compatibility.json`に必須6対象と補助エミュレータを記録しschema検査。Chrome 156 / macOS 26.6.2はPointer Eventsの4面campaign、通常入口のポーズ・復帰、3 viewport、console、resource、外部originに合格。Edge・Firefoxは未導入、SafariはUI操作不可、iOS/Android実機は未接続として推定合格せず明示 | 実装済み未検証 |
| TECH-05 | P05, P09 | P09, P10 | Chromeの4倍描画負荷でplaying実時間300,000.9msを計測。116.1fps、最大259.7ms、simulation drop 2,109.7ms（0.703%）、5 campaign以上を停止なく継続。物理低性能端末の証拠ではない限界を明記。`performance-soak.json` | 実装済み未検証 |
| TECH-06 | P05, P08 | P08, P10 | 全61配信assetとruntime参照を全量照合。Phase 05試作定義を製品buildから除外し、静的なplaceholder / planned / draft・外部URL 0を監査。Chromeの実4面3 campaignで63 resource、外部origin 0、console warning/error 0、欠落による停止0。3 viewportと接続喪失相当は別Phase 08証拠で確認。`alpha-runtime-evidence.json` | 実装済み未検証 |
| TECH-07 | P05, P09 | P09, P10 | build `phase09-performance-soak-20261024` は100 files・10,526,479 bytes/16 MiB。4倍描画負荷の5分soakはwarmup後heap +782,631 bytes、resource/DOM増加0、console warning/error・外部origin 0。`performance-soak.json` | 実装済み未検証 |
| TECH-08 | P05 | P10 | 固定RCのlockfile、runtime/dev依存0を`release-artifact-audit.json`へ記録し、`npm run verify`内の`npm audit --omit=dev --audit-level=high`で既知脆弱性0を再監査 | 実装済み未検証 |
| REL-01 | P04, P07 | P10 | P10で全画像32点・音声29点の出典、prompt／生成式、権利状態、固定RCの通知を再照合。OpenAI公式条件の版、非一意性・非侵害未保証、外部音源0、依存0を`release-artifact-audit.json`へ記録 | 実装済み未検証 |
| REL-02 | P05 | P10 | 保存境界は同一origin storageだけを使用し個人情報処理を持たない。固定RCは外部URL 0、61配信assetと通知を同一manifestへ照合し、Chrome campaignは外部通信なしで完走。`release-artifact-audit.json` | 実装済み未検証 |
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
